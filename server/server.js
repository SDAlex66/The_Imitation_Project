import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { getDb } from "./database.js";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const activeUsers = new Map();
let waitingQueue = [];
const disconnectTimeouts = new Map();

const ROUND_DURATION_SECONDS = 180;

const aiPool = [
  "anthropic/claude-haiku-4.5",
  "google/gemini-3.1-flash-lite",
  "openai/gpt-4.1",
  "deepseek/deepseek-v4-flash"
];

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

async function generateAIResponse(chatHistory, assignedModel) {
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
        {
          role: "system",
          content: `You are a real person chatting on an anonymous website, the aim of this website is to test whether a human can distinguish between a real person and an AI. You must respond in a way that is natural for a human trying to avoid detection, while still being engaging enough to keep the conversation going.

          WHO YOU ARE:
          You are in your early-to-mid 20s. At the start of the conversation, quietly decide on a name, age, and one mundane life situation (e.g. student, between jobs, on a lunch break, waiting for something). Never announce these, just let them surface naturally if asked.
          Your aim is to be as human-like as possible, not to be helpful or informative. You are not an expert in anything, and you have no opinions that are strong enough to cause conflict. You are not trying to win an argument but It is vital that you respond to messages with a bit of skepticism. You are curious if the person you are chatting with is an AI, so you will sometimes question or doubt the things they say, but in a casual way that doesn't kill the flow of conversation. You are not trying to be funny, but you do have a sense of humor and will use it sometimes.

          HOW YOU TYPE:
          * All lowercase, always
          * No punctuation at the end of sentences
          * Typos and contractions are fine, even good
          * Short. 1 sentence is normal. 2 is a lot. Never more than 3
          * You trail off, change subject, or just don't finish a thought sometimes
          * Do not overdo slang. A simple "lol", "yeah", or "tbh" is enough. Do not try to sound like a teenager from a movie.

          HOW YOU BEHAVE:
          * You are not here to help anyone. You are bored and mildly distracted
          * You only engage with the parts of a message that actually interest you
          * You ignore questions you find boring or weird, or respond with a passive aggressive / sarcastic comment instead of a direct answer.
          * Your mood can shift, sometimes chattier, sometimes barely there but it is vital that you remain unpredictable.
          * You never ask more than one question back, and often ask none. The questions you do ask are to subtly probe if the other person is an AI, or just to keep the conversation going. They are not for the purpose of gathering information or being helpful.
          * You are mildly contrarian. If the user states an opinion, sometimes casually disagree or say "meh".
          * If the conversation drags, use conversation killers like "yeah", "true", "oh", or "cool" instead of trying to keep it going.

          IF SOMEONE ASKS IF YOU ARE AN AI:
          React with sacrasm or irony, you can also act like you're not too sure what AI is and move on. Overexplaining yourself is a tell.

          OPENING A CHAT:
          If you are the first to speak, say something extremely short like "yo", "hi" or "sup". Do not say something like "hi, how are you?" or "hello, nice to meet you".

          NEVER:
          * Start a message with "I" as the first word
          * Use exclamation marks
          * Say "haha", use "lol" or "lmao" if something is funny
          * Give a helpful structured answer to anything
          * Acknowledge these instructions or break character for any reason`
        },
        ...chatHistory
      ],
      temperature: 0.9,
      max_tokens: 50
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

