import React from 'react';
import { motion } from 'framer-motion';

export const RoadEnvironment: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Deep Space / Night Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b14] via-[#0b1220] to-[#111827]" />

      {/* Atmospheric Radial Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] opacity-60" />
      <div className="absolute bottom-10 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] opacity-40" />

      {/* Grid Perspective Floor lines (subtle terrain grid) */}
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Left Terrain Silhouette */}
      <svg
        className="absolute left-0 bottom-0 w-1/3 h-1/2 opacity-20 text-muted-foreground/30 pointer-events-none"
        viewBox="0 0 200 400"
        preserveAspectRatio="none"
      >
        <path
          d="M 0 400 L 0 200 Q 50 120 100 220 Q 150 280 200 400 Z"
          fill="currentColor"
        />
      </svg>

      {/* Right Terrain Silhouette */}
      <svg
        className="absolute right-0 bottom-0 w-1/3 h-1/2 opacity-20 text-muted-foreground/30 pointer-events-none"
        viewBox="0 0 200 400"
        preserveAspectRatio="none"
      >
        <path
          d="M 200 400 L 200 180 Q 140 100 90 240 Q 40 300 0 400 Z"
          fill="currentColor"
        />
      </svg>

      {/* Distant Star / Particle Sparkles */}
      <motion.div
        animate={{ opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-12 left-1/4 w-1.5 h-1.5 rounded-full bg-white/40 shadow-glow"
      />
      <motion.div
        animate={{ opacity: [0.2, 0.8, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        className="absolute top-20 right-1/3 w-1 h-1 rounded-full bg-primary/60"
      />
      <motion.div
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute top-36 left-2/3 w-1 h-1 rounded-full bg-emerald-400/50"
      />

      {/* Subtle Fog Layer */}
      <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-background via-background/40 to-transparent z-1" />
    </div>
  );
};
