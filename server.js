// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Only allow requests from your GitHub Pages frontend
const FRONTEND_URL = process.env.FRONTEND_URL || "https://foolystaycooly.github.io";

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/optimize", async (req, res) => {
  try {
    const { goal, platform, tone, style, context } = req.body;

    const systemPrompt = `
      You are an expert AI prompt engineer.
      Rewrite and optimize the user's input into a powerful, clear, and well-structured prompt 
      suitable for the ${platform} platform.
      Apply tone: "${tone}", style: "${style}", and context: "${context}".
      Return only the improved prompt — no extra commentary.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: goal },
      ],
    });

    const optimizedPrompt = completion.choices[0].message.content.trim();
    res.json({ optimizedPrompt });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to optimize prompt" });
  }
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
