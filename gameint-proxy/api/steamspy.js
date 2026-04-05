// api/steamspy.js
// Proxies SteamSpy — owner estimates, playtime, peak CCU

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { appid } = req.query;
  if (!appid) { res.status(400).json({ error: 'appid required' }); return; }

  try {
    const r = await fetch(`https://steamspy.com/api.php?request=appdetails&appid=${appid}`);
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: `SteamSpy error: ${e.message}` });
  }
}
