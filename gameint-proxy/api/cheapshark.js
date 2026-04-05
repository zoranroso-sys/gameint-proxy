export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { endpoint, ...params } = req.query;
  if (!endpoint) { res.status(400).json({ error: 'endpoint required' }); return; }
  const qs = new URLSearchParams(params).toString();
  try {
    const r = await fetch(`https://www.cheapshark.com/api/1.0/${endpoint}${qs ? '?' + qs : ''}`);
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
}
