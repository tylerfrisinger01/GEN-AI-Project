// server.js
const express = require('express');
const sqlite = require('better-sqlite3');
const path = require('path');

// LangChain / OpenAI
const { ChatOpenAI } = require('@langchain/openai');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');

const app = express();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'recipes.db');
const db = sqlite(DB_PATH, { readonly: true });

app.use(express.json());

// permissive CORS for local dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---------------- AI Recipe Endpoint ----------------
const model = new ChatOpenAI({
  model: 'gpt-4.1',
  apiKey: 'REPLACE_WITH_YOUR_OPENAI_KEY',
});

app.post('/api/ai-recipes', async (req, res) => {
  try {
    const { prompt, systemPrompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const systemMsg = new SystemMessage(
      systemPrompt ||
        'You are a helpful assistant that creates recipes based on dietary preferences and ingredients. ' +
        'Return a JSON array of recipes with fields: name, description, ingredients (array of strings), steps (array of strings).'
    );
    const messages = [systemMsg, new HumanMessage(prompt)];
    const response = await model.invoke(messages);
    const text = response?.content ?? response?.text ?? '';
    res.json({ text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: String(error?.message || error) });
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

/** Build FTS WHERE clause */
function buildFtsWhere(q) {
  if (!q) return { where: '1=1', params: {} };
  const words = q.trim().split(/\s+/).slice(0, 6).map(w => w.replace(/"/g, ''));
  const matchExpr = words.length ? words.map(w => `"${w}"`).join(' NEAR ') : '';
  return { where: 'recipes_fts MATCH :match', params: { match: matchExpr } };
}

/** Sort clause (use computed "score" for relevance) */
function orderClause(sort) {
  switch ((sort || '').toLowerCase()) {
    case 'rating':       return 'ORDER BY r.rating DESC';
    case 'minutes-asc':  return 'ORDER BY r.minutes ASC';
    case 'minutes-desc': return 'ORDER BY r.minutes DESC';
    case 'popularity':   return 'ORDER BY r.popularity DESC';
    default:             return 'ORDER BY score ASC';
  }
}

app.get('/api/search', (req, res) => {
  try {
    const q          = String(req.query.q || '').trim();
    const cuisine    = String(req.query.cuisine || '').trim();
    const diet       = String(req.query.diet || '').trim();
    const minRating  = Number(req.query.min_rating || 0);
    const maxMinutes = Number(req.query.max_minutes || 0);
    const page       = Math.max(1, Number(req.query.page || 1));
    const pageSize   = Math.min(50, Math.max(1, Number(req.query.page_size || 20)));
    const sort       = String(req.query.sort || 'relevance');

    const { where, params } = buildFtsWhere(q);

    const filters = [];
    if (cuisine)    filters.push('r.cuisine = :cuisine');
    if (diet)       filters.push('r.diet = :diet');
    if (minRating)  filters.push('r.rating >= :minRating');
    if (maxMinutes) filters.push('r.minutes <= :maxMinutes');

    const fullWhere = [where, ...filters].join(' AND ');

    const sql = `
      SELECT
        r.id,
        r.name            AS name,
        r.minutes         AS minutes,
        r.rating          AS rating,
        r.popularity      AS popularity,
        r.cuisine         AS cuisine,
        r.diet            AS diet,
        r.description     AS description,
        r.steps           AS steps,
        json_extract(r.ingredients, '$') AS ingredients,
        bm25(recipes_fts, 1.5, 1.2, 1.1, 1.3, 0.5, 0.8, 0.6) AS score
      FROM recipes_fts
      JOIN recipes AS r ON recipes_fts.rowid = r.id
      WHERE ${fullWhere}
      ${orderClause(sort)}
      LIMIT :limit OFFSET :offset;
    `;

    const items = db.prepare(sql).all({
      ...params,
      cuisine,
      diet,
      minRating,
      maxMinutes,
      limit: pageSize,
      offset: (page - 1) * pageSize
    });

    const total = db.prepare(`
      SELECT COUNT(*) AS c
      FROM recipes_fts
      JOIN recipes AS r ON recipes_fts.rowid = r.id
      WHERE ${fullWhere}
    `).get({
      ...params,
      cuisine,
      diet,
      minRating,
      maxMinutes
    }).c;

    res.json({
      page,
      page_size: pageSize,
      total,
      pages: Math.ceil(total / pageSize),
      items: items.map(r => ({
        ...r,
        ingredients: JSON.parse(r.ingredients || '[]')
      }))
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

app.get('/api/recipes/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });

  const row = db.prepare(`
    SELECT
      r.id,
      r.name,
      r.minutes,
      r.rating,
      r.popularity,
      r.cuisine,
      r.diet,
      r.description,
      r.steps,
      json_extract(r.ingredients, '$') AS ingredients,
      json_extract(r.nutrition,  '$') AS nutrition,
      r.n_ingredients,
      r.n_steps,
      r.submitted
    FROM recipes AS r
    WHERE r.id = ?;
  `).get(id);

  if (!row) return res.status(404).json({ error: 'Not found' });

  row.ingredients = JSON.parse(row.ingredients || '[]');
  row.nutrition  = JSON.parse(row.nutrition  || '[]');

  res.json(row);
});

app.get('/api/facets', (req, res) => {
  const cuisines = db.prepare(`
    SELECT r.cuisine AS name, COUNT(*) AS count
    FROM recipes r
    WHERE r.cuisine IS NOT NULL AND r.cuisine <> ''
    GROUP BY r.cuisine
    ORDER BY count DESC
    LIMIT 40;
  `).all();

  const diets = db.prepare(`
    SELECT r.diet AS name, COUNT(*) AS count
    FROM recipes r
    WHERE r.diet IS NOT NULL AND r.diet <> ''
    GROUP BY r.diet
    ORDER BY count DESC
    LIMIT 20;
  `).all();

  res.json({ cuisines, diets });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
  console.log(`API on http://localhost:${PORT} (DB: ${DB_PATH})`)
);
