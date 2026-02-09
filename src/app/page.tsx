"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

const EXAMPLE_TOPICS = ["Solana", "AI Agents", "YC S26", "Bitcoin ETF", "OpenAI", "South Africa Economy"];

export default function Home() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("pulseboard-recent");
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

  const handleSearch = (topic: string) => {
    if (!topic.trim()) return;
    const updated = [topic, ...recentSearches.filter(s => s !== topic)].slice(0, 5);
    localStorage.setItem("pulseboard-recent", JSON.stringify(updated));
    router.push(`/dashboard?topic=${encodeURIComponent(topic.trim())}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-2xl w-full"
      >
        <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
          <span className="w-2 h-2 rounded-full bg-[var(--color-bullish)] animate-pulse-glow" />
          Live Intelligence
        </div>
        <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-[var(--color-text-secondary)] bg-clip-text text-transparent">
          Intelligence on any topic.<br />In seconds.
        </h1>
        <p className="text-[var(--color-text-secondary)] mb-8 text-lg">
          AI-powered analysis of Reddit, Hacker News, and Google News — combined into a living dashboard.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
          className="flex gap-2 mb-6"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter any topic..."
            className="flex-1 px-4 py-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] text-white placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          />
          <button
            type="submit"
            className="px-6 py-3 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium transition-colors"
          >
            Analyze
          </button>
        </form>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {EXAMPLE_TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => handleSearch(topic)}
              className="px-3 py-1.5 rounded-full text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-white transition-colors"
            >
              {topic}
            </button>
          ))}
        </div>

        {recentSearches.length > 0 && (
          <div className="text-sm text-[var(--color-text-secondary)]">
            <span className="mr-2">Recent:</span>
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => handleSearch(s)}
                className="mr-2 underline hover:text-white transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
