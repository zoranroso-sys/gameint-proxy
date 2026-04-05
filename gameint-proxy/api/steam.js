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
    // Fetch sentiment across multiple time windows by counting voted_up on actual reviews
    const windows = [
      { label: 'Last 7d',  day_range: 7  },
      { label: 'Last 30d', day_range: 30 },
      { label: 'Last 90d', day_range: 90 },
    ];
    try {
      const results = await Promise.allSettled(windows.map(async w => {
        const r = await fetch(
          `https://store.steampowered.com/appreviews/${appid}?json=1&language=all&purchase_type=all&num_per_page=40&filter=recent&day_range=${w.day_range}`,
          { headers:{'User-Agent':'GAMEINT/1.0'} }
        );
        if (!r.ok) return null;
        const d = await r.json();
        const reviews = d.reviews || [];
        if (!reviews.length) return null;
        const pos = reviews.filter(rv => rv.voted_up).length;
        return { label: w.label, day_range: w.day_range, pos, tot: reviews.length, pct: Math.round(pos / reviews.length * 100) };
      }));
      const data = results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
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
