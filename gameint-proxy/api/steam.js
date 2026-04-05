module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, appid, term, filter } = req.query;

  if (type === 'appdetails') {
    try {
      const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us`, { headers:{'User-Agent':'GAMEINT/1.0'} });
      res.status(200).json(await r.json());
    } catch(e) { res.status(502).json({ error: e.message }); }

  } else if (type === 'storesearch') {
    try {
      const r = await fetch(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=us`, { headers:{'User-Agent':'GAMEINT/1.0'} });
      res.status(200).json(await r.json());
    } catch(e) { res.status(502).json({ error: e.message }); }

  } else if (type === 'appreviews') {
    const f = filter || 'all';
    try {
      const r = await fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0&filter=${f}`, { headers:{'User-Agent':'GAMEINT/1.0'} });
      res.status(200).json(await r.json());
    } catch(e) { res.status(502).json({ error: e.message }); }

  } else if (type === 'reviews-recent') {
    try {
      const r = await fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=0&filter=recent`, { headers:{'User-Agent':'GAMEINT/1.0'} });
      res.status(200).json(await r.json());
    } catch(e) { res.status(502).json({ error: e.message }); }

  } else if (type === 'reviews-sample') {
    // Fetch positive and negative English review samples for "Player Voice" section
    try {
      const [posRes, negRes] = await Promise.all([
        fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=english&purchase_type=all&num_per_page=6&filter=all&review_type=positive`, { headers:{'User-Agent':'GAMEINT/1.0'} }),
        fetch(`https://store.steampowered.com/appreviews/${appid}?json=1&language=english&purchase_type=all&num_per_page=6&filter=all&review_type=negative`, { headers:{'User-Agent':'GAMEINT/1.0'} }),
      ]);
      const pos = posRes.ok ? await posRes.json() : {};
      const neg = negRes.ok ? await negRes.json() : {};
      const extract = reviews => (reviews || []).slice(0, 4).map(r => ({
        text:               (r.review || '').replace(/\s+/g, ' ').trim().slice(0, 300),
        helpful:            r.votes_helpful || 0,
        playtime:           Math.round((r.author?.playtime_forever || 0) / 60),
        playtime_at_review: Math.round((r.author?.playtime_at_review || 0) / 60),
        voted_up:           r.voted_up,
      })).filter(r => r.text.length > 20);
      res.status(200).json({ positive: extract(pos.reviews), negative: extract(neg.reviews) });
    } catch(e) { res.status(502).json({ error: e.message }); }

  } else if (type === 'reviews-timeline') {
    // Fetch one large batch of recent reviews, then bin by timestamp.
    // day_range only affects query_summary, NOT the actual review objects returned —
    // so making 3 separate calls with different day_range values gives identical reviews.
    // Instead: fetch 100 recent reviews once, filter by timestamp_created server-side.
    try {
      // Fetch up to 3 pages of 100 reviews (300 total) to cover high-traffic games
      let reviews = [];
      let cursor = '*';
      for (let page = 0; page < 3; page++) {
        const url = `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=100&filter=recent&cursor=${encodeURIComponent(cursor)}`;
        const r = await fetch(url, { headers:{'User-Agent':'GAMEINT/1.0'} });
        if (!r.ok) break;
        const d = await r.json();
        const batch = d.reviews || [];
        if (!batch.length) break;
        reviews = reviews.concat(batch);
        cursor = d.cursor;
        if (!cursor || batch.length < 100) break; // no more pages
      }

      const now = Math.floor(Date.now() / 1000);
      const windows = [
        { label: 'Last 7d',  cutoff: now - 7  * 86400 },
        { label: 'Last 30d', cutoff: now - 30 * 86400 },
        { label: 'Last 90d', cutoff: now - 90 * 86400 },
      ];

      const data = windows.map(w => {
        const bucket = reviews.filter(rv => rv.timestamp_created >= w.cutoff);
        if (bucket.length < 3) return null; // too few to be meaningful
        const pos = bucket.filter(rv => rv.voted_up).length;
        return {
          label: w.label,
          pos,
          tot: bucket.length,
          pct: Math.round(pos / bucket.length * 100),
        };
      }).filter(Boolean);

      res.status(200).json(data);
    } catch(e) { res.status(502).json({ error: e.message }); }

  } else if (type === 'reviews-geo') {
    const LANGS = [
      { lang:'english',   flag:'🇺🇸', label:'English'    },
      { lang:'schinese',  flag:'🇨🇳', label:'Chinese'    },
      { lang:'russian',   flag:'🇷🇺', label:'Russian'    },
      { lang:'brazilian', flag:'🇧🇷', label:'Portuguese' },
      { lang:'spanish',   flag:'🇪🇸', label:'Spanish'    },
      { lang:'german',    flag:'🇩🇪', label:'German'     },
      { lang:'french',    flag:'🇫🇷', label:'French'     },
      { lang:'japanese',  flag:'🇯🇵', label:'Japanese'   },
      { lang:'koreana',   flag:'🇰🇷', label:'Korean'     },
    ];
    const results = [];
    for (let i = 0; i < LANGS.length; i += 3) {
      const batch = LANGS.slice(i, i + 3);
      const batchResults = await Promise.allSettled(batch.map(async ({ lang, flag, label }) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const r = await fetch(
            `https://store.steampowered.com/appreviews/${appid}?json=1&language=${lang}&purchase_type=all&num_per_page=20&filter=all`,
            { headers:{'User-Agent':'GAMEINT/1.0'}, signal: controller.signal }
          );
          clearTimeout(timeout);
          if (!r.ok) return null;
          const d = await r.json();
          const reviews = d.reviews || [];
          if (reviews.length < 3) return null;
          const pos = reviews.filter(rv => rv.voted_up).length;
          const tot = reviews.length;
          const totalReviews = d.query_summary?.total_reviews || 0;
          return { lang, flag, label, pos, tot, totalReviews, pct: Math.round(pos/tot*100) };
        } catch { return null; }
      }));
      batchResults.forEach(r => { if (r.status==='fulfilled' && r.value) results.push(r.value); });
    }
    res.status(200).json(results.sort((a,b) => b.totalReviews - a.totalReviews));

  } else {
    res.status(400).json({ error: 'unknown type: ' + type });
  }
};
