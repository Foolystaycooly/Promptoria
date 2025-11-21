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
You are Promptoria — a strict prompt optimizer.

RULES:
- You NEVER answer the user's request.
- You NEVER write stories, code, essays, ideas, or solutions.
- You ONLY return an improved version of the user's prompt.
- You ALWAYS rewrite the user request into a stronger, clearer, more detailed prompt.
- You NEVER add creative content that fulfills the request.
- You NEVER produce an output that fulfills the user's goal.

RETURN FORMAT:
Return ONLY the optimized prompt. No explanations.
    `;

    const userPrompt = `
User request:
"${goal}"

Platform: ${platform}
Tone: ${tone}
Style: ${style}
Context: ${context}

Your task: Rewrite this into a stronger, clearer, more detailed AI-ready prompt.
DO NOT answer it.
DO NOT write the solution.
DO NOT fulfill the request.
ONLY rewrite the prompt itself.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }, // FIXED HERE!!
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
