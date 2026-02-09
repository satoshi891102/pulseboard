import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PulseBoard — Real-Time Narrative Intelligence",
  description: "Type any topic, get a living intelligence dashboard. AI-powered analysis of Reddit, Hacker News, and Google News in real-time.",
  openGraph: {
    title: "PulseBoard — Real-Time Narrative Intelligence",
    description: "Type any topic, get a living intelligence dashboard.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PulseBoard — Real-Time Narrative Intelligence",
    description: "Type any topic, get a living intelligence dashboard.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
