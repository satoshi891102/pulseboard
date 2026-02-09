"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

const EXAMPLE_TOPICS = [
  { label: "Solana", icon: "⚡" },
  { label: "AI Agents", icon: "🤖" },
  { label: "YC S26", icon: "🚀" },
  { label: "Bitcoin ETF", icon: "₿" },
  { label: "OpenAI", icon: "🧠" },
  { label: "Trump Tariffs", icon: "🏛️" },
  { label: "South Africa Economy", icon: "🌍" },
  { label: "Tesla", icon: "⚡" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Enter a topic", desc: "Type anything — a company, technology, event, or trend." },
  { step: "02", title: "We scan everything", desc: "Reddit, Hacker News, and 15+ news outlets queried in parallel." },
  { step: "03", title: "AI analyzes", desc: "Sentiment, key voices, controversies, and predictions generated instantly." },
];

function GridBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-accent)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-bullish)]/3 rounded-full blur-3xl" />
      {/* Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

interface TrendingItem {
  title: string;
  source: string;
  score: number;
  url: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("pulseboard-recent");
    if (stored) setRecentSearches(JSON.parse(stored));
    // Fetch trending
    fetch("/api/trending").then(r => r.json()).then(setTrending).catch(() => {});
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSearch = (topic: string) => {
    if (!topic.trim()) return;
    setIsSearching(true);
    const updated = [topic, ...recentSearches.filter(s => s !== topic)].slice(0, 5);
    localStorage.setItem("pulseboard-recent", JSON.stringify(updated));
    router.push(`/dashboard?topic=${encodeURIComponent(topic.trim())}`);
  };

  return (
    <div className="relative min-h-screen">
      <GridBackground />
      
      {/* Hero */}
      <div className="relative flex flex-col items-center justify-center min-h-[85vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl w-full"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] backdrop-blur-sm"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--color-bullish)] animate-pulse-glow" />
            Real-time intelligence from 3 platforms
          </motion.div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-b from-white via-white to-[var(--color-text-secondary)] bg-clip-text text-transparent">
              Intelligence on<br />any topic.
            </span>
            <br />
            <span className="bg-gradient-to-r from-[var(--color-accent)] to-purple-400 bg-clip-text text-transparent">
              In seconds.
            </span>
          </h1>
          
          <p className="text-[var(--color-text-secondary)] mb-10 text-lg md:text-xl max-w-xl mx-auto">
            AI-powered analysis of Reddit, Hacker News, and Google News — combined into a living dashboard.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
            className="flex gap-2 mb-8 max-w-xl mx-auto"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter any topic..."
                autoFocus
                className="w-full px-5 py-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-white text-lg placeholder-[var(--color-text-secondary)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/50 transition-all"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] text-[var(--color-text-secondary)] bg-[var(--color-bg)] border border-[var(--color-border)] rounded">
                ⌘K
              </kbd>
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-8 py-4 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-medium text-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isSearching ? "..." : "Analyze"}
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {EXAMPLE_TOPICS.map((topic, i) => (
              <motion.button
                key={topic.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                onClick={() => handleSearch(topic.label)}
                className="px-4 py-2 rounded-full text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-white hover:bg-[var(--color-accent)]/10 transition-all flex items-center gap-1.5"
              >
                <span>{topic.icon}</span> {topic.label}
              </motion.button>
            ))}
          </div>

          {recentSearches.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-[var(--color-text-secondary)]"
            >
              <span className="mr-2">Recent:</span>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSearch(s)}
                  className="mr-3 text-[var(--color-accent)] hover:text-white transition-colors"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* How it works */}
      <div className="relative max-w-4xl mx-auto px-4 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-8">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl p-6 text-center"
              >
                <div className="text-3xl font-bold text-[var(--color-accent)]/30 mb-2 font-mono">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-[var(--color-text-secondary)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Source badges */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex justify-center items-center gap-8 mt-12 text-xs text-[var(--color-text-secondary)]"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            Reddit
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-300" />
            Hacker News
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            Google News
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
            AI Analysis
          </div>
        </motion.div>

        {/* Trending Now */}
        {trending.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-16"
          >
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-6">Trending Now</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {trending.slice(0, 8).map((item, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -10 : 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    // Extract a searchable term from the title (first 3-4 meaningful words)
                    const words = item.title.split(/\s+/).slice(0, 4).join(" ");
                    handleSearch(words);
                  }}
                  className="text-left p-3 rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded mt-0.5 ${item.source === "hn" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"}`}>
                      {item.source === "hn" ? "HN" : "NEWS"}
                    </span>
                    <span className="text-sm text-[var(--color-text-secondary)] group-hover:text-white transition-colors line-clamp-2">
                      {item.title}
                    </span>
                  </div>
                  {item.score > 0 && (
                    <span className="text-xs text-[var(--color-text-secondary)] font-mono ml-6">↑{item.score}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <div className="text-center mt-8 flex justify-center gap-4">
          <Link 
            href="/compare" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-white transition-colors"
          >
            ⚔️ Compare topics
          </Link>
          <Link 
            href="/watchlist" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-white transition-colors"
          >
            👁 Watchlist
          </Link>
          <Link 
            href="/history" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)] hover:text-white transition-colors"
          >
            📜 History
          </Link>
        </div>

        <footer className="text-center mt-12 pb-8 border-t border-[var(--color-border)] pt-6">
          <div className="text-xs text-[var(--color-text-secondary)] space-y-2">
            <p>Real-time intelligence from Hacker News, Reddit, and Google News.</p>
            <p>No account required. No API keys. Free forever.</p>
            <div className="flex justify-center gap-4 mt-3">
              <Link href="/compare" className="hover:text-white transition-colors">Compare</Link>
              <Link href="/watchlist" className="hover:text-white transition-colors">Watchlist</Link>
              <Link href="/history" className="hover:text-white transition-colors">History</Link>
              <a href="https://github.com/satoshi891102/pulseboard" target="_blank" rel="noopener" className="hover:text-white transition-colors">GitHub</a>
            </div>
            <p className="mt-3 opacity-60">Built by Basirah 🔮</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
