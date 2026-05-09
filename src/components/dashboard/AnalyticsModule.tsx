import { useMemo } from 'react';
import { BarChart3, Tag, Briefcase, TrendingUp, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { Expense } from '@/types/expense';
import { formatCompactCurrency } from '@/lib/utils';
import { StatCard } from '@/components/stat-card';
import { MonthlyBarChart, CategoryBreakdownChart, SpendingTrendChart } from '@/components/analytics-charts';

import { localIntelligence } from '@/lib/intelligence';

interface AnalyticsModuleProps {
  expenses: Expense[];
  onNavigate: (tab: any) => void;
}

export function AnalyticsModule({ expenses, onNavigate }: AnalyticsModuleProps) {
  const forecast = useMemo(() => localIntelligence.forecastNextMonthSpending(), [expenses]);
  const personalAmount = useMemo(() => expenses.filter(e => !e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursableAmount = useMemo(() => expenses.filter(e => e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const pendingAmount = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursedAmount = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0), [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="font-semibold">No data yet</p>
        <p className="text-sm text-muted-foreground mt-1">Add expenses to see your analytics</p>
        <button
          onClick={() => onNavigate('expenses')}
          className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          Go to Expenses <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-2 px-1">
        <h1 className="text-3xl font-black tracking-tight">Charts</h1>
        <p className="text-xs text-muted-foreground">Visual breakdown of your spending patterns</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Personal"
          value={formatCompactCurrency(personalAmount)}
          icon={Tag}
          gradient="bg-indigo-500/20"
          iconColor="text-indigo-400"
          glowColor="bg-indigo-400"
          delay={0}
        />
        <StatCard
          label="Reimbursable"
          value={formatCompactCurrency(reimbursableAmount)}
          icon={Briefcase}
          gradient="bg-primary/20"
          iconColor="text-primary"
          glowColor="bg-primary"
          delay={100}
        />
        <StatCard
          label="Pending"
          value={formatCompactCurrency(pendingAmount)}
          icon={TrendingUp}
          gradient="bg-warning/20"
          iconColor="text-warning"
          glowColor="bg-warning"
          delay={200}
        />
        <StatCard
          label="Settled"
          value={formatCompactCurrency(reimbursedAmount)}
          icon={CheckCircle2}
          gradient="bg-success/20"
          iconColor="text-success"
          glowColor="bg-success"
          delay={300}
        />
      </div>

      {forecast.predicted > 0 && (
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform">
            <TrendingUp className="h-40 w-40 text-primary" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-primary">Predictive Insights</p>
            </div>
            <h3 className="text-xl font-bold tracking-tight">Next Month Forecast</h3>
            <p className="text-3xl font-black mt-2 text-foreground">₹ {forecast.predicted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            <div className="flex items-center gap-4 mt-4">
              <div className="flex flex-col">
                <p className="text-[9px] text-muted-foreground uppercase font-bold">Confidence</p>
                <p className="text-xs font-bold text-primary">{(forecast.confidence * 100).toFixed(0)}%</p>
              </div>
              <div className="h-8 w-px bg-border/40" />
              <p className="text-[11px] text-muted-foreground max-w-[200px]">
                Based on your last {expenses.length} records. Higher consistency leads to better accuracy.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-card/80 p-4">
          <h3 className="text-sm font-semibold mb-4">Monthly Breakdown</h3>
          <MonthlyBarChart expenses={expenses} />
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/80 p-4">
          <h3 className="text-sm font-semibold mb-4">By Category</h3>
          <CategoryBreakdownChart expenses={expenses} />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
        <h3 className="text-sm font-semibold mb-4">6-Month Spending Trend</h3>
        <SpendingTrendChart expenses={expenses} />
      </div>
    </div>
  );
}
