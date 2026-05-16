import { useMemo } from 'react';
import { Briefcase } from 'lucide-react';
import { Expense } from '@/types/expense';
import { categoryService, iconMap } from '@/lib/category-service';
import { formatCompactCurrency, cn, calculateUserShare } from '@/lib/utils';

interface CategoryRingsProps {
  expenses: Expense[];
}

export function CategoryRings({ expenses }: CategoryRingsProps) {
  const cats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of expenses) {
      map[e.category] = (map[e.category] || 0) + calculateUserShare(e);
    }
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
        cfg: categoryService.getById(cat),
      }));
  }, [expenses]);

  if (cats.length === 0) return null;

  const RADIUS = 20;
  const CIRC   = 2 * Math.PI * RADIUS;

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">By Category</p>
      <div className="grid grid-cols-3 gap-2">
        {cats.map(({ cat, amount, pct, cfg }) => {
          const Icon = iconMap[cfg.iconName] || Briefcase;
          const dashOffset = CIRC * (1 - pct / 100);
          return (
            <div key={cat} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-border/40 bg-card/60">
              {/* Ring */}
              <div className="relative h-14 w-14">
                <svg viewBox="0 0 50 50" className="h-full w-full -rotate-90">
                  {/* Track */}
                  <circle cx="25" cy="25" r={RADIUS} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
                  {/* Fill */}
                  <circle
                    cx="25" cy="25" r={RADIUS} fill="none"
                    stroke={cfg.gradientFrom}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={CIRC}
                    strokeDashoffset={dashOffset}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                  />
                </svg>
                {/* Icon in center */}
                <div className={cn('absolute inset-0 flex items-center justify-center')}>
                  <Icon className={cn('h-4 w-4', cfg.color)} />
                </div>
              </div>
              <div className="text-center min-w-0">
                <p className="text-xs font-bold leading-tight">{formatCompactCurrency(amount)}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight truncate w-full">
                  {cfg.label.split(' ')[0]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
