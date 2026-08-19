import { NavLink } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard',     path: '/',             mono: 'CTR' },
  { name: 'Digital Twin',  path: '/digital-twin', mono: 'DT' },
  { name: 'Simulation',    path: '/simulation',   mono: 'SIM' },
  { name: 'Shipments',     path: '/shipments',    mono: 'SHP' },
  { name: 'Disruptions',   path: '/disruptions',  mono: 'DIS' },
  { name: 'Analytics',     path: '/analytics',    mono: 'ANA' },
  { name: 'Scenarios',     path: '/scenarios',    mono: 'SCN' },
  { name: 'Entities',      path: '/entities',     mono: 'ENT' },
];

export default function Sidebar() {
  return (
    <div className="w-[240px] shrink-0 glass-panel rounded-2xl flex flex-col h-full mr-2 shadow-sm relative overflow-hidden group">
      {/* Subtle pulse glow top-left */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-white/40 blur-3xl rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="px-6 py-6 border-b border-border relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg font-mono leading-none tracking-tighter">A</span>
          </div>
          <div>
            <div className="text-stone-900 font-black text-sm tracking-wide">AROC</div>
            <div className="text-stone-600 text-[10px] uppercase font-bold mt-0.5 tracking-wider">
              Control Tower
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar relative z-10">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-white/40 text-blue-600 shadow-sm relative font-bold'
                  : 'text-stone-700 hover:bg-white/20 hover:text-stone-900 font-semibold'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-transform duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-accent rounded-r-full animate-fade-in" />
                )}
                <span className={`text-[10px] font-mono tracking-widest transition-colors ${
                  isActive ? 'text-blue-600 font-bold' : 'text-stone-500 group-hover:text-stone-700 font-semibold'
                }`}>
                  {item.mono}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Connection Status */}
      <div className="px-6 py-5 border-t border-border bg-white/30 relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-status-healthy relative z-10" />
            <div className="absolute inset-0 bg-status-healthy blur-sm rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-bold text-stone-900 tracking-wide">SYSTEM LIVE</span>
        </div>
        <div className="text-[10px] text-stone-600 font-mono font-semibold ml-4">
          v2.0.0-SIH · DEMO
        </div>
      </div>
    </div>
  );
}
