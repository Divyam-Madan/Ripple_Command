export function ErrorState({ message }: { message: string }) {
  return (
    <div className="border border-health-critical/30 bg-health-critical/5 px-4 py-3 text-sm text-health-critical">
      {message}
    </div>
  );
}
