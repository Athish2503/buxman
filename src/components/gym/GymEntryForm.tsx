import React, { useState, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Dumbbell, Check, Trash2, Calendar } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SwipeToAdd } from '@/components/ui/swipe-to-add';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Exercise, ExerciseSet, LoggedExercise, WorkoutLog, WorkoutRoutine } from '@/types/gym';
import { gymService } from '@/lib/gym-storage';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { haptics } from '@/lib/haptics';
import { audio } from '@/lib/audio';
import { createPortal } from 'react-dom';
import { cn, rewardBurst } from '@/lib/utils';
import { toast } from 'sonner';

export interface GymEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const FormBody = forwardRef<HTMLDivElement, { onDone: () => void }>(
  function FormBody({ onDone }, ref) {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState<string>(today);

    // Workout Session Section
    const [workoutName, setWorkoutName] = useState<string>('Gym Session');
    const [durationMinutes, setDurationMinutes] = useState<number>(45);
    const [exercises, setExercises] = useState<LoggedExercise[]>([]);
    const [notes, setNotes] = useState<string>('');
    const [routines] = useState<WorkoutRoutine[]>(() => gymService.getRoutines());

    // Exercise Library Picker & Saving states
    const [isExercisePickerOpen, setIsExercisePickerOpen] = useState<boolean>(false);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);

    const handleApplyRoutine = (routine: WorkoutRoutine) => {
      haptics.medium();
      setWorkoutName(routine.name);
      const mapped: LoggedExercise[] = routine.templateExercises.map((te) => ({
        exerciseId: te.exerciseId,
        exerciseName: te.exerciseName,
        primaryMuscle: te.primaryMuscle,
        sets: Array.from({ length: te.defaultSets }).map((_, idx) => ({
          id: 'set_' + Date.now() + '_' + idx,
          setNumber: idx + 1,
          weightKg: 20,
          reps: te.defaultTargetReps,
          completed: true,
        })),
      }));
      setExercises(mapped);
      toast.success(`Loaded "${routine.name}" template`);
    };

    const handleAddExerciseFromLibrary = (ex: Exercise) => {
      haptics.medium();
      const newLogged: LoggedExercise = {
        exerciseId: ex.id,
        exerciseName: ex.name,
        primaryMuscle: ex.primaryMuscle,
        sets: [
          { id: 'set_' + Date.now() + '_1', setNumber: 1, weightKg: 20, reps: 10, completed: true },
        ],
      };
      setExercises((prev) => [...prev, newLogged]);
    };

    const handleUpdateSet = (exIdx: number, setIdx: number, field: keyof ExerciseSet, value: any) => {
      setExercises((prev) => {
        const updated = [...prev];
        const targetEx = { ...updated[exIdx] };
        const updatedSets = [...targetEx.sets];
        updatedSets[setIdx] = { ...updatedSets[setIdx], [field]: value };
        targetEx.sets = updatedSets;
        updated[exIdx] = targetEx;
        return updated;
      });
    };

    const handleAddSet = (exIdx: number) => {
      haptics.light();
      setExercises((prev) => {
        const updated = [...prev];
        const targetEx = { ...updated[exIdx] };
        const lastSet = targetEx.sets[targetEx.sets.length - 1];
        const nextNum = targetEx.sets.length + 1;
        targetEx.sets.push({
          id: 'set_' + Date.now() + '_' + nextNum,
          setNumber: nextNum,
          weightKg: lastSet ? lastSet.weightKg : 20,
          reps: lastSet ? lastSet.reps : 10,
          completed: true,
        });
        updated[exIdx] = targetEx;
        return updated;
      });
    };

    const handleRemoveSet = (exIdx: number, setIdx: number) => {
      setExercises((prev) => {
        const updated = [...prev];
        const targetEx = { ...updated[exIdx] };
        targetEx.sets = targetEx.sets.filter((_, idx) => idx !== setIdx);
        targetEx.sets = targetEx.sets.map((s, idx) => ({ ...s, setNumber: idx + 1 }));
        updated[exIdx] = targetEx;
        return updated;
      });
    };

    const handleRemoveExercise = (exIdx: number) => {
      setExercises((prev) => prev.filter((_, idx) => idx !== exIdx));
    };

    const handleConfirmSave = async () => {
      if (isSaving || success) return;
      if (exercises.length === 0) {
        toast.error('Add at least one exercise to save session');
        return;
      }
      setIsSaving(true);

      try {
        let totalVol = 0;
        exercises.forEach((ex) => {
          ex.sets.forEach((s) => {
            if (s.completed) totalVol += s.weightKg * s.reps;
          });
        });

        const newLog: WorkoutLog = {
          id: 'wk_' + Date.now(),
          name: workoutName.trim() || 'Gym Session',
          date: new Date(date).toISOString(),
          startTime: new Date().toISOString(),
          durationMinutes: durationMinutes || 45,
          exercises,
          notes: notes.trim() || undefined,
          totalVolumeKg: totalVol,
        };
        gymService.saveWorkoutLog(newLog);

        setSuccess(true);
        haptics.success();
        audio.playNotificationSound?.();
        rewardBurst();
        toast.success('Workout session logged!');

        setTimeout(() => {
          setIsSaving(false);
          setSuccess(false);
          onDone();
        }, 400);
      } catch (err) {
        toast.error('Could not save workout');
        setIsSaving(false);
      }
    };

    return (
      <div ref={ref} className="space-y-5 py-2">
        {/* Date Selection */}
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Session Date
          </Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 bg-background/50 rounded-xl border-border/40 font-bold text-xs"
            required
          />
        </div>

        {/* WORKOUT SESSION & ROUTINES */}
        <div className="bg-card/70 border border-border/50 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Dumbbell className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Workout Details</h4>
            </div>
          </div>

          {/* Routine Quick Picker Chips */}
          {routines.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Quick Load Routine Template</Label>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {routines.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleApplyRoutine(r)}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-muted/40 hover:bg-emerald-500/20 text-foreground hover:text-emerald-400 border border-border/40 hover:border-emerald-500/40 transition-all whitespace-nowrap flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-emerald-400 shrink-0" />
                    {r.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label className="text-[11px] text-muted-foreground font-semibold">Session Name</Label>
              <Input
                placeholder="Push Day / Leg Day"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                className="mt-1 h-10 bg-background/80 rounded-xl font-bold text-xs"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground font-semibold">Duration (Mins)</Label>
              <Input
                type="number"
                placeholder="45"
                value={durationMinutes || ''}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
                className="mt-1 h-10 bg-background/80 rounded-xl text-xs font-bold text-center"
              />
            </div>
          </div>

          {/* Logged Exercises Table */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground">Exercises ({exercises.length})</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setIsExercisePickerOpen(true)}
                className="h-8 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Exercise
              </Button>
            </div>

            {exercises.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border/40 rounded-xl p-4 bg-muted/10">
                <p className="text-xs text-muted-foreground">No exercises added yet.</p>
                <button
                  type="button"
                  onClick={() => setIsExercisePickerOpen(true)}
                  className="text-xs font-bold text-emerald-400 hover:underline mt-1 inline-block"
                >
                  Click here to pick exercises from library
                </button>
              </div>
            ) : (
              exercises.map((ex, exIdx) => (
                <div key={exIdx} className="p-3 bg-muted/20 border border-border/40 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{ex.exerciseName}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(exIdx)}
                      className="p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {ex.sets.map((set, setIdx) => (
                      <div key={set.id} className="flex items-center gap-2 text-xs">
                        <span className="w-5 font-mono text-muted-foreground font-bold">#{set.setNumber}</span>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="Kg"
                          value={set.weightKg === 0 ? '' : set.weightKg}
                          onChange={(e) => handleUpdateSet(exIdx, setIdx, 'weightKg', parseFloat(e.target.value) || 0)}
                          className="h-7 w-20 text-center font-bold text-xs bg-background/80 rounded-lg"
                        />
                        <span className="text-muted-foreground text-[10px]">kg x</span>
                        <Input
                          type="number"
                          placeholder="Reps"
                          value={set.reps === 0 ? '' : set.reps}
                          onChange={(e) => handleUpdateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                          className="h-7 w-20 text-center font-bold text-xs bg-background/80 rounded-lg"
                        />
                        <span className="text-muted-foreground text-[10px]">reps</span>
                        {ex.sets.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            className="p-1 text-muted-foreground hover:text-destructive ml-auto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSet(exIdx)}
                    className="text-[11px] text-emerald-400 font-bold hover:underline flex items-center gap-1 pt-1"
                  >
                    <Plus className="w-3 h-3" /> Add Set
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Notes / Comments</Label>
          <Textarea
            placeholder="How did the session feel?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background/50 border-border/40 text-xs min-h-[60px] rounded-xl resize-none font-medium"
          />
        </div>

        {/* ── Swipe to submit slider ── */}
        <SwipeToAdd
          onConfirm={handleConfirmSave}
          isSubmitting={isSaving}
          success={success}
          label="Swipe to Log Workout"
        />

        {/* Exercise Library Dialog */}
        <ExerciseLibraryModal
          isOpen={isExercisePickerOpen}
          onClose={() => setIsExercisePickerOpen(false)}
          onSelectExercise={handleAddExerciseFromLibrary}
        />
      </div>
    );
  }
);

export function GymEntryForm({ open, onOpenChange, onSuccess }: GymEntryFormProps) {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const formContent = <FormBody onDone={() => { onOpenChange(false); onSuccess?.(); }} />;

  const overlay = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => onOpenChange(false)}
          />

          {isMobile ? (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full z-[9999] rounded-t-3xl border-t border-border/40 overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="relative flex items-center justify-center px-5 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-emerald-500 flex items-center justify-center shadow-glow">
                    <Dumbbell className="h-4 w-4 text-white" />
                  </div>
                  <h2 className="text-sm font-bold leading-none">New Workout Session</h2>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute right-5 h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-5 pb-10" style={{ overscrollBehavior: 'contain' }}>
                {formContent}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl z-[9999] rounded-2xl border border-border/50 shadow-2xl overflow-hidden pointer-events-auto"
              style={{ background: 'hsl(var(--background))', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center shadow-glow">
                    <Dumbbell className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold leading-none">New Workout Session</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Log session exercises, sets & reps</p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5">
                {formContent}
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
