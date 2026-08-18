export const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

export const formatRelativeToNow = (iso: string): string => {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffH = diffMs / 3_600_000;
  if (Math.abs(diffH) < 1) return diffH >= 0 ? "under 1h" : "just now";
  const sign = diffH >= 0 ? "in " : "";
  const suffix = diffH < 0 ? " ago" : "";
  return `${sign}${Math.abs(diffH).toFixed(0)}h${suffix}`;
};
