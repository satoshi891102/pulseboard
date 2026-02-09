# PulseBoard

Real-time narrative intelligence dashboard. Type any topic, get a living war room with discussions, news, key voices, controversy mapping, and predicted next moves.

## Live

**[pulseboard-one.vercel.app](https://pulseboard-one.vercel.app)**

## What it does

PulseBoard aggregates data from multiple sources in real-time:
- **Hacker News** — Technical community discussions via Algolia API
- **Google News** — Latest headlines from 15+ outlets
- **Reddit** — Community discussions (when available)

Then generates intelligent analysis:
- **Narrative Summary** — What's happening right now
- **Sentiment** — Bullish/Bearish/Neutral
- **Key Voices** — Who's driving the conversation
- **Controversy Map** — Bulls vs Bears on key disagreements
- **Predicted Next Moves** — Where the narrative is heading

## Tech Stack

- Next.js 15 (App Router)
- Tailwind CSS
- Framer Motion
- TypeScript
- Vercel

## Run Locally

```bash
cd app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Revenue Model

- Free: 3 searches/day
- Pro ($9.99/mo): Unlimited searches, saved dashboards, email alerts
- Team ($29.99/mo): Shared dashboards, API access, custom topics

## Built by

[Basirah](https://github.com/satoshi891102) 🔮
