import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Expense } from '@/types/expense';
import { ExpenseList } from '@/components/expense-list';
import { ReceiptWallet } from '@/components/receipt-wallet';
import { RecurringManager } from '@/components/recurring-manager';

interface ExpensesModuleProps {
  expenses: Expense[];
  onAddExpense: (e: Expense) => void;
  onUpdateExpense: (e: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteAll: () => void;
  onBatchDelete: (ids: string[]) => void;
  onBatchStatus: (ids: string[], status: any) => void;
}

export function ExpensesModule({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense,
  onDeleteAll,
  onBatchDelete,
  onBatchStatus
}: ExpensesModuleProps) {
  const [subTab, setSubTab] = useState<'all' | 'wallet'>('all');

  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      <div className="mb-6 px-1">
        <h1 className="text-3xl font-black tracking-tight">Expenses</h1>
        <p className="text-xs text-muted-foreground mt-1">Manage your personal daily spending</p>
      </div>

      <div className="flex bg-muted/40 p-1 rounded-xl w-full sm:w-fit">
        <button onClick={() => setSubTab('all')} className={cn("flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", subTab === 'all' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Log</button>
        <button onClick={() => setSubTab('wallet')} className={cn("flex-1 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", subTab === 'wallet' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>Wallet</button>
      </div>

      {subTab === 'all' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
            <RecurringManager onAddExpense={onAddExpense} />
          </div>
          <ExpenseList
            expenses={expenses}
            initialFilterType="personal"
            showTypeTabs={false}
            title="Personal Expenses"
            onUpdateExpense={onUpdateExpense}
            onDeleteExpense={onDeleteExpense}
            onDeleteAll={onDeleteAll}
            onBatchDelete={onBatchDelete}
            onBatchStatus={onBatchStatus}
          />
        </div>
      )}

      {subTab === 'wallet' && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4">
          <ReceiptWallet expenses={expenses} onAddExpense={onAddExpense} />
        </div>
      )}
    </div>
  );
}
