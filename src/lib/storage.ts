import { Expense } from '@/types/expense';

const STORAGE_KEY = 'reimburse_expenses_v2';

export const storageService = {
  getExpenses(): Expense[] {
    try {
      // Migrate from old key if needed
      const oldData = localStorage.getItem('reimbursement_expenses');
      if (oldData && !localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, oldData);
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveExpenses(expenses: Expense[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    } catch (error) {
      console.error('Error saving expenses:', error);
    }
  },

  addExpense(expense: Expense): void {
    const expenses = this.getExpenses();
    expenses.unshift(expense);
    this.saveExpenses(expenses);
  },

  updateExpense(id: string, updates: Partial<Expense>): void {
    const expenses = this.getExpenses();
    const index = expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveExpenses(expenses);
    }
  },

  batchUpdateStatus(ids: string[], status: Expense['status']): void {
    const expenses = this.getExpenses();
    const updatedAt = new Date().toISOString();
    ids.forEach(id => {
      const index = expenses.findIndex(e => e.id === id);
      if (index !== -1) {
        expenses[index] = { ...expenses[index], status, updatedAt };
      }
    });
    this.saveExpenses(expenses);
  },

  deleteExpense(id: string): void {
    const expenses = this.getExpenses();
    this.saveExpenses(expenses.filter(e => e.id !== id));
  },

  batchDelete(ids: string[]): void {
    const expenses = this.getExpenses();
    this.saveExpenses(expenses.filter(e => !ids.includes(e.id)));
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
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