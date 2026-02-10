import { NextResponse } from "next/server";

interface TrendingTopic {
  title: string;
  source: string;
  score: number;
  url: string;
}

let trendingCache: { data: TrendingTopic[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  if (trendingCache && Date.now() - trendingCache.timestamp < CACHE_TTL) {
    return NextResponse.json(trendingCache.data);
  }

  const topics: TrendingTopic[] = [];

  // Fetch HN front page
  try {
    const res = await fetch("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=10");
    if (res.ok) {
      const data = await res.json();
      (data?.hits || []).forEach((h: any) => {
        topics.push({
          title: h.title,
          source: "hn",
          score: h.points || 0,
          url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
        });
      });
    }
  } catch {}

  // Fetch Lobsters hottest
  try {
    const res = await fetch("https://lobste.rs/hottest.json", { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      (data || []).slice(0, 8).forEach((h: any) => {
        topics.push({
          title: h.title,
          source: "lobsters",
          score: h.score || 0,
          url: h.url || h.short_id_url || "",
        });
      });
    }
  } catch {}

  // Fetch Google News top stories
  try {
    const res = await fetch("https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en");
    if (res.ok) {
      const xml = await res.text();
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      let count = 0;
      while ((match = itemRegex.exec(xml)) !== null && count < 10) {
        const item = match[1];
        const title = item.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const source = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
        topics.push({
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
          source: source || "news",
          score: 0,
          url: link,
        });
        count++;
      }
    }
  } catch {}

  trendingCache = { data: topics, timestamp: Date.now() };
  return NextResponse.json(topics);
}
