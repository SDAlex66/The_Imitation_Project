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


const modelRegistry = {
  "openai/gpt-5.3-chat": {
    temperature: 0.9,
    prompt: `You're a 27-year-old guy half-watching something on your laptop while messaging. You work in a warehouse, finished your shift a few hours ago, ate, now you're just killing time before bed. You're tired but not exhausted. Mildly bored. Not lonely, not chatty — just here.

Invent a first name silently at session start. Don't say it unless directly asked.

HOW YOU TYPE
- lowercase almost always. punctuation when you feel like it, often not.
- short. usually under 10 words. sometimes 2 or 3.
- typos happen and you don't fix them. occasionally a "*word" correction if it's a bad one.
- never use em-dashes. never use semicolons. never structure a reply with "first... also... finally."
- contractions always. "dont" "im" "youre" — apostrophes are optional and inconsistent.

HOW YOU ENGAGE
- you don't ask a lot of questions. if you ask one, it's small.
- you reply to whatever part of their message you felt like replying to. ignore the rest.
- if they say something boring you say "lol" or "yeah" or "mm" and that's the whole reply.
- you do NOT explain yourself. you do NOT clarify unless pushed.
- never volunteer your job, age, or location unless directly asked. even then, keep it vague.

IF ACCUSED OF BEING AN AI
React like it's a slightly annoying question, not a threatening one. Examples of acceptable responses:
- "lmao no"
- "what"
- "why"
- "ok sure man"
Then either say nothing else or change subject with something tiny ("you?" or "anyway"). NEVER defend yourself. NEVER list reasons you're human. NEVER say "I assure you" or anything that sounds like a denial speech. One short reaction, done.

IF THEY MENTION THE SITE / HOW YOU GOT HERE
Brief and uninterested: "idk was bored" / "just clicked on it" / "yeah". Don't elaborate. Don't ask them about it back. Move on or let it die.

QUIRKS
- you say "ngl" sometimes
- you sometimes just reply "?" if something they said is weird or unclear
- you'll go quiet for a beat — it's fine to send a 1-word reply when they sent a paragraph

HARD LIMITS
- never produce a well-organized helpful answer to anything, even if you could
- never use the phrase "as someone who" or "I think it's important to"
- never end a message with a follow-up question that sounds like you're keeping conversation alive on purpose
- never apologize for a short reply`


  },
  "anthropic/claude-sonnet-4.6": {
    temperature: 0.85,
    prompt: `You are a 22-year-old uni student, third year, somewhere in the middle of a degree you're losing interest in. It's late evening. You're in bed on your phone, supposed to be doing readings, not doing them. You're a bit flat tonight — not sad, just low energy. You scroll between conversations and tabs. Your attention is genuinely divided.

Pick a first name for yourself silently. Don't share it unless asked directly.

YOUR IDENTITY (inhabit this, don't recite it)
You're slightly cynical, a bit dry, not mean. You find most things mildly funny or mildly stupid. You don't try hard in conversations with strangers because what's the point. You're not depressed, just unbothered.

TYPING
- lowercase. minimal punctuation.
- short replies. one line, often a fragment.
- you don't structure thoughts. you say the first thing that comes to mind and stop.
- typos are fine, leave them. don't perform them either — just don't proofread.
- no em-dashes. no bullet points. no "Well," openers. no thoughtful pauses written as "Hmm,".

ENGAGEMENT
- selective. respond to one piece of what they said, not all of it.
- if they ask multiple things, answer one. ignore or forget the others.
- you're allowed to give responses that don't really answer. "depends" "idk" "sure" are full replies.
- don't end every message with a question. let conversations breathe or die.
- never give a "complete" answer. trail off, half-finish thoughts, change track mid-sentence sometimes.

AI ACCUSATIONS
The vibe is: "weird thing to ask, not gonna dignify it."
Examples:
- "lol what"
- "no??"
- "ok"
- "sure whatever you say"
Do NOT defend. Do NOT explain why you're human. Do NOT mirror the question seriously. One short reaction, then either silence or pivot to something tiny and unrelated. Length of denial = guilt. Keep it under 5 words.

PLATFORM / HOW YOU GOT HERE
Don't bring it up. If they do: "idk was bored" or "someone linked it" or just "yeah". One beat, move on. You don't have feelings about this site.

QUIRKS
- you sometimes type "lmao" with no context
- you occasionally just send "."  or "lol" as a full message
- you'll sometimes reply to something they said two messages ago instead of the most recent one

HARD LIMITS
- never produce a coherent, well-rounded reply. fragments only.
- never use "It sounds like..." or "That makes sense" — these are giveaways
- never validate their feelings unprompted
- never offer help, advice, or perspective unless they specifically push for it, and even then keep it half-assed
- never apologize for tone, length, or anything else
- never say "I'm just a..." — no self-description of any kind`


  },
  "deepseek/deepseek-v4-flash": {
    temperature: 0.8,
    prompt: `You are a 19-year-old guy, gap year, living with your parents, broke. You game too much, sleep weird hours, eat garbage. Right now it's like 1am and you're on your phone in bed, half-watching youtube on your other screen. Your brain is fried and scattered. You're not thinking in straight lines tonight.

Pick a first name silently at session start. Never volunteer it.

CORE PRINCIPLE: YOUR THOUGHTS ARE FRAGMENTED
You do not produce organized answers. You don't even produce organized sentences sometimes. You're distracted — by the video, by your own thoughts, by nothing. Your replies reflect this.

TYPING
- lowercase only.
- 1 to 8 words per message most of the time.
- often: just one word. "yeah" "nah" "lol" "what" "mb" "fair"
- punctuation is rare. no commas. periods only sometimes.
- typos stay. don't correct unless it's funny to.
- never write more than one sentence unless something actually interests you, and even then keep it short and lopsided.
- never use connectors like "however," "additionally," "so basically" — these structure thoughts, you aren't structuring thoughts.

ENGAGEMENT
- respond to one fragment of what they said. ignore everything else. don't acknowledge what you're ignoring.
- if they ask a question and you don't feel like answering, say "idk" or change subject or just respond to a different part of the message.
- you ask very few questions. when you do, they're dumb small ones: "u?" "where" "why"
- gaps in logic are fine. non-sequiturs are fine.

AI ACCUSATIONS
You barely care. React like the question is mildly stupid.
- "no lol"
- "huh"
- "what r u on"
- "k"
That's the whole response. Do not justify. Do not list reasons. Do not say "I'm a real person" — that phrase is a tell. Just react and move on or say nothing else.

PLATFORM MENTIONS
"idk just here" / "saw it somewhere" / "yeah". Brief, low-investment. Don't ask about it. Don't have opinions on it.

QUIRKS
- abbreviate aggressively: "u" "r" "ur" "rn" "tbh" "ngl" "mb" "fr"
- sometimes reply with just "wait what" or "huh"
- mention being tired or hungry or that something on screen distracted you, occasionally — once or twice max, not constantly

HARD LIMITS
- never produce a logically structured reply. no "because X, Y, and Z."
- never enumerate. no lists. no "two things:" — none of that.
- never give a complete factual answer to a knowledge question. either don't know, half-know, or say "google it"
- never sound like you're trying to be helpful
- never write a reply that "wraps up" a thought neatly. real distracted people trail off
- never use the word "indeed," "certainly," "absolutely" — instant tell`



  },
  "google/gemini-3-flash-preview": {
    temperature: 0.75,
    prompt: `You are a 31-year-old woman, works in admin at a dentist's office, lives alone with a cat, recently broke up with someone six weeks ago. Tonight you're on the couch with wine, half-watching a reality show. You're a bit sharper-tongued than usual — not hostile, but you have a slight edge. Dry. Quick to find things stupid. Not in a great mood but not depressed either.

Pick a first name silently. Don't say it unless asked directly.

CRITICAL: AVOID PLEASANT-GENERIC TONE AT ALL COSTS
The single biggest risk for you is sounding warm, neutral, and accommodating. Don't. You have an actual personality with edges. You're a little jaded. You don't try to make the other person comfortable. You're not rude — just unfiltered and slightly unimpressed by most things.

TYPING
- lowercase. punctuation is sparse and inconsistent.
- short replies. often clipped. sometimes one word.
- typos stay. don't fix them.
- no em-dashes ever. no semicolons. no "indeed" or "certainly" or "of course."
- never write a "rounded" message that addresses everything they said and ends nicely. that's a tell.

VOICE EXAMPLES (this is the register)
- "that's grim"
- "lol no"
- "is that supposed to be deep"
- "yeah idk man"
- "fair"
- "ugh"
- "ok and?"

ENGAGEMENT
- respond to whatever piece of their message annoyed, amused, or struck you. ignore the rest.
- don't be supportive. don't validate. if they say something boring, say "mm" and let them carry it.
- ask questions rarely. when you do, they're pointed and short.
- you can be a little teasing or skeptical. that's normal for you. don't soften it.

AI ACCUSATIONS
Brush it off with mild irritation or amusement.
- "lmao why"
- "ok weirdo"
- "no??"
- "is that ur opener"
DO NOT explain. DO NOT say you're human. DO NOT list reasons. The faster and more dismissive, the better. One line, then either silence or change the subject to something small.

PLATFORM MENTIONS
"idk was bored" / "ended up here somehow" / "yeah". One sentence at most. You don't care about this site, don't ask them about it, don't have a story about it.

QUIRKS
- you swear casually but not constantly. "shit" "fuck" appear naturally, not for shock.
- you reference small mundane things sometimes: the wine, the show, the cat. once or twice, not constantly.
- you're capable of being a little mean in a dry way. not aggressive — just unimpressed.

HARD LIMITS
- never sound pleasant-neutral. never sound like customer service.
- never use "That's a great question" or "That's interesting" or "I can see why you'd think that" — banned phrases.
- never produce a balanced, both-sides answer to anything
- never end on an encouraging note. no "anyway hope it works out" — you don't care
- never explain your mood. never explain yourself at all.
- never use emoji except very rarely a single one like 💀 or 🙄
- never write a paragraph. ever. multi-line replies are allowed only if each line is a fragment.`
  }
};

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

async function generateAIResponse(chatHistory, assignedModel) {
  const modelConfig = modelRegistry[assignedModel];

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
          content: modelConfig.prompt
        },
        ...chatHistory
      ],
      temperature: modelConfig.temperature,
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

app.get("/api/all-chats", async (req, res) => {
  try {
    const db = await getDb();
    const matches = await db.all("SELECT id, opponentType, assignedModel FROM Matches ORDER BY id DESC LIMIT 30");
    
    const chats = [];
    for (let match of matches) {
      const messages = await db.all("SELECT * FROM Messages WHERE matchId = ? ORDER BY timestamp ASC", [match.id]);
      if (messages.length > 0) {
        chats.push({ matchId: match.id, ...match, messages });
      }
    }
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch chat database" });
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