import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fuel, Plus, X, Pencil, Camera, MapPin } from 'lucide-react';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface FuelActionButtonProps {
  onAdd: () => void;
  onScan?: () => void;
}

export const FuelActionButton: React.FC<FuelActionButtonProps> = ({ onAdd, onScan }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => {
    setIsOpen(!isOpen);
    haptics.medium();
  };

  const actions = [
    { icon: Pencil, label: 'Manual Log', color: 'bg-primary', onClick: onAdd },
    { icon: Camera, label: 'Scan Receipt', color: 'bg-neon-purple', onClick: onScan || onAdd },
    { icon: MapPin, label: 'Nearby Pump', color: 'bg-neon-amber', onClick: () => {} },
  ];

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="flex flex-col gap-3 mb-2"
          >
            {actions.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { action.onClick(); toggle(); }}
                className="flex items-center gap-3 group"
              >
                <span className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-black text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {action.label}
                </span>
                <div className={cn(
                  "h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-xl border border-white/20",
                  action.color
                )}>
                  <action.icon className="h-5 w-5" />
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={toggle}
        className={cn(
          "relative h-16 px-6 rounded-[2rem] flex items-center gap-3 text-white shadow-glow transition-all duration-500 overflow-hidden",
          isOpen ? "bg-black border border-white/20" : "bg-gradient-primary"
        )}
      >
        <div className="relative z-10 flex items-center gap-2">
          {isOpen ? <X className="h-6 w-6" /> : <Fuel className="h-6 w-6" />}
          {!isOpen && <span className="font-bold text-sm tracking-tight">Log Fuel</span>}
        </div>
        
        {/* Shine Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shine" />
      </motion.button>
    </div>
  );
};
