import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { fetchReddit, fetchHN, fetchGoogleNews } from "@/lib/sources";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

    // Build context for Claude
    const context = `
Topic: "${topic}"

TOP REDDIT DISCUSSIONS (${reddit.length} results):
${reddit.slice(0, 10).map(d => `- "${d.title}" by u/${d.author} in r/${d.subreddit} (${d.score} upvotes, ${d.comments} comments, ${d.timeAgo})`).join("\n")}

TOP HACKER NEWS DISCUSSIONS (${hn.length} results):
${hn.slice(0, 10).map(d => `- "${d.title}" by ${d.author} (${d.score} points, ${d.comments} comments, ${d.timeAgo})`).join("\n")}

NEWS HEADLINES (${news.length} results):
${news.slice(0, 10).map(n => `- "${n.title}" — ${n.source} (${n.pubDate})`).join("\n")}
`;

    let aiAnalysis = {
      summary: "Unable to generate AI analysis. Showing raw data.",
      sentiment: "neutral" as string,
      keyVoices: [] as any[],
      controversies: [] as any[],
      predictions: [] as any[],
    };

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const anthropic = new Anthropic();
        const message = await anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: `Analyze this real-time data about "${topic}" and return a JSON object with these exact fields:

${context}

Return ONLY valid JSON (no markdown, no code blocks) with this structure:
{
  "summary": "3-4 sentence briefing of what's happening right now with this topic",
  "sentiment": "bullish" | "bearish" | "neutral",
  "keyVoices": [{"name": "username", "platform": "reddit|hn", "stance": "bullish|bearish|neutral", "quote": "paraphrased position"}] (top 5),
  "controversies": [{"bull": "bull argument", "bear": "bear argument", "topic": "specific disagreement"}] (top 3),
  "predictions": [{"prediction": "what might happen next", "confidence": "high|medium|low", "reasoning": "why"}] (top 3)
}`
          }],
        });

        const text = message.content[0].type === "text" ? message.content[0].text : "";
        // Try to extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiAnalysis = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("Claude API error:", e);
      }
    }

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
