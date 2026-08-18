export function LoadingState({ message = "Loading" }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-graphite-500">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-steel-600" />
      {message}
      <span className="animate-pulse">&hellip;</span>
    </div>
  );
}
