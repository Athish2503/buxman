import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';
import { MigrationEngine } from './migrations/MigrationEngine';

class DatabaseService {
  private sqliteConnection: SQLiteConnection | null = null;
  private dbConnection: SQLiteDBConnection | null = null;
  private dbName: string = 'pixel_reimburse_db';
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const platform = Capacitor.getPlatform();
      
      if (platform === 'web') {
        await customElements.whenDefined('jeep-sqlite');
        const jeepSqlite = document.querySelector('jeep-sqlite');
        if (!jeepSqlite) {
          console.error('[DatabaseService] jeep-sqlite element missing from index.html');
        }
        // Small delay to ensure the plugin's internal listeners are ready
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
      const ret = await this.sqliteConnection.checkConnectionsConsistency();
      const isConn = (await this.sqliteConnection.isConnection(this.dbName, false)).result;

      if (ret.result && isConn) {
        this.dbConnection = await this.sqliteConnection.retrieveConnection(this.dbName, false);
      } else {
        this.dbConnection = await this.sqliteConnection.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
      }

      await this.dbConnection.open();
      
      // Run migrations
      await MigrationEngine.run(this.dbConnection);
      
      this.isInitialized = true;
      console.log('[DatabaseService] Database initialized successfully');
    } catch (error) {
      console.error('[DatabaseService] Error initializing database:', error);
      throw error;
    }
  }

  async getDbConnection(): Promise<SQLiteDBConnection> {
    if (!this.dbConnection) {
      await this.initialize();
    }
    return this.dbConnection!;
  }

  async run(sql: string, params?: any[]): Promise<void> {
    const db = await this.getDbConnection();
    await db.run(sql, params);
    if (Capacitor.getPlatform() === 'web') {
      await this.sqliteConnection?.saveToStore(this.dbName);
    }
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const db = await this.getDbConnection();
    return await db.query(sql, params);
  }

  async executeTransaction<T>(callback: (db: SQLiteDBConnection) => Promise<T>): Promise<T> {
    const db = await this.getDbConnection();
    try {
      await db.execute('BEGIN TRANSACTION');
      const result = await callback(db);
      await db.execute('COMMIT');
      
      if (Capacitor.getPlatform() === 'web') {
        await this.sqliteConnection?.saveToStore(this.dbName);
      }
      
      return result;
    } catch (error) {
      await db.execute('ROLLBACK');
      console.error('[DatabaseService] Transaction failed:', error);
      throw error;
    }
  }

  async closeConnection(): Promise<void> {
    if (this.dbConnection) {
      await this.sqliteConnection?.closeConnection(this.dbName, false);
      this.dbConnection = null;
      this.isInitialized = false;
    }
  }
}

export const dbService = new DatabaseService();
