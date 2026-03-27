"use client";

import { useState } from "react";
import { clsx } from "clsx";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNav from "./MobileNav";
import { AgentProvider } from "@/components/agent/AgentContext";
import AgentPanel from "@/components/agent/AgentPanel";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AgentProvider>
      <div className="flex flex-row h-[100dvh] bg-background overflow-hidden">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — hidden off-screen on mobile, always visible on desktop */}
        <div
          className={clsx(
            "fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuToggle={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>

        <MobileNav />

        {/* Global AI Agent Panel */}
        <AgentPanel />
      </div>
    </AgentProvider>
  );
}
