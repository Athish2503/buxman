import { Capacitor } from '@capacitor/core';
import { storageEngine } from './storage-engine';

const DATA_VERSION = '1.0';

export interface FullExportData {
  version: string;
  timestamp: string;
  expenses: any[];
  settings: any;
  categories: any[];
  vehicles: any[];
  mileage: any[];
  fuel: any[];
  wallet: any[];
}

export const dataMigrationService = {
  /**
   * Exports all application data into a single JSON object
   */
  exportAllData(): FullExportData {
    const data: FullExportData = {
      version: DATA_VERSION,
      timestamp: new Date().toISOString(),
      expenses: JSON.parse(localStorage.getItem('reimburse_expenses_v2') || '[]'),
      settings: JSON.parse(localStorage.getItem('reimburse_settings_v2') || '{}'),
      categories: JSON.parse(localStorage.getItem('reimburse_categories_v1') || '[]'),
      vehicles: JSON.parse(localStorage.getItem('reimburse_vehicles_v1') || '[]'),
      mileage: JSON.parse(localStorage.getItem('reimburse_mileage_v1') || '[]'),
      fuel: JSON.parse(localStorage.getItem('reimburse_fuel_v1') || '[]'),
      wallet: JSON.parse(localStorage.getItem('reimburse_wallet_v1') || '[]'),
    };
    return data;
  },

  /**
   * Imports full application data and persists it
   */
  async importData(jsonString: string): Promise<boolean> {
    try {
      console.log('[Data Migration] Starting import...');
      const data = JSON.parse(jsonString) as FullExportData;
      
      // Basic validation
      if (!data.version) {
        throw new Error('Missing version in backup file');
      }

      // Helper to set data if it exists in the import
      const syncKey = async (key: string, value: any) => {
        // If value is an array, we import it (even if empty)
        // If value is an object, we import it (even if empty)
        if (value !== undefined && value !== null) {
          console.log(`[Data Migration] Syncing ${key}...`);
          await storageEngine.set(key, JSON.stringify(value));
        }
      };

      await syncKey('reimburse_expenses_v2', data.expenses);
      await syncKey('reimburse_settings_v2', data.settings);
      await syncKey('reimburse_categories_v1', data.categories);
      await syncKey('reimburse_vehicles_v1', data.vehicles);
      await syncKey('reimburse_mileage_v1', data.mileage);
      await syncKey('reimburse_fuel_v1', data.fuel);
      await syncKey('reimburse_wallet_v1', data.wallet);

      console.log('[Data Migration] Import successful');
      return true;
    } catch (error) {
      console.error('[Data Migration] Import failed:', error);
      return false;
    }
  },

  /**
   * Downloads the data as a JSON file (Web) or shares it (Mobile)
   */
  async downloadBackup() {
    const data = this.exportAllData();
    const json = JSON.stringify(data, null, 2);
    const date = new Date().toISOString().split('T')[0];
    const fileName = `pixel-reimburse-backup-${date}.json`;

    // Handle Mobile Native Platform
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        // 1. Write file to temporary storage
        const result = await Filesystem.writeFile({
          path: fileName,
          data: json,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // 2. Open Native Share sheet
        await Share.share({
          title: 'Pixel Reimburse Backup',
          text: 'Backup of your financial data',
          url: result.uri,
          dialogTitle: 'Save or Share Backup',
        });
        
        return true;
      } catch (e) {
        console.error('[Data Migration] Native export failed:', e);
        return false;
      }
    }

    // Handle Web Platform
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('[Data Migration] Web export failed:', e);
      return false;
    }
  },

  /**
   * Triggers native file picker and imports the selected data
   */
  async pickAndImportData(): Promise<boolean> {
    if (!Capacitor.isNativePlatform() || !(window as any).NativeBridge) {
      return false;
    }

    return new Promise((resolve) => {
      const handler = async (event: any) => {
        window.removeEventListener('file-picked', handler);
        if (event.detail && event.detail.content) {
          const success = await this.importData(event.detail.content);
          resolve(success);
        } else {
          resolve(false);
        }
      };

      window.addEventListener('file-picked', handler);
      (window as any).NativeBridge.pickFile();
      
      // Safety timeout
      setTimeout(() => {
        window.removeEventListener('file-picked', handler);
        resolve(false);
      }, 60000); // 1 minute timeout for user to pick file
    });
  }
};

