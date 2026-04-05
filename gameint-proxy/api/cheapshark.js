module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { endpoint, ...params } = req.query;
  const qs = new URLSearchParams(params).toString();
  try {
    const r = await fetch(`https://www.cheapshark.com/api/1.0/${endpoint}?${qs}`);
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
};
