import { useState } from "react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CopilotPanel } from "@/features/copilot/CopilotPanel";

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-stone-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onToggleCopilot={() => setCopilotOpen((v) => !v)} copilotOpen={copilotOpen} />
        <main className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</main>
      </div>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
    </div>
  );
}
