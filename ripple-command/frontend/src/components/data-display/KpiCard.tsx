interface KpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "warn" | "critical" | "good";
}

const TONE_TEXT: Record<string, string> = {
  default: "text-graphite-900",
  warn: "text-health-warn",
  critical: "text-health-critical",
  good: "text-health-good",
};

export function KpiCard({ label, value, sublabel, tone = "default" }: KpiCardProps) {
  return (
    <div className="border border-graphite-300/30 bg-stone-50 px-4 py-3.5">
      <div className="text-xs font-medium uppercase tracking-wide text-graphite-500">{label}</div>
      <div className={`mt-1.5 font-mono text-2xl font-medium tabular ${TONE_TEXT[tone]}`}>{value}</div>
      {sublabel && <div className="mt-1 text-xs text-graphite-500">{sublabel}</div>}
    </div>
  );
}
