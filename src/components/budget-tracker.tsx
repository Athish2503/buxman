import { useMemo } from 'react';
import { Expense, BudgetGoal } from '@/types/expense';
import { categoryConfig } from '@/lib/categories';
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
    <div className="space-y-3">
      {budgetProgress.map(b => {
        const cfg = categoryConfig[b.category];
        const Icon = cfg.icon;
        const isOver = b.pct >= 100;
        const isNear = b.pct >= 80 && !isOver;

        return (
          <div key={b.category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn("h-6 w-6 rounded flex items-center justify-center shrink-0", cfg.bgColor)}>
                  <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                </div>
                <span className="text-sm font-medium">{cfg.label}</span>
                {isOver && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                {!isOver && b.pct === 0 && <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/40" />}
              </div>
              <div className="text-right">
                <span className={cn("text-xs font-semibold", isOver ? "text-destructive" : isNear ? "text-warning" : "text-foreground")}>
                  {formatCurrency(b.spent)}
                </span>
                <span className="text-xs text-muted-foreground"> / {formatCurrency(b.limit)}</span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-700 ease-out",
                  isOver ? "bg-destructive" : isNear ? "bg-warning" : "bg-gradient-primary"
                )}
                style={{ width: `${b.pct}%` }}
              />
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground capitalize">{b.period}</span>
              <span className={cn(
                "text-[10px] font-medium",
                isOver ? "text-destructive" : isNear ? "text-warning" : "text-muted-foreground"
              )}>
                {isOver ? `${(b.spent - b.limit).toFixed(0)} over` : `${(b.limit - b.spent).toFixed(0)} left`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
