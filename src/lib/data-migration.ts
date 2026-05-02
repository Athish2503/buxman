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
      const data = JSON.parse(jsonString) as FullExportData;
      
      // Basic validation
      if (!data.version || !Array.isArray(data.expenses)) {
        throw new Error('Invalid backup file format');
      }

      // Helper to set data if it exists in the import
      const syncKey = (key: string, value: any) => {
        if (value && (Array.isArray(value) ? value.length > 0 : Object.keys(value).length > 0)) {
          storageEngine.set(key, JSON.stringify(value));
        }
      };

      syncKey('reimburse_expenses_v2', data.expenses);
      syncKey('reimburse_settings_v2', data.settings);
      syncKey('reimburse_categories_v1', data.categories);
      syncKey('reimburse_vehicles_v1', data.vehicles);
      syncKey('reimburse_mileage_v1', data.mileage);
      syncKey('reimburse_fuel_v1', data.fuel);
      syncKey('reimburse_wallet_v1', data.wallet);

      return true;
    } catch (error) {
      console.error('[Data Migration] Import failed:', error);
      return false;
    }
  },

  /**
   * Downloads the data as a JSON file
   */
  downloadBackup() {
    const data = this.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const date = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `pixel-reimburse-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};