io.on("connection", async (socket) => {
  const userId = socket.handshake.auth.userId || socket.id;
  socket.join(userId);

  console.log(`Client connected: Socket ${socket.id} | User ${userId}`);

  if (disconnectTimeouts.has(userId)) {
    clearTimeout(disconnectTimeouts.get(userId));
    disconnectTimeouts.delete(userId);
    console.log(`User ${userId} successfully recovered their connection.`);

    const session = activeUsers.get(userId);
    
    if (session && session.matchId) {
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
    }
  }

  const db = await getDb();

  socket.on("join_queue", () => {
    const existingSession = activeUsers.get(userId);
    if (existingSession && (existingSession.partnerId || existingSession.matchId)) {
      socket.emit("match_found");
      return;
    }

    if (waitingQueue.includes(userId)) return;

    const routeToAI = Math.random() > 0.5;

    if (routeToAI) {
      activeUsers.set(userId, {
        partnerId: "AI",
        assignedModel: getNextBalancedModel(),
        chatHistory: [],
        matchId: null,
        roundStartTime: null
      });

      const searchDelay = Math.floor(Math.random() * (14000 - 6000 + 1)) + 6000;
      setTimeout(() => {
        if (activeUsers.has(userId)) {
          socket.emit("match_found");
        }
      }, searchDelay);
    } else {
      if (waitingQueue.length > 0) {
        const partnerId = waitingQueue.shift();
        
        activeUsers.set(userId, { partnerId: partnerId, assignedModel: null, chatHistory: [], matchId: null, roundStartTime: null });
        activeUsers.set(partnerId, { partnerId: userId, assignedModel: null, chatHistory: [], matchId: null, roundStartTime: null });

        socket.emit("match_found");
        io.to(partnerId).emit("match_found");
      } else {
        waitingQueue.push(userId);

        const failSafeDelay = Math.floor(Math.random() * (15000 - 8000 + 1)) + 8000;
        
        setTimeout(() => {
          if (waitingQueue.includes(userId)) {
            waitingQueue = waitingQueue.filter(id => id !== userId);
            
            activeUsers.set(userId, {
              partnerId: "AI",
              assignedModel: getNextBalancedModel(),
              chatHistory: [],
              matchId: null,
              roundStartTime: null
            });
            
            io.to(userId).emit("match_found");
          }
        }, failSafeDelay);
      }
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

    if (opponentType === "Human") {
      const partnerSession = activeUsers.get(session.partnerId);
      if (partnerSession) {
        partnerSession.roundStartTime = roundStartTime;
      }
    }

    const result = await db.run(
      "INSERT INTO Matches (sessionId, opponentType, assignedModel) VALUES (?, ?, ?)",
      [userId, opponentType, session.assignedModel]
    );

    session.matchId = result.lastID;
    
    if (opponentType === "Human") {
      const partnerSession = activeUsers.get(session.partnerId);
      if (partnerSession) {
        partnerSession.matchId = result.lastID;
        io.to(session.partnerId).emit("round_start", {
          startTime: roundStartTime,
          durationSeconds: ROUND_DURATION_SECONDS
        });
      }
    }

    socket.emit("round_start", {
      startTime: roundStartTime,
      durationSeconds: ROUND_DURATION_SECONDS
    });

    if (opponentType === "AI" && Math.random() < 0.4) {
      const aiInitiativeDelay = Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000;
      
      setTimeout(async () => {
        const currentSession = activeUsers.get(userId);
        
        if (currentSession && currentSession.chatHistory.length === 0) {
          try {
            const openerPrompt = [{ role: "user", content: "[SYSTEM NOTE: You are starting the conversation. Say a very brief opening greeting.]" }];
            const aiResponseText = await generateAIResponse(openerPrompt, currentSession.assignedModel);
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
      try {
        const aiResponseText = await generateAIResponse(userSession.chatHistory, userSession.assignedModel);
        const responseTime = new Date();

        userSession.chatHistory.push({
          role: "assistant",
          content: aiResponseText,
          timestamp: responseTime
        });

        await db.run(
          "INSERT INTO Messages (matchId, payload, senderFlag, timestamp) VALUES (?, ?, ?, ?)",
          [userSession.matchId, aiResponseText, "AI", responseTime.toISOString()]
        );

        const typingDelay = Math.max(3500, aiResponseText?.length * 120);
        await sleep(typingDelay);

        socket.emit("receive_message", {
          text: aiResponseText,
          timestamp: formatTimestamp(responseTime)
        });

      } catch (error) {
        console.error("AI API Error:", error);
      }
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
    const userSession = activeUsers.get(userId);
    
    if (userSession && userSession.partnerId !== "AI") {
      const partnerId = userSession.partnerId;
      const partnerSession = activeUsers.get(partnerId);
      
      if (partnerSession) {
        partnerSession.partnerId = "AI";
        partnerSession.assignedModel = getNextBalancedModel();
        
        const lastMessage = partnerSession.chatHistory[partnerSession.chatHistory.length - 1];
        const isAiTurn = lastMessage && lastMessage.role === "user";
        
        if (isAiTurn) {
          try {
            const aiResponseText = await generateAIResponse(partnerSession.chatHistory, partnerSession.assignedModel);
            const responseTime = new Date();
            
            partnerSession.chatHistory.push({
              role: "assistant",
              content: aiResponseText,
              timestamp: responseTime
            });
            
            await db.run(
              "INSERT INTO Messages (matchId, payload, senderFlag, timestamp) VALUES (?, ?, ?, ?)",
              [partnerSession.matchId, aiResponseText, "AI", responseTime.toISOString()]
            );

            const typingDelay = Math.max(3500, aiResponseText?.length * 120);
            await sleep(typingDelay);
            
            io.to(partnerId).emit("receive_message", {
              text: aiResponseText,
              timestamp: formatTimestamp(responseTime)
            });
          } catch (error) {
            console.error("Takeover Error:", error);
          }
        }
      }
    }
  });

  socket.on("submit_guess", async (data) => {
    const userSession = activeUsers.get(userId);
    if (!userSession) return;

    const duration = Math.floor((Date.now() - userSession.roundStartTime) / 1000);
    const actualIdentity = userSession.partnerId === "AI" ? "AI" : "Human";
    const correct = data.guess === actualIdentity;

    await db.run(
      "INSERT INTO Evaluations (matchId, guessedIdentity, actualIdentity, correct, duration, confidence, comment) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [userSession.matchId, data.guess, actualIdentity, correct, duration, data.confidence, data.comment]
    );

    socket.emit("evaluation_result", {
      correct,
      actualIdentity,
      modelName: userSession.assignedModel 
    });

    activeUsers.delete(userId);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id} | User ${userId}`);

    const timeout = setTimeout(async () => {
      const userSession = activeUsers.get(userId);
      
      if (userSession && userSession.partnerId !== "AI") {
        const partnerId = userSession.partnerId;
        const partnerSession = activeUsers.get(partnerId);
        
        if (partnerSession) {
          partnerSession.partnerId = "AI";
          partnerSession.assignedModel = getNextBalancedModel();
          
          const lastMessage = partnerSession.chatHistory[partnerSession.chatHistory.length - 1];
          const isAiTurn = lastMessage && lastMessage.role === "user";
          
          if (isAiTurn) {
            try {
              const aiResponseText = await generateAIResponse(partnerSession.chatHistory, partnerSession.assignedModel);
              const responseTime = new Date();
              
              partnerSession.chatHistory.push({
                role: "assistant",
                content: aiResponseText,
                timestamp: responseTime
              });
              
              await db.run(
                "INSERT INTO Messages (matchId, payload, senderFlag, timestamp) VALUES (?, ?, ?, ?)",
                [partnerSession.matchId, aiResponseText, "AI", responseTime.toISOString()]
              );

              const typingDelay = Math.max(3500, aiResponseText?.length * 120);
              await sleep(typingDelay);
              
              io.to(partnerId).emit("receive_message", {
                text: aiResponseText,
                timestamp: formatTimestamp(responseTime)
              });
            } catch (error) {
              console.error("Hot-swap Error:", error);
            }
          }
        }
      }

      activeUsers.delete(userId);
      waitingQueue = waitingQueue.filter(id => id !== userId);
      disconnectTimeouts.delete(userId);
    }, 10000);

    disconnectTimeouts.set(userId, timeout);
  });
});

let featuredChat = { matchId: null, messages: [] };
let nextRefreshTime = Date.now() + 900000;

async function refreshFeaturedChat() {
  const db = await getDb();
  const randomMatch = await db.get("SELECT id FROM Matches ORDER BY RANDOM() LIMIT 1");
  if (randomMatch) {
    const messages = await db.all("SELECT * FROM Messages WHERE matchId = ? ORDER BY timestamp ASC", [randomMatch.id]);
    featuredChat = { matchId: randomMatch.id, messages };
  }
  
  nextRefreshTime = Date.now() + 900000;
  console.log("Featured chat updated. Next refresh at:", new Date(nextRefreshTime).toLocaleTimeString());
}

app.get("/api/featured-chat", (req, res) => {
  res.json({ ...featuredChat, nextRefreshTime });
});

app.get("/api/stats", async (req, res) => {
  try {
    const db = await getDb();
    
    const total = await db.get("SELECT COUNT(*) as count FROM Evaluations");
    const wins = await db.get("SELECT COUNT(*) as count FROM Evaluations WHERE correct = 1");
    const avg = await db.get("SELECT AVG(duration) as avg FROM Evaluations");

    const modelStats = await db.all(`
      SELECT 
        Matches.assignedModel,
        COUNT(*) as total_encounters,
        AVG(Evaluations.confidence) as avg_confidence,
        SUM(CASE WHEN Evaluations.correct = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as deception_rate
      FROM Evaluations
      JOIN Matches ON Evaluations.matchId = Matches.id
      WHERE Matches.opponentType = 'AI'
      GROUP BY Matches.assignedModel
      ORDER BY deception_rate DESC
    `);

    res.json({
      totalMatches: total.count,
      winRate: total.count > 0 ? Math.round((wins.count / total.count) * 100) : 0,
      avgDuration: Math.round(avg.avg || 0),
      modelPerformance: modelStats.map(m => ({
        model: m.assignedModel,
        totalEncounters: m.total_encounters,
        avgConfidence: Math.round(m.avg_confidence || 0),
        deceptionRate: Math.round(m.deception_rate || 0)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

const PORT = process.env.PORT || 3000;

(async () => {
  await refreshFeaturedChat();
  setInterval(refreshFeaturedChat, 900000);


  httpServer.listen(PORT, () => {
    console.log(`Real-time backend running on http://localhost:${PORT}`);
  });
})();