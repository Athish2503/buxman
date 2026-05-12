import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  editLog?: FuelLog;
}

const INDIAN_STATIONS = [
  { id: 'IndianOil', name: 'IndianOil', short: 'IOCL', color: 'border-orange-500/30 text-orange-500 bg-orange-500/5' },
  { id: 'Bharat Petroleum', name: 'Bharat Petroleum', short: 'BPCL', color: 'border-yellow-500/30 text-yellow-500 bg-yellow-500/5' },
  { id: 'Hindustan Petroleum', name: 'Hindustan Petroleum', short: 'HPCL', color: 'border-blue-500/30 text-blue-500 bg-blue-500/5' },
  { id: 'Jio-bp', name: 'Jio-bp', short: 'Jio-bp', color: 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5' },
  { id: 'Nayara Energy', name: 'Nayara Energy', short: 'Nayara', color: 'border-sky-500/30 text-sky-500 bg-sky-500/5' },
  { id: 'Shell', name: 'Shell', short: 'Shell', color: 'border-amber-500/30 text-amber-500 bg-amber-500/5' },
  { id: 'Reliance', name: 'Reliance', short: 'Reliance', color: 'border-indigo-500/30 text-indigo-500 bg-indigo-500/5' },
];

export function VehicleLogForm({ onSuccess, trigger, editLog, open: externalOpen, onOpenChange }: VehicleLogFormProps & { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const isMobile = useIsMobile();
  
  const [vehicles] = useState<VehicleRate[]>(() => mileageService.getVehicles());
  const [activeVehId, setActiveVehId] = useState(editLog?.vehicleId || vehicles[0]?.id || '');
  
  const [odometer, setOdometer] = useState(editLog?.odometer.toString() || '');
  const [liters, setLiters] = useState(editLog?.liters.toString() || '');
  const [price, setPrice] = useState(editLog?.pricePerLiter.toString() || '');
  const [isFullTank, setIsFullTank] = useState(editLog?.isFullTank ?? true);
  const [station, setStation] = useState(editLog?.station || 'IndianOil');
  const [date, setDate] = useState(editLog?.date || format(new Date(), 'yyyy-MM-dd'));
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Update state when editLog changes
  useEffect(() => {
    if (editLog) {
      setActiveVehId(editLog.vehicleId);
      setOdometer(editLog.odometer.toString());
      setLiters(editLog.liters.toString());
      setPrice(editLog.pricePerLiter.toString());
      setIsFullTank(editLog.isFullTank);
      setStation(editLog.station || 'IndianOil');
      setDate(editLog.date);
    }
  }, [editLog]);

  // Auto-fill price when vehicle changes (only for new logs)
  useEffect(() => {
    if (!editLog) {
      const v = vehicles.find(v => v.id === activeVehId);
      if (v?.defaultFuelPrice) {
        setPrice(v.defaultFuelPrice.toString());
      }
    }
  }, [activeVehId, vehicles, editLog]);

  const handleSave = async () => {
    if (!odometer || !liters || !price) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isSubmitting || success) return;
    setIsSubmitting(true);
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 600));

    const log: FuelLog = {
      id: editLog?.id || crypto.randomUUID(),
      vehicleId: activeVehId,
      date,
      odometer: Number(odometer),
      liters: Number(liters),
      pricePerLiter: Number(price),
      totalCost: Number(liters) * Number(price),
      isFullTank,
      station,
      createdAt: editLog?.createdAt || new Date().toISOString()
    };

    if (editLog) {
      fuelService.updateLog(log);
    } else {
      fuelService.addLog(log);
    }

    setSuccess(true);
    haptics.success();
    toast.success(editLog ? 'Fuel log updated!' : 'Fuel log saved!');

    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setIsSubmitting(false);
      if (!editLog) {
        setOdometer('');
        setLiters('');
      }
      onSuccess();
    }, 1200);
  };

  const overlay = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          
          {isMobile ? (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full z-[9999] rounded-t-3xl border-t border-border/40 overflow-hidden"
              style={{ background: 'hsl(var(--background))', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="h-1 w-10 rounded-full bg-muted-foreground/30" /></div>
              <div className="relative flex items-center justify-center px-5 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Fuel className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-sm font-bold">{editLog ? 'Edit Fuel Log' : 'Log Fuel'}</h2>
                </div>
                <button onClick={() => setOpen(false)} className="absolute right-5 h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 pb-10 space-y-6 pt-4">
                 {renderForm()}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg z-[9999] rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
              style={{ background: 'hsl(var(--background))' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow"><Fuel className="h-4 w-4 text-white" /></div>
                  <h2 className="font-bold">{editLog ? 'Edit Fuel Record' : 'Log Fuel Fill-up'}</h2>
                </div>
                <button onClick={() => setOpen(false)} className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              </div>
              <div className="p-6 space-y-6">
                {renderForm()}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );

  function renderForm() {
    return (
      <div className="space-y-5">
        {/* Vehicle Selection */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 block ml-1">Select Vehicle</Label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {vehicles.map(v => (
              <button
                key={v.id}
                onClick={() => { setActiveVehId(v.id); haptics.selection(); }}
                className={cn(
                  "relative flex flex-col items-center gap-2 px-6 py-3 rounded-2xl border transition-all duration-300 min-w-[100px]",
                  activeVehId === v.id ? 'border-primary/30 text-primary' : 'border-border/40 bg-muted/10 text-muted-foreground opacity-60'
                )}
              >
                {activeVehId === v.id && (
                  <motion.div
                    layoutId="active-veh-form-tab"
                    className="absolute inset-0 bg-primary/10 rounded-2xl z-0"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  {v.icon === 'car' ? <Car className="h-5 w-5" /> : <Bike className="h-5 w-5" />}
                  <span className="text-[11px] font-bold truncate max-w-[80px]">{v.name}</span>
                </div>
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

        {/* Fuel Station Selector */}
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5 ml-1">
            <Fuel className="h-3 w-3 text-primary" /> Fuel Station
          </Label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
            {INDIAN_STATIONS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => { setStation(s.id); haptics.selection(); }}
                className={cn(
                  "relative px-4 py-2 rounded-xl border text-[11px] font-bold transition-all shrink-0 tracking-tight",
                  station === s.id 
                    ? `border-primary/40 bg-primary/10 text-primary shadow-sm` 
                    : 'border-border/40 bg-muted/10 text-muted-foreground hover:border-border/80'
                )}
              >
                {station === s.id && (
                  <motion.div
                    layoutId="active-station-pill"
                    className="absolute inset-0 bg-primary/10 rounded-xl z-0"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{s.name}</span>
              </button>
            ))}
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
            label={editLog ? "Swipe to Update Record" : "Swipe to Log Fuel"}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div onClick={() => setOpen(true)} className="contents">{trigger}</div>
      {createPortal(overlay, document.body)}
    </>
  );
}
