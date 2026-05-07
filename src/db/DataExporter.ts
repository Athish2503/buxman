import { transactionRepo } from './repositories/TransactionRepository';
import { categoryRepo } from './repositories/CategoryRepository';
import { budgetRepo } from './repositories/BudgetRepository';
import { dbService } from './DatabaseService';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export class DataExporter {
  static async exportToJSON(): Promise<void> {
    try {
      const [transactions, categories, budgets] = await Promise.all([
        transactionRepo.findAll(),
        categoryRepo.findAll(),
        budgetRepo.findAll()
      ]);

      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        transactions,
        categories,
        budgets
      };

      const fileName = `buxman_export_${new Date().getTime()}.json`;
      const fileContent = JSON.stringify(data, null, 2);

      const result = await Filesystem.writeFile({
        path: fileName,
        data: fileContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });

      await Share.share({
        title: 'Buxman Data Export',
        text: 'Backup of your Buxman application data',
        url: result.uri,
        dialogTitle: 'Share data backup'
      });
    } catch (error) {
      console.error('[DataExporter] Export failed:', error);
      throw error;
    }
  }

  static async importFromJSON(jsonString: string): Promise<void> {
    const data = JSON.parse(jsonString);
    if (!data.transactions || !data.categories) {
      throw new Error('Invalid backup file');
    }

    await dbService.executeTransaction(async (db) => {
      // 1. Import Categories (upsert)
      for (const cat of data.categories) {
        await categoryRepo.create(cat).catch(() => categoryRepo.update(cat));
      }

      // 2. Import Transactions (upsert)
      for (const tx of data.transactions) {
        await transactionRepo.create(tx).catch(() => transactionRepo.update(tx));
      }

      // 3. Import Budgets (upsert)
      if (data.budgets) {
        for (const bud of data.budgets) {
          await budgetRepo.create(bud).catch(() => budgetRepo.update(bud));
        }
      }
    });
  }

  static async createDatabaseBackup(): Promise<void> {
    // For SQLite, a backup is just copying the .db file
    // @capacitor-community/sqlite doesn't directly expose the file path in a standard way across platforms
    // but we can use their exportToJson feature which is internal to the plugin
    const db = await dbService.getDbConnection();
    const exportData = await db.exportToJson('full');
    
    const fileName = `sqlite_backup_${new Date().getTime()}.json`;
    const result = await Filesystem.writeFile({
      path: fileName,
      data: JSON.stringify(exportData.export),
      directory: Directory.Documents,
      encoding: Encoding.UTF8
    });

    await Share.share({
      title: 'SQLite Full Backup',
      url: result.uri
    });
  }
}
