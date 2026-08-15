import React from 'react';
import { motion } from 'framer-motion';

interface JourneyVehicleProps {
  type: 'car' | 'bike';
  x: number;
  y: number;
  angleDeg: number;
  isSelected?: boolean;
  isMoving?: boolean;
}

export const JourneyVehicle: React.FC<JourneyVehicleProps> = ({
  type,
  x,
  y,
  angleDeg,
  isSelected = true,
  isMoving = false,
}) => {
  // Angle correction: screen y points down. The road goes from bottom to top.
  // Angle calculated from Bezier derivative points upwards when going from t=0 to t=1.
  // We align vehicle nose along direction of travel (-90° compensation for SVG facing top).
  const rotation = angleDeg - 90;

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation})`}
      className="transition-transform duration-300 ease-out cursor-pointer"
      aria-label={`${type === 'bike' ? 'Motorcycle' : 'Car'} Hero Vehicle`}
    >
      {/* Drop Shadow under Vehicle */}
      <ellipse
        cx="0"
        cy="8"
        rx={type === 'bike' ? 16 : 24}
        ry={type === 'bike' ? 28 : 38}
        fill="rgba(0,0,0,0.65)"
        filter="blur(6px)"
      />

      {/* Headlight Beam Glow (facing forward/upward) */}
      <polygon
        points={type === 'bike' ? "-20,-90 20,-90 9,-22 -9,-22" : "-28,-100 28,-100 16,-28 -16,-28"}
        fill="url(#headlightGradient)"
        opacity={isSelected ? 0.7 : 0.35}
      />

      {/* Headlight SVG Definition */}
      <defs>
        <linearGradient id="headlightGradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="rgba(56, 189, 248, 0.5)" />
          <stop offset="60%" stopColor="rgba(56, 189, 248, 0.2)" />
          <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
        </linearGradient>

        <linearGradient id="carBodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        <linearGradient id="bikeBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>

      {type === 'bike' ? (
        /* MOTORCYCLE (BIKE) HIGH-DETAIL VECTOR ASSET */
        <motion.g
          animate={isMoving ? { y: [-1.5, 1.5, -1.5] } : { y: [0, -2, 0] }}
          transition={{ duration: isMoving ? 0.25 : 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Rear Tire */}
          <rect x="-4.5" y="16" width="9" height="16" rx="3.5" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
          {/* Front Tire */}
          <rect x="-3.5" y="-30" width="7" height="16" rx="3" fill="#090d16" stroke="#334155" strokeWidth="1.5" />

          {/* Exhaust Pipes */}
          <rect x="5.5" y="4" width="3.5" height="18" rx="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="0.5" />
          <rect x="-9" y="4" width="3.5" height="18" rx="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="0.5" />

          {/* Engine & Chasis Core */}
          <rect x="-6" y="-6" width="12" height="18" rx="2" fill="#1e293b" stroke="#334155" strokeWidth="1" />

          {/* Fuel Tank & Fairing */}
          <path
            d="M -8,16 L -10,-2 L -6,-18 L 0,-24 L 6,-18 L 10,-2 L 8,16 Z"
            fill="url(#bikeBodyGrad)"
            stroke="#047857"
            strokeWidth="1.5"
          />

          {/* Rider Leather Seat */}
          <rect x="-5.5" y="-2" width="11" height="14" rx="3.5" fill="#0f172a" stroke="#1e293b" strokeWidth="1" />

          {/* Front Forks */}
          <line x1="-5" y1="-26" x2="-8" y2="-16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
          <line x1="5" y1="-26" x2="8" y2="-16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />

          {/* Handlebars */}
          <line x1="-16" y1="-16" x2="16" y2="-16" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />
          <rect x="-17" y="-17" width="4" height="2" fill="#0f172a" rx="0.5" />
          <rect x="13" y="-17" width="4" height="2" fill="#0f172a" rx="0.5" />

          {/* Rear View Mirrors */}
          <circle cx="-14" cy="-21" r="2.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" />
          <circle cx="14" cy="-21" r="2.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1" />

          {/* Front Headlight Light Unit */}
          <circle cx="0" cy="-24" r="5" fill="#f0f9ff" stroke="#38bdf8" strokeWidth="1.5" />
          <circle cx="0" cy="-24" r="2.5" fill="#ffffff" />
        </motion.g>
      ) : (
        /* CAR HIGH-DETAIL VECTOR ASSET */
        <motion.g
          animate={isMoving ? { y: [-1.5, 1.5, -1.5] } : { y: [0, -2, 0] }}
          transition={{ duration: isMoving ? 0.25 : 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Tires */}
          <rect x="-22" y="-22" width="6" height="15" rx="2.5" fill="#090d16" stroke="#334155" strokeWidth="1" />
          <rect x="16" y="-22" width="6" height="15" rx="2.5" fill="#090d16" stroke="#334155" strokeWidth="1" />
          <rect x="-22" y="10" width="6" height="15" rx="2.5" fill="#090d16" stroke="#334155" strokeWidth="1" />
          <rect x="16" y="10" width="6" height="15" rx="2.5" fill="#090d16" stroke="#334155" strokeWidth="1" />

          {/* Car Outer Aerodynamic Body */}
          <path
            d="M -19,-28 C -19,-33 -11,-35 0,-35 C 11,-35 19,-33 19,-28 L 20,22 C 20,28 13,30 0,30 C -13,30 -20,28 -20,22 Z"
            fill="url(#carBodyGrad)"
            stroke="#0284c7"
            strokeWidth="1.5"
          />

          {/* Cabin Roof & Windows */}
          <path
            d="M -14,-16 C -14,-20 -7,-22 0,-22 C 7,-22 14,-20 14,-16 L 15,9 C 15,13 9,14 0,14 C -9,14 -15,13 -15,9 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1"
          />
          {/* Front Glass */}
          <path d="M -12,-14 C -6,-18 6,-18 12,-14 L 13,-5 L -13,-5 Z" fill="#38bdf8" opacity="0.8" />
          {/* Rear Glass */}
          <path d="M -11,7 C -5,5 5,5 11,7 L 10,11 L -10,11 Z" fill="#38bdf8" opacity="0.65" />

          {/* Side Mirrors */}
          <rect x="-23" y="-13" width="4.5" height="7" rx="1.5" fill="#0ea5e9" />
          <rect x="18.5" y="-13" width="4.5" height="7" rx="1.5" fill="#0ea5e9" />

          {/* Front Headlight Lenses */}
          <circle cx="-14" cy="-33" r="4" fill="#ffffff" stroke="#38bdf8" strokeWidth="1" />
          <circle cx="14" cy="-33" r="4" fill="#ffffff" stroke="#38bdf8" strokeWidth="1" />

          {/* Rear Taillights */}
          <rect x="-17" y="27" width="7" height="2.5" rx="1" fill="#ef4444" />
          <rect x="10" y="27" width="7" height="2.5" rx="1" fill="#ef4444" />
        </motion.g>
      )}

      {/* Hero Vehicle Active Ring Indicator */}
      {isSelected && (
        <circle
          cx="0"
          cy="0"
          r={type === 'bike' ? 30 : 40}
          fill="none"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          className="animate-spin-slow opacity-60"
        />
      )}
    </g>
  );
};
