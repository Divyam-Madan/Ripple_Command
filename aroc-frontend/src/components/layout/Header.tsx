import { useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();
  const path = location.pathname.split('/')[1] || 'dashboard';

  return (
    <header className="h-16 flex-shrink-0 bg-white/30 backdrop-blur-xl border-b border-white/40 flex items-center justify-between px-8 z-20 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-accent rounded-full" />
        <h1 className="text-lg font-bold text-stone-900 capitalize tracking-wide">
          {path.replace('-', ' ')}
        </h1>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-4 text-[11px] font-bold tracking-widest text-stone-700 uppercase">
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse-glow" /> Model Synced</span>
          <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-glow" /> AI Copilot Online</span>
        </div>
        <div className="w-px h-4 bg-stone-300 hidden md:block" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center shadow-md">
            <span className="text-xs font-bold text-white">DM</span>
          </div>
        </div>
      </div>
    </header>
  );
}
