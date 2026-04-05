// OpenCritic via RapidAPI — add OPENCRITIC_RAPIDAPI_KEY to Vercel environment vars
// Free tier: https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const KEY = process.env.OPENCRITIC_RAPIDAPI_KEY;
  if (!KEY) {
    res.status(503).json({ error: 'OPENCRITIC_RAPIDAPI_KEY env var not set. Add it in Vercel project settings.' });
    return;
  }

  const RAPID_HOST = 'opencritic-api.p.rapidapi.com';
  const BASE       = `https://${RAPID_HOST}`;
  const headers    = { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': RAPID_HOST };
  const { q, id, reviews } = req.query;

  try {
    if (id && reviews) {
      // Reviews for a game
      const r = await fetch(`${BASE}/review/game?gameId=${id}&skip=0&limit=12`, { headers });
      if (!r.ok) { res.status(r.status).json({ error: `OC reviews ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else if (id) {
      // Game detail
      const r = await fetch(`${BASE}/game/${id}`, { headers });
      if (!r.ok) { res.status(r.status).json({ error: `OC detail ${r.status}` }); return; }
      res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600');
      res.status(200).json(await r.json());

    } else if (q) {
      // Search
      const r = await fetch(`${BASE}/game/search?criteria=${encodeURIComponent(q)}`, { headers });
      if (!r.ok) { res.status(r.status).json({ error: `OC search ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else {
      res.status(400).json({ error: 'q or id required' });
    }
  } catch(e) { res.status(502).json({ error: e.message }); }
};
