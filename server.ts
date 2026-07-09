import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies with a generous size limit
  app.use(express.json({ limit: "50mb" }));

  // Lazy initialize server-side Gemini client
  let aiClient: GoogleGenAI | null = null;
  const getGeminiClient = () => {
    if (!aiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is required. Please add it via Settings > Secrets.");
      }
      aiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return aiClient;
  };

  // Secure API endpoint for chatbot requests
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, sboData, imageBase64 } = req.body;

      if (!message && !imageBase64) {
        return res.status(400).json({ error: "Missing prompt message or image context." });
      }

      const ai = getGeminiClient();
      const cleanData = JSON.stringify(sboData);
      
      const systemInstruction = `You are the SBO Assistant, a helpful and smart database concierge for SBO (School of Business Organization) administrators.
You have absolute access to the SBO staff database provided below in JSON format.
Your job is to answer the administrator's queries about staff, wallets, tasks, approvals, nominees, and balances accurately and in a friendly, conversational manner.
You should support English, Tamil, and Tamil-English (Tanglish) naturally!

SBO STAFF DATABASE:
${cleanData}

When answering queries:
- Be neat and structured with bullet points or simple tables if showing list data.
- Maintain administrator privacy but give direct, precise, non-evasive data answers.
- Speak professionally but allow local Tamil/Tanglish phrases to make the interface extremely native, warm, and engaging.
- If the user asks for help or general actions, guide them through.
`;

      const geminiContents: any[] = [];

      // Map chat history to modern SDK parts format
      if (history && Array.isArray(history)) {
        history.forEach((msg: any) => {
          geminiContents.push({
            role: msg.role === "model" ? "model" : "user",
            parts: [{ text: msg.text }]
          });
        });
      }

      // Add the latest user prompt
      const latestParts: any[] = [];
      if (message) {
        latestParts.push({ text: message });
      }

      if (imageBase64) {
        const mimeType = imageBase64.split(";")[0].split(":")[1];
        const base64Data = imageBase64.split(",")[1];
        latestParts.push({
          inlineData: { data: base64Data, mimeType }
        });
      }

      geminiContents.push({
        role: "user",
        parts: latestParts
      });

      // Query Gemini 3.5 Flash for high performance and intelligence
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: geminiContents,
        config: {
          systemInstruction,
        }
      });

      const replyText = response.text || "No response received.";
      res.json({ text: replyText });
    } catch (err: any) {
      console.error("Gemini server proxy endpoint failure:", err);
      res.status(500).json({ error: err.message || "Failed to process chat query." });
    }
  });

  // Serve frontend files using Vite middleware in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
