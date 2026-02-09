"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

interface SearchEntry {
  topic: string;
  timestamp: string;
  sentiment?: string;
  sources?: number;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("pulseboard-history");
    if (stored) setHistory(JSON.parse(stored));
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("pulseboard-history");
    localStorage.removeItem("pulseboard-recent");
    setHistory([]);
  };

  const removeItem = (index: number) => {
    const updated = history.filter((_, i) => i !== index);
    localStorage.setItem("pulseboard-history", JSON.stringify(updated));
    setHistory(updated);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[var(--color-text-secondary)] hover:text-white transition-colors text-sm">← Back</Link>
          <div className="h-4 w-px bg-[var(--color-border)]" />
          <h1 className="text-2xl font-bold">Search History</h1>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-bearish)] transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--color-text-secondary)] mb-4">No searches yet.</p>
          <Link href="/" className="text-[var(--color-accent)] hover:underline">Start analyzing</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between group"
            >
              <button
                onClick={() => router.push(`/dashboard?topic=${encodeURIComponent(entry.topic)}`)}
                className="flex items-center gap-3 flex-1 text-left"
              >
                <div>
                  <div className="font-medium group-hover:text-[var(--color-accent)] transition-colors">{entry.topic}</div>
                  <div className="text-xs text-[var(--color-text-secondary)] font-mono">
                    {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                    {entry.sentiment && <span className="ml-2">• {entry.sentiment}</span>}
                    {entry.sources && <span className="ml-2">• {entry.sources} sources</span>}
                  </div>
                </div>
              </button>
              <button
                onClick={() => removeItem(i)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-bearish)] transition-colors opacity-0 group-hover:opacity-100 text-sm px-2"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
