// api/steam.js
// Proxies Steam Store API calls — no key needed, just CORS bypass

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, appid, term, language, filter } = req.query;

  let url;
  if (type === 'appdetails') {
    url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us`;
  } else if (type === 'storesearch') {
    url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=us`;
  } else if (type === 'appreviews') {
    url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0&filter=all`;
  } else {
    res.status(400).json({ error: 'Unknown type. Use: appdetails, storesearch, appreviews' });
    return;
  }

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'GAMEINT/1.0' } });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: `Steam API error: ${e.message}` });
  }
}
