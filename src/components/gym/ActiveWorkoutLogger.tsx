import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock, Plus, Trash2, Check, Dumbbell, Play, Pause,
  RotateCcw, Sparkles, ChevronDown, ChevronUp, Trophy, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WorkoutLog, LoggedExercise, ExerciseSet, Exercise } from '@/types/gym';
import { gymService } from '@/lib/gym-storage';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { toast } from 'sonner';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';

interface ActiveWorkoutLoggerProps {
  initialWorkout?: WorkoutLog | null;
  onFinish: () => void;
  onCancel: () => void;
}

export const ActiveWorkoutLogger: React.FC<ActiveWorkoutLoggerProps> = ({
  initialWorkout,
  onFinish,
  onCancel,
}) => {
  const [workout, setWorkout] = useState<WorkoutLog>(() => {
    if (initialWorkout) return initialWorkout;
    const existing = gymService.getActiveWorkout();
    if (existing) return existing;
    return {
      id: 'wk_' + Date.now(),
      name: 'Gym Session',
      date: new Date().toISOString(),
      startTime: new Date().toISOString(),
      durationMinutes: 0,
      exercises: [],
      totalVolumeKg: 0,
    };
  });

  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState<boolean>(false);
  const [workoutNotes, setWorkoutNotes] = useState<string>(workout.notes || '');

  // Rest Timer State
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null);
  const [isRestActive, setIsRestActive] = useState<boolean>(false);

  // Auto save active workout state on changes
  useEffect(() => {
    gymService.saveActiveWorkout(workout);
  }, [workout]);

  // Main Workout Duration Clock
  useEffect(() => {
    const startMs = new Date(workout.startTime).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - startMs) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [workout.startTime]);

  // Rest Timer Countdown
  useEffect(() => {
    let interval: any = null;
    if (isRestActive && restTimerSeconds !== null && restTimerSeconds > 0) {
      interval = setInterval(() => {
        setRestTimerSeconds((prev) => (prev && prev > 1 ? prev - 1 : 0));
      }, 1000);
    } else if (restTimerSeconds === 0 && isRestActive) {
      setIsRestActive(false);
      haptics.heavy();
      audio.playNotificationSound?.();
      toast.success('Rest timer complete! Time for the next set 💪', {
        duration: 4000,
      });
    }
    return () => clearInterval(interval);
  }, [isRestActive, restTimerSeconds]);

  const startRestTimer = (seconds: number) => {
    setRestTimerSeconds(seconds);
    setIsRestActive(true);
    haptics.light();
  };

  const stopRestTimer = () => {
    setIsRestActive(false);
    setRestTimerSeconds(null);
  };

  // Format MM:SS or HH:MM:SS
  const formatTime = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle adding exercise from library
  const handleAddExercise = (exercise: Exercise) => {
    const newLoggedEx: LoggedExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      sets: [
        { id: 'set_' + Date.now() + '_1', setNumber: 1, weightKg: 20, reps: 10, completed: false }
      ],
    };
    setWorkout((prev) => ({
      ...prev,
      exercises: [...prev.exercises, newLoggedEx],
    }));
    haptics.medium();
  };

  // Handle set updates
  const handleUpdateSet = (
    exIdx: number,
    setIdx: number,
    field: keyof ExerciseSet,
    value: any
  ) => {
    setWorkout((prev) => {
      const updatedExercises = [...prev.exercises];
      const targetEx = { ...updatedExercises[exIdx] };
      const updatedSets = [...targetEx.sets];
      
      const targetSet = { ...updatedSets[setIdx], [field]: value };
      updatedSets[setIdx] = targetSet;
      targetEx.sets = updatedSets;
      updatedExercises[exIdx] = targetEx;

      // Recalculate total volume
      let totalVol = 0;
      updatedExercises.forEach((ex) => {
        ex.sets.forEach((s) => {
          if (s.completed) totalVol += s.weightKg * s.reps;
        });
      });

      return {
        ...prev,
        exercises: updatedExercises,
        totalVolumeKg: totalVol,
      };
    });
  };

  const handleToggleSetComplete = (exIdx: number, setIdx: number) => {
    const isCompleted = workout.exercises[exIdx].sets[setIdx].completed;
    handleUpdateSet(exIdx, setIdx, 'completed', !isCompleted);
    haptics.medium();
    if (!isCompleted) {
      // Trigger default 60s rest timer
      startRestTimer(60);
    }
  };

  const handleAddSet = (exIdx: number) => {
    setWorkout((prev) => {
      const updatedExercises = [...prev.exercises];
      const targetEx = { ...updatedExercises[exIdx] };
      const lastSet = targetEx.sets[targetEx.sets.length - 1];
      const nextSetNum = targetEx.sets.length + 1;
      
      const newSet: ExerciseSet = {
        id: 'set_' + Date.now() + '_' + nextSetNum,
        setNumber: nextSetNum,
        weightKg: lastSet ? lastSet.weightKg : 20,
        reps: lastSet ? lastSet.reps : 10,
        completed: false,
      };

      targetEx.sets = [...targetEx.sets, newSet];
      updatedExercises[exIdx] = targetEx;
      return { ...prev, exercises: updatedExercises };
    });
    haptics.light();
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setWorkout((prev) => {
      const updatedExercises = [...prev.exercises];
      const targetEx = { ...updatedExercises[exIdx] };
      targetEx.sets = targetEx.sets.filter((_, idx) => idx !== setIdx);
      // Re-index set numbers
      targetEx.sets = targetEx.sets.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      updatedExercises[exIdx] = targetEx;
      return { ...prev, exercises: updatedExercises };
    });
  };

  const handleRemoveExercise = (exIdx: number) => {
    setWorkout((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((_, idx) => idx !== exIdx),
    }));
  };

  const handleFinishWorkout = () => {
    if (workout.exercises.length === 0) {
      toast.error('Add at least one exercise to finish');
      return;
    }

    const finalDuration = Math.max(1, Math.round(elapsedSeconds / 60));
    let totalVol = 0;
    workout.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.completed) totalVol += s.weightKg * s.reps;
      });
    });

    const completedWorkout: WorkoutLog = {
      ...workout,
      endTime: new Date().toISOString(),
      durationMinutes: finalDuration,
      notes: workoutNotes,
      totalVolumeKg: totalVol,
    };

    gymService.saveWorkoutLog(completedWorkout);
    
    // Celebration!
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    haptics.heavy();
    toast.success('Workout completed! Great session! 🏋️‍♂️');
    onFinish();
  };

  const content = (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col overflow-hidden">
      {/* Header Bar */}
      <div className="p-4 border-b border-border/50 bg-card/80 backdrop-blur-md flex items-center justify-between">
        <button
          onClick={onCancel}
          className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted/50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <Input
            value={workout.name}
            onChange={(e) => setWorkout({ ...workout, name: e.target.value })}
            className="text-center font-bold text-base h-7 border-none bg-transparent focus-visible:ring-1 focus-visible:ring-emerald-500 w-44"
          />
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono font-medium mt-0.5">
            <Clock className="w-3.5 h-3.5 animate-pulse" />
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        <Button
          onClick={handleFinishWorkout}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20 text-xs px-3 py-1.5 h-8"
        >
          Finish
        </Button>
      </div>

      {/* Floating Rest Timer Bar */}
      {restTimerSeconds !== null && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-emerald-950/80 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between backdrop-blur-md"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            <span className="text-xs text-emerald-200 font-medium">Rest Timer:</span>
            <span className="text-sm font-mono font-bold text-emerald-400">
              {formatTime(restTimerSeconds)}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[30, 60, 90, 120].map((s) => (
              <button
                key={s}
                onClick={() => startRestTimer(s)}
                className={`text-[11px] px-2 py-0.5 rounded-lg border font-mono transition-all ${
                  restTimerSeconds === s
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30 hover:bg-emerald-800/40'
                }`}
              >
                +{s}s
              </button>
            ))}
            <button
              onClick={stopRestTimer}
              className="text-xs text-muted-foreground hover:text-white px-2 py-0.5 ml-1"
            >
              Skip
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Exercises Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {workout.exercises.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4 text-emerald-400">
              <Dumbbell className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Workout is empty</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 mb-6">
              Add exercises to start tracking sets, reps, and weights for this workout session.
            </p>
            <Button
              onClick={() => setIsExerciseModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Exercise
            </Button>
          </div>
        ) : (
          workout.exercises.map((ex, exIdx) => (
            <div
              key={ex.exerciseId + '_' + exIdx}
              className="bg-card/70 border border-border/60 rounded-2xl p-4 shadow-sm backdrop-blur-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-base text-foreground">{ex.exerciseName}</h4>
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium border border-emerald-500/20">
                    {ex.primaryMuscle}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveExercise(exIdx)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sets Table Header */}
              <div className="grid grid-cols-12 text-[11px] font-semibold text-muted-foreground px-1 pb-1">
                <span className="col-span-2">SET</span>
                <span className="col-span-4 text-center">WEIGHT (KG)</span>
                <span className="col-span-4 text-center">REPS</span>
                <span className="col-span-2 text-right">DONE</span>
              </div>

              {/* Sets Rows */}
              <div className="space-y-2">
                {ex.sets.map((set, setIdx) => (
                  <div
                    key={set.id}
                    className={`grid grid-cols-12 items-center p-2 rounded-xl border transition-all ${
                      set.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-muted/30 border-border/40'
                    }`}
                  >
                    {/* Set Number */}
                    <div className="col-span-2 flex items-center gap-1">
                      <span className="w-6 h-6 rounded-full bg-muted/60 text-xs font-bold flex items-center justify-center text-foreground">
                        {set.setNumber}
                      </span>
                    </div>

                    {/* Weight Input */}
                    <div className="col-span-4 px-1">
                      <Input
                        type="number"
                        step="0.5"
                        value={set.weightKg === 0 ? '' : set.weightKg}
                        onChange={(e) =>
                          handleUpdateSet(exIdx, setIdx, 'weightKg', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-center font-bold text-sm bg-background/80 rounded-lg border-border/50"
                      />
                    </div>

                    {/* Reps Input */}
                    <div className="col-span-4 px-1">
                      <Input
                        type="number"
                        value={set.reps === 0 ? '' : set.reps}
                        onChange={(e) =>
                          handleUpdateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)
                        }
                        className="h-8 text-center font-bold text-sm bg-background/80 rounded-lg border-border/50"
                      />
                    </div>

                    {/* Complete Checkbox */}
                    <div className="col-span-2 flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleSetComplete(exIdx, setIdx)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                          set.completed
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : 'bg-muted/80 text-muted-foreground hover:bg-emerald-500/20 hover:text-emerald-400'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      {ex.sets.length > 1 && (
                        <button
                          onClick={() => handleRemoveSet(exIdx, setIdx)}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-40 hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Set Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddSet(exIdx)}
                className="w-full text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl h-8 border border-dashed border-emerald-500/30 mt-1"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Set
              </Button>
            </div>
          ))
        )}

        {workout.exercises.length > 0 && (
          <Button
            onClick={() => setIsExerciseModalOpen(true)}
            variant="outline"
            className="w-full py-5 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-2xl font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Another Exercise
          </Button>
        )}

        {/* Notes textarea */}
        <div className="bg-card/50 border border-border/40 rounded-2xl p-3">
          <label className="text-xs font-medium text-muted-foreground">Session Notes</label>
          <textarea
            placeholder="How did the workout feel? Any PRs or injuries?"
            value={workoutNotes}
            onChange={(e) => setWorkoutNotes(e.target.value)}
            className="w-full mt-1 bg-transparent text-xs text-foreground resize-none focus:outline-none h-16"
          />
        </div>
      </div>

      {/* Exercise Picker Dialog */}
      <ExerciseLibraryModal
        isOpen={isExerciseModalOpen}
        onClose={() => setIsExerciseModalOpen(false)}
        onSelectExercise={handleAddExercise}
      />
    </div>
  );

  return createPortal(content, document.body);
};
