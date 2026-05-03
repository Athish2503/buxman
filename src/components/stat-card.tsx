import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
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
        "relative rounded-[2rem] border border-white/5 bg-card/40 glass p-5 overflow-hidden card-hover animate-fade-in-up shadow-xl group",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle top accent */}
      {glowColor && (
        <div className={cn("absolute top-0 left-6 right-6 h-px rounded-full opacity-40 shadow-glow", glowColor)} />
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 mb-2">{label}</p>
          <p className="text-2xl font-black number-lg tracking-tighter leading-none text-foreground group-hover:text-primary transition-colors">{value}</p>
          {subLabel && <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-tight mt-2">{subLabel}</p>}
          {trend !== undefined && (
            <div className={cn(
              "inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mt-4 px-2.5 py-1 rounded-full border shadow-inner",
              trend.value > 0 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20"
            )}>
              {trend.value > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </div>
          )}
        </div>
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative", gradient)}>
          <Icon className={cn("h-6 w-6", iconColor)} />
          <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
}
