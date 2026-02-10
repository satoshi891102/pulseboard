export interface Discussion {
  title: string;
  url: string;
  score: number;
  comments: number;
  author: string;
  source: "reddit" | "hn" | "x";
  timeAgo: string;
  subreddit?: string;
}

/**
 * Strict relevance filter — only keep results where the topic
 * appears in the title (case-insensitive). Prevents HN/Reddit
 * returning tangentially related content.
 */
function filterRelevant(items: Discussion[], topic: string): Discussion[] {
  const terms = topic.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  return items.filter(item => {
    const title = item.title.toLowerCase();
    // Must contain ALL search terms (not just one)
    return terms.every(term => title.includes(term));
  });
}

function filterRelevantNews(items: NewsItem[], topic: string): NewsItem[] {
  const terms = topic.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  return items.filter(item => {
    const title = item.title.toLowerCase();
    return terms.every(term => title.includes(term));
  });
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
  // Try multiple approaches since Reddit blocks serverless IPs
  const urls = [
    `https://old.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=relevance&t=week&limit=25`,
    `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=relevance&t=week&limit=25`,
  ];
  
  for (const url of urls) {
    try {
      const res = await fetch(url, { 
        headers: { 
          "User-Agent": "PulseBoard/1.0 (contact: admin@pulseboard.app; https://pulseboard.vercel.app)",
          "Accept": "application/json",
        },
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.startsWith('{')) continue;
      const data = JSON.parse(text);
      const results = (data?.data?.children || []).map((c: any) => ({
        title: c.data.title,
        url: `https://reddit.com${c.data.permalink}`,
        score: c.data.score,
        comments: c.data.num_comments,
        author: c.data.author,
        source: "reddit" as const,
        timeAgo: timeAgo(new Date(c.data.created_utc * 1000)),
        subreddit: c.data.subreddit,
      }));
      if (results.length > 0) return results;
    } catch {
      continue;
    }
  }
  
  // Fallback: try Reddit RSS and parse what we can
  try {
    const rssRes = await fetch(
      `https://www.reddit.com/search.xml?q=${encodeURIComponent(topic)}&sort=relevance&t=week`,
      { headers: { "User-Agent": "PulseBoard/1.0" } }
    );
    if (rssRes.ok) {
      const xml = await rssRes.text();
      const entries: Discussion[] = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;
      while ((match = entryRegex.exec(xml)) !== null && entries.length < 25) {
        const entry = match[1];
        const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "";
        const link = entry.match(/<link href="([^"]+)"/)?.[1] || "";
        const author = entry.match(/<name>\/u\/([^<]+)<\/name>/)?.[1] || "unknown";
        const updated = entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
        entries.push({
          title: title.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
          url: link,
          score: 0,
          comments: 0,
          author,
          source: "reddit",
          timeAgo: updated ? timeAgo(new Date(updated)) : "recently",
        });
      }
      if (entries.length > 0) return entries;
    }
  } catch {}
  
  return [];
}

export async function fetchHN(topic: string): Promise<Discussion[]> {
  try {
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(topic)}&tags=story&hitsPerPage=20&numericFilters=points>5`
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

export async function fetchX(topic: string): Promise<Discussion[]> {
  // Try multiple Nitter instances for X/Twitter search
  const nitterInstances = [
    "nitter.privacydev.net",
    "nitter.poast.org",
    "nitter.net",
  ];
  
  for (const instance of nitterInstances) {
    try {
      const res = await fetch(
        `https://${instance}/search/rss?f=tweets&q=${encodeURIComponent(topic)}&since_id=0`,
        { 
          headers: { "User-Agent": "PulseBoard/1.0" },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes("<item>")) continue;
      
      const items: Discussion[] = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 25) {
        const item = match[1];
        const title = (item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "")
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
          .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
          .replace(/<[^>]+>/g, ""); // strip HTML tags
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const author = item.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") || 
                       link.match(/\/([^\/]+)\/status/)?.[1] || "unknown";
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
        
        // Convert nitter URL to x.com URL
        const xUrl = link.replace(`https://${instance}`, "https://x.com");
        
        items.push({
          title: title.slice(0, 280),
          url: xUrl,
          score: 0, // Nitter doesn't expose engagement metrics
          comments: 0,
          author: author.replace("@", ""),
          source: "x" as const,
          timeAgo: pubDate ? timeAgo(new Date(pubDate)) : "recently",
        });
      }
      if (items.length > 0) return items;
    } catch {
      continue;
    }
  }
  
  return [];
}

export async function fetchGoogleNews(topic: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`,
      { next: { revalidate: 300 } }
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
