import { DiningExperience, Dish } from '@/types/food';
import { storageEngine } from '@/lib/storage-engine';

const FOOD_STORAGE_KEY = 'reimburse_food_v1';

export const foodService = {
  getExperiences(): DiningExperience[] {
    try {
      const data = localStorage.getItem(FOOD_STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
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
  },

  getUniqueRestaurants() {
    const experiences = this.getExperiences();
    const map = new Map<string, { restaurantName: string, cuisine?: string, location?: any, priceRange?: string }>();
    
    // Sort by date descending so we get the most recent metadata
    const sorted = [...experiences].sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
    
    sorted.forEach(e => {
      if (!map.has(e.restaurantName.toLowerCase())) {
        map.set(e.restaurantName.toLowerCase(), {
          restaurantName: e.restaurantName,
          cuisine: e.cuisine,
          location: e.location,
          priceRange: e.priceRange
        });
      }
    });
    
    return Array.from(map.values());
  },

  getDishesByRestaurant(restaurantName: string): Dish[] {
    const experiences = this.getExperiences();
    const dishes = new Map<string, Dish>();
    
    experiences
      .filter(e => e.restaurantName.toLowerCase().trim() === restaurantName.toLowerCase().trim())
      .forEach(e => {
        e.dishes.forEach(d => {
          const key = d.name.toLowerCase().trim();
          if (!dishes.has(key)) {
            dishes.set(key, d);
          }
        });
      });
      
    return Array.from(dishes.values());
  }
};
