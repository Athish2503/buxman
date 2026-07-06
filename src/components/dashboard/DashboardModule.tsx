import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, IndianRupee, Fuel, Car, Bike, ArrowRight, ChevronRight,
  Wallet, Receipt, PiggyBank, Zap, GaugeCircle, BarChart3, CheckCircle2,
  Clock, AlertCircle, Sparkles, Briefcase, PieChart,
  AlertTriangle, Lightbulb, ChevronLeft, Clapperboard, Star, Film, Tv, Play
} from 'lucide-react';
import { Expense, BudgetGoal } from '@/types/expense';
import { formatCompactCurrency, cn, calculateUserShare } from '@/lib/utils';
import { mileageService, fuelService } from '@/lib/modules-storage';
import { CategoryRings } from '@/components/category-rings';
import { SpendingTrendChart, VehicleEfficiencyChart, FuelCostChart } from '@/components/analytics-charts';
import { BudgetTracker } from '@/components/budget-tracker';
import { ExpenseList } from '@/components/expense-list';
import { settingsService } from '@/lib/settings';
import { haptics } from '@/lib/haptics';
import { mediaService } from '@/lib/media-service';

interface DashboardModuleProps {
  expenses: Expense[];
  onNavigate: (tab: any) => void;
  onUpdateExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteAll: () => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchStatus: (ids: string[], status: any) => void;
  settings: any;
}

