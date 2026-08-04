import { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Plus, Receipt, Camera, Utensils, Fuel, Clapperboard, Dumbbell, Scale } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { toast } from 'sonner';

import { Expense } from '@/types/expense';
import { walletService } from '@/lib/modules-storage';
import { settingsService } from '@/lib/settings';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { ExpenseForm } from './expense-form';
import { VehicleLogForm } from './vehicle-log-form';
import { DiningEntryForm } from './food/DiningEntryForm';
import { MediaEntryForm } from './media/MediaEntryForm';
import { GymEntryForm } from './gym/GymEntryForm';
import { mediaService } from '@/lib/media-service';

interface FloatingAddMenuProps {
  onAddExpense: (expense: Expense) => void;
  onFuelSuccess?: () => void;
  onOpenChange?: (open: boolean) => void;
  onNavigate?: (tab: any) => void;
}

export interface FabActionDef {
  id: string;
  label: string;
  icon: any;
  color: string;
  gradient: string;
}

export const ALL_FAB_ACTIONS: FabActionDef[] = [
  { id: 'expense',   label: 'Expense',   icon: Receipt,      color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  { id: 'gym',       label: 'Gym',       icon: Dumbbell,     color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
  { id: 'snap',      label: 'Wallet',    icon: Camera,       color: '#34d399', gradient: 'linear-gradient(135deg, #34d399, #059669)' },
  { id: 'fuel',      label: 'Fuel',      icon: Fuel,         color: '#22d3ee', gradient: 'linear-gradient(135deg, #22d3ee, #0284c7)' },
  { id: 'dining',    label: 'Dining',    icon: Utensils,     color: '#f472b6', gradient: 'linear-gradient(135deg, #f472b6, #db2777)' },
  { id: 'watchlist', label: 'Watchlist', icon: Clapperboard, color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
];

export function FloatingAddMenu({ onAddExpense, onFuelSuccess, onOpenChange, onNavigate }: FloatingAddMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showFuelForm, setShowFuelForm] = useState(false);
  const [showDiningForm, setShowDiningForm] = useState(false);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [showGymForm, setShowGymForm] = useState(false);
  const [fabRect, setFabRect] = useState<DOMRect | null>(null);
  const fabRef = useRef<HTMLDivElement>(null);

  // Compute active actions layout coordinates dynamically
  const activeActions = useMemo(() => {
    const settings = settingsService.get();
    const enabledIds = settings.fabActions || ['expense', 'gym', 'snap', 'fuel', 'dining', 'watchlist'];
    const filtered = ALL_FAB_ACTIONS.filter(a => enabledIds.includes(a.id));
    const N = filtered.length;
    const radius = N > 5 ? 125 : 115;

    return filtered.map((action, i) => {
      let x = 0;
      let y = -radius;
      if (N > 1) {
        const startDeg = 170;
        const endDeg = 10;
        const deg = startDeg - (i * (startDeg - endDeg) / (N - 1));
        const rad = (deg * Math.PI) / 180;
        x = Math.round(-Math.cos(rad) * radius);
        y = Math.round(-Math.sin(rad) * radius);
      }
      return { ...action, x, y };
    });
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent;
      const action = customEvent.detail?.action;
      if (action) {
        if (action === 'expense') {
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
    } else if (id === 'fuel') {
      setShowFuelForm(true);
    } else if (id === 'expense') {
      setShowExpenseForm(true);
    } else if (id === 'dining') {
      setShowDiningForm(true);
    } else if (id === 'watchlist') {
      setShowMediaForm(true);
    } else if (id === 'gym') {
      setShowGymForm(true);
    }
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
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, hsl(225 22% 3% / 0.7) 0%, hsl(225 22% 3% / 0.85) 100%)',
              backdropFilter: 'blur(12px)',
            }}
            onClick={toggle}
          />

          {/* Action Buttons */}
          <div
            className="absolute pointer-events-auto"
            style={{
              left: fabRect.left + fabRect.width / 2,
              top: fabRect.top + fabRect.height / 2,
            }}
          >
            {activeActions.map((action, i) => {
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
                    delay: i * 0.03,
                  }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleAction(action.id)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
                  style={{ touchAction: 'manipulation' }}
                >
                  {/* Glow */}
                  <div
                    className="absolute w-14 h-14 rounded-full blur-xl opacity-50"
                    style={{ background: action.color }}
                  />
                  {/* Button */}
                  <div
                    className="relative w-[54px] h-[54px] rounded-full flex items-center justify-center shadow-2xl"
                    style={{
                      background: action.gradient,
                      border: '2px solid rgba(255,255,255,0.18)',
                      boxShadow: `0 10px 24px ${action.color}55, inset 0 1px 0 rgba(255,255,255,0.25)`,
                    }}
                  >
                    <Icon className="h-5 w-5 text-white drop-shadow" strokeWidth={2} />
                  </div>
                  <span
                    className="text-[9px] font-black uppercase tracking-wider whitespace-nowrap"
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
              ? 'linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--destructive) / 0.85))'
              : 'var(--gradient-brand)',
            border: '3px solid hsl(var(--background))',
            boxShadow: isOpen
              ? '0 0 28px hsl(var(--destructive) / 0.45), 0 8px 24px hsl(0 0% 0% / 0.5)'
              : '0 0 32px hsl(var(--primary) / 0.5), 0 8px 24px hsl(0 0% 0% / 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
          }}
          aria-label={isOpen ? 'Close menu' : 'Add entry'}
        >
          <Plus
            className={cn(
              'h-6 w-6 drop-shadow transition-colors duration-250',
              isOpen ? 'text-destructive-foreground' : 'text-primary-foreground'
            )}
            strokeWidth={2.8}
          />
        </motion.button>
      </div>

      {createPortal(portalContent, document.body)}

      {/* Forms */}
      <ExpenseForm
        open={showExpenseForm}
        onOpenChange={setShowExpenseForm}
        onSubmit={onAddExpense}
        trigger={null}
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
          window.dispatchEvent(new CustomEvent('dining-updated'));
        }}
        trigger={<div className="hidden" />}
      />
      <MediaEntryForm
        open={showMediaForm}
        onOpenChange={setShowMediaForm}
        onSubmit={(item) => {
          mediaService.addMedia(item);
        }}
      />
      <GymEntryForm
        open={showGymForm}
        onOpenChange={setShowGymForm}
        onSuccess={() => {
          window.dispatchEvent(new Event('gym-updated'));
        }}
      />
    </>
  );
}
