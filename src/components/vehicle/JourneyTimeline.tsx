import React from 'react';
import { VehicleRate, FuelLog } from '@/types/modules';
import { RoadwayView } from './RoadwayView';

interface JourneyTimelineProps {
  vehicle: VehicleRate;
  vehicles?: VehicleRate[];
  onSelectVehicle?: (id: string) => void;
  logs: FuelLog[];
  onAddLog: () => void;
  onEditLog: (log: FuelLog) => void;
  onDeleteLog?: (logId: string) => void;
  onManageVehicle: () => void;
  viewMode: 'roadway' | 'garage' | 'simple';
  onViewModeChange: (mode: 'roadway' | 'garage' | 'simple') => void;
}

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  vehicle,
  vehicles,
  onSelectVehicle,
  logs,
  onAddLog,
  onEditLog,
  onDeleteLog,
  onManageVehicle,
  viewMode,
  onViewModeChange,
}) => {
  return (
    <RoadwayView
      vehicle={vehicle}
      vehicles={vehicles}
      onSelectVehicle={onSelectVehicle}
      logs={logs}
      onAddLog={onAddLog}
      onEditLog={onEditLog}
      onDeleteLog={onDeleteLog || (() => {})}
      onManageVehicle={onManageVehicle}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
    />
  );
};
