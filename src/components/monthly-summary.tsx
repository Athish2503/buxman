import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isSameMonth, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown, ArrowRight, IndianRupee } from 'lucide-react';
import { Expense } from '@/types/expense';
import { formatCompactCurrency, cn } from '@/lib/utils';

interface MonthlySummaryProps {
  expenses: Expense[];
  onViewAll: () => void;
}

export function MonthlySummary({ expenses, onViewAll }: MonthlySummaryProps) {
  const now = new Date();

  const { thisMonth, lastMonth, personal, reimbursable, pending } = useMemo(() => {
    const tm = expenses.filter(e => isSameMonth(new Date(e.date), now));
    const lm = expenses.filter(e => isSameMonth(new Date(e.date), subMonths(now, 1)));
    return {
      thisMonth:    tm.reduce((s, e) => s + e.amount, 0),
      lastMonth:     lm.reduce((s, e) => s + e.amount, 0),
      personal:      tm.filter(e => !e.isReimbursement).reduce((s, e) => s + e.amount, 0),
      reimbursable:  tm.filter(e => e.isReimbursement).reduce((s, e) => s + e.amount, 0),
      pending:       tm.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + e.amount, 0),
    };
  }, [expenses, now]);

  const trend = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;
  const isUp  = trend !== null && trend > 0;

  // Progress bars
  const max = Math.max(thisMonth, 1);
  const bars = [
    { label: 'Personal',     value: personal,     color: 'bg-indigo-500' },
    { label: 'Reimbursable', value: reimbursable, color: 'bg-primary' },
    { label: 'Pending',      value: pending,      color: 'bg-warning' },
  ];

  return (
    <div className="rounded-2xl border border-border/40 overflow-hidden" style={{
      background: 'linear-gradient(135deg, hsl(262 85% 65% / 0.10), hsl(186 95% 52% / 0.06))',
    }}>
      {/* Top section */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {format(now, 'MMMM yyyy')}
            </p>
            <div className="flex items-end gap-2 mt-1">
              <p className="text-3xl font-bold tracking-tight number-lg">
                {formatCompactCurrency(thisMonth)}
              </p>
              {trend !== null && (
                <div className={cn(
                  'flex items-center gap-0.5 text-xs font-semibold mb-0.5 px-1.5 py-0.5 rounded-full',
                  isUp ? 'text-rose-400 bg-rose-500/15' : 'text-emerald-400 bg-emerald-500/15'
                )}>
                  {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(trend).toFixed(0)}%
                </div>
              )}
            </div>
            {trend !== null && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                vs ₹{formatCompactCurrency(lastMonth)} last month
              </p>
            )}
          </div>
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:gap-2 transition-all mt-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>

        {/* Stacked bar */}
        {thisMonth > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5 mb-3">
            {bars.map(b => b.value > 0 && (
              <div
                key={b.label}
                className={cn('rounded-full transition-all', b.color)}
                style={{ flex: b.value / max }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status pills row */}
      <div className="grid grid-cols-3 border-t border-border/30">
        {bars.map((b, i) => (
          <div key={b.label} className={cn(
            'flex flex-col items-center py-3 px-2',
            i < bars.length - 1 && 'border-r border-border/30'
          )}>
            <div className={cn('h-1.5 w-1.5 rounded-full mb-1.5', b.color)} />
            <p className="text-xs font-bold">{formatCompactCurrency(b.value)}</p>
            <p className="text-[9px] text-muted-foreground font-medium">{b.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
