import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarDays, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { Expense, ExpenseCategory, ExpenseStatus } from '@/types/expense';
import { categoryConfig } from '@/lib/categories';

const expenseSchema = z.object({
  vendor: z.string().min(1, 'Vendor name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onSubmit: (expense: Expense) => void;
  initialData?: Expense;
  isEdit?: boolean;
}

export function ExpenseForm({ onSubmit, initialData, isEdit = false }: ExpenseFormProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: initialData ? {
      vendor: initialData.vendor,
      amount: initialData.amount,
      date: format(new Date(initialData.date), 'yyyy-MM-dd'),
      category: initialData.category,
      description: initialData.description,
      status: initialData.status,
    } : {
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      // TODO: Integrate AI receipt scanning here
      // For now, we'll just store the file
    }
  };

  const onFormSubmit = (data: ExpenseFormData) => {
    const expense: Expense = {
      id: initialData?.id || crypto.randomUUID(),
      vendor: data.vendor,
      amount: data.amount,
      date: data.date,
      category: data.category as ExpenseCategory,
      description: data.description || '',
      status: data.status as ExpenseStatus,
      currency: 'INR',
      receiptImage: receiptFile ? URL.createObjectURL(receiptFile) : initialData?.receiptImage,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSubmit(expense);
    if (!isEdit) {
      reset();
      setReceiptFile(null);
      setIsOpen(false);
    }
  };

  const FormContent = () => (
    <Card className="border-card-border bg-gradient-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          {isEdit ? 'Edit Expense' : 'Add New Expense'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt" className="text-sm font-medium text-foreground">
              Receipt Image (Optional)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input
                id="receipt"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Label htmlFor="receipt" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {receiptFile ? receiptFile.name : 'Click to upload receipt image'}
                </p>
                {receiptFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setReceiptFile(null);
                    }}
                    className="mt-2"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                )}
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor */}
            <div className="space-y-2">
              <Label htmlFor="vendor" className="text-sm font-medium text-foreground">
                Vendor/Merchant
              </Label>
              <Input
                id="vendor"
                {...register('vendor')}
                placeholder="e.g., Starbucks, Uber, Amazon"
                className="bg-surface-elevated"
              />
              {errors.vendor && (
                <p className="text-sm text-destructive">{errors.vendor.message}</p>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                Amount (₹)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                placeholder="0.00"
                className="bg-surface-elevated"
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-foreground">
                Date
              </Label>
              <div className="relative">
                <Input
                  id="date"
                  type="date"
                  {...register('date')}
                  className="bg-surface-elevated"
                />
                <CalendarDays className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium text-foreground">
                Category
              </Label>
              <Select onValueChange={(value) => setValue('category', value)} defaultValue={watch('category')}>
                <SelectTrigger className="bg-surface-elevated">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 ${config.color}`} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium text-foreground">
              Status
            </Label>
            <Select onValueChange={(value) => setValue('status', value)} defaultValue={watch('status')}>
              <SelectTrigger className="bg-surface-elevated">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="reimbursed">Reimbursed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-destructive">{errors.status.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-foreground">
              Description/Notes <span className="text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the expense..."
              className="bg-surface-elevated min-h-[80px]"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {!isEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" className="bg-gradient-primary hover:opacity-90 transition-opacity">
              {isEdit ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  if (isEdit) {
    return <FormContent />;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90 transition-opacity text-primary-foreground shadow-md shadow-glow">
          <span className="text-lg leading-none mr-1">+</span>
          <span className="hidden sm:inline">New Expense</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}