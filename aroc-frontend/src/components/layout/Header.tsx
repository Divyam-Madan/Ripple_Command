import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCopilotStore } from '@/stores/copilotStore';
import { DEMO_ROLES } from '@/lib/auth/roles';
import type { UserRole } from '@/types';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname.split('/')[1] || 'dashboard';

  const { user, switchRole, logout } = useAuthStore();
  const { isOpen: copilotOpen, toggleOpen: toggleCopilot } = useCopilotStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRole = user?.role || 'supply_chain_manager';
  const roleConfig = DEMO_ROLES[currentRole] || DEMO_ROLES.supply_chain_manager;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    switchRole(newRole);
    setDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 flex-shrink-0 bg-white/30 backdrop-blur-xl border-b border-white/40 flex items-center justify-between px-6 md:px-8 z-20 shadow-sm relative">
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
        <h1 className="text-lg font-black text-stone-900 capitalize tracking-wide">
          {path.replace('-', ' ')}
        </h1>
      </div>
      
      {/* Right: Status Badges & Profile Dropdown */}
      <div className="flex items-center gap-4 md:gap-6">
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-bold tracking-widest text-stone-700 uppercase">
          <span className="flex items-center gap-2 bg-white/40 px-3 py-1.5 rounded-xl border border-white/40">
            <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse-glow" />
            <span>Model Synced</span>
          </span>
          
          <button
            onClick={toggleCopilot}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm ${
              copilotOpen
                ? 'bg-blue-600 text-white border-blue-500 font-black'
                : 'bg-white/60 hover:bg-white text-stone-800 border-white/60 font-bold'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${copilotOpen ? 'bg-white' : 'bg-blue-600'} animate-pulse-glow`} />
            <span>AI Copilot {copilotOpen ? 'Active' : 'Offline'}</span>
            <span className="text-[10px] font-mono opacity-80 font-normal">({copilotOpen ? 'Docked' : 'Open'})</span>
          </button>
        </div>


        <div className="w-px h-4 bg-stone-300 hidden lg:block" />

        {/* User Role Badge & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white/60 hover:bg-white/80 border border-white/60 transition-all shadow-sm group"
          >
            <div className="w-8 h-8 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-xs shadow-md group-hover:scale-105 transition-transform">
              {user?.initials || 'AR'}
            </div>
            
            <div className="text-left hidden sm:block">
              <div className="text-xs font-black text-stone-900 leading-tight flex items-center gap-1.5">
                <span>{user?.name || 'Authorized User'}</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border ${roleConfig.badge.bg} ${roleConfig.badge.text} ${roleConfig.badge.border}`}>
                  {user?.roleTitle?.split(' ')[0] || 'User'}
                </span>
              </div>
              <div className="text-[10px] font-bold text-stone-500">
                {user?.roleTitle || 'Supply Chain'}
              </div>
            </div>

            <svg
              className={`w-3.5 h-3.5 text-stone-600 transition-transform duration-200 ml-0.5 ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Profile & Role Switcher Dropdown Modal */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 glass-panel bg-white/95 backdrop-blur-2xl rounded-2xl border border-white/70 shadow-2xl p-4 z-50 animate-slide-up">
              {/* User Summary Header */}
              <div className="pb-3 border-b border-stone-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-sm shadow-md">
                    {user?.initials || 'AR'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-stone-900 truncate">{user?.name}</div>
                    <div className="text-xs font-bold text-stone-500 font-mono truncate">{user?.email}</div>
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${roleConfig.badge.bg} ${roleConfig.badge.text} ${roleConfig.badge.border}`}>
                    {user?.roleTitle}
                  </span>
                  <span className="text-[10px] font-bold text-stone-500">
                    {user?.department}
                  </span>
                </div>
              </div>

              {/* Role Switcher Section */}
              <div className="py-3 border-b border-stone-200">
                <div className="text-[10px] font-black uppercase tracking-wider text-stone-500 mb-2">
                  Switch Persona (3 User Types)
                </div>
                <div className="space-y-1.5">
                  {(Object.keys(DEMO_ROLES) as UserRole[]).map((roleKey) => {
                    const cfg = DEMO_ROLES[roleKey];
                    const isCurrent = user?.role === roleKey;

                    return (
                      <button
                        key={roleKey}
                        onClick={() => handleRoleChange(roleKey)}
                        className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between ${
                          isCurrent
                            ? 'bg-blue-600/10 border border-blue-600/30'
                            : 'hover:bg-black/5 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2 h-2 rounded-full ${cfg.badge.dot}`} />
                          <div className="truncate">
                            <div className="text-xs font-black text-stone-900 leading-tight">
                              {cfg.profile.roleTitle}
                            </div>
                            <div className="text-[10px] font-bold text-stone-500">
                              {cfg.profile.name}
                            </div>
                          </div>
                        </div>

                        {isCurrent ? (
                          <span className="text-[10px] font-black text-blue-700 bg-blue-600/20 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-stone-500">
                            Switch &rarr;
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/login');
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors text-center"
                >
                  Change Account
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2 rounded-xl text-xs font-black text-red-700 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors text-center"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
