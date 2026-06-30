import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, Map, MessageCircle, BarChart3, Settings } from "lucide-react";
import type { ComponentType } from "react";

const TABS: { to: string; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/routes-map", label: "Routes", icon: Map },
  { to: "/chat", label: "Guardian", icon: MessageCircle },
  { to: "/dashboard", label: "Stats", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background pb-24">
      <main className="mx-auto max-w-md px-4 pt-4">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-border glass">
        <div className="mx-auto max-w-md grid grid-cols-5 px-2 py-2">
          {TABS.map((t) => {
            const active = pathname === t.to || (t.to !== "/" && pathname.startsWith(t.to));
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`rounded-xl px-3 py-1 transition-colors ${active ? "bg-primary/15" : ""}`}>
                  <Icon className="h-5 w-5" />
                </div>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}