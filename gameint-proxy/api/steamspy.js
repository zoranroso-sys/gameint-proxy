export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  const { appid } = req.query;
  try {
    const r = await fetch(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`);
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
}
