let _token = null, _tokenExp = 0;

async function getToken() {
  if (_token && Date.now() < _tokenExp) return _token;
  const id = process.env.IGDB_CLIENT_ID, sec = process.env.IGDB_CLIENT_SECRET;
  if (!id || !sec) throw new Error('IGDB keys not set');
  const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${sec}&grant_type=client_credentials`, { method: 'POST' });
  if (!r.ok) throw new Error(`Twitch auth failed: ${r.status}`);
  const d = await r.json();
  _token = d.access_token;
  _tokenExp = Date.now() + (d.expires_in - 60) * 1000;
  return _token;
}

async function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => resolve(data));
  });
}

const handler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST required' }); return; }

  try {
    const token = await getToken();

    // Read body from stream (bodyParser is disabled so stream is intact)
    // Fallback to req.body if already parsed (e.g. in some environments)
    let body;
    if (typeof req.body === 'string' && req.body) {
      body = req.body;
    } else {
      body = await readBody(req);
    }

    if (!body) {
      res.status(400).json({ error: 'Empty query body' });
      return;
    }

    const r = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': process.env.IGDB_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'text/plain',
      },
      body,
    });

    if (!r.ok) { res.status(r.status).json({ error: `IGDB ${r.status}` }); return; }
    const data = await r.json();

    // Cache game metadata results for 12 hours
    res.setHeader('Cache-Control', 'public, s-maxage=43200, stale-while-revalidate=3600');
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
};

// CRITICAL: disable bodyParser so readBody can read the raw stream
handler.config = { api: { bodyParser: false } };
module.exports = handler;
