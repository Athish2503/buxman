import React, { useState } from 'react';
import { Plus, Play, Trash2, Edit3, Dumbbell, Sparkles, Check, X, Layers, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WorkoutRoutine, MuscleGroup, Exercise } from '@/types/gym';
import { gymService } from '@/lib/gym-storage';
import { ExerciseLibraryModal } from './ExerciseLibraryModal';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface RoutineManagerProps {
  onStartRoutine: (routine: WorkoutRoutine) => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Cardio', 'Full Body'
];

export const RoutineManager: React.FC<RoutineManagerProps> = ({ onStartRoutine }) => {
  const [routines, setRoutines] = useState<WorkoutRoutine[]>(() => gymService.getRoutines());
  
  // Editor Dialog State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetMuscles, setTargetMuscles] = useState<MuscleGroup[]>(['Chest']);
  const [templateExercises, setTemplateExercises] = useState<WorkoutRoutine['templateExercises']>([]);

  // Exercise Picker inside editor
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);

  const refreshRoutines = () => {
    setRoutines(gymService.getRoutines());
  };

  const handleOpenCreateNew = () => {
    haptics.medium();
    setEditingRoutineId(null);
    setName('');
    setDescription('');
    setTargetMuscles(['Chest']);
    setTemplateExercises([]);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (routine: WorkoutRoutine) => {
    haptics.medium();
    setEditingRoutineId(routine.id);
    setName(routine.name);
    setDescription(routine.description || '');
    setTargetMuscles(routine.targetMuscles || []);
    setTemplateExercises(routine.templateExercises || []);
    setIsEditorOpen(true);
  };

  const handleToggleMuscle = (m: MuscleGroup) => {
    setTargetMuscles((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleAddExerciseToRoutine = (ex: Exercise) => {
    setTemplateExercises((prev) => [
      ...prev,
      {
        exerciseId: ex.id,
        exerciseName: ex.name,
        primaryMuscle: ex.primaryMuscle,
        defaultSets: 3,
        defaultTargetReps: 10,
      },
    ]);
  };

  const handleUpdateTemplateEx = (
    idx: number,
    field: 'defaultSets' | 'defaultTargetReps',
    val: number
  ) => {
    setTemplateExercises((prev) => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], [field]: val };
      return updated;
    });
  };

  const handleRemoveTemplateEx = (idx: number) => {
    setTemplateExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a routine name');
      return;
    }

    gymService.saveRoutine({
      id: editingRoutineId || undefined,
      name: name.trim(),
      description: description.trim() || undefined,
      targetMuscles: targetMuscles.length > 0 ? targetMuscles : ['Full Body'],
      templateExercises,
    });

    haptics.success();
    toast.success(editingRoutineId ? 'Routine updated!' : 'Routine created!');
    refreshRoutines();
    setIsEditorOpen(false);
  };

  const handleDeleteRoutine = (id: string) => {
    gymService.deleteRoutine(id);
    toast.success('Routine deleted');
    refreshRoutines();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-foreground flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" /> Workout Routines
          </h3>
          <p className="text-xs text-muted-foreground">Pre-configured workout routine templates for 1-tap logging.</p>
        </div>
        <Button
          size="sm"
          onClick={handleOpenCreateNew}
          className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> New Routine
        </Button>
      </div>

      {routines.length === 0 ? (
        <div className="text-center py-10 bg-card/40 border border-border/40 rounded-2xl p-6">
          <p className="text-xs text-muted-foreground">No routine templates saved yet.</p>
          <Button
            onClick={handleOpenCreateNew}
            className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs mt-3 font-bold"
          >
            Create First Routine
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {routines.map((routine) => (
            <div
              key={routine.id}
              className="bg-card/70 border border-border/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-emerald-500/40 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-foreground">{routine.name}</h4>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(routine)}
                      className="p-1 text-muted-foreground hover:text-emerald-400 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoutine(routine.id)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {routine.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{routine.description}</p>
                )}

                {/* Target Muscle Chips */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {routine.targetMuscles.map((m) => (
                    <span
                      key={m}
                      className="text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md"
                    >
                      {m}
                    </span>
                  ))}
                  <span className="text-[10px] font-bold bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md">
                    {routine.templateExercises.length} Exercises
                  </span>
                </div>

                {/* Exercise list summary */}
                {routine.templateExercises.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-border/30 space-y-1">
                    {routine.templateExercises.slice(0, 3).map((ex, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground truncate">{ex.exerciseName}</span>
                        <span className="font-mono text-emerald-400">{ex.defaultSets} × {ex.defaultTargetReps} reps</span>
                      </div>
                    ))}
                    {routine.templateExercises.length > 3 && (
                      <div className="text-[10px] text-muted-foreground italic">
                        +{routine.templateExercises.length - 3} more exercises
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="button"
                onClick={() => onStartRoutine(routine)}
                className="w-full bg-emerald-500/15 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold h-9 mt-2"
              >
                <Play className="w-3.5 h-3.5 mr-1.5 fill-current" /> Quickload & Start Routine
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Routine Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl border-border/60 p-5 rounded-3xl overflow-hidden shadow-2xl">
          <DialogHeader className="pb-2 shrink-0">
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              {editingRoutineId ? 'Edit Routine Template' : 'Create Routine Template'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure exercises, default sets, and target reps for quick session loading.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoutine} className="flex-1 overflow-y-auto space-y-4 pr-1 py-2">
            <div>
              <Label className="text-xs font-bold text-muted-foreground">Routine Name</Label>
              <Input
                placeholder="e.g. Push Day A (Chest & Shoulders)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 h-10 bg-muted/40 rounded-xl font-bold text-xs"
                required
                autoFocus
              />
            </div>

            <div>
              <Label className="text-xs font-bold text-muted-foreground">Description (Optional)</Label>
              <Input
                placeholder="Targeting upper chest and side delts"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 h-10 bg-muted/40 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Target Muscle Selection */}
            <div>
              <Label className="text-xs font-bold text-muted-foreground">Target Muscle Groups</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {MUSCLE_GROUPS.map((m) => {
                  const isSelected = targetMuscles.includes(m);
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleToggleMuscle(m)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-400'
                          : 'bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted/60'
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Exercises Section */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">Template Exercises ({templateExercises.length})</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExercisePickerOpen(true)}
                  className="h-8 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 rounded-xl text-xs font-bold"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Exercise
                </Button>
              </div>

              {templateExercises.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-border/40 rounded-2xl bg-muted/10 p-4">
                  <p className="text-xs text-muted-foreground">No exercises added to this template yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsExercisePickerOpen(true)}
                    className="text-xs font-bold text-emerald-400 hover:underline mt-1 inline-block"
                  >
                    Click to pick exercises from library
                  </button>
                </div>
              ) : (
                templateExercises.map((ex, idx) => (
                  <div key={idx} className="p-3 bg-card border border-border/40 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-foreground">{ex.exerciseName}</span>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md ml-2 border border-emerald-500/20">
                          {ex.primaryMuscle}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTemplateEx(idx)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-semibold">Default Sets</Label>
                        <Input
                          type="number"
                          value={ex.defaultSets}
                          onChange={(e) => handleUpdateTemplateEx(idx, 'defaultSets', parseInt(e.target.value) || 1)}
                          className="mt-0.5 h-8 text-center font-bold text-xs bg-background/80 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground font-semibold">Target Reps</Label>
                        <Input
                          type="number"
                          value={ex.defaultTargetReps}
                          onChange={(e) => handleUpdateTemplateEx(idx, 'defaultTargetReps', parseInt(e.target.value) || 1)}
                          className="mt-0.5 h-8 text-center font-bold text-xs bg-background/80 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsEditorOpen(false)} className="flex-1 rounded-xl text-xs">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold">
                <Check className="w-4 h-4 mr-1.5" /> Save Routine Template
              </Button>
            </div>
          </form>

          {/* Exercise Picker Modal for Template Builder */}
          <ExerciseLibraryModal
            isOpen={isExercisePickerOpen}
            onClose={() => setIsExercisePickerOpen(false)}
            onSelectExercise={handleAddExerciseToRoutine}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
