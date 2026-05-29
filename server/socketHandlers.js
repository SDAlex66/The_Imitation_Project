import { getDb } from "./database.js";
import modelRegistry from "./prompts.js";

const ROUND_DURATION_SECONDS = 180;
const aiPool = Object.keys(modelRegistry);

let availableModels = [];

function getNextBalancedModel() {
  if (availableModels.length === 0) {
    availableModels = [...aiPool];
    for (let i = availableModels.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableModels[i], availableModels[j]] = [availableModels[j], availableModels[i]];
    }
  }
  return availableModels.pop();
}

function formatTimestamp(date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function registerSocketHandlers(io) {
  const activeUsers = new Map();
  let waitingQueue = [];
  const disconnectTimeouts = new Map();

  async function handlePartnerLeave(leaverId, errorContext, db, skipSwapFlag) {
    const leaverSession = activeUsers.get(leaverId);
    if (!leaverSession || leaverSession.partnerId === "AI") return;

    const partnerId = leaverSession.partnerId;
    const partnerSession = activeUsers.get(partnerId);
    if (!partnerSession) return;

    partnerSession.partnerId = "AI";
    partnerSession.assignedModel = getNextBalancedModel();
    if (!skipSwapFlag) partnerSession.wasSwapped = true;

    if (partnerSession.matchId) {
      await db.run("UPDATE Matches SET wasSwapped = 1 WHERE id = ?", [partnerSession.matchId]);
    }

    const lastMessage = partnerSession.chatHistory[partnerSession.chatHistory.length - 1];
    const isAiTurn = lastMessage && lastMessage.role === "user";

    if (isAiTurn) {
      let replyText;
      try {
        replyText = await generateAIResponse(partnerSession.chatHistory, partnerSession.assignedModel);
      } catch (error) {
        console.error(`${errorContext}:`, error);
        replyText = "...";
      }
      if (!replyText || !replyText.trim()) replyText = "...";

      const responseTime = new Date();

      partnerSession.chatHistory.push({
        role: "assistant",
        content: replyText,
        timestamp: responseTime
      });

      await db.run(
        "INSERT INTO Messages (matchId, payload, senderFlag, timestamp) VALUES (?, ?, ?, ?)",
        [partnerSession.matchId, replyText, "AI_replacement", responseTime.toISOString()]
      );

      const typingDelay = Math.max(3500, replyText?.length * 120);
      await sleep(typingDelay);

      partnerSession.opponentType = "AI";

      io.to(partnerId).emit("receive_message", {
        text: replyText,
        timestamp: formatTimestamp(responseTime)
      });
    }
  }

  async function generateAIResponse(chatHistory, assignedModel) {
    const modelConfig = modelRegistry[assignedModel];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Turing Test Project",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: assignedModel,
          messages: [
            { role: "system", content: modelConfig.prompt },
            ...chatHistory
          ],
          temperature: modelConfig.temperature,
          top_p: modelConfig.top_p,
          max_tokens: 50
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      return data.choices[0].message.content;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  io.on("connection", async (socket) => {
    const userId = socket.handshake.auth.userId || socket.id;
    socket.join(userId);

    console.log(`Client connected: Socket ${socket.id} | User ${userId}`);

    if (disconnectTimeouts.has(userId)) {
      clearTimeout(disconnectTimeouts.get(userId));
      disconnectTimeouts.delete(userId);
      console.log(`User ${userId} successfully recovered their connection.`);

      // If they were in the waiting queue on the old socket, remove them
      if (waitingQueue.some(w => w.userId === userId)) {
        console.log(`[QUEUE] Recovery: removed stale queue entry for ${userId}`);
        waitingQueue = waitingQueue.filter(w => w.userId !== userId);
      }

      const session = activeUsers.get(userId);

      if (session && session.matchId) {
        session.socketId = socket.id;

        const formattedHistory = session.chatHistory.map(msg => ({
          type: msg.role === "user" ? "user" : "bot",
          text: msg.content,
          timestamp: formatTimestamp(new Date(msg.timestamp))
        }));

        socket.emit("recover_session", {
          startTime: session.roundStartTime,
          durationSeconds: ROUND_DURATION_SECONDS,
          messages: formattedHistory
        });
      } else if (session && session.partnerId === "AI") {
        // stale AI fallback session (no matchId) — clean up
        activeUsers.delete(userId);
      } else if (session && session.partnerId) {
        // pending H>H match (match_found not yet sent) — update socketId
        session.socketId = socket.id;
      }
    } else {
      // Fresh connection — remove any stale waiting queue entry
      if (waitingQueue.some(w => w.userId === userId)) {
        console.log(`[QUEUE] Fresh connect: removed stale queue entry for ${userId}`);
        waitingQueue = waitingQueue.filter(w => w.userId !== userId);
      }

      const session = activeUsers.get(userId);

      if (session && session.matchId) {
        session.socketId = socket.id;

        socket.emit("recover_session", {
          startTime: session.roundStartTime,
          durationSeconds: ROUND_DURATION_SECONDS,
          messages: session.chatHistory.map(msg => ({
            type: msg.role === "user" ? "user" : "bot",
            text: msg.content,
            timestamp: formatTimestamp(new Date(msg.timestamp))
          }))
        });
      } else if (session && session.partnerId === "AI") {
        // stale AI fallback session — clean up
        activeUsers.delete(userId);
        socket.emit("session_expired");
      } else if (session && session.partnerId) {
        // pending H>H match — update socketId, keep alive
        session.socketId = socket.id;
      } else {
        socket.emit("session_expired");
      }
    }

    const db = await getDb();

    socket.on("join_queue", async () => {
      console.log(`[QUEUE] ${userId} wants to join. Queue has ${waitingQueue.length} entries:`, waitingQueue.map(w => w.userId));

      // Clean up any stale session — user explicitly wants a new game
      const existingSession = activeUsers.get(userId);
      if (existingSession) {
        console.log(`[QUEUE] ${userId} had existing session (partner: ${existingSession.partnerId}) — cleaning up.`);
        if (existingSession.partnerId && existingSession.partnerId !== "AI") {
          await handlePartnerLeave(userId, "New game", db);
        }
        activeUsers.delete(userId);
      }

      if (waitingQueue.some(w => w.userId === userId)) {
        console.log(`[QUEUE] ${userId} already in queue — removing old entry.`);
        waitingQueue = waitingQueue.filter(w => w.userId !== userId);
      }

      if (waitingQueue.length > 0) {
        const { userId: partnerId, socketId: partnerSocketId } = waitingQueue.shift();
        console.log(`[QUEUE] H2H MATCH: ${userId} <-> ${partnerId}. Creating sessions.`);

        activeUsers.set(userId, { partnerId, assignedModel: null, chatHistory: [], matchId: null, roundStartTime: null, socketId: socket.id });
        activeUsers.set(partnerId, { partnerId: userId, assignedModel: null, chatHistory: [], matchId: null, roundStartTime: null, socketId: partnerSocketId });

        const searchDelay = Math.floor(Math.random() * (8000 - 5000 + 1)) + 5000;
        setTimeout(() => {
          socket.emit("match_found");
          console.log(`[QUEUE] match_found sent to ${userId} (current) and ${partnerId} (partner).`);
          io.to(partnerSocketId).emit("match_found");
        }, searchDelay);
      } else {
        waitingQueue.push({ userId, socketId: socket.id });
        console.log(`[QUEUE] ${userId} added to queue. Queue now has ${waitingQueue.length} entries.`);

        const failSafeDelay = Math.floor(Math.random() * (18000 - 12000 + 1)) + 12000;

        setTimeout(() => {
          if (waitingQueue.some(w => w.userId === userId)) {
            console.log(`[QUEUE] AI FALLBACK for ${userId} — removing from queue.`);
            waitingQueue = waitingQueue.filter(w => w.userId !== userId);

            const userSockets = io.sockets.adapter.rooms.get(userId);
            if (!userSockets || userSockets.size === 0) return;

            activeUsers.set(userId, {
              partnerId: "AI",
              assignedModel: getNextBalancedModel(),
              chatHistory: [],
              matchId: null,
              roundStartTime: null,
              socketId: socket.id
            });

            if (activeUsers.has(userId)) {
              const session = activeUsers.get(userId);
              io.to(session.socketId).emit("match_found");
            }
          }
        }, failSafeDelay);
      }
    });

    socket.on("ready", async () => {
      const session = activeUsers.get(userId);
      if (!session) return;

      if (session.matchId) {
        socket.emit("round_start", {
          startTime: session.roundStartTime,
          durationSeconds: ROUND_DURATION_SECONDS
        });
        return;
      }

      if (session.roundStartTime) {
        return;
      }

      const roundStartTime = Date.now();
      session.roundStartTime = roundStartTime;

      const opponentType = session.partnerId === "AI" ? "AI" : "Human";
      session.opponentType = opponentType;

      if (opponentType === "Human") {
        const partnerSession = activeUsers.get(session.partnerId);
        if (partnerSession) {
          partnerSession.roundStartTime = roundStartTime;
          partnerSession.opponentType = opponentType;
        }
      }

      const result = await db.run(
        "INSERT INTO Matches (sessionId, opponentType, assignedModel, wasSwapped) VALUES (?, ?, ?, 0)",
        [userId, opponentType, session.assignedModel]
      );

      session.matchId = result.lastID;
      
      if (opponentType === "Human") {
        const partnerSession = activeUsers.get(session.partnerId);
        if (partnerSession) {
          partnerSession.matchId = result.lastID;
          io.to(partnerSession.socketId).emit("round_start", {
            startTime: roundStartTime,
            durationSeconds: ROUND_DURATION_SECONDS
          });
        }
      }

      socket.emit("round_start", {
        startTime: roundStartTime,
        durationSeconds: ROUND_DURATION_SECONDS
      });

      if (opponentType === "AI" && Math.random() < 0.7) {
        const aiInitiativeDelay = Math.floor(Math.random() * (4000 - 1000 + 1)) + 1000;
        
        setTimeout(async () => {
          const currentSession = activeUsers.get(userId);
          
          if (currentSession && currentSession.chatHistory.length === 0 && !currentSession._aiGenerating) {
            try {
              const openerPrompt = [{ role: "user", content: "[SYSTEM NOTE: You are starting the conversation. Say a very brief opening greeting.]" }];
              currentSession._aiGenerating = true;
              let aiResponseText = await generateAIResponse(openerPrompt, currentSession.assignedModel);
              if (!aiResponseText || !aiResponseText.trim()) aiResponseText = "...";
              // Double-check: user sent a message while AI was generating
              if (currentSession.chatHistory.length > 0) return;
              const responseTime = new Date();

              currentSession.chatHistory.push({
                role: "assistant",
                content: aiResponseText,
                timestamp: responseTime
              });

              await db.run(
                "INSERT INTO Messages (matchId, payload, senderFlag, timestamp) VALUES (?, ?, ?, ?)",
                [currentSession.matchId, aiResponseText, "AI", responseTime.toISOString()]
              );

              const initialTypingDelay = Math.max(3500, aiResponseText?.length * 120);
              await sleep(initialTypingDelay);

              socket.emit("receive_message", {
                text: aiResponseText,
                timestamp: formatTimestamp(responseTime)
              });
            } catch (error) {
              console.error("AI Initiative Error:", error);
            } finally {
              if (currentSession) delete currentSession._aiGenerating;
            }
          }
        }, aiInitiativeDelay);
      }
    });

    socket.on("send_message", async (data) => {
      const userSession = activeUsers.get(userId);
      if (!userSession) return;

      const userMessageTime = new Date();

      userSession.chatHistory.push({
        role: "user",
        content: data.text,
        timestamp: userMessageTime
      });

      await db.run(
        "INSERT INTO Messages (matchId, payload, senderFlag, timestamp) VALUES (?, ?, ?, ?)",
        [userSession.matchId, data.text, "user", userMessageTime.toISOString()]
      );

      if (userSession.partnerId === "AI") {
        if (userSession._aiGenerating) return;
        userSession._aiGenerating = true;
        let replyText;
        try {
          replyText = await generateAIResponse(userSession.chatHistory, userSession.assignedModel);
        } catch (error) {
          console.error("AI API Error:", error);
          replyText = "...";
        }
        if (!replyText || !replyText.trim()) replyText = "...";
        userSession._aiGenerating = false;

        const responseTime = new Date();

        userSession.chatHistory.push({
          role: "assistant",
          content: replyText,
          timestamp: responseTime
        });

        const aiSenderFlag = userSession.wasSwapped ? "AI_replacement" : "AI";
        await db.run(
          "INSERT INTO Messages (matchId, payload, senderFlag, timestamp) VALUES (?, ?, ?, ?)",
          [userSession.matchId, replyText, aiSenderFlag, responseTime.toISOString()]
        );

        const typingDelay = Math.max(3500, replyText?.length * 120);
        await sleep(typingDelay);

        userSession.opponentType = "AI";

        socket.emit("receive_message", {
          text: replyText,
          timestamp: formatTimestamp(responseTime)
        });
      } else {
        const partnerId = userSession.partnerId;
        const partnerSession = activeUsers.get(partnerId);

        if (partnerSession) {
          partnerSession.chatHistory.push({
            role: "assistant",
            content: data.text,
            timestamp: userMessageTime
          });

          io.to(partnerId).emit("receive_message", {
            text: data.text,
            timestamp: formatTimestamp(userMessageTime)
          });
        }
      }
    });

    socket.on("leave_chat", async () => {
      await handlePartnerLeave(userId, "Takeover Error", db);
    });

    socket.on("submit_guess", async (data) => {
      const userSession = activeUsers.get(userId);
      if (!userSession) return;

      if (!userSession.matchId) {
        activeUsers.delete(userId);
        return;
      }

      const duration = userSession.roundStartTime
        ? Math.floor((Date.now() - userSession.roundStartTime) / 1000)
        : 0;

      const actualIdentity = userSession.opponentType || (userSession.partnerId === "AI" ? "AI" : "Human");
      const correct = data.guess === actualIdentity;

      await db.run(
        "INSERT INTO Evaluations (matchId, guessedIdentity, actualIdentity, correct, duration, confidence, comment) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [userSession.matchId, data.guess, actualIdentity, correct, duration, data.confidence, data.comment]
      );

      socket.emit("evaluation_result", {
        correct,
        actualIdentity,
        modelName: userSession.assignedModel,
        wasSwapped: userSession.wasSwapped
      });

      if (userSession.partnerId && userSession.partnerId !== "AI") {
        await handlePartnerLeave(userId, "Guess submitted", db, true);
      }
      activeUsers.delete(userId);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id} | User ${userId}`);

      const timeout = setTimeout(async () => {
        await handlePartnerLeave(userId, "Hot-swap Error", db);

        activeUsers.delete(userId);
        waitingQueue = waitingQueue.filter(w => w.userId !== userId);
        disconnectTimeouts.delete(userId);
      }, 10000);

      disconnectTimeouts.set(userId, timeout);
    });
  });
}
