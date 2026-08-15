import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VehicleRate, FuelLog } from '@/types/modules';
import { ChevronDown, Fuel, Wrench, ShieldAlert, MapPin, CheckCircle2 } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface JourneyStatsSheetProps {
  vehicle: VehicleRate;
  logs: FuelLog[];
}

export const JourneyStatsSheet: React.FC<JourneyStatsSheetProps> = ({ vehicle, logs }) => {
  const [isOpen, setIsOpen] = useState(false);

  const totalLogs = logs.length;
  const fullTanks = logs.filter(l => l.isFullTank).length;
  const totalDist = logs.reduce((sum, l) => sum + (l.distanceSinceLast || 0), 0);
  const latestOdo = logs.length > 0 ? logs[0].odometer : 0;

  // Service math
  const serviceInterval = vehicle.serviceInterval;
  const lastServiceOdo = vehicle.lastServiceOdo || 0;
  const kmsSinceService = Math.max(0, latestOdo - lastServiceOdo);
  const serviceLeft = serviceInterval ? Math.max(0, serviceInterval - (kmsSinceService % serviceInterval)) : null;

  // Insurance math
  const daysToInsurance = vehicle.insuranceExpiry
    ? Math.ceil((new Date(vehicle.insuranceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <button
        onClick={() => {
          haptics.selection();
          setIsOpen(!isOpen);
        }}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Fuel className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-100 tracking-tight">Journey Quick Stats</h4>
            <p className="text-[10px] text-slate-400">{totalLogs} Fuel Logs recorded</p>
          </div>
        </div>

        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-slate-800/80 px-5 py-4 space-y-3 bg-slate-950/40"
          >
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Fuel Logs
                </span>
                <span className="font-mono font-bold text-slate-100">{totalLogs} Entries</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Full Tank Logs
                </span>
                <span className="font-mono font-bold text-emerald-400">{fullTanks} Refills</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Total Distance
                </span>
                <span className="font-mono font-bold text-sky-400">{totalDist.toLocaleString()} KM</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                  Next Service
                </span>
                <span className="font-mono font-bold text-slate-100">
                  {serviceLeft !== null ? `${serviceLeft.toLocaleString()} km` : 'Not Set'}
                </span>
              </div>
            </div>

            {daysToInsurance !== null && (
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" /> Insurance Expiry
                </span>
                <span className={`font-mono font-bold ${daysToInsurance < 30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {daysToInsurance > 0 ? `${daysToInsurance} days left` : 'Expired'}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
