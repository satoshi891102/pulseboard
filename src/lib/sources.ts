export interface Discussion {
  title: string;
  url: string;
  score: number;
  comments: number;
  author: string;
  source: "reddit" | "hn" | "x" | "lobsters" | "ph";
  timeAgo: string;
  timestamp: number; // unix ms — for proper time-decay ranking
  subreddit?: string;
  freshness: "live" | "recent" | "aging" | "stale"; // <2h, <12h, <48h, >48h
}

export interface NewsItem {
  title: string;
  url: string;
  source: string;
  pubDate: string;
  timestamp: number;
  freshness: "live" | "recent" | "aging" | "stale";
}

function computeTimestamp(dateInput: Date | string | number): number {
  const d = new Date(dateInput);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function getFreshness(ts: number): "live" | "recent" | "aging" | "stale" {
  const hoursAgo = (Date.now() - ts) / 3600000;
  if (hoursAgo < 2) return "live";
  if (hoursAgo < 12) return "recent";
  if (hoursAgo < 48) return "aging";
  return "stale";
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

/**
 * Time-decay score: exponential decay over 24h.
 * A post from 1h ago with 10 upvotes beats a 3-day post with 50.
 */
export function timeDecayScore(rawScore: number, comments: number, timestampMs: number): number {
  const hoursAgo = Math.max(0, (Date.now() - timestampMs) / 3600000);
  const halfLife = 12; // score halves every 12 hours
  const decay = Math.pow(0.5, hoursAgo / halfLife);
  const engagement = rawScore + comments * 1.5; // comments worth 1.5x upvotes
  return engagement * decay;
}

// ── HN (Algolia API — very reliable) ──────────────────────────

export async function fetchHN(topic: string): Promise<Discussion[]> {
  // Fetch both recent and top-scored in parallel for better coverage
  const oneDayAgo = Math.floor((Date.now() - 86400000) / 1000);
  const oneWeekAgo = Math.floor((Date.now() - 604800000) / 1000);

  const recentUrl = new URL("https://hn.algolia.com/api/v1/search_by_date");
  recentUrl.searchParams.set("query", topic);
  recentUrl.searchParams.set("tags", "story");
  recentUrl.searchParams.set("hitsPerPage", "30");
  recentUrl.searchParams.set("numericFilters", `created_at_i>${oneDayAgo}`);

  const topUrl = new URL("https://hn.algolia.com/api/v1/search");
  topUrl.searchParams.set("query", topic);
  topUrl.searchParams.set("tags", "story");
  topUrl.searchParams.set("hitsPerPage", "20");
  topUrl.searchParams.set("numericFilters", `created_at_i>${oneWeekAgo},points>5`);

  const [recentRes, topRes] = await Promise.all([
    fetch(recentUrl.toString()).catch(() => null),
    fetch(topUrl.toString()).catch(() => null),
  ]);

  const seen = new Set<string>();
  const results: Discussion[] = [];

  for (const res of [recentRes, topRes]) {
    if (!res || !res.ok) continue;
    try {
      const data = await res.json();
      for (const h of data?.hits || []) {
        const id = h.objectID;
        if (seen.has(id)) continue;
        seen.add(id);
        const ts = computeTimestamp(h.created_at);
        results.push({
          title: h.title || "",
          url: h.url || `https://news.ycombinator.com/item?id=${id}`,
          score: h.points || 0,
          comments: h.num_comments || 0,
          author: h.author || "unknown",
          source: "hn",
          timeAgo: timeAgo(new Date(ts)),
          timestamp: ts,
          freshness: getFreshness(ts),
        });
      }
    } catch {}
  }
  return results;
}

// ── Reddit (multiple fallback strategies) ──────────────────────

export async function fetchReddit(topic: string): Promise<Discussion[]> {
  const headers = {
    "User-Agent": "PulseBoard/2.0 (Real-time intelligence dashboard)",
    Accept: "application/json",
  };

  // Strategy 1: JSON API (new + hot combined)
  const endpoints = [
    `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=new&t=day&limit=25`,
    `https://www.reddit.com/search.json?q=${encodeURIComponent(topic)}&sort=relevance&t=week&limit=25`,
  ];

  const seen = new Set<string>();
  const results: Discussion[] = [];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text.startsWith("{")) continue;
      const data = JSON.parse(text);
      for (const c of data?.data?.children || []) {
        const d = c.data;
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        const ts = d.created_utc * 1000;
        results.push({
          title: d.title,
          url: `https://reddit.com${d.permalink}`,
          score: d.score || 0,
          comments: d.num_comments || 0,
          author: d.author || "unknown",
          source: "reddit",
          timeAgo: timeAgo(new Date(ts)),
          timestamp: ts,
          freshness: getFreshness(ts),
          subreddit: d.subreddit,
        });
      }
      if (results.length >= 10) break; // got enough from first endpoint
    } catch {
      continue;
    }
  }

  // Strategy 2: RSS fallback if JSON blocked
  if (results.length === 0) {
    try {
      const rssRes = await fetch(
        `https://www.reddit.com/search.xml?q=${encodeURIComponent(topic)}&sort=new&t=week`,
        { headers: { "User-Agent": "PulseBoard/2.0" }, signal: AbortSignal.timeout(6000) }
      );
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
        let match;
        while ((match = entryRegex.exec(xml)) !== null && results.length < 25) {
          const entry = match[1];
          const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
          const link = entry.match(/<link href="([^"]+)"/)?.[1] || "";
          const author = entry.match(/<name>\/u\/([^<]+)<\/name>/)?.[1] || "unknown";
          const updated = entry.match(/<updated>([^<]+)<\/updated>/)?.[1];
          const ts = updated ? computeTimestamp(updated) : Date.now();
          results.push({
            title,
            url: link,
            score: 0,
            comments: 0,
            author,
            source: "reddit",
            timeAgo: updated ? timeAgo(new Date(updated)) : "recently",
            timestamp: ts,
            freshness: getFreshness(ts),
          });
        }
      }
    } catch {}
  }
  return results;
}

