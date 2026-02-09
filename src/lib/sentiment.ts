// Simple title-based sentiment analysis

const POSITIVE_WORDS = new Set([
  "great", "amazing", "incredible", "love", "best", "excellent", "awesome",
  "fantastic", "wonderful", "breakthrough", "success", "win", "winning",
  "bullish", "surge", "soar", "soaring", "rally", "boom", "record",
  "revolutionary", "innovative", "impressive", "outperform", "growth",
  "upgrade", "improvement", "powerful", "exciting", "launch", "launched",
  "partnership", "backed", "funding", "raised", "milestone", "adoption",
  "approved", "profit", "profitable", "strong", "positive",
]);

const NEGATIVE_WORDS = new Set([
  "bad", "terrible", "awful", "hate", "worst", "crash", "crashed",
  "fail", "failed", "failure", "bearish", "plunge", "plunging",
  "dump", "scam", "hack", "hacked", "exploit", "vulnerability",
  "decline", "declining", "loss", "losing", "lost", "concern",
  "warning", "risk", "risky", "dangerous", "dead", "dying",
  "bankrupt", "bankruptcy", "fraud", "lawsuit", "sued", "ban",
  "banned", "reject", "rejected", "problem", "broken", "bug",
  "slow", "expensive", "overvalued", "bubble", "collapse",
  "controversy", "scandal", "layoff", "layoffs", "fired",
]);

export interface SentimentResult {
  score: number;      // -1 to 1
  label: string;      // bearish | neutral | bullish
  positive: number;   // count of positive signals
  negative: number;   // count of negative signals
  confidence: number; // 0 to 1
}

export function analyzeSentiment(titles: string[]): SentimentResult {
  let positive = 0;
  let negative = 0;

  for (const title of titles) {
    const words = title.toLowerCase().split(/\s+/);
    for (const word of words) {
      const clean = word.replace(/[^a-z]/g, "");
      if (POSITIVE_WORDS.has(clean)) positive++;
      if (NEGATIVE_WORDS.has(clean)) negative++;
    }
  }

  const total = positive + negative;
  const score = total > 0 ? (positive - negative) / total : 0;
  const confidence = Math.min(total / (titles.length * 0.5), 1); // higher with more signal words

  let label = "neutral";
  if (score > 0.2 && confidence > 0.3) label = "bullish";
  else if (score < -0.2 && confidence > 0.3) label = "bearish";

  return { score, label, positive, negative, confidence };
}
