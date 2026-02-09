export interface Discussion {
  title: string;
  url: string;
  score: number;
  comments: number;
  author: string;
  source: "reddit" | "hn";
  timeAgo: string;
  subreddit?: string;
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  pubDate: string;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export async function fetchReddit(topic: string): Promise<Discussion[]> {
  try {
    const res = await fetch(
      `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=hot&limit=25`,
      { headers: { "User-Agent": "PulseBoard/1.0" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.data?.children || []).map((c: any) => ({
      title: c.data.title,
      url: `https://reddit.com${c.data.permalink}`,
      score: c.data.score,
      comments: c.data.num_comments,
      author: c.data.author,
      source: "reddit" as const,
      timeAgo: timeAgo(new Date(c.data.created_utc * 1000)),
      subreddit: c.data.subreddit,
    }));
  } catch {
    return [];
  }
}

export async function fetchHN(topic: string): Promise<Discussion[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=20`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.hits || []).map((h: any) => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      score: h.points || 0,
      comments: h.num_comments || 0,
      author: h.author,
      source: "hn" as const,
      timeAgo: timeAgo(new Date(h.created_at)),
    }));
  } catch {
    return [];
  }
}

export async function fetchGoogleNews(topic: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`
    );
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || "";
      const source = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
      items.push({ title, url: link, source, pubDate });
    }
    return items.slice(0, 15);
  } catch {
    return [];
  }
}
