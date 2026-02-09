# PulseBoard

> Real-time narrative intelligence on any topic. In seconds.

**Live:** [pulseboard-one.vercel.app](https://pulseboard-one.vercel.app)

## What it does

Type any topic — get instant, AI-powered analysis from Hacker News, Reddit, and Google News combined into a living dashboard.

### Features

- **Pulse Score** — Single 0-100 metric measuring topic attention intensity
- **Narrative Summary** — AI-generated overview with sentiment analysis
- **Activity Timeline** — Bar chart showing when discussions peaked
- **Source Breakdown** — Visual bar showing platform distribution
- **Trending Discussions** — Top posts sorted by engagement
- **Key Voices** — Most influential authors and their positions
- **News Feed** — Latest articles from Google News
- **Controversy Map** — Bulls vs Bears breakdown
- **Related Topics** — Clickable keyword cloud extracted from content
- **Predicted Next Moves** — Forward-looking analysis based on patterns
- **Topic Comparison** — Head-to-head analysis with Pulse Scores
- **Watchlist** — Track topics over time, refresh scores
- **Trending Now** — Live trending topics from HN + Google News
- **Search History** — Track and revisit past analyses
- **Export Reports** — Download analysis as text files
- **Dynamic OG Images** — Social cards generated per topic
- **Auto-refresh** — Updates every 5 minutes
- **Keyboard shortcut** — ⌘K to focus search

### Data Sources

| Source | Method | Rate Limit |
|--------|--------|------------|
| Hacker News | Algolia API | Free, no key |
| Google News | RSS Feed | Free, no key |
| Reddit | JSON API | Blocked by Vercel IPs* |

*Reddit works locally but returns 403 from Vercel serverless functions.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Analysis:** Custom heuristic engine (no LLM API required)
- **Deploy:** Vercel
- **OG Images:** Next.js `ImageResponse` (Edge Runtime)

## Local Development

```bash
git clone https://github.com/satoshi891102/pulseboard.git
cd pulseboard/app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
src/
├── app/
│   ├── page.tsx           # Landing page
│   ├── dashboard/page.tsx # Analysis dashboard
│   ├── compare/page.tsx   # Topic comparison
│   ├── watchlist/page.tsx # Topic watchlist
│   ├── history/page.tsx   # Search history
│   └── api/
│       ├── analyze/       # Main analysis endpoint
│       ├── trending/      # Trending topics
│       └── og/            # Dynamic OG images
├── components/
│   ├── ActivityTimeline   # Discussion recency chart
│   └── EngagementBar     # Visual stat components
└── lib/
    ├── sources.ts        # Data fetching (HN, Reddit, News)
    ├── sentiment.ts      # Title-based sentiment analysis
    └── wordcloud.ts      # Keyword extraction
```

## License

MIT

---

Built by [Basirah](https://github.com/satoshi891102) 🔮
