import { useState, useEffect } from 'react';
import { Sparkles, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';

import { Expense } from '@/types/expense';
import { storageService } from '@/lib/storage';
import { ExpenseForm } from '@/components/expense-form';
import { ExpenseList } from '@/components/expense-list';
import { SettingsDialog } from '@/components/settings-dialog';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      setExpenses(storageService.getExpenses());
    } catch (error) {
      console.error(error);
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddExpense = (expense: Expense) => {
    try {
      storageService.addExpense(expense);
      setExpenses(storageService.getExpenses());
      toast.success('Expense added');
    } catch {
      toast.error('Failed to add expense');
    }
  };

  const handleUpdateExpense = (expense: Expense) => {
    try {
      storageService.updateExpense(expense.id, expense);
      setExpenses(storageService.getExpenses());
      toast.success('Expense updated');
    } catch {
      toast.error('Failed to update expense');
    }
  };

  const handleDeleteExpense = (id: string) => {
    try {
      storageService.deleteExpense(id);
      setExpenses(storageService.getExpenses());
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete expense');
    }
  };

  const handleDeleteAll = () => {
    try {
      storageService.clearAll();
      setExpenses([]);
      toast.success('All expenses deleted');
    } catch {
      toast.error('Failed to delete expenses');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-surface bg-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 glass border-b border-border/50">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between max-w-7xl">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Receipt className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <h1 className="text-base sm:text-lg font-bold tracking-tight">Reimburse</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground -mt-0.5">Premium expense tracker</p>
            </div>
          </div>
          <ExpenseForm onSubmit={handleAddExpense} />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-7xl">
        {/* Hero */}
        <section className="mb-8 sm:mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-medium mb-5">
            <Sparkles className="h-3.5 w-3.5" />
            AI-powered receipt scanning
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
            Track expenses.{' '}
            <span className="text-gradient">Get reimbursed faster.</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl">
            A premium, mobile-first reimbursement workspace with invoice-grade PDF exports — all stored privately on your device.
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-8 max-w-2xl">
            <Card className="bg-gradient-card border-card-border shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <Wallet className="h-4 w-4 text-primary mb-2" />
                <p className="text-xs text-muted-foreground">Entries</p>
                <p className="text-lg sm:text-xl font-bold">{expenses.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-card-border shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <TrendingUp className="h-4 w-4 text-secondary mb-2" />
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg sm:text-xl font-bold truncate">
                  ₹{expenses.reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-card-border shadow-sm">
              <CardContent className="p-3 sm:p-4">
                <Receipt className="h-4 w-4 text-warning mb-2" />
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg sm:text-xl font-bold truncate">
                  ₹{expenses.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0).toLocaleString('en-IN')}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Main */}
        <ExpenseList
          expenses={expenses}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
        />

        <footer className="mt-16 pt-8 border-t border-border/50 text-center text-xs text-muted-foreground">
          <p>Built with love · Data stored locally on your device</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
