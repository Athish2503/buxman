import { useState } from 'react';
import { format } from 'date-fns';
import { Edit, Trash2, Eye, Filter, Download, Search, Receipt } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

import { Expense, ExpenseStatus, ExpenseSummary } from '@/types/expense';
import { getCategoryConfig, categoryConfig } from '@/lib/categories';
import { generateExpensesPDF } from '@/lib/pdf-generator';
import { settingsService } from '@/lib/settings';
import { ExpenseForm } from './expense-form';

interface ExpenseListProps {
  expenses: Expense[];
  onUpdateExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  onDeleteAll: () => void;
}

export function ExpenseList({ expenses, onUpdateExpense, onDeleteExpense, onDeleteAll }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filteredExpenses = expenses.filter(expense => {
    const categoryMatch = filterCategory === 'all' || expense.category === filterCategory;
    const statusMatch = filterStatus === 'all' || expense.status === filterStatus;
    const searchMatch = !search ||
      expense.vendor.toLowerCase().includes(search.toLowerCase()) ||
      expense.description.toLowerCase().includes(search.toLowerCase());
    return categoryMatch && statusMatch && searchMatch;
  });

  const summary: ExpenseSummary = {
    total: filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0),
    pending: filteredExpenses.filter(exp => exp.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0),
    approved: filteredExpenses.filter(exp => exp.status === 'approved').reduce((sum, exp) => sum + exp.amount, 0),
    reimbursed: filteredExpenses.filter(exp => exp.status === 'reimbursed').reduce((sum, exp) => sum + exp.amount, 0),
    count: filteredExpenses.length,
  };

  const getStatusColor = (status: ExpenseStatus) => {
    switch (status) {
      case 'pending': return 'bg-warning/10 text-warning border-warning/30';
      case 'approved': return 'bg-success/10 text-success border-success/30';
      case 'reimbursed': return 'bg-primary/10 text-primary border-primary/30';
      case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleExportPDF = () => {
    const settings = settingsService.get();
    generateExpensesPDF(filteredExpenses, summary, {
      title: 'Expense Reimbursement Invoice',
      billedTo: settings.billedTo,
      billedFrom: settings.billedFrom,
    });
  };

  if (expenses.length === 0) {
    return (
      <Card className="text-center py-16 bg-gradient-card border-card-border shadow-md">
        <CardContent>
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 rounded-2xl bg-accent flex items-center justify-center">
              <Receipt className="h-8 w-8 text-primary" />
            </div>
            <div className="text-foreground text-lg font-semibold">No expenses yet</div>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Add your first expense using the button at the top to start tracking reimbursements.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total', value: summary.total, accent: 'from-primary to-primary-glow', text: 'text-primary' },
          { label: 'Pending', value: summary.pending, accent: 'from-warning to-orange-500', text: 'text-warning' },
          { label: 'Approved', value: summary.approved, accent: 'from-success to-secondary', text: 'text-success' },
          { label: 'Reimbursed', value: summary.reimbursed, accent: 'from-primary to-secondary', text: 'text-primary' },
        ].map((s) => (
          <Card key={s.label} className="relative overflow-hidden bg-gradient-card border-card-border shadow-sm hover:shadow-md transition-shadow">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.accent}`} />
            <CardContent className="p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{s.label}</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 truncate ${s.text}`}>
                ₹{s.value.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and List */}
      <Card className="bg-gradient-card border-card-border shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg font-semibold">
                Expenses <span className="text-muted-foreground font-normal">({filteredExpenses.length})</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Delete All</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all expenses?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove all {expenses.length} expense{expenses.length === 1 ? '' : 's'} from this device. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={onDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button
                  onClick={handleExportPDF}
                  size="sm"
                  className="bg-gradient-primary hover:opacity-90 transition-opacity text-primary-foreground shadow-md"
                >
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Export PDF</span>
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendor or notes..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-surface-elevated"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="flex-1 sm:w-[150px] bg-surface-elevated">
                    <Filter className="h-3.5 w-3.5 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Object.entries(categoryConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="flex-1 sm:w-[130px] bg-surface-elevated">
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
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-2.5">
            {filteredExpenses.map((expense) => {
              const cfg = getCategoryConfig(expense.category);
              const Icon = cfg.icon;

              return (
                <div
                  key={expense.id}
                  className="group relative bg-surface-elevated border border-border rounded-xl p-3 sm:p-4 hover:border-primary/30 hover:shadow-md transition-all animate-fade-in-up"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className={`shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-accent flex items-center justify-center ${cfg.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{expense.vendor}</h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {cfg.label} · {format(new Date(expense.date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-sm sm:text-base text-foreground whitespace-nowrap">
                            ₹{expense.amount.toLocaleString('en-IN')}
                          </p>
                          <Badge variant="outline" className={`mt-1 text-[10px] py-0 px-1.5 h-4 ${getStatusColor(expense.status)}`}>
                            {expense.status}
                          </Badge>
                        </div>
                      </div>

                      {expense.description && (
                        <p className="text-xs text-muted-foreground truncate mt-1.5">
                          {expense.description}
                        </p>
                      )}

                      <div className="flex items-center gap-1 mt-2 -ml-2 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setSelectedExpense(expense)}>
                          <Eye className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditingExpense(expense)}>
                          <Edit className="h-3.5 w-3.5 sm:mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                              <span className="hidden sm:inline">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => onDeleteExpense(expense.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredExpenses.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                No expenses match your filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs">Vendor</span>
                  <p className="font-medium">{selectedExpense.vendor}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Amount</span>
                  <p className="font-medium">₹{selectedExpense.amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Date</span>
                  <p className="font-medium">{format(new Date(selectedExpense.date), 'dd MMM yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Category</span>
                  <p className="font-medium">{getCategoryConfig(selectedExpense.category).label}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground text-xs">Status</span>
                  <div><Badge variant="outline" className={`mt-1 ${getStatusColor(selectedExpense.status)}`}>{selectedExpense.status}</Badge></div>
                </div>
              </div>

              {selectedExpense.description && (
                <div>
                  <span className="text-muted-foreground text-xs">Description</span>
                  <p className="mt-1 text-sm">{selectedExpense.description}</p>
                </div>
              )}

              {selectedExpense.receiptImage && (
                <div>
                  <span className="text-muted-foreground text-xs">Receipt</span>
                  <img src={selectedExpense.receiptImage} alt="Receipt" className="mt-2 max-w-full h-auto rounded-lg border" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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
