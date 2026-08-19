import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { DEMO_ROLES } from '@/lib/auth/roles';
import type { UserRole } from '@/types';
import RippleHero from '@/components/RippleHero';

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginAsRole, loginWithCredentials } = useAuthStore();

  const [selectedRole, setSelectedRole] = useState<UserRole>('supply_chain_manager');
  const [activeTab, setActiveTab] = useState<'quick' | 'credentials'>('quick');
  const [email, setEmail] = useState('scm@ripple.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (roleKey: UserRole) => {
    setSelectedRole(roleKey);
    setEmail(DEMO_ROLES[roleKey].demoCredentials.email);
    setPassword(DEMO_ROLES[roleKey].demoCredentials.password);
    setError('');
  };

  const handleQuickLogin = (roleKey: UserRole) => {
    setIsLoading(true);
    setTimeout(() => {
      loginAsRole(roleKey);
      const targetRoute = DEMO_ROLES[roleKey].profile.recommendedRoute || '/';
      navigate(targetRoute);
    }, 400);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const res = loginWithCredentials(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials.');
        setIsLoading(false);
      }
    }, 500);
  };

  const currentRoleConfig = DEMO_ROLES[selectedRole];

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center p-4 md:p-8 relative overflow-x-hidden selection:bg-blue-500/20">
      {/* Background ambient glow circles */}
      <div className="fixed top-[-15%] left-[-10%] w-[55%] h-[55%] bg-white/40 blur-[130px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-white/30 blur-[130px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl z-10 animate-fade-in my-auto">
        {/* Header Branding Card with Hero Canvas */}
        <div className="glass-panel border border-white/50 rounded-3xl p-6 md:p-8 mb-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none" />
          <RippleHero />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-stone-900 border border-white/30 flex items-center justify-center shadow-xl">
                <span className="text-white font-black text-2xl font-mono leading-none tracking-tighter">A</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">AROC Enterprise</h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-600/15 text-blue-800 border border-blue-600/30">
                    v2.0 SIH
                  </span>
                </div>
                <p className="text-sm font-bold text-stone-700 mt-0.5">
                  Autonomous Resilient Operations Center &bull; Predictive Supply Chain Intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-stone-800 bg-white/50 border border-white/60 px-4 py-2 rounded-xl backdrop-blur-md shadow-sm">
              <span className="w-2 h-2 rounded-full bg-status-healthy animate-pulse-glow" />
              <span>Multi-Role Access Control Ready</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: 3 Role Selector Cards (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-lg font-black text-stone-900">Select Role Persona</h2>
                <p className="text-xs font-bold text-stone-600">Choose one of the 3 enterprise personas to explore specialized workflows</p>
              </div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-700 bg-white/40 px-2.5 py-1 rounded-lg border border-white/40">
                3 User Types
              </span>
            </div>

            {/* 3 Role Cards */}
            <div className="grid grid-cols-1 gap-3.5">
              {(Object.keys(DEMO_ROLES) as UserRole[]).map((roleKey) => {
                const cfg = DEMO_ROLES[roleKey];
                const isSelected = selectedRole === roleKey;

                return (
                  <div
                    key={roleKey}
                    onClick={() => handleRoleSelect(roleKey)}
                    className={`glass-panel rounded-2xl p-4 md:p-5 cursor-pointer transition-all duration-300 relative border ${
                      isSelected
                        ? 'border-blue-600/60 bg-white/85 shadow-lg scale-[1.01]'
                        : 'border-white/40 hover:bg-white/60 hover:border-white/70 shadow-sm'
                    }`}
                  >
                    {/* Active highlight bar */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl" />
                    )}

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-md border ${
                          isSelected ? 'bg-stone-900 text-white border-white/40' : 'bg-white/80 text-stone-800 border-stone-200'
                        }`}>
                          {cfg.profile.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-stone-900">{cfg.profile.roleTitle}</h3>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${cfg.badge.bg} ${cfg.badge.text} ${cfg.badge.border}`}>
                              {cfg.profile.name}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-stone-600 mt-0.5">{cfg.profile.department}</p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickLogin(roleKey);
                        }}
                        disabled={isLoading}
                        className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border transition-all duration-200 shadow-sm flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500 hover:bg-blue-700 hover:scale-105'
                            : 'bg-stone-900/10 text-stone-800 border-stone-900/15 hover:bg-stone-900 hover:text-white'
                        }`}
                      >
                        {isLoading && selectedRole === roleKey ? 'Entering...' : '1-Click Enter →'}
                      </button>
                    </div>

                    <p className="text-xs font-medium text-stone-700 mt-3 leading-relaxed">
                      {cfg.description}
                    </p>

                    {/* Key stats & feature tags */}
                    <div className="mt-3 pt-3 border-t border-stone-900/10 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-800">
                        <span className="text-stone-500">{cfg.stats.label}:</span>
                        <span className="text-stone-900 font-extrabold font-mono bg-white/70 px-2 py-0.5 rounded-md border border-stone-200">
                          {cfg.stats.value}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 flex-wrap">
                        {cfg.keyFeatures.slice(0, 3).map((feat, idx) => (
                          <span key={idx} className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/5 text-stone-700 border border-black/5">
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Active Role Summary & Credentials Login Box (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="glass-panel border border-white/50 rounded-2xl p-6 shadow-xl flex-1 flex flex-col justify-between">
              <div>
                {/* Mode Selector Tabs */}
                <div className="flex bg-black/10 p-1 rounded-xl mb-5 border border-white/20">
                  <button
                    type="button"
                    onClick={() => setActiveTab('quick')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                      activeTab === 'quick'
                        ? 'bg-white text-stone-900 shadow-md'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Quick Role Access
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('credentials')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                      activeTab === 'credentials'
                        ? 'bg-white text-stone-900 shadow-md'
                        : 'text-stone-700 hover:text-stone-900'
                    }`}
                  >
                    Email / Password
                  </button>
                </div>

                {activeTab === 'quick' ? (
                  /* Quick Access View */
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl bg-white/75 border border-white/60 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">Selected Profile</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${currentRoleConfig.badge.bg} ${currentRoleConfig.badge.text} ${currentRoleConfig.badge.border}`}>
                          {currentRoleConfig.profile.roleTitle}
                        </span>
                      </div>
                      <div className="text-lg font-black text-stone-900">{currentRoleConfig.profile.name}</div>
                      <div className="text-xs font-bold text-stone-600 font-mono">{currentRoleConfig.profile.email}</div>
                    </div>

                    <div>
                      <div className="text-xs font-black text-stone-800 uppercase tracking-wider mb-2.5">
                        Key Responsibilities & Workflows
                      </div>
                      <ul className="space-y-2 text-xs font-semibold text-stone-700">
                        {currentRoleConfig.profile.responsibilities.map((resp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => handleQuickLogin(selectedRole)}
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl bg-stone-900 text-white hover:bg-black font-black text-sm tracking-wide transition-all shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 border border-white/20"
                      >
                        {isLoading ? (
                          <>
                            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Launching Dashboard...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In as {currentRoleConfig.profile.name}</span>
                            <span className="font-mono text-xs opacity-75">({currentRoleConfig.profile.roleTitle.split(' ')[0]})</span>
                            <span>&rarr;</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Credentials Form */
                  <form onSubmit={handleCredentialsSubmit} className="space-y-4 animate-fade-in">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-black text-stone-800">Email Address</label>
                        <div className="flex gap-1">
                          {(['supply_chain_manager', 'operations_manager', 'analyst'] as UserRole[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => handleRoleSelect(r)}
                              className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-black/5 hover:bg-black/10 text-stone-700"
                            >
                              {r === 'supply_chain_manager' ? 'SCM' : r === 'operations_manager' ? 'OPS' : 'ANA'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@ripple.ai"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 border border-stone-300 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-black text-stone-800">Password</label>
                        <span className="text-[10px] font-bold text-stone-500 font-mono">Demo: password123</span>
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/80 border border-stone-300 font-mono text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm"
                      />
                    </div>

                    {error && (
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-700">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-stone-900 text-white hover:bg-black font-black text-sm tracking-wide transition-all shadow-xl hover:scale-[1.02] flex items-center justify-center gap-2 border border-white/20 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In with Credentials</span>
                          <span>&rarr;</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Bottom security notice */}
              <div className="pt-4 mt-4 border-t border-stone-900/10 text-center">
                <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-stone-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Secure Role-Based Access Control (RBAC)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs font-bold text-stone-700">
          AROC Control Tower &bull; Built for Smart India Hackathon &bull; Role-Specific Multi-User Architecture
        </div>
      </div>
    </div>
  );
}
