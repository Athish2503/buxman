import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Plus, Receipt, Camera, Wallet, X, Utensils } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { toast } from 'sonner';

import { Expense } from '@/types/expense';
import { walletService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ExpenseForm } from './expense-form';
import { VehicleLogForm } from './vehicle-log-form';
import { Fuel } from 'lucide-react';
import { DiningEntryForm } from './food/DiningEntryForm';

interface FloatingAddMenuProps {
  onAddExpense: (expense: Expense) => void;
  onFuelSuccess?: () => void;
  onOpenChange?: (open: boolean) => void;
}

export function FloatingAddMenu({ onAddExpense, onFuelSuccess, onOpenChange }: FloatingAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showDiningForm, setShowDiningForm] = useState(false);
  const [fabRect, setFabRect] = useState<DOMRect | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  const updateRect = () => {
    if (fabRef.current) {
      setFabRect(fabRef.current.getBoundingClientRect());
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      return () => window.removeEventListener('scroll', updateRect, true);
    }
  }, [isOpen]);

  const toggleMenu = () => {
    haptics.selection();
    updateRect(); // Capture latest position before opening
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  const handleSnap = async () => {
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (image.base64String) {
        const b64 = `data:image/${image.format};base64,${image.base64String}`;
        await walletService.addReceipt(b64);
        haptics.success();
        toast.success('Receipt snapped to Wallet', {
          description: 'You can process it later from the Wallet tab.',
        });
      }
    } catch (error: any) {
      // Don't toast for user cancellation as it's an intentional action
      if (error?.message !== 'User cancelled photos app') {
        console.error('Camera error:', error);
        toast.error('Could not access camera');
      }
    } finally {
      setIsOpen(false);
      onOpenChange?.(false);
    }
  };

  const handleAddExpense = () => {
    setIsOpen(false);
    onOpenChange?.(false);
    setShowExpenseForm(true);
  };

  const handleLogFuel = () => {
    setIsOpen(false);
    onOpenChange?.(false);
    setShowFuelForm(true);
  };

  const handleLogDining = () => {
    setIsOpen(false);
    onOpenChange?.(false);
    setShowDiningForm(true);
  };

  const portalContent = (
    <AnimatePresence>
      {isOpen && fabRect && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
            onClick={toggleMenu}
          />
          
          <div 
            className="absolute pointer-events-auto"
            style={{ 
              left: fabRect.left + (fabRect.width / 2), 
              top: fabRect.top + (fabRect.height / 2),
            }}
          >
            {/* Wallet/Snap Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: -90 }}
              animate={{ opacity: 1, scale: 1, x: -100, y: -40, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: -90 }}
              transition={{ type: "spring", damping: 18, stiffness: 300, delay: 0.05 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSnap}
              className="absolute -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-card/90 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center group"
            >
              <div className="text-emerald-400 group-active:scale-90 transition-all mb-1">
                <Camera className="h-7 w-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Wallet</span>
            </motion.button>

            {/* Fuel Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 0 }}
              animate={{ opacity: 1, scale: 1, x: -45, y: -110, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 300, delay: 0.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogFuel}
              className="absolute -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-card/90 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center group"
            >
              <div className="text-cyan-400 group-active:scale-90 transition-all mb-1">
                <Fuel className="h-7 w-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Fuel</span>
            </motion.button>

            {/* Expense Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 90 }}
              animate={{ opacity: 1, scale: 1, x: 45, y: -110, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 90 }}
              transition={{ type: "spring", damping: 18, stiffness: 300, delay: 0.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleAddExpense}
              className="absolute -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-card/90 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center group"
            >
              <div className="text-amber-400 group-active:scale-90 transition-all mb-1">
                <Receipt className="h-7 w-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Expense</span>
            </motion.button>

            {/* Dining Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 120 }}
              animate={{ opacity: 1, scale: 1, x: 100, y: -40, rotate: 0 }}
              exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 120 }}
              transition={{ type: "spring", damping: 18, stiffness: 300, delay: 0.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogDining}
              className="absolute -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full bg-card/90 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center group"
            >
              <div className="text-rose-400 group-active:scale-90 transition-all mb-1">
                <Utensils className="h-7 w-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Dining</span>
            </motion.button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="relative h-14 w-14 flex items-center justify-center" ref={fabRef}>

        {/* Main FAB */}
        <motion.button
          onClick={toggleMenu}
          animate={{ rotate: isOpen ? 135 : 0 }}
          whileTap={{ scale: 0.9 }}
          className={cn(
            "relative z-[110] h-14 w-14 rounded-full bg-gradient-primary shadow-glow flex items-center justify-center border-4 border-background transition-all duration-300",
            isOpen && "shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)]"
          )}
        >
          <Plus className="h-7 w-7 text-white" strokeWidth={3} />
        </motion.button>
      </div>

      {createPortal(portalContent, document.body)}

      <ExpenseForm
        open={showExpenseForm}
        onOpenChange={setShowExpenseForm}
        onSubmit={onAddExpense}
        trigger={<div className="hidden" />}
      />

      <VehicleLogForm
        open={showFuelForm}
        onOpenChange={setShowFuelForm}
        onSuccess={() => {
          onFuelSuccess?.();
          setShowFuelForm(false);
        }}
        trigger={<div className="hidden" />}
      />

      <DiningEntryForm
        open={showDiningForm}
        onOpenChange={setShowDiningForm}
        onSubmit={() => {
          setShowDiningForm(false);
          // Trigger a global refresh if needed
          window.dispatchEvent(new CustomEvent('dining-updated'));
        }}
        trigger={<div className="hidden" />}
      />
    </>
  );
}
