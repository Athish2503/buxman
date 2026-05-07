export interface Category {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  type: 'income' | 'expense';
  is_default: number;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  merchant?: string;
  category_id?: string;
  account_id?: string;
  type: 'income' | 'expense' | 'transfer';
  timestamp: string;
  notes?: string;
  source?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id: string;
  category_id: string;
  amount: number;
  period: 'monthly' | 'weekly' | 'yearly';
  start_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at?: string;
}

export interface TransactionAttachment {
  id: string;
  transaction_id: string;
  file_uri: string;
  file_type?: string;
  created_at?: string;
}

export interface NotificationMetadata {
  id: string;
  transaction_id?: string;
  raw_data?: string;
  source_app?: string;
  detected_at?: string;
}
