import React from 'react';
import { motion } from 'framer-motion';
import { Fuel, MapPin, Gauge, Clock, CloudRain, Sun, Moon, Wind, Info, Receipt } from 'lucide-react';
import { FuelLog } from '@/types/modules';
import { format } from 'date-fns';
import { cn, formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CheckpointNodeProps {
  log: FuelLog;
  previousLog?: FuelLog;
  index: number;
  onClick?: () => void;
}

export const CheckpointNode: React.FC<CheckpointNodeProps> = ({ log, index, onClick }) => {

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      onClick={onClick}
      className={cn(
        "relative w-full flex items-center gap-6 mb-24 cursor-pointer active:scale-95 transition-transform",
        index % 2 === 0 ? "flex-row-reverse text-right" : "flex-row text-left"
      )}
    >
      {/* Connector line to road */}
      <div className={cn(
        "flex-1 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent",
        index % 2 === 0 ? "bg-gradient-to-l" : ""
      )} />

      {/* Content Card */}
      <div className="flex-[4] max-w-[280px]">
        <div className="group relative">
          {/* Station Logo / Branding */}
          <div className={cn(
            "flex items-center gap-2 mb-3 flex-wrap",
            index % 2 === 0 ? "justify-end" : "justify-start"
          )}>
            <div className="h-6 w-6 rounded-md bg-white/5 flex items-center justify-center border border-white/10">
              <Fuel className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest opacity-60">
              {log.station || 'IndianOil'}
            </span>
            {log.isExpenseAdded && (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[8px] border-primary/30 bg-primary/10 text-primary font-bold uppercase tracking-wider flex items-center gap-1">
                <Receipt className="h-2.5 w-2.5" /> Expense
              </Badge>
            )}
            {log.missedPreviousRefill && (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[8px] border-warning/30 bg-warning/5 text-warning font-bold uppercase tracking-wider">
                Missed Refill
              </Badge>
            )}
          </div>

          {/* Main Info */}
          <div className="space-y-1 mb-4">
            <h4 className="text-2xl font-black tracking-tighter text-foreground leading-none">
              {formatCurrency(log.totalCost)}
            </h4>
            <p className="text-xs font-bold text-muted-foreground opacity-80">
              {log.liters} Liters filled
            </p>
          </div>

          {/* Stats Grid */}
          <div className={cn(
            "grid grid-cols-2 gap-4 pt-4 border-t border-white/5",
            index % 2 === 0 ? "text-right" : "text-left"
          )}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-0.5">Distance</p>
              <p className="text-sm font-bold">+{log.distanceSinceLast || 0} km</p>
              {log.missedPreviousRefill && (
                <span className="block text-[8px] text-warning/70 font-semibold mt-0.5">(spans gap)</span>
              )}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-success/60 mb-0.5">Efficiency</p>
              <p className="text-sm font-bold text-success text-glow-fuel">
                {log.economy ? `${log.economy.toFixed(1)} km/l` : '--'}
              </p>
              {log.missedPreviousRefill && (
                <span className="block text-[8px] text-warning/75 font-semibold mt-0.5">(skipped)</span>
              )}
            </div>
          </div>

          {/* Simple Odometer Tag */}
          <div className={cn(
            "mt-3",
            index % 2 === 0 ? "text-right" : "text-left"
          )}>
            <span className="text-[10px] font-black font-mono tracking-widest opacity-30">
              ODO: {log.odometer.toLocaleString()} KM
            </span>
          </div>
        </div>
      </div>

      {/* The Checkpoint Node on the road */}
      <div className="absolute left-1/2 -translate-x-1/2 z-10">
        <motion.div 
          whileHover={{ scale: 1.2 }}
          className="h-4 w-4 rounded-full bg-background border-2 border-primary/30 relative"
        >
          {/* Animated Glow Ring */}
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0.2, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -inset-2 rounded-full bg-primary/20 blur-sm"
          />
          {/* Inner Light */}
          <div className="absolute inset-0.5 rounded-full bg-primary shadow-glow" />
        </motion.div>
        
        {/* Date Stamp on Road */}
        <div className="absolute top-1/2 -translate-y-1/2 left-8 whitespace-nowrap">
           <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-30">
             {format(new Date(log.date), 'dd MMM')}
           </span>
        </div>
      </div>

      <div className="flex-[4]" />
    </motion.div>
  );
};
