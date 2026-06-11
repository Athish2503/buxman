import { useMemo, useState } from 'react';
import {
  BarChart3, Tag, Briefcase, TrendingUp, TrendingDown, CheckCircle2,
  ArrowRight, Sparkles, Download, Calendar, Flame, Grid3x3, LayoutGrid,
  ChevronRight
} from 'lucide-react';
import { subMonths, startOfMonth, isSameMonth, startOfWeek, endOfWeek, isWithinInterval, subDays, subYears, isAfter } from 'date-fns';
import { Expense } from '@/types/expense';
import { formatCompactCurrency, calculateUserShare } from '@/lib/utils';
import { StatCard } from '@/components/stat-card';
import {
  MonthlyBarChart,
  CategoryBreakdownChart,
  SpendingTrendChart,
  CategoryMonthMatrix,
  WeeklyHeatmap,
} from '@/components/analytics-charts';
import { localIntelligence } from '@/lib/intelligence';
import { cn } from '@/lib/utils';

interface AnalyticsModuleProps {
  expenses: Expense[];
  onNavigate: (tab: any) => void;
}

type TimeFilter = 'week' | 'month' | '3m' | '6m' | '1y' | 'all';

const TIME_FILTERS: { id: TimeFilter; label: string }[] = [
  { id: 'week',  label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: '3m',    label: '3M' },
  { id: '6m',    label: '6M' },
  { id: '1y',    label: '1Y' },
  { id: 'all',   label: 'All' },
];

function filterExpenses(expenses: Expense[], filter: TimeFilter): Expense[] {
  const now = new Date();
  switch (filter) {
    case 'week': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      return expenses.filter(e => isAfter(new Date(e.date), start));
    }
    case 'month':
      return expenses.filter(e => isSameMonth(new Date(e.date), now));
    case '3m':
      return expenses.filter(e => isAfter(new Date(e.date), subMonths(now, 3)));
    case '6m':
      return expenses.filter(e => isAfter(new Date(e.date), subMonths(now, 6)));
    case '1y':
      return expenses.filter(e => isAfter(new Date(e.date), subYears(now, 1)));
    case 'all':
    default:
      return expenses;
  }
}

function exportCSV(expenses: Expense[]) {
  const headers = ['Date', 'Vendor', 'Category', 'Amount', 'Status', 'Reimbursable'];
  const rows = expenses.map(e => [
    e.date, e.vendor, e.category, e.amount.toFixed(2), e.status, e.isReimbursement ? 'Yes' : 'No'
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `buxman-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Section Card ──────────────────────────────────────────────── */
function ChartCard({ title, subtitle, icon: Icon, children, className }: {
  title: string;
  subtitle?: string;
  icon?: any;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card/80 p-4 sm:p-5", className)}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground/60" />}
            <h3 className="text-sm font-bold">{title}</h3>
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/* ─── Main Module ──────────────────────────────────────────────── */
export function AnalyticsModule({ expenses, onNavigate }: AnalyticsModuleProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('6m');
  const filteredExpenses = useMemo(() => filterExpenses(expenses, timeFilter), [expenses, timeFilter]);

  const forecast = useMemo(() => localIntelligence.forecastNextMonthSpending(), [expenses]);

  // KPI computations on filtered set
  const totalSpend = useMemo(() => filteredExpenses.reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);
  const personalAmount = useMemo(() => filteredExpenses.filter(e => !e.isReimbursement).reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const reimbursableAmount = useMemo(() => filteredExpenses.filter(e => e.isReimbursement).reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const pendingAmount = useMemo(() => filteredExpenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const reimbursedAmount = useMemo(() => filteredExpenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

  // This month vs last month
  const now = new Date();
  const thisMonthSpend = useMemo(() =>
    expenses.filter(e => isSameMonth(new Date(e.date), now)).reduce((s, e) => s + calculateUserShare(e), 0),
    [expenses]
  );
  const lastMonthSpend = useMemo(() =>
    expenses.filter(e => isSameMonth(new Date(e.date), subMonths(now, 1))).reduce((s, e) => s + calculateUserShare(e), 0),
    [expenses]
  );
  const momDelta = lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0;

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

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground">Visual breakdown of your spending patterns</p>
        </div>
        <button
          onClick={() => exportCSV(expenses)}
          className="flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors border border-border/40"
          title="Export all data as CSV"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Export CSV</span>
        </button>
      </div>

      {/* ── Time Filter Bar ── */}
      <div className="flex gap-1.5 p-1 bg-muted/30 rounded-2xl border border-border/30 overflow-x-auto">
        {TIME_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setTimeFilter(f.id)}
            className={cn(
              'flex-1 min-w-[44px] text-[11px] font-black py-2 px-3 rounded-xl whitespace-nowrap transition-all duration-200',
              timeFilter === f.id
                ? 'bg-primary text-white shadow-sm scale-[1.02]'
                : 'text-muted-foreground hover:bg-muted/60'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* ── Month-over-Month Summary ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">This Month</p>
          <p className="text-2xl font-black tracking-tight">{formatCompactCurrency(thisMonthSpend)}</p>
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold mt-2",
            momDelta > 0 ? "text-destructive" : "text-success"
          )}>
            {momDelta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(momDelta).toFixed(1)}% vs last month
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Last Month</p>
          <p className="text-2xl font-black tracking-tight">{formatCompactCurrency(lastMonthSpend)}</p>
          <p className="text-[11px] text-muted-foreground mt-2">{expenses.length} total records</p>
        </div>
      </div>

      {/* ── Section 1: Spending Trend ── */}
      <ChartCard
        title="Spending Trend"
        subtitle="Monthly total with time-scale toggle"
        icon={TrendingUp}
      >
        <SpendingTrendChart expenses={filteredExpenses} />
      </ChartCard>

      {/* ── Section 2: Monthly Breakdown (12-month, drill-down) ── */}
      <ChartCard
        title="Monthly Breakdown"
        subtitle="12-month view — tap a bar to drill into daily data"
        icon={Calendar}
      >
        <MonthlyBarChart expenses={expenses} />
      </ChartCard>

      {/* ── Section 3 + 4: Category Breakdown & Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartCard title="By Category" subtitle="Top 7 categories" icon={LayoutGrid} className="lg:col-span-2">
          <CategoryBreakdownChart expenses={filteredExpenses} />
        </ChartCard>
        <ChartCard title="Category × Month" subtitle="Stacked spend per category over 6 months" icon={Grid3x3} className="lg:col-span-3">
          <CategoryMonthMatrix expenses={expenses} />
        </ChartCard>
      </div>

      {/* ── Section 5: Weekly Heatmap ── */}
      <ChartCard
        title="Weekly Heatmap"
        subtitle="12-week spending intensity — hover any cell for details"
        icon={Flame}
      >
        <WeeklyHeatmap expenses={expenses} />
      </ChartCard>

      {/* ── Section 6: AI Forecast ── */}
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
            <p className="text-3xl font-black mt-2 text-foreground">
              ₹ {forecast.predicted.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
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
    </div>
  );
}
