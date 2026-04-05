// api/opencritic.js
// Proxies OpenCritic search — no key needed

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { q } = req.query;
  if (!q) { res.status(400).json({ error: 'q required' }); return; }

  try {
    const r = await fetch(`https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(q)}`);
    if (!r.ok) { res.status(r.status).json({ error: `OpenCritic error: ${r.status}` }); return; }
    res.status(200).json(await r.json());
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
