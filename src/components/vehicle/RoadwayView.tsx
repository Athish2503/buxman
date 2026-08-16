import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VehicleRate, FuelLog } from '@/types/modules';
import { RoadScene } from './RoadScene';
import { FuelStopSheet } from './FuelStopSheet';
import { JourneyFilters } from './JourneyFilters';
import { JourneyPlayback } from './JourneyPlayback';
import { JourneyStatsSheet } from './JourneyStatsSheet';
import { JourneyInsights } from './JourneyInsights';
import { JourneyCarousel } from './JourneyCarousel';
import { DateFilterOption, filterLogsByDate } from './roadway-utils';
import { Fuel, Plus, Maximize2, Minimize2, Settings, ArrowLeft, Car, Bike } from 'lucide-react';
import { haptics } from '@/lib/haptics';

interface RoadwayViewProps {
  vehicle: VehicleRate;
  vehicles?: VehicleRate[];
  onSelectVehicle?: (id: string) => void;
  logs: FuelLog[];
  onAddLog: () => void;
  onEditLog: (log: FuelLog) => void;
  onDeleteLog: (logId: string) => void;
  onManageVehicle: () => void;
  viewMode: 'roadway' | 'garage' | 'simple';
  onViewModeChange: (mode: 'roadway' | 'garage' | 'simple') => void;
}

export const RoadwayView: React.FC<RoadwayViewProps> = ({
  vehicle,
  vehicles = [],
  onSelectVehicle,
  logs,
  onAddLog,
  onEditLog,
  onDeleteLog,
  onManageVehicle,
  viewMode,
  onViewModeChange,
}) => {
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('ALL');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Filter logs according to active date range
  const filteredLogs = useMemo(() => {
    return filterLogsByDate(logs, dateFilter);
  }, [logs, dateFilter]);

  // Selected Fuel Log object for bottom sheet card
  const selectedLog = useMemo(() => {
    if (!selectedLogId) return null;
    return logs.find(l => l.id === selectedLogId) || null;
  }, [logs, selectedLogId]);

  // Stats calculation
  const stats = useMemo(() => {
    if (filteredLogs.length < 2) return null;

    const economyLogs = filteredLogs.filter(l => l.economy);
    const avgEconomy = economyLogs.length
      ? economyLogs.reduce((s, l) => s + l.economy!, 0) / economyLogs.length
      : 0;
    const totalSpent = filteredLogs.reduce((s, l) => s + l.totalCost, 0);
    const totalDist = filteredLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);

    const cleanLogs = filteredLogs.filter(l => l.distanceSinceLast !== undefined && !l.missedPreviousRefill);
    const cleanSpent = cleanLogs.reduce((s, l) => s + l.totalCost, 0);
    const cleanDist = cleanLogs.reduce((s, l) => s + (l.distanceSinceLast || 0), 0);
    const costPerKm = cleanDist > 0 ? cleanSpent / cleanDist : 0;

    return { avgEconomy, totalSpent, totalDist, costPerKm };
  }, [filteredLogs]);

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 transition-all duration-300 relative ${
        isFullscreen ? 'fixed inset-0 z-[9999] overflow-y-auto p-4 md:p-8 bg-slate-950' : 'pb-12'
      }`}
    >
      {/* Fleet Vehicle Switcher (if multiple vehicles exist) */}
      {vehicles.length > 1 && onSelectVehicle && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar px-1 mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-1 shrink-0">
            FLEET:
          </span>
          {vehicles.map(v => {
            const isActive = v.id === vehicle.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  haptics.selection();
                  onSelectVehicle(v.id);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-lg shadow-sky-500/10'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {v.icon === 'car' ? <Car className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5 text-emerald-400" />}
                <span>{v.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Top Mobile-First Header Bar */}
      <div className="flex items-center justify-between gap-2 py-3 px-1 mb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onManageVehicle}
            className="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-colors active:scale-95 shrink-0"
            aria-label="Manage Vehicle Settings"
          >
            {vehicle.icon === 'car' ? <Car className="h-5 w-5 text-sky-400" /> : <Bike className="h-5 w-5 text-emerald-400" />}
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-100 leading-tight">
              {vehicle.name}
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {vehicle.licensePlate || 'Fleet Vehicle'}
            </p>
          </div>
        </div>

        {/* View Mode Segmented Switcher */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner shrink-0">
          <button
            onClick={() => {
              haptics.selection();
              onViewModeChange('roadway');
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'roadway' ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Roadway
          </button>
          <button
            onClick={() => {
              haptics.selection();
              onViewModeChange('garage');
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'garage' ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Garage
          </button>
          <button
            onClick={() => {
              haptics.selection();
              onViewModeChange('simple');
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
              viewMode === 'simple' ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Logs
          </button>
        </div>
      </div>

      {/* Primary Layout Container (Responsive Desktop 3-Column Progressive Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Center Roadway Hero Column */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Controls Bar: Playback & Date Filter */}
          <div className="flex items-center justify-between gap-2 px-1 flex-wrap">
            <JourneyPlayback
              isPlaying={isPlaying}
              isCompleted={isCompleted}
              onPlay={() => {
                setIsPlaying(true);
                setIsCompleted(false);
              }}
              onPause={() => setIsPlaying(false)}
              onReplay={() => {
                setIsPlaying(true);
                setIsCompleted(false);
              }}
            />

            <div className="flex items-center gap-2">
              <JourneyFilters filter={dateFilter} onChange={setDateFilter} />

              <button
                onClick={() => {
                  haptics.selection();
                  setIsFullscreen(!isFullscreen);
                }}
                className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-all active:scale-90"
                aria-label="Toggle Fullscreen Roadway Mode"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Interactive SVG Road Scene Canvas */}
          <RoadScene
            vehicle={vehicle}
            logs={filteredLogs}
            selectedLogId={selectedLogId}
            onSelectLog={log => {
              haptics.light();
              setSelectedLogId(log.id);
            }}
            isPlaying={isPlaying}
            onPlaybackComplete={() => {
              setIsPlaying(false);
              setIsCompleted(true);
            }}
          />

          {/* Swipeable Interactive Journey Stop Cards Carousel */}
          <JourneyCarousel
            logs={filteredLogs}
            selectedLogId={selectedLogId}
            onSelectLog={log => {
              haptics.light();
              setSelectedLogId(log.id);
            }}
          />

          {/* Expandable Quick Stats Drawer */}
          <JourneyStatsSheet vehicle={vehicle} logs={filteredLogs} />
        </div>

        {/* Supporting Analytics & Insights Column (Progressive Desktop Enhancement) */}
        <div className="lg:col-span-4 space-y-4">
          <JourneyInsights logs={filteredLogs} stats={stats} />
        </div>
      </div>

      {/* Selected Checkpoint Bottom Sheet */}
      <FuelStopSheet
        log={selectedLog}
        onClose={() => setSelectedLogId(null)}
        onEdit={onEditLog}
        onDelete={onDeleteLog}
      />
    </div>
  );
};
