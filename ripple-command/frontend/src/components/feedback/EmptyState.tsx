export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border border-dashed border-graphite-300/40 px-6 py-10 text-center">
      <div className="text-sm font-medium text-graphite-700">{title}</div>
      {description && <div className="mt-1 text-xs text-graphite-500">{description}</div>}
    </div>
  );
}
