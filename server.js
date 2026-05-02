require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static("public", {
  etag: false,
  maxAge: '0'
}));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

const apiKeys = process.env.GEMINI_API_KEYS 
  ? process.env.GEMINI_API_KEYS.split(',').map(key => key.trim()).filter(Boolean)
  : [];

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_api_key_here" && !apiKeys.includes(process.env.GEMINI_API_KEY)) {
  apiKeys.push(process.env.GEMINI_API_KEY);
}

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }
    const lastMessage = messages[messages.length - 1].content;

    // Read Data.json for context
    const dataPath = path.join(__dirname, "Data.json");
    if (!fs.existsSync(dataPath)) {
      return res.status(500).json({ error: "Data.json not found. Please ensure it exists in the root directory." });
    }
    const campusData = fs.readFileSync(dataPath, "utf8");

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

    let success = false;
    let text = "";

    for (const key of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        text = response.text();
        success = true;
        break; // Stop trying keys if successful
      } catch (err) {
        console.error("API Key failed:", key.substring(0, 5) + "...", err.message);
        // Continue to the next key
      }
    }

    if (!success) {
      return res.status(500).json({ error: "Please slow down.. API is exausted" });
    }

    res.json({ role: "assistant", content: text });
  } catch (error) {
    console.error("Error in chat route:", error);
    res.status(500).json({ error: "Please slow down.. API is exausted" });
  }
});

app.post("/api/speak", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "Text is required" });

    // Bella (Default Female) voice ID - Free Tier supported
    const voiceId = "EXAVITQu4vr4xnSDxMaL";
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "ElevenLabs API key is missing." });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs API error:", errText);
      return res.status(response.status).json({ error: "Failed to generate speech" });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.set("Content-Type", "audio/mpeg");
    res.send(buffer);
  } catch (error) {
    console.error("Error in speech route:", error);
    res.status(500).json({ error: "Failed to process text-to-speech request." });
  }
});
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

module.exports = app;
