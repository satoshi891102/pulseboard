import { NextRequest, NextResponse } from "next/server";
import {
  fetchReddit, fetchHN, fetchGoogleNews, fetchX, fetchLobsters,
  filterRelevant, filterRelevantNews, rankDiscussions, calculatePulseScore,
  timeDecayScore,
  type Discussion, type NewsItem,
} from "@/lib/sources";
import { extractKeywords } from "@/lib/wordcloud";
import { analyzeSentiment } from "@/lib/sentiment";

interface CacheEntry { data: any; timestamp: number; }
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes (tighter for freshness)

function generateAnalysis(
  topic: string,
  discussions: Discussion[],
  news: NewsItem[],
  sourceCounts: Record<string, number>,
) {
  const now = Date.now();
  const total = discussions.length;
  const totalNews = news.length;
  const totalEngagement = discussions.reduce((s, d) => s + d.score + d.comments, 0);

  // Time buckets
  const last2h = discussions.filter(d => now - d.timestamp < 7200000);
  const last12h = discussions.filter(d => now - d.timestamp < 43200000);
  const last48h = discussions.filter(d => now - d.timestamp < 172800000);

  // Sentiment
  const allTitles = [...discussions, ...news].map(d => d.title);
  const sentimentResult = analyzeSentiment(allTitles);
  let sentiment = sentimentResult.label;
  if (sentimentResult.confidence < 0.15 && total > 0) {
    // Use engagement velocity as proxy
    if (last2h.length > 5) sentiment = "bullish";
    else if (total < 3) sentiment = "bearish";
    else sentiment = "neutral";
  }

  // Top items (by time-decay score)
  const ranked = rankDiscussions(discussions);
  const top3 = ranked.slice(0, 3);

  // ── Build contextual summary ──────────────
  const parts: string[] = [];

  // Velocity assessment
  if (last2h.length >= 5) {
    parts.push(`"${topic}" is surging right now — ${last2h.length} posts in the last 2 hours across ${Object.values(sourceCounts).filter(v => v > 0).length} platforms.`);
  } else if (last12h.length >= 5) {
    parts.push(`"${topic}" has active discussion — ${last12h.length} posts in the last 12 hours.`);
  } else if (last48h.length >= 3) {
    parts.push(`"${topic}" has moderate recent activity — ${last48h.length} posts in the last 48 hours.`);
  } else if (total > 0) {
    parts.push(`"${topic}" has limited recent discussion — ${total} posts found, mostly older than 48 hours.`);
  } else {
    parts.push(`"${topic}" has minimal online discussion right now.`);
  }

  // Top discussion highlight
  if (top3[0]) {
    const t = top3[0];
    const eng = t.score + t.comments;
    const platform = t.source === "hn" ? "Hacker News" : t.source === "reddit" ? `r/${t.subreddit || "Reddit"}` : t.source === "lobsters" ? "Lobsters" : "X";
    parts.push(`Hottest thread: "${t.title}" on ${platform} (${eng.toLocaleString()} engagement, ${t.timeAgo}).`);
  }

  // News highlight
  if (news[0]) {
    parts.push(`Latest news: "${news[0].title}" via ${news[0].source || "Google News"}.`);
  }

  // Engagement quality
  if (totalEngagement > 1000) {
    parts.push(`Strong engagement: ${totalEngagement.toLocaleString()} total interactions.`);
  } else if (totalEngagement > 100) {
    parts.push(`Moderate engagement: ${totalEngagement.toLocaleString()} total interactions.`);
  }

  const summary = parts.join(" ");

  // ── Key Voices (by time-decay score, not raw score) ──────
  const authorMap = new Map<string, { decayScore: number; rawScore: number; platform: string; title: string; timeAgo: string }>();
  discussions.forEach(d => {
    const ds = timeDecayScore(d.score, d.comments, d.timestamp);
    const existing = authorMap.get(d.author);
    if (!existing || ds > existing.decayScore) {
      authorMap.set(d.author, {
        decayScore: ds,
        rawScore: d.score + d.comments,
        platform: d.source,
        title: d.title,
        timeAgo: d.timeAgo,
      });
    }
  });
  const avgDecay = discussions.length > 0
    ? discussions.reduce((s, d) => s + timeDecayScore(d.score, d.comments, d.timestamp), 0) / discussions.length
    : 0;
  const keyVoices = Array.from(authorMap.entries())
    .sort((a, b) => b[1].decayScore - a[1].decayScore)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      platform: data.platform,
      stance: data.decayScore > avgDecay * 2 ? "bullish" : data.decayScore < avgDecay * 0.3 ? "bearish" : "neutral",
      quote: data.title,
      timeAgo: data.timeAgo,
    }));

  // ── Controversies ──────
  const controversies: { topic: string; bull: string; bear: string }[] = [];

  // Platform divergence
  const platformEngagement: Record<string, number[]> = {};
  discussions.forEach(d => {
    if (!platformEngagement[d.source]) platformEngagement[d.source] = [];
    platformEngagement[d.source].push(d.score + d.comments);
  });
  const platforms = Object.entries(platformEngagement);
  if (platforms.length >= 2) {
    const sorted = platforms.map(([p, scores]) => ({
      platform: p,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      count: scores.length,
    })).sort((a, b) => b.avg - a.avg);
    const pName = (s: string) => s === "hn" ? "Hacker News" : s === "reddit" ? "Reddit" : s === "lobsters" ? "Lobsters" : "X";
    controversies.push({
      topic: "Platform divergence",
      bull: `${pName(sorted[0].platform)} leads with avg ${Math.round(sorted[0].avg)} engagement across ${sorted[0].count} posts`,
      bear: `${pName(sorted[sorted.length - 1].platform)} shows only ${Math.round(sorted[sorted.length - 1].avg)} avg engagement — possible skepticism`,
    });
  }

  // Freshness gap
  if (last2h.length > 0 && discussions.length > last2h.length * 3) {
    controversies.push({
      topic: "Activity spike vs. baseline",
      bull: `${last2h.length} posts in the last 2 hours suggests a breakout moment`,
      bear: `Most discussion (${discussions.length - last2h.length} posts) is older — the spike may not sustain`,
    });
  }

  // Subreddit diversity
  const subs = new Map<string, number>();
  discussions.filter(d => d.source === "reddit" && d.subreddit).forEach(d => {
    subs.set(d.subreddit!, (subs.get(d.subreddit!) || 0) + 1);
  });
  if (subs.size >= 3) {
    const topSubs = Array.from(subs.entries()).sort((a, b) => b[1] - a[1]);
    controversies.push({
      topic: "Cross-community spread",
      bull: `Discussion spans ${subs.size} subreddits — broad interest (r/${topSubs[0][0]}, r/${topSubs[1][0]}, r/${topSubs[2][0]})`,
      bear: `Fragmented across many communities — no single "home base" for the conversation`,
    });
  }

  // ── Predictions ──────
  const predictions: { prediction: string; confidence: string; reasoning: string }[] = [];

  if (last2h.length >= 5) {
    predictions.push({
      prediction: `High probability of continued surging activity in the next 6-12 hours`,
      confidence: "high",
      reasoning: `${last2h.length} posts in 2 hours indicates an active cycle that typically sustains for 12-24h`,
    });
  } else if (last12h.length >= 5 && last2h.length < 3) {
    predictions.push({
      prediction: `Discussion likely peaked — expect declining volume unless a new catalyst emerges`,
      confidence: "medium",
      reasoning: `Active 12h ago (${last12h.length} posts) but only ${last2h.length} in the last 2h — momentum fading`,
    });
  }

  if (totalNews > 5) {
    predictions.push({
      prediction: `Media cycle likely continues — ${totalNews} outlets creates follow-on coverage pressure`,
      confidence: "medium",
      reasoning: `Multi-outlet coverage typically triggers 2-3 more days of reporting`,
    });
  }

  if (predictions.length === 0) {
    predictions.push({
      prediction: `Activity will likely stay flat unless driven by a news catalyst`,
      confidence: "low",
      reasoning: `Current volume (${total} posts, ${last2h.length} fresh) doesn't indicate momentum`,
    });
  }

  return { summary, sentiment, keyVoices, controversies, predictions };
}

