import type { NodeStatus, Severity } from "@/types";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  healthy: { bg: "bg-health-good/10", text: "text-health-good", label: "Healthy" },
  warning: { bg: "bg-health-warn/10", text: "text-health-warn", label: "Warning" },
  critical: { bg: "bg-health-critical/10", text: "text-health-critical", label: "Critical" },
  inactive: { bg: "bg-graphite-300/20", text: "text-graphite-500", label: "Inactive" },
  informational: { bg: "bg-steel-100", text: "text-steel-600", label: "Informational" },
  medium: { bg: "bg-health-warn/10", text: "text-health-warn", label: "Medium" },
  high: { bg: "bg-health-critical/10", text: "text-health-critical", label: "High" },
};

export function StatusBadge({ status }: { status: NodeStatus | Severity | string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.inactive;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.text.replace("text-", "bg-")}`} />
      {style.label}
    </span>
  );
}
