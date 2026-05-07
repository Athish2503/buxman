import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { dbService } from '../DatabaseService';

export abstract class BaseRepository<T> {
  constructor(protected tableName: string) {}

  protected async getDb(): Promise<SQLiteDBConnection> {
    return await dbService.getDbConnection();
  }

  async findById(id: string): Promise<T | null> {
    const result = await dbService.query(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id]);
    return result.values && result.values.length > 0 ? (result.values[0] as T) : null;
  }

  async findAll(): Promise<T[]> {
    const result = await dbService.query(`SELECT * FROM ${this.tableName}`);
    return (result.values as T[]) || [];
  }

  async delete(id: string): Promise<void> {
    await dbService.run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id]);
  }

  async count(): Promise<number> {
    const result = await dbService.query(`SELECT COUNT(*) as count FROM ${this.tableName}`);
    return result.values ? result.values[0].count : 0;
  }
}
