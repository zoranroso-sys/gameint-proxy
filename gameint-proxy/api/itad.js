module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const key = process.env.ITAD_API_KEY;
  if (!key) { res.status(500).json({ error: 'ITAD_API_KEY not set' }); return; }

  const { action, appid } = req.query;

  try {
    if (action === 'lookup') {
      const r = await fetch(`https://api.isthereanydeal.com/games/lookup/v1?key=${key}&appid=steam%2F${appid}`);
      if (!r.ok) { res.status(r.status).json({ error: `ITAD lookup ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else if (action === 'prices') {
      // Vercel auto-parses JSON body — req.body is already an array
      const ids = Array.isArray(req.body) ? req.body : [req.body];
      const r = await fetch(`https://api.isthereanydeal.com/games/prices/v3?key=${key}&country=US`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids),
      });
      if (!r.ok) { res.status(r.status).json({ error: `ITAD prices ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else {
      res.status(400).json({ error: 'action must be lookup or prices' });
    }
  } catch (e) { res.status(502).json({ error: e.message }); }
};
