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
    <div className="w-[200px] shrink-0 bg-surface-1 border-r border-border flex flex-col" style={{ minHeight: '100vh' }}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <div className="text-text-primary font-bold text-base tracking-tight">AROC</div>
        <div className="text-text-tertiary text-xs font-mono mt-0.5 leading-tight">
          Autonomous Resilient<br />Operations Center
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `group relative flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-100 ${
                isActive
                  ? 'text-text-primary bg-surface-2/60 border-l-2 border-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-2/30 border-l-2 border-transparent'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span>{item.name}</span>
                <span className={`text-[9px] font-mono tracking-wider transition-colors ${
                  isActive ? 'text-accent' : 'text-text-tertiary group-hover:text-text-secondary'
                }`}>{item.mono}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Connection Status */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-status-healthy" />
          <span className="text-xs font-mono text-text-tertiary">DEMO · LIVE</span>
        </div>
        <div className="text-xs text-text-tertiary font-mono mt-1">
          v1.0.0-SIH
        </div>
      </div>
    </div>
  );
}
