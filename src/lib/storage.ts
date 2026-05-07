import { Expense } from '@/types/expense';
import { storageEngine } from '@/lib/storage-engine';
import { syncService } from '@/lib/sync';
import { transactionRepo } from '@/db/repositories/TransactionRepository';
import { dbService } from '@/db/DatabaseService';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'reimburse_expenses_v2';
const MIGRATION_STATUS_KEY = 'reimburse_sqlite_migration_status';

async function isSqliteActive(): Promise<boolean> {
  const { value } = await Preferences.get({ key: MIGRATION_STATUS_KEY });
  return value === 'completed';
}

export const storageService = {
  async getExpenses(): Promise<Expense[]> {
    if (await isSqliteActive()) {
      const txs = await transactionRepo.findAll();
      return txs.map(tx => ({
        id: tx.id,
        amount: tx.amount,
        merchant: tx.merchant,
        categoryId: tx.category_id,
        accountId: tx.account_id,
        date: tx.timestamp,
        notes: tx.notes || '',
        status: tx.status as any,
        isReimbursement: tx.type === 'expense', // Simplified mapping
        type: tx.type as any
      })) as any[];
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  async saveExpenses(expenses: Expense[]): Promise<Expense[]> {
    // Note: In SQLite mode, we don't 'save all', we use specific methods.
    // This is for backward compatibility.
    if (await isSqliteActive()) {
      console.warn('[storageService] saveExpenses called in SQLite mode. This is inefficient.');
      // For now, we'll just skip or implement a batch upsert if needed.
      return expenses;
    }

    try {
      storageEngine.set(STORAGE_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
    return expenses;
  },

  async addExpense(expense: Expense): Promise<Expense[]> {
    if (await isSqliteActive()) {
      await transactionRepo.create({
        id: expense.id,
        amount: expense.amount,
        merchant: expense.merchant,
        category_id: expense.categoryId,
        account_id: expense.accountId || 'default',
        type: expense.type || 'expense',
        timestamp: expense.date,
        notes: expense.notes,
        status: expense.status || 'completed'
      });
      return this.getExpenses();
    }

    const expenses = await this.getExpenses();
    expenses.unshift(expense);
    syncService.enqueue('add', expense.id, expense);
    return this.saveExpenses(expenses);
  },

  async updateExpense(expense: Expense): Promise<Expense[]> {
    if (await isSqliteActive()) {
      await transactionRepo.update({
        id: expense.id,
        amount: expense.amount,
        merchant: expense.merchant,
        category_id: expense.categoryId,
        account_id: expense.accountId || 'default',
        type: expense.type || 'expense',
        timestamp: expense.date,
        notes: expense.notes,
        status: expense.status || 'completed'
      });
      return this.getExpenses();
    }

    const expenses = await this.getExpenses();
    const index = expenses.findIndex(e => e.id === expense.id);
    if (index !== -1) {
      expenses[index] = { ...expense, updatedAt: new Date().toISOString() };
      syncService.enqueue('update', expense.id, expenses[index]);
      return this.saveExpenses(expenses);
    }
    return expenses;
  },

  async batchUpdateStatus(ids: string[], status: Expense['status']): Promise<Expense[]> {
    const expenses = await this.getExpenses();
    const updatedAt = new Date().toISOString();
    ids.forEach(id => {
      const index = expenses.findIndex(e => e.id === id);
      if (index !== -1) {
        expenses[index] = { ...expenses[index], status, updatedAt };
        syncService.enqueue('update', id, expenses[index]);
      }
    });
    return this.saveExpenses(expenses);
  },

  async deleteExpense(id: string): Promise<Expense[]> {
    if (await isSqliteActive()) {
      await transactionRepo.delete(id);
      return this.getExpenses();
    }

    const expenses = await this.getExpenses();
    const updated = expenses.filter(e => e.id !== id);
    syncService.enqueue('delete', id, null);
    return this.saveExpenses(updated);
  },

  async batchDeleteExpenses(ids: string[]): Promise<Expense[]> {
    if (await isSqliteActive()) {
      for (const id of ids) {
        await transactionRepo.delete(id);
      }
      return this.getExpenses();
    }

    const expenses = await this.getExpenses();
    const updated = expenses.filter(e => !ids.includes(e.id));
    ids.forEach(id => syncService.enqueue('delete', id, null));
    return this.saveExpenses(updated);
  },

  async clearAll(): Promise<void> {
    if (await isSqliteActive()) {
      // In SQLite mode, we might want to wipe the DB or just clear records.
      // For now, let's just wipe records.
      await dbService.run('DELETE FROM transactions');
      return;
    }
    storageEngine.remove(STORAGE_KEY);
  },

  async exportJSON(): Promise<string> {
    return JSON.stringify(await this.getExpenses(), null, 2);
  },

  async importJSON(json: string): Promise<void> {
    const data = JSON.parse(json) as Expense[];
    const existing = await this.getExpenses();
    const existingIds = new Set(existing.map(e => e.id));
    const newOnes = data.filter(e => !existingIds.has(e.id));
    
    if (await isSqliteActive()) {
      for (const exp of newOnes) {
        await this.addExpense(exp);
      }
      return;
    }
    
    this.saveExpenses([...newOnes, ...existing]);
  }
};