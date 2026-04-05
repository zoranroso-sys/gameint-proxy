export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { q } = req.query;
  try {
    const r = await fetch(`https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(q)}`);
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
}
