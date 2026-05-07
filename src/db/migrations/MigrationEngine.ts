import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { MIGRATIONS } from './schema';

export class MigrationEngine {
  static async run(db: SQLiteDBConnection): Promise<void> {
    try {
      // Create version table if it doesn't exist
      await db.execute(`
        CREATE TABLE IF NOT EXISTS db_version (
          version INTEGER PRIMARY KEY
        );
      `);

      // Get current version
      const result = await db.query('SELECT version FROM db_version');
      const currentVersion = result.values && result.values.length > 0 ? result.values[0].version : 0;

      console.log(`[MigrationEngine] Current version: ${currentVersion}`);

      for (const migration of MIGRATIONS) {
        if (migration.version > currentVersion) {
          console.log(`[MigrationEngine] Running migration to version ${migration.version}`);
          
          await db.execute('BEGIN TRANSACTION');
          try {
            for (const statement of migration.statements) {
              await db.execute(statement);
            }
            
            if (currentVersion === 0) {
              await db.execute(`INSERT INTO db_version (version) VALUES (${migration.version})`);
            } else {
              await db.execute(`UPDATE db_version SET version = ${migration.version}`);
            }
            
            await db.execute('COMMIT');
            console.log(`[MigrationEngine] Successfully migrated to version ${migration.version}`);
          } catch (error) {
            await db.execute('ROLLBACK');
            console.error(`[MigrationEngine] Migration to version ${migration.version} failed:`, error);
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('[MigrationEngine] Fatal error during migrations:', error);
      throw error;
    }
  }
}
