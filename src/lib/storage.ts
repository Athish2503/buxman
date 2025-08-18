import { Expense } from '@/types/expense';

const STORAGE_KEY = 'reimbursement_expenses';

export const storageService = {
  getExpenses(): Expense[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading expenses:', error);
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
    const index = expenses.findIndex(expense => expense.id === id);
    if (index !== -1) {
      expenses[index] = { ...expenses[index], ...updates, updatedAt: new Date().toISOString() };
      this.saveExpenses(expenses);
    }
  },

  deleteExpense(id: string): void {
    const expenses = this.getExpenses();
    const filtered = expenses.filter(expense => expense.id !== id);
    this.saveExpenses(filtered);
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
};