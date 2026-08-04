import React, { useState, useMemo } from 'react';
import { Search, Plus, Dumbbell, Check, Activity, Sparkles, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Exercise, MuscleGroup, EquipmentType } from '@/types/gym';
import { gymService } from '@/lib/gym-storage';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface ExerciseLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  'Full Body', 'Chest', 'Back', 'Legs', 'Shoulders', 'Biceps', 'Triceps', 'Abs', 'Cardio'
];

const EQUIPMENT_TYPES: EquipmentType[] = [
  'Barbell', 'Dumbbell', 'Machine', 'Cable', 'Bodyweight', 'Kettlebell', 'Smith Machine', 'Other'
];

const MUSCLE_COLORS: Record<string, string> = {
  Chest: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  Back: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  Legs: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  Shoulders: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  Biceps: 'bg-pink-500/20 text-pink-400 border-pink-500/40',
  Triceps: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40',
  Abs: 'bg-teal-500/20 text-teal-400 border-teal-500/40',
  Cardio: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
  'Full Body': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
};

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectExercise,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState<string>('ALL');
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  // Custom Exercise Form
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState<MuscleGroup>('Chest');
  const [newExEquipment, setNewExEquipment] = useState<EquipmentType>('Dumbbell');

  const exercises = gymService.getExercises();

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
                            ex.primaryMuscle.toLowerCase().includes(search.toLowerCase()) ||
                            ex.equipment.toLowerCase().includes(search.toLowerCase());
      const matchesMuscle = selectedMuscle === 'ALL' || ex.primaryMuscle === selectedMuscle;
      return matchesSearch && matchesMuscle;
    });
  }, [exercises, search, selectedMuscle]);

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExName.trim()) {
      toast.error('Please enter an exercise name');
      return;
    }
    const created = gymService.addCustomExercise({
      name: newExName.trim(),
      primaryMuscle: newExMuscle,
      equipment: newExEquipment,
    });
    haptics.success();
    toast.success('Custom exercise created!');
    onSelectExercise(created);
    setIsCreatingCustom(false);
    setNewExName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col bg-background/95 backdrop-blur-xl border-border/60 p-5 rounded-3xl overflow-hidden shadow-2xl">
        <DialogHeader className="pb-2 shrink-0">
          <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Dumbbell className="w-4.5 h-4.5" />
            </div>
            Exercise Library
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Select an exercise or filter by muscle group to add to your session.
          </DialogDescription>
        </DialogHeader>

        {!isCreatingCustom ? (
          <div className="flex flex-col flex-1 min-h-0 space-y-3">
            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search exercise, muscle, or equipment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 bg-muted/40 border-border/50 rounded-2xl text-xs font-bold"
              />
            </div>

            {/* Muscle Filter Scroll Bar - FIXED HEIGHT & SPACING */}
            <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 min-h-[46px] shrink-0 no-scrollbar">
              <button
                type="button"
                onClick={() => { haptics.selection(); setSelectedMuscle('ALL'); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedMuscle === 'ALL'
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                    : 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70'
                }`}
              >
                All Muscles
              </button>
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { haptics.selection(); setSelectedMuscle(m); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedMuscle === m
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[260px] pb-2">
              {filteredExercises.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs bg-muted/10 rounded-2xl border border-dashed border-border/40 p-4">
                  No exercises matching "{search}".
                </div>
              ) : (
                filteredExercises.map((ex) => {
                  const muscleBadgeStyle = MUSCLE_COLORS[ex.primaryMuscle] || 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                  return (
                    <button
                      key={ex.id}
                      onClick={() => {
                        haptics.medium();
                        onSelectExercise(ex);
                        onClose();
                      }}
                      className="w-full text-left p-3.5 rounded-2xl bg-card/70 hover:bg-card border border-border/50 hover:border-emerald-500/50 transition-all flex items-center justify-between group shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <div className="font-extrabold text-sm text-foreground group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          {ex.name}
                        </div>
                        
                        {/* High-Contrast Badges */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${muscleBadgeStyle}`}>
                            {ex.primaryMuscle}
                          </span>
                          <span className="text-[11px] font-bold text-cyan-300 bg-cyan-500/15 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                            {ex.equipment}
                          </span>
                          {ex.isCustom && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Custom
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="w-4.5 h-4.5 text-emerald-400" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Create Custom Exercise Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreatingCustom(true)}
              className="w-full border-dashed border-emerald-500/40 hover:border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 rounded-2xl py-3 text-xs font-bold shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Custom Exercise
            </Button>
          </div>
        ) : (
          /* Custom Exercise Form */
          <form onSubmit={handleCreateCustom} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Exercise Name</label>
              <Input
                placeholder="e.g., Cable Face Pull"
                value={newExName}
                onChange={(e) => setNewExName(e.target.value)}
                className="mt-1 h-10 bg-muted/40 rounded-xl font-bold text-xs"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Primary Muscle Group</label>
              <select
                value={newExMuscle}
                onChange={(e) => setNewExMuscle(e.target.value as MuscleGroup)}
                className="w-full mt-1 p-2.5 rounded-xl bg-muted/60 border border-border/50 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {MUSCLE_GROUPS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Equipment Type</label>
              <select
                value={newExEquipment}
                onChange={(e) => setNewExEquipment(e.target.value as EquipmentType)}
                className="w-full mt-1 p-2.5 rounded-xl bg-muted/60 border border-border/50 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {EQUIPMENT_TYPES.map((eq) => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsCreatingCustom(false)}
                className="flex-1 rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold"
              >
                <Check className="w-4 h-4 mr-1.5" />
                Save Exercise
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
