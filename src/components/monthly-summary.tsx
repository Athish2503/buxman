import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, isSameMonth, subMonths } from 'date-fns';
import { TrendingUp, TrendingDown, ArrowRight, IndianRupee } from 'lucide-react';
import { Expense } from '@/types/expense';
import { formatCompactCurrency, cn, calculateUserShare } from '@/lib/utils';
import { haptics } from '@/lib/haptics';


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
      thisMonth:    tm.reduce((s, e) => s + calculateUserShare(e), 0),
      lastMonth:     lm.reduce((s, e) => s + calculateUserShare(e), 0),
      personal:      tm.filter(e => !e.isReimbursement).reduce((s, e) => s + calculateUserShare(e), 0),
      reimbursable:  tm.filter(e => e.isReimbursement).reduce((s, e) => s + calculateUserShare(e), 0),
      pending:       tm.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + calculateUserShare(e), 0),
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
    <div className="rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl glass" style={{
      background: 'linear-gradient(135deg, hsl(262 85% 65% / 0.12), hsl(186 95% 52% / 0.08))',
    }}>
      {/* Top section */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">
              {format(now, 'MMMM yyyy')}
            </p>
            <div className="flex items-end gap-3 mt-1">
              <p className="text-4xl font-black tracking-tighter number-lg text-foreground">
                {formatCompactCurrency(thisMonth)}
              </p>
              {trend !== null && (
                <div className={cn(
                  'flex items-center gap-1 text-[11px] font-black mb-1 px-2.5 py-1 rounded-xl shadow-inner border',
                  isUp ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                )}>
                  {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {Math.abs(trend).toFixed(0)}%
                </div>
              )}
            </div>
            {trend !== null && (
              <p className="text-[11px] font-bold text-muted-foreground/40 uppercase tracking-tight mt-2">
                vs ₹{formatCompactCurrency(lastMonth)} last month
              </p>
            )}
          </div>
          <button
            onClick={() => { haptics.selection(); onViewAll(); }}
            className="h-10 px-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 transition-all active:scale-95"
          >
            Details <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Stacked bar */}
        {thisMonth > 0 && (
          <div className="flex h-3 rounded-full overflow-hidden gap-1 mb-4 bg-black/20 shadow-inner p-0.5">
            {bars.map(b => b.value > 0 && (
              <div
                key={b.label}
                className={cn('rounded-full transition-all shadow-sm', b.color)}
                style={{ flex: b.value / max }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status pills row */}
      <div className="grid grid-cols-3 border-t border-white/5 bg-black/10">
        {bars.map((b, i) => (
          <div key={b.label} className={cn(
            'flex flex-col items-center py-5 px-3',
            i < bars.length - 1 && 'border-r border-white/5'
          )}>
            <div className={cn('h-1.5 w-1.5 rounded-full mb-2 shadow-glow shadow-current', b.color.replace('bg-', 'text-'))} />
            <p className="text-sm font-black tracking-tight">{formatCompactCurrency(b.value)}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">{b.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
