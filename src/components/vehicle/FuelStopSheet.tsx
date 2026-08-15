import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Zap,
  DollarSign,
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

  return (
    <AnimatePresence>
      {log && (
        <div className="fixed inset-0 z-[9995] flex items-end justify-center pointer-events-none">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm pointer-events-auto"
            onClick={onClose}
          />

          {/* Bottom Sheet Modal Card */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-lg bg-slate-950 border-t border-slate-800 rounded-t-3xl p-6 shadow-2xl pointer-events-auto backdrop-blur-xl space-y-5 max-h-[90vh] overflow-y-auto z-10"
          >
            {/* Top Drag Handle */}
          <div className="flex justify-center -mt-2 mb-1">
            <div className="w-12 h-1.5 rounded-full bg-slate-700/60" />
          </div>

          {/* Header Section */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-glow">
                <Fuel className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-xl text-slate-100 tracking-tight">
                    {log.station || 'Fuel Station'}
                  </h3>
                  {log.isExpenseAdded && (
                    <Badge variant="outline" className="h-5 px-2 text-[9px] border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-black uppercase tracking-wider flex items-center gap-1">
                      <Receipt className="h-3 w-3" /> Expense Claim
                    </Badge>
                  )}
                  {log.missedPreviousRefill && (
                    <Badge variant="outline" className="h-5 px-2 text-[9px] border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold uppercase tracking-wider">
                      Missed Previous Refill
                    </Badge>
                  )}
                </div>
                <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mt-1">
                  <Calendar className="h-3.5 w-3.5 opacity-60 text-sky-400" />
                  {format(new Date(log.date), 'EEEE, dd MMMM yyyy')}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-8 w-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors"
              aria-label="Close details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Spend & Distance Highlights Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 flex items-center justify-between shadow-inner">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                Total Refill Cost
              </span>
              <span className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                {formatCurrency(log.totalCost)}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">
                Odometer Reading
              </span>
              <div className="flex items-center justify-end gap-1">
                <GaugeCircle className="h-4 w-4 text-sky-400" />
                <span className="text-xl font-black font-mono text-slate-100">
                  {log.odometer.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">KM</span>
              </div>
            </div>
          </div>

          {/* Full Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {/* Distance Since Last */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Distance Traveled
              </span>
              <span className="text-base font-black font-mono text-sky-400">
                +{log.distanceSinceLast || 0} km
              </span>
            </div>

            {/* Liters Filled */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Volume Filled
              </span>
              <span className="text-base font-black font-mono text-slate-100">
                {log.liters} L
              </span>
              <span className="text-[8px] font-bold text-slate-500 block">
                {log.isFullTank ? 'Full Tank' : 'Partial Tank'}
              </span>
            </div>

            {/* Price per Liter */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Price / Liter
              </span>
              <span className="text-base font-black font-mono text-slate-100">
                ₹{log.pricePerLiter}
              </span>
            </div>

            {/* Calculated Mileage */}
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                Fuel Efficiency
              </span>
              <span className="text-base font-black font-mono text-emerald-400 block">
                {log.economy ? `${log.economy.toFixed(1)} km/l` : '--'}
              </span>
              {log.economyTrend !== undefined && (
                <span className={`text-[9px] font-bold flex items-center justify-center gap-0.5 mt-0.5 ${log.economyTrend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {log.economyTrend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(log.economyTrend).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Efficiency Rating Pill */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/40 border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-slate-300">Mileage Performance</span>
            </div>
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border uppercase tracking-wider ${ecoRating.color}`}>
              {ecoRating.label}
            </span>
          </div>

          {/* Action Buttons: Edit & Delete */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => {
                haptics.light();
                onEdit(log);
                onClose();
              }}
              className="h-12 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm shadow-md"
            >
              <Pencil className="h-4 w-4 text-sky-400" />
              Edit Record
            </button>

            <button
              onClick={() => {
                haptics.heavy();
                if (log) onDelete(log.id);
                onClose();
              }}
              className="h-12 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 font-bold flex items-center justify-center gap-2 active:scale-95 transition-all text-sm shadow-md"
            >
              <Trash2 className="h-4 w-4" />
              Delete Record
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
