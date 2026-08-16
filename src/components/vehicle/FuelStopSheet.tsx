import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { FuelLog } from '@/types/modules';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Fuel,
  Calendar,
  GaugeCircle,
  Pencil,
  Trash2,
  X,
  Receipt,
  TrendingUp,
  TrendingDown,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { haptics } from '@/lib/haptics';

interface FuelStopSheetProps {
  log: FuelLog | null;
  onClose: () => void;
  onEdit: (log: FuelLog) => void;
  onDelete: (logId: string) => void;
}

export const FuelStopSheet: React.FC<FuelStopSheetProps> = ({
  log,
  onClose,
  onEdit,
  onDelete,
}) => {
  useEffect(() => {
    if (log) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [log]);

  // Efficiency tier status
  const economyVal = log?.economy || 0;
  const ecoRating =
    economyVal >= 45
      ? { label: 'Excellent Mileage', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' }
      : economyVal >= 30
      ? { label: 'Good Efficiency', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' }
      : economyVal > 0
      ? { label: 'Moderate Efficiency', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' }
      : { label: 'Initial / Skipped', color: 'text-slate-400 bg-slate-800 border-slate-700' };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {log && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 pointer-events-auto">
          {/* Full-Screen Dismissable Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-0"
            onClick={() => {
              haptics.light();
              onClose();
            }}
          />

          {/* Centered Floating Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-[90vw] max-w-md bg-slate-950/95 border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-4 max-h-[82vh] overflow-y-auto text-slate-100 no-scrollbar my-auto"
          >
            {/* Header Section */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow shrink-0">
                  <Fuel className="h-5.5 w-5.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-lg text-slate-100 tracking-tight truncate">
                      {log.station || 'Fuel Station'}
                    </h3>
                    {log.isExpenseAdded && (
                      <Badge variant="outline" className="h-4.5 px-1.5 text-[8px] border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <Receipt className="h-2.5 w-2.5" /> Expense
                      </Badge>
                    )}
                    {log.missedPreviousRefill && (
                      <Badge variant="outline" className="h-4.5 px-1.5 text-[8px] border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider shrink-0">
                        Missed Refill
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="h-3 w-3 opacity-60 text-sky-400 shrink-0" />
                    {format(new Date(log.date), 'EEEE, dd MMMM yyyy')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onClose();
                }}
                className="h-8 w-8 rounded-full bg-slate-900 border border-slate-700/80 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors shrink-0 ml-2"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Spend & Distance Highlights Banner */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800/80 flex items-center justify-between shadow-inner">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                  Total Refill Cost
                </span>
                <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                  {formatCurrency(log.totalCost)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                  Odometer Reading
                </span>
                <div className="flex items-center justify-end gap-1">
                  <GaugeCircle className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-lg font-black font-mono text-slate-100">
                    {log.odometer.toLocaleString()}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">KM</span>
                </div>
              </div>
            </div>

            {/* Full Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              {/* Distance Since Last */}
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Distance Traveled
                </span>
                <span className="text-sm font-black font-mono text-sky-400">
                  +{log.distanceSinceLast || 0} km
                </span>
              </div>

              {/* Liters Filled */}
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Volume Filled
                </span>
                <span className="text-sm font-black font-mono text-slate-100">
                  {log.liters} L
                </span>
                <span className="text-[8px] font-bold text-slate-500 block mt-0.5">
                  {log.isFullTank ? 'Full Tank' : 'Partial Tank'}
                </span>
              </div>

              {/* Price per Liter */}
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Price / Liter
                </span>
                <span className="text-sm font-black font-mono text-slate-100">
                  ₹{log.pricePerLiter}
                </span>
              </div>

              {/* Calculated Mileage */}
              <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800/80">
                <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Fuel Efficiency
                </span>
                <span className="text-sm font-black font-mono text-emerald-400 block">
                  {log.economy ? `${log.economy.toFixed(1)} km/l` : '--'}
                </span>
                {log.economyTrend !== undefined && (
                  <span className={`text-[8.5px] font-bold flex items-center justify-center gap-0.5 mt-0.5 ${log.economyTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {log.economyTrend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                    {Math.abs(log.economyTrend).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>

            {/* Efficiency Rating Pill */}
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-900/40 border border-slate-800/80">
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-bold text-slate-300">Mileage Performance</span>
              </div>
              <span className={`px-2 py-0.5 rounded-xl text-[9px] font-black border uppercase tracking-wider ${ecoRating.color}`}>
                {ecoRating.label}
              </span>
            </div>

            {/* Action Buttons: Edit & Delete */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  haptics.light();
                  onEdit(log);
                  onClose();
                }}
                className="h-10 sm:h-11 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-100 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-xs shadow-md"
              >
                <Pencil className="h-3.5 w-3.5 text-sky-400" />
                Edit Record
              </button>

              <button
                type="button"
                onClick={() => {
                  haptics.heavy();
                  if (log) onDelete(log.id);
                  onClose();
                }}
                className="h-10 sm:h-11 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-xs shadow-md"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Record
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
