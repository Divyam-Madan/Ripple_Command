import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AppShell() {
  return (
    <div className="flex h-screen text-stone-900 overflow-hidden relative selection:bg-accent/20">
      {/* Subtle light background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/40 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white/30 blur-[120px] rounded-full pointer-events-none" />

      {/* Floating Glass Sidebar */}
      <div className="p-4 flex h-full relative z-10">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-full relative z-10 pt-4 pr-4 pb-4">
        <div className="glass-panel flex-1 flex flex-col rounded-2xl overflow-hidden shadow-2xl relative">
          <Header />
          <main className="flex-1 overflow-auto p-8 custom-scrollbar">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
