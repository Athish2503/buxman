import { useState } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, Eye, Filter, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

import { Expense, ExpenseCategory, ExpenseStatus, ExpenseSummary } from '@/types/expense';
import { getCategoryConfig, categoryConfig } from '@/lib/categories';
import { generateExpensesPDF } from '@/lib/pdf-generator';
import { ExpenseForm } from './expense-form';

interface ExpenseListProps {
  expenses: Expense[];
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export function ExpenseList({ expenses, onUpdateExpense, onDeleteExpense }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Filter expenses based on selected filters
  const filteredExpenses = expenses.filter(expense => {
    const categoryMatch = filterCategory === 'all' || expense.category === filterCategory;
    const statusMatch = filterStatus === 'all' || expense.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  // Calculate summary
  const summary: ExpenseSummary = {
    total: filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    pending: filteredExpenses.filter(exp => exp.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0),
    approved: filteredExpenses.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + exp.amount, 0),
    reimbursed: filteredExpenses.filter(exp => exp.status === 'reimbursed').reduce((sum, exp) => sum + exp.amount, 0),
    count: filteredExpenses.length,
  };

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'approved':
        return 'bg-success/10 text-success border-success/20';
      case 'reimbursed':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'rejected':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleExportPDF = () => {
    generateExpensesPDF(filteredExpenses, summary, {
      title: 'Expense Reimbursement Report',
      userInfo: {
        name: 'Employee Name', // TODO: Make this configurable
        company: 'Company Name',
      }
    });
  };

  if (expenses.length === 0) {
    return (
      <Card className="text-center py-12 bg-gradient-card border-card-border">
        <CardContent>
          <div className="space-y-4">
            <div className="text-muted-foreground text-lg">No expenses recorded yet</div>
            <p className="text-muted-foreground">Start by adding your first expense using the button above</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold text-foreground">₹{summary.total.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-warning">₹{summary.pending.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-success">₹{summary.approved.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-card border-card-border">
          <CardContent className="p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Reimbursed</p>
              <p className="text-2xl font-bold text-primary">₹{summary.reimbursed.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Export */}
      <Card className="bg-gradient-card border-card-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <CardTitle className="text-lg font-semibold text-foreground">
              Expenses ({filteredExpenses.length})
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] bg-surface-elevated">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(categoryConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] bg-surface-elevated">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="reimbursed">Reimbursed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Button 
                onClick={handleExportPDF}
                variant="outline"
                className="bg-surface-elevated"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {filteredExpenses.map((expense) => {
              const expenseCategoryConfig = getCategoryConfig(expense.category);
              const Icon = expenseCategoryConfig.icon;
              
              return (
                <Card key={expense.id} className="bg-surface-elevated border-border hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 flex-1">
                        <div className={`p-2 rounded-lg bg-muted ${expenseCategoryConfig.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">{expense.vendor}</h3>
                            <Badge className={getStatusColor(expense.status)}>
                              {expense.status}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-col sm:flex-row sm:items-center text-sm text-muted-foreground space-y-1 sm:space-y-0 sm:space-x-4">
                            <span>{format(new Date(expense.date), 'dd MMM yyyy')}</span>
                            <span>{expenseCategoryConfig.label}</span>
                            <span className="font-medium text-foreground">₹{expense.amount.toLocaleString('en-IN')}</span>
                          </div>
                          
                          {expense.description && (
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              {expense.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExpense(expense)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingExpense(expense)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this expense? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteExpense(expense.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* View Expense Details Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <p className="font-medium">{selectedExpense.vendor}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-medium">₹{selectedExpense.amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{format(new Date(selectedExpense.date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{getCategoryConfig(selectedExpense.category).label}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={`ml-2 ${getStatusColor(selectedExpense.status)}`}>
                    {selectedExpense.status}
                  </Badge>
                </div>
              </div>
              
              {selectedExpense.description && (
                <div>
                  <span className="text-muted-foreground text-sm">Description:</span>
                  <p className="mt-1 text-sm">{selectedExpense.description}</p>
                </div>
              )}
              
              {selectedExpense.receiptImage && (
                <div>
                  <span className="text-muted-foreground text-sm">Receipt:</span>
                  <img 
                    src={selectedExpense.receiptImage} 
                    alt="Receipt" 
                    className="mt-2 max-w-full h-auto rounded border"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <ExpenseForm
              onSubmit={(expense) => {
                onUpdateExpense(expense);
                setEditingExpense(null);
              }}
              initialData={editingExpense}
              isEdit={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}