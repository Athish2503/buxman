import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Receipt, Camera, Wallet, X } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { toast } from 'sonner';

import { Expense } from '@/types/expense';
import { walletService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ExpenseForm } from './expense-form';
import { VehicleLogForm } from './vehicle-log-form';
import { Fuel } from 'lucide-react';

interface FloatingAddMenuProps {
  onAddExpense: (expense: Expense) => void;
  onFuelSuccess?: () => void;
}

export function FloatingAddMenu({ onAddExpense, onFuelSuccess }: FloatingAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);

  const toggleMenu = () => {
    haptics.selection();
    setIsOpen(!isOpen);
  };

  const handleSnap = async () => {
    setIsOpen(false);
    try {
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (image.base64String) {
        const b64 = `data:image/${image.format};base64,${image.base64String}`;
        walletService.addReceipt(b64);
        haptics.success();
        toast.success('Receipt snapped to Wallet', {
          description: 'You can process it later from the Wallet tab.',
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      // User might have cancelled
    }
  };

  const handleAddExpense = () => {
    setIsOpen(false);
    setShowExpenseForm(true);
  };

  const handleLogFuel = () => {
    setIsOpen(false);
    setShowFuelForm(true);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm sm:hidden"
            onClick={toggleMenu}
          />
        )}
      </AnimatePresence>

      <div className="relative">
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Wallet/Snap Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: -90 }}
                animate={{ opacity: 1, scale: 1, x: -85, y: -45, rotate: 0 }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: -90 }}
                transition={{ type: "spring", damping: 18, stiffness: 300, delay: 0.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSnap}
                className="absolute z-[100] h-20 w-20 rounded-full bg-card/90 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center group"
              >
                <div className="text-emerald-400 group-active:scale-90 transition-all mb-1">
                  <Camera className="h-7 w-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Wallet</span>
              </motion.button>

              <motion.button
                initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 90 }}
                animate={{ opacity: 1, scale: 1, x: 85, y: -45, rotate: 0 }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 90 }}
                transition={{ type: "spring", damping: 18, stiffness: 300, delay: 0.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAddExpense}
                className="absolute z-[100] h-20 w-20 rounded-full bg-card/90 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center group"
              >
                <div className="text-amber-400 group-active:scale-90 transition-all mb-1">
                  <Receipt className="h-7 w-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/80">Expense</span>
              </motion.button>

              {/* Fuel Button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.5, x: 0, y: 0, rotate: 0 }}
                animate={{ opacity: 1, scale: 1, x: 0, y: -105, rotate: 0 }}
                exit={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
                transition={{ type: "spring", damping: 18, stiffness: 300, delay: 0.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleLogFuel}
                className="absolute z-[100] h-20 w-20 rounded-full bg-card/90 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col items-center justify-center group"
              >
                <div className="text-cyan-400 group-active:scale-90 transition-all mb-1">
                  <Fuel className="h-7 w-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400/80">Fuel</span>
              </motion.button>

              {/* Expense Button */}
              
            </>
          )}
        </AnimatePresence>

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
    </>
  );
}
