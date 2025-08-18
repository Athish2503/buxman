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
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  total: number;
  pending: number;
  approved: number;
  reimbursed: number;
  count: number;
}