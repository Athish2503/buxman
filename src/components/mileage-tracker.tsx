import { useState } from 'react';
import { format } from 'date-fns';
import { Car, Bike, Plus, Trash2, Settings, ArrowRight, IndianRupee, MapPin } from 'lucide-react';
import { MileageLog, VehicleRate } from '@/types/modules';
import { Expense } from '@/types/expense';
import { mileageService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MileageTrackerProps {
  onAddExpense: (e: Expense) => void;
}

export function MileageTracker({ onAddExpense }: MileageTrackerProps) {
  const [vehicles, setVehicles] = useState<VehicleRate[]>([]);
  const [logs, setLogs] = useState<MileageLog[]>([]);

  useEffect(() => {
    mileageService.getVehicles().then(setVehicles);
    mileageService.getLogs().then(setLogs);
  }, []);
  
  const [mode, setMode] = useState<'list' | 'add' | 'settings'>('list');
  
  // Add log state
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id || '');
  const [distance, setDistance] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Settings state
  const [newVehName, setNewVehName] = useState('');
  const [newVehRate, setNewVehRate] = useState('');
  const [newVehIcon, setNewVehIcon] = useState<'car' | 'bike'>('car');

  const reload = async () => {
    const v = await mileageService.getVehicles();
    const l = await mileageService.getLogs();
    setVehicles(v);
    setLogs(l);
  };

  const handleSaveVehicle = () => {
    if (!newVehName) return;
    const v: VehicleRate = { 
      id: crypto.randomUUID(), 
      name: newVehName, 
      ratePerKm: Number(newVehRate) || 0, 
      icon: newVehIcon 
    };
    mileageService.saveVehicles([...vehicles, v]);
    setNewVehName(''); setNewVehRate('');
    haptics.success();
    reload();
    toast.success('Vehicle added');
  };

  const handleDeleteVehicle = (id: string) => {
    mileageService.saveVehicles(vehicles.filter(v => v.id !== id));
    haptics.heavy();
    reload();
  };

  const handleSaveLog = () => {
    const v = vehicles.find(v => v.id === selectedVehicleId);
    if (!v || !distance || !purpose) { toast.error('Fill in all fields'); return; }

    const distNum = Number(distance);
    const amount = distNum * v.ratePerKm;
    
    const log: MileageLog = {
      id: crypto.randomUUID(),
      date,
      vehicleId: v.id,
      distance: distNum,
      rateApplied: v.ratePerKm,
      totalAmount: amount,
      purpose,
      isBilled: false,
      createdAt: new Date().toISOString(),
    };
    
    await mileageService.addLog(log);
    await reload();
    setMode('list');
    setDistance('');
    setPurpose('');
    haptics.success();
    toast.success('Mileage logged');
  };

  const handleBillIt = (log: MileageLog) => {
    const v = vehicles.find(v => v.id === log.vehicleId);
    const expense: Expense = {
      id: crypto.randomUUID(),
      vendor: `${v?.name || 'Vehicle'} Mileage`,
      category: 'transportation',
      amount: log.totalAmount,
      date: log.date,
      description: `${log.distance} km @ ₹${log.rateApplied}/km - ${log.purpose}`,
      status: 'pending',
      currency: 'INR',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onAddExpense(expense);
    mileageService.markBilled(log.id, expense.id);
    haptics.success();
    reload();
    toast.success('Converted to Expense');
  };

  const handleDeleteLog = (id: string) => {
    mileageService.removeLog(id);
    haptics.heavy();
    reload();
  };

  if (mode === 'settings') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setMode('list')} className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <h2 className="font-bold">Vehicle Settings</h2>
        </div>

        <div className="space-y-2">
          {vehicles.map(v => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {v.icon === 'car' ? <Car className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">{v.name}</p>
                  <p className="text-xs text-muted-foreground">₹{v.ratePerKm.toFixed(2)} per km</p>
                </div>
              </div>
              <button onClick={() => handleDeleteVehicle(v.id)} className="h-8 w-8 text-destructive flex items-center justify-center">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl border border-border/40 bg-card space-y-3 mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add Vehicle</p>
          <div className="grid grid-cols-2 gap-2">
            <input 
              placeholder="Name (e.g. Audi)" value={newVehName} onChange={e => setNewVehName(e.target.value)}
              className="h-10 px-3 rounded-xl bg-muted/40 border border-border/40 text-sm w-full"
            />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <input 
                type="number" placeholder="Rate/km (Optional)" value={newVehRate} onChange={e => setNewVehRate(e.target.value)}
                className="h-10 pl-7 pr-3 rounded-xl bg-muted/40 border border-border/40 text-sm w-full"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setNewVehIcon('car')}
              className={cn("flex-1 h-10 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all", newVehIcon === 'car' ? 'border-primary text-primary bg-primary/10' : 'border-border/40 text-muted-foreground')}
            >
              <Car className="h-4 w-4" /> Car
            </button>
            <button 
              onClick={() => setNewVehIcon('bike')}
              className={cn("flex-1 h-10 rounded-xl border flex items-center justify-center gap-2 text-sm font-medium transition-all", newVehIcon === 'bike' ? 'border-primary text-primary bg-primary/10' : 'border-border/40 text-muted-foreground')}
            >
              <Bike className="h-4 w-4" /> Bike
            </button>
          </div>
          <button onClick={handleSaveVehicle} className="w-full h-10 rounded-xl bg-gradient-primary text-white text-sm font-bold mt-2">
            Save Vehicle
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'add') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setMode('list')} className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <h2 className="font-bold">Log Mileage</h2>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-widest text-muted-foreground">Vehicle</label>
          <div className="grid grid-cols-2 gap-2">
            {vehicles.map(v => (
              <button
                key={v.id}
                onClick={() => setSelectedVehicleId(v.id)}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all",
                  selectedVehicleId === v.id ? 'border-primary bg-primary/10' : 'border-border/40 bg-card hover:border-primary/40'
                )}
              >
                {v.icon === 'car' ? <Car className={cn("h-6 w-6", selectedVehicleId === v.id ? 'text-primary' : 'text-muted-foreground')} /> : <Bike className={cn("h-6 w-6", selectedVehicleId === v.id ? 'text-primary' : 'text-muted-foreground')} />}
                <div className="text-center">
                  <p className="text-sm font-semibold">{v.name}</p>
                  <p className="text-[10px] text-muted-foreground">₹{v.ratePerKm}/km</p>
                </div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Distance (km)</label>
              <input 
                type="number" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0"
                className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border/40 text-lg font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Date</label>
              <input 
                type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full h-12 px-3 rounded-xl bg-muted/30 border border-border/40 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 pt-2">Purpose / Destination</label>
            <input 
              value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Client visit in Koramangala"
              className="w-full h-12 px-4 rounded-xl bg-muted/30 border border-border/40 text-sm"
            />
          </div>

          <div className="pt-4">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-primary">Est. Reimbursement</span>
              <span className="text-xl font-bold font-mono text-primary">
                {formatCurrency(Number(distance || 0) * (vehicles.find(v => v.id === selectedVehicleId)?.ratePerKm || 0))}
              </span>
            </div>
            <button onClick={handleSaveLog} className="w-full h-12 rounded-xl bg-gradient-primary text-white font-bold text-base shadow-glow">
              Save Log
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LIST MODE
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Mileage</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Track and bill distance driven</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMode('settings')} className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground">
            <Settings className="h-4 w-4" />
          </button>
          <button onClick={() => setMode('add')} className="h-9 px-3 rounded-xl bg-primary/15 text-primary text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-all">
            <MapPin className="h-4 w-4" /> Log Trip
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-2xl">
          <Car className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No mileage logged</p>
          <p className="text-xs text-muted-foreground mt-1">Track business trips to claim fuel costs</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const v = vehicles.find(veh => veh.id === log.vehicleId);
            return (
              <div key={log.id} className="p-3.5 rounded-xl border border-border/40 bg-card flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center shrink-0">
                      {v?.icon === 'car' ? <Car className="h-5 w-5 text-muted-foreground" /> : <Bike className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{log.purpose}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(log.date), 'dd MMM yyyy')} · {v?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono">{formatCurrency(log.totalAmount)}</p>
                    <p className="text-[10px] text-muted-foreground">{log.distance} km @ ₹{log.rateApplied}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/30 pt-3">
                  {log.isBilled ? (
                    <span className="text-[10px] font-bold px-2 py-1 bg-success/15 text-success rounded-lg flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" /> BILLED
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleBillIt(log)}
                      className="text-xs font-semibold px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary hover:text-white transition-colors"
                    >
                      Convert to Expense
                    </button>
                  )}
                  
                  <button onClick={() => handleDeleteLog(log.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
