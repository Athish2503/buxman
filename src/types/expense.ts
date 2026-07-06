export type ExpenseStatus = 'pending' | 'approved' | 'reimbursed' | 'rejected';

export type ExpenseCategory = string;

export interface Expense {
  id: string;
  date: string;
  vendor: string;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  description: string;
  status: ExpenseStatus;
  isReimbursement: boolean;
  receiptImage?: string;
  tags?: string[];
  projectCode?: string;
  paidBy?: string; // Contact ID, or undefined/null for current user
  split?: import('./split').ExpenseSplit;
  tripId?: string;
  type?: 'debit' | 'credit';
  createdAt: string;
  updatedAt: string;
}

export interface ReimbursementReport {
  id: string;
  invoiceNo: string;
  title: string;
  date: string;
  expenseIds: string[];
  totalAmount: number;
  status: 'pending' | 'reimbursed';
  count: number;
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
  accentColor?: string;
  glassIntensity?: number;
  budgets: BudgetGoal[];
  biometricLock?: boolean;
  hapticsEnabled?: boolean;
  navOrder?: string[];
  upiId?: string;
  googleDriveClientId?: string;
  googleDriveBackupEnabled?: boolean;
  googleDriveLastBackup?: string;
  googleDriveLinkedEmail?: string;
  omdbApiKey?: string;
}