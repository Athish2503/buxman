import { Capacitor } from '@capacitor/core';
import { storageEngine } from './storage-engine';
import { transactionRepo } from '@/db/repositories/TransactionRepository';
import { categoryRepo } from '@/db/repositories/CategoryRepository';
import { budgetRepo } from '@/db/repositories/BudgetRepository';
import { Preferences } from '@capacitor/preferences';
import { dbService } from '@/db/DatabaseService';

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
  dining: any[];
  budgets?: any[];
}

export const dataMigrationService = {
  async isSqliteActive(): Promise<boolean> {
    const { value } = await Preferences.get({ key: 'reimburse_sqlite_migration_status' });
    return value === 'completed';
  },

  /**
   * Exports all application data into a single JSON object
   */
  async exportAllData(): Promise<FullExportData> {
    if (await this.isSqliteActive()) {
      const [txs, cats, buds] = await Promise.all([
        transactionRepo.findAll(),
        categoryRepo.findAll(),
        budgetRepo.findAll()
      ]);

      return {
        version: DATA_VERSION,
        timestamp: new Date().toISOString(),
        expenses: txs.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          merchant: tx.merchant,
          categoryId: tx.category_id,
          accountId: tx.account_id,
          date: tx.timestamp,
          notes: tx.notes || '',
          status: tx.status,
          isReimbursement: tx.type === 'expense',
          type: tx.type
        })),
        settings: JSON.parse(localStorage.getItem('reimburse_settings_v2') || '{}'),
        categories: cats,
        budgets: buds,
        vehicles: JSON.parse(localStorage.getItem('reimburse_vehicles_v1') || '[]'),
        mileage: JSON.parse(localStorage.getItem('reimburse_mileage_v1') || '[]'),
        fuel: JSON.parse(localStorage.getItem('reimburse_fuel_v1') || '[]'),
        wallet: JSON.parse(localStorage.getItem('reimburse_wallet_v1') || '[]'),
        dining: JSON.parse(localStorage.getItem('reimburse_food_v1') || '[]'),
      } as any;
    }

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
      dining: JSON.parse(localStorage.getItem('reimburse_food_v1') || '[]'),
    };
    return data;
  },

  /**
   * Converts the full app data to a flattened CSV string
   */
  convertToCSV(data: FullExportData): string {
    const lines: string[] = [];
    
    // Metadata Header
    lines.push(`METADATA,version,${data.version},timestamp,${data.timestamp}`);
    lines.push(''); // Spacer

    // Helper to add entity rows
    const addEntities = (type: string, items: any[]) => {
      if (!items || items.length === 0) return;
      
      // Get all unique keys for headers
      const keys = Array.from(new Set(items.flatMap(item => Object.keys(item))));
      lines.push(`HEADER,${type},${keys.join(',')}`);
      
      items.forEach(item => {
        const values = keys.map(key => {
          const val = item[key];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
          return `"${String(val).replace(/"/g, '""')}"`;
        });
        lines.push(`DATA,${type},${values.join(',')}`);
      });
      lines.push(''); // Spacer
    };

    addEntities('SETTINGS', [data.settings]);
    addEntities('CATEGORIES', data.categories);
    addEntities('EXPENSES', data.expenses);
    addEntities('VEHICLES', data.vehicles);
    addEntities('MILEAGE', data.mileage);
    addEntities('FUEL', data.fuel);
    addEntities('WALLET', data.wallet);
    addEntities('DINING', data.dining);

    return lines.join('\n');
  },

  /**
   * Parses the flattened CSV back into FullExportData
   */
  parseCSV(csv: string): FullExportData {
    const lines = csv.split('\n');
    const data: FullExportData = {
      version: DATA_VERSION,
      timestamp: new Date().toISOString(),
      expenses: [],
      settings: {},
      categories: [],
      vehicles: [],
      mileage: [],
      fuel: [],
      wallet: [],
      dining: []
    };

    let currentHeaders: string[] = [];
    let currentType = '';

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length < 2) return;

      const rowType = parts[0];
      const entityType = parts[1];

      if (rowType === 'METADATA') {
        data.version = parts[2] || DATA_VERSION;
        data.timestamp = parts[4] || new Date().toISOString();
      } else if (rowType === 'HEADER') {
        currentType = entityType;
        currentHeaders = parts.slice(2);
      } else if (rowType === 'DATA' && currentType === entityType) {
        // Simple CSV parser for quoted values
        const rowData: any = {};
        
        // Re-join the values because split(',') breaks on quoted commas
        // This is a naive parser but works for our internal format
        const valuesLine = parts.slice(2).join(',');
        const values: string[] = [];
        let currentVal = '';
        let inQuotes = false;
        
        for (let i = 0; i < valuesLine.length; i++) {
          const char = valuesLine[i];
          if (char === '"') {
            if (inQuotes && valuesLine[i+1] === '"') {
              currentVal += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            values.push(currentVal);
            currentVal = '';
          } else {
            currentVal += char;
          }
        }
        values.push(currentVal);

        currentHeaders.forEach((header, index) => {
          let val = values[index];
          if (val === undefined || val === '') {
            rowData[header] = null;
          } else {
            try {
              // Try to parse as JSON if it looks like an object/array
              if (val.startsWith('{') || val.startsWith('[')) {
                rowData[header] = JSON.parse(val);
              } else if (!isNaN(Number(val)) && val.trim() !== '') {
                rowData[header] = Number(val);
              } else if (val === 'true') {
                rowData[header] = true;
              } else if (val === 'false') {
                rowData[header] = false;
              } else {
                rowData[header] = val;
              }
            } catch (e) {
              rowData[header] = val;
            }
          }
        });

        if (currentType === 'SETTINGS') data.settings = rowData;
        else if (currentType === 'CATEGORIES') data.categories.push(rowData);
        else if (currentType === 'EXPENSES') data.expenses.push(rowData);
        else if (currentType === 'VEHICLES') data.vehicles.push(rowData);
        else if (currentType === 'MILEAGE') data.mileage.push(rowData);
        else if (currentType === 'FUEL') data.fuel.push(rowData);
        else if (currentType === 'WALLET') data.wallet.push(rowData);
        else if (currentType === 'DINING') data.dining.push(rowData);
      }
    });

    return data;
  },

  /**
   * Imports full application data and persists it
   */
  async importData(content: string, format: 'json' | 'csv' = 'json'): Promise<boolean> {
    try {
      console.log(`[Data Migration] Starting ${format} import...`);
      let data: FullExportData;
      
      if (format === 'json') {
        data = JSON.parse(content) as FullExportData;
      } else {
        data = this.parseCSV(content);
      }
      
      // Basic validation
      if (!data.version) {
        throw new Error('Missing version in backup file');
      }

      const sqliteActive = await this.isSqliteActive();

      // Helper to set data if it exists in the import
      const syncKey = async (key: string, value: any, entityType: string) => {
        if (value !== undefined && value !== null) {
          console.log(`[Data Migration] Syncing ${key}...`);
          
          if (sqliteActive) {
            if (entityType === 'expenses') {
              for (const exp of value) {
                await transactionRepo.create({
                  id: exp.id,
                  amount: exp.amount,
                  merchant: exp.merchant,
                  category_id: exp.categoryId || exp.category_id,
                  account_id: exp.accountId || exp.account_id || 'default',
                  type: exp.type || 'expense',
                  is_reimbursement: exp.isReimbursement ? 1 : 0,
                  timestamp: exp.date || exp.timestamp,
                  notes: exp.notes,
                  status: exp.status || 'completed'
                }).catch(() => {}); // Skip duplicates
              }
            } else if (entityType === 'categories') {
              for (const cat of value) {
                await categoryRepo.create(cat).catch(() => {});
              }
            } else if (entityType === 'budgets') {
              for (const bud of value) {
                await budgetRepo.create(bud).catch(() => {});
              }
            }
          }
          
          // Always keep a legacy copy for safety or if sqlite is not active
          await storageEngine.set(key, JSON.stringify(value));
        }
      };

      await syncKey('reimburse_expenses_v2', data.expenses, 'expenses');
      await syncKey('reimburse_settings_v2', data.settings, 'settings');
      await syncKey('reimburse_categories_v1', data.categories, 'categories');
      await syncKey('reimburse_budgets_v1', data.budgets, 'budgets');
      await syncKey('reimburse_vehicles_v1', data.vehicles, 'vehicles');
      await syncKey('reimburse_mileage_v1', data.mileage, 'mileage');
      await syncKey('reimburse_fuel_v1', data.fuel, 'fuel');
      await syncKey('reimburse_wallet_v1', data.wallet, 'wallet');
      await syncKey('reimburse_food_v1', data.dining, 'dining');

      console.log('[Data Migration] Import successful');
      return true;
    } catch (error) {
      console.error('[Data Migration] Import failed:', error);
      return false;
    }
  },

  /**
   * Downloads the data as a JSON/CSV file (Web) or shares it (Mobile)
   */
  async downloadBackup(format: 'json' | 'csv' = 'json') {
    const data = await this.exportAllData();
    const content = format === 'json' 
      ? JSON.stringify(data, null, 2) 
      : this.convertToCSV(data);
      
    const date = new Date().toISOString().split('T')[0];
    const fileName = `buxman-backup-${date}.${format}`;
    const mimeType = format === 'json' ? 'application/json' : 'text/csv';

    // Handle Mobile Native Platform
    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        // 1. Write file to temporary storage
        const result = await Filesystem.writeFile({
          path: fileName,
          data: content,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // 2. Open Native Share sheet
        await Share.share({
          title: 'Buxman Backup',
          text: `Full app backup in ${format.toUpperCase()} format`,
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
      const blob = new Blob([content], { type: mimeType });
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
          // Detect format from content
          const content = event.detail.content;
          const format = content.trim().startsWith('{') ? 'json' : 'csv';
          const success = await this.importData(content, format);
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


