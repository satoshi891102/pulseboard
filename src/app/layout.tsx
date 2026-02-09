import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseBoard — Real-Time Narrative Intelligence",
  description: "Type any topic, get a living intelligence dashboard. AI-powered analysis of Reddit, Hacker News, and Google News in real-time.",
  keywords: ["narrative intelligence", "trend analysis", "real-time dashboard", "news aggregator", "sentiment analysis"],
  openGraph: {
    title: "PulseBoard — Real-Time Narrative Intelligence",
    description: "Intelligence on any topic. In seconds. AI-powered analysis across Reddit, Hacker News, and Google News.",
    type: "website",
    url: "https://pulseboard-one.vercel.app",
    siteName: "PulseBoard",
    images: [{ url: "/api/og", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseBoard — Real-Time Narrative Intelligence",
    description: "Intelligence on any topic. In seconds.",
    creator: "@memecat671",
  },
  robots: "index, follow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
