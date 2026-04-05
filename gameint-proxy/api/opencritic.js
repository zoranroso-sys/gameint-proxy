// OpenCritic via RapidAPI — add OPENCRITIC_RAPIDAPI_KEY to Vercel env vars
// Free tier: https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const KEY = process.env.OPENCRITIC_RAPIDAPI_KEY;
  const RAPID_HOST = 'opencritic-api.p.rapidapi.com';
  const BASE       = `https://${RAPID_HOST}`;
  const rapidHeaders = KEY ? { 'X-RapidAPI-Key': KEY, 'X-RapidAPI-Host': RAPID_HOST } : {};

  const { q, id, reviews } = req.query;

  // Helper — try RapidAPI first, fall back to old public OC API (may fail if they've locked it)
  async function ocFetch(rapidPath, publicPath) {
    if (KEY) {
      try {
        const r = await fetch(`${BASE}${rapidPath}`, { headers: rapidHeaders });
        if (r.ok) return [await r.json(), r.status];
        console.warn('[OC proxy] RapidAPI', r.status, rapidPath);
      } catch(e) { console.warn('[OC proxy] RapidAPI error', e.message); }
    }
    // Fallback to old public API
    try {
      const r = await fetch(`https://api.opencritic.com/api${publicPath}`);
      if (r.ok) return [await r.json(), r.status];
    } catch(e) {}
    return [null, 502];
  }

  try {
    if (id && reviews) {
      // Individual critic reviews — RapidAPI: GET /review/game?gameId={id}
      const [data, status] = await ocFetch(
        `/review/game?gameId=${id}`,
        `/game/${id}/reviews?skip=0&limit=12&sort=score`
      );
      if (!data) { res.status(502).json({ error: 'OC reviews unavailable' }); return; }
      res.status(200).json(data);

    } else if (id) {
      // Game detail — RapidAPI: GET /game/{id}
      const [data, status] = await ocFetch(`/game/${id}`, `/game/${id}`);
      if (!data) { res.status(502).json({ error: 'OC detail unavailable' }); return; }
      res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600');
      res.status(200).json(data);

    } else if (q) {
      // Search — RapidAPI: GET /game/search?criteria={q}
      const [data] = await ocFetch(
        `/game/search?criteria=${encodeURIComponent(q)}`,
        `/game/search?criteria=${encodeURIComponent(q)}`
      );
      res.status(200).json(data || []);

    } else {
      res.status(400).json({ error: 'q or id required' });
    }
  } catch(e) { res.status(502).json({ error: e.message }); }
};
