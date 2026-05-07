import { BaseRepository } from './BaseRepository';
import { Transaction } from '../types';
import { dbService } from '../DatabaseService';

export class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super('transactions');
  }

  async create(transaction: Transaction): Promise<void> {
    const sql = `
      INSERT INTO transactions (id, amount, merchant, category_id, account_id, type, is_reimbursement, timestamp, notes, source, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      transaction.id,
      transaction.amount,
      transaction.merchant,
      transaction.category_id,
      transaction.account_id,
      transaction.type,
      transaction.is_reimbursement || 0,
      transaction.timestamp,
      transaction.notes,
      transaction.source,
      transaction.status
    ];
    await dbService.run(sql, params);
  }

  async update(transaction: Transaction): Promise<void> {
    const sql = `
      UPDATE transactions 
      SET amount = ?, merchant = ?, category_id = ?, account_id = ?, type = ?, is_reimbursement = ?, timestamp = ?, notes = ?, source = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const params = [
      transaction.amount,
      transaction.merchant,
      transaction.category_id,
      transaction.account_id,
      transaction.type,
      transaction.is_reimbursement,
      transaction.timestamp,
      transaction.notes,
      transaction.source,
      transaction.status,
      transaction.id
    ];
    await dbService.run(sql, params);
  }

  async findRecent(limit: number = 10): Promise<Transaction[]> {
    const result = await dbService.query(
      `SELECT * FROM transactions ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );
    return (result.values as Transaction[]) || [];
  }

  async getFiltered(filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    type?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<Transaction[]> {
    const db = await this.getDb();
    let query = `SELECT * FROM transactions WHERE 1=1`;
    const params: any[] = [];

    if (filters.startDate) {
      query += ` AND timestamp >= ?`;
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      query += ` AND timestamp <= ?`;
      params.push(filters.endDate);
    }
    if (filters.categoryId) {
      query += ` AND category_id = ?`;
      params.push(filters.categoryId);
    }
    if (filters.type) {
      query += ` AND type = ?`;
      params.push(filters.type);
    }
    if (filters.search) {
      query += ` AND (merchant LIKE ? OR notes LIKE ?)`;
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    query += ` ORDER BY timestamp DESC`;

    if (filters.limit) {
      query += ` LIMIT ?`;
      params.push(filters.limit);
      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(filters.offset);
      }
    }

    const result = await dbService.query(query, params);
    return (result.values as Transaction[]) || [];
  }

  async getSummary(startDate: string, endDate: string): Promise<{ income: number; expense: number }> {
    const sql = `
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE timestamp BETWEEN ? AND ?
    `;
    const result = await dbService.query(sql, [startDate, endDate]);
    if (result.values && result.values.length > 0) {
      return {
        income: result.values[0].income || 0,
        expense: result.values[0].expense || 0
      };
    }
    return { income: 0, expense: 0 };
  }
}

export const transactionRepo = new TransactionRepository();
