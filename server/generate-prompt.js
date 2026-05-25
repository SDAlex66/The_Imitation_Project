import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

async function generateGodTierPrompt() {
  console.log("Summoning Claude Opus 4.7...");

  // Read your markdown file directly
  const metaPrompt = fs.readFileSync(path.resolve("meta-prompt.md"), "utf8");

  // ---> ADDED: A visual loading ticker so you know it hasn't frozen
  const loading = setInterval(() => {
    process.stdout.write(".");
  }, 1000);

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        // Ensure this string exactly matches the one from your OpenRouter screenshot
        model: "anthropic/claude-opus-4.7", 
        messages: [
          { role: "user", content: metaPrompt }
        ],
        temperature: 0.7 
      })
    });

    clearInterval(loading); // Stop the ticker
    console.log(`\nResponse received! HTTP Status: ${response.status}`);

    const data = await response.json();
    
    if (data.error) {
      console.error("\nAPI Error from OpenRouter:", data.error.message);
      return;
    }

    console.log("\n====== YOUR NEW SYSTEM PROMPTS ======\n");
    console.log(data.choices[0].message.content);
    console.log("\n=====================================\n");

  } catch (error) {
    clearInterval(loading);
    console.error("\nSystem Error (Connection dropped):", error);
  }
}

generateGodTierPrompt();