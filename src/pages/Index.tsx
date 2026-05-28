import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Receipt, BarChart3, Settings,
  Car, Briefcase, Utensils, Plane, Terminal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { BiometricLock } from '@/components/biometric-lock';
import { SMSExpenseNudge } from '@/components/sms-expense-nudge';
import { PermissionGuard } from '@/components/permission-guard';
import { FloatingAddMenu } from '@/components/floating-add-menu';
import { PendingTransactionsModal } from '@/components/pending-transactions-modal';
import { DiningDashboard } from '@/components/food';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from '@/lib/utils';

import {
  DashboardModule,
  ExpensesModule,
  ReimbursementsModule,
  GarageModule,
  AnalyticsModule,
  TripsModule,
} from '@/components/dashboard';
import { Tab, NAV_ITEMS_CONFIG } from '@/lib/nav-config';


// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 10, filter: 'blur(8px)' },
  animate: { opacity: 1, y: 0,  filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -6, filter: 'blur(4px)'  },
};

const Index = () => {
  const [expenses, setExpenses]     = useState(() => storageService.getExpenses());
  const [logs, setLogs]             = useState(() => fuelService.getLogs());
  const [vehicles, setVehicles]     = useState(() => mileageService.getVehicles());
  const [isFabOpen, setIsFabOpen]   = useState(false);
  const [activeTab, setActiveTab]   = useState<Tab>('dashboard');
  const { theme, toggle: toggleTheme } = useTheme();
  const [navOrder, setNavOrder] = useState<Tab[]>(() => {
    const settings = settingsService.get();
    return (settings.navOrder as Tab[]) || (Object.keys(NAV_ITEMS_CONFIG) as Tab[]);
  });
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  useEffect(() => {
    audio.unlock();
    
    const handleSettingsUpdate = () => {
      const settings = settingsService.get();
      if (settings.navOrder) setNavOrder(settings.navOrder as Tab[]);
    };
    const handleExpensesUpdate = () => {
      setExpenses(storageService.getExpenses());
    };
    window.addEventListener('settings-updated', handleSettingsUpdate);
    window.addEventListener('expenses-updated', handleExpensesUpdate);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
      window.removeEventListener('expenses-updated', handleExpensesUpdate);
    };
  }, []);

  const routerNavigate = useNavigate();
  const [tapCount, setTapCount] = useState(0);
  const tapTimer = useRef<any>(null);

  const handleLogoTap = () => {
    setTapCount(prev => prev + 1);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    
    if (tapCount + 1 >= 3) {
      haptics.success();
      routerNavigate('/diagnostics');
      setTapCount(0);
    } else {
      tapTimer.current = setTimeout(() => setTapCount(0), 1000);
    }
  };

  const navigate = (tab: Tab | 'diagnostics') => {
    haptics.selection();
    if (tab === 'diagnostics') {
      routerNavigate('/diagnostics');
      return;
    }
    setActiveTab(tab as Tab);
  };

  const handleAddExpense = (expense: Expense) => {
    const updated = storageService.addExpense(expense);
    setExpenses(updated);
    toast.success('Expense added');
    haptics.success();
  };
  const handleUpdateExpense = (expense: Expense) => {
    const updated = storageService.updateExpense(expense);
    setExpenses(updated);
    toast.success('Updated');
    haptics.success();
  };
  const handleDeleteExpense = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (exp) {
      setExpenseToDelete(exp);
    }
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const updated = storageService.deleteExpense(expenseToDelete.id);
    setExpenses(updated);
    setExpenseToDelete(null);
    toast.success('Deleted');
    haptics.medium();
  };
  const handleDeleteAll = () => {
    storageService.saveExpenses([]);
    setExpenses([]);
    toast.success('All cleared');
    haptics.medium();
  };
  const handleBatchDelete = (ids: string[]) => {
    const updated = storageService.batchDeleteExpenses(ids);
    setExpenses(updated);
    toast.success(`${ids.length} deleted`);
    haptics.medium();
  };
  const handleBatchStatus = (ids: string[], status: ExpenseStatus) => {
    const updated = storageService.batchUpdateStatus(ids, status);
    setExpenses(updated);
    toast.success(`Marked ${status}`);
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
      case 'food':          return <DiningDashboard />;
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
      case 'trips':    return <TripsModule />;
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
      case 'analytics': return <AnalyticsModule expenses={expenses} onNavigate={setActiveTab} />;
      case 'settings':  return <SettingsPage theme={theme} onThemeToggle={toggleTheme} />;
      default:          return null;
    }
  };

  const navItems = navOrder.map(id => NAV_ITEMS_CONFIG[id]).filter(Boolean);
  const leftNav = navItems.slice(0, 2);
  const rightNav = navItems.slice(2, 4);
  const moreNav = [...navItems.slice(4)];

  return (
    <BiometricLock enabled={!!settings.biometricLock}>
      <PermissionGuard>
        <SMSExpenseNudge onAdd={handleAddExpense} />

        <div className="min-h-dvh bg-background bg-aurora">

          {/* ── Desktop Sidebar ── */}
          <aside className="hidden sm:flex fixed left-0 top-0 bottom-0 w-60 flex-col glass border-r border-border/30 z-30">
            <div className="p-5 border-b border-border/20">
              <div className="flex items-center gap-3 cursor-pointer select-none" onClick={handleLogoTap}>
                <div className="h-9 w-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow shrink-0 overflow-hidden">
                  <img src="/logo.png" alt="Buxman" className="h-6 w-6 object-contain" />
                </div>
                <div>
                  <h1 className="text-sm font-display font-bold tracking-tight">Buxman</h1>
                  <p className="text-[10px] text-muted-foreground">Smart Expense Hub</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 p-3 space-y-0.5">
              {navItems.map(item => {
                const Icon  = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={cn(
                      'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 overflow-hidden',
                      active
                        ? 'bg-primary/12 text-primary'
                        : 'text-muted-foreground hover:bg-surface-2/80 hover:text-foreground'
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-pill"
                        className="absolute inset-0 rounded-xl bg-primary/8 border-l-[3px] border-primary"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.55 }}
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0 relative z-10" />
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border/20">
              <ExpenseForm onSubmit={handleAddExpense} />
            </div>
          </aside>

          {/* ── Main Content ── */}
          <div className="sm:ml-60">
            <main className="px-4 sm:px-8 py-5 sm:py-10 pb-nav sm:pb-12 max-w-5xl mx-auto min-h-dvh">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
                >
                  {renderActiveTab()}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>

          {/* ══════════════════════════════════════════
              MOBILE BOTTOM NAV — Premium Pill
              ══════════════════════════════════════════ */}
          <nav
            className="sm:hidden fixed z-40"
            style={{
              bottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100vw - 24px)',
              maxWidth: '420px',
            }}
          >
            <div
              className={cn(
                'mobile-nav-bar relative h-[68px] flex items-center transition-all duration-300',
                isFabOpen && 'opacity-30 scale-[0.97] pointer-events-none blur-sm'
              )}
            >
              {/* Left Nav Items */}
              {leftNav.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  onClick={() => navigate(item.id)}
                />
              ))}

              {/* FAB Center Slot */}
              <div className="flex-1 flex justify-center items-center">
                <FloatingAddMenu
                  onAddExpense={handleAddExpense}
                  onFuelSuccess={() => setLogs(fuelService.getLogs())}
                  onOpenChange={setIsFabOpen}
                />
              </div>

              {/* Right Nav Items */}
              {rightNav.map(item => (
                <NavItem
                  key={item.id}
                  item={item}
                  active={activeTab === item.id}
                  onClick={() => navigate(item.id)}
                />
              ))}

              {/* More overflow — swipe hint if needed */}
              <MoreNavButton
                items={moreNav}
                activeTab={activeTab}
                onNavigate={navigate}
              />
            </div>
          </nav>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
            <AlertDialogContent className="rounded-3xl border-white/10 glass max-w-[90vw] sm:max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">
                  Delete "{expenseToDelete?.vendor || 'Expense'}"?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Are you sure you want to remove this {formatCurrency(expenseToDelete?.amount || 0)} expense? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={confirmDeleteExpense}
                  className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white border-none"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Real-time Native Engine Pending Capture Modal */}
          <PendingTransactionsModal onAddExpense={handleAddExpense} />
        </div>
      </PermissionGuard>
    </BiometricLock>
  );
};

