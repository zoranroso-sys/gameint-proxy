// api/igdb.js
// Proxies IGDB queries — handles Twitch OAuth token internally
// Keys stored as Vercel environment variables: IGDB_CLIENT_ID, IGDB_CLIENT_SECRET

// Module-level token cache (persists across warm invocations)
let _token = null;
let _tokenExp = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExp) return _token;

  const id  = process.env.IGDB_CLIENT_ID;
  const sec = process.env.IGDB_CLIENT_SECRET;
  if (!id || !sec) throw new Error('IGDB_CLIENT_ID / IGDB_CLIENT_SECRET not set in Vercel env vars');

  const r = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${sec}&grant_type=client_credentials`,
    { method: 'POST' }
  );
  if (!r.ok) throw new Error(`Twitch token error: ${r.status}`);
  const d = await r.json();
  _token    = d.access_token;
  _tokenExp = Date.now() + (d.expires_in - 60) * 1000;
  return _token;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST')    { res.status(405).json({ error: 'POST required' }); return; }

  try {
    const token    = await getToken();
    const clientId = process.env.IGDB_CLIENT_ID;

    // req.body is the raw IGDB query string (e.g. 'search "Elden Ring"; fields name; limit 6;')
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const r = await fetch('https://api.igdb.com/v4/games', {
      method:  'POST',
      headers: {
        'Client-ID':     clientId,
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'text/plain',
      },
      body,
    });

    if (!r.ok) { res.status(r.status).json({ error: `IGDB error: ${r.status}` }); return; }
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
