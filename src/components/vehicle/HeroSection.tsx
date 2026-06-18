import React from 'react';
import { motion } from 'framer-motion';
import { Car, TrendingUp, Zap, IndianRupee, MapPin, Settings2 } from 'lucide-react';
import { VehicleRate, FuelLog } from '@/types/modules';
import { formatCurrency, cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface HeroSectionProps {
  vehicle: VehicleRate;
  logs: FuelLog[];
  onManage: () => void;
  stats: {
    avgEconomy: number;
    totalSpent: number;
    totalDist: number;
    costPerKm: number;
  } | null;
  viewMode: 'roadway' | 'garage' | 'simple';
  onViewModeChange: (mode: 'roadway' | 'garage' | 'simple') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ vehicle, logs, stats, onManage, viewMode, onViewModeChange }) => {
  const latestOdo = logs.length > 0 ? logs[0].odometer : 0;
  
  return (
    <div className="relative pt-12 pb-20 px-6 overflow-hidden">
      <div className="mb-10 text-center flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-6">
           {/* View Mode Toggle */}
           <div className="flex items-center bg-surface-2 rounded-xl p-0.5 border border-border/50">
              <button 
                onClick={() => { onViewModeChange('roadway'); haptics.selection(); }}
                className={cn(
                  "px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-widest transition-all", 
                  viewMode === 'roadway' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Roadway
              </button>
              <button 
                onClick={() => { onViewModeChange('garage'); haptics.selection(); }}
                className={cn(
                  "px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-widest transition-all", 
                  viewMode === 'garage' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Garage Pro
              </button>
              <button 
                onClick={() => { onViewModeChange('simple'); haptics.selection(); }}
                className={cn(
                  "px-3 py-1.5 rounded-[10px] text-[10px] font-bold uppercase tracking-widest transition-all", 
                  viewMode === 'simple' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Logs
              </button>
           </div>

           <button 
             onClick={onManage}
             className="h-10 w-10 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
           >
             <Settings2 className="h-5 w-5" />
           </button>
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mb-1">
          {vehicle.name}
        </h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-60">
          {vehicle.licensePlate || 'Fleet Vehicle'}
        </p>
      </div>

      {/* Main Stats HUD */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-xl bg-card border border-border relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-3 opacity-5">
            <MapPin className="h-10 w-10" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Distance</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tracking-tight">
              {latestOdo.toLocaleString()}
            </span>
            <span className="text-xs font-bold opacity-45">KM</span>
          </div>
        </div>

        <div className="p-5 rounded-xl bg-card border border-border relative overflow-hidden group shadow-sm">
          <div className="absolute top-0 right-0 p-3 opacity-5">
            <TrendingUp className="h-10 w-10" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Avg. Mileage</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-mono tracking-tight text-primary">
              {stats?.avgEconomy.toFixed(1) || '--'}
            </span>
            <span className="text-xs font-bold opacity-45 uppercase">km/l</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats Strip */}
      <div className="flex items-center justify-between px-4 py-6 rounded-xl bg-card border border-border shadow-sm">
        <div className="text-center">
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">This Month</p>
          <p className="text-sm font-bold">{formatCurrency(stats?.totalSpent || 0)}</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Efficiency Trend</p>
          <div className="flex items-center justify-center gap-1">
             <Zap className="h-3 w-3 text-success" />
             <p className="text-sm font-bold text-success">+12.4%</p>
          </div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="text-center">
          <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Cost / KM</p>
          <p className="text-sm font-bold">₹{stats?.costPerKm.toFixed(2) || '0.00'}</p>
        </div>
      </div>


      {/* Fuel Wave Animation (CSS only) */}
      <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden opacity-30">
        <div className="fuel-wave" />
      </div>
    </div>
  );
};
