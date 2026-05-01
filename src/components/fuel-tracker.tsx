import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Fuel, Car, Bike, Plus, Trash2, ArrowRight, IndianRupee, MapPin, GaugeCircle, TrendingUp, Settings } from 'lucide-react';
import { FuelLog, VehicleRate } from '@/types/modules';
import { fuelService, mileageService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { VehicleLogForm } from './vehicle-log-form';

export function VehicleTracker() {
  const [vehicles, setVehicles] = useState<VehicleRate[]>(() => mileageService.getVehicles());
  const [logs, setLogs] = useState<FuelLog[]>(() => fuelService.getLogs());
  const [mode, setMode] = useState<'dashboard' | 'add' | 'vehicles'>('dashboard');
  
  const [activeVehId, setActiveVehId] = useState<string>(vehicles[0]?.id || '');

  const reload = () => {
    setVehicles(mileageService.getVehicles());
    setLogs(fuelService.getLogs());
  };

  const handleDelete = (id: string) => {
    fuelService.removeLog(id);
    haptics.heavy();
    reload();
  };

  // Analytics for active vehicle
  const activeLogs = useMemo(() => logs.filter(l => l.vehicleId === activeVehId).sort((a,b) => b.odometer - a.odometer), [logs, activeVehId]);
  
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

  const handleSaveVehicle = () => {
    if (!newVehName) return;
    const v: VehicleRate = { 
      id: crypto.randomUUID(), 
      name: newVehName, 
      ratePerKm: Number(newVehRate) || 0, 
      icon: newVehIcon,
      defaultFuelPrice: Number(newPrice) || 0,
    };
    mileageService.saveVehicles([...vehicles, v]);
    setNewVehName(''); setNewVehRate(''); setNewPrice('');
    haptics.success();
    reload();
    toast.success('Vehicle added');
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
        className="space-y-4"
      >
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setMode('dashboard')} className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <h2 className="font-bold text-lg">My Garage</h2>
        </div>

        <div className="space-y-2">
          {vehicles.map(v => (
            <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl border border-border/40 bg-card/60 glass">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  {v.icon === 'car' ? <Car className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold text-sm">{v.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Personal Vehicle</p>
                </div>
              </div>
              <button onClick={() => handleDeleteVehicle(v.id)} className="h-8 w-8 text-destructive flex items-center justify-center hover:bg-destructive/10 rounded-lg transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-5 rounded-2xl border border-border/40 bg-card/40 space-y-4 mt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Add New Vehicle</p>
          <div className="grid grid-cols-2 gap-2">
            <input 
              placeholder="Vehicle Name" value={newVehName} onChange={e => setNewVehName(e.target.value)}
              className="h-12 px-4 rounded-xl bg-muted/30 border border-border/40 text-sm focus:border-primary/40"
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <input 
                type="number" placeholder="Fuel Price" value={newPrice} onChange={e => setNewPrice(e.target.value)}
                className="h-12 pl-7 pr-3 rounded-xl bg-muted/30 border border-border/40 text-sm w-full focus:border-primary/40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setNewVehIcon('car')}
              className={cn("flex-1 h-12 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all", newVehIcon === 'car' ? 'border-primary text-primary bg-primary/10 shadow-sm' : 'border-border/40 text-muted-foreground bg-muted/10')}
            >
              <Car className="h-4 w-4" /> Car
            </button>
            <button 
              onClick={() => setNewVehIcon('bike')}
              className={cn("flex-1 h-12 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all", newVehIcon === 'bike' ? 'border-primary text-primary bg-primary/10 shadow-sm' : 'border-border/40 text-muted-foreground bg-muted/10')}
            >
              <Bike className="h-4 w-4" /> Bike
            </button>
          </div>
          <button onClick={handleSaveVehicle} className="w-full h-12 rounded-xl bg-gradient-primary text-white text-sm font-bold mt-2 shadow-glow active:scale-95 transition-all">
            Save to Garage
          </button>
        </div>
      </motion.div>
    );
  }

  // DASHBOARD MODE
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight"> ParkHub</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your personal vehicles</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('vehicles')} className="h-10 w-10 rounded-xl bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-5 w-5" />
          </button>
          <VehicleLogForm
            onSuccess={reload}
            trigger={
              <button className="h-10 px-4 rounded-xl bg-gradient-primary text-white text-sm font-bold flex items-center gap-2 shadow-glow active:scale-95 transition-all">
                <Fuel className="h-4 w-4" /> Log Fuel
              </button>
            }
          />
        </div>
      </div>

      {/* Vehicle Selector Tabs */}
      {vehicles.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {vehicles.map(v => (
            <button
              key={v.id}
              onClick={() => { setActiveVehId(v.id); haptics.selection(); }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border whitespace-nowrap transition-all",
                activeVehId === v.id 
                  ? 'bg-primary/10 border-primary/30 text-primary' 
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
              <div className="flex items-center gap-1.5 mb-2">
                <div className="h-6 w-6 rounded-md bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Efficiency</span>
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

          {/* Economy Chart */}
          {stats.chartData.length > 1 && (
            <div className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Economy Trend (km/l)</h4>
                <div className="flex items-center gap-1.5">
                   <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                   <span className="text-[9px] font-bold text-primary">LIVE DATA</span>
                </div>
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
            <div className="space-y-2">
              {activeLogs.map((log, i) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3.5 rounded-xl border border-border/40 bg-card flex flex-col gap-3 shadow-sm relative overflow-hidden"
                >
                  {!log.isFullTank && (
                    <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden pointer-events-none">
                      <div className="absolute top-2 -right-6 w-24 bg-muted/50 text-[8px] font-bold text-center py-0.5 rotate-45 text-muted-foreground">PARTIAL</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <p className="font-bold font-mono text-lg tracking-tight">{log.odometer.toLocaleString()} <span className="text-xs font-medium text-muted-foreground">km</span></p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.date), 'dd MMM yyyy')} · {log.liters}L @ ₹{log.pricePerLiter}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">{formatCurrency(log.totalCost)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/30 pt-3 mt-1">
                    <div className="flex items-center gap-3">
                      {log.economy ? (
                        <span className="text-xs font-bold px-2.5 py-1 bg-success/15 text-success rounded-lg border border-success/20">
                          {log.economy.toFixed(1)} km/l
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted/30 rounded-lg">
                          {log.distanceSinceLast ? `+${log.distanceSinceLast} km` : 'First Log'}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleDelete(log.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
