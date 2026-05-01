import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string;
  subLabel?: string;
  icon: LucideIcon;
  gradient: string;        // tailwind bg class for icon bg
  iconColor: string;       // tailwind text class
  glowColor?: string;      // optional accent bar color class
  trend?: { value: number; label: string };
  className?: string;
  delay?: number;
}

export function StatCard({
  label, value, subLabel, icon: Icon,
  gradient, iconColor, glowColor,
  trend, className, delay = 0
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card/80 p-4 overflow-hidden card-hover animate-fade-in-up",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle top accent */}
      {glowColor && (
        <div className={cn("absolute top-0 left-4 right-4 h-px rounded-full opacity-60", glowColor)} />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl font-bold number-lg mt-1.5 leading-none truncate">{value}</p>
          {subLabel && <p className="text-xs text-muted-foreground mt-1 truncate">{subLabel}</p>}
          {trend !== undefined && (
            <div className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold mt-2 px-2 py-0.5 rounded-full",
              trend.value > 0 ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            )}>
              {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </div>
          )}
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", gradient)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
    </div>
  );
}
