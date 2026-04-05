module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, appid, term } = req.query;
  let url;

  if (type === 'appdetails') {
    url = `https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us`;
  } else if (type === 'storesearch') {
    url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=us`;
  } else if (type === 'appreviews') {
    url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0&filter=all`;
  } else if (type === 'reviews-recent') {
    url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0&filter=recent`;

  } else if (type === 'reviews-geo') {
    // Parallel fetch of review counts per language → geo/market breakdown
    const LANGS = [
      'english','schinese','tchinese','russian','german',
      'french','spanish','portuguese','japanese','korean',
      'turkish','polish','italian','thai','vietnamese'
    ];
    const results = await Promise.all(LANGS.map(async lang => {
      try {
        const r = await fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=${lang}&purchase_type=all&num_per_page=0&filter=all`, { headers:{'User-Agent':'GAMEINT/1.0'} });
        if (!r.ok) return { lang, count: 0 };
        const d = await r.json();
        return { lang, count: d.query_summary?.total_reviews || 0 };
      } catch { return { lang, count: 0 }; }
    }));
    res.status(200).json(results);
    return;

  } else if (type === 'reviews-sample') {
    // Fetch review text samples for theme/keyword analysis
    const [posRes, negRes] = await Promise.all([
      fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=english&purchase_type=all&num_per_page=25&filter=all&review_type=positive`, { headers:{'User-Agent':'GAMEINT/1.0'} }),
      fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=english&purchase_type=all&num_per_page=25&filter=all&review_type=negative`, { headers:{'User-Agent':'GAMEINT/1.0'} }),
    ]);
    const pos = posRes.ok ? await posRes.json() : {};
    const neg = negRes.ok ? await negRes.json() : {};
    const extract = reviews => (reviews || []).map(r => ({
      t:  (r.review || '').slice(0, 400),
      up: r.voted_up,
      hr: Math.round((r.author?.playtime_forever || 0) / 60),
      helpful: r.votes_helpful || 0,
    }));
    res.status(200).json({
      positive: extract(pos.reviews),
      negative: extract(neg.reviews),
    });
    return;

  } else {
    res.status(400).json({ error: 'unknown type' }); return;
  }

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'GAMEINT/1.0' } });
    res.status(200).json(await r.json());
  } catch (e) { res.status(502).json({ error: e.message }); }
};
