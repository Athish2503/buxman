import { Expense } from './expense';

export type NfcPayloadType = 'SPLIT_DEBT' | 'REIMBURSEMENT_REPORT' | 'EXPENSE_IMPORT';

export interface NfcSplitDebtPayload {
  type: 'SPLIT_DEBT';
  expenseId?: string;
  vendor: string;
  totalAmount: number;
  oweAmount: number;
  category: string;
  date: string;
  senderName: string;
  senderUpi?: string;
  notes?: string;
}

export interface NfcReportPayload {
  type: 'REIMBURSEMENT_REPORT';
  reportTitle: string;
  totalAmount: number;
  currency: string;
  itemCount: number;
  period?: string;
  senderName: string;
  downloadUrl?: string;
  summaryItems?: Array<{
    vendor: string;
    amount: number;
    category: string;
    date: string;
  }>;
}

export interface NfcExpensePayload {
  type: 'EXPENSE_IMPORT';
  expense: Partial<Expense>;
}

export type NfcExchangePayload = NfcSplitDebtPayload | NfcReportPayload | NfcExpensePayload;

export type NfcMode = 'beam' | 'receive' | 'qr';

export type NfcState = 'idle' | 'broadcasting' | 'listening' | 'success' | 'error';
