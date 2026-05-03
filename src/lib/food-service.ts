import { DiningExperience } from '@/types/food';
import { storageEngine } from '@/lib/storage-engine';

const FOOD_STORAGE_KEY = 'reimburse_food_v1';

export const foodService = {
  getExperiences(): DiningExperience[] {
    try {
      const data = localStorage.getItem(FOOD_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching dining experiences:', error);
      return [];
    }
  },

  addExperience(experience: DiningExperience) {
    const experiences = this.getExperiences();
    const updated = [experience, ...experiences];
    storageEngine.set(FOOD_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  updateExperience(updatedExp: DiningExperience) {
    const experiences = this.getExperiences();
    const updated = experiences.map((exp) =>
      exp.id === updatedExp.id ? updatedExp : exp
    );
    storageEngine.set(FOOD_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  deleteExperience(id: string) {
    const experiences = this.getExperiences();
    const updated = experiences.filter((exp) => exp.id !== id);
    storageEngine.set(FOOD_STORAGE_KEY, JSON.stringify(updated));
    return updated;
  },

  getExperienceById(id: string): DiningExperience | undefined {
    return this.getExperiences().find((exp) => exp.id === id);
  }
};
