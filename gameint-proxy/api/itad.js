module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const key = process.env.ITAD_API_KEY;
  if (!key) { res.status(500).json({ error: 'ITAD_API_KEY not set' }); return; }

  const { action, appid, id } = req.query;

  try {
    if (action === 'lookup') {
      const r = await fetch(`https://api.isthereanydeal.com/games/lookup/v1?key=${key}&appid=${appid}`);
      if (!r.ok) { res.status(r.status).json({ error: `ITAD lookup ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else if (action === 'prices') {
      const ids = Array.isArray(req.body) ? req.body : [req.body];
      const r = await fetch(`https://api.isthereanydeal.com/games/prices/v3?key=${key}&country=US`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ids),
      });
      if (!r.ok) { res.status(r.status).json({ error: `ITAD prices ${r.status}` }); return; }
      res.status(200).json(await r.json());

    } else if (action === 'history') {
      const r = await fetch(`https://api.isthereanydeal.com/games/history/v2?key=${key}&id=${id}&country=US`);
      if (!r.ok) { res.status(r.status).json({ error: `ITAD history ${r.status}` }); return; }
      const raw = await r.json();

      // Normalize to flat [{shop:{name}, price:number, timestamp:string}]
      // ITAD may return Format A (flat) or Format B (nested {id, history:[]})
      let entries = [];
      if (Array.isArray(raw)) {
        entries = raw[0]?.history ? raw.flatMap(g => g.history || []) : raw;
      }

      const toNum = p => {
        if (typeof p === 'number') return p;
        if (typeof p === 'string') return parseFloat(p) || null;
        if (p?.amount != null) return toNum(p.amount);
        if (p?.amountInt != null) return p.amountInt / 100;
        return null;
      };

      const normalized = entries
        .map(e => ({
          shop:      e.shop?.name || 'Unknown',
          price:     toNum(e.price),
          regular:   toNum(e.regular),
          cut:       e.cut ?? 0,
          timestamp: e.timestamp || null,
        }))
        .filter(e => e.price !== null && e.timestamp);

      res.status(200).json(normalized);

    } else {
      res.status(400).json({ error: 'action must be: lookup, prices, or history' });
    }
  } catch (e) { res.status(502).json({ error: e.message }); }
};
