import dotenv from "dotenv";
dotenv.config();

// The models we want to compare (Mix of cheap premium and free)
const modelsToTest = [
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-2-9b-it:free",
  "anthropic/claude-3-haiku:beta" // Haiku is incredibly fast and cheap
];

// A stronger system prompt with a specific persona to prevent the "AI" from leaking
const systemPrompt = "You are a 21-year-old uni student playing a web chat game. Reply in very short, casual messages. No punctuation at the end. Use lowercase. Never say you are an AI, a bot, or a 'chat buddy'. If someone asks your name, make one up. If someone asks if you are AI, act confused or mock them.";

// The test conversation history
const testHistory = [
  { role: "system", content: systemPrompt },
  { role: "user", content: "hey there" },
  { role: "assistant", content: "hi" },
  { role: "user", content: "what's your name" },
  { role: "assistant", content: "alex" },
  { role: "user", content: "so you're ai?" }
];

async function testModel(modelName) {
  const startTime = performance.now();
  
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelName,
        messages: testHistory,
        temperature: 0.8, // Slightly high for more creative/human variance
        max_tokens: 50
      })
    });

    const data = await response.json();
    const endTime = performance.now();
    const latency = (endTime - startTime).toFixed(0);

    if (data.error) throw new Error(data.error.message);

    return {
      model: modelName,
      latency: `${latency}ms`,
      reply: data.choices[0].message.content
    };

  } catch (error) {
    return { model: modelName, error: error.message };
  }
}

async function runComparison() {
  console.log("Firing test prompt to all models...\n");
  
  // Run all tests simultaneously
  const results = await Promise.all(modelsToTest.map(testModel));
  
  console.table(results);
}

runComparison();