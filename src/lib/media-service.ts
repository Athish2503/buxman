import { MediaRecommendation, CustomMediaList } from '@/types/media';
import { storageEngine } from './storage-engine';

const MEDIA_KEY = 'reimburse_media_recommendations_v1';
const LISTS_KEY = 'reimburse_media_custom_lists_v1';

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
    const cleanTitle = item.title.trim().toLowerCase();
    const cleanImdbId = item.imdbId?.trim().toLowerCase();
    
    // Check if duplicate exists (case-insensitive title or matching imdbId)
    const existing = list.find(m => 
      m.title.trim().toLowerCase() === cleanTitle || 
      (cleanImdbId && m.imdbId && m.imdbId.trim().toLowerCase() === cleanImdbId)
    );

    if (existing) {
      return existing;
    }

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

    // Clean up from custom lists
    const customLists = this.getCustomLists();
    let listsUpdated = false;
    customLists.forEach(l => {
      if (l.itemIds.includes(id)) {
        l.itemIds = l.itemIds.filter(itemId => itemId !== id);
        listsUpdated = true;
      }
    });
    if (listsUpdated) {
      this.saveCustomLists(customLists);
    }
  },

  // ── Custom Lists ───────────────────────────────────────────────────
  getCustomLists(): CustomMediaList[] {
    try {
      const stored = localStorage.getItem(LISTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveCustomLists(lists: CustomMediaList[]): void {
    storageEngine.set(LISTS_KEY, JSON.stringify(lists));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('media-lists-updated'));
    }
  },

  createCustomList(input: { name: string; description?: string; color?: string; emoji?: string; itemIds?: string[] }): CustomMediaList {
    const lists = this.getCustomLists();
    const newList: CustomMediaList = {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim(),
      color: input.color || 'purple',
      emoji: input.emoji || '🎬',
      itemIds: input.itemIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    lists.unshift(newList);
    this.saveCustomLists(lists);
    return newList;
  },

  updateCustomList(updated: CustomMediaList): void {
    const lists = this.getCustomLists();
    const idx = lists.findIndex(l => l.id === updated.id);
    if (idx !== -1) {
      lists[idx] = { ...updated, updatedAt: new Date().toISOString() };
      this.saveCustomLists(lists);
    }
  },

  deleteCustomList(id: string): void {
    const lists = this.getCustomLists();
    const filtered = lists.filter(l => l.id !== id);
    this.saveCustomLists(filtered);
  },

  toggleItemInList(listId: string, itemId: string): boolean {
    const lists = this.getCustomLists();
    const target = lists.find(l => l.id === listId);
    if (!target) return false;

    const exists = target.itemIds.includes(itemId);
    if (exists) {
      target.itemIds = target.itemIds.filter(id => id !== itemId);
    } else {
      target.itemIds.push(itemId);
    }
    target.updatedAt = new Date().toISOString();
    this.saveCustomLists(lists);

    // Also update media recommendation listIds
    const media = this.getMedia();
    const mediaItem = media.find(m => m.id === itemId);
    if (mediaItem) {
      const currentListIds = mediaItem.listIds || [];
      if (exists) {
        mediaItem.listIds = currentListIds.filter(id => id !== listId);
      } else {
        mediaItem.listIds = [...currentListIds, listId];
      }
      this.saveMedia(media);
    }

    return !exists;
  }
};