export async function POST(req: NextRequest) {
  try {
    const { topic } = await req.json();
    if (!topic || typeof topic !== "string") {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const cacheKey = topic.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Fetch ALL sources in parallel
    const [reddit, hn, news, xPosts, lobsters] = await Promise.all([
      fetchReddit(topic),
      fetchHN(topic),
      fetchGoogleNews(topic),
      fetchX(topic),
      fetchLobsters(topic),
    ]);

    // Relevance filter
    const filteredReddit = filterRelevant(reddit, topic);
    const filteredHN = filterRelevant(hn, topic);
    const filteredX = filterRelevant(xPosts, topic);
    const filteredLobsters = filterRelevant(lobsters, topic);
    const filteredNews = filterRelevantNews(news, topic);

    // Merge and rank by time-decay score
    const allDiscussions = [...filteredReddit, ...filteredHN, ...filteredX, ...filteredLobsters];
    const ranked = rankDiscussions(allDiscussions);

    const sourceCounts = {
      reddit: filteredReddit.length,
      hn: filteredHN.length,
      x: filteredX.length,
      lobsters: filteredLobsters.length,
      news: filteredNews.length,
    };

    // Analysis
    const aiAnalysis = generateAnalysis(topic, ranked, filteredNews, sourceCounts);

    // Keywords
    const allTexts = [...ranked.map(d => d.title), ...filteredNews.map(n => n.title)];
    const keywords = extractKeywords(allTexts, topic);

    // Pulse Score
    const pulseScore = calculatePulseScore(ranked, filteredNews, sourceCounts);

    const result = {
      topic,
      timestamp: new Date().toISOString(),
      pulseScore,
      summary: aiAnalysis.summary,
      sentiment: aiAnalysis.sentiment,
      keyVoices: aiAnalysis.keyVoices || [],
      controversies: aiAnalysis.controversies || [],
      predictions: aiAnalysis.predictions || [],
      discussions: ranked.slice(0, 30),
      news: filteredNews.slice(0, 15),
      keywords,
      sources: sourceCounts,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
