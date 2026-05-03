import { useMemo } from 'react';
import { Expense, BudgetGoal } from '@/types/expense';
import { categoryService, iconMap } from '@/lib/category-service';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { startOfMonth } from 'date-fns';
import { AlertTriangle, CheckCircle2, Target } from 'lucide-react';

interface BudgetTrackerProps {
  expenses: Expense[];
  budgets: BudgetGoal[];
  onManage?: () => void;
}

export function BudgetTracker({ expenses, budgets, onManage }: BudgetTrackerProps) {
  const currentMonthStart = startOfMonth(new Date());

  const budgetProgress = useMemo(() => {
    return budgets.map(budget => {
      const periodExpenses = expenses.filter(e => {
        const d = new Date(e.date);
        if (budget.period === 'monthly') return d >= currentMonthStart;
        if (budget.period === 'quarterly') {
          const qStart = new Date(currentMonthStart);
          qStart.setMonth(qStart.getMonth() - 2);
          return d >= qStart;
        }
        const yStart = new Date(new Date().getFullYear(), 0, 1);
        return d >= yStart;
      }).filter(e => e.category === budget.category);

      const spent = periodExpenses.reduce((s, e) => s + e.amount, 0);
      const pct = Math.min((spent / budget.limit) * 100, 100);

      return { ...budget, spent, pct };
    });
  }, [expenses, budgets, currentMonthStart]);

  if (budgets.length === 0) {
    return (
      <div
        onClick={onManage}
        className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-border/60 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
      >
        <Target className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors mb-2" />
        <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Set budget goals</p>
        <p className="text-xs text-muted-foreground mt-0.5">Track spending against limits</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {budgetProgress.map(b => {
        const cat = categoryService.getById(b.category);
        const Icon = iconMap[cat.iconName] || Target;
        const isOver = b.pct >= 100;
        const isNear = b.pct >= 80 && !isOver;

        return (
          <div key={b.category} className="group relative p-4 rounded-[1.5rem] border border-white/5 bg-card/20 glass shadow-sm hover:border-white/10 transition-all active:scale-[0.98]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/5", 
                  cat.bgColor
                )}>
                  <Icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <div>
                  <p className="text-xs font-black tracking-tight">{cat.label}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{b.period}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className={cn(
                    "text-sm font-black tracking-tighter", 
                    isOver ? "text-destructive" : isNear ? "text-warning" : "text-foreground"
                  )}>
                    {formatCurrency(b.spent)}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground/30">/ {formatCurrency(b.limit)}</span>
                </div>
                {isOver && (
                  <div className="flex items-center justify-end gap-1 text-[8px] font-black uppercase text-destructive tracking-widest mt-0.5">
                    <AlertTriangle className="h-2.5 w-2.5" /> Limit Exceeded
                  </div>
                )}
              </div>
            </div>

            <div className="relative h-2 w-full bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000 ease-out shadow-glow",
                  isOver ? "bg-destructive shadow-destructive/20" : isNear ? "bg-warning shadow-warning/20" : "bg-gradient-primary shadow-primary/20"
                )}
                style={{ width: `${b.pct}%` }}
              />
            </div>

            <div className="flex justify-between mt-2.5 px-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                {Math.round(b.pct)}% consumed
              </span>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                isOver ? "text-destructive" : isNear ? "text-warning" : "text-primary/60"
              )}>
                {isOver ? `${(b.spent - b.limit).toFixed(0)} over limit` : `${(b.limit - b.spent).toFixed(0)} remaining`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
