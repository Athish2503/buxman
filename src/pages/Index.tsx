import { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Receipt, BarChart3, Settings,
  Wallet, TrendingUp, Clock, CheckCircle2, Moon, Sun,
  Zap, ArrowRight, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, subMonths, isSameMonth } from 'date-fns';

import { Expense, ExpenseStatus } from '@/types/expense';
import { storageService } from '@/lib/storage';
import { settingsService } from '@/lib/settings';
import { formatCurrency, formatCompactCurrency, cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';

import { ExpenseForm } from '@/components/expense-form';
import { ExpenseList } from '@/components/expense-list';
import { StatCard } from '@/components/stat-card';
import { BudgetTracker } from '@/components/budget-tracker';
import { SettingsPage } from '@/components/settings-page';
import { SpendingTrendChart, CategoryBreakdownChart, MonthlyBarChart } from '@/components/analytics-charts';

type Tab = 'dashboard' | 'expenses' | 'analytics' | 'settings';

const NAV_ITEMS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    try {
      setExpenses(storageService.getExpenses());
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reload = () => setExpenses(storageService.getExpenses());

  const handleAddExpense = (expense: Expense) => {
    try { storageService.addExpense(expense); reload(); toast.success('Expense added'); }
    catch { toast.error('Failed to add expense'); }
  };

  const handleUpdateExpense = (expense: Expense) => {
    try { storageService.updateExpense(expense.id, expense); reload(); toast.success('Expense updated'); }
    catch { toast.error('Failed to update expense'); }
  };

  const handleDeleteExpense = (id: string) => {
    try { storageService.deleteExpense(id); reload(); toast.success('Expense deleted'); }
    catch { toast.error('Failed to delete expense'); }
  };

  const handleDeleteAll = () => {
    try { storageService.clearAll(); setExpenses([]); toast.success('All expenses cleared'); }
    catch { toast.error('Failed to clear expenses'); }
  };

  const handleBatchDelete = (ids: string[]) => {
    try { storageService.batchDelete(ids); reload(); toast.success(`${ids.length} expenses deleted`); }
    catch { toast.error('Failed to delete expenses'); }
  };

  const handleBatchStatus = (ids: string[], status: ExpenseStatus) => {
    try { storageService.batchUpdateStatus(ids, status); reload(); toast.success(`Updated ${ids.length} expenses`); }
    catch { toast.error('Failed to update expenses'); }
  };

  // Computed summaries
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingAmount = expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);
  const reimbursedAmount = expenses.filter(e => e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0);
  const approvedCount = expenses.filter(e => e.status === 'approved').length;

  const now = new Date();
  const thisMonthExp = expenses.filter(e => isSameMonth(new Date(e.date), now));
  const lastMonthExp = expenses.filter(e => isSameMonth(new Date(e.date), subMonths(now, 1)));
  const thisMonthTotal = thisMonthExp.reduce((s, e) => s + e.amount, 0);
  const lastMonthTotal = lastMonthExp.reduce((s, e) => s + e.amount, 0);
  const monthTrend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0;

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
    <div className="min-h-screen bg-background bg-aurora">
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
                {active && <div className="nav-active-indicator" />}
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
                {item.id === 'expenses' && expenses.length > 0 && (
                  <span className="ml-auto text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                    {expenses.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom: theme toggle + add */}
        <div className="p-3 border-t border-border/30 space-y-2">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <ExpenseForm onSubmit={handleAddExpense} />
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="sm:ml-60">
        {/* Top bar (mobile) */}
        <header className="sm:hidden sticky top-0 z-20 glass border-b border-border/40">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Receipt className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm tracking-tight">Reimburse</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="h-8 w-8 rounded-xl border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <ExpenseForm onSubmit={handleAddExpense} />
            </div>
          </div>
        </header>

        {/* Page header (desktop) */}
        <header className="hidden sm:flex sticky top-0 z-20 glass border-b border-border/40 items-center justify-between px-6 h-14">
          <div>
            <h2 className="text-sm font-bold capitalize">
              {NAV_ITEMS.find(n => n.id === activeTab)?.label}
            </h2>
            <p className="text-[11px] text-muted-foreground">{format(now, 'EEEE, dd MMMM yyyy')}</p>
          </div>
          <div className="flex items-center gap-3">
            {expenses.length > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Pending</p>
                <p className="text-sm font-bold text-warning">{formatCompactCurrency(pendingAmount)}</p>
              </div>
            )}
          </div>
        </header>

        {/* Scrollable content */}
        <main className="px-4 sm:px-6 py-5 sm:py-6 pb-24 sm:pb-8 max-w-5xl mx-auto">

          {/* ── DASHBOARD TAB ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5 animate-fade-in">
              {/* Welcome / hero */}
              <div className="rounded-2xl border border-border/40 bg-card/60 p-5 overflow-hidden relative">
                <div className="absolute inset-0 bg-aurora opacity-30 pointer-events-none" />
                <div className="relative">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-primary/15 text-primary px-2.5 py-1 rounded-full mb-3">
                    <Zap className="h-3 w-3" />
                    Premium Expense Tracker
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight mb-1">
                    Track expenses,{' '}
                    <span className="text-gradient">get paid faster.</span>
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Invoice-grade PDF exports, smart analytics, and budget tracking — all stored privately on your device.
                  </p>
                  {expenses.length === 0 && (
                    <button
                      onClick={() => setActiveTab('expenses')}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:gap-2.5 transition-all"
                    >
                      Add your first expense <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Stats grid — 2 cols on mobile, 4 on desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard
                  label="Total Expenses"
                  value={formatCompactCurrency(totalAmount)}
                  subLabel={`${expenses.length} entries`}
                  icon={Wallet}
                  gradient="bg-primary/15"
                  iconColor="text-primary"
                  delay={0}
                />
                <StatCard
                  label="Pending"
                  value={formatCompactCurrency(pendingAmount)}
                  subLabel={`${expenses.filter(e => e.status === 'pending').length} items`}
                  icon={Clock}
                  gradient="bg-warning/15"
                  iconColor="text-warning"
                  delay={60}
                />
                <StatCard
                  label="Reimbursed"
                  value={formatCompactCurrency(reimbursedAmount)}
                  subLabel={`${expenses.filter(e => e.status === 'reimbursed').length} settled`}
                  icon={CheckCircle2}
                  gradient="bg-success/15"
                  iconColor="text-success"
                  delay={120}
                />
                <StatCard
                  label="This Month"
                  value={formatCompactCurrency(thisMonthTotal)}
                  subLabel={`${thisMonthExp.length} this month`}
                  icon={TrendingUp}
                  gradient="bg-secondary/15"
                  iconColor="text-secondary"
                  trend={lastMonthTotal > 0 ? { value: monthTrend, label: 'vs last month' } : undefined}
                  delay={180}
                />
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
                      className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                    >
                      View all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <ExpenseList
                    expenses={expenses.slice(0, 5)}
                    onUpdateExpense={handleUpdateExpense}
                    onDeleteExpense={handleDeleteExpense}
                    onDeleteAll={handleDeleteAll}
                    onBatchDelete={handleBatchDelete}
                    onBatchStatus={handleBatchStatus}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── EXPENSES TAB ── */}
          {activeTab === 'expenses' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-lg">All Expenses</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{expenses.length} total · {formatCurrency(totalAmount)}</p>
                </div>
                <div className="sm:hidden">
                  <ExpenseForm onSubmit={handleAddExpense} />
                </div>
              </div>
              <ExpenseList
                expenses={expenses}
                onUpdateExpense={handleUpdateExpense}
                onDeleteExpense={handleDeleteExpense}
                onDeleteAll={handleDeleteAll}
                onBatchDelete={handleBatchDelete}
                onBatchStatus={handleBatchStatus}
              />
            </div>
          )}

          {/* ── ANALYTICS TAB ── */}
          {activeTab === 'analytics' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="font-bold text-lg">Analytics</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Visual breakdown of your spending patterns</p>
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
                      { label: 'Total', value: totalAmount, color: 'text-foreground' },
                      { label: 'Pending', value: pendingAmount, color: 'text-warning' },
                      { label: 'Approved', value: expenses.filter(e=>e.status==='approved').reduce((s,e)=>s+e.amount,0), color: 'text-success' },
                      { label: 'Reimbursed', value: reimbursedAmount, color: 'text-primary' },
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
            <div className="animate-fade-in">
              <div className="mb-5">
                <h2 className="font-bold text-lg">Settings</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Manage your invoice details and preferences</p>
              </div>
              <SettingsPage theme={theme} onThemeToggle={toggleTheme} />
            </div>
          )}
        </main>

        {/* Footer (desktop only) */}
        <footer className="hidden sm:block border-t border-border/30 px-6 py-4 text-center text-xs text-muted-foreground">
          Reimburse · Data stored locally on your device · Built with ♥
        </footer>
      </div>

      {/* ── Bottom Nav (mobile) ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 glass border-t border-border/40">
        <div className="flex items-stretch h-16 safe-area-bottom">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {active && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-gradient-primary rounded-full" />
                )}
                <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Index;
