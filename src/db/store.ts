import { create } from 'zustand';
import { transactionRepo } from './repositories/TransactionRepository';
import { categoryRepo } from './repositories/CategoryRepository';
import { budgetRepo } from './repositories/BudgetRepository';
import { Transaction, Category, Budget } from './types';
import { dbService } from './DatabaseService';

interface DbState {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  isLoading: boolean;
  error: string | null;

  // Actions
  init: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshCategories: () => Promise<void>;
  refreshBudgets: () => Promise<void>;
  
  addTransaction: (t: Transaction) => Promise<void>;
  updateTransaction: (t: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  addCategory: (c: Category) => Promise<void>;
  addBudget: (b: Budget) => Promise<void>;
}

export const useDbStore = create<DbState>((set, get) => ({
  transactions: [],
  categories: [],
  budgets: [],
  isLoading: false,
  error: null,

  init: async () => {
    set({ isLoading: true });
    try {
      await dbService.initialize();
      await Promise.all([
        get().refreshTransactions(),
        get().refreshCategories(),
        get().refreshBudgets()
      ]);
      set({ isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  refreshTransactions: async () => {
    const transactions = await transactionRepo.findRecent(100);
    set({ transactions });
  },

  refreshCategories: async () => {
    const categories = await categoryRepo.findAll();
    set({ categories });
  },

  refreshBudgets: async () => {
    const budgets = await budgetRepo.findAll();
    set({ budgets });
  },

  addTransaction: async (t: Transaction) => {
    await transactionRepo.create(t);
    await get().refreshTransactions();
  },

  updateTransaction: async (t: Transaction) => {
    await transactionRepo.update(t);
    await get().refreshTransactions();
  },

  deleteTransaction: async (id: string) => {
    await transactionRepo.delete(id);
    await get().refreshTransactions();
  },

  addCategory: async (c: Category) => {
    await categoryRepo.create(c);
    await get().refreshCategories();
  },

  addBudget: async (b: Budget) => {
    await budgetRepo.create(b);
    await get().refreshBudgets();
  }
}));
