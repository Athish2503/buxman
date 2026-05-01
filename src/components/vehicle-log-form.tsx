import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Fuel, GaugeCircle, IndianRupee, CalendarDays, Car, Bike, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SwipeToAdd } from '@/components/ui/swipe-to-add';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FuelLog, VehicleRate } from '@/types/modules';
import { fuelService, mileageService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { cn, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface VehicleLogFormProps {
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function VehicleLogForm({ onSuccess, trigger }: VehicleLogFormProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const [vehicles] = useState<VehicleRate[]>(() => mileageService.getVehicles());
  const [activeVehId, setActiveVehId] = useState(vehicles[0]?.id || '');
  
  const [odometer, setOdometer] = useState('');
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-fill price when vehicle changes
  useEffect(() => {
    const v = vehicles.find(v => v.id === activeVehId);
    if (v?.defaultFuelPrice) {
      setPrice(v.defaultFuelPrice.toString());
    }
  }, [activeVehId, vehicles]);

  const handleSave = async () => {
    if (!odometer || !liters || !price) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate network delay for the swipe animation feel
    await new Promise(r => setTimeout(r, 600));

    const log: FuelLog = {
      id: crypto.randomUUID(),
      vehicleId: activeVehId,
      date,
      odometer: Number(odometer),
      liters: Number(liters),
      pricePerLiter: Number(price),
      totalCost: Number(liters) * Number(price),
      isFullTank,
      createdAt: new Date().toISOString()
    };

    fuelService.addLog(log);
    setSuccess(true);
    haptics.success();
    toast.success('Fuel log saved!');

    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setIsSubmitting(false);
      setOdometer('');
      setLiters('');
      onSuccess();
    }, 1500);
  };

  const overlay = open ? createPortal(
    <>
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
      
      {isMobile ? (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] rounded-t-3xl border-t border-border/40 animate-sheet-up" style={{ background: 'hsl(var(--background))', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>
          <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
          <div className="relative flex items-center justify-center px-5 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Fuel className="h-3.5 w-3.5 text-white" />
              </div>
              <h2 className="text-sm font-bold">Log Fuel</h2>
            </div>
            <button onClick={() => setOpen(false)} className="absolute right-5 h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="overflow-y-auto flex-1 px-5 pb-10 space-y-6 pt-4">
             {renderForm()}
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="relative w-full max-w-lg rounded-2xl border border-border/50 shadow-2xl animate-scale-in overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow"><Fuel className="h-4 w-4 text-white" /></div>
                <h2 className="font-bold">Log Fuel Fill-up</h2>
              </div>
              <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-6">
              {renderForm()}
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  ) : null;

  function renderForm() {
    return (
      <div className="space-y-5">
        {/* Vehicle Selection */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block">Select Vehicle</Label>
          <div className="grid grid-cols-2 gap-2">
            {vehicles.map(v => (
              <button
                key={v.id}
                onClick={() => setActiveVehId(v.id)}
                className={cn(
                  "p-3 rounded-xl border flex flex-col items-center gap-2 transition-all",
                  activeVehId === v.id ? 'border-primary bg-primary/10 shadow-sm' : 'border-border/40 bg-muted/10 opacity-60'
                )}
              >
                {v.icon === 'car' ? <Car className={cn("h-5 w-5", activeVehId === v.id ? 'text-primary' : 'text-muted-foreground')} /> : <Bike className={cn("h-5 w-5", activeVehId === v.id ? 'text-primary' : 'text-muted-foreground')} />}
                <span className="text-xs font-bold">{v.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Odometer */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
            <GaugeCircle className="h-3 w-3" /> Odometer Reading
          </Label>
          <Input 
            type="number" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="Current KM"
            className="h-12 bg-muted/30 border-border/40 text-lg font-mono focus:border-primary/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <Fuel className="h-3 w-3" /> Liters
            </Label>
            <Input 
              type="number" value={liters} onChange={e => setLiters(e.target.value)} placeholder="0.00"
              className="h-12 bg-muted/30 border-border/40 text-lg font-mono focus:border-primary/50"
            />
          </div>
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <IndianRupee className="h-3 w-3" /> Price / Liter
            </Label>
            <Input 
              type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00"
              className="h-12 bg-muted/30 border-border/40 text-lg font-mono focus:border-primary/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" /> Date
            </Label>
            <Input 
              type="date" value={date} onChange={e => setDate(e.target.value)}
              className="h-12 bg-muted/30 border-border/40 text-sm focus:border-primary/50"
            />
          </div>
          <div className="flex flex-col justify-end">
            <button
              onClick={() => setIsFullTank(!isFullTank)}
              className={cn(
                "h-12 rounded-xl border text-xs font-bold transition-all",
                isFullTank ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-muted/10 border-border/40 text-muted-foreground'
              )}
            >
              {isFullTank ? '✓ Full Tank' : 'Partial Tank'}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-border/30 mt-2">
          <div className="flex justify-between items-center mb-6 px-1">
            <span className="text-sm font-semibold opacity-70">Total Cost</span>
            <span className="text-2xl font-black font-mono text-primary">
              {formatCurrency(Number(liters || 0) * Number(price || 0))}
            </span>
          </div>
          <SwipeToAdd 
            onConfirm={handleSave} 
            isSubmitting={isSubmitting} 
            success={success} 
            label="Swipe to Log Fuel"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>{trigger}</div>
      {overlay}
    </>
  );
}
