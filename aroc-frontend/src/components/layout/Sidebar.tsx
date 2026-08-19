import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';


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
  const navigate = useNavigate();
  const { user } = useAuthStore();


  return (
    <div className="w-[240px] shrink-0 glass-panel rounded-2xl flex flex-col h-full mr-2 shadow-sm relative overflow-hidden group">
      {/* Subtle pulse glow top-left */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-white/40 blur-3xl rounded-full pointer-events-none" />

      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/30 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md">
            <span className="text-white font-black text-lg font-mono leading-none tracking-tighter">A</span>
          </div>
          <div>
            <div className="text-stone-900 font-black text-sm tracking-wide">AROC</div>
            <div className="text-stone-600 text-[10px] uppercase font-extrabold mt-0.5 tracking-wider">
              Control Tower
            </div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar relative z-10">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-white/60 text-blue-700 shadow-sm relative font-black'
                  : 'text-stone-700 hover:bg-white/20 hover:text-stone-900 font-bold'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`transition-transform duration-300 ${isActive ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>
                  {item.name}
                </span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-4 bg-blue-600 rounded-r-full animate-fade-in" />
                )}
                <span className={`text-[10px] font-mono tracking-widest transition-colors ${
                  isActive ? 'text-blue-700 font-black' : 'text-stone-500 group-hover:text-stone-700 font-bold'
                }`}>
                  {item.mono}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Active User Card & Switch Role Shortcut */}
      <div className="px-4 py-3 border-t border-white/30 bg-white/20 relative z-10">
        <div
          onClick={() => navigate('/login')}
          className="p-2 rounded-xl bg-white/50 hover:bg-white/80 border border-white/50 transition-all cursor-pointer shadow-sm group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-xs shadow">
              {user?.initials || 'AR'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-black text-stone-900 truncate leading-tight flex items-center justify-between">
                <span>{user?.name?.split(' ')[0] || 'User'}</span>
                <span className="text-[9px] font-black text-blue-700 group-hover:underline">Switch &rarr;</span>
              </div>
              <div className="text-[10px] font-bold text-stone-500 truncate mt-0.5">
                {user?.roleTitle || 'Supply Chain'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Live Connection Status */}
      <div className="px-5 py-3 border-t border-white/20 bg-white/30 relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-status-healthy relative z-10" />
            <div className="absolute inset-0 bg-status-healthy blur-sm rounded-full animate-pulse" />
          </div>
          <span className="text-[11px] font-black text-stone-900 tracking-wide">SYSTEM LIVE</span>
        </div>
        <div className="text-[9px] text-stone-600 font-mono font-bold">
          v2.0.0-SIH
        </div>
      </div>
    </div>
  );
}
