module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) { res.status(500).json({ error: 'YOUTUBE_API_KEY not set' }); return; }
  const { q, maxResults = 3 } = req.query;
  if (!q) { res.status(400).json({ error: 'q required' }); return; }
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=${maxResults}&q=${encodeURIComponent(q)}&key=${key}&safeSearch=none`;
    const r = await fetch(url, {
      headers: {
        'Referer': 'https://zrconsulting.de',
        'Origin':  'https://zrconsulting.de',
      }
    });
    const data = await r.json();
    // Surface API errors clearly for debugging
    if (data.error) {
      console.error('[YouTube API error]', JSON.stringify(data.error));
      res.status(200).json(data); // pass through so client can see the error
      return;
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};
