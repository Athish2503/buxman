import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Receipt, BarChart3, Settings,
  Car, Briefcase, Utensils, Plane
} from 'lucide-react';
import { toast } from 'sonner';

import { Expense, ExpenseStatus } from '@/types/expense';
import { storageService } from '@/lib/storage';
import { settingsService } from '@/lib/settings';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { mileageService, fuelService } from '@/lib/modules-storage';
import { audio } from '@/lib/audio';
import { permissions } from '@/lib/permissions';

import { ExpenseForm } from '@/components/expense-form';
import { SettingsPage } from '@/components/settings-page';
import { Onboarding } from '@/components/onboarding';
import { metaService } from '@/lib/recurring';
import { BiometricLock } from '@/components/biometric-lock';
import { SMSExpenseNudge } from '@/components/sms-expense-nudge';
import { PermissionGuard } from '@/components/permission-guard';
import { FloatingAddMenu } from '@/components/floating-add-menu';
import { DiningDashboard } from '@/components/food/DiningDashboard';

// Import sub-modules
import { DashboardModule } from '@/components/dashboard/DashboardModule';
import { ExpensesModule } from '@/components/dashboard/ExpensesModule';
import { ReimbursementsModule } from '@/components/dashboard/ReimbursementsModule';
import { GarageModule } from '@/components/dashboard/GarageModule';
import { AnalyticsModule } from '@/components/dashboard/AnalyticsModule';
import { TripsModule } from '@/components/dashboard/TripsModule';

type Tab = 'dashboard' | 'expenses' | 'food' | 'reimbursements' | 'trips' | 'vehicle' | 'analytics' | 'settings';

const NAV_ITEMS: { id: Tab; label: string; icon: any }[] = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'food', label: 'Dining', icon: Utensils },
  { id: 'reimbursements', label: 'Claims', icon: Briefcase },
  { id: 'trips', label: 'Trips', icon: Plane },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'analytics', label: 'Charts', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const LEFT_NAV  = NAV_ITEMS.slice(0, 2);   // Home, Expenses
const RIGHT_NAV = NAV_ITEMS.slice(2, 4);   // Dining, Reimburse
const MORE_NAV  = NAV_ITEMS.slice(4);      // Vehicle, Analytics, Settings

const Index = () => {
  const [expenses, setExpenses] = useState(() => storageService.getExpenses());
  const [logs, setLogs] = useState(() => fuelService.getLogs());
  const [vehicles, setVehicles] = useState(() => mileageService.getVehicles());
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [onboarded, setOnboarded] = useState(true);
  const navRef = useRef<HTMLDivElement>(null);
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    setOnboarded(metaService.get().onboardingDone);
    audio.unlock();
    permissions.requestAll();
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

  const settings = settingsService.get();

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardModule 
            expenses={expenses}
            onNavigate={setActiveTab}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onDeleteAll={handleDeleteAll}
            onBatchDelete={handleBatchDelete}
            onBatchStatus={handleBatchStatus}
            settings={settings}
          />
        );
      case 'expenses':
        return (
          <ExpensesModule 
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onDeleteAll={handleDeleteAll}
            onBatchDelete={handleBatchDelete}
            onBatchStatus={handleBatchStatus}
          />
        );
      case 'food':
        return <DiningDashboard />;
      case 'reimbursements':
        return (
          <ReimbursementsModule 
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onDeleteAll={handleDeleteAll}
            onBatchDelete={handleBatchDelete}
            onBatchStatus={handleBatchStatus}
          />
        );
      case 'trips':
        return <TripsModule />;
      case 'vehicle':
        return (
          <GarageModule 
            vehicles={vehicles}
            logs={logs}
            onRefresh={() => {
              setLogs(fuelService.getLogs());
              setVehicles(mileageService.getVehicles());
            }}
          />
        );
      case 'analytics':
        return <AnalyticsModule expenses={expenses} onNavigate={setActiveTab} />;
      case 'settings':
        return <SettingsPage theme={theme} onThemeToggle={toggleTheme} />;
      default:
        return null;
    }
  };

  return (
    <BiometricLock enabled={!!settings.biometricLock}>
      <PermissionGuard>
        <SMSExpenseNudge onAdd={handleAddExpense} />
        <div className="min-h-screen bg-background bg-aurora">
          {!onboarded && <Onboarding onComplete={() => setOnboarded(true)} />}
          
          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-60 flex-col glass border-r border-border/40 z-30">
            <div className="p-5 border-b border-border/30">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-card border border-border/40 flex items-center justify-center shadow-glow shrink-0 overflow-hidden">
                  <img src="/logo.png" alt="Buxman" className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight">Buxman</h1>
                  <p className="text-[10px] text-muted-foreground">Expense Tracker</p>
                </div>
              </div>
            </div>

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
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border/30">
              <ExpenseForm onSubmit={handleAddExpense} />
            </div>
          </aside>

          {/* ── Main content ── */}
          <div className="sm:ml-60">
            <main className="px-4 sm:px-8 py-6 sm:py-10 pb-32 sm:pb-12 max-w-5xl mx-auto min-h-screen">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
                  animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, scale: 1.02, filter: 'blur(10px)' }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  {renderActiveTab()}
                </motion.div>
              </AnimatePresence>
            </main>

            <footer className="hidden sm:block border-t border-border/30 px-6 py-4 text-center text-xs text-muted-foreground">
              Buxman · Data stored locally on your device · Built with ♥
            </footer>
          </div>

          {/* ── High-Density Pro Navigation (mobile) ── */}
          <nav className="sm:hidden fixed bottom-[max(2rem,env(safe-area-inset-bottom,2rem))] left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-md h-20">
            <div className="relative h-full w-full bg-card/80 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl flex items-center overflow-visible">
              <div 
                ref={navRef}
                className={cn(
                  "absolute inset-0 flex items-center overflow-x-auto no-scrollbar snap-x snap-mandatory transition-all duration-500 overflow-y-visible px-4",
                  isFabOpen ? "blur-md opacity-40 scale-[0.98] pointer-events-none" : "blur-0 opacity-100 scale-100"
                )}
              >
                {[
                  ...LEFT_NAV,
                  { id: 'add', isFab: true },
                  ...RIGHT_NAV,
                  ...MORE_NAV
                ].map((item: any) => {
                  if ('isFab' in item) {
                    return (
                      <div key="fab-item" className="flex-shrink-0 w-[20%] flex justify-center items-center snap-center relative overflow-visible">
                        <FloatingAddMenu 
                          onAddExpense={handleAddExpense} 
                          onFuelSuccess={() => setLogs(fuelService.getLogs())}
                          onOpenChange={setIsFabOpen}
                        />
                      </div>
                    );
                  }

                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id as Tab)}
                      className={cn(
                        "flex-shrink-0 w-[20%] flex flex-col items-center justify-center gap-1 transition-all duration-300 snap-center",
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
