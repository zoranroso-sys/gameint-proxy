// api/itad.js
// Proxies IsThereAnyDeal — game lookup by Steam AppID, multi-store prices
// Key stored as Vercel env var: ITAD_API_KEY

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const key = process.env.ITAD_API_KEY;
  if (!key) { res.status(500).json({ error: 'ITAD_API_KEY not set in Vercel env vars' }); return; }

  const { action, appid } = req.query;

  try {
    if (action === 'lookup') {
      // Resolve ITAD game ID from Steam AppID
      const r = await fetch(`https://api.isthereanydeal.com/games/lookup/v1?key=${key}&appid=steam%2F${appid}`);
      if (!r.ok) { res.status(r.status).json({ error: `ITAD lookup error: ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else if (action === 'prices') {
      // POST list of ITAD game IDs → get current prices across all stores
      // Body should be a JSON array of ITAD game IDs, e.g. ["abc123"]
      const body = req.body;
      const ids  = Array.isArray(body) ? body : [body];
      const r = await fetch(
        `https://api.isthereanydeal.com/games/prices/v3?key=${key}&country=US`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids) }
      );
      if (!r.ok) { res.status(r.status).json({ error: `ITAD prices error: ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else {
      res.status(400).json({ error: 'action must be: lookup or prices' });
    }
  } catch (e) {
    res.status(502).json({ error: `ITAD error: ${e.message}` });
  }
}
