// server.js
const express = require('express');
const sqlite = require('better-sqlite3');
const path = require('path');

// Add these for LangChain/OpenAI
const { ChatOpenAI } = require('@langchain/openai');
const { SystemMessage, HumanMessage } = require('langchain');

const app = express();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'recipes.db');
const db = sqlite(DB_PATH, { readonly: true });

app.use(express.json());

// permissive CORS for local dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------------- AI Recipe Endpoint ----------------
const model = new ChatOpenAI({
  model: "gpt-4.1",
  apiKey: "",
});

app.post("/api/ai-recipes", async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "Missing prompt" });

    const systemMsg = systemPrompt
      ? new SystemMessage(systemPrompt)
      : new SystemMessage(
          "You are a helpful assistant that creates recipes based on dietary preferences and ingredients given. " +
          "Return a JSON array of recipes with name, description, ingredients, and steps."
        );

    const messages = [systemMsg, new HumanMessage(prompt)];
    const response = await model.invoke(messages);
    res.json({ text: response.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error) });
  }
});

// ---------------- Existing endpoints ----------------
app.get('/api/health', (req, res) => {
  try {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ ok: !!row, db: DB_PATH });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// ...keep your /api/search, /api/recipes/:id, /api/facets endpoints as-is...

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`API on http://localhost:${PORT} (DB: ${DB_PATH})`)
);
