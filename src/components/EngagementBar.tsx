"use client";

export function EngagementBar({ value, max, color = "var(--color-accent)" }: { value: number; max: number; color?: string }) {
  const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1 rounded-full bg-[var(--color-border)] overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-500" 
        style={{ width: `${width}%`, backgroundColor: color }} 
      />
    </div>
  );
}

export function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-3 text-center">
      <div className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</div>
      <div className="text-xl font-bold font-mono">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      {subtext && <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">{subtext}</div>}
    </div>
  );
}
