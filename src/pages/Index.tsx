import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Expense } from '@/types/expense';
import { storageService } from '@/lib/storage';
import { ExpenseForm } from '@/components/expense-form';
import { ExpenseList } from '@/components/expense-list';

const Index = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load expenses from localStorage on component mount
    const loadExpenses = () => {
      try {
        const storedExpenses = storageService.getExpenses();
        setExpenses(storedExpenses);
      } catch (error) {
        console.error('Error loading expenses:', error);
        toast.error('Failed to load expenses');
      } finally {
        setIsLoading(false);
      }
    };

    loadExpenses();
  }, []);

  const handleAddExpense = (expense: Expense) => {
    try {
      storageService.addExpense(expense);
      setExpenses(storageService.getExpenses());
      toast.success('Expense added successfully');
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense');
    }
  };

  const handleUpdateExpense = (expense: Expense) => {
    try {
      storageService.updateExpense(expense.id, expense);
      setExpenses(storageService.getExpenses());
      toast.success('Expense updated successfully');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    }
  };

  const handleDeleteExpense = (id: string) => {
    try {
      storageService.deleteExpense(id);
      setExpenses(storageService.getExpenses());
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-gradient-primary rounded-xl p-8 text-white shadow-xl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <div>
                <h1 className="text-3xl font-bold mb-2">Expense Reimbursement Tracker</h1>
                <p className="text-blue-100 text-lg">
                  Manage your business expenses with AI-powered receipt scanning and premium PDF reports
                </p>
              </div>
              <ExpenseForm onSubmit={handleAddExpense} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <ExpenseList
          expenses={expenses}
          onUpdateExpense={handleUpdateExpense}
          onDeleteExpense={handleDeleteExpense}
        />

        {/* Footer */}
        <div className="mt-12 text-center">
          <Card className="bg-gradient-card border-card-border">
            <CardContent className="p-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-foreground">Pro Features Coming Soon</h3>
                <p className="text-muted-foreground">
                  AI-powered receipt scanning • Advanced analytics • Team collaboration • Cloud sync
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
