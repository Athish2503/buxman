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
  viewMode: 'roadway' | 'simple';
  onViewModeChange: (mode: 'roadway' | 'simple') => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ vehicle, logs, stats, onManage, viewMode, onViewModeChange }) => {
  const latestOdo = logs.length > 0 ? logs[0].odometer : 0;
  
  return (
    <div className="relative pt-12 pb-20 px-6 overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-20 -left-20 w-[500px] h-[500px] bg-primary/20 blur-[150px] rounded-full -z-10 animate-aurora-drift" />
      <div className="absolute top-40 -right-20 w-[400px] h-[400px] bg-neon-purple/10 blur-[120px] rounded-full -z-10 animate-aurora-drift" style={{ animationDelay: '-2s' }} />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-t from-background to-transparent -z-10" />

      {/* Header */}
      <div className="mb-10 text-center flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-6">
           {/* View Mode Toggle */}
           <div className="flex items-center bg-white/5 rounded-xl p-0.5 border border-white/5">
              <button 
                onClick={() => { onViewModeChange('roadway'); haptics.selection(); }}
                className={cn(
                  "px-3 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all", 
                  viewMode === 'roadway' ? "bg-primary text-white shadow-glow" : "text-white/40 hover:text-white/60"
                )}
              >
                Roadway
              </button>
              <button 
                onClick={() => { onViewModeChange('simple'); haptics.selection(); }}
                className={cn(
                  "px-3 py-1.5 rounded-[10px] text-[10px] font-black uppercase tracking-widest transition-all", 
                  viewMode === 'simple' ? "bg-primary text-white shadow-glow" : "text-white/40 hover:text-white/60"
                )}
              >
                Simple
              </button>
           </div>

           <button 
             onClick={onManage}
             className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
           >
             <Settings2 className="h-5 w-5" />
           </button>
        </div>
        
        <h1 className="text-4xl font-black tracking-tighter mb-1">
          {vehicle.name}
        </h1>
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest opacity-40">
          {vehicle.licensePlate || 'Fleet Vehicle'}
        </p>
      </div>

      {/* Main Stats HUD */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-5 rounded-[2rem] bg-card/40 glass border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <MapPin className="h-10 w-10" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Distance</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono tracking-tighter">
              {latestOdo.toLocaleString()}
            </span>
            <span className="text-xs font-bold opacity-30">KM</span>
          </div>
        </div>

        <div className="p-5 rounded-[2rem] bg-card/40 glass border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="h-10 w-10" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Avg. Mileage</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black font-mono tracking-tighter text-primary">
              {stats?.avgEconomy.toFixed(1) || '--'}
            </span>
            <span className="text-xs font-bold opacity-30 uppercase">km/l</span>
          </div>
        </div>
      </div>

      {/* Secondary Stats Strip */}
      <div className="flex items-center justify-between px-4 py-6 rounded-[2rem] bg-white/5 border border-white/5 backdrop-blur-md">
        <div className="text-center">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">This Month</p>
          <p className="text-sm font-black">{formatCurrency(stats?.totalSpent || 0)}</p>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Efficiency Trend</p>
          <div className="flex items-center justify-center gap-1">
             <Zap className="h-3 w-3 text-success" />
             <p className="text-sm font-black text-success">+12.4%</p>
          </div>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div className="text-center">
          <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Cost / KM</p>
          <p className="text-sm font-black">₹{stats?.costPerKm.toFixed(2) || '0.00'}</p>
        </div>
      </div>


      {/* Fuel Wave Animation (CSS only) */}
      <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden opacity-30">
        <div className="fuel-wave" />
      </div>
    </div>
  );
};
