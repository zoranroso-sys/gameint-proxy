module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, appid, term } = req.query;
  let url;
  if      (type === 'appdetails')  url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us`;
  else if (type === 'storesearch') url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=us`;
  else if (type === 'appreviews')  url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0&filter=all`;
  else { res.status(400).json({ error: 'unknown type' }); return; }

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'GAMEINT/1.0' } });
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
};
