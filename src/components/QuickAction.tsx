import { Link } from "@tanstack/react-router";
import type { ComponentType, ReactNode } from "react";

export function QuickAction({
  to, icon: Icon, label, color = "primary", children,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  color?: "primary" | "navy" | "danger" | "safe" | "caution";
  children?: ReactNode;
}) {
  const colorMap: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    navy: "bg-navy/10 text-navy",
    danger: "bg-danger/10 text-danger",
    safe: "bg-safe/10 text-safe",
    caution: "bg-caution/15 text-caution",
  };
  return (
    <Link to={to} className="group">
      <div className="rounded-2xl bg-card shadow-card p-4 flex flex-col gap-2 hover:scale-[1.02] transition-transform border border-border/50">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-display font-semibold text-sm">{label}</div>
        {children && <div className="text-xs text-muted-foreground">{children}</div>}
      </div>
    </Link>
  );
}