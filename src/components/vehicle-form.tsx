import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Car, Bike, ShieldAlert, Wrench, IndianRupee, Settings, Check } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SwipeToAdd } from '@/components/ui/swipe-to-add';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VehicleRate } from '@/types/modules';
import { mileageService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VehicleFormProps {
  onSuccess: () => void;
  trigger?: React.ReactNode;
  editVehicle?: VehicleRate;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function VehicleForm({ onSuccess, trigger, editVehicle, open: externalOpen, onOpenChange }: VehicleFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const isMobile = useIsMobile();

  const [name, setName] = useState('');
  const [ratePerKm, setRatePerKm] = useState('');
  const [icon, setIcon] = useState<'car' | 'bike'>('car');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [fuelType, setFuelType] = useState<VehicleRate['fuelType']>('petrol');
  const [licensePlate, setLicensePlate] = useState('');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');
  const [serviceInterval, setServiceInterval] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (editVehicle) {
      setName(editVehicle.name);
      setIcon(editVehicle.icon);
      setRatePerKm(editVehicle.ratePerKm?.toString() || '');
      setDefaultPrice(editVehicle.defaultFuelPrice?.toString() || '');
      setFuelType(editVehicle.fuelType || 'petrol');
      setLicensePlate(editVehicle.licensePlate || '');
      setInsuranceExpiry(editVehicle.insuranceExpiry || '');
      setServiceInterval(editVehicle.serviceInterval?.toString() || '');
    } else {
      setName('');
      setIcon('car');
      setRatePerKm('');
      setDefaultPrice('');
      setFuelType('petrol');
      setLicensePlate('');
      setInsuranceExpiry('');
      setServiceInterval('');
    }
  }, [editVehicle, open]);

  const handleSave = async () => {
    if (!name) {
      toast.error('Vehicle name is required');
      return;
    }

    if (isSubmitting || success) return;
    setIsSubmitting(true);
    
    await new Promise(r => setTimeout(r, 600));

    const vehicle: VehicleRate = {
      id: editVehicle?.id || crypto.randomUUID(),
      name,
      icon,
      defaultFuelPrice: Number(defaultPrice) || undefined,
      ratePerKm: Number(ratePerKm) || (icon === 'car' ? 12 : 6),
      fuelType,
      licensePlate,
      insuranceExpiry,
      serviceInterval: Number(serviceInterval) || undefined,
    };

    const vehicles = await mileageService.getVehicles();
    let updated: VehicleRate[];
    if (editVehicle) {
      updated = vehicles.map(v => v.id === editVehicle.id ? vehicle : v);
    } else {
      updated = [...vehicles, vehicle];
    }

    await mileageService.saveVehicles(updated);
    
    setSuccess(true);
    haptics.success();
    toast.success(editVehicle ? 'Vehicle updated!' : 'Vehicle added to garage!');

    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setIsSubmitting(false);
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
                    {icon === 'car' ? <Car className="h-3.5 w-3.5 text-white" /> : <Bike className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <h2 className="text-sm font-bold">{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
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
                  <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Settings className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="font-bold">{editVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nickname</Label>
            <Input 
              placeholder="e.g. My Pulsar" value={name} onChange={e => setName(e.target.value)}
              className="h-11 bg-muted/30 border-border/40 text-sm focus:border-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Plate Number</Label>
            <Input 
              placeholder="MH 12 AB 1234" value={licensePlate} onChange={e => setLicensePlate(e.target.value)}
              className="h-11 bg-muted/30 border-border/40 text-sm focus:border-primary/40 uppercase font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5"><IndianRupee className="h-3 w-3" /> Default Fuel Price</Label>
            <Input 
              type="number" placeholder="104.5" value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)}
              className="h-11 bg-muted/30 border-border/40 text-sm focus:border-primary/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-1.5"><Wrench className="h-3 w-3" /> Service Interval (km)</Label>
            <Input 
              type="number" placeholder="5000" value={serviceInterval} onChange={e => setServiceInterval(e.target.value)}
              className="h-11 bg-muted/30 border-border/40 text-sm focus:border-primary/40"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Insurance Expiry</Label>
          <Input 
            type="date" value={insuranceExpiry} onChange={e => setInsuranceExpiry(e.target.value)}
            className="h-11 bg-muted/30 border-border/40 text-sm focus:border-primary/40"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Fuel Type</Label>
          <div className="flex gap-1">
            {['petrol', 'diesel', 'cng', 'electric'].map(f => (
              <button
                key={f}
                onClick={() => setFuelType(f as any)}
                className={cn(
                  "flex-1 h-9 rounded-lg border text-[9px] font-black uppercase transition-all",
                  fuelType === f ? 'border-primary bg-primary/10 text-primary' : 'border-border/30 bg-muted/10 text-muted-foreground'
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={() => setIcon('car')}
            className={cn("flex-1 h-12 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all", icon === 'car' ? 'border-primary text-primary bg-primary/10 shadow-sm' : 'border-border/40 text-muted-foreground bg-muted/10')}
          >
            <Car className="h-4.5 w-4.5" /> Car
          </button>
          <button 
            onClick={() => setIcon('bike')}
            className={cn("flex-1 h-12 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all", icon === 'bike' ? 'border-primary text-primary bg-primary/10 shadow-sm' : 'border-border/40 text-muted-foreground bg-muted/10')}
          >
            <Bike className="h-4.5 w-4.5" /> Bike
          </button>
        </div>

        <div className="pt-4 border-t border-border/30 mt-2">
          <SwipeToAdd 
            onConfirm={handleSave} 
            isSubmitting={isSubmitting} 
            success={success} 
            label={editVehicle ? "Swipe to Update Vehicle" : "Swipe to Add Vehicle"}
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
