import React, { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { VehicleRate, FuelLog } from '@/types/modules';
import { RoadEnvironment } from './RoadEnvironment';
import { RoadPath } from './RoadPath';
import { JourneyVehicle } from './JourneyVehicle';
import { JourneyCheckpoint } from './JourneyCheckpoint';
import { MilestoneSign } from './MilestoneSign';
import { JourneyHUD } from './JourneyHUD';
import {
  MilestoneItem,
  calculateNormalizedProgress,
  generateDynamicMilestones,
  getRoadPointAtProgress,
} from './roadway-utils';
import { haptics } from '@/lib/haptics';

interface RoadSceneProps {
  vehicle: VehicleRate;
  logs: FuelLog[];
  selectedLogId: string | null;
  onSelectLog: (log: FuelLog) => void;
  isPlaying: boolean;
  onPlaybackComplete: () => void;
}

export const RoadScene: React.FC<RoadSceneProps> = ({
  vehicle,
  logs,
  selectedLogId,
  onSelectLog,
  isPlaying,
  onPlaybackComplete,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Sort logs ascending by odometer for proper road positioning
  const sortedLogsAsc = React.useMemo(() => {
    return [...logs].sort((a, b) => a.odometer - b.odometer);
  }, [logs]);

  const minOdo = sortedLogsAsc.length ? sortedLogsAsc[0].odometer : 0;
  const maxOdo = sortedLogsAsc.length ? sortedLogsAsc[sortedLogsAsc.length - 1].odometer : 0;
  const latestLog = sortedLogsAsc.length ? sortedLogsAsc[sortedLogsAsc.length - 1] : null;

  // Generate milestone roadside signs
  const milestones = React.useMemo(() => {
    return generateDynamicMilestones(sortedLogsAsc);
  }, [sortedLogsAsc]);

  // Compute best economy
  const bestEconomy = React.useMemo(() => {
    const valid = logs.filter(l => l.economy);
    if (!valid.length) return 0;
    return Math.max(...valid.map(l => l.economy!));
  }, [logs]);

  // Vehicle playback animation progress (0..1)
  const [playbackProgress, setPlaybackProgress] = useState<number>(1);
  const animRef = useRef<number | null>(null);

  // Interactive drag / swipe progress state along road (0..1)
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      setPlaybackProgress(0);
      setDragProgress(null);
      let start: number | null = null;
      const duration = shouldReduceMotion ? 500 : 3500; // ms

      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(1, elapsed / duration);
        setPlaybackProgress(progress);

        if (progress < 1) {
          animRef.current = requestAnimationFrame(step);
        } else {
          onPlaybackComplete();
        }
      };

      animRef.current = requestAnimationFrame(step);
    } else {
      setPlaybackProgress(1);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, shouldReduceMotion]);

  // Selected Log normalized t calculation
  const selectedLogProgress = React.useMemo(() => {
    if (!selectedLogId || !sortedLogsAsc.length) return null;
    const found = sortedLogsAsc.find(l => l.id === selectedLogId);
    if (!found) return null;
    return calculateNormalizedProgress(found.odometer, minOdo, maxOdo);
  }, [selectedLogId, sortedLogsAsc, minOdo, maxOdo]);

  // Determine actual current vehicle position along road curve
  const currentVehicleT = isPlaying
    ? playbackProgress
    : dragProgress !== null
    ? dragProgress
    : selectedLogProgress !== null
    ? selectedLogProgress
    : 1;

  // Calculate coordinates & tangent angle for Vehicle
  const vehiclePos = getRoadPointAtProgress(currentVehicleT);

  // Touch Swipe Drag Handler along Roadway
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartTRef = useRef(1);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    isDraggingRef.current = true;
    dragStartYRef.current = clientY;
    dragStartTRef.current = currentVehicleT;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartYRef.current - clientY; // Dragging UP moves towards top (t=1)

    // Sensitivity scaling factor (approx 300px drag = full length)
    const deltaT = deltaY / 300;
    const newT = Math.max(0, Math.min(1, dragStartTRef.current + deltaT));
    setDragProgress(newT);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    // Snap to nearest checkpoint if drag progress is active
    if (dragProgress !== null && sortedLogsAsc.length > 0) {
      let closestLog = sortedLogsAsc[0];
      let minDiff = 999;

      sortedLogsAsc.forEach(l => {
        const logT = calculateNormalizedProgress(l.odometer, minOdo, maxOdo);
        const diff = Math.abs(logT - dragProgress);
        if (diff < minDiff) {
          minDiff = diff;
          closestLog = l;
        }
      });

      haptics.light();
      onSelectLog(closestLog);
    }
  };

  return (
    <div
      className="relative w-full h-[60vh] min-h-[420px] max-h-[640px] rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-950 select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* Background Atmosphere & Terrain */}
      <RoadEnvironment />

      {/* Main SVG Road Surface Canvas */}
      <svg
        className="relative z-10 w-full h-full"
        viewBox="0 0 400 1000"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Road Surface & Markings */}
        <RoadPath efficiencyRatio={bestEconomy > 0 ? Math.min(1, bestEconomy / 60) : 0.5} />

        {/* Dynamic Odometer Roadside Milestones */}
        {milestones.map(m => {
          const pt = getRoadPointAtProgress(m.t);
          const isPassed = currentVehicleT >= m.t;
          return (
            <MilestoneSign
              key={m.id}
              milestone={m}
              x={pt.point.x + 36}
              y={pt.point.y}
              isPassed={isPassed}
            />
          );
        })}

        {/* Touch-First Fuel Checkpoints */}
        {sortedLogsAsc.map((log, index) => {
          const t = calculateNormalizedProgress(log.odometer, minOdo, maxOdo);
          const pt = getRoadPointAtProgress(t);
          const isLatest = log.id === latestLog?.id;
          const isSelected = log.id === selectedLogId;

          return (
            <JourneyCheckpoint
              key={log.id}
              log={log}
              x={pt.point.x}
              y={pt.point.y}
              isLatest={isLatest}
              isSelected={isSelected}
              onSelect={() => {
                setDragProgress(t);
                onSelectLog(log);
              }}
              index={index}
            />
          );
        })}

        {/* Vehicle Hero sitting on the road curve */}
        {sortedLogsAsc.length > 0 && (
          <JourneyVehicle
            type={vehicle.icon === 'bike' ? 'bike' : 'car'}
            x={vehiclePos.point.x}
            y={vehiclePos.point.y}
            angleDeg={vehiclePos.angleDeg}
            isSelected={true}
            isMoving={isPlaying || isDraggingRef.current}
          />
        )}

        {/* Empty State Graphic on Road if no logs exist */}
        {sortedLogsAsc.length === 0 && (
          <g transform="translate(200, 500)" className="select-none">
            <rect x="-100" y="-40" width="200" height="80" rx="16" fill="#090d16" stroke="#334155" strokeWidth="1.5" />
            <text x="0" y="-10" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
              START YOUR JOURNEY
            </text>
            <text x="0" y="15" fill="#94a3b8" fontSize="10" textAnchor="middle">
              Log your first fuel fill-up to build the road
            </text>
          </g>
        )}
      </svg>

      {/* Floating HUD Metrics Overlay */}
      <JourneyHUD latestLog={latestLog} bestEconomy={bestEconomy} />
    </div>
  );
};
