import { ExpenseStatus, ExpenseCategory } from './expense';

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  upiId?: string;
  createdAt: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage';

export interface SplitMember {
  contactId: string;
  amount: number;
  paid: boolean;
}

export interface ExpenseSplit {
  totalAmount: number;
  members: SplitMember[];
  splitType: SplitType;
  userPaid?: boolean;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  currency: string;
  participants: string[]; // Contact IDs
  expenseIds: string[];
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface SettleUpSummary {
  contactId: string; // Contact ID, or 'user' for the current user
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}
