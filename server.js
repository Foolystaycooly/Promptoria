import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
const app = express();
app.use(cors({
  origin: "https://foolystaycooly.github.io" // <-- your frontend URL
}));
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
      model: "gpt-4o-mini", // or gpt-4-turbo if you have it
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

