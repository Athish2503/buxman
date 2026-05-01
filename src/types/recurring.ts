import { Expense, ExpenseCategory } from './expense';

export interface RecurringExpense {
  id: string;
  name: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  projectCode?: string;
  tags?: string[];
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  nextDue: string;         // ISO date
  lastAdded?: string;      // ISO date
  isActive: boolean;
  isReimbursement?: boolean;
  createdAt: string;
}

export interface QuickTemplate {
  id: string;
  name: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  projectCode?: string;
  tags?: string[];
  isReimbursement?: boolean;
  usageCount: number;
  createdAt: string;
}

export interface AppMeta {
  onboardingDone: boolean;
  totalAdded: number;
  firstLaunch: string;
}
