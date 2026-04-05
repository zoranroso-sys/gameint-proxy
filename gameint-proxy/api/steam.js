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

  } else if (type === 'reviews-geo') {
    // Fetch 20 reviews per language and count voted_up
    // Keep it small (20 not 100) to stay within Vercel's 10s function timeout
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

    // Run sequentially in small batches to avoid timeout — 3 at a time
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
          if (reviews.length < 3) return null; // skip if too few
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
    res.status(400).json({ error: 'unknown type' });
  }
};
