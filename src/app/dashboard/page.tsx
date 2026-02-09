"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { StatCard } from "@/components/EngagementBar";

interface AnalysisData {
  topic: string;
  timestamp: string;
  summary: string;
  sentiment: string;
  keyVoices: { name: string; platform: string; stance: string; quote: string }[];
  controversies: { bull: string; bear: string; topic: string }[];
  predictions: { prediction: string; confidence: string; reasoning: string }[];
  discussions: { title: string; url: string; score: number; comments: number; author: string; source: string; timeAgo: string; subreddit?: string }[];
  news: { title: string; url: string; source: string; pubDate: string }[];
  keywords?: { word: string; count: number; relevance: number }[];
  sources: { reddit: number; hn: number; news: number };
}

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded ${className}`} />;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const s = sentiment?.toLowerCase();
  const color = s === "bullish" ? "bg-[var(--color-bullish)]" : s === "bearish" ? "bg-[var(--color-bearish)]" : "bg-[var(--color-neutral)]";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${color}`}>
      {s === "bullish" ? "↑" : s === "bearish" ? "↓" : "→"} {sentiment}
    </span>
  );
}

function Card({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topic = searchParams.get("topic") || "";
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newSearch, setNewSearch] = useState("");

  const analyze = useCallback(async () => {
    if (!topic) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      setData(await res.json());
    } catch {
      setError("Failed to analyze topic. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [topic]);

  // Save to history when data loads
  useEffect(() => {
    if (data && topic) {
      try {
        const stored = localStorage.getItem("pulseboard-history");
        const history = stored ? JSON.parse(stored) : [];
        // Don't duplicate recent same-topic entries
        const recent = history[0];
        if (!recent || recent.topic !== topic || Date.now() - new Date(recent.timestamp).getTime() > 60000) {
          const entry = {
            topic,
            timestamp: new Date().toISOString(),
            sentiment: data.sentiment,
            sources: data.sources.reddit + data.sources.hn + data.sources.news,
          };
          const updated = [entry, ...history.filter((h: any) => h.topic !== topic)].slice(0, 50);
          localStorage.setItem("pulseboard-history", JSON.stringify(updated));
        }
      } catch {}
    }
  }, [data, topic]);

  useEffect(() => { analyze(); }, [analyze]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(analyze, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [analyze]);

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: `PulseBoard: ${topic}`, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleExport = () => {
    if (!data) return;
    const report = [
      `PULSEBOARD REPORT: ${data.topic}`,
      `Generated: ${new Date(data.timestamp).toLocaleString()}`,
      `Sentiment: ${data.sentiment}`,
      `Sources: ${data.sources.reddit + data.sources.hn + data.sources.news} total`,
      ``,
      `== SUMMARY ==`,
      data.summary,
      ``,
      `== TOP DISCUSSIONS ==`,
      ...data.discussions.slice(0, 10).map((d: any) => `• [${d.source.toUpperCase()}] ${d.title} (↑${d.score}, ${d.comments} comments)`),
      ``,
      `== NEWS ==`,
      ...data.news.slice(0, 10).map((n: any) => `• ${n.title} — ${n.source}`),
      ``,
      `== KEY VOICES ==`,
      ...(data.keyVoices || []).map((v: any) => `• ${v.name} (${v.platform}): "${v.quote}"`),
      ``,
      `== PREDICTIONS ==`,
      ...(data.predictions || []).map((p: any) => `• [${p.confidence}] ${p.prediction} — ${p.reasoning}`),
      ``,
      `Report generated by PulseBoard (https://pulseboard-one.vercel.app)`,
    ].join("\n");

    const blob = new Blob([report], { type: "text/plain" });
    const url2 = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url2;
    a.download = `pulseboard-${topic.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url2);
  };

  if (!topic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-[var(--color-text-secondary)]">No topic specified. <Link href="/" className="text-[var(--color-accent)] underline">Go back</Link></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-[var(--color-text-secondary)] hover:text-white transition-colors text-sm">
              ← Back
            </Link>
            <div className="h-4 w-px bg-[var(--color-border)]" />
            <h1 className="text-2xl font-bold">{topic}</h1>
            {data && <SentimentBadge sentiment={data.sentiment} />}
            {data && (
              <span className="text-xs text-[var(--color-text-secondary)] font-mono bg-[var(--color-card)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                {data.sources.reddit + data.sources.hn + data.sources.news} sources
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className="text-xs text-[var(--color-text-secondary)] font-mono hidden md:block">
                Updated {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            )}
            {data && (
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
              >
                Export
              </button>
            )}
            <button
              onClick={handleShare}
              className="px-3 py-1.5 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              Share
            </button>
            <button
              onClick={analyze}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white disabled:opacity-50 transition-colors"
            >
              {loading ? "Analyzing..." : "Refresh"}
            </button>
          </div>
        </div>
        {/* Inline new search */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (newSearch.trim()) router.push(`/dashboard?topic=${encodeURIComponent(newSearch.trim())}`); }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={newSearch}
            onChange={(e) => setNewSearch(e.target.value)}
            placeholder="Search another topic..."
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          <button
            type="submit"
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-white transition-colors"
          >
            Go
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-[var(--color-bearish)]/10 border border-[var(--color-bearish)]/30 text-[var(--color-bearish)]">
          {error}
        </div>
      )}

      {/* Stats row */}
      {data && !loading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          <StatCard label="Total Sources" value={data.sources.reddit + data.sources.hn + data.sources.news} />
          <StatCard label="Discussions" value={data.discussions.length} subtext={`${data.sources.hn} from HN`} />
          <StatCard label="News Articles" value={data.sources.news} subtext="Google News" />
          <StatCard 
            label="Engagement" 
            value={data.discussions.reduce((s: number, d: any) => s + (d.score || 0) + (d.comments || 0), 0)} 
            subtext="upvotes + comments" 
          />
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Skeleton className="h-32 w-full" /></div>
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <div className="md:col-span-2"><Skeleton className="h-32 w-full" /></div>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Narrative Summary — Full Width */}
          <Card className="md:col-span-2" delay={0}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse-glow" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Narrative Summary</h2>
            </div>
            <p className="text-lg leading-relaxed">{data.summary}</p>
            <div className="mt-3 flex gap-4 text-xs text-[var(--color-text-secondary)] font-mono">
              {data.sources.reddit > 0 && <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Reddit: {data.sources.reddit}</span>}
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-orange-300" />HN: {data.sources.hn}</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" />News: {data.sources.news}</span>
            </div>
          </Card>

          {/* Trending Discussions */}
          <Card delay={0.1}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Trending Discussions</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.discussions.slice(0, 10).map((d, i) => (
                <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="block group">
                  <div className="flex items-start gap-2">
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${d.source === "reddit" ? "bg-orange-500/20 text-orange-400" : "bg-orange-300/20 text-orange-300"}`}>
                      {d.source === "reddit" ? "R" : "HN"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm group-hover:text-[var(--color-accent)] transition-colors truncate">{d.title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] font-mono">
                        ↑{d.score} · {d.comments} comments · {d.timeAgo}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
              {data.discussions.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No discussions found.</p>}
            </div>
          </Card>

          {/* Key Voices */}
          <Card delay={0.15}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Key Voices</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {(data.keyVoices || []).map((v, i) => (
                <div key={i} className="border-l-2 pl-3" style={{ borderColor: v.stance === "bullish" ? "var(--color-bullish)" : v.stance === "bearish" ? "var(--color-bearish)" : "var(--color-neutral)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{v.name}</span>
                    <span className="text-xs text-[var(--color-text-secondary)] font-mono">{v.platform}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">&ldquo;{v.quote}&rdquo;</p>
                </div>
              ))}
              {(!data.keyVoices || data.keyVoices.length === 0) && <p className="text-sm text-[var(--color-text-secondary)]">No key voices identified.</p>}
            </div>
          </Card>

          {/* News Feed */}
          <Card delay={0.2}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">News Feed</h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {data.news.slice(0, 10).map((n, i) => (
                <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="block group">
                  <p className="text-sm group-hover:text-[var(--color-accent)] transition-colors">{n.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] font-mono">{n.source} · {n.pubDate ? new Date(n.pubDate).toLocaleDateString() : ""}</p>
                </a>
              ))}
              {data.news.length === 0 && <p className="text-sm text-[var(--color-text-secondary)]">No news found.</p>}
            </div>
          </Card>

          {/* Controversy Map */}
          <Card delay={0.25}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Controversy Map</h2>
            <div className="space-y-4 max-h-80 overflow-y-auto">
              {(data.controversies || []).map((c, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-[var(--color-neutral)] mb-2">{c.topic}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded bg-[var(--color-bullish)]/10 border border-[var(--color-bullish)]/20">
                      <p className="text-xs font-medium text-[var(--color-bullish)] mb-1">Bulls say</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{c.bull}</p>
                    </div>
                    <div className="p-2 rounded bg-[var(--color-bearish)]/10 border border-[var(--color-bearish)]/20">
                      <p className="text-xs font-medium text-[var(--color-bearish)] mb-1">Bears say</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{c.bear}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!data.controversies || data.controversies.length === 0) && <p className="text-sm text-[var(--color-text-secondary)]">No major controversies detected.</p>}
            </div>
          </Card>

          {/* Related Keywords */}
          {data.keywords && data.keywords.length > 0 && (
            <Card delay={0.28}>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Related Topics</h2>
              <div className="flex flex-wrap gap-2">
                {data.keywords.slice(0, 15).map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => router.push(`/dashboard?topic=${encodeURIComponent(kw.word)}`)}
                    className="px-2.5 py-1 rounded-full border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-white transition-colors text-[var(--color-text-secondary)]"
                    style={{ 
                      fontSize: `${Math.max(11, Math.min(18, 11 + kw.relevance * 7))}px`,
                      opacity: 0.5 + kw.relevance * 0.5,
                    }}
                  >
                    {kw.word}
                    <span className="text-[10px] ml-1 font-mono opacity-60">{kw.count}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Predicted Next Moves — Full Width */}
          <Card className="md:col-span-2" delay={0.3}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Predicted Next Moves</h2>
            <div className="space-y-3">
              {(data.predictions || []).map((p, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded mt-0.5 ${p.confidence === "high" ? "bg-[var(--color-bullish)]/20 text-[var(--color-bullish)]" : p.confidence === "low" ? "bg-[var(--color-bearish)]/20 text-[var(--color-bearish)]" : "bg-[var(--color-neutral)]/20 text-[var(--color-neutral)]"}`}>
                    {p.confidence}
                  </span>
                  <div>
                    <p className="text-sm">{p.prediction}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{p.reasoning}</p>
                  </div>
                </div>
              ))}
              {(!data.predictions || data.predictions.length === 0) && <p className="text-sm text-[var(--color-text-secondary)]">No predictions available.</p>}
            </div>
            <p className="mt-4 text-xs text-[var(--color-text-secondary)] italic">AI-generated analysis. Not financial advice.</p>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="skeleton h-8 w-48 rounded" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
