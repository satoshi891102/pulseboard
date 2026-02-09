"use client";

interface TimeSlot {
  label: string;
  count: number;
  maxCount: number;
}

function parseTimeAgo(timeAgo: string): number {
  // Convert "Xh ago", "Xd ago", "Xm ago" to hours
  const match = timeAgo.match(/(\d+)\s*(m|h|d)\s*ago/i);
  if (!match) return 999;
  const num = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "m") return num / 60;
  if (unit === "h") return num;
  if (unit === "d") return num * 24;
  return 999;
}

export function ActivityTimeline({ discussions }: { discussions: { timeAgo: string; source: string }[] }) {
  // Bucket into time slots
  const buckets = [
    { label: "<1h", min: 0, max: 1 },
    { label: "1-3h", min: 1, max: 3 },
    { label: "3-6h", min: 3, max: 6 },
    { label: "6-12h", min: 6, max: 12 },
    { label: "12-24h", min: 12, max: 24 },
    { label: "1-3d", min: 24, max: 72 },
    { label: "3-7d", min: 72, max: 168 },
    { label: "7d+", min: 168, max: Infinity },
  ];

  const slots: TimeSlot[] = buckets.map(b => {
    const count = discussions.filter(d => {
      const hours = parseTimeAgo(d.timeAgo);
      return hours >= b.min && hours < b.max;
    }).length;
    return { label: b.label, count, maxCount: 0 };
  });

  const maxCount = Math.max(...slots.map(s => s.count), 1);
  slots.forEach(s => s.maxCount = maxCount);

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-3">Activity Timeline</h2>
      <div className="flex items-end gap-1 h-20">
        {slots.map((slot, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end justify-center" style={{ height: "60px" }}>
              <div 
                className="w-full max-w-[24px] rounded-t transition-all duration-500"
                style={{ 
                  height: `${Math.max((slot.count / maxCount) * 100, slot.count > 0 ? 8 : 2)}%`,
                  backgroundColor: slot.count > maxCount * 0.7 ? "var(--color-accent)" : slot.count > 0 ? "var(--color-border)" : "var(--color-card)",
                  opacity: slot.count > 0 ? 0.5 + (slot.count / maxCount) * 0.5 : 0.2,
                }}
                title={`${slot.count} posts`}
              />
            </div>
            <span className="text-[9px] text-[var(--color-text-secondary)] font-mono">{slot.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-[var(--color-text-secondary)]">Recent</span>
        <span className="text-[9px] text-[var(--color-text-secondary)]">Older</span>
      </div>
    </div>
  );
}
