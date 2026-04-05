// api/youtube.js
// Proxies YouTube Data API v3 search
// Key stored as Vercel env var: YOUTUBE_API_KEY

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { res.status(500).json({ error: 'YOUTUBE_API_KEY not set in Vercel env vars' }); return; }

  const { q, maxResults = 3 } = req.query;
  if (!q) { res.status(400).json({ error: 'q (query) required' }); return; }

  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=${maxResults}&q=${encodeURIComponent(q)}&key=${key}`;
    const r = await fetch(url);
    if (!r.ok) { res.status(r.status).json({ error: `YouTube error: ${r.status}` }); return; }
    res.status(200).json(await r.json());
  } catch (e) {
    res.status(502).json({ error: `YouTube error: ${e.message}` });
  }
}
