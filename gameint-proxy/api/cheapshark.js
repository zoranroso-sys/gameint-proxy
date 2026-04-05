// api/cheapshark.js
// Proxies CheapShark — no key needed

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { endpoint, ...params } = req.query;
  // endpoint = 'games' or 'deals'
  if (!endpoint) { res.status(400).json({ error: 'endpoint required (games or deals)' }); return; }

  const qs = new URLSearchParams(params).toString();
  const url = `https://www.cheapshark.com/api/1.0/${endpoint}${qs ? '?' + qs : ''}`;

  try {
    const r = await fetch(url);
    if (!r.ok) { res.status(r.status).json({ error: `CheapShark error: ${r.status}` }); return; }
    res.status(200).json(await r.json());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
