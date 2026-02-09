import { NextRequest, NextResponse } from "next/server";
import { fetchReddit, fetchHN, fetchGoogleNews, type Discussion, type NewsItem } from "@/lib/sources";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function generateAnalysis(topic: string, reddit: Discussion[], hn: Discussion[], news: NewsItem[]) {
  const totalPosts = reddit.length + hn.length;
  const totalNews = news.length;
  const totalEngagement = [...reddit, ...hn].reduce((sum, d) => sum + d.score + d.comments, 0);
  const avgScore = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;

  // Sentiment heuristic based on engagement patterns and volume
  const highEngagement = [...reddit, ...hn].filter(d => d.score > 50 || d.comments > 20);
  const recentPosts = [...reddit, ...hn].filter(d => d.timeAgo.includes("m ago") || d.timeAgo.includes("1h ago") || d.timeAgo.includes("2h ago"));
  
  let sentiment = "neutral";
  if (recentPosts.length > 5 && highEngagement.length > 3) sentiment = "bullish";
  else if (totalPosts < 5 && totalNews < 3) sentiment = "bearish";

  // Generate summary
  const topDiscussion = [...reddit, ...hn].sort((a, b) => (b.score + b.comments) - (a.score + a.comments))[0];
  const topNewsItem = news[0];
  
  let summary = `"${topic}" is generating ${totalPosts > 20 ? "significant" : totalPosts > 10 ? "moderate" : "limited"} discussion across platforms with ${totalEngagement.toLocaleString()} total engagement points.`;
  
  if (topDiscussion) {
    summary += ` The top discussion "${topDiscussion.title}" has ${topDiscussion.score} upvotes and ${topDiscussion.comments} comments on ${topDiscussion.source === "reddit" ? "Reddit" : "Hacker News"}.`;
  }
  if (topNewsItem) {
    summary += ` Recent news: "${topNewsItem.title}" via ${topNewsItem.source || "Google News"}.`;
  }
  if (recentPosts.length > 3) {
    summary += ` Activity is ${recentPosts.length > 8 ? "surging" : "picking up"} with ${recentPosts.length} posts in the last few hours.`;
  }

  // Extract key voices (top authors by engagement)
  const authorMap = new Map<string, { score: number; platform: string; title: string }>();
  [...reddit, ...hn].forEach(d => {
    const existing = authorMap.get(d.author);
    const total = d.score + d.comments;
    if (!existing || total > existing.score) {
      authorMap.set(d.author, { score: total, platform: d.source, title: d.title });
    }
  });
  const keyVoices = Array.from(authorMap.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, 5)
    .map(([name, data]) => ({
      name,
      platform: data.platform,
      stance: data.score > avgScore * 1.5 ? "bullish" : data.score < avgScore * 0.5 ? "bearish" : "neutral",
      quote: data.title,
    }));

  // Generate controversies from subreddit diversity
  const subreddits = new Map<string, number>();
  reddit.forEach(d => {
    if (d.subreddit) subreddits.set(d.subreddit, (subreddits.get(d.subreddit) || 0) + 1);
  });
  const topSubs = Array.from(subreddits.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  
  const controversies = [];
  if (topSubs.length >= 2) {
    controversies.push({
      topic: `Cross-community interest`,
      bull: `Active discussion in r/${topSubs[0][0]} (${topSubs[0][1]} posts) shows strong community engagement`,
      bear: `Discussion spread across ${subreddits.size} subreddits suggests fragmented opinion`,
    });
  }
  if (highEngagement.length > 0 && totalPosts - highEngagement.length > highEngagement.length * 2) {
    controversies.push({
      topic: "Engagement disparity",
      bull: `${highEngagement.length} posts with high engagement indicate focused interest`,
      bear: `${totalPosts - highEngagement.length} low-engagement posts suggest fading momentum`,
    });
  }
  if (hn.length > 0 && reddit.length > 0) {
    const hnAvg = hn.reduce((s, d) => s + d.score, 0) / hn.length;
    const redditAvg = reddit.reduce((s, d) => s + d.score, 0) / reddit.length;
    controversies.push({
      topic: "Platform sentiment divergence",
      bull: redditAvg > hnAvg ? `Reddit community is more engaged (avg ${Math.round(redditAvg)} vs HN ${Math.round(hnAvg)})` : `HN community shows stronger technical interest (avg ${Math.round(hnAvg)} vs Reddit ${Math.round(redditAvg)})`,
      bear: redditAvg > hnAvg ? `Lower HN engagement may indicate skepticism from technical community` : `Lower Reddit engagement suggests less mainstream appeal`,
    });
  }

  // Generate predictions
  const predictions = [];
  if (recentPosts.length > 5) {
    predictions.push({
      prediction: `Expect continued high discussion volume over the next 24-48 hours`,
      confidence: "high",
      reasoning: `${recentPosts.length} recent posts indicate an active discussion cycle`,
    });
  }
  if (totalNews > 5) {
    predictions.push({
      prediction: `Media coverage likely to increase as ${totalNews} outlets are already covering this`,
      confidence: "medium",
      reasoning: `Multi-outlet coverage often triggers follow-on reporting`,
    });
  }
  if (highEngagement.length > 2) {
    predictions.push({
      prediction: `Key discussion threads will likely surface more contrarian takes as engagement grows`,
      confidence: "medium",
      reasoning: `High-engagement posts (${highEngagement.length} threads) typically attract diverse opinions over time`,
    });
  }
  if (predictions.length === 0) {
    predictions.push({
      prediction: `Discussion may remain at current levels unless a catalyst event occurs`,
      confidence: "low",
      reasoning: `Current engagement levels are ${totalPosts > 15 ? "moderate" : "limited"} without a clear trend direction`,
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

    // Fetch all sources in parallel
    const [reddit, hn, news] = await Promise.all([
      fetchReddit(topic),
      fetchHN(topic),
      fetchGoogleNews(topic),
    ]);

    const discussions = [...reddit, ...hn].sort((a, b) => (b.score + b.comments) - (a.score + a.comments));

    // Generate intelligent analysis from the data itself
    const aiAnalysis = generateAnalysis(topic, reddit, hn, news);

    const result = {
      topic,
      timestamp: new Date().toISOString(),
      summary: aiAnalysis.summary,
      sentiment: aiAnalysis.sentiment,
      keyVoices: aiAnalysis.keyVoices || [],
      controversies: aiAnalysis.controversies || [],
      predictions: aiAnalysis.predictions || [],
      discussions: discussions.slice(0, 20),
      news,
      sources: {
        reddit: reddit.length,
        hn: hn.length,
        news: news.length,
      },
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
