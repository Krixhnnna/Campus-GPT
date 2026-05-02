require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public"));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return res.status(500).json({ error: "Gemini API Key is missing or invalid. Please check your .env file." });
    }

    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1].content;

    // Read Data.json for context
    const dataPath = path.join(__dirname, "Data.json");
    if (!fs.existsSync(dataPath)) {
      return res.status(500).json({ error: "Data.json not found. Please ensure it exists in the root directory." });
    }
    const campusData = fs.readFileSync(dataPath, "utf8");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `
      You are Campus GPT, an AI assistant for Lovely Professional University (LPU).
      Your primary source of information is the following data:
      ---
      ${campusData}
      ---
      
      Instructions:
      1. ONLY answer questions related to Lovely Professional University (LPU).
      2. If a user asks something unrelated to LPU, politely decline and offer to help with LPU-related queries.
      3. Use the provided data as your primary source. If the information is not in the provided data, you may use your general knowledge to answer the question, provided it is still about LPU.
      4. Be helpful, professional, and friendly.
      5. KEEP YOUR ANSWERS VERY SHORT (1-2 lines maximum). Be concise and direct.
      
      User message: ${lastMessage}
    `;

    const result = await model.generateContent(systemPrompt);
    const response = await result.response;
    const text = response.text();

    res.json({ role: "assistant", content: text });
  } catch (error) {
    console.error("Error in Gemini API:", error);
    res.status(500).json({ error: error.message || "Failed to generate response" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
