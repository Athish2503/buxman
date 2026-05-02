import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Receipt, BarChart3, Settings,
  Wallet, TrendingUp, Clock, CheckCircle2, Moon, Sun,
  Zap, ArrowRight, ChevronRight, Plus, Car, Bike, Fuel, RefreshCw, Briefcase,
  GaugeCircle, IndianRupee
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';

import { Expense, ExpenseStatus } from '@/types/expense';
import { storageService } from '@/lib/storage';
import { settingsService } from '@/lib/settings';
import { haptics } from '@/lib/haptics';
import { formatCurrency, formatCompactCurrency, cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { mileageService, fuelService } from '@/lib/modules-storage';
import { audio } from '@/lib/audio';
import { permissions } from '@/lib/permissions';

import { ExpenseForm } from '@/components/expense-form';
import { ExpenseList } from '@/components/expense-list';
import { StatCard } from '@/components/stat-card';
import { BudgetTracker } from '@/components/budget-tracker';
import { SettingsPage } from '@/components/settings-page';
import { 
  SpendingTrendChart, 
  CategoryBreakdownChart, 
  MonthlyBarChart,
  VehicleEfficiencyChart,
  FuelCostChart
} from '@/components/analytics-charts';
import { Onboarding } from '@/components/onboarding';
import { MonthlySummary } from '@/components/monthly-summary';
import { CategoryRings } from '@/components/category-rings';
import { RecurringManager } from '@/components/recurring-manager';
import { VehicleTracker } from '@/components/fuel-tracker';
import { ReceiptWallet } from '@/components/receipt-wallet';
import { metaService } from '@/lib/recurring';
import { BiometricLock } from '@/components/biometric-lock';
import { SMSExpenseNudge } from '@/components/sms-expense-nudge';
import { PermissionGuard } from '@/components/permission-guard';

type Tab = 'dashboard' | 'expenses' | 'reimbursements' | 'vehicle' | 'analytics' | 'settings';

const NAV_ITEMS: { id: Tab; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'reimbursements', label: 'Reimburse', icon: Briefcase },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'analytics', label: 'Charts', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const LEFT_NAV  = NAV_ITEMS.slice(0, 2);   // Home, Expenses
const RIGHT_NAV = NAV_ITEMS.slice(2, 4);   // Reimburse, Vehicle
const MORE_NAV  = NAV_ITEMS.slice(4);      // Charts, Settings

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [expenseSubTab, setExpenseSubTab] = useState<'all' | 'wallet'>('all');
  const [dashboardTab, setDashboardTab] = useState<'expenses' | 'vehicle'>('expenses');
  const [initialFilter, setInitialFilter] = useState<'all' | 'personal' | 'reimbursable'>('all');
  const [onboarded, setOnboarded] = useState(true);
  const navRef = useRef<HTMLDivElement>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    setOnboarded(metaService.get().onboardingDone);
    audio.unlock();
    permissions.requestAll();
  }, []);

  useEffect(() => {
    const data = storageService.getExpenses();
    setExpenses(data);
    setIsLoading(false);
  }, []);

  const handleAddExpense = (expense: Expense) => {
    const updated = storageService.addExpense(expense);
    setExpenses(updated);
    toast.success('Expense added successfully');
    haptics.success();
  };

  const handleUpdateExpense = (expense: Expense) => {
    const updated = storageService.updateExpense(expense);
    setExpenses(updated);
    toast.success('Expense updated');
    haptics.success();
  };

  const handleDeleteExpense = (id: string) => {
    const updated = storageService.deleteExpense(id);
    setExpenses(updated);
    toast.success('Expense deleted');
    haptics.medium();
  };

  const handleDeleteAll = () => {
    storageService.saveExpenses([]);
    setExpenses([]);
    toast.success('All expenses cleared');
    haptics.medium();
  };

  const handleBatchDelete = (ids: string[]) => {
    const updated = storageService.batchDeleteExpenses(ids);
    setExpenses(updated);
    toast.success(`${ids.length} expenses deleted`);
    haptics.medium();
  };

  const handleBatchStatus = (ids: string[], status: ExpenseStatus) => {
    const updated = storageService.batchUpdateStatus(ids, status);
    setExpenses(updated);
    toast.success(`${ids.length} expenses marked as ${status}`);
    haptics.success();
  };

  // Stats calculation
  const totalAmount = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const pendingAmount = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursedAmount = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0), [expenses]);
  const personalAmount = useMemo(() => expenses.filter(e => !e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursableAmount = useMemo(() => expenses.filter(e => e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  
  const now = new Date();
  const thisMonthExp = useMemo(() => expenses.filter(e => isSameMonth(new Date(e.date), now)), [expenses]);
  const thisMonthTotal = useMemo(() => thisMonthExp.reduce((s, e) => s + e.amount, 0), [thisMonthExp]);
  
  const lastMonth = subMonths(now, 1);
  const lastMonthExp = useMemo(() => expenses.filter(e => isSameMonth(new Date(e.date), lastMonth)), [expenses]);
  const lastMonthTotal = useMemo(() => lastMonthExp.reduce((s, e) => s + e.amount, 0), [lastMonthExp]);
  
  const monthTrend = useMemo(() => {
    if (lastMonthTotal === 0) return 0;
    return ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
  }, [thisMonthTotal, lastMonthTotal]);

  const vehicleSummaries = useMemo(() => {
    const vList = mileageService.getVehicles();
    const fLogs = fuelService.getLogs();
    
    return vList.map(v => {
      const vLogs = fLogs.filter(l => l.vehicleId === v.id);
      const economies = vLogs.filter(l => l.economy).map(l => l.economy!);
      const avgEco = economies.length > 0 ? economies.reduce((s, e) => s + e, 0) / economies.length : 0;
      const latestLog = vLogs[0];
      const trend = latestLog?.economyTrend || 0;
      const totalDist = vLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
      const totalCost = vLogs.reduce((s, l) => s + l.totalCost, 0);

      return {
        ...v,
        avgEco,
        latestEco: latestLog?.economy || 0,
        trend,
        totalDist,
        totalCost,
        costPerKm: totalDist > 0 ? totalCost / totalDist : 0
      };
    }).sort((a, b) => b.totalDist - a.totalDist);
  }, [expenses]); 

  const vehicleStats = useMemo(() => {
    const fLogs = fuelService.getLogs();
    const totalDist = vehicleSummaries.reduce((s, v) => s + v.totalDist, 0);
    const totalCost = vehicleSummaries.reduce((s, v) => s + v.totalCost, 0);
    const overallEco = vehicleSummaries.reduce((s, v) => s + v.avgEco, 0) / Math.max(1, vehicleSummaries.filter(v => v.avgEco > 0).length);
    
    return {
      totalDistance: totalDist,
      totalCost: totalCost,
      overallEco: overallEco,
      costPerKm: totalDist > 0 ? totalCost / totalDist : 0
    };
  }, [vehicleSummaries]);
  const settings = settingsService.get();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background bg-aurora flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm text-muted-foreground">Loading your expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <BiometricLock enabled={!!settings.biometricLock}>
      <PermissionGuard>
        <SMSExpenseNudge onAdd={handleAddExpense} />
        <div className="min-h-screen bg-background bg-aurora">
        {!onboarded && <Onboarding onComplete={() => setOnboarded(true)} />}
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-60 flex-col glass border-r border-border/40 z-30">
          {/* Logo */}
          <div className="p-5 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
                <Receipt className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Reimburse</h1>
                <p className="text-[10px] text-muted-foreground">Expense Tracker</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.div 
                      layoutId="sidebar-pill"
                      className="absolute inset-0 bg-primary/10 border-l-4 border-primary z-0" 
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <Icon className="h-4 w-4 shrink-0 relative z-10" />
                  <span className="relative z-10">{item.label}</span>
                  {item.id === 'expenses' && (
                    <span className="ml-auto text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {expenses.filter(e => !e.isReimbursement).length}
                    </span>
                  )}
                  {item.id === 'reimbursements' && (
                    <span className="ml-auto text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      {expenses.filter(e => e.isReimbursement).length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom: theme toggle + add */}
          <div className="p-3 border-t border-border/30">
            <ExpenseForm onSubmit={handleAddExpense} />
          </div>
        </aside>

        {/* ── Main content ── */}
        <div className="sm:ml-60">
          {/* Scrollable content */}
          <main className="px-4 sm:px-8 py-6 sm:py-10 pb-32 sm:pb-12 max-w-5xl mx-auto min-h-screen">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
            
            {/* ── DASHBOARD TAB ── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-5 animate-fade-in">
                {/* KPIs Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Personal</p>
                    <p className="text-xl font-bold number-lg">{formatCompactCurrency(personalAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Claims</p>
                    <p className="text-xl font-bold number-lg">{formatCompactCurrency(reimbursableAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Pending</p>
                    <p className="text-xl font-bold number-lg">{formatCompactCurrency(pendingAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-success mb-1">Settled</p>
                    <p className="text-xl font-bold number-lg">{formatCompactCurrency(reimbursedAmount)}</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Distance</p>
                    <p className="text-xl font-bold number-lg">{mileageService.getLogs().reduce((sum, log) => sum + log.distance, 0).toFixed(0)} km</p>
                  </div>
                  <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Fuel</p>
                    <p className="text-xl font-bold number-lg">{fuelService.getLogs().reduce((s,l) => s + l.liters, 0).toFixed(0)} L</p>
                  </div>
                </div>

                <div className="flex bg-muted/40 p-1 rounded-xl w-full sm:w-fit mb-2">
                  <button onClick={() => setDashboardTab('expenses')} className={cn("flex-1 px-6 py-1.5 rounded-lg text-xs font-bold transition-all", dashboardTab === 'expenses' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Overview</button>
                  <button onClick={() => setDashboardTab('vehicle')} className={cn("flex-1 px-6 py-1.5 rounded-lg text-xs font-bold transition-all", dashboardTab === 'vehicle' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Vehicle</button>
                </div>

                {dashboardTab === 'vehicle' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                          <GaugeCircle className="h-3 w-3" /> Distance
                        </p>
                        <p className="text-xl font-bold number-lg">{vehicleStats.totalDistance.toLocaleString()} <span className="text-[10px] font-medium opacity-60">km</span></p>
                      </div>
                      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                          <Fuel className="h-3 w-3" /> Spend
                        </p>
                        <p className="text-xl font-bold number-lg">₹ {vehicleStats.totalCost.toLocaleString()}</p>
                      </div>
                      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                          <TrendingUp className="h-3 w-3 text-success" /> Avg. Eco
                        </p>
                        <p className="text-xl font-bold number-lg text-success">{vehicleStats.overallEco.toFixed(1)} <span className="text-[10px] font-medium opacity-60">km/l</span></p>
                      </div>
                      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                          <IndianRupee className="h-3 w-3 text-primary" /> Cost / KM
                        </p>
                        <p className="text-xl font-bold number-lg text-primary">₹ {vehicleStats.costPerKm.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/80 p-5">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-sm font-bold tracking-tight">Economy Trend</h3>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Kilometers per Liter</p>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center text-success">
                            <TrendingUp className="h-4 w-4" />
                          </div>
                        </div>
                        <VehicleEfficiencyChart logs={fuelService.getLogs()} vehicles={mileageService.getVehicles()} />
                      </div>

                      <div className="rounded-2xl border border-border/60 bg-card/80 p-5">
                        <div className="flex items-center justify-between mb-6">
                          <div>
                            <h3 className="text-sm font-bold tracking-tight">Fuel Expenditure</h3>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Last 10 Records</p>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <IndianRupee className="h-4 w-4" />
                          </div>
                        </div>
                        <FuelCostChart logs={fuelService.getLogs()} />
                        <div className="mt-6 pt-6 border-t border-border/30 space-y-3">
                           <div className="flex items-center justify-between">
                             <span className="text-xs text-muted-foreground">Most Efficient</span>
                             <span className="text-xs font-bold text-success">{Math.max(...fuelService.getLogs().map(l => l.economy || 0), 0).toFixed(1)} km/l</span>
                           </div>
                           <div className="flex items-center justify-between">
                             <span className="text-xs text-muted-foreground">Last Recorded</span>
                             <span className="text-xs font-bold">₹ {fuelService.getLogs()[0]?.totalCost.toLocaleString() || '0'}</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vehicleSummaries.map(v => (
                        <div key={v.id} className="rounded-2xl border border-border/40 bg-card/60 p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                {v.icon === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                              </div>
                              <p className="font-bold text-sm">{v.name}</p>
                            </div>
                            <div className={cn(
                              "text-[10px] font-black px-2 py-0.5 rounded-full border",
                              v.trend >= 0 ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"
                            )}>
                              {v.trend >= 0 ? '+' : ''}{v.trend.toFixed(1)}%
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold">Avg. Economy</p>
                              <p className="text-sm font-black">{v.avgEco.toFixed(1)} <span className="text-[10px] font-medium opacity-60">km/l</span></p>
                            </div>
                            <div>
                              <p className="text-[9px] text-muted-foreground uppercase font-bold">Cost / KM</p>
                              <p className="text-sm font-black text-primary">₹ {v.costPerKm.toFixed(1)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => setActiveTab('vehicle')}
                      className="w-full py-4 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/30 transition-all flex items-center justify-center gap-2 group"
                    >
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Open Full Garage Manager</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                    </button>
                  </div>
                )}

                {dashboardTab === 'expenses' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <MonthlySummary expenses={expenses} onViewAll={() => setActiveTab('expenses')} />
                        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                          <CategoryRings expenses={expenses} />
                        </div>
                        <div className="rounded-2xl border border-border/40 bg-card/60 p-4 lg:col-span-1">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold tracking-tight">Fleet Efficiency</h3>
                            <Car className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="space-y-4">
                            {vehicleSummaries.map(v => (
                              <div key={v.id} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {v.icon === 'car' ? <Car className="h-3 w-3 text-primary" /> : <Bike className="h-3 w-3 text-primary" />}
                                    <span className="text-xs font-bold">{v.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-black">{v.avgEco.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">km/l</span></span>
                                    {v.trend !== 0 && (
                                      <div className={cn(
                                        "flex items-center text-[10px] font-bold",
                                        v.trend > 0 ? "text-success" : "text-destructive"
                                      )}>
                                        {v.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingUp className="h-3 w-3 rotate-180" />}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (v.avgEco / 20) * 100)}%` }}
                                    className={cn("h-full", v.trend >= 0 ? "bg-primary" : "bg-warning")} 
                                  />
                                </div>
                              </div>
                            ))}
                            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-border/30">
                              <div className="p-2 rounded-xl bg-muted/30">
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">Avg. Cost</p>
                                <p className="text-sm font-bold">₹ {vehicleStats.costPerKm.toFixed(1)}/km</p>
                              </div>
                              <div className="p-2 rounded-xl bg-muted/30 text-right">
                                <p className="text-[9px] text-muted-foreground uppercase font-bold">Total Dist</p>
                                <p className="text-sm font-bold">{vehicleStats.totalDistance.toLocaleString()} km</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                  {/* Chart + Budget row */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  {/* Spending trend */}
                  <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-card/80 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Spending Trend</h3>
                      <span className="text-[11px] text-muted-foreground">Last 6 months</span>
                    </div>
                    {expenses.length > 0 ? (
                      <SpendingTrendChart expenses={expenses} />
                    ) : (
                      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                        Add expenses to see your trend
                      </div>
                    )}
                  </div>

                  {/* Budget tracker */}
                  <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/80 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Budget Goals</h3>
                      <button
                        onClick={() => setActiveTab('settings')}
                        className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                      >
                        Manage <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <BudgetTracker
                      expenses={expenses}
                      budgets={settings.budgets || []}
                      onManage={() => setActiveTab('settings')}
                    />
                  </div>
                </div>

                {/* Recent expenses */}
                {expenses.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold">Recent Expenses</h3>
                      <button
                        onClick={() => setActiveTab('expenses')}
                        className="text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                      >
                        All Expenses <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                    <ExpenseList
                      expenses={expenses.slice(0, 5)}
                      showTypeTabs={false}
                      onUpdateExpense={handleUpdateExpense}
                      onDeleteExpense={handleDeleteExpense}
                      onDeleteAll={handleDeleteAll}
                      onBatchDelete={handleBatchDelete}
                      onBatchStatus={handleBatchStatus}
                    />
                  </div>
                )}
                  </>
                )}
              </div>
            )}

                {/* ── EXPENSES TAB ── */}
            {/* ── PERSONAL EXPENSES TAB ── */}
            {activeTab === 'expenses' && (
              <div className="animate-fade-in space-y-5">
                <div className="mb-6">
                  <h1 className="text-3xl font-black tracking-tight capitalize">
                    {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">Manage your personal daily spending</p>
                </div>
                <div className="flex bg-muted/40 p-1 rounded-xl w-full sm:w-fit">
                  <button onClick={() => setExpenseSubTab('all')} className={cn("flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", expenseSubTab === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Log</button>
                  <button onClick={() => setExpenseSubTab('wallet')} className={cn("flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", expenseSubTab === 'wallet' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Wallet</button>
                </div>

                {expenseSubTab === 'all' && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
                      <RecurringManager onAddExpense={handleAddExpense} />
                    </div>
                    <ExpenseList
                      expenses={expenses}
                      initialFilterType="personal"
                      showTypeTabs={false}
                      title="Personal Expenses"
                      onUpdateExpense={handleUpdateExpense}
                      onDeleteExpense={handleDeleteExpense}
                      onDeleteAll={handleDeleteAll}
                      onBatchDelete={handleBatchDelete}
                      onBatchStatus={handleBatchStatus}
                    />
                  </div>
                )}

                {expenseSubTab === 'wallet' && (
                  <div className="rounded-2xl border border-border/60 bg-card/40 p-4 animate-fade-in">
                    <ReceiptWallet expenses={expenses} onAddExpense={handleAddExpense} />
                  </div>
                )}
              </div>
            )}

            {/* ── REIMBURSEMENTS TAB ── */}
            {activeTab === 'reimbursements' && (
              <div className="animate-fade-in space-y-5">
                <div className="mb-6">
                  <h1 className="text-3xl font-black tracking-tight capitalize">
                    {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">Track work expenses and pending claims</p>
                </div>
                <div className="flex bg-muted/40 p-1 rounded-xl w-full sm:w-fit">
                  <button onClick={() => setExpenseSubTab('all')} className={cn("flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", expenseSubTab === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Log</button>
                  <button onClick={() => setExpenseSubTab('wallet')} className={cn("flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", expenseSubTab === 'wallet' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Wallet</button>
                </div>

                {expenseSubTab === 'all' && (
                  <div className="space-y-6 animate-fade-in">
                    <ExpenseList
                      expenses={expenses}
                      initialFilterType="reimbursable"
                      showTypeTabs={false}
                      title="Reimbursements"
                      onUpdateExpense={handleUpdateExpense}
                      onDeleteExpense={handleDeleteExpense}
                      onDeleteAll={handleDeleteAll}
                      onBatchDelete={handleBatchDelete}
                      onBatchStatus={handleBatchStatus}
                    />
                  </div>
                )}

                {expenseSubTab === 'wallet' && (
                  <div className="rounded-2xl border border-border/60 bg-card/40 p-4 animate-fade-in">
                    <ReceiptWallet expenses={expenses} onAddExpense={handleAddExpense} />
                  </div>
                )}
              </div>
            )}

            {/* ── VEHICLE TAB ── */}
            {activeTab === 'vehicle' && (
              <div className="animate-fade-in space-y-5">
                <div className="mb-6">
                  <h1 className="text-3xl font-black tracking-tight capitalize">
                    {NAV_ITEMS.find(n => n.id === activeTab)?.label}
                  </h1>
                  <p className="text-xs text-muted-foreground mt-1">Mileage logs and fuel efficiency analysis</p>
                </div>
                <VehicleTracker />
              </div>
            )}

            {/* Vehicle tab moved to dashboard */}
            {/* ── ANALYTICS TAB ── */}
            {activeTab === 'analytics' && (
              <div className="space-y-5 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs text-muted-foreground">Visual breakdown of your spending patterns</p>
                </div>

                {expenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                    <p className="font-semibold">No data yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Add expenses to see your analytics</p>
                    <button
                      onClick={() => setActiveTab('expenses')}
                      className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      Go to Expenses <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Summary row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Personal', value: personalAmount, color: 'text-indigo-500' },
                        { label: 'Reimbursable', value: reimbursableAmount, color: 'text-primary' },
                        { label: 'Pending', value: pendingAmount, color: 'text-warning' },
                        { label: 'Settled', value: reimbursedAmount, color: 'text-success' },
                      ].map(s => (
                        <div key={s.label} className="rounded-xl border border-border/60 bg-card/80 p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</p>
                          <p className={cn("text-xl font-bold number-lg mt-1", s.color)}>{formatCompactCurrency(s.value)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                      {/* Monthly stacked bar */}
                      <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-card/80 p-4">
                        <h3 className="text-sm font-semibold mb-4">Monthly Breakdown</h3>
                        <MonthlyBarChart expenses={expenses} />
                      </div>
                      {/* Category pie */}
                      <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/80 p-4">
                        <h3 className="text-sm font-semibold mb-4">By Category</h3>
                        <CategoryBreakdownChart expenses={expenses} />
                      </div>
                    </div>

                    {/* Spending trend full width */}
                    <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
                      <h3 className="text-sm font-semibold mb-4">6-Month Spending Trend</h3>
                      <SpendingTrendChart expenses={expenses} />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── SETTINGS TAB ── */}
            {activeTab === 'settings' && (
                <SettingsPage theme={theme} onThemeToggle={toggleTheme} />
              )}
            </motion.div>
            </AnimatePresence>
          </main>

          {/* Footer (desktop only) */}
          <footer className="hidden sm:block border-t border-border/30 px-6 py-4 text-center text-xs text-muted-foreground">
            Reimburse · Data stored locally on your device · Built with ♥
          </footer>
        </div>

        {/* ── High-Density Pro Navigation (mobile) ── */}
        <nav className="sm:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-md h-20">
          <div className="relative h-full w-full bg-card/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex items-center">
            
            <div 
              ref={navRef}
              className="w-full flex items-center justify-between px-4 overflow-x-auto no-scrollbar snap-x snap-mandatory"
            >
              {[
                ...LEFT_NAV,
                { id: 'add', label: 'Add', icon: Plus, isFab: true },
                ...RIGHT_NAV,
                ...MORE_NAV
              ].map((item, idx) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                
                if ('isFab' in item) {
                  return (
                    <div key="fab-item" className="flex-shrink-0 w-16 flex justify-center snap-center mx-1">
                      <ExpenseForm
                        onSubmit={handleAddExpense}
                        trigger={
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="h-14 w-14 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center border-4 border-background"
                          >
                            <Plus className="h-7 w-7 text-white" strokeWidth={3} />
                          </motion.button>
                        }
                      />
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as Tab)}
                    className={cn(
                      "flex-shrink-0 w-14 flex flex-col items-center justify-center gap-1 transition-all duration-300 snap-center mx-0.5",
                      active ? "text-primary" : "text-muted-foreground/50"
                    )}
                  >
                    <div className={cn(
                      "p-2.5 rounded-xl transition-all duration-300",
                      active ? "bg-primary/10 scale-110" : "bg-transparent"
                    )}>
                      <Icon className="h-5.5 w-5.5" />
                    </div>
                    {active && (
                      <span className="text-[8px] font-black tracking-tighter uppercase leading-none">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      </div>
      </PermissionGuard>
    </BiometricLock>
  );
};

export default Index;
