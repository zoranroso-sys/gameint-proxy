module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { res.status(500).json({ error: 'YOUTUBE_API_KEY not set' }); return; }
  const { q, maxResults = 3 } = req.query;
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=${maxResults}&q=${encodeURIComponent(q)}&key=${key}`);
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
};
