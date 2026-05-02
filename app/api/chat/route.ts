import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return NextResponse.json(
        { error: "Gemini API Key is missing or invalid. Please check your .env.local file." },
        { status: 500 }
      );
    }

    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // Read Data.json for context
    const dataPath = path.join(process.cwd(), "Data.json");
    if (!fs.existsSync(dataPath)) {
      return NextResponse.json(
        { error: "Data.json not found. Please ensure it exists in the root directory." },
        { status: 500 }
      );
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

    return NextResponse.json({ role: "assistant", content: text });
  } catch (error: any) {
    console.error("Error in Gemini API:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
