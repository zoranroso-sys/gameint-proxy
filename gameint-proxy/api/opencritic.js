module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { q, id, reviews } = req.query;
  try {
    if (id && reviews) {
      const r = await fetch(`https://api.opencritic.com/api/game/${id}/reviews?skip=0&limit=12&sort=score`);
      res.status(200).json(await r.json());
    } else if (id) {
      const r = await fetch(`https://api.opencritic.com/api/game/${id}`);
      res.setHeader('Cache-Control','public, s-maxage=21600, stale-while-revalidate=3600');
      res.status(200).json(await r.json());
    } else if (q) {
      const r = await fetch(`https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(q)}`);
      res.status(200).json(await r.json());
    } else {
      res.status(400).json({ error: 'q or id required' });
    }
  } catch(e) { res.status(502).json({ error: e.message }); }
};
