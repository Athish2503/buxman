import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { 
  CalendarDays, Upload, X, Plus, Tag, Briefcase,
  Receipt, ChevronRight, Sparkles
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import { Expense, ExpenseCategory, ExpenseStatus } from '@/types/expense';
import { categoryConfig } from '@/lib/categories';
import { cn } from '@/lib/utils';

const expenseSchema = z.object({
  vendor: z.string().min(1, 'Vendor name is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  date: z.string().min(1, 'Date is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  projectCode: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  onSubmit: (expense: Expense) => void;
  initialData?: Expense;
  isEdit?: boolean;
  onClose?: () => void;
}

const STATUS_OPTIONS: { value: ExpenseStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pending', color: 'text-warning' },
  { value: 'approved', label: 'Approved', color: 'text-success' },
  { value: 'reimbursed', label: 'Reimbursed', color: 'text-primary' },
  { value: 'rejected', label: 'Rejected', color: 'text-destructive' },
];

export function ExpenseForm({ onSubmit, initialData, isEdit = false, onClose }: ExpenseFormProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(initialData?.receiptImage || null);
  const [isOpen, setIsOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
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
      projectCode: initialData.projectCode || '',
    } : {
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'pending',
    }
  });

  const watchedCategory = watch('category');
  const watchedStatus = watch('status');

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setReceiptPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag));

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
      receiptImage: receiptPreview || initialData?.receiptImage,
      tags,
      projectCode: data.projectCode || undefined,
      createdAt: initialData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSubmit(expense);
    if (!isEdit) {
      reset();
      setReceiptFile(null);
      setReceiptPreview(null);
      setTags([]);
      setIsOpen(false);
    }
    onClose?.();
  };

  const selectedCatConfig = watchedCategory ? categoryConfig[watchedCategory as ExpenseCategory] : null;

  const FormContent = () => (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Receipt Upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-foreground/80 flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5" />
          Receipt Image
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={cn(
            "relative border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer group",
            dragOver 
              ? "border-primary bg-primary/10 scale-[1.01]" 
              : "border-border hover:border-primary/50 hover:bg-muted/30",
            receiptPreview ? "p-2" : "p-6"
          )}
        >
          <input
            id="receipt"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {receiptPreview ? (
            <div className="relative">
              <img src={receiptPreview} alt="Receipt" className="w-full max-h-40 object-contain rounded-lg" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={(e) => { e.stopPropagation(); setReceiptFile(null); setReceiptPreview(null); }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-medium text-foreground/70">Drop receipt here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WEBP up to 10MB</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vendor */}
        <div className="space-y-1.5">
          <Label htmlFor="vendor" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Vendor / Merchant
          </Label>
          <Input
            id="vendor"
            {...register('vendor')}
            placeholder="e.g., Swiggy, Uber, Zomato"
            className="bg-muted/50 border-border/60 focus:border-primary/50 h-10"
          />
          {errors.vendor && <p className="text-xs text-destructive">{errors.vendor.message}</p>}
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Amount (₹)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0.00"
              className="pl-7 bg-muted/50 border-border/60 focus:border-primary/50 h-10 font-mono"
            />
          </div>
          {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Date
          </Label>
          <div className="relative">
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="bg-muted/50 border-border/60 focus:border-primary/50 h-10"
            />
            <CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
          {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</Label>
          <Select onValueChange={(v) => setValue('category', v)} defaultValue={watchedCategory}>
            <SelectTrigger className="bg-muted/50 border-border/60 h-10">
              {selectedCatConfig ? (
                <div className="flex items-center gap-2">
                  <div className={cn("h-5 w-5 rounded flex items-center justify-center", selectedCatConfig.bgColor)}>
                    <selectedCatConfig.icon className={cn("h-3 w-3", selectedCatConfig.color)} />
                  </div>
                  <span>{selectedCatConfig.label}</span>
                </div>
              ) : (
                <SelectValue placeholder="Select category" />
              )}
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {Object.entries(categoryConfig).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <div className={cn("h-5 w-5 rounded flex items-center justify-center flex-shrink-0", cfg.bgColor)}>
                        <Icon className={cn("h-3 w-3", cfg.color)} />
                      </div>
                      <span>{cfg.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</Label>
        <div className="grid grid-cols-4 gap-2">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setValue('status', s.value)}
              className={cn(
                "py-2 px-3 rounded-lg text-xs font-semibold border transition-all duration-150",
                watchedStatus === s.value
                  ? cn("border-current bg-current/10", s.color)
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Notes
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Add context, purpose, or any additional notes..."
          className="bg-muted/50 border-border/60 focus:border-primary/50 min-h-[70px] resize-none"
        />
      </div>

      {/* Tags + Project */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Tag className="h-3 w-3" /> Tags
          </Label>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag..."
              className="bg-muted/50 border-border/60 h-9 text-sm"
            />
            <Button type="button" size="sm" variant="outline" className="h-9 px-3 shrink-0" onClick={addTag}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs gap-1 cursor-pointer hover:bg-destructive/20 hover:text-destructive transition-colors" onClick={() => removeTag(tag)}>
                  {tag}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="projectCode" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Briefcase className="h-3 w-3" /> Project Code
          </Label>
          <Input
            id="projectCode"
            {...register('projectCode')}
            placeholder="e.g., PROJ-2024"
            className="bg-muted/50 border-border/60 h-9 text-sm font-mono"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
        {!isEdit && (
          <Button type="button" variant="ghost" onClick={() => { setIsOpen(false); onClose?.(); }}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-gradient-primary hover:opacity-90 transition-opacity text-white font-semibold shadow-glow min-w-[120px]"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {isEdit ? 'Update Expense' : 'Add Expense'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </form>
  );

  if (isEdit) return <FormContent />;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          id="btn-add-expense"
          className="bg-gradient-primary hover:opacity-90 transition-all text-white shadow-glow font-semibold gap-2"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Expense</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto glass border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Add New Expense
          </DialogTitle>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}