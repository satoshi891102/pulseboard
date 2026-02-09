"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

interface WatchItem {
  topic: string;
  addedAt: string;
  lastPulseScore?: number;
  lastSentiment?: string;
  previousScore?: number;
  lastRefreshed?: string;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [newTopic, setNewTopic] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("pulseboard-watchlist");
    if (stored) setItems(JSON.parse(stored));
  }, []);

  const save = (updated: WatchItem[]) => {
    setItems(updated);
    localStorage.setItem("pulseboard-watchlist", JSON.stringify(updated));
  };

  const addTopic = () => {
    if (!newTopic.trim()) return;
    if (items.some(i => i.topic.toLowerCase() === newTopic.trim().toLowerCase())) return;
    save([{ topic: newTopic.trim(), addedAt: new Date().toISOString() }, ...items]);
    setNewTopic("");
  };

  const removeTopic = (index: number) => {
    save(items.filter((_, i) => i !== index));
  };

  const refreshItem = async (index: number) => {
    const item = items[index];
    setLoading(item.topic);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: item.topic }),
      });
      if (res.ok) {
        const data = await res.json();
        const updated = [...items];
        updated[index] = {
          ...item,
          previousScore: item.lastPulseScore,
          lastPulseScore: data.pulseScore,
          lastSentiment: data.sentiment,
          lastRefreshed: new Date().toISOString(),
        };
        save(updated);
      }
    } catch {}
    setLoading(null);
  };

  const refreshAll = async () => {
    for (let i = 0; i < items.length; i++) {
      await refreshItem(i);
    }
  };

  const sentimentColor = (s?: string) => {
    if (s === "bullish") return "text-[var(--color-bullish)]";
    if (s === "bearish") return "text-[var(--color-bearish)]";
    return "text-[var(--color-text-secondary)]";
  };

  const scoreColor = (s?: number) => {
    if (!s) return "var(--color-text-secondary)";
    if (s >= 70) return "var(--color-accent)";
    if (s >= 40) return "#f59e0b";
    return "var(--color-bearish)";
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-white transition-colors text-sm">← Back</Link>
          <div className="h-4 w-px bg-[var(--color-border)]" />
          <h1 className="text-2xl font-bold">Watchlist</h1>
        </div>
        {items.length > 0 && (
          <button
            onClick={refreshAll}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:border-[var(--color-accent)] transition-colors"
          >
            Refresh all
          </button>
        )}
      </div>

      {/* Add topic */}
      <form
        onSubmit={(e) => { e.preventDefault(); addTopic(); }}
        className="flex gap-2 mb-8"
      >
        <input
          type="text"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="Add a topic to watch..."
          className="flex-1 px-4 py-2.5 text-sm rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
        />
        <button
          type="submit"
          className="px-4 py-2.5 text-sm rounded-lg bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--color-text-secondary)] mb-2">Your watchlist is empty.</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Add topics you want to track over time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.topic}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between group"
            >
              <button
                onClick={() => router.push(`/dashboard?topic=${encodeURIComponent(item.topic)}`)}
                className="flex items-center gap-4 flex-1 text-left"
              >
                {/* Pulse Score with change */}
                <div className="w-14 flex flex-col items-center justify-center">
                  {item.lastPulseScore !== undefined ? (
                    <>
                      <span className="text-lg font-bold font-mono" style={{ color: scoreColor(item.lastPulseScore) }}>
                        {item.lastPulseScore}
                      </span>
                      {item.previousScore !== undefined && item.previousScore !== item.lastPulseScore && (
                        <span className={`text-[10px] font-mono ${item.lastPulseScore > item.previousScore ? "text-[var(--color-bullish)]" : "text-[var(--color-bearish)]"}`}>
                          {item.lastPulseScore > item.previousScore ? "↑" : "↓"}{Math.abs(item.lastPulseScore - item.previousScore)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-[var(--color-text-secondary)]">—</span>
                  )}
                </div>
                <div>
                  <div className="font-medium group-hover:text-[var(--color-accent)] transition-colors">{item.topic}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-mono flex gap-2">
                    {item.lastSentiment && <span className={sentimentColor(item.lastSentiment)}>→ {item.lastSentiment}</span>}
                    <span>Added {new Date(item.addedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshItem(i)}
                  disabled={loading === item.topic}
                  className="text-xs px-2 py-1 rounded border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                >
                  {loading === item.topic ? "..." : "↻"}
                </button>
                <button
                  onClick={() => removeTopic(i)}
                  className="text-xs px-2 py-1 text-[var(--color-text-secondary)] hover:text-[var(--color-bearish)] transition-colors opacity-0 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
