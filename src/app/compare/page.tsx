"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

interface CompareData {
  topic: string;
  summary: string;
  sentiment: string;
  pulseScore?: number;
  sources: { reddit: number; hn: number; news: number };
  discussions: any[];
  news: any[];
  keyVoices: any[];
  predictions: any[];
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const s = sentiment?.toLowerCase();
  const color = s === "bullish" ? "bg-[var(--color-bullish)]" : s === "bearish" ? "bg-[var(--color-bearish)]" : "bg-[var(--color-neutral)]";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${color}`}>
      {s === "bullish" ? "↑" : s === "bearish" ? "↓" : "→"} {sentiment}
    </span>
  );
}

function CompareContent() {
  const searchParams = useSearchParams();
  const [topicA, setTopicA] = useState(searchParams.get("a") || "");
  const [topicB, setTopicB] = useState(searchParams.get("b") || "");
  const [dataA, setDataA] = useState<CompareData | null>(null);
  const [dataB, setDataB] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!topicA.trim() || !topicB.trim()) return;
    setLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: topicA }) }),
        fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: topicB }) }),
      ]);
      setDataA(await resA.json());
      setDataB(await resB.json());
    } catch {} finally {
      setLoading(false);
    }
  };

  const totalSources = (d: CompareData) => d.sources.reddit + d.sources.hn + d.sources.news;
  const totalEngagement = (d: CompareData) => d.discussions.reduce((s: number, x: any) => s + (x.score || 0) + (x.comments || 0), 0);

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-[var(--color-text-secondary)] hover:text-white transition-colors text-sm">← Back</Link>
        <div className="h-4 w-px bg-[var(--color-border)]" />
        <h1 className="text-2xl font-bold">Compare Topics</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end mb-8">
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Topic A</label>
          <input
            type="text"
            value={topicA}
            onChange={(e) => setTopicA(e.target.value)}
            placeholder="e.g. Solana"
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
        <div className="text-center py-3 text-[var(--color-text-secondary)] font-bold">vs</div>
        <div>
          <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Topic B</label>
          <input
            type="text"
            value={topicB}
            onChange={(e) => setTopicB(e.target.value)}
            placeholder="e.g. Ethereum"
            className="w-full px-4 py-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
        </div>
      </div>

      <div className="text-center mb-8">
        <button
          onClick={handleCompare}
          disabled={loading || !topicA.trim() || !topicB.trim()}
          className="px-8 py-3 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-all disabled:opacity-50"
        >
          {loading ? "Analyzing both..." : "Compare"}
        </button>
      </div>

      {dataA && dataB && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Head to head stats */}
          <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-4">Head to Head</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{topicA}</div>
                {dataA.pulseScore !== undefined && (
                  <div className="text-3xl font-bold font-mono mt-1" style={{ color: dataA.pulseScore >= 70 ? "var(--color-accent)" : dataA.pulseScore >= 40 ? "#f59e0b" : "var(--color-bearish)" }}>
                    {dataA.pulseScore}
                  </div>
                )}
                <SentimentBadge sentiment={dataA.sentiment} />
              </div>
              <div className="text-[var(--color-text-secondary)] text-sm flex flex-col items-center justify-center gap-1">
                <span>vs</span>
                <span className="text-[10px] font-mono">pulse score</span>
              </div>
              <div>
                <div className="text-2xl font-bold">{topicB}</div>
                {dataB.pulseScore !== undefined && (
                  <div className="text-3xl font-bold font-mono mt-1" style={{ color: dataB.pulseScore >= 70 ? "var(--color-accent)" : dataB.pulseScore >= 40 ? "#f59e0b" : "var(--color-bearish)" }}>
                    {dataB.pulseScore}
                  </div>
                )}
                <SentimentBadge sentiment={dataB.sentiment} />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {/* Sources bar */}
              <div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Total Sources</div>
                <div className="flex h-6 rounded-full overflow-hidden">
                  <div className="bg-[var(--color-accent)] flex items-center justify-center text-xs font-mono" style={{ width: `${(totalSources(dataA) / (totalSources(dataA) + totalSources(dataB))) * 100}%` }}>
                    {totalSources(dataA)}
                  </div>
                  <div className="bg-[var(--color-bullish)] flex items-center justify-center text-xs font-mono" style={{ width: `${(totalSources(dataB) / (totalSources(dataA) + totalSources(dataB))) * 100}%` }}>
                    {totalSources(dataB)}
                  </div>
                </div>
              </div>

              {/* Engagement bar */}
              <div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">Total Engagement</div>
                <div className="flex h-6 rounded-full overflow-hidden">
                  {(() => {
                    const eA = totalEngagement(dataA);
                    const eB = totalEngagement(dataB);
                    const total = eA + eB || 1;
                    return (
                      <>
                        <div className="bg-[var(--color-accent)] flex items-center justify-center text-xs font-mono" style={{ width: `${(eA / total) * 100}%` }}>
                          {eA.toLocaleString()}
                        </div>
                        <div className="bg-[var(--color-bullish)] flex items-center justify-center text-xs font-mono" style={{ width: `${(eB / total) * 100}%` }}>
                          {eB.toLocaleString()}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* News coverage bar */}
              <div>
                <div className="text-xs text-[var(--color-text-secondary)] mb-1">News Coverage</div>
                <div className="flex h-6 rounded-full overflow-hidden">
                  <div className="bg-[var(--color-accent)] flex items-center justify-center text-xs font-mono" style={{ width: `${(dataA.sources.news / (dataA.sources.news + dataB.sources.news || 1)) * 100}%` }}>
                    {dataA.sources.news}
                  </div>
                  <div className="bg-[var(--color-bullish)] flex items-center justify-center text-xs font-mono" style={{ width: `${(dataB.sources.news / (dataA.sources.news + dataB.sources.news || 1)) * 100}%` }}>
                    {dataB.sources.news}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side by side summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-accent)] mb-2">{topicA} Summary</h3>
              <p className="text-sm leading-relaxed">{dataA.summary}</p>
            </div>
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-bullish)] mb-2">{topicB} Summary</h3>
              <p className="text-sm leading-relaxed">{dataB.summary}</p>
            </div>
          </div>

          {/* Side by side top discussions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Top Discussions: {topicA}</h3>
              <div className="space-y-2">
                {dataA.discussions.slice(0, 5).map((d: any, i: number) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="block text-sm hover:text-[var(--color-accent)] transition-colors">
                    {d.title}
                    <span className="text-xs text-[var(--color-text-secondary)] font-mono ml-2">↑{d.score}</span>
                  </a>
                ))}
              </div>
            </div>
            <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Top Discussions: {topicB}</h3>
              <div className="space-y-2">
                {dataB.discussions.slice(0, 5).map((d: any, i: number) => (
                  <a key={i} href={d.url} target="_blank" rel="noopener noreferrer" className="block text-sm hover:text-[var(--color-accent)] transition-colors">
                    {d.title}
                    <span className="text-xs text-[var(--color-text-secondary)] font-mono ml-2">↑{d.score}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-secondary)] italic text-center">AI-generated analysis. Not financial advice.</p>
        </motion.div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="skeleton h-8 w-48 rounded" /></div>}>
      <CompareContent />
    </Suspense>
  );
}
