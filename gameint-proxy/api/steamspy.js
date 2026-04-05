module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    const r = await fetch(`https://steamspy.com/api.php?request=appdetails&appid=${req.query.appid}`);
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
};
