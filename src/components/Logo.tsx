import { Shield } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-primary blur-md opacity-60 rounded-xl" />
        <div className="relative bg-gradient-primary rounded-xl p-1.5">
          <Shield className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
        </div>
      </div>
      <span className="font-display font-bold text-lg tracking-tight">
        SafeRoute<span className="text-primary"> AI</span>
      </span>
    </div>
  );
}