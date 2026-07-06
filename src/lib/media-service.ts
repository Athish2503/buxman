import { MediaRecommendation } from '@/types/media';
import { storageEngine } from './storage-engine';

const MEDIA_KEY = 'reimburse_media_recommendations_v1';

export const mediaService = {
  getMedia(): MediaRecommendation[] {
    try {
      const stored = localStorage.getItem(MEDIA_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveMedia(media: MediaRecommendation[]): void {
    storageEngine.set(MEDIA_KEY, JSON.stringify(media));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('media-updated'));
    }
  },

  addMedia(item: Omit<MediaRecommendation, 'id' | 'createdAt' | 'updatedAt'>): MediaRecommendation {
    const list = this.getMedia();
    const newItem: MediaRecommendation = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newItem);
    this.saveMedia(list);
    return newItem;
  },

  updateMedia(item: MediaRecommendation): void {
    const list = this.getMedia();
    const index = list.findIndex(m => m.id === item.id);
    if (index !== -1) {
      list[index] = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
      this.saveMedia(list);
    }
  },

  deleteMedia(id: string): void {
    const list = this.getMedia();
    const filtered = list.filter(m => m.id !== id);
    this.saveMedia(filtered);
  }
};
