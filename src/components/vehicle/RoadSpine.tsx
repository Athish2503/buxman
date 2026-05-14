import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RoadSpineProps {
  efficiency?: number; // 0 to 1 where 1 is best
  isDashed?: boolean;
  isCracked?: boolean;
  isCurved?: boolean;
}

export const RoadSpine: React.FC<RoadSpineProps> = ({ 
  efficiency = 0.5, 
  isDashed = false, 
  isCracked = false,
  isCurved = false 
}) => {
  const { scrollYProgress } = useScroll();
  const laneY = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  // Dynamic glow color based on efficiency
  const glowColor = efficiency > 0.8 
    ? 'var(--neon-fuel)' 
    : efficiency < 0.4 
      ? 'var(--neon-warning)' 
      : 'var(--neon-amber)';

  return (
    <div className="absolute left-1/2 -translate-x-1/2 w-16 h-full flex justify-center pointer-events-none z-0">
      {/* Main Road Surface */}
      <div className={cn(
        "w-12 h-full bg-asphalt relative overflow-hidden transition-all duration-700",
        isCracked && "opacity-60 grayscale-[0.5] contrast-[1.2]",
        isCurved && "rounded-[100px]" // Subtle curve effect could be more complex with SVG
      )}>
        {/* Animated Lane Markers */}
        <motion.div 
          style={{ y: laneY }}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 w-[1px] h-[200%] opacity-40",
            isDashed ? "road-lane-line" : "bg-gradient-to-b from-primary/40 via-primary/80 to-primary/40 shadow-glow shadow-primary/20"
          )}
        />
        
        {/* Efficiency Glow */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none blur-xl transition-colors duration-1000"
          style={{ 
            background: `radial-gradient(circle at 50% 50%, hsl(${glowColor}) 0%, transparent 70%)` 
          }}
        />

        {/* Speed streak effects */}
        {efficiency > 0.9 && (
          <motion.div 
            animate={{ opacity: [0, 0.4, 0], y: ['-100%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-transparent via-white/10 to-transparent pointer-events-none"
          />
        )}
      </div>

      {/* Depth Blur / Shadow */}
      <div className="absolute -inset-x-4 inset-y-0 bg-black/40 blur-2xl -z-10" />
    </div>
  );
};
