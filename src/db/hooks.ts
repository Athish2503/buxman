import { useEffect } from 'react';
import { useDbStore } from './store';
import { Transaction, Category, Budget } from './types';

export function useTransactions() {
  const { transactions, isLoading, error, addTransaction, updateTransaction, deleteTransaction, refreshTransactions } = useDbStore();
  
  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    refreshTransactions
  };
}

export function useCategories() {
  const { categories, isLoading, addCategory, refreshCategories } = useDbStore();
  
  return {
    categories,
    isLoading,
    addCategory,
    refreshCategories,
    expenseCategories: categories.filter(c => c.type === 'expense'),
    incomeCategories: categories.filter(c => c.type === 'income')
  };
}

export function useBudgets() {
  const { budgets, isLoading, addBudget, refreshBudgets } = useDbStore();
  
  return {
    budgets,
    isLoading,
    addBudget,
    refreshBudgets
  };
}

export function useDatabase() {
  const { init, isLoading, error } = useDbStore();
  
  useEffect(() => {
    init();
  }, [init]);

  return { isLoading, error };
}
