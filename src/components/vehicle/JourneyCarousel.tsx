import React from 'react';
import { motion } from 'framer-motion';
import { FuelLog } from '@/types/modules';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Fuel, GaugeCircle, Receipt, ArrowRight } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface JourneyCarouselProps {
  logs: FuelLog[];
  selectedLogId: string | null;
  onSelectLog: (log: FuelLog) => void;
}

export const JourneyCarousel: React.FC<JourneyCarouselProps> = ({
  logs,
  selectedLogId,
  onSelectLog,
}) => {
  if (!logs.length) return null;

  // Sort descending (latest fill-up first for carousel)
  const sortedLogs = [...logs].sort((a, b) => b.odometer - a.odometer);

  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between px-1">
        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <Fuel className="h-3.5 w-3.5 text-sky-400" />
          Interactive Journey Stops ({sortedLogs.length})
        </h4>
        <span className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
          Swipe stops <ArrowRight className="h-2.5 w-2.5" />
        </span>
      </div>

      {/* Swipeable Horizontal Cards Track */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
        {sortedLogs.map((log, index) => {
          const isSelected = log.id === selectedLogId;
          const isLatest = index === 0;

          return (
            <motion.div
              key={log.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                haptics.light();
                onSelectLog(log);
              }}
              className={`min-w-[210px] max-w-[240px] p-3.5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between shadow-xl shrink-0 ${
                isSelected
                  ? 'bg-slate-900 border-sky-400 ring-2 ring-sky-400/30'
                  : isLatest
                  ? 'bg-slate-900/80 border-emerald-500/40 hover:border-emerald-400'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <span className="text-xs font-black text-slate-100 tracking-tight">
                      {log.station || 'Fuel Stop'}
                    </span>
                    {isLatest && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Latest
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">
                    {format(new Date(log.date), 'dd MMM yyyy')}
                  </span>
                </div>

                <span className="text-sm font-black font-mono text-emerald-400">
                  {formatCurrency(log.totalCost)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                <div className="flex items-center gap-1 text-slate-300 font-mono font-bold">
                  <GaugeCircle className="h-3 w-3 text-sky-400" />
                  {log.odometer.toLocaleString()} km
                </div>

                <span className="font-bold text-slate-400">
                  {log.economy ? `${log.economy.toFixed(1)} km/l` : `${log.liters}L`}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