/* ── Nav Item Component ── */
function NavItem({
  item, active, onClick
}: { item: { id: Tab; label: string; icon: any }; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative',
        'transition-all duration-200 press-scale'
      )}
      aria-label={item.label}
    >
      {/* Active pip */}
      {active && (
        <motion.div
          layoutId="nav-pip"
          className="absolute top-0 left-0 right-0 mx-auto w-6 h-[3px] bg-gradient-brand rounded-full"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <div className={cn(
        'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
        active ? 'bg-primary/14' : 'bg-transparent'
      )}>
        <Icon
          className={cn(
            'h-5 w-5 transition-all duration-200',
            active ? 'text-primary' : 'text-muted-foreground/60'
          )}
          strokeWidth={active ? 2.2 : 1.8}
        />
      </div>
      <span className={cn(
        'text-[9px] font-bold tracking-wider uppercase leading-none transition-all duration-200',
        active ? 'text-primary opacity-100' : 'text-muted-foreground/50 opacity-0 scale-75'
      )}>
        {item.label}
      </span>
    </button>
  );
}

/* ── More Nav (overflow drawer button) ── */
function MoreNavButton({
  items, activeTab, onNavigate
}: { items: { id: Tab | 'diagnostics'; label: string; icon: any }[]; activeTab: Tab; onNavigate: (t: Tab | 'diagnostics') => void }) {
  const [open, setOpen] = useState(false);
  const hasActive = items.some(i => i.id === activeTab);

  return (
    <>
      <button
        onClick={() => { haptics.selection(); setOpen(o => !o); }}
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-0.5 h-full relative press-scale'
        )}
        aria-label="More"
      >
        {hasActive && (
          <motion.div
            layoutId="nav-pip"
            className="absolute top-0 left-0 right-0 mx-auto w-6 h-[3px] bg-gradient-brand rounded-full"
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}
        <div className={cn(
          'flex flex-col items-center justify-center gap-[3px] w-9 h-9 rounded-xl transition-all duration-200',
          (open || hasActive) ? 'bg-primary/14' : 'bg-transparent'
        )}>
          {[0,1,2].map(i => (
            <span key={i} className={cn(
              'block h-[2.5px] rounded-full transition-all duration-200',
              (open || hasActive) ? 'bg-primary w-4' : 'bg-muted-foreground/50 w-3.5'
            )} />
          ))}
        </div>
        <span className={cn(
          'text-[9px] font-bold tracking-wider uppercase leading-none transition-all duration-200',
          (open || hasActive) ? 'text-primary' : 'text-muted-foreground/50 opacity-0 scale-75'
        )}>
          More
        </span>
      </button>

      {/* More Menu Sheet */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm"
                onClick={() => setOpen(false)}
              />
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.8 }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > 80 || info.velocity.y > 400) {
                    haptics.selection();
                    setOpen(false);
                  }
                }}
                className="fixed bottom-0 left-0 right-0 z-[10000] bg-card border-t border-border/50 rounded-t-3xl p-6 pb-10 cursor-grab active:cursor-grabbing"
              >
                <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
                <div className="grid grid-cols-4 gap-3">
                  {items.map(item => {
                    const Icon = item.icon;
                    const active = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { onNavigate(item.id); setOpen(false); }}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 press-scale',
                          active ? 'bg-primary/12' : 'bg-surface-2 hover:bg-surface-3'
                        )}
                      >
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center',
                          active ? 'bg-primary/20' : 'bg-surface-3'
                        )}>
                          <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
                        </div>
                        <span className={cn(
                          'text-[10px] font-bold',
                          active ? 'text-primary' : 'text-muted-foreground'
                        )}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export default Index;
