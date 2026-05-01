export type ExpenseStatus = 'pending' | 'approved' | 'reimbursed' | 'rejected';

export type ExpenseCategory =
  | 'travel'
  | 'meals'
  | 'supplies'
  | 'accommodation'
  | 'transportation'
  | 'entertainment'
  | 'communication'
  | 'training'
  | 'healthcare'
  | 'home'
  | 'other';

export interface Expense {
  id: string;
  date: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  status: ExpenseStatus;
  receiptImage?: string;
  tags?: string[];
  projectCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  total: number;
  pending: number;
  approved: number;
  reimbursed: number;
  rejected: number;
  count: number;
}

export interface BudgetGoal {
  category: ExpenseCategory;
  limit: number;
  period: 'monthly' | 'quarterly' | 'yearly';
}

export interface AppSettings {
  billedTo: {
    name: string;
    line2: string;
    address?: string;
  };
  billedFrom: {
    name: string;
    line2: string;
    email: string;
    phone?: string;
  };
  currency: string;
  theme: 'dark' | 'light' | 'system';
  budgets: BudgetGoal[];
}