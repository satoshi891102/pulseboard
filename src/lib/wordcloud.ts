// Simple word frequency extraction for topic analysis
const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "to", "of", "in",
  "for", "on", "with", "at", "by", "from", "as", "into", "through",
  "during", "before", "after", "above", "below", "between", "out",
  "off", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "both", "each",
  "few", "more", "most", "other", "some", "such", "no", "nor", "not",
  "only", "own", "same", "so", "than", "too", "very", "just", "don",
  "should", "now", "and", "but", "or", "if", "while", "about", "up",
  "down", "this", "that", "these", "those", "it", "its", "he", "she",
  "they", "them", "their", "what", "which", "who", "whom", "show",
  "hn", "ask", "tell", "new", "get", "got", "like", "know", "think",
  "make", "go", "see", "come", "take", "want", "use", "find", "give",
  "way", "also", "many", "even", "back", "any", "first", "last",
  "long", "great", "little", "still", "right", "look", "need",
  "could", "home", "us", "try", "kind", "help", "line", "turn",
  "much", "because", "thing", "your", "them", "year", "day", "good",
  "one", "two", "three", "four", "five", "people", "really", "well",
  "work", "time", "going", "been", "using", "made", "https", "http",
  "www", "com", "org", "via", "per", "re", "amp",
]);

export interface WordFrequency {
  word: string;
  count: number;
  relevance: number; // 0-1
}

export function extractKeywords(texts: string[], topicTerm: string): WordFrequency[] {
  const freq = new Map<string, number>();
  const topicWords = new Set(topicTerm.toLowerCase().split(/\s+/));

  for (const text of texts) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !topicWords.has(w));

    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        freq.set(word, (freq.get(word) || 0) + 1);
      }
    }
  }

  const entries = Array.from(freq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const maxCount = entries[0]?.[1] || 1;

  return entries.map(([word, count]) => ({
    word,
    count,
    relevance: count / maxCount,
  }));
}
