import { BaseRepository } from './BaseRepository';
import { Budget } from '../types';
import { dbService } from '../DatabaseService';

export class BudgetRepository extends BaseRepository<Budget> {
  constructor() {
    super('budgets');
  }

  async create(budget: Budget): Promise<void> {
    await dbService.run(
      `INSERT INTO budgets (id, category_id, amount, period, start_date) VALUES (?, ?, ?, ?, ?)`,
      [budget.id, budget.category_id, budget.amount, budget.period, budget.start_date]
    );
  }

  async update(budget: Budget): Promise<void> {
    await dbService.run(
      `UPDATE budgets SET category_id = ?, amount = ?, period = ?, start_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [budget.category_id, budget.amount, budget.period, budget.start_date, budget.id]
    );
  }

  async getActiveBudgets(): Promise<(Budget & { category_name: string })[]> {
    const sql = `
      SELECT b.*, c.name as category_name 
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      ORDER BY c.name ASC
    `;
    const result = await dbService.query(sql);
    return (result.values as (Budget & { category_name: string })[]) || [];
  }
}

export const budgetRepo = new BudgetRepository();