// ── X/Twitter (multiple Nitter instances + fallback) ──────────

export async function fetchX(topic: string): Promise<Discussion[]> {
  const nitterInstances = [
    "nitter.privacydev.net",
    "nitter.poast.org",
    "nitter.net",
    "xcancel.com",
    "nitter.1d4.us",
  ];

  for (const instance of nitterInstances) {
    try {
      const res = await fetch(
        `https://${instance}/search/rss?f=tweets&q=${encodeURIComponent(topic)}`,
        { headers: { "User-Agent": "PulseBoard/2.0" }, signal: AbortSignal.timeout(5000) }
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
          .replace(/<[^>]+>/g, "");
        const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "";
        const author = item.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1") ||
          link.match(/\/([^\/]+)\/status/)?.[1] || "unknown";
        const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1];
        const ts = pubDate ? computeTimestamp(pubDate) : Date.now();
        const xUrl = link.replace(`https://${instance}`, "https://x.com");

        items.push({
          title: title.slice(0, 280),
          url: xUrl,
          score: 0,
          comments: 0,
          author: author.replace("@", ""),
          source: "x",
          timeAgo: pubDate ? timeAgo(new Date(pubDate)) : "recently",
          timestamp: ts,
          freshness: getFreshness(ts),
        });
      }
      if (items.length > 0) return items;
    } catch {
      continue;
    }
  }
  return [];
}

// ── Lobsters (tech community, reliable API) ──────────────────

export async function fetchLobsters(topic: string): Promise<Discussion[]> {
  try {
    const res = await fetch(
      `https://lobste.rs/search.json?q=${encodeURIComponent(topic)}&what=stories&order=newest`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data || []).slice(0, 15).map((h: any) => {
      const ts = computeTimestamp(h.created_at);
      return {
        title: h.title || "",
        url: h.url || h.short_id_url || "",
        score: h.score || 0,
        comments: h.comment_count || 0,
        author: h.submitter_user?.username || "unknown",
        source: "lobsters" as const,
        timeAgo: timeAgo(new Date(ts)),
        timestamp: ts,
        freshness: getFreshness(ts),
      };
    });
  } catch {
    return [];
  }
}

// ── Google News (RSS — reliable, slightly delayed) ────────────

export async function fetchGoogleNews(topic: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`,
      { signal: AbortSignal.timeout(6000) }
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
      const ts = pubDate ? computeTimestamp(pubDate) : Date.now();
      items.push({ title, url: link, source, pubDate, timestamp: ts, freshness: getFreshness(ts) });
    }
    return items.slice(0, 20);
  } catch {
    return [];
  }
}

// ── Relevance filtering ──────────────────────────────────────

export function filterRelevant(items: Discussion[], topic: string): Discussion[] {
  const terms = topic.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return items;
  return items.filter(item => {
    const title = item.title.toLowerCase();
    // Single-word: must contain the word. Multi-word: must contain ALL terms.
    if (terms.length === 1) return title.includes(terms[0]);
    return terms.every(term => title.includes(term));
  });
}

export function filterRelevantNews(items: NewsItem[], topic: string): NewsItem[] {
  const terms = topic.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return items;
  return items.filter(item => {
    const title = item.title.toLowerCase();
    return terms.every(term => title.includes(term));
  });
}

// ── Ranking (time-decay + engagement) ─────────────────────────

export function rankDiscussions(items: Discussion[]): Discussion[] {
  return [...items].sort((a, b) => {
    const scoreA = timeDecayScore(a.score, a.comments, a.timestamp);
    const scoreB = timeDecayScore(b.score, b.comments, b.timestamp);
    return scoreB - scoreA;
  });
}

// ── Pulse Score (0-100, weighted properly) ────────────────────

export function calculatePulseScore(
  discussions: Discussion[],
  news: NewsItem[],
  sourceCounts: Record<string, number>
): number {
  if (discussions.length === 0 && news.length === 0) return 0;

  const now = Date.now();

  // 1. Freshness score (0-30): How recent is the conversation?
  const freshItems = discussions.filter(d => now - d.timestamp < 7200000); // <2h
  const recentItems = discussions.filter(d => now - d.timestamp < 43200000); // <12h
  const freshnessScore = Math.min(30, freshItems.length * 5 + recentItems.length * 1.5);

  // 2. Volume score (0-25): How much discussion?
  const totalItems = discussions.length + news.length;
  const volumeScore = Math.min(25, Math.log2(totalItems + 1) * 5);

  // 3. Engagement score (0-25): Are people actually engaging?
  const totalEngagement = discussions.reduce((s, d) => s + d.score + d.comments, 0);
  const engagementScore = Math.min(25, Math.log2(totalEngagement + 1) * 3);

  // 4. Source diversity (0-20): Is it discussed across platforms?
  const activeSources = Object.values(sourceCounts).filter(v => v > 0).length;
  const diversityScore = Math.min(20, activeSources * 5);

  return Math.round(freshnessScore + volumeScore + engagementScore + diversityScore);
}
