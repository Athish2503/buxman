import {
  Exercise,
  WorkoutLog,
  WorkoutRoutine,
  BodyMetricLog,
  ProgressPhoto,
  LoggedExercise,
  ExerciseSet
} from '@/types/gym';

const DEFAULT_EXERCISES: Exercise[] = [
  { id: 'ex_1', name: 'Barbell Bench Press', primaryMuscle: 'Chest', equipment: 'Barbell' },
  { id: 'ex_2', name: 'Incline Dumbbell Press', primaryMuscle: 'Chest', equipment: 'Dumbbell' },
  { id: 'ex_3', name: 'Cable Chest Fly', primaryMuscle: 'Chest', equipment: 'Cable' },
  { id: 'ex_4', name: 'Barbell Back Squat', primaryMuscle: 'Legs', equipment: 'Barbell' },
  { id: 'ex_5', name: 'Romanian Deadlift', primaryMuscle: 'Legs', equipment: 'Barbell' },
  { id: 'ex_6', name: 'Leg Press', primaryMuscle: 'Legs', equipment: 'Machine' },
  { id: 'ex_7', name: 'Barbell Deadlift', primaryMuscle: 'Back', equipment: 'Barbell' },
  { id: 'ex_8', name: 'Lat Pulldown', primaryMuscle: 'Back', equipment: 'Cable' },
  { id: 'ex_9', name: 'Seated Cable Row', primaryMuscle: 'Back', equipment: 'Cable' },
  { id: 'ex_10', name: 'Overhead Shoulder Press', primaryMuscle: 'Shoulders', equipment: 'Barbell' },
  { id: 'ex_11', name: 'Dumbbell Lateral Raise', primaryMuscle: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'ex_12', name: 'Dumbbell Bicep Curl', primaryMuscle: 'Biceps', equipment: 'Dumbbell' },
  { id: 'ex_13', name: 'Hammer Curl', primaryMuscle: 'Biceps', equipment: 'Dumbbell' },
  { id: 'ex_14', name: 'Tricep Rope Pushdown', primaryMuscle: 'Triceps', equipment: 'Cable' },
  { id: 'ex_15', name: 'Skull Crushers', primaryMuscle: 'Triceps', equipment: 'Barbell' },
  { id: 'ex_16', name: 'Ab Wheel Rollout', primaryMuscle: 'Abs', equipment: 'Other' },
  { id: 'ex_17', name: 'Hanging Leg Raise', primaryMuscle: 'Abs', equipment: 'Bodyweight' },
  { id: 'ex_18', name: 'Treadmill Running', primaryMuscle: 'Cardio', equipment: 'Machine' },
];

const DEFAULT_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'rt_push',
    name: 'Push Day (Chest, Shoulders, Triceps)',
    description: 'Hypertrophy push session focusing on compound presses and isolation.',
    targetMuscles: ['Chest', 'Shoulders', 'Triceps'],
    templateExercises: [
      { exerciseId: 'ex_1', exerciseName: 'Barbell Bench Press', primaryMuscle: 'Chest', defaultSets: 4, defaultTargetReps: 8 },
      { exerciseId: 'ex_2', exerciseName: 'Incline Dumbbell Press', primaryMuscle: 'Chest', defaultSets: 3, defaultTargetReps: 10 },
      { exerciseId: 'ex_10', exerciseName: 'Overhead Shoulder Press', primaryMuscle: 'Shoulders', defaultSets: 3, defaultTargetReps: 8 },
      { exerciseId: 'ex_11', exerciseName: 'Dumbbell Lateral Raise', primaryMuscle: 'Shoulders', defaultSets: 4, defaultTargetReps: 12 },
      { exerciseId: 'ex_14', exerciseName: 'Tricep Rope Pushdown', primaryMuscle: 'Triceps', defaultSets: 3, defaultTargetReps: 12 },
    ]
  },
  {
    id: 'rt_pull',
    name: 'Pull Day (Back, Biceps)',
    description: 'Heavy vertical & horizontal pull volume with bicep finishers.',
    targetMuscles: ['Back', 'Biceps'],
    templateExercises: [
      { exerciseId: 'ex_7', exerciseName: 'Barbell Deadlift', primaryMuscle: 'Back', defaultSets: 3, defaultTargetReps: 5 },
      { exerciseId: 'ex_8', exerciseName: 'Lat Pulldown', primaryMuscle: 'Back', defaultSets: 4, defaultTargetReps: 10 },
      { exerciseId: 'ex_9', exerciseName: 'Seated Cable Row', primaryMuscle: 'Back', defaultSets: 3, defaultTargetReps: 10 },
      { exerciseId: 'ex_12', exerciseName: 'Dumbbell Bicep Curl', primaryMuscle: 'Biceps', defaultSets: 3, defaultTargetReps: 12 },
      { exerciseId: 'ex_13', exerciseName: 'Hammer Curl', primaryMuscle: 'Biceps', defaultSets: 3, defaultTargetReps: 12 },
    ]
  },
  {
    id: 'rt_legs',
    name: 'Leg Day (Quads, Hamstrings, Calves)',
    description: 'Squats, Romanian deadlifts and accessory leg strength work.',
    targetMuscles: ['Legs', 'Calves'],
    templateExercises: [
      { exerciseId: 'ex_4', exerciseName: 'Barbell Back Squat', primaryMuscle: 'Legs', defaultSets: 4, defaultTargetReps: 8 },
      { exerciseId: 'ex_5', exerciseName: 'Romanian Deadlift', primaryMuscle: 'Legs', defaultSets: 3, defaultTargetReps: 10 },
      { exerciseId: 'ex_6', exerciseName: 'Leg Press', primaryMuscle: 'Legs', defaultSets: 3, defaultTargetReps: 12 },
      { exerciseId: 'ex_17', exerciseName: 'Hanging Leg Raise', primaryMuscle: 'Abs', defaultSets: 3, defaultTargetReps: 15 },
    ]
  }
];

