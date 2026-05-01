import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Fuel, Car, Bike, Plus, Trash2, ArrowRight, IndianRupee, MapPin, GaugeCircle, TrendingUp } from 'lucide-react';
import { FuelLog, VehicleRate } from '@/types/modules';
import { mileageService, fuelService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

export function FuelTracker() {
  const [vehicles, setVehicles] = useState<VehicleRate[]>(() => mileageService.getVehicles());
  const [logs, setLogs] = useState<FuelLog[]>(() => fuelService.getLogs());
  const [mode, setMode] = useState<'dashboard' | 'add'>('dashboard');
  
  const [activeVehId, setActiveVehId] = useState<string>(vehicles[0]?.id || '');

  // Add Log State
  const [odometer, setOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const reload = () => {
    setVehicles(mileageService.getVehicles());
    setLogs(fuelService.getLogs());
  };

  const handleSaveFillup = () => {
    if (!odometer || !liters || !price) { toast.error('Fill in all fields'); return; }
    
    const odoNum = Number(odometer);
    const litNum = Number(liters);
    const priceNum = Number(price);

    const log: FuelLog = {
      id: crypto.randomUUID(),
      vehicleId: activeVehId,
      date,
      odometer: odoNum,
      liters: litNum,
      pricePerLiter: priceNum,
      totalCost: litNum * priceNum,
      isFullTank,
      createdAt: new Date().toISOString()
    };

    fuelService.addLog(log);
    haptics.success();
    toast.success('Fill-up logged!');
    setMode('dashboard');
    setOdometer('');
    setLiters('');
    reload();
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
    
    // Only count logs where we could calculate economy
    const economyLogs = activeLogs.filter(l => l.economy);
    const avgEconomy = economyLogs.length ? economyLogs.reduce((s, l) => s + l.economy!, 0) / economyLogs.length : 0;
    
    const totalSpent = activeLogs.reduce((s, l) => s + l.totalCost, 0);
    const totalDist = activeLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
    const costPerKm = totalDist > 0 ? totalSpent / totalDist : 0;

    return { avgEconomy, totalSpent, totalDist, costPerKm };
  }, [activeLogs]);

  if (mode === 'add') {
    const v = vehicles.find(v => v.id === activeVehId);
    return (
      <div className="space-y-5 animate-fade-in pb-20">
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('dashboard')} className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <h2 className="font-bold text-lg">Log Fuel</h2>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 pb-3 border-b border-border/40">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              {v?.icon === 'car' ? <Car className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
            </div>
            <div>
              <p className="font-bold">{v?.name}</p>
              <p className="text-xs text-muted-foreground">New fill-up record</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <GaugeCircle className="h-3 w-3" /> Current Odometer
              </label>
              <input 
                type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="e.g. 45200"
                className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border/40 text-lg font-mono placeholder:text-muted-foreground/30 focus:border-primary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Fuel className="h-3 w-3" /> Liters Filled
                </label>
                <input 
                  type="number" value={liters} onChange={e => setLiters(e.target.value)} placeholder="0.0"
                  className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border/40 text-lg font-mono focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Price / Liter</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                  <input 
                    type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="105.50"
                    className="w-full h-12 pl-7 pr-4 rounded-xl bg-muted/30 border border-border/40 text-lg font-mono focus:border-primary/50"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Date</label>
                <input 
                  type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl bg-muted/30 border border-border/40 text-sm focus:border-primary/50"
                />
              </div>
              <div className="flex flex-col justify-end">
                <button
                  onClick={() => setIsFullTank(!isFullTank)}
                  className={cn(
                    "w-full h-12 rounded-xl border text-sm font-bold transition-all",
                    isFullTank ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/30 border-border/40 text-muted-foreground'
                  )}
                >
                  {isFullTank ? '✓ Full Tank' : 'Partial Tank'}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-border/40 mt-2">
              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-sm font-semibold text-foreground/80">Total Cost</span>
                <span className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(Number(liters || 0) * Number(price || 0))}
                </span>
              </div>
              <button onClick={handleSaveFillup} className="w-full h-12 rounded-xl bg-gradient-primary text-white font-bold text-base shadow-glow flex items-center justify-center gap-2">
                <Fuel className="h-5 w-5" /> Save Record
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD MODE
  return (
    <div className="space-y-5 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl tracking-tight">Vehicles</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track mileage & fuel efficiency</p>
        </div>
        <button onClick={() => setMode('add')} className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 shadow-glow active:scale-95 transition-all">
          <Plus className="h-4 w-4" /> Fill Up
        </button>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-6 w-6 rounded-md bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-success" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Efficiency</span>
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-foreground">{stats.avgEconomy.toFixed(1)} <span className="text-sm font-semibold text-muted-foreground">km/l</span></p>
          </div>
          
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-muted/20 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-6 w-6 rounded-md bg-destructive/15 flex items-center justify-center">
                <IndianRupee className="h-3.5 w-3.5 text-destructive" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cost / KM</span>
            </div>
            <p className="text-2xl font-black font-mono tracking-tight text-foreground">₹{stats.costPerKm.toFixed(2)}</p>
          </div>
        </div>
      ) : activeLogs.length > 0 ? (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 text-center">
          <p className="text-sm font-medium text-warning">Log one more full-tank to see economy stats!</p>
        </div>
      ) : null}

      {/* Log List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold px-1">Recent Fill-ups</h3>
        
        {activeLogs.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border/40 rounded-2xl bg-card/20">
            <Fuel className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-semibold text-muted-foreground">No fuel records</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Add your first fill-up to start tracking efficiency.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {activeLogs.map((log) => (
              <div key={log.id} className="p-3.5 rounded-xl border border-border/40 bg-card flex flex-col gap-3 shadow-sm relative overflow-hidden">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
