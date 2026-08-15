import React from 'react';
import { ROAD_CONTROL_POINTS } from './roadway-utils';

interface RoadPathProps {
  efficiencyRatio?: number; // 0..1
}

export const RoadPath: React.FC<RoadPathProps> = ({ efficiencyRatio = 0.5 }) => {
  const { p0, p1, p2, p3 } = ROAD_CONTROL_POINTS;

  // Path string for cubic Bezier
  const pathD = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;

  // Glow color based on efficiency
  const strokeGlow =
    efficiencyRatio > 0.75
      ? 'rgba(16, 185, 129, 0.5)'
      : efficiencyRatio < 0.45
      ? 'rgba(239, 68, 68, 0.5)'
      : 'rgba(56, 189, 248, 0.5)';

  return (
    <g className="road-path-layer">
      <defs>
        {/* Asphalt Texture Gradient */}
        <linearGradient id="asphaltGradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#182232" />
          <stop offset="50%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#090d16" />
        </linearGradient>

        {/* Lane Line Dash Glow */}
        <filter id="laneGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id="roadBedShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="12" result="blur" />
        </filter>
      </defs>

      {/* Road Ambient Underglow */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeGlow}
        strokeWidth="90"
        strokeLinecap="round"
        filter="url(#roadBedShadow)"
        opacity="0.6"
      />

      {/* Outer Gravel Shoulder / Curb */}
      <path
        d={pathD}
        fill="none"
        stroke="#1e293b"
        strokeWidth="64"
        strokeLinecap="round"
      />

      {/* Outer White Edge Lines */}
      <path
        d={pathD}
        fill="none"
        stroke="#334155"
        strokeWidth="56"
        strokeLinecap="round"
      />

      {/* Main Dark Asphalt Surface */}
      <path
        d={pathD}
        fill="none"
        stroke="url(#asphaltGradient)"
        strokeWidth="52"
        strokeLinecap="round"
      />

      {/* Inner White Guard/Edge Lines */}
      <path
        d={pathD}
        fill="none"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="46"
        strokeLinecap="round"
      />
      <path
        d={pathD}
        fill="none"
        stroke="url(#asphaltGradient)"
        strokeWidth="44"
        strokeLinecap="round"
      />

      {/* Animated Center Dash Lane Line */}
      <path
        d={pathD}
        fill="none"
        stroke="#38bdf8"
        strokeWidth="3.5"
        strokeDasharray="14 18"
        strokeLinecap="round"
        filter="url(#laneGlow)"
        opacity="0.85"
      />

      {/* Secondary Inner Bright Core Dash */}
      <path
        d={pathD}
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeDasharray="14 18"
        strokeLinecap="round"
        opacity="0.9"
      />
    </g>
  );
};
