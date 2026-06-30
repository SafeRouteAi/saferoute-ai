import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title, subtitle, back = "/",
}: { title: string; subtitle?: string; back?: string }) {
  return (
    <div className="flex items-center gap-2 pb-4 pt-2">
      <Link to={back} className="h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0">
        <h1 className="font-display text-xl font-bold leading-tight truncate">{title}</h1>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}