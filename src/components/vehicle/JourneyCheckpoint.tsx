import React from 'react';
import { motion } from 'framer-motion';
import { FuelLog } from '@/types/modules';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface JourneyCheckpointProps {
  log: FuelLog;
  x: number;
  y: number;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

export const JourneyCheckpoint: React.FC<JourneyCheckpointProps> = ({
  log,
  x,
  y,
  isLatest,
  isSelected,
  onSelect,
  index,
}) => {
  const isLeft = index % 2 === 0;

  const handleClick = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    onSelect();
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={handleClick}
      onPointerDown={handleClick}
      className="cursor-pointer group select-none"
      role="button"
      tabIndex={0}
      aria-label={`Fuel stop at ${log.station || 'Station'}, ${log.odometer} km, ${formatCurrency(log.totalCost)}`}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Touch Target Area (64x64px hit area with SVG pointer-events=all) */}
      <circle
        cx="0"
        cy="0"
        r="32"
        fill="rgba(0,0,0,0.001)"
        pointerEvents="all"
      />

      {/* Pulsing Outer Glow Ring */}
      <motion.circle
        cx="0"
        cy="0"
        r={isLatest ? 18 : 14}
        fill="none"
        stroke={isLatest ? '#10b981' : isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)'}
        strokeWidth={isLatest || isSelected ? 3 : 2}
        animate={
          isLatest
            ? { scale: [1, 1.3, 1], opacity: [0.9, 0.4, 0.9] }
            : isSelected
            ? { scale: [1, 1.2, 1], opacity: [0.8, 0.4, 0.8] }
            : { scale: 1, opacity: 0.5 }
        }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        pointerEvents="none"
      />

      {/* Secondary Pulse Ripple for Latest */}
      {isLatest && (
        <motion.circle
          cx="0"
          cy="0"
          r="26"
          fill="none"
          stroke="#10b981"
          strokeWidth="1.5"
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
          pointerEvents="none"
        />
      )}

      {/* Outer Marker Disk */}
      <circle
        cx="0"
        cy="0"
        r={isLatest ? 12 : 9}
        fill={isLatest ? '#064e3b' : isSelected ? '#0369a1' : '#0f172a'}
        stroke={isLatest ? '#34d399' : isSelected ? '#38bdf8' : '#64748b'}
        strokeWidth="2.5"
        className="transition-transform group-hover:scale-125"
        pointerEvents="none"
      />

      {/* Inner Dot Core */}
      <circle
        cx="0"
        cy="0"
        r={isLatest ? 5 : 3.5}
        fill={isLatest ? '#34d399' : isSelected ? '#38bdf8' : '#cbd5e1'}
        pointerEvents="none"
      />

      {/* Embedded Label Tag */}
      <foreignObject
        x={isLeft ? -140 : 16}
        y={-24}
        width="126"
        height="52"
        className="overflow-visible pointer-events-auto"
        onClick={handleClick}
      >
        <div
          className={`flex flex-col cursor-pointer ${
            isLeft ? 'items-end text-right' : 'items-start text-left'
          }`}
        >
          {isLatest && (
            <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-glow mb-0.5">
              LATEST STOP
            </span>
          )}

          <div
            className={`bg-slate-900/95 backdrop-blur-md border rounded-xl px-2.5 py-1 shadow-xl flex flex-col transition-all ${
              isSelected ? 'border-sky-400 ring-2 ring-sky-400/30' : 'border-slate-700/80 hover:border-slate-500'
            }`}
          >
            <span className="text-[11px] font-black text-slate-100 tracking-tight leading-tight">
              {formatCurrency(log.totalCost)}
            </span>
            <span className="text-[8px] font-bold text-slate-400 tracking-wider">
              {log.odometer.toLocaleString()} km · {format(new Date(log.date), 'dd MMM')}
            </span>
          </div>
        </div>
      </foreignObject>
    </g>
  );
};
