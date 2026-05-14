import React from 'react';
import { motion } from 'framer-motion';
import { Star, Trophy, AlertTriangle, Settings, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MilestoneType = 'best_efficiency' | 'longest_drive' | 'cost_increase' | 'service' | 'warning' | 'trip';

interface MilestoneNodeProps {
  type: MilestoneType;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

const milestoneStyles: Record<MilestoneType, { bg: string, text: string, icon: any }> = {
  best_efficiency: { bg: 'bg-success/20', text: 'text-success', icon: Trophy },
  longest_drive: { bg: 'bg-primary/20', text: 'text-primary', icon: Star },
  cost_increase: { bg: 'bg-destructive/20', text: 'text-destructive', icon: TrendingUp },
  service: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Settings },
  warning: { bg: 'bg-warning/20', text: 'text-warning', icon: AlertTriangle },
  trip: { bg: 'bg-neon-purple/20', text: 'text-neon-purple', icon: TrendingDown },
};

export const MilestoneNode: React.FC<MilestoneNodeProps> = ({ type, label, sublabel }) => {
  const style = milestoneStyles[type];
  const Icon = style.icon;

  return (
    <div className="relative w-full py-12 flex justify-center items-center">
      {/* Road Break / Distortion Effect */}
      <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-transparent via-white/5 to-transparent blur-xl pointer-events-none" />
      
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        className={cn(
          "relative z-20 px-8 py-3 rounded-full border flex items-center gap-4 shadow-xl backdrop-blur-xl",
          style.bg,
          `border-${style.text.split('-')[1]}/30`
        )}
      >
        <div className={cn("p-2 rounded-full", `bg-${style.text.split('-')[1]}/20`)}>
           <Icon className={cn("h-4 w-4", style.text)} />
        </div>
        <div>
          <p className={cn("text-sm font-black tracking-tight", style.text)}>{label}</p>
          {sublabel && <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">{sublabel}</p>}
        </div>
      </motion.div>

      {/* Decorative Road Marks */}
      <div className="absolute left-1/2 -translate-x-1/2 w-32 h-px bg-white/10" />
    </div>
  );
};
