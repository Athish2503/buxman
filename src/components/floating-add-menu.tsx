import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Plus, Receipt, Camera, X, Utensils, Fuel } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { toast } from 'sonner';

import { Expense } from '@/types/expense';
import { walletService } from '@/lib/modules-storage';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ExpenseForm } from './expense-form';
import { VehicleLogForm } from './vehicle-log-form';
import { DiningEntryForm } from './food/DiningEntryForm';

interface FloatingAddMenuProps {
  onAddExpense: (expense: Expense) => void;
  onFuelSuccess?: () => void;
  onOpenChange?: (open: boolean) => void;
}

interface FabAction {
  id: string;
  label: string;
  icon: any;
  color: string;
  gradient: string;
  x: number;
  y: number;
}

const ACTIONS: FabAction[] = [
  { id: 'snap',    label: 'Wallet',  icon: Camera,  color: '#34d399', gradient: 'linear-gradient(135deg, #34d399, #059669)', x: -105, y: -45  },
  { id: 'fuel',    label: 'Fuel',    icon: Fuel,    color: '#22d3ee', gradient: 'linear-gradient(135deg, #22d3ee, #0284c7)', x: -48,  y: -118 },
  { id: 'expense', label: 'Expense', icon: Receipt,  color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', x:  48,  y: -118 },
  { id: 'dining',  label: 'Dining',  icon: Utensils, color: '#f472b6', gradient: 'linear-gradient(135deg, #f472b6, #db2777)', x:  105, y: -45  },
];

export function FloatingAddMenu({ onAddExpense, onFuelSuccess, onOpenChange }: FloatingAddMenuProps) {
  const [isOpen,           setIsOpen]           = useState(false);
  const [showExpenseForm,  setShowExpenseForm]  = useState(false);
  const [showFuelForm,     setShowFuelForm]     = useState(false);
  const [showDiningForm,   setShowDiningForm]   = useState(false);
  const [fabRect,          setFabRect]          = useState<DOMRect | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      const action = customEvent.detail?.action;
      const voice = customEvent.detail?.voice;
      
      if (action) {
        if (action === 'expense') {
          if (voice) {
            (window as any)._autoStartVoice = true;
          }
          setShowExpenseForm(true);
        } else {
          handleAction(action);
        }
      }
    };
    window.addEventListener('trigger-add-menu', handleGlobalTrigger);
    return () => window.removeEventListener('trigger-add-menu', handleGlobalTrigger);
  }, []);

  const updateRect = () => {
    if (fabRef.current) setFabRect(fabRef.current.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateRect();
      window.addEventListener('scroll', updateRect, true);
      return () => window.removeEventListener('scroll', updateRect, true);
    }
  }, [isOpen]);

  const toggle = () => {
    haptics.selection();
    updateRect();
    const next = !isOpen;
    setIsOpen(next);
    onOpenChange?.(next);
  };

  const close = () => { setIsOpen(false); onOpenChange?.(false); };

  const handleAction = async (id: string) => {
    close();
    if (id === 'snap') {
      try {
        const image = await CapacitorCamera.getPhoto({
          quality: 90, allowEditing: false,
          resultType: CameraResultType.Base64,
          source: CameraSource.Camera,
        });
        if (image.base64String) {
          walletService.addReceipt(`data:image/${image.format};base64,${image.base64String}`);
          haptics.success();
          toast.success('Receipt saved to Wallet');
        }
      } catch (e: any) {
        if (e?.message !== 'User cancelled photos app') toast.error('Camera unavailable');
      }
    } else if (id === 'fuel')    { setShowFuelForm(true); }
    else if (id === 'expense')   { setShowExpenseForm(true); }
    else if (id === 'dining')    { setShowDiningForm(true); }
  };

  const portalContent = (
    <AnimatePresence>
      {isOpen && fabRect && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 pointer-events-auto"
            style={{ background: 'radial-gradient(ellipse at 50% 100%, hsl(225 22% 3% / 0.7) 0%, hsl(225 22% 3% / 0.85) 100%)', backdropFilter: 'blur(12px)' }}
            onClick={toggle}
          />

          {/* Action Buttons */}
          <div
            className="absolute pointer-events-auto"
            style={{
              left: fabRect.left + fabRect.width / 2,
              top:  fabRect.top  + fabRect.height / 2,
            }}
          >
            {ACTIONS.map((action, i) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.id}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  animate={{ opacity: 1, x: action.x, y: action.y, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                  transition={{
                    type: 'spring',
                    damping: 20,
                    stiffness: 280,
                    delay: i * 0.04,
                  }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleAction(action.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Glow */}
                  <div
                    className="absolute w-16 h-16 rounded-full blur-xl opacity-50"
                    style={{ background: action.color }}
                  />
                  {/* Button */}
                  <div
                    className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center shadow-2xl"
                    style={{
                      background: action.gradient,
                      border: '2px solid rgba(255,255,255,0.18)',
                      boxShadow: `0 12px 28px ${action.color}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                    }}
                  >
                    <Icon className="h-6 w-6 text-white drop-shadow" strokeWidth={2} />
                  </div>
                  <span
                    className="text-[10px] font-black uppercase tracking-wider"
                    style={{ color: action.color, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
                  >
                    {action.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* FAB Core */}
      <div ref={fabRef} className="relative flex items-center justify-center w-14 h-14">
        <motion.button
          onClick={toggle}
          animate={{ rotate: isOpen ? 135 : 0 }}
          whileTap={{ scale: 0.88 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className="relative z-[110] w-[56px] h-[56px] rounded-full flex items-center justify-center shadow-glow"
          style={{
            background: isOpen
              ? 'linear-gradient(135deg, hsl(0 72% 55%), hsl(15 90% 50%))'
              : 'linear-gradient(135deg, hsl(258 88% 66%), hsl(280 85% 65%) 50%, hsl(258 88% 58%))',
            border: '3px solid hsl(225 22% 5%)',
            boxShadow: isOpen
              ? '0 0 28px hsl(0 72% 55% / 0.5), 0 8px 24px hsl(0 0% 0% / 0.5)'
              : '0 0 32px hsl(258 88% 66% / 0.55), 0 8px 24px hsl(0 0% 0% / 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
          aria-label={isOpen ? 'Close menu' : 'Add entry'}
        >
          <Plus className="h-6 w-6 text-white drop-shadow" strokeWidth={2.8} />
        </motion.button>
      </div>

      {createPortal(portalContent, document.body)}

      {/* Forms */}
      <ExpenseForm
        open={showExpenseForm}
        onOpenChange={setShowExpenseForm}
        onSubmit={onAddExpense}
        trigger={<div className="hidden" />}
      />
      <VehicleLogForm
        open={showFuelForm}
        onOpenChange={setShowFuelForm}
        onSuccess={() => { onFuelSuccess?.(); setShowFuelForm(false); }}
        trigger={<div className="hidden" />}
      />
      <DiningEntryForm
        open={showDiningForm}
        onOpenChange={setShowDiningForm}
        onSubmit={() => { setShowDiningForm(false); window.dispatchEvent(new CustomEvent('dining-updated')); }}
        trigger={<div className="hidden" />}
      />
    </>
  );
}
