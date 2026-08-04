import React, { useState, useEffect } from 'react';
import {
  Dumbbell, Flame, Scale, Camera, Plus, Trophy,
  Calendar, Clock, Trash2, Activity, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { Button } from '@/components/ui/button';
import { WorkoutLog, BodyMetricLog, WorkoutRoutine } from '@/types/gym';
import { gymService } from '@/lib/gym-storage';
import { GymEntryForm } from './GymEntryForm';
import { WeightTrackerModal } from './WeightTrackerModal';
import { ProgressPhotoGallery } from './ProgressPhotoGallery';
import { RoutineManager } from './RoutineManager';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

export const GymDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workouts' | 'weight' | 'photos' | 'routines'>('workouts');
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>(() => gymService.getWorkoutLogs());
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricLog[]>(() => gymService.getBodyMetrics());
  
  // Modals
  const [isGymFormOpen, setIsGymFormOpen] = useState<boolean>(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState<boolean>(false);

  const refreshData = () => {
    setWorkoutLogs(gymService.getWorkoutLogs());
    setBodyMetrics(gymService.getBodyMetrics());
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('gym-updated', handleUpdate);
    return () => window.removeEventListener('gym-updated', handleUpdate);
  }, []);

  // Compute Weekly Stats
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const thisWeekLogs = workoutLogs.filter(w => new Date(w.date) >= startOfWeek);
  const totalVolumeThisWeek = thisWeekLogs.reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0);

  // Latest weight & delta
  const latestMetric = bodyMetrics[bodyMetrics.length - 1];
  const previousMetric = bodyMetrics.length >= 2 ? bodyMetrics[bodyMetrics.length - 2] : null;
  const weightDelta = latestMetric && previousMetric ? latestMetric.weightKg - previousMetric.weightKg : 0;

  const handleStartRoutine = (routine: WorkoutRoutine) => {
    setIsGymFormOpen(true);
  };

  const handleDeleteWorkout = (id: string) => {
    gymService.deleteWorkoutLog(id);
    toast.success('Workout deleted');
    refreshData();
  };

  // Recharts weight data
  const chartData = bodyMetrics.map(m => ({
    date: m.date.slice(5),
    weight: m.weightKg,
    bodyFat: m.bodyFatPercentage,
  }));

  return (
    <div className="space-y-5 pb-20">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <Dumbbell className="w-7 h-7 text-emerald-400" />
            Gym & Fitness
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log workouts, track daily body weight, and measure transformation.
          </p>
        </div>

        <Button
          onClick={() => {
            haptics.medium();
            setIsGymFormOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-10 px-4 font-bold shadow-lg shadow-emerald-500/20 text-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Gym Entry
        </Button>
      </div>

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Workouts this week */}
        <div className="bg-card/70 border border-border/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">This Week</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-foreground">{thisWeekLogs.length} Sessions</div>
            <span className="text-[10px] text-emerald-400 font-medium">Goal: 4/week</span>
          </div>
        </div>

        {/* Current Body Weight */}
        <div className="bg-card/70 border border-border/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Body Weight</span>
            <Scale className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-foreground">
              {latestMetric ? `${latestMetric.weightKg} kg` : '--'}
            </div>
            {weightDelta !== 0 && (
              <span className={`text-[10px] font-medium flex items-center gap-0.5 ${weightDelta < 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {weightDelta < 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                {Math.abs(weightDelta).toFixed(1)} kg delta
              </span>
            )}
          </div>
        </div>

        {/* Weekly Volume */}
        <div className="bg-card/70 border border-border/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Volume Lifted</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-foreground">
              {(totalVolumeThisWeek / 1000).toFixed(1)}k kg
            </div>
            <span className="text-[10px] text-muted-foreground font-medium">This week total</span>
          </div>
        </div>

        {/* Total Logged */}
        <div className="bg-card/70 border border-border/50 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold">Total Logged</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-foreground">{workoutLogs.length}</div>
            <span className="text-[10px] text-muted-foreground font-medium">All time workouts</span>
          </div>
        </div>
      </div>

      {/* Primary Action Hero Bar */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => {
            haptics.medium();
            setIsGymFormOpen(true);
          }}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl h-12 flex items-center justify-center gap-1.5 font-bold shadow-lg shadow-emerald-500/20 text-xs"
        >
          <Plus className="w-4 h-4" /> Gym Entry
        </Button>

        <Button
          onClick={() => {
            haptics.medium();
            setIsWeightModalOpen(true);
          }}
          variant="outline"
          className="border-emerald-500/40 hover:bg-emerald-500/10 text-emerald-400 rounded-2xl h-12 flex items-center justify-center gap-1.5 font-bold text-xs"
        >
          <Scale className="w-4 h-4" /> Log Weight
        </Button>

        <Button
          onClick={() => setActiveTab('photos')}
          variant="outline"
          className="border-border/60 hover:bg-muted/50 text-foreground rounded-2xl h-12 flex items-center justify-center gap-1.5 font-bold text-xs"
        >
          <Camera className="w-4 h-4" /> Photos
        </Button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-border/50 pb-2">
        {[
          { id: 'workouts', label: 'Workout History' },
          { id: 'routines', label: 'Routines' },
          { id: 'weight', label: 'Weight Chart' },
          { id: 'photos', label: 'Photos' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: WORKOUT HISTORY */}
      {activeTab === 'workouts' && (
        <div className="space-y-3">
          {workoutLogs.length === 0 ? (
            <div className="text-center py-12 bg-card/40 border border-border/40 rounded-2xl p-6">
              <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
              <h4 className="text-sm font-semibold text-foreground">No workouts completed yet</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 mb-4">
                Hit "Gym Entry" to record your sets, reps, and weights.
              </p>
              <Button
                onClick={() => setIsGymFormOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs"
              >
                Log Gym Entry
              </Button>
            </div>
          ) : (
            workoutLogs.map((log) => (
              <div
                key={log.id}
                className="bg-card/70 border border-border/50 rounded-2xl p-4 space-y-3 hover:border-emerald-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-base text-foreground">{log.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        {new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        {log.durationMinutes} min
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {log.totalVolumeKg.toLocaleString()} kg
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteWorkout(log.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {log.exercises.map((ex, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-muted/60 text-foreground px-2.5 py-1 rounded-lg border border-border/40 font-medium"
                    >
                      {ex.exerciseName} ({ex.sets.length} sets)
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: ROUTINES */}
      {activeTab === 'routines' && (
        <RoutineManager onStartRoutine={handleStartRoutine} />
      )}

      {/* TAB CONTENT: WEIGHT & BODY METRICS */}
      {activeTab === 'weight' && (
        <div className="space-y-4">
          <div className="bg-card/70 border border-border/50 rounded-2xl p-4 space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-foreground">Body Weight Trend</h4>
                <p className="text-[11px] text-muted-foreground">Historical daily weigh-ins (KG)</p>
              </div>
              <Button
                size="sm"
                onClick={() => setIsWeightModalOpen(true)}
                className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs"
              >
                + Log Weight
              </Button>
            </div>

            <div className="h-56 w-full pt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="weight"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#weightGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card/70 border border-border/50 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-foreground">Log History</h4>
            <div className="space-y-2">
              {bodyMetrics.slice().reverse().map((m) => (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-muted-foreground">{m.date}</span>
                    <span className="font-bold text-emerald-400">{m.weightKg} kg</span>
                    {m.bodyFatPercentage && (
                      <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {m.bodyFatPercentage}% BF
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      gymService.deleteBodyMetric(m.id);
                      refreshData();
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PROGRESS PHOTOS */}
      {activeTab === 'photos' && <ProgressPhotoGallery />}

      {/* Modals */}
      <GymEntryForm
        open={isGymFormOpen}
        onOpenChange={setIsGymFormOpen}
        onSuccess={refreshData}
      />
      <WeightTrackerModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        onSuccess={refreshData}
      />
    </div>
  );
};
