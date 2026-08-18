import { useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const path = location.pathname.split('/')[1] || 'dashboard';

  return (
    <header className="h-14 bg-surface-1 border-b border-border flex items-center justify-between px-6">
      <div className="text-sm text-text-secondary capitalize">
        {path.replace('-', ' ')}
      </div>
      <div className="flex items-center gap-3">
        <span className="font-semibold text-text-primary">AROC Control Tower</span>
        <span className="px-2 py-0.5 text-[10px] font-mono bg-accent/10 text-accent border border-accent/20 rounded">
          DEMO
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <span>Last sync: Just now</span>
        <div className="bg-surface-2 px-2 py-1 rounded border border-border">
          0 Alerts
        </div>
      </div>
    </header>
  );
}
