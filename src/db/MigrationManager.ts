import { transactionRepo } from './repositories/TransactionRepository';
import { categoryRepo } from './repositories/CategoryRepository';
import { budgetRepo } from './repositories/BudgetRepository';
import { fuelRepo } from './repositories/FuelRepository';
import { mileageRepo } from './repositories/MileageRepository';
import { vehicleRepo } from './repositories/VehicleRepository';
import { receiptRepo } from './repositories/ReceiptRepository';
import { Preferences } from '@capacitor/preferences';
import { Transaction, Category, Budget } from './types';
import { dbService } from './DatabaseService';

const MIGRATION_STATUS_KEY = 'reimburse_sqlite_migration_status';

export class MigrationManager {
  static async getMigrationStatus(): Promise<'not_started' | 'completed' | 'failed'> {
    const { value } = await Preferences.get({ key: MIGRATION_STATUS_KEY });
    return (value as any) || 'not_started';
  }

  static async isMigrationNeeded(): Promise<boolean> {
    const status = await this.getMigrationStatus();
    return status === 'not_started';
  }

  static async migrateAll(): Promise<void> {
    console.log('[MigrationManager] Starting data migration to SQLite...');
    
    try {
      await dbService.initialize();
      const db = await dbService.getDbConnection();

      // 1. Categories
      const categoriesJson = localStorage.getItem('reimburse_categories_v1');
      if (categoriesJson) {
        const categories = JSON.parse(categoriesJson) as any[];
        for (const cat of categories) {
          try {
            await categoryRepo.create({
              id: cat.id,
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              type: cat.type || 'expense',
              is_default: cat.isDefault ? 1 : 0
            });
          } catch (e) {
            console.warn(`[MigrationManager] Failed to migrate category ${cat.id}:`, e);
          }
        }
      }

      // 2. Transactions (Expenses)
      const expensesJson = localStorage.getItem('reimburse_expenses_v2');
      if (expensesJson) {
        const expenses = JSON.parse(expensesJson) as any[];
        for (const exp of expenses) {
          try {
            await transactionRepo.create({
              id: exp.id,
              amount: exp.amount,
              merchant: exp.merchant,
              category_id: exp.categoryId,
              account_id: exp.accountId,
              type: exp.type || 'expense',
              timestamp: exp.date || exp.timestamp || new Date().toISOString(),
              notes: exp.notes,
              source: exp.source,
              status: exp.status || 'completed'
            });
          } catch (e) {
            console.warn(`[MigrationManager] Failed to migrate transaction ${exp.id}:`, e);
          }
        }
      }

      // 3. Budgets
      const budgetsJson = localStorage.getItem('reimburse_budgets_v1');
      if (budgetsJson) {
        const budgets = JSON.parse(budgetsJson) as any[];
        for (const bud of budgets) {
          await budgetRepo.create({
            id: bud.id,
            category_id: bud.categoryId,
            amount: bud.amount,
            period: bud.period || 'monthly',
            start_date: bud.startDate || new Date().toISOString()
          });
        }
      }

      // 4. Migrate Vehicles
      const legacyVehicles = JSON.parse(localStorage.getItem('reimburse_vehicles_v1') || '[]');
      console.log(`[MigrationManager] Migrating ${legacyVehicles.length} vehicles...`);
      for (const v of legacyVehicles) {
        await vehicleRepo.create({
          id: v.id,
          name: v.name,
          rate_per_km: v.ratePerKm,
          icon: v.icon
        }).catch(() => {});
      }

      // 5. Migrate Fuel Logs
      const legacyFuel = JSON.parse(localStorage.getItem('reimburse_fuel_v1') || '[]');
      console.log(`[MigrationManager] Migrating ${legacyFuel.length} fuel logs...`);
      for (const f of legacyFuel) {
        await fuelRepo.create({
          id: f.id,
          vehicle_id: f.vehicleId,
          odometer: f.odometer,
          liters: f.liters,
          price_per_liter: f.pricePerLiter,
          total_cost: f.totalCost,
          station: f.station,
          timestamp: f.date || f.timestamp,
          distance_since_last: f.distanceSinceLast,
          economy: f.economy,
          economy_trend: f.economyTrend,
          is_full_tank: f.isFullTank ? 1 : 0
        }).catch(() => {});
      }

      // 6. Migrate Mileage Logs
      const legacyMileage = JSON.parse(localStorage.getItem('reimburse_mileage_v1') || '[]');
      console.log(`[MigrationManager] Migrating ${legacyMileage.length} mileage logs...`);
      for (const m of legacyMileage) {
        await mileageRepo.create({
          id: m.id,
          vehicle_id: m.vehicleId,
          start_km: m.startKm,
          end_km: m.endKm,
          total_km: m.totalKm,
          purpose: m.purpose,
          timestamp: m.date || m.timestamp,
          is_billed: m.isBilled ? 1 : 0,
          expense_id: m.expenseId
        }).catch(() => {});
      }

      // 7. Migrate Receipts
      const legacyReceipts = JSON.parse(localStorage.getItem('reimburse_wallet_v1') || '[]');
      console.log(`[MigrationManager] Migrating ${legacyReceipts.length} receipts...`);
      for (const r of legacyReceipts) {
        await receiptRepo.create({
          id: r.id,
          image_uri: r.imageUri,
          created_at: r.createdAt || r.timestamp,
          processed_status: 'completed'
        }).catch(() => {});
      }

      // Mark as completed
      await Preferences.set({ key: MIGRATION_STATUS_KEY, value: 'completed' });
      console.log('[MigrationManager] Migration completed successfully.');
    } catch (error) {
      console.error('[MigrationManager] Migration failed:', error);
      throw error;
    }
  }

  static async clearLegacyData(): Promise<void> {
    console.log('[MigrationManager] Clearing legacy localStorage data...');
    const keysToRemove = [
      'reimburse_expenses_v2',
      'reimburse_categories_v1',
      'reimburse_budgets_v1',
      'reimburse_fuel_v1',
      'reimburse_mileage_v1',
      'reimburse_wallet_v1',
      'reimburse_sync_queue'
    ];
    
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
      await Preferences.remove({ key });
    }
    console.log('[MigrationManager] Legacy data cleared.');
  }

  static async backupBeforeMigration(): Promise<string> {
    // Basic backup: copy all localStorage to a JSON string
    const data: Record<string, string | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('reimburse_')) {
        data[key] = localStorage.getItem(key);
      }
    }
    const backupJson = JSON.stringify(data);
    await Preferences.set({ key: 'reimburse_pre_sqlite_backup', value: backupJson });
    return backupJson;
  }
}