const INITIAL_WEIGHT_METRICS: BodyMetricLog[] = [
  { id: 'bm_1', date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0], weightKg: 78.5, notes: 'Starting metric' },
  { id: 'bm_2', date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], weightKg: 78.0, notes: 'Feeling leaner' },
  { id: 'bm_3', date: new Date().toISOString().split('T')[0], weightKg: 77.6, bodyFatPercentage: 15.2, notes: 'Morning weigh-in' },
];

const KEYS = {
  EXERCISES: 'pixel_gym_exercises',
  ROUTINES: 'pixel_gym_routines',
  WORKOUT_LOGS: 'pixel_gym_workout_logs',
  ACTIVE_WORKOUT: 'pixel_gym_active_workout',
  BODY_METRICS: 'pixel_gym_body_metrics',
  PROGRESS_PHOTOS: 'pixel_gym_progress_photos',
  UNIT_PREF: 'pixel_gym_unit_pref',
};

class GymService {
  private notifyListeners() {
    window.dispatchEvent(new Event('gym-updated'));
  }

  // --- Exercises ---
  getExercises(): Exercise[] {
    try {
      const raw = localStorage.getItem(KEYS.EXERCISES);
      if (!raw) {
        localStorage.setItem(KEYS.EXERCISES, JSON.stringify(DEFAULT_EXERCISES));
        return DEFAULT_EXERCISES;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_EXERCISES;
    }
  }

  addCustomExercise(exercise: Omit<Exercise, 'id' | 'isCustom'>): Exercise {
    const exercises = this.getExercises();
    const newEx: Exercise = {
      ...exercise,
      id: 'custom_ex_' + Date.now(),
      isCustom: true,
    };
    const updated = [newEx, ...exercises];
    localStorage.setItem(KEYS.EXERCISES, JSON.stringify(updated));
    this.notifyListeners();
    return newEx;
  }

  // --- Routines ---
  getRoutines(): WorkoutRoutine[] {
    try {
      const raw = localStorage.getItem(KEYS.ROUTINES);
      if (!raw) {
        localStorage.setItem(KEYS.ROUTINES, JSON.stringify(DEFAULT_ROUTINES));
        return DEFAULT_ROUTINES;
      }
      return JSON.parse(raw);
    } catch {
      return DEFAULT_ROUTINES;
    }
  }

  saveRoutine(routine: Omit<WorkoutRoutine, 'id'> & { id?: string }): WorkoutRoutine {
    const routines = this.getRoutines();
    let updatedRoutine: WorkoutRoutine;
    if (routine.id) {
      updatedRoutine = routine as WorkoutRoutine;
      const index = routines.findIndex(r => r.id === routine.id);
      if (index !== -1) routines[index] = updatedRoutine;
      else routines.push(updatedRoutine);
    } else {
      updatedRoutine = {
        ...routine,
        id: 'rt_' + Date.now(),
      };
      routines.push(updatedRoutine);
    }
    localStorage.setItem(KEYS.ROUTINES, JSON.stringify(routines));
    this.notifyListeners();
    return updatedRoutine;
  }

  deleteRoutine(id: string) {
    const routines = this.getRoutines().filter(r => r.id !== id);
    localStorage.setItem(KEYS.ROUTINES, JSON.stringify(routines));
    this.notifyListeners();
  }

  // --- Active Workout State ---
  getActiveWorkout(): WorkoutLog | null {
    try {
      const raw = localStorage.getItem(KEYS.ACTIVE_WORKOUT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  saveActiveWorkout(workout: WorkoutLog | null) {
    if (workout) {
      localStorage.setItem(KEYS.ACTIVE_WORKOUT, JSON.stringify(workout));
    } else {
      localStorage.removeItem(KEYS.ACTIVE_WORKOUT);
    }
    this.notifyListeners();
  }

  // --- Completed Workout Logs ---
  getWorkoutLogs(): WorkoutLog[] {
    try {
      const raw = localStorage.getItem(KEYS.WORKOUT_LOGS);
      if (!raw) return [];
      const logs: WorkoutLog[] = JSON.parse(raw);
      return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      return [];
    }
  }

  saveWorkoutLog(workout: WorkoutLog) {
    const logs = this.getWorkoutLogs();
    const existingIdx = logs.findIndex(l => l.id === workout.id);
    if (existingIdx !== -1) {
      logs[existingIdx] = workout;
    } else {
      logs.unshift(workout);
    }
    localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));
    this.saveActiveWorkout(null); // Clear active session when saved
    this.notifyListeners();
  }

  deleteWorkoutLog(id: string) {
    const logs = this.getWorkoutLogs().filter(l => l.id !== id);
    localStorage.setItem(KEYS.WORKOUT_LOGS, JSON.stringify(logs));
    this.notifyListeners();
  }

  // --- Body Metrics ---
  getBodyMetrics(): BodyMetricLog[] {
    try {
      const raw = localStorage.getItem(KEYS.BODY_METRICS);
      if (!raw) {
        localStorage.setItem(KEYS.BODY_METRICS, JSON.stringify(INITIAL_WEIGHT_METRICS));
        return INITIAL_WEIGHT_METRICS;
      }
      const logs: BodyMetricLog[] = JSON.parse(raw);
      return logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch {
      return INITIAL_WEIGHT_METRICS;
    }
  }

  addBodyMetric(metric: Omit<BodyMetricLog, 'id'>): BodyMetricLog {
    const metrics = this.getBodyMetrics();
    const newMetric: BodyMetricLog = {
      ...metric,
      id: 'bm_' + Date.now(),
    };
    // Replace if entry for same date exists, else append
    const existingIndex = metrics.findIndex(m => m.date === metric.date);
    if (existingIndex !== -1) {
      metrics[existingIndex] = newMetric;
    } else {
      metrics.push(newMetric);
    }
    metrics.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    localStorage.setItem(KEYS.BODY_METRICS, JSON.stringify(metrics));
    this.notifyListeners();
    return newMetric;
  }

  deleteBodyMetric(id: string) {
    const metrics = this.getBodyMetrics().filter(m => m.id !== id);
    localStorage.setItem(KEYS.BODY_METRICS, JSON.stringify(metrics));
    this.notifyListeners();
  }

  // --- Progress Photos ---
  getProgressPhotos(): ProgressPhoto[] {
    try {
      const raw = localStorage.getItem(KEYS.PROGRESS_PHOTOS);
      if (!raw) return [];
      const photos: ProgressPhoto[] = JSON.parse(raw);
      return photos.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      return [];
    }
  }

  addProgressPhoto(photo: Omit<ProgressPhoto, 'id'>): ProgressPhoto {
    const photos = this.getProgressPhotos();
    const newPhoto: ProgressPhoto = {
      ...photo,
      id: 'photo_' + Date.now(),
    };
    photos.unshift(newPhoto);
    localStorage.setItem(KEYS.PROGRESS_PHOTOS, JSON.stringify(photos));
    this.notifyListeners();
    return newPhoto;
  }

  deleteProgressPhoto(id: string) {
    const photos = this.getProgressPhotos().filter(p => p.id !== id);
    localStorage.setItem(KEYS.PROGRESS_PHOTOS, JSON.stringify(photos));
    this.notifyListeners();
  }

  // --- Preferences ---
  getUnitPreference(): 'kg' | 'lbs' {
    return (localStorage.getItem(KEYS.UNIT_PREF) as 'kg' | 'lbs') || 'kg';
  }

  setUnitPreference(unit: 'kg' | 'lbs') {
    localStorage.setItem(KEYS.UNIT_PREF, unit);
    this.notifyListeners();
  }
}

export const gymService = new GymService();
