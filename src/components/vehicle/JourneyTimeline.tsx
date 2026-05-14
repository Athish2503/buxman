import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { VehicleRate, FuelLog } from '@/types/modules';
import { HeroSection } from './HeroSection';
import { RoadSpine } from './RoadSpine';
import { CheckpointNode } from './CheckpointNode';
import { MilestoneNode } from './MilestoneNode';
import { FuelActionButton } from './FuelActionButton';

interface JourneyTimelineProps {
  vehicle: VehicleRate;
  logs: FuelLog[];
  onAddLog: () => void;
  onEditLog: (log: FuelLog) => void;
  onManageVehicle: () => void;
  viewMode: 'roadway' | 'simple';
  onViewModeChange: (mode: 'roadway' | 'simple') => void;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ vehicle, logs, onAddLog, onEditLog, onManageVehicle, viewMode, onViewModeChange }) => {
  const stats = useMemo(() => {
    if (logs.length < 2) return null;
    
    const economyLogs = logs.filter(l => l.economy);
    const avgEconomy = economyLogs.length ? economyLogs.reduce((s, l) => s + l.economy!, 0) / economyLogs.length : 0;
    const totalSpent = logs.reduce((s, l) => s + l.totalCost, 0);
    const totalDist = logs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
    const costPerKm = totalDist > 0 ? totalSpent / totalDist : 0;

    return { avgEconomy, totalSpent, totalDist, costPerKm };
  }, [logs]);

  // Insert milestones periodically
  const items = useMemo(() => {
    const combined: any[] = [];
    logs.forEach((log, index) => {
      combined.push({ type: 'log', data: log, index });
      
      // Inject milestones based on index or data
      if (index === 0 && logs.length > 3) {
         combined.push({ type: 'milestone', mType: 'best_efficiency', label: 'Fuel Efficiency Champion', sublabel: 'Consistent 18.2 km/l streak' });
      } else if (index === 2) {
         combined.push({ type: 'milestone', mType: 'longest_drive', label: 'Road Trip Weekend', sublabel: '486km journey completed' });
      } else if (log.totalCost > 5000) {
         combined.push({ type: 'milestone', mType: 'cost_increase', label: 'Peak Fuel Spend', sublabel: 'Tank full at premium rates' });
      }
    });
    return combined;
  }, [logs]);

  return (
    <div className="min-h-screen bg-journey text-foreground pb-40 relative">
      <HeroSection 
        vehicle={vehicle} 
        logs={logs} 
        stats={stats} 
        onManage={onManageVehicle}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      <div className="relative mt-10">
        <RoadSpine efficiency={stats ? stats.avgEconomy / 25 : 0.5} />

        <div className="container px-4 relative z-10">
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {item.type === 'log' ? (
                <CheckpointNode 
                  log={item.data} 
                  index={item.index} 
                  previousLog={logs[item.index + 1]} 
                  onClick={() => onEditLog(item.data)}
                />
              ) : (
                <MilestoneNode 
                  type={item.mType} 
                  label={item.label} 
                  sublabel={item.sublabel} 
                />
              )}
            </React.Fragment>
          ))}
          
          {logs.length === 0 && (
            <div className="py-40 text-center opacity-40">
              <p className="text-sm font-black uppercase tracking-widest">No journeys logged yet</p>
              <p className="text-xs font-bold mt-2">Start your road story by adding a fill-up</p>
            </div>
          )}
        </div>
      </div>

      <FuelActionButton onAdd={onAddLog} />
    </div>
  );
};