/* ── Animated Number Counter ── */
function AnimatedNumber({ value, prefix = '', suffix = '', decimals = 0 }: {
  value: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const from = 0;
    const to = value;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out expo
      const eased = 1 - Math.pow(1 - progress, 4);
      setDisplayed(from + (to - from) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  const formatted = decimals > 0
    ? displayed.toFixed(decimals)
    : Math.round(displayed).toLocaleString('en-IN');

  return (
    <span className="font-display tabular-nums">
      {prefix}{formatted}{suffix}
    </span>
  );
}

/* ── Balance Hero Card ── */
function BalanceHeroCard({ 
  filteredExpenses,
  timeframe,
  setTimeframe,
  onNavigate 
}: { 
  filteredExpenses: Expense[]; 
  timeframe: 'month' | 'all';
  setTimeframe: (t: 'month' | 'all') => void;
  onNavigate: (t: any) => void;
}) {
  const total      = useMemo(() => filteredExpenses.reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);
  const personal   = useMemo(() => filteredExpenses.filter(e => !e.isReimbursement).reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);
  const pending    = useMemo(() => filteredExpenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);
  const recovered  = useMemo(() => filteredExpenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);

  // Percentages for the continuous breakdown bar
  const personalPct  = total > 0 ? (personal / total) * 100 : 0;
  const pendingPct   = total > 0 ? (pending / total) * 100 : 0;
  const recoveredPct = total > 0 ? (recovered / total) * 100 : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-xl overflow-hidden border border-border bg-gradient-to-br from-primary/10 via-card to-card shadow-sm flex flex-col justify-between"
    >
      <div className="p-5 flex flex-col justify-between h-full">
        <div>
          {/* Top Header Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div 
                className="select-none active:scale-95 transition-transform" 
                onClick={() => {
                  const now = Date.now();
                  const last = (window as any)._lastTap || 0;
                  const count = (window as any)._tapCount || 0;
                  if (now - last < 500) {
                    (window as any)._tapCount = count + 1;
                  } else {
                    (window as any)._tapCount = 1;
                  }
                  (window as any)._lastTap = now;
                  if ((window as any)._tapCount >= 3) {
                    (window as any)._tapCount = 0;
                    window.location.href = '/diagnostics';
                  }
                }}
              >
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{greeting}</p>
                <h2 className="text-xs font-bold text-foreground tracking-tight mt-0.5">
                  Financial Hub
                </h2>
              </div>
            </div>

            {/* Timeframe Scope Switcher */}
            <div className="flex items-center bg-secondary p-0.5 rounded-lg border border-border">
              {(['month', 'all'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { haptics.selection(); setTimeframe(t); }}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wider uppercase transition-all duration-200",
                    timeframe === t 
                      ? "bg-card text-foreground shadow-sm border border-border" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t === 'month' ? 'Month' : 'Total'}
                </button>
              ))}
            </div>
          </div>

          {/* Main Balance Display */}
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {timeframe === 'month' ? 'Spend Current Month' : 'Total Cumulative Spend'}
              </p>
              <span className="text-[9px] font-mono text-muted-foreground">
                {filteredExpenses.length} {filteredExpenses.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                ₹<AnimatedNumber value={total} />
              </div>
            </div>

            {/* Distribution Continuous Bar */}
            {total > 0 && (
              <div className="mt-3.5 space-y-1.5">
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden flex gap-0.5">
                  {personalPct > 0 && (
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${personalPct}%` }} 
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-primary rounded-full" 
                    />
                  )}
                  {pendingPct > 0 && (
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${pendingPct}%` }} 
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-warning rounded-full" 
                    />
                  )}
                  {recoveredPct > 0 && (
                    <motion.div 
                      initial={{ width: 0 }} 
                      animate={{ width: `${recoveredPct}%` }} 
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-success rounded-full" 
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sub Bento Grid Items */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { label: 'Personal', value: personal, icon: Wallet, color: 'text-primary', dot: 'bg-primary', bg: 'bg-card' },
            { label: 'Pending', value: pending, icon: Clock, color: 'text-warning', dot: 'bg-warning', bg: 'bg-card' },
            { label: 'Settled', value: recovered, icon: CheckCircle2, color: 'text-success', dot: 'bg-success', bg: 'bg-card' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                haptics.selection();
                if (stat.label === 'Pending' || stat.label === 'Settled') {
                  onNavigate('reimbursements');
                } else {
                  onNavigate('expenses');
                }
              }}
              className={cn(
                "rounded-lg p-2.5 border border-border relative overflow-hidden group cursor-pointer hover:bg-secondary/40 transition-all",
                stat.bg
              )}
            >
              {/* Inner ambient light indicator */}
              <div className="absolute top-0 right-0 p-1.5 opacity-60">
                <div className={cn("w-1 h-1 rounded-full", stat.dot)} />
              </div>

              <div className="flex items-center gap-1.5 mb-1">
                <stat.icon className={cn("h-3 w-3", stat.color)} />
                <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
              </div>
              
              <p className={cn("text-xs font-bold leading-none tracking-tight", stat.color)}>
                ₹<AnimatedNumber value={stat.value} />
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Smart Insights Card ── */
function SmartInsightsCard({ insights }: { insights: Array<{ id: string; title: string; description: string; type: 'info' | 'warning' | 'success'; actionLabel?: string; onClick?: () => void }> }) {
  const [index, setIndex] = useState(0);
  const current = insights[index] || insights[0];

  const handleNext = () => {
    setIndex((prev) => (prev + 1) % insights.length);
    haptics.selection();
  };

  const handlePrev = () => {
    setIndex((prev) => (prev - 1 + insights.length) % insights.length);
    haptics.selection();
  };

  if (!current) return null;

  const typeConfig = {
    info: { icon: Lightbulb, border: 'border-primary/20', bg: 'bg-primary/10', text: 'text-primary' },
    warning: { icon: AlertTriangle, border: 'border-warning/20', bg: 'bg-warning/10', text: 'text-warning' },
    success: { icon: Sparkles, border: 'border-success/20', bg: 'bg-success/10', text: 'text-success' },
  }[current.type];

  const Icon = typeConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className={cn("rounded-xl border p-5 bg-card shadow-sm flex flex-col justify-between min-h-[220px] transition-all", typeConfig.border)}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg flex items-center justify-center shrink-0 mt-0.5", typeConfig.bg)}>
            <Icon className={cn("h-4.5 w-4.5", typeConfig.text)} />
          </div>
          <div className="space-y-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{current.title}</h4>
            <p className="text-xs text-foreground leading-relaxed font-semibold">{current.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
        <div className="flex items-center gap-1.5">
          {insights.length > 1 && (
            <>
              <button onClick={handlePrev} className="p-1 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-[9px] font-mono font-bold text-muted-foreground px-1 select-none">
                {index + 1} / {insights.length}
              </span>
              <button onClick={handleNext} className="p-1 rounded-md hover:bg-secondary text-muted-foreground transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
        {current.actionLabel && current.onClick && (
          <button
            onClick={current.onClick}
            className="text-[9px] font-bold uppercase tracking-widest text-primary hover:text-primary-hover px-3 py-1.5 rounded-lg bg-primary/10 transition-colors"
          >
            {current.actionLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Quick Action Tiles ── */
function QuickActions({ onNavigate }: { onNavigate: (t: any) => void }) {
  const actions = [
    { label: 'Expenses', icon: Receipt, tab: 'expenses', color: 'text-violet-400', bg: 'bg-violet-500/12 border-violet-500/20' },
    { label: 'Claims',   icon: Briefcase, tab: 'reimbursements', color: 'text-amber-400', bg: 'bg-amber-500/12 border-amber-500/20' },
    { label: 'Trips',    icon: Zap, tab: 'trips', color: 'text-cyan-400', bg: 'bg-cyan-500/12 border-cyan-500/20' },
    { label: 'Charts',   icon: BarChart3, tab: 'analytics', color: 'text-emerald-400', bg: 'bg-emerald-500/12 border-emerald-500/20' },
  ];

  return (
    <div className="mb-4">
      <p className="label-caps text-muted-foreground mb-3 px-0.5">Navigation</p>
      <div className="grid grid-cols-4 gap-2.5">
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 360, damping: 24 }}
            onClick={() => { haptics.selection(); onNavigate(a.tab); }}
            className={cn(
              'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 press-scale',
              a.bg
            )}
          >
            <div className="w-9 h-9 rounded-xl bg-black/20 flex items-center justify-center">
              <a.icon className={cn('h-4.5 w-4.5', a.color)} strokeWidth={1.8} />
            </div>
            <span className={cn('text-[9px] font-bold uppercase tracking-wider', a.color)}>{a.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ── KPI Widget Color Map ── */
const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  violet:  { bg: 'bg-primary/10', text: 'text-primary' },
  amber:   { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-500' },
  orange:  { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-500' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-500' },
  blue:    { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  cyan:    { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
};

/* ── KPI Widget ── */
function KpiWidget({ label, value, icon: Icon, color, delay = 0, prefix = '₹', suffix = '', decimals = 0 }: {
  label: string; value: number; icon: any; color: string; delay?: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="card-premium p-4 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <p className="label-caps text-muted-foreground">{label}</p>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', COLOR_MAP[color]?.bg || 'bg-muted')}>
          <Icon className={cn('h-3.5 w-3.5', COLOR_MAP[color]?.text || 'text-muted-foreground')} />
        </div>
      </div>
      <div className="text-xl font-bold tracking-tight">
        {prefix}<AnimatedNumber value={value} decimals={decimals} />
        {suffix && <span className="text-xs font-medium text-muted-foreground ml-1">{suffix}</span>}
      </div>
    </motion.div>
  );
}

/* ── Section Header ── */
function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-display font-bold tracking-tight">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-0.5 text-[11px] font-bold text-primary hover:text-primary-hover transition-colors px-2 py-1 rounded-lg hover:bg-primary/8"
        >
          {action} <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ── Main Dashboard ── */
export function DashboardModule({
  expenses, onNavigate, onUpdateExpense, onDeleteExpense, onDeleteAll, onBatchDelete, onBatchStatus, settings
}: DashboardModuleProps) {
  const [tab, setTab] = useState<'overview' | 'vehicle' | 'watchlist'>('overview');
  const [timeframe, setTimeframe] = useState<'month' | 'all'>('month');

  // Compute filtered expenses reliably based on selected timeframe
  const filteredExpenses = useMemo(() => {
    if (timeframe === 'all') return expenses;
    const now = new Date();
    const currYear = now.getFullYear();
    const currMonth = now.getMonth();
    return expenses.filter(e => {
      if (!e.date) return false;
      // Extract year and month directly via regex to avoid timezone/midnight offset drift
      const match = e.date.match(/^(\d{4})-(\d{2})/);
      if (match) {
        const y = parseInt(match[1], 10);
        const m = parseInt(match[2], 10) - 1; // 0-indexed
        return y === currYear && m === currMonth;
      }
      const d = new Date(e.date);
      return d.getFullYear() === currYear && d.getMonth() === currMonth;
    });
  }, [expenses, timeframe]);

  const personalAmount    = useMemo(() => filteredExpenses.filter(e => !e.isReimbursement).reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);
  const reimbursableAmt   = useMemo(() => filteredExpenses.filter(e => e.isReimbursement).reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);
  const pendingAmount     = useMemo(() => filteredExpenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);
  const reimbursedAmount  = useMemo(() => filteredExpenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + calculateUserShare(e), 0), [filteredExpenses]);

  const vehicleSummaries = useMemo(() => {
    const vList = mileageService.getVehicles();
    const fLogs = fuelService.getLogs();
    return vList.map(v => {
      const vLogs    = fLogs.filter(l => l.vehicleId === v.id);
      const economies = vLogs.filter(l => l.economy).map(l => l.economy!);
      const avgEco   = economies.length > 0 ? economies.reduce((s, e) => s + e, 0) / economies.length : 0;
      const totalDist = vLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
      const totalCost = vLogs.reduce((s, l) => s + l.totalCost, 0);
      return { ...v, avgEco, trend: vLogs[0]?.economyTrend || 0, totalDist, totalCost };
    }).sort((a, b) => b.totalDist - a.totalDist);
  }, [expenses]);

  const vehicleStats = useMemo(() => {
    const totalDist = vehicleSummaries.reduce((s, v) => s + v.totalDist, 0);
    const totalCost = vehicleSummaries.reduce((s, v) => s + v.totalCost, 0);
    const overallEco = vehicleSummaries.filter(v => v.avgEco > 0).reduce((s, v) => s + v.avgEco, 0)
      / Math.max(1, vehicleSummaries.filter(v => v.avgEco > 0).length);
    return { totalDist, totalCost, overallEco, costPerKm: totalDist > 0 ? totalCost / totalDist : 0 };
  }, [vehicleSummaries]);

  // ── Smart Insights Engine ──
  const smartInsights = useMemo(() => {
    const insights: Array<{
      id: string;
      title: string;
      description: string;
      type: 'info' | 'warning' | 'success';
      actionLabel?: string;
      onClick?: () => void;
    }> = [];

    // 1. Claims Nudge
    if (pendingAmount > 2000) {
      insights.push({
        id: 'pending-claims',
        title: 'Pending Claims Nudge',
        description: `You have ₹${pendingAmount.toLocaleString('en-IN')} in unclaimed reimbursable expenses ready for review.`,
        type: 'warning',
        actionLabel: 'View Claims',
        onClick: () => onNavigate('reimbursements')
      });
    }

    // 2. Budget Alert
    const budgets = settings.budgets || [];
    if (budgets.length > 0) {
      const spentByCategory: Record<string, number> = {};
      filteredExpenses.forEach(e => {
        const cat = e.category || 'Other';
        spentByCategory[cat] = (spentByCategory[cat] || 0) + calculateUserShare(e);
      });

      budgets.forEach((b: any) => {
        const spent = spentByCategory[b.category] || 0;
        const limit = b.limit || 1;
        const pct = (spent / limit) * 100;
        if (pct >= 85) {
          insights.push({
            id: `budget-${b.category}`,
            title: 'Budget Alert',
            description: `Your spend in "${b.category}" has reached ${Math.round(pct)}% of its ₹${limit.toLocaleString('en-IN')} monthly limit.`,
            type: 'warning',
            actionLabel: 'Manage',
            onClick: () => onNavigate('settings')
          });
        }
      });
    }

    // 3. Highest Spending Category
    if (filteredExpenses.length > 0) {
      const spentByCategory: Record<string, number> = {};
      filteredExpenses.forEach(e => {
        const cat = e.category || 'Other';
        spentByCategory[cat] = (spentByCategory[cat] || 0) + calculateUserShare(e);
      });

      let topCat = '';
      let topAmount = 0;
      Object.entries(spentByCategory).forEach(([cat, amt]) => {
        if (amt > topAmount) {
          topAmount = amt;
          topCat = cat;
        }
      });

      if (topCat && topAmount > 1000) {
        insights.push({
          id: 'top-spending',
          title: 'Top Category Spend',
          description: `Your highest spend is in "${topCat}", totaling ₹${topAmount.toLocaleString('en-IN')} this period.`,
          type: 'info',
          actionLabel: 'Details',
          onClick: () => onNavigate('expenses')
        });
      }
    }

    // 4. Vehicle Service Nudge
    const vehicles = mileageService.getVehicles();
    const logs = fuelService.getLogs();
    vehicles.forEach(v => {
      if (v.serviceInterval && v.lastServiceOdo) {
        const vLogs = logs.filter(l => l.vehicleId === v.id);
        const latestOdo = vLogs.length > 0 ? vLogs[0].odometer : 0;
        const kms = latestOdo - v.lastServiceOdo;
        if (kms >= v.serviceInterval * 0.9) {
          insights.push({
            id: `vehicle-service-${v.id}`,
            title: 'Vehicle Service Alert',
            description: `${v.name} is approaching its scheduled service interval (${kms.toLocaleString()} km logged).`,
            type: 'warning',
            actionLabel: 'Garage',
            onClick: () => onNavigate('vehicle')
          });
        }
      }
    });

    if (insights.length === 0) {
      insights.push({
        id: 'no-alerts',
        title: 'All Systems Normal',
        description: 'Your budgets are healthy and all claims are currently up to date.',
        type: 'success'
      });
    }

    return insights;
  }, [filteredExpenses, pendingAmount, settings.budgets, onNavigate]);

  const [analyticsMode, setAnalyticsMode] = useState<'trends' | 'categories' | 'budgets'>('trends');

  // ── Watchlist Stats ──
  const mediaStats = useMemo(() => {
    const all = mediaService.getMedia();
    const toWatch  = all.filter(m => m.status === 'to_watch');
    const watching = all.filter(m => m.status === 'watching');
    const watched  = all.filter(m => m.status === 'watched');
    const rated    = all.filter(m => m.rating);
    const avgRating = rated.length
      ? rated.reduce((s, m) => s + (m.rating ?? 0), 0) / rated.length
      : 0;
    // Genre distribution
    const genreCounts: Record<string, number> = {};
    all.forEach(m => m.genres.forEach(g => { genreCounts[g] = (genreCounts[g] || 0) + 1; }));
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    // Platform distribution
    const platformCounts: Record<string, number> = {};
    all.forEach(m => {
      const p = m.platform || 'none';
      platformCounts[p] = (platformCounts[p] || 0) + 1;
    });
    const topPlatforms = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    // Top rated
    const topRated = [...watched]
      .filter(m => m.rating)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 3);
    return { all, toWatch, watching, watched, rated, avgRating, topGenres, topPlatforms, topRated };
  }, [tab]); // re-run when tab switches so data is fresh

  return (
    <div className="space-y-4 stagger">

      {/* Bento Layout Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BalanceHeroCard 
          filteredExpenses={filteredExpenses} 
          timeframe={timeframe} 
          setTimeframe={setTimeframe} 
          onNavigate={onNavigate} 
        />
        <SmartInsightsCard insights={smartInsights} />
      </div>

      {/* Quick Actions */}
      <QuickActions onNavigate={onNavigate} />

      {/* Tab Switcher */}
      <div className="flex bg-surface-2 p-1 rounded-2xl gap-1">
        {(['overview', 'vehicle', 'watchlist'] as const).map(t => (
          <button
            key={t}
            onClick={() => { haptics.selection(); setTab(t); }}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-250 capitalize flex items-center justify-center gap-2',
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'overview'
              ? <><PieChart className="w-3.5 h-3.5" />Overview</>
              : t === 'vehicle'
              ? <><Car className="w-3.5 h-3.5" />Vehicle</>
              : <><Clapperboard className="w-3.5 h-3.5" />Watchlist</>
            }
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <KpiWidget label="Personal"  value={personalAmount}   icon={Wallet}       color="violet" delay={0}    />
              <KpiWidget label="Claims"    value={reimbursableAmt}  icon={Receipt}      color="amber"  delay={0.05} />
              <KpiWidget label="Pending"   value={pendingAmount}    icon={AlertCircle}  color="orange" delay={0.10} />
              <KpiWidget label="Settled"   value={reimbursedAmount} icon={CheckCircle2} color="emerald" delay={0.15} />
            </div>

            {/* Tabbed Analytics Hub */}
            <div className="card-premium p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Insights & Analysis</h3>
                <div className="flex bg-secondary p-0.5 rounded-lg border border-border">
                  {(['trends', 'categories', 'budgets'] as const).map((mode) => {
                    if (mode === 'budgets' && (settings.budgets || []).length === 0) return null;
                    return (
                      <button
                        key={mode}
                        onClick={() => { haptics.selection(); setAnalyticsMode(mode); }}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[9px] font-bold tracking-wider uppercase transition-all duration-200",
                          analyticsMode === mode
                            ? "bg-card text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {mode === 'trends' ? 'Trend' : mode === 'categories' ? 'Category' : 'Budgets'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-[220px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {analyticsMode === 'trends' && (
                    <motion.div
                      key="trends"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <SpendingTrendChart expenses={filteredExpenses} />
                    </motion.div>
                  )}
                  {analyticsMode === 'categories' && (
                    <motion.div
                      key="categories"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CategoryRings expenses={filteredExpenses} />
                    </motion.div>
                  )}
                  {analyticsMode === 'budgets' && (
                    <motion.div
                      key="budgets"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <BudgetTracker expenses={expenses} budgets={settings.budgets || []} onManage={() => onNavigate('settings')} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Recent Expenses */}
            {expenses.length > 0 && (
              <div className="card-premium p-4">
                <SectionHeader title="Recent Activity" action="See All" onAction={() => onNavigate('expenses')} />
                <ExpenseList
                  expenses={expenses.slice(0, 5)}
                  showTypeTabs={false}
                  onUpdateExpense={onUpdateExpense}
                  onDeleteExpense={onDeleteExpense}
                  onDeleteAll={onDeleteAll}
                  onBatchDelete={onBatchDelete}
                  onBatchStatus={onBatchStatus}
                />
              </div>
            )}

            {/* Empty state */}
            {expenses.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-premium p-10 flex flex-col items-center text-center gap-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center animate-float-y">
                  <Receipt className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">No expenses yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                    Tap the <span className="text-primary font-bold">+</span> button to log your first expense.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── Vehicle Tab ── */}
        {tab === 'vehicle' && (
          <motion.div
            key="vehicle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Vehicle KPIs */}
            <div className="grid grid-cols-2 gap-2.5">
              <KpiWidget label="Distance" value={vehicleStats.totalDist} icon={GaugeCircle} color="blue"   prefix="" suffix="km" delay={0} />
              <KpiWidget label="Fuel Spend" value={vehicleStats.totalCost}  icon={Fuel}        color="cyan"  delay={0.05} />
              <KpiWidget label="Avg Economy" value={vehicleStats.overallEco} icon={TrendingUp}  color="emerald" prefix="" suffix="km/l" delay={0.10} />
              <KpiWidget label="Cost/km"   value={vehicleStats.costPerKm}  icon={IndianRupee} color="violet" decimals={2} delay={0.15} />
            </div>

            {/* Fleet efficiency bars */}
            {vehicleSummaries.length > 0 && (
              <div className="card-premium p-4">
                <SectionHeader title="Vehicle Stats" action="Garage" onAction={() => onNavigate('vehicle')} />
                <div className="space-y-4">
                  {vehicleSummaries.map(v => (
                    <div key={v.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {v.icon === 'car'
                            ? <Car  className="h-3.5 w-3.5 text-primary" />
                            : <Bike className="h-3.5 w-3.5 text-primary" />}
                          <span className="text-xs font-bold">{v.name}</span>
                        </div>
                        <span className="text-xs font-black">
                          {v.avgEco.toFixed(1)} <span className="text-[10px] text-muted-foreground font-normal">km/l</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (v.avgEco / 20) * 100)}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                          className={cn('h-full rounded-full', v.trend >= 0 ? 'bg-gradient-mint' : 'bg-gradient-warning')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="card-premium p-4">
              <SectionHeader title="Economy Trend" />
              <VehicleEfficiencyChart logs={fuelService.getLogs()} vehicles={mileageService.getVehicles()} />
            </div>

            <div className="card-premium p-4">
              <SectionHeader title="Fuel Spend" />
              <FuelCostChart logs={fuelService.getLogs()} />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('vehicle')}
              className="w-full py-4 rounded-2xl bg-surface-2 border border-border/40 hover:bg-surface-3 transition-all flex items-center justify-center gap-2 group"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Go to Garage</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </motion.button>
          </motion.div>
        )}
        {/* ── Watchlist Tab ── */}
        {tab === 'watchlist' && (
          <motion.div
            key="watchlist"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <KpiWidget label="Total"     value={mediaStats.all.length}      icon={Clapperboard} color="violet"  prefix="" delay={0}    suffix="" />
              <KpiWidget label="To Watch"  value={mediaStats.toWatch.length}  icon={Clock}        color="amber"   prefix="" delay={0.05} suffix="" />
              <KpiWidget label="Watching"  value={mediaStats.watching.length} icon={Play}         color="blue"    prefix="" delay={0.10} suffix="" />
              <KpiWidget label="Watched"   value={mediaStats.watched.length}  icon={CheckCircle2} color="emerald" prefix="" delay={0.15} suffix="" />
            </div>

            {/* Avg Rating + completion rate */}
            {mediaStats.all.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {/* Avg Rating */}
                <div className="card-premium p-4 flex flex-col gap-2">
                  <p className="label-caps text-muted-foreground">Avg Rating</p>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                    <span className="text-2xl font-bold tracking-tight">
                      {mediaStats.avgRating > 0 ? mediaStats.avgRating.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">/5</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{mediaStats.rated.length} rated</p>
                </div>
                {/* Completion Rate */}
                <div className="card-premium p-4 flex flex-col gap-2">
                  <p className="label-caps text-muted-foreground">Completion</p>
                  <div className="text-2xl font-bold tracking-tight">
                    {mediaStats.all.length > 0
                      ? Math.round((mediaStats.watched.length / mediaStats.all.length) * 100)
                      : 0}%
                  </div>
                  <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${mediaStats.all.length > 0 ? (mediaStats.watched.length / mediaStats.all.length) * 100 : 0}%` }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Genre Distribution */}
            {mediaStats.topGenres.length > 0 && (
              <div className="card-premium p-4 space-y-3">
                <SectionHeader title="Top Genres" />
                <div className="space-y-2.5">
                  {mediaStats.topGenres.map(([genre, count], i) => (
                    <div key={genre} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{genre}</span>
                        <span className="text-xs font-black text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(count / mediaStats.all.length) * 100}%` }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
                          className="h-full rounded-full bg-gradient-to-r from-primary/80 to-violet-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform breakdown */}
            {mediaStats.topPlatforms.length > 0 && (
              <div className="card-premium p-4 space-y-3">
                <SectionHeader title="By Platform" />
                <div className="flex flex-wrap gap-2">
                  {mediaStats.topPlatforms.map(([platform, count]) => {
                    const EMOJI: Record<string, string> = {
                      netflix: '🔴', prime: '🔵', disney: '✨', hbo: '🟣',
                      hotstar: '⭐', appletv: '🍎', peacock: '🦚', theatre: '🎭',
                      youtube: '▶️', other: '📺', none: '❓'
                    };
                    return (
                      <div key={platform} className="flex items-center gap-1.5 bg-surface-2 border border-border/20 rounded-xl px-3 py-2">
                        <span className="text-base">{EMOJI[platform] ?? '📺'}</span>
                        <div>
                          <p className="text-[10px] font-black capitalize">{platform === 'none' ? 'Unknown' : platform}</p>
                          <p className="text-[9px] text-muted-foreground">{count} title{count > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Movie vs Series split */}
            {mediaStats.all.length > 0 && (() => {
              const movies  = mediaStats.all.filter(m => m.type === 'movie').length;
              const series  = mediaStats.all.filter(m => m.type === 'series').length;
              const moviePct = Math.round((movies / mediaStats.all.length) * 100);
              return (
                <div className="card-premium p-4 space-y-3">
                  <SectionHeader title="Movies vs Series" />
                  <div className="flex items-center gap-3">
                    <Film className="h-4 w-4 text-purple-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span className="text-purple-400">{movies} Movies</span>
                        <span className="text-cyan-400">{series} Series</span>
                      </div>
                      <div className="h-2.5 w-full bg-surface-3 rounded-full overflow-hidden flex">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${moviePct}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-l-full"
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - moviePct}%` }}
                          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-r-full"
                        />
                      </div>
                    </div>
                    <Tv className="h-4 w-4 text-cyan-400 shrink-0" />
                  </div>
                </div>
              );
            })()}

            {/* Top rated */}
            {mediaStats.topRated.length > 0 && (
              <div className="card-premium p-4 space-y-3">
                <SectionHeader title="Top Rated" action="Watchlist" onAction={() => onNavigate('media')} />
                <div className="space-y-2.5">
                  {mediaStats.topRated.map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-muted-foreground w-4 shrink-0">#{i + 1}</span>
                      {m.posterUrl
                        ? <img src={m.posterUrl} alt={m.title} className="h-10 w-7 object-cover rounded shrink-0 border border-white/10" />
                        : <div className="h-10 w-7 rounded bg-surface-3 flex items-center justify-center text-muted-foreground shrink-0">{m.type === 'movie' ? <Film className="h-3.5 w-3.5" /> : <Tv className="h-3.5 w-3.5" />}</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{m.title}</p>
                        <div className="flex gap-0.5 mt-0.5">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star key={idx} className={cn('h-2.5 w-2.5', idx < (m.rating ?? 0) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/20')} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {mediaStats.all.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-premium p-10 flex flex-col items-center text-center gap-4"
              >
                <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center animate-float-y">
                  <Clapperboard className="h-8 w-8 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base">No watchlist yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-xs">Head to the Watchlist tab to start logging movie and series recommendations!</p>
                </div>
              </motion.div>
            )}

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => onNavigate('media')}
              className="w-full py-4 rounded-2xl bg-surface-2 border border-border/40 hover:bg-surface-3 transition-all flex items-center justify-center gap-2 group"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Go to Watchlist</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
