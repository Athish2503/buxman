export type MuscleGroup = 
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Biceps'
  | 'Triceps'
  | 'Legs'
  | 'Calves'
  | 'Abs'
  | 'Cardio'
  | 'Full Body';

export type EquipmentType = 
  | 'Barbell'
  | 'Dumbbell'
  | 'Machine'
  | 'Cable'
  | 'Bodyweight'
  | 'Kettlebell'
  | 'Smith Machine'
  | 'Other';

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles?: MuscleGroup[];
  equipment: EquipmentType;
  instructions?: string;
  isCustom?: boolean;
}

export interface ExerciseSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  isWarmup?: boolean;
  isDropSet?: boolean;
}

export interface LoggedExercise {
  exerciseId: string;
  exerciseName: string;
  primaryMuscle: MuscleGroup;
  sets: ExerciseSet[];
  notes?: string;
}

export interface WorkoutLog {
  id: string;
  name: string;
  date: string; // ISO date string
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  exercises: LoggedExercise[];
  notes?: string;
  rating?: number; // 1-5 rating
  totalVolumeKg: number;
}

export interface WorkoutRoutine {
  id: string;
  name: string;
  description?: string;
  targetMuscles: MuscleGroup[];
  templateExercises: {
    exerciseId: string;
    exerciseName: string;
    primaryMuscle: MuscleGroup;
    defaultSets: number;
    defaultTargetReps: number;
  }[];
}

export interface BodyMetricLog {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  bodyFatPercentage?: number;
  chestCm?: number;
  waistCm?: number;
  armsCm?: number;
  thighsCm?: number;
  shouldersCm?: number;
  notes?: string;
}

export type PoseTag = 'Front' | 'Back' | 'Side' | 'Flex';

export interface ProgressPhoto {
  id: string;
  date: string; // YYYY-MM-DD
  photoUri: string; // Base64 or File URI
  pose: PoseTag;
  weightKgAtTime?: number;
  notes?: string;
}
