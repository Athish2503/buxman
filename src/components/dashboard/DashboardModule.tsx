import { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, IndianRupee, Fuel, Car, Bike, ArrowRight, ChevronRight,
  Wallet, Receipt, PiggyBank, Zap, GaugeCircle, BarChart3, CheckCircle2,
  Clock, AlertCircle, Sparkles, Briefcase, PieChart
} from 'lucide-react';
import { Expense, BudgetGoal } from '@/types/expense';
import { formatCompactCurrency, cn } from '@/lib/utils';
import { mileageService, fuelService } from '@/lib/modules-storage';
import { MonthlySummary } from '@/components/monthly-summary';
import { CategoryRings } from '@/components/category-rings';
import { SpendingTrendChart, VehicleEfficiencyChart, FuelCostChart } from '@/components/analytics-charts';
import { BudgetTracker } from '@/components/budget-tracker';
import { ExpenseList } from '@/components/expense-list';
import { settingsService } from '@/lib/settings';

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
function BalanceHeroCard({ expenses, onNavigate }: { expenses: Expense[]; onNavigate: (t: any) => void }) {
  const total      = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const personal   = useMemo(() => expenses.filter(e => !e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const pending    = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + e.amount, 0), [expenses]);
  const recovered  = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0), [expenses]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-3xl overflow-hidden mb-4"
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(258_88%_20%)] via-[hsl(280_85%_14%)] to-[hsl(225_22%_8%)]" />
      <div className="absolute inset-0 bg-aurora opacity-60" />
      {/* Shine sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent"
          animate={{ left: ['-40%', '140%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 3 }}
        />
      </div>
      {/* Inner top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative p-5 pb-4">
        {/* Greeting */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] text-white/50 font-semibold uppercase tracking-widest">{greeting}</p>
            <p className="text-sm font-display font-bold text-white/90 mt-0.5">Your Expense Hub</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <Sparkles className="h-4.5 w-4.5 text-white/70" />
          </div>
        </div>

        {/* Total Balance */}
        <div className="mb-5">
          <p className="label-caps text-white/40 mb-1">Total Tracked</p>
          <div className="text-4xl font-display font-black text-white tracking-tight">
            ₹<AnimatedNumber value={total} />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Personal', value: personal, icon: Wallet, color: 'text-violet-300', bg: 'bg-violet-500/15' },
            { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-300', bg: 'bg-amber-500/15' },
            { label: 'Recovered', value: recovered, icon: CheckCircle2, color: 'text-emerald-300', bg: 'bg-emerald-500/15' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className={cn('rounded-2xl p-3', stat.bg, 'border border-white/8')}
            >
              <stat.icon className={cn('h-3.5 w-3.5 mb-2', stat.color)} />
              <p className={cn('text-base font-display font-bold leading-none', stat.color)}>
                ₹<AnimatedNumber value={stat.value} />
              </p>
              <p className="text-[9px] text-white/40 mt-1 font-semibold uppercase tracking-wider">{stat.label}</p>
            </motion.div>
          ))}
        </div>
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
      <p className="label-caps text-muted-foreground mb-3 px-0.5">Quick Access</p>
      <div className="grid grid-cols-4 gap-2.5">
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 360, damping: 24 }}
            onClick={() => onNavigate(a.tab)}
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

/* ── KPI Widget ── */
function KpiWidget({ label, value, icon: Icon, color, delay = 0, prefix = '₹', suffix = '' }: {
  label: string; value: number; icon: any; color: string; delay?: number; prefix?: string; suffix?: string;
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
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', `bg-${color}-500/12`)}>
          <Icon className={cn('h-3.5 w-3.5', `text-${color}-400`)} />
        </div>
      </div>
      <div className="text-xl font-display font-black tracking-tight">
        {prefix}<AnimatedNumber value={value} />
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
  const [tab, setTab] = useState<'overview' | 'vehicle'>('overview');

  const personalAmount    = useMemo(() => expenses.filter(e => !e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursableAmt   = useMemo(() => expenses.filter(e => e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const pendingAmount     = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursedAmount  = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0), [expenses]);

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

  return (
    <div className="space-y-4 stagger">

      {/* Balance Hero */}
      <BalanceHeroCard expenses={expenses} onNavigate={onNavigate} />

      {/* Quick Actions */}
      <QuickActions onNavigate={onNavigate} />

      {/* Tab Switcher */}
      <div className="flex bg-surface-2 p-1 rounded-2xl gap-1">
        {(['overview', 'vehicle'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-250 capitalize flex items-center justify-center gap-2',
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'overview' 
              ? <><PieChart className="w-3.5 h-3.5" /> Overview</> 
              : <><Car className="w-3.5 h-3.5" /> Vehicle</>
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

            {/* Monthly Summary + Category Rings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="card-premium p-4 overflow-hidden">
                <MonthlySummary expenses={expenses} onViewAll={() => onNavigate('expenses')} />
              </div>
              <div className="card-premium p-4">
                <p className="label-caps text-muted-foreground mb-3">By Category</p>
                <CategoryRings expenses={expenses} />
              </div>
            </div>

            {/* Spending Trend */}
            <div className="card-premium p-4">
              <SectionHeader title="Spending Trend" />
              <SpendingTrendChart expenses={expenses} />
            </div>

            {/* Budget Goals */}
            {(settings.budgets || []).length > 0 && (
              <div className="card-premium p-4">
                <SectionHeader title="Budget Goals" action="Manage" onAction={() => onNavigate('settings')} />
                <BudgetTracker expenses={expenses} budgets={settings.budgets || []} onManage={() => onNavigate('settings')} />
              </div>
            )}

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
                <SectionHeader title="Fleet Efficiency" action="Garage" onAction={() => onNavigate('vehicle')} />
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
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">Open Full Garage</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
