import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Transaction {
  id: string;
  amount: number;
  merchant: string;
  type: 'debit' | 'credit';
  appName: string;
  timestamp: number;
  rawText: string;
  reference?: string;
  category?: string;
  notes?: string;
  status: 'pending' | 'completed' | 'ignored';
}

interface TransactionState {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'status'>) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  clearTransactions: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: [],
      addTransaction: (tx) => set((state) => {
        // Simple duplicate prevention based on text and timestamp (within 5 seconds)
        const isDuplicate = state.transactions.some(
          (t) => t.rawText === tx.rawText && Math.abs(t.timestamp - tx.timestamp) < 5000
        );

        if (isDuplicate) return state;

        const newTx: Transaction = {
          ...tx,
          id: Math.random().toString(36).substring(2, 11),
          status: 'pending'
        };

        return {
          transactions: [newTx, ...state.transactions]
        };
      }),
      updateTransaction: (id, updates) => set((state) => ({
        transactions: state.transactions.map((t) => 
          t.id === id ? { ...t, ...updates } : t
        )
      })),
      removeTransaction: (id) => set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id)
      })),
      clearTransactions: () => set({ transactions: [] }),
    }),
    {
      name: 'buxman-transactions',
    }
  )
);
