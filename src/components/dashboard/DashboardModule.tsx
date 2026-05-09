import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, IndianRupee, GaugeCircle, Fuel, Car, Bike, ArrowRight, ChevronRight
} from 'lucide-react';
import { Expense, BudgetGoal } from '@/types/expense';
import { formatCompactCurrency, cn } from '@/lib/utils';
import { mileageService, fuelService } from '@/lib/modules-storage';
import { MonthlySummary } from '@/components/monthly-summary';
import { CategoryRings } from '@/components/category-rings';
import { SpendingTrendChart, VehicleEfficiencyChart, FuelCostChart } from '@/components/analytics-charts';
import { BudgetTracker } from '@/components/budget-tracker';
import { ExpenseList } from '@/components/expense-list';

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

export function DashboardModule({
  expenses,
  onNavigate,
  onUpdateExpense,
  onDeleteExpense,
  onDeleteAll,
  onBatchDelete,
  onBatchStatus,
  settings
}: DashboardModuleProps) {
  const [dashboardTab, setDashboardTab] = useState<'expenses' | 'vehicle'>('expenses');

  const personalAmount = useMemo(() => expenses.filter(e => !e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursableAmount = useMemo(() => expenses.filter(e => e.isReimbursement).reduce((s, e) => s + e.amount, 0), [expenses]);
  const pendingAmount = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'pending').reduce((s, e) => s + e.amount, 0), [expenses]);
  const reimbursedAmount = useMemo(() => expenses.filter(e => e.isReimbursement && e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0), [expenses]);

  const vehicleSummaries = useMemo(() => {
    const vList = mileageService.getVehicles();
    const fLogs = fuelService.getLogs();
    
    return vList.map(v => {
      const vLogs = fLogs.filter(l => l.vehicleId === v.id);
      const economies = vLogs.filter(l => l.economy).map(l => l.economy!);
      const avgEco = economies.length > 0 ? economies.reduce((s, e) => s + e, 0) / economies.length : 0;
      const latestLog = vLogs[0];
      const totalDist = vLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
      const totalCost = vLogs.reduce((s, l) => s + l.totalCost, 0);

      return {
        ...v,
        avgEco,
        latestEco: latestLog?.economy || 0,
        trend: latestLog?.economyTrend || 0,
        totalDist,
        totalCost,
        costPerKm: totalDist > 0 ? totalCost / totalDist : 0
      };
    }).sort((a, b) => b.totalDist - a.totalDist);
  }, [expenses]);

  const vehicleStats = useMemo(() => {
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

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-8">
        <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Personal</p>
          <p className="text-xl font-bold">{formatCompactCurrency(personalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Claims</p>
          <p className="text-xl font-bold">{formatCompactCurrency(reimbursableAmount)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Pending</p>
          <p className="text-xl font-bold">{formatCompactCurrency(pendingAmount)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-success mb-1">Settled</p>
          <p className="text-xl font-bold">{formatCompactCurrency(reimbursedAmount)}</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Distance</p>
          <p className="text-xl font-bold">{mileageService.getLogs().reduce((sum, log) => sum + log.distance, 0).toFixed(0)} km</p>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card/60 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Fuel</p>
          <p className="text-xl font-bold">{fuelService.getLogs().reduce((s,l) => s + l.liters, 0).toFixed(0)} L</p>
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
              <p className="text-xl font-bold">{vehicleStats.totalDistance.toLocaleString()} <span className="text-[10px] font-medium opacity-60">km</span></p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                <Fuel className="h-3 w-3" /> Spend
              </p>
              <p className="text-xl font-bold">₹ {vehicleStats.totalCost.toLocaleString()}</p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-success" /> Avg. Eco
              </p>
              <p className="text-xl font-bold text-success">{vehicleStats.overallEco.toFixed(1)} <span className="text-[10px] font-medium opacity-60">km/l</span></p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5">
                <IndianRupee className="h-3 w-3 text-primary" /> Cost / KM
              </p>
              <p className="text-xl font-bold text-primary">₹ {vehicleStats.costPerKm.toFixed(2)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/80 p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Economy Trend</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Kilometers per Liter</p>
                </div>
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <VehicleEfficiencyChart logs={fuelService.getLogs()} vehicles={mileageService.getVehicles()} />
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Fuel Expenditure</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Last 10 Records</p>
                </div>
                <IndianRupee className="h-4 w-4 text-primary" />
              </div>
              <FuelCostChart logs={fuelService.getLogs()} />
            </div>
          </div>

          <button 
            onClick={() => onNavigate('vehicle')}
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
              <MonthlySummary expenses={expenses} onViewAll={() => onNavigate('expenses')} />
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
                        <span className="text-xs font-black">{v.avgEco.toFixed(1)} <span className="text-[10px] font-normal text-muted-foreground">km/l</span></span>
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
                </div>
              </div>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-card/80 p-4">
              <h3 className="text-sm font-semibold mb-4">Spending Trend</h3>
              <SpendingTrendChart expenses={expenses} />
            </div>

            <div className="lg:col-span-2 rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Budget Goals</h3>
                <button onClick={() => onNavigate('settings')} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
                  Manage <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <BudgetTracker
                expenses={expenses}
                budgets={settings.budgets || []}
                onManage={() => onNavigate('settings')}
              />
            </div>
          </div>

          {expenses.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/80 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">Recent Expenses</h3>
                <button
                  onClick={() => onNavigate('expenses')}
                  className="text-[11px] font-bold text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                >
                  All Expenses <ChevronRight className="h-3 w-3" />
                </button>
              </div>
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
        </>
      )}
    </div>
  );
}
