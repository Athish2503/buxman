import React from 'react';
import { motion } from 'framer-motion';
import { MilestoneItem } from './roadway-utils';

interface MilestoneSignProps {
  milestone: MilestoneItem;
  x: number;
  y: number;
  isPassed?: boolean;
}

export const MilestoneSign: React.FC<MilestoneSignProps> = ({
  milestone,
  x,
  y,
  isPassed = false,
}) => {
  return (
    <g transform={`translate(${x}, ${y})`} className="pointer-events-none select-none">
      {/* Roadside Post pole */}
      <line x1="0" y1="0" x2="0" y2="18" stroke="#475569" strokeWidth="2.5" />
      <circle cx="0" cy="18" r="3" fill="#1e293b" />

      {/* Illuminated Aura when Vehicle Passes */}
      {isPassed && (
        <motion.circle
          cx="0"
          cy="-10"
          r="24"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="1.5"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.4, 1], opacity: [0.8, 0, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Milestone Highway Sign Board */}
      <foreignObject x="-45" y="-28" width="90" height="34">
        <div
          className={`flex flex-col items-center justify-center rounded-lg border px-2 py-0.5 shadow-xl transition-all duration-500 ${
            isPassed
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-amber-500/20'
              : 'bg-slate-900/80 border-slate-700/80 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              {milestone.label}
            </span>
          </div>
          <span className="text-[7px] font-bold opacity-60 uppercase tracking-widest">
            MILESTONE
          </span>
        </div>
      </foreignObject>
    </g>
  );
};
