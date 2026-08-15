import React from 'react';
import { motion } from 'framer-motion';
import { FuelLog } from '@/types/modules';
import { formatCurrency } from '@/lib/utils';
import { GaugeCircle, Zap, IndianRupee } from 'lucide-react';

interface JourneyHUDProps {
  latestLog: FuelLog | null;
  bestEconomy: number;
}

export const JourneyHUD: React.FC<JourneyHUDProps> = ({ latestLog, bestEconomy }) => {
  const odometerDisplay = latestLog ? latestLog.odometer.toLocaleString() : '0';
  const latestCostDisplay = latestLog ? formatCurrency(latestLog.totalCost) : '₹0';

  return (
    <div className="absolute inset-x-4 top-4 bottom-4 pointer-events-none flex flex-col justify-between z-20">
      {/* Top Floating Glassmorphic HUD - Odometer Readout */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="self-center bg-slate-950/70 border border-slate-700/50 backdrop-blur-xl rounded-2xl px-5 py-2.5 shadow-2xl flex items-center gap-3 pointer-events-auto"
      >
        <div className="h-9 w-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <GaugeCircle className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
            Latest Odometer
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black font-mono text-slate-100 tracking-tight">
              {odometerDisplay}
            </span>
            <span className="text-[10px] font-bold text-sky-400 uppercase">KM</span>
          </div>
        </div>
      </motion.div>

      {/* Bottom Floating Telemetry Strip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-3 pointer-events-auto"
      >
        {/* Best Economy Pill */}
        <div className="flex-1 bg-slate-950/70 border border-slate-700/50 backdrop-blur-xl rounded-2xl p-3 shadow-xl flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block truncate">
              Best Economy
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black font-mono text-emerald-400">
                {bestEconomy > 0 ? bestEconomy.toFixed(1) : '--'}
              </span>
              <span className="text-[9px] font-bold opacity-60 uppercase">km/l</span>
            </div>
          </div>
        </div>

        {/* Latest Refill Cost Pill */}
        <div className="flex-1 bg-slate-950/70 border border-slate-700/50 backdrop-blur-xl rounded-2xl p-3 shadow-xl flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
            <IndianRupee className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block truncate">
              Latest Fuel
            </span>
            <span className="text-sm font-black font-mono text-amber-300 block truncate">
              {latestCostDisplay}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
