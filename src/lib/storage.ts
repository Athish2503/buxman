import { Expense } from '@/types/expense';
import { storageEngine } from '@/lib/storage-engine';
import { syncService } from '@/lib/sync';

const STORAGE_KEY = 'reimburse_expenses_v2';

export const storageService = {
  getExpenses(): Expense[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveExpenses(expenses: Expense[]): Expense[] {
    try {
      storageEngine.set(STORAGE_KEY, JSON.stringify(expenses));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('expenses-updated'));
      }
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
    return expenses;
  },

  addExpense(expense: Expense): Expense[] {
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    syncService.enqueue('add', expense.id, expense);
    return this.saveExpenses(expenses);
  },

  updateExpense(expense: Expense): Expense[] {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === expense.id);
    if (index !== -1) {
      expenses[index] = { ...expense, updatedAt: new Date().toISOString() };
      syncService.enqueue('update', expense.id, expenses[index]);
      return this.saveExpenses(expenses);
    }
    return expenses;
  },

  batchUpdateStatus(ids: string[], status: Expense['status']): Expense[] {
    const expenses = this.getExpenses();
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

  deleteExpense(id: string): Expense[] {
    const expenses = this.getExpenses();
    const updated = expenses.filter(e => e.id !== id);
    syncService.enqueue('delete', id, null);
    return this.saveExpenses(updated);
  },

  batchDeleteExpenses(ids: string[]): Expense[] {
    const expenses = this.getExpenses();
    const updated = expenses.filter(e => !ids.includes(e.id));
    ids.forEach(id => syncService.enqueue('delete', id, null));
    return this.saveExpenses(updated);
  },

  clearAll(): void {
    storageEngine.remove(STORAGE_KEY);
  },

  exportJSON(): string {
    return JSON.stringify(this.getExpenses(), null, 2);
  },

  importJSON(json: string): void {
    const data = JSON.parse(json) as Expense[];
    const existing = this.getExpenses();
    const existingIds = new Set(existing.map(e => e.id));
    const newOnes = data.filter(e => !existingIds.has(e.id));
    this.saveExpenses([...newOnes, ...existing]);
  }
};