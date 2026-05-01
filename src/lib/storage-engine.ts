import { Preferences } from '@capacitor/preferences';

/**
 * Robust mobile-first storage engine that combines the speed of synchronous
 * localStorage with the persistent, OS-level reliability of Capacitor Preferences.
 */
export const storageEngine = {
  /**
   * Called once at app startup. Syncs all native preferences into memory (localStorage)
   * so the app can run completely synchronously without async loading states on every view.
   */
  async init(): Promise<void> {
    try {
      const { keys } = await Preferences.keys();
      for (const key of keys) {
        if (key.startsWith('reimburse_')) {
          const { value } = await Preferences.get({ key });
          if (value) localStorage.setItem(key, value);
        }
      }
      console.log('[Storage Engine] Native preferences synced to memory.');
    } catch (e) {
      console.error('[Storage Engine] Failed to sync native preferences:', e);
    }
  },

  /**
   * Replaces localStorage.setItem.
   * Writes to memory immediately for fast UI, then writes asynchronously to native storage.
   */
  set(key: string, value: string): void {
    localStorage.setItem(key, value);
    Preferences.set({ key, value }).catch(e => 
      console.error(`[Storage Engine] Failed to persist key ${key}:`, e)
    );
  },

  /**
   * Replaces localStorage.removeItem.
   */
  remove(key: string): void {
    localStorage.removeItem(key);
    Preferences.remove({ key }).catch(e => 
      console.error(`[Storage Engine] Failed to remove key ${key}:`, e)
    );
  }
};
