import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Fuel, Car, Bike, Plus, Trash2, Eye, ArrowRight, IndianRupee, MapPin, GaugeCircle, TrendingUp, Settings, Pencil, ChevronUp, ChevronDown, Wrench, ShieldAlert, CreditCard, Calendar, Receipt } from 'lucide-react';
import { FuelLog, VehicleRate } from '@/types/modules';
import { fuelService, mileageService } from '@/lib/modules-storage';
import { storageService } from '@/lib/storage';
import { Expense } from '@/types/expense';
import { haptics } from '@/lib/haptics';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { VehicleLogForm } from './vehicle-log-form';
import { VehicleForm } from './vehicle-form';
import { JourneyTimeline } from './vehicle/JourneyTimeline';
import { HeroSection } from './vehicle/HeroSection';
import { FuelActionButton } from './vehicle/FuelActionButton';
import { GarageProDashboard } from './vehicle/GarageProDashboard';

interface VehicleTrackerProps {
  vehicles: VehicleRate[];
  logs: FuelLog[];
  onRefresh: () => void;
  onAddExpense?: (expense: Expense) => void;
}

export function VehicleTracker({ vehicles, logs, onRefresh, onAddExpense }: VehicleTrackerProps) {
  const [mode, setMode] = useState<'dashboard' | 'add' | 'vehicles'>('dashboard');
  const [viewMode, setViewMode] = useState<'roadway' | 'garage' | 'simple'>('roadway');
  
  const [activeVehId, setActiveVehId] = useState<string>(vehicles[0]?.id || '');

  // Trigger re-calculation for legacy data
  useEffect(() => {
    const needsMigration = logs.some(l => l.distanceSinceLast === undefined && logs.length > 1);
    if (needsMigration) {
      console.log('[FuelTracker] Migrating legacy logs to new metric system...');
      fuelService.saveAll(logs);
      onRefresh(); // Trigger parent to update state
    }
  }, []);

  const reload = () => {
    onRefresh();
  };

  const fleetStats = useMemo(() => {
    const totalSpent = logs.reduce((s, l) => s + l.totalCost, 0);
    const totalDist = logs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
    
    // Only count clean intervals for avgEconomy
    const cleanLogs = logs.filter(l => l.distanceSinceLast !== undefined && !l.missedPreviousRefill);
    const totalCleanDist = cleanLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
    const totalCleanLiters = cleanLogs.reduce((s, l) => s + l.liters, 0);
    const avgEconomy = totalCleanLiters > 0 ? totalCleanDist / totalCleanLiters : 0;
    
    return { totalSpent, totalDist, avgEconomy, vehicleCount: vehicles.length };
  }, [logs, vehicles]);

  const handleDelete = (id: string) => {
    fuelService.removeLog(id);
    haptics.heavy();
    reload();
  };

  const handleConvertFuelToExpense = (log: FuelLog, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const v = vehicles.find(veh => veh.id === log.vehicleId);
    const vehicleName = v?.name || 'Vehicle';

    const expenseObj: Expense = {
      id: log.expenseId || crypto.randomUUID(),
      date: log.date,
      vendor: log.station ? `Fuel (${log.station})` : `Fuel - ${vehicleName}`,
      category: 'transportation',
      amount: log.totalCost,
      currency: 'INR',
      description: `Fuel refill: ${log.liters}L @ ₹${log.pricePerLiter}/L (${vehicleName} - Odo: ${log.odometer} km)`,
      status: 'approved',
      isReimbursement: false,
      tags: ['Fuel', vehicleName, log.station || ''].filter(Boolean),
      createdAt: log.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.addExpense(expenseObj);
    if (onAddExpense) {
      onAddExpense(expenseObj);
    }

    fuelService.updateLog({
      ...log,
      expenseId: expenseObj.id,
      isExpenseAdded: true,
    });

    haptics.success();
    toast.success('Fuel entry added as Expense!');
    reload();
  };

  // Analytics for active vehicle
  const activeLogs = useMemo(() => logs.filter(l => l.vehicleId === activeVehId).sort((a,b) => b.odometer - a.odometer), [logs, activeVehId]);
  const activeVeh = useMemo(() => vehicles.find(v => v.id === activeVehId), [vehicles, activeVehId]);
  
  const stats = useMemo(() => {
    if (activeLogs.length < 2) return null;
    
    const economyLogs = activeLogs.filter(l => l.economy);
    const avgEconomy = economyLogs.length ? economyLogs.reduce((s, l) => s + l.economy!, 0) / economyLogs.length : 0;
    
    const totalSpent = activeLogs.reduce((s, l) => s + l.totalCost, 0);
    const totalDist = activeLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
    
    // Calculate clean cost per km
    const cleanLogs = activeLogs.filter(l => l.distanceSinceLast !== undefined && !l.missedPreviousRefill);
    const cleanSpent = cleanLogs.reduce((s, l) => s + l.totalCost, 0);
    const cleanDist = cleanLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
    const costPerKm = cleanDist > 0 ? cleanSpent / cleanDist : 0;

    const chartData = activeLogs
      .filter(l => l.economy)
      .slice(0, 10)
      .reverse()
      .map(l => ({
        date: format(new Date(l.date), 'dd MMM'),
        economy: Number(l.economy?.toFixed(1))
      }));

    return { avgEconomy, totalSpent, totalDist, costPerKm, chartData };
  }, [activeLogs]);

  const stationAnalytics = useMemo(() => {
    if (!activeLogs.length) return null;
    const counts: Record<string, { count: number; spent: number; liters: number }> = {};
    activeLogs.forEach(l => {
      const st = l.station || 'IndianOil';
      if (!counts[st]) counts[st] = { count: 0, spent: 0, liters: 0 };
      counts[st].count += 1;
      counts[st].spent += l.totalCost;
      counts[st].liters += l.liters;
    });

    const sorted = Object.entries(counts).sort((a,b) => b[1].count - a[1].count);
    const topStation = sorted[0] ? { name: sorted[0][0], ...sorted[0][1] } : null;

    return { breakdown: sorted, topStation };
  }, [activeLogs]);

  // Vehicle Management State
  const [newVehName, setNewVehName] = useState('');
  const [newVehRate, setNewVehRate] = useState('');
  const [newVehIcon, setNewVehIcon] = useState<'car' | 'bike'>('car');
  const [newPrice, setNewPrice] = useState('');
  const [newFuelType, setNewFuelType] = useState<VehicleRate['fuelType']>('petrol');
  const [licensePlate, setLicensePlate] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [serviceInterval, setServiceInterval] = useState('');
  
  const [editingVehId, setEditingVehId] = useState<string | null>(null);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [editingLog, setEditingLog] = useState<FuelLog | undefined>(undefined);

  const activeEditingVeh = useMemo(() => vehicles.find(v => v.id === editingVehId), [vehicles, editingVehId]);

  const handleSaveVehicle = () => {
    if (!newVehName) return;
    
    const newVeh: VehicleRate = {
      id: editingVehId || crypto.randomUUID(),
      name: newVehName,
      icon: newVehIcon,
      defaultFuelPrice: Number(newPrice) || undefined,
      ratePerKm: Number(newVehRate) || (newVehIcon === 'car' ? 12 : 6),
      fuelType: newFuelType,
      licensePlate,
      insuranceExpiry,
      serviceInterval: Number(serviceInterval) || undefined,
    };

    let updated: VehicleRate[];
    if (editingVehId) {
      updated = vehicles.map(v => v.id === editingVehId ? newVeh : v);
    } else {
      updated = [...vehicles, newVeh];
    }

    mileageService.saveVehicles(updated);
    setNewVehName('');
    setNewVehRate('');
    setNewPrice('');
    setLicensePlate('');
    setInsuranceExpiry('');
    setServiceInterval('');
    setEditingVehId(null);
    reload();
    toast.success(editingVehId ? 'Vehicle updated' : 'Vehicle added to garage');
  };

  const handleEditVehicle = (v: VehicleRate) => {
    setEditingVehId(v.id);
    setShowVehicleForm(true);
  };

  const handleMoveVehicle = (id: string, direction: 'up' | 'down') => {
    const idx = vehicles.findIndex(v => v.id === id);
    if (idx === -1) return;
    
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= vehicles.length) return;
    
    const updated = [...vehicles];
    const [moved] = updated.splice(idx, 1);
    updated.splice(newIdx, 0, moved);
    
    mileageService.saveVehicles(updated);
    reload();
    haptics.selection();
  };

  const handleDeleteVehicle = (id: string) => {
    mileageService.saveVehicles(vehicles.filter(v => v.id !== id));
    haptics.heavy();
    reload();
  };

  if (mode === 'vehicles') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-4 mb-6 px-1">
          <button 
            onClick={() => { setMode('dashboard'); haptics.selection(); }} 
            className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50 flex items-center justify-center transition-all active:scale-90"
          >
            <ArrowRight className="h-5 w-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Garage</h2>
            <p className="text-xs text-muted-foreground">{vehicles.length} Vehicles in your fleet</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v, idx) => {
            const vLogs = logs.filter(l => l.vehicleId === v.id);
            const economies = vLogs.filter(l => l.economy).map(l => l.economy!);
            const avgEco = economies.length > 0 ? economies.reduce((s, e) => s + e, 0) / economies.length : 0;
            const latestLog = vLogs.sort((a,b) => b.odometer - a.odometer)[0];
            
            const needsService = v.serviceInterval && latestLog && (latestLog.odometer % v.serviceInterval) > (v.serviceInterval - 500);
            const insuranceSoon = v.insuranceExpiry && new Date(v.insuranceExpiry).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;

            return (
              <div key={v.id} className="relative flex flex-col p-5 rounded-[2rem] border border-border/40 bg-card/40 glass group overflow-hidden shadow-xl hover:border-primary/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg border border-primary/20 group-hover:scale-105 transition-transform">
                      {v.icon === 'car' ? <Car className="h-7 w-7" /> : <Bike className="h-7 w-7" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-base tracking-tight">{v.name}</h3>
                        {v.fuelType && <Badge variant="secondary" className="h-4.5 px-1.5 text-[8px] bg-primary/10 text-primary border-primary/10 font-bold uppercase tracking-widest">{v.fuelType}</Badge>}
                      </div>
                      <p className="text-[10px] font-mono font-bold text-muted-foreground tracking-widest">{v.licensePlate || 'NO PLATE'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2">
                    <button onClick={() => handleEditVehicle(v)} className="h-9 w-9 bg-muted/50 hover:bg-primary/20 hover:text-primary rounded-xl flex items-center justify-center transition-all active:scale-90">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteVehicle(v.id)} className="h-9 w-9 bg-destructive/10 text-destructive/60 hover:text-destructive hover:bg-destructive/20 rounded-xl flex items-center justify-center transition-all active:scale-90">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Avg. Economy</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-black text-primary">{avgEco.toFixed(1)}</span>
                      <span className="text-[9px] font-bold opacity-40 uppercase">km/l</span>
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-widest mb-1 opacity-60">Insurance</p>
                    <p className={cn("text-xs font-bold truncate", insuranceSoon ? "text-destructive" : "text-foreground/80")}>
                      {v.insuranceExpiry ? format(new Date(v.insuranceExpiry), 'dd MMM yy') : 'N/A'}
                    </p>
                  </div>
                </div>

                {v.serviceInterval && latestLog && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                      <span className="flex items-center gap-1">{needsService ? <Wrench className="h-2.5 w-2.5 text-warning" /> : null} Service Health</span>
                      <span>{Math.round(((latestLog.odometer % v.serviceInterval) / v.serviceInterval) * 100)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((latestLog.odometer % v.serviceInterval) / v.serviceInterval) * 100, 100)}%` }}
                        className={cn("h-full rounded-full transition-all duration-1000", needsService ? "bg-warning" : "bg-primary")} 
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <VehicleForm
            open={showVehicleForm}
            onOpenChange={(open) => {
              setShowVehicleForm(open);
              if (!open) setEditingVehId(null);
            }}
            editVehicle={activeEditingVeh}
            onSuccess={reload}
            trigger={
              <button className="w-full h-full min-h-[140px] rounded-[2rem] border-2 border-dashed border-border/40 bg-card/20 flex flex-col items-center justify-center gap-3 group hover:border-primary/40 hover:bg-primary/5 transition-all">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-glow shadow-primary/10">
                  <Plus className="h-6 w-6" strokeWidth={3} />
                </div>
                <span className="text-sm font-bold text-muted-foreground group-hover:text-primary transition-colors tracking-tight">Add New Vehicle</span>
              </button>
            }
          />
        </div>
      </motion.div>
    );
  }

  // DASHBOARD MODE
  if (mode === 'dashboard' && activeVeh) {
    return (
      <div className="relative -mx-4 -mt-4 min-h-screen">
        {/* Vehicle Selector (Mini) */}
        {vehicles.length > 1 && (
          <div className="fixed top-20 left-0 right-0 z-[60] flex justify-center px-6 pointer-events-none">
            <div className="flex items-center gap-1.5 p-1 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/5 pointer-events-auto shadow-2xl">
              {vehicles.map(v => (
                <button
                  key={v.id}
                  onClick={() => { setActiveVehId(v.id); haptics.selection(); }}
                  className={cn(
                    "h-8 w-8 rounded-xl flex items-center justify-center transition-all duration-300",
                    activeVehId === v.id ? 'bg-primary/20 text-primary border border-primary/30' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {v.icon === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                </button>
              ))}
              
              <div className="w-px h-4 bg-white/10 mx-1" />
              
              <button 
                onClick={() => { setMode('vehicles'); haptics.selection(); }} 
                className="h-8 w-8 rounded-xl hover:bg-white/5 flex items-center justify-center transition-all active:scale-90"
              >
                <Settings className="h-4 w-4 text-white/40" />
              </button>
            </div>
          </div>
        )}

        {viewMode === 'roadway' ? (
          <JourneyTimeline 
            vehicle={activeVeh}
            logs={activeLogs}
            onAddLog={() => {
              setEditingLog(undefined);
              setShowLogForm(true);
            }}
            onEditLog={(log) => {
              setEditingLog(log);
              setShowLogForm(true);
            }}
            onManageVehicle={() => {
              setMode('vehicles');
              haptics.selection();
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        ) : viewMode === 'garage' ? (
          <GarageProDashboard 
            vehicle={activeVeh}
            logs={activeLogs}
            stats={stats}
            onAddLog={() => {
              setEditingLog(undefined);
              setShowLogForm(true);
            }}
            onManage={() => {
              setMode('vehicles');
              haptics.selection();
            }}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onRefresh={reload}
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 px-4 pb-32">
             <div className="space-y-6">
                <HeroSection 
                  vehicle={activeVeh} 
                  logs={activeLogs} 
                  stats={stats} 
                  onManage={() => setMode('vehicles')} 
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                />

                <div className="px-2">
                  <button 
                    onClick={() => { setEditingLog(undefined); setShowLogForm(true); haptics.light(); }}
                    className="w-full h-14 rounded-2xl bg-gradient-primary text-white font-bold flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    Log New Fuel Entry
                  </button>
                </div>

                <div className="space-y-3 px-2">
                   <h3 className="text-sm font-bold opacity-40 uppercase tracking-widest">Recent Logs</h3>
                   {activeLogs.map(log => (
                      <div 
                        key={log.id} 
                        onClick={() => { setEditingLog(log); setShowLogForm(true); haptics.light(); }}
                        className="p-4 rounded-2xl bg-card/40 border border-white/5 glass flex justify-between items-center cursor-pointer active:scale-[0.98] transition-all hover:bg-white/5"
                      >
                         <div>
                            <p className="font-bold">{log.odometer.toLocaleString()} KM</p>
                            <p className="text-[10px] opacity-40">{format(new Date(log.date), 'dd MMM yyyy')}</p>
                         </div>
                         <p className="text-primary font-black">{formatCurrency(log.totalCost)}</p>
                      </div>
                   ))}
                </div>
             </div>
          </motion.div>
        )}

        <VehicleLogForm
          open={showLogForm}
          onOpenChange={(open) => {
            setShowLogForm(open);
            if (!open) setEditingLog(undefined);
          }}
          onSuccess={reload}
          editLog={editingLog}
          defaultVehicleId={activeVehId}
          onAddExpense={onAddExpense}
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Garage</h2>
          <p className="text-xs text-muted-foreground mt-1">Maintenance & Efficiency</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setMode('vehicles'); haptics.selection(); }} 
            className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50 flex items-center justify-center transition-all active:scale-90"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
          <VehicleLogForm
            onSuccess={reload}
            onAddExpense={onAddExpense}
            trigger={
              <button className="h-10 px-4 rounded-full bg-gradient-primary text-white text-xs font-bold flex items-center gap-2 shadow-glow active:scale-95 transition-all tracking-tight">
                <Fuel className="h-4 w-4" /> Log Fuel
              </button>
            }
          />
        </div>
      </div>

      {/* Fleet Overview Dashboard */}
      {vehicles.length > 1 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center glass shadow-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-primary/60 mb-1.5">Economy</p>
            <p className="text-base font-black text-primary">{fleetStats.avgEconomy.toFixed(1)} <span className="text-[9px] font-medium opacity-60">km/l</span></p>
          </div>
          <div className="bg-card/40 border border-white/5 rounded-2xl p-4 text-center glass shadow-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Distance</p>
            <p className="text-base font-black">{fleetStats.totalDist.toLocaleString()} <span className="text-[9px] font-medium opacity-60">km</span></p>
          </div>
          <div className="bg-card/40 border border-white/5 rounded-2xl p-4 text-center glass shadow-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50 mb-1.5">Spend</p>
            <p className="text-base font-black">₹{Math.round(fleetStats.totalSpent).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Vehicle Selector Tabs */}
      {vehicles.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar px-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 shrink-0 mr-2">Your Fleet</p>
          <div className="flex items-center gap-1.5 p-1 bg-muted/30 rounded-2xl border border-border/40">
            {vehicles.map(v => (
              <button
                key={v.id}
                onClick={() => { setActiveVehId(v.id); haptics.selection(); }}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300",
                  activeVehId === v.id ? 'text-primary' : 'text-muted-foreground/60 hover:text-muted-foreground'
                )}
              >
                {activeVehId === v.id && (
                  <motion.div
                    layoutId="active-vehicle-tab"
                    className="absolute inset-0 bg-primary/15 border border-primary/20 rounded-xl z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex items-center gap-2">
                  {v.icon === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                  <span className="text-sm font-bold">{v.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Hero */}
      {stats ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="h-16 w-16" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-6 w-6 rounded-md bg-success/20 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-success" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Efficiency</span>
                </div>
                {activeLogs[0]?.economyTrend !== undefined && (
                  <span className={cn(
                    "text-[10px] font-bold",
                    activeLogs[0].economyTrend >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {activeLogs[0].economyTrend >= 0 ? '+' : ''}{activeLogs[0].economyTrend.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-foreground">{stats.avgEconomy.toFixed(1)} <span className="text-sm font-semibold text-muted-foreground">km/l</span></p>
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm relative overflow-hidden group"
            >
              <div className="absolute -right-2 -top-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <IndianRupee className="h-16 w-16" />
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-6 w-6 rounded-md bg-destructive/15 flex items-center justify-center">
                  <IndianRupee className="h-3.5 w-3.5 text-destructive" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost / KM</span>
              </div>
              <p className="text-2xl font-black font-mono tracking-tight text-foreground">₹{stats.costPerKm.toFixed(2)}</p>
            </motion.div>
          </div>

          {/* Maintenance & Compliance Alerts */}
          {activeVeh && (activeVeh.serviceInterval || activeVeh.insuranceExpiry) && (
             <div className="grid grid-cols-2 gap-3">
                {activeVeh.serviceInterval && (
                  <div className="p-3 rounded-2xl border border-border/40 bg-card/40 flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", (activeLogs[0]?.odometer || 0) % activeVeh.serviceInterval < 500 ? "bg-warning/20 text-warning animate-pulse" : "bg-muted text-muted-foreground")}>
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-muted-foreground">Service Status</p>
                      <p className="text-xs font-bold">{(activeLogs[0]?.odometer || 0) % activeVeh.serviceInterval < 500 ? "Due Soon" : "Healthy"}</p>
                    </div>
                  </div>
                )}
                {activeVeh.insuranceExpiry && (
                  <div className="p-3 rounded-2xl border border-border/40 bg-card/40 flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", (new Date(activeVeh.insuranceExpiry).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000) ? "bg-destructive/20 text-destructive animate-pulse" : "bg-muted text-muted-foreground")}>
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black uppercase text-muted-foreground">Insurance</p>
                      <p className="text-xs font-bold">{(new Date(activeVeh.insuranceExpiry).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000) ? "Renew Now" : "Active"}</p>
                    </div>
                  </div>
                )}
             </div>
          )}

          {/* Economy Chart */}
          {stats.chartData.length > 1 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Economy Trend (km/l)</h4>
                
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.chartData}>
                    <defs>
                      <linearGradient id="colorEconomy" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 9, fill: 'rgba(255,255,255,0.3)'}} 
                    />
                    <YAxis 
                      hide 
                      domain={['dataMin - 2', 'dataMax + 2']} 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                      itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="economy" 
                      stroke="var(--primary)" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorEconomy)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Station Preference Breakdown */}
          {stationAnalytics && stationAnalytics.breakdown.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Fuel className="h-3 w-3 text-primary" /> Station Insights
                </h4>
                {stationAnalytics.topStation && (
                  <span className="text-[10px] font-bold text-primary">
                    Most Visited: {stationAnalytics.topStation.name}
                  </span>
                )}
              </div>
              
              <div className="space-y-2 pt-1">
                {stationAnalytics.breakdown.map(([name, data]) => {
                  const pct = (data.spent / (stats?.totalSpent || data.spent || 1)) * 100;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold tracking-tight">{name} <span className="text-[10px] text-muted-foreground font-normal">({data.count} visits)</span></span>
                        <span className="font-mono font-bold text-muted-foreground">₹{Math.round(data.spent).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(Math.max(pct, 4), 100)}%` }}
                          className="h-full bg-primary rounded-full"
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : activeLogs.length > 0 ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6 text-center shadow-inner">
          <TrendingUp className="h-8 w-8 text-warning/40 mx-auto mb-3" />
          <p className="text-sm font-bold text-warning">Log one more full-tank to unlock efficiency charts!</p>
          <p className="text-[10px] text-warning/60 mt-1 uppercase tracking-wider">Economy tracking requires back-to-back logs</p>
        </div>
      ) : null}

      {/* Log List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold px-1">Recent Fill-ups</h3>
        
        <AnimatePresence mode="popLayout">
          {activeLogs.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-12 border border-dashed border-border/40 rounded-2xl bg-card/20"
            >
              <Fuel className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No fuel records</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Add your first fill-up to start tracking efficiency.</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {activeLogs.map((log, i) => (
                <VehicleLogForm
                  key={log.id}
                  onSuccess={reload}
                  editLog={log}
                  trigger={
                    <motion.div 
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => haptics.selection()}
                      className="p-4 rounded-[1.5rem] border border-white/5 bg-card/40 glass flex flex-col gap-4 shadow-xl relative overflow-hidden group cursor-pointer hover:border-white/10"
                    >
                      {!log.isFullTank && (
                        <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden pointer-events-none">
                          <div className="absolute top-3 -right-8 w-28 bg-primary/20 backdrop-blur-md text-[9px] font-black text-center py-1 rotate-45 text-primary border-b border-primary/20">PARTIAL</div>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-2 w-2 rounded-full bg-primary shadow-glow shadow-primary/40 shrink-0" />
                            <p className="font-black font-mono text-xl tracking-tighter text-foreground">{log.odometer.toLocaleString()} <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">km</span></p>
                            {log.station && (
                              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted/40 text-muted-foreground border border-border/40 shrink-0">
                                {log.station}
                              </span>
                            )}
                            {log.isExpenseAdded && (
                              <Badge variant="outline" className="h-4.5 px-1.5 text-[8px] border-primary/30 bg-primary/10 text-primary font-bold uppercase tracking-wider shrink-0 flex items-center gap-1">
                                <Receipt className="h-2.5 w-2.5" /> Expense Added
                              </Badge>
                            )}
                            {log.missedPreviousRefill && (
                              <Badge variant="outline" className="h-4.5 px-1.5 text-[8px] border-warning/30 bg-warning/10 text-warning font-bold uppercase tracking-wider shrink-0">
                                Missed Refill
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em] flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 opacity-40" /> {format(new Date(log.date), 'dd MMM yyyy')} · {log.liters}L @ ₹{log.pricePerLiter}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-xl tracking-tighter text-primary">{formatCurrency(log.totalCost)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          {log.economy ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-black px-3 py-1.5 bg-primary/10 text-primary rounded-xl border border-primary/20 shadow-inner">
                                {log.economy.toFixed(1)} km/l
                              </span>
                              
                              {log.economyTrend !== undefined && (
                                <div className={cn(
                                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-black border shadow-inner",
                                  log.economyTrend >= 0 
                                    ? "bg-success/10 text-success border-success/20" 
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                                )}>
                                  {log.economyTrend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5 rotate-180" />}
                                  {Math.abs(log.economyTrend).toFixed(1)}%
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                              {log.missedPreviousRefill ? "Missed Refill (Reset)" : "Initial Log"}
                            </span>
                          )}

                          {log.distanceSinceLast && (
                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 opacity-30" /> {log.distanceSinceLast} km trip {log.missedPreviousRefill && <span className="text-[8px] text-warning/80 font-bold lowercase tracking-normal">(spans gap)</span>}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!log.isExpenseAdded && (
                            <button 
                              type="button"
                              onClick={(e) => handleConvertFuelToExpense(log, e)} 
                              className="h-9 px-3 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-[10px] font-bold flex items-center gap-1.5 rounded-xl transition-all active:scale-95 shadow-sm"
                            >
                              <Receipt className="h-3.5 w-3.5" /> + Expense
                            </button>
                          )}
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation();
                              handleDelete(log.id); 
                              haptics.medium(); 
                            }} 
                            className="h-9 w-9 bg-destructive/5 border border-destructive/5 text-destructive/40 hover:text-destructive flex items-center justify-center rounded-xl transition-all active:scale-90"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-20 transition-opacity">
                        <Eye className="h-3 w-3" />
                      </div>
                    </motion.div>
                  }
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
