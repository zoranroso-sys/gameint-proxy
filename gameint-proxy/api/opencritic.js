// OpenCritic via RapidAPI — add OPENCRITIC_RAPIDAPI_KEY to Vercel env vars
// Free tier: https://rapidapi.com/opencritic-opencritic-default/api/opencritic-api
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const KEY  = process.env.OPENCRITIC_RAPIDAPI_KEY;
  const HOST = 'opencritic-api.p.rapidapi.com';
  const BASE = `https://${HOST}`;
  const headers = KEY ? { 'x-rapidapi-key': KEY, 'x-rapidapi-host': HOST } : null;

  const { q, id, reviews } = req.query;

  async function rapid(path) {
    if (!headers) return null;
    try {
      const r = await fetch(`${BASE}${path}`, { headers });
      if (r.ok) return r.json();
      console.warn('[OC] RapidAPI', r.status, path);
    } catch(e) { console.warn('[OC] fetch error', e.message); }
    return null;
  }

  try {
    if (id && reviews) {
      // Correct endpoint: /reviews/game/{id}  (path param, plural)
      const data = await rapid(`/reviews/game/${id}?skip=0&sort=score`);
      if (data) {
        res.setHeader('Cache-Control', 'public, s-maxage=3600');
        res.status(200).json(Array.isArray(data) ? data : data.reviews || data.results || []);
        return;
      }
      res.status(502).json({ error: 'OC reviews unavailable' });

    } else if (id) {
      // /game/{id}
      const data = await rapid(`/game/${id}`);
      if (data) {
        res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=3600');
        res.status(200).json(data); return;
      }
      res.status(502).json({ error: 'OC detail unavailable' });

    } else if (q) {
      // /game/search?criteria={q}
      const data = await rapid(`/game/search?criteria=${encodeURIComponent(q)}`);
      res.status(200).json(data || []);

    } else {
      res.status(400).json({ error: 'q or id required' });
    }
  } catch(e) { res.status(502).json({ error: e.message }); }
};
