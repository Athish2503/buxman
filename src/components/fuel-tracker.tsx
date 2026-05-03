import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Fuel, Car, Bike, Plus, Trash2, Eye, ArrowRight, IndianRupee, MapPin, GaugeCircle, TrendingUp, Settings, Pencil, ChevronUp, ChevronDown, Wrench, ShieldAlert, CreditCard, Calendar } from 'lucide-react';
import { FuelLog, VehicleRate } from '@/types/modules';
import { fuelService, mileageService } from '@/lib/modules-storage';
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

interface VehicleTrackerProps {
  vehicles: VehicleRate[];
  logs: FuelLog[];
  onRefresh: () => void;
}

export function VehicleTracker({ vehicles, logs, onRefresh }: VehicleTrackerProps) {
  const [mode, setMode] = useState<'dashboard' | 'add' | 'vehicles'>('dashboard');
  
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
    const totalLiters = logs.reduce((s, l) => s + l.liters, 0);
    const avgEconomy = totalLiters > 0 ? totalDist / totalLiters : 0;
    
    return { totalSpent, totalDist, avgEconomy, vehicleCount: vehicles.length };
  }, [logs, vehicles]);

  const handleDelete = (id: string) => {
    fuelService.removeLog(id);
    haptics.heavy();
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
    const costPerKm = totalDist > 0 ? totalSpent / totalDist : 0;

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
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => { setMode('dashboard'); haptics.selection(); }} className="h-10 w-10 rounded-2xl bg-card border border-white/10 flex items-center justify-center shadow-lg active:scale-90 transition-all">
              <ArrowRight className="h-5 w-5 rotate-180" />
            </button>
            <div>
              <h2 className="font-black text-xl tracking-tight">Garage</h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{vehicles.length} Vehicles</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {vehicles.map((v, idx) => {
            const vLogs = logs.filter(l => l.vehicleId === v.id);
            const economies = vLogs.filter(l => l.economy).map(l => l.economy!);
            const avgEco = economies.length > 0 ? economies.reduce((s, e) => s + e, 0) / economies.length : 0;
            const latestLog = vLogs.sort((a,b) => b.odometer - a.odometer)[0];
            
            // Service check
            const needsService = v.serviceInterval && latestLog && latestLog.odometer % v.serviceInterval < 500;
            const insuranceSoon = v.insuranceExpiry && new Date(v.insuranceExpiry).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000;

            return (
              <div key={v.id} className="flex flex-col p-6 rounded-[2.5rem] border border-white/5 bg-card/40 glass gap-6 relative overflow-hidden group shadow-xl">
                {/* Visual accents */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-primary/10 transition-colors" />
                
                {needsService && (
                  <div className="absolute top-4 right-4 h-10 w-10 bg-warning/20 backdrop-blur-md text-warning flex items-center justify-center rounded-2xl border border-warning/30 shadow-lg z-10 animate-pulse">
                    <Wrench className="h-5 w-5" />
                  </div>
                )}
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-xl border border-primary/20 group-hover:scale-105 transition-transform">
                      {v.icon === 'car' ? <Car className="h-8 w-8" /> : <Bike className="h-8 w-8" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-xl tracking-tight leading-none">{v.name}</h3>
                        {v.fuelType && <Badge variant="secondary" className="h-5 px-1.5 text-[8px] bg-primary/10 text-primary border-primary/10 font-black uppercase tracking-widest">{v.fuelType}</Badge>}
                      </div>
                      <p className="text-xs font-mono font-black text-muted-foreground/40 tracking-[0.2em]">{v.licensePlate || 'NO PLATE'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 translate-x-2 -translate-y-1">
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2 scale-90">
                      <button onClick={() => handleMoveVehicle(v.id, 'up')} disabled={idx === 0} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"><ChevronUp className="h-5 w-5" /></button>
                      <button onClick={() => handleMoveVehicle(v.id, 'down')} disabled={idx === vehicles.length - 1} className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-20 transition-colors"><ChevronDown className="h-5 w-5" /></button>
                    </div>
                    <button onClick={() => handleEditVehicle(v)} className="h-11 w-11 bg-white/5 border border-white/5 text-muted-foreground flex items-center justify-center hover:bg-white/10 hover:text-primary rounded-2xl transition-all active:scale-90">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteVehicle(v.id)} className="h-11 w-11 bg-destructive/5 border border-destructive/10 text-destructive/40 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive rounded-2xl transition-all active:scale-90">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 shadow-inner">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2 opacity-50 flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" /> Efficiency
                    </p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black text-primary tracking-tighter">{avgEco.toFixed(1)}</span>
                      <span className="text-[10px] font-black opacity-30 uppercase">km/l</span>
                    </div>
                  </div>
                  
                  <div className="p-4 rounded-[1.5rem] bg-white/5 border border-white/5 shadow-inner">
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-2 opacity-50 flex items-center gap-1.5">
                      <ShieldAlert className="h-3 w-3" /> Insurance
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs font-black tracking-tight", insuranceSoon ? "text-destructive" : "text-foreground/80")}>
                        {v.insuranceExpiry ? format(new Date(v.insuranceExpiry), 'dd MMM yyyy') : 'N/A'}
                      </span>
                      {insuranceSoon && <div className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />}
                    </div>
                  </div>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-3 pt-2">
                  {v.serviceInterval && latestLog && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-1">
                        <span>Service Health</span>
                        <span>{Math.round(((latestLog.odometer % v.serviceInterval) / v.serviceInterval) * 100)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div 
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            needsService ? "bg-warning shadow-glow shadow-warning/20" : "bg-primary"
                          )} 
                          style={{ width: `${Math.min(((latestLog.odometer % v.serviceInterval) / v.serviceInterval) * 100, 100)}%` }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <VehicleForm
          open={showVehicleForm}
          onOpenChange={(open) => {
            setShowVehicleForm(open);
            if (!open) setEditingVehId(null);
          }}
          editVehicle={activeEditingVeh}
          onSuccess={reload}
          trigger={
            <button className="w-full h-20 rounded-[2.5rem] border-2 border-dashed border-white/10 bg-card/20 flex items-center justify-center gap-4 group hover:border-primary/40 hover:bg-primary/5 transition-all">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-glow shadow-primary/10">
                <Plus className="h-6 w-6" strokeWidth={3} />
              </div>
              <span className="text-base font-black text-muted-foreground group-hover:text-primary transition-colors tracking-tight">Add to Garage</span>
            </button>
          }
        />
      </motion.div>
    );
  }
  // DASHBOARD MODE
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-black text-3xl tracking-tight"> Garage</h2>
          <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">Maintenance & Efficiency</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setMode('vehicles'); haptics.selection(); }} className="h-12 w-12 rounded-2xl bg-card border border-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-xl transition-all active:scale-90 shadow-lg">
            <Settings className="h-5.5 w-5.5" />
          </button>
          <VehicleLogForm
            onSuccess={reload}
            trigger={
              <button className="h-12 px-5 rounded-2xl bg-gradient-primary text-white text-sm font-black flex items-center gap-2 shadow-glow active:scale-95 transition-all tracking-tight">
                <Fuel className="h-4.5 w-4.5" /> Log Fuel
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
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 shrink-0 mr-1">Vehicles</p>
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => { setActiveVehId(v.id); haptics.selection(); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border whitespace-nowrap transition-all",
                activeVehId === v.id 
                  ? 'bg-primary/10 border-primary/30 text-primary shadow-sm scale-105 z-10' 
                  : 'bg-card/50 border-border/40 text-muted-foreground'
              )}
            >
              {v.icon === 'car' ? <Car className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
              <span className="text-sm font-bold">{v.name}</span>
            </button>
          ))}
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
                            <div className="h-2 w-2 rounded-full bg-primary shadow-glow shadow-primary/40" />
                            <p className="font-black font-mono text-xl tracking-tighter text-foreground">{log.odometer.toLocaleString()} <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">km</span></p>
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
                              Initial Log
                            </span>
                          )}

                          {log.distanceSinceLast && (
                            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 opacity-30" /> {log.distanceSinceLast} km trip
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
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
