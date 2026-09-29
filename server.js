// AP Agent — secure backend proxy for Hindsight memory
//
// This is the ONLY place your Hindsight API key should ever live.
// It never goes into the browser, the Artifact, or any frontend file.
//
// Run: npm install express cors node-fetch dotenv
//      HINDSIGHT_BASE_URL=... HINDSIGHT_API_KEY=... node server.js

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

// Lock this down to your app's real domain before going anywhere near production.
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

const HINDSIGHT_BASE_URL = process.env.HINDSIGHT_BASE_URL; // e.g. https://your-hindsight-host:8888
const HINDSIGHT_API_KEY = process.env.HINDSIGHT_API_KEY;   // never sent to the browser
const BANK_ID = process.env.HINDSIGHT_BANK_ID || 'ap-agent';

if (!HINDSIGHT_BASE_URL || !HINDSIGHT_API_KEY) {
  console.warn('Warning: HINDSIGHT_BASE_URL or HINDSIGHT_API_KEY is not set.');
}

function hindsightHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${HINDSIGHT_API_KEY}`,
  };
}

// Store an invoice memory (called after an invoice is added, edited, or its status changes)
app.post('/api/memory/retain', async (req, res) => {
  try {
    const { content, metadata } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content (string) is required' });
    }
    const r = await fetch(`${HINDSIGHT_BASE_URL}/retain`, {
      method: 'POST',
      headers: hindsightHeaders(),
      body: JSON.stringify({ bank_id: BANK_ID, content, metadata: metadata || {} }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach Hindsight' });
  }
});

// Search invoice memories (called from a "recall" search box in the app)
app.post('/api/memory/recall', async (req, res) => {
  try {
    const { query, n } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) is required' });
    }
    const r = await fetch(`${HINDSIGHT_BASE_URL}/recall`, {
      method: 'POST',
      headers: hindsightHeaders(),
      body: JSON.stringify({ bank_id: BANK_ID, query, n: n || 5 }),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'Could not reach Hindsight' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`AP Agent memory backend listening on :${PORT}`));
