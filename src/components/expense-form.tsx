import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import {
  X, Plus, Upload, Tag, Briefcase,
  Receipt, Check, Camera,
  CalendarDays, IndianRupee, ArrowRight,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SwipeToAdd } from '@/components/ui/swipe-to-add';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import { Expense, ExpenseCategory, ExpenseStatus } from '@/types/expense';
import { categoryService, iconMap } from '@/lib/category-service';
import { MoreHorizontal } from 'lucide-react';
import { storageService } from '@/lib/storage';
import { vendorService } from '@/lib/recurring';
import { haptics } from '@/lib/haptics';
import { cn, rewardBurst } from '@/lib/utils';
import { toast } from 'sonner';
import { VoiceInput } from './voice-input';
import { localIntelligence } from '@/lib/intelligence';
import { contactService } from '@/lib/contact-service';
import { ExpenseSplit } from '@/types/split';
import { SplitBillSection } from './split/SplitBillSection';
import { scheduleSplitReminders } from '@/lib/split-reminders';

/* ─── schema ─────────────────────────────────────────────────────── */
const expenseSchema = z.object({
  vendor:      z.string().min(1, 'Vendor is required'),
  amount:      z.number().min(0.01, 'Must be > 0'),
  date:        z.string().min(1, 'Date is required'),
  category:    z.string().min(1, 'Pick a category'),
  description: z.string().optional(),
  status:      z.string().min(1, 'Pick a status'),
  projectCode: z.string().optional(),
  isReimbursement: z.boolean().default(false),
});
type FormData = z.infer<typeof expenseSchema>;

/* ─── status options ──────────────────────────────────────────────── */
const STATUS_OPTIONS: {
  value: ExpenseStatus;
  label: string;
  emoji: string;
  active: string;
}[] = [
  { value: 'pending',    label: 'Pending',    emoji: '⏳', active: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
  { value: 'approved',   label: 'Approved',   emoji: '✅', active: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' },
  { value: 'reimbursed', label: 'Reimbursed', emoji: '💸', active: 'bg-violet-500/20 border-violet-500/50 text-violet-400' },
  { value: 'rejected',   label: 'Rejected',   emoji: '❌', active: 'bg-rose-500/20 border-rose-500/50 text-rose-400' },
];

/* ─── props ───────────────────────────────────────────────────────── */
export interface ExpenseFormProps {
  onSubmit:    (expense: Expense) => void;
  initialData?: Expense;
  isEdit?:     boolean;
  onClose?:    () => void;
  trigger?:    React.ReactNode;
  open?:       boolean;
  onOpenChange?: (open: boolean) => void;
  tripId?:     string;
  participants?: string[]; // Contact IDs
}



/* ═══════════════════════════════════════════════════════════════════
   Inner form body — shared by both mobile sheet and desktop modal
═══════════════════════════════════════════════════════════════════ */
function FormBody({
  onSubmit,
  initialData,
  isEdit = false,
  onClose,
  onDone,
  tripId,
  participants,
}: ExpenseFormProps & { onDone?: () => void }) {
  const [receiptPreview, setReceiptPreview] = useState<string | null>(
    initialData?.receiptImage || null
  );
  const [tags,     setTags]     = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [showVendors, setShowVendors] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [split, setSplit] = useState<ExpenseSplit | undefined>(initialData?.split);
  const [paidBy, setPaidBy] = useState<string | undefined>(initialData?.paidBy);
  const [splitKey, setSplitKey] = useState(0);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting }, reset } =
    useForm<FormData>({
      resolver: zodResolver(expenseSchema),
      defaultValues: initialData
        ? {
            vendor:      initialData.vendor,
            amount:      initialData.amount,
            date:        format(new Date(initialData.date), 'yyyy-MM-dd'),
            category:    initialData.category,
            description: initialData.description,
            status:      initialData.status,
            projectCode: initialData.projectCode || '',
            isReimbursement: initialData.isReimbursement || false,
          }
        : { date: format(new Date(), 'yyyy-MM-dd'), status: 'pending', isReimbursement: false },
    });

  const [categories, setCategories] = useState(categoryService.getVisible());

  useEffect(() => {
    const handleUpdate = () => setCategories(categoryService.getVisible());
    window.addEventListener('categories-updated', handleUpdate);
    return () => window.removeEventListener('categories-updated', handleUpdate);
  }, []);

  const shouldAutoStartVoice = useMemo(() => {
    if (typeof window !== 'undefined' && (window as any)._autoStartVoice) {
      (window as any)._autoStartVoice = false;
      return true;
    }
    return false;
  }, []);

  // Ensure initial category is visible even if hidden (for editing)
  const displayCategories = useMemo(() => {
    if (!initialData?.category) return categories;
    const exists = categories.find(c => c.id === initialData.category);
    if (exists) return categories;
    const hidden = categoryService.getById(initialData.category);
    const hiddenExists = categories.some(c => c.id === hidden.id);
    if (hiddenExists) return categories;
    return [...categories, hidden];
  }, [categories, initialData]);

  const cat    = watch('category');
  const status = watch('status');
  const amount = watch('amount');
  const selCat = cat ? categoryService.getById(cat) : null;

  const handleVoiceParse = (data: any) => {
    if (data.amount) setValue('amount', data.amount, { shouldValidate: true });
    if (data.vendor) setValue('vendor', data.vendor, { shouldValidate: true });
    if (data.category) setValue('category', data.category, { shouldValidate: true });
    if (data.date) setValue('date', data.date, { shouldValidate: true });
    if (data.description) {
      const current = watch('description') || '';
      setValue('description', current ? `${current} ${data.description}` : data.description);
    }

    // Dynamic contact creation and placeholder resolution
    const contactMap: Record<string, string> = {};
    if (data.newContactsToCreate && data.newContactsToCreate.length > 0) {
      for (const name of data.newContactsToCreate) {
        const created = contactService.addContact({ name });
        contactMap[`NEW_CONTACT:${name}`] = created.id;
        toast.success(`Created contact for "${name}"`, {
          description: "Added to your local contacts directory",
          duration: 3000,
        });
      }
    }

    // Map new contacts into splits & paidBy
    let finalPaidBy = data.paidBy;
    if (finalPaidBy && finalPaidBy.startsWith('NEW_CONTACT:')) {
      finalPaidBy = contactMap[finalPaidBy] || 'user';
    }

    let finalSplit = data.split;
    if (finalSplit && finalSplit.members) {
      finalSplit = {
        ...finalSplit,
        members: finalSplit.members.map((m: any) => {
          if (m.contactId && m.contactId.startsWith('NEW_CONTACT:')) {
            return {
              ...m,
              contactId: contactMap[m.contactId] || m.contactId
            };
          }
          return m;
        })
      };
    }

    if (finalPaidBy !== undefined) {
      setPaidBy(finalPaidBy);
    }
    if (finalSplit !== undefined) {
      setSplit(finalSplit);
      setSplitKey(prev => prev + 1); // Trigger reactive update in SplitBillSection!
    }
  };

  const vendors = useMemo(() => {
    try { 
      const list = vendorService.getFromExpenses(storageService.getExpenses()); 
      return list.sort();
    }
    catch { return []; }
  }, []);

  const filteredVendors = useMemo(() => {
    const q = watch('vendor')?.toLowerCase() || '';
    if (!q) return vendors.slice(0, 5);
    return vendors.filter(v => v.toLowerCase().includes(q)).slice(0, 5);
  }, [vendors, watch('vendor')]);

  // Auto-categorization
  const vendor = watch('vendor');
  const [manualCategorySet, setManualCategorySet] = useState(false);

  useEffect(() => {
    if (!vendor || manualCategorySet || isEdit) return;
    
    const timeoutId = setTimeout(() => {
      const predicted = localIntelligence.predictCategory(vendor, amount || 0);
      if (predicted && predicted !== 'others') {
        setValue('category', predicted, { shouldValidate: true });
        toast.info(`Suggested category: ${predicted}`, {
          description: `Auto-selected based on "${vendor}"`,
          duration: 2000,
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [vendor, manualCategorySet, isEdit, setValue, amount]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const r = new FileReader();
    r.onload = (e) => setReceiptPreview(e.target?.result as string);
    r.readAsDataURL(file);
  };
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0]; if (f) processFile(f);
  }, []);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(p => [...p, t]);
    setTagInput('');
  };

  const onFormSubmit = async (data: FormData) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    try {
      const expense: Expense = {
        id:           initialData?.id || crypto.randomUUID(),
        vendor:       data.vendor,
        amount:       data.amount,
        date:         data.date,
        category:     data.category as ExpenseCategory,
        description:  data.description || '',
        status:       data.isReimbursement ? (data.status as ExpenseStatus) : 'approved',
        currency:     'INR',
        receiptImage: receiptPreview || initialData?.receiptImage,
        isReimbursement: data.isReimbursement,
        tags,
        projectCode:  data.projectCode || undefined,
        paidBy:       paidBy,
        split:        split,
        tripId:       tripId || initialData?.tripId,
        createdAt:    initialData?.createdAt || new Date().toISOString(),
        updatedAt:    new Date().toISOString(),
      };
      
      onSubmit(expense);
      scheduleSplitReminders(expense);
      
      setSuccess(true);
      await new Promise(r => setTimeout(r, 850));

      if (!isEdit) {
        haptics.success();
        rewardBurst();
        reset(); 
        setReceiptPreview(null); 
        setTags([]); 
        onDone?.();
      }
      
      setSuccess(false);
      onClose?.();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form 
      onSubmit={(e) => { e.preventDefault(); }} 
      className="flex flex-col"
    >

      {/* ── Hero: amount + merchant + date ── */}
      <div
        className="relative rounded-2xl mb-5 p-4"
        style={{
          background: selCat
            ? `linear-gradient(135deg, ${selCat.gradientFrom}20, ${selCat.gradientTo}0d)`
            : 'linear-gradient(135deg, hsl(262 85% 65%/0.12), hsl(186 95% 52%/0.06))',
        }}
      >
        {/* glow blob — wrapped in hidden overflow to prevent page bleed */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div
            className="absolute -top-8 -right-8 h-32 w-32 rounded-full blur-3xl opacity-30"
            style={{ background: selCat?.gradientFrom ?? 'hsl(262 85% 65%)' }}
          />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          {isEdit ? 'Edit Expense' : 'New Expense'}
        </p>

        {/* Big rupee input */}
        <div className="flex items-center gap-1 mb-4">
          <IndianRupee className="h-7 w-7 text-muted-foreground/60 shrink-0" strokeWidth={1.5} />
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            {...register('amount', { valueAsNumber: true })}
            placeholder="0.00"
            className={cn(
              'w-full bg-transparent border-none outline-none text-[44px] font-bold tracking-tight',
              'placeholder:text-muted-foreground/25 number-lg',
              amount && amount > 0 ? 'text-foreground' : 'text-muted-foreground/40'
            )}
          />
        </div>
        {errors.amount && <p className="text-xs text-destructive -mt-2 mb-2">{errors.amount.message}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Merchant</p>
              <VoiceInput onParse={handleVoiceParse} autoStart={shouldAutoStartVoice} />
            </div>
            <Input
              {...register('vendor')}
              onFocus={() => setShowVendors(true)}
              onBlur={() => setTimeout(() => setShowVendors(false), 200)}
              placeholder="e.g. Swiggy"
              className="h-10 bg-background/50 border-white/10 text-sm placeholder:text-muted-foreground/40 focus:border-white/25"
              autoComplete="off"
            />
            {showVendors && filteredVendors.length > 0 && (
              <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-[100] bg-card border border-border/50 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {filteredVendors.map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setValue('vendor', v, { shouldValidate: true }); setShowVendors(false); }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/10 last:border-0 flex items-center gap-2"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                    {v}
                  </button>
                ))}
              </div>
            )}
            {errors.vendor && <p className="text-[10px] text-destructive mt-0.5">{errors.vendor.message}</p>}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Date</p>
            <div className="relative">
              <Input
                type="date"
                {...register('date')}
                className="h-10 bg-background/50 border-white/10 text-sm focus:border-white/25"
              />
              <CalendarDays className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Category grid ── */}
      <div className="mb-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Category</p>
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {displayCategories.map((cfg) => {
            const Icon = iconMap[cfg.iconName] || MoreHorizontal;
            const key = cfg.id;
            const active = cat === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  haptics.light();
                  setValue('category', key, { shouldValidate: true });
                  setManualCategorySet(true);
                }}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all duration-200 active:scale-95 overflow-hidden',
                  active ? 'scale-105 border-transparent' : 'border-border/40 bg-muted/30 hover:bg-muted/50'
                )}
                style={active ? {
                  background:  `linear-gradient(135deg, ${cfg.gradientFrom}22, ${cfg.gradientTo}11)`,
                  borderColor: `${cfg.gradientFrom}55`,
                  boxShadow:   `0 0 16px ${cfg.gradientFrom}40`,
                } : {}}
              >
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-1', active ? cfg.bgColor : 'bg-muted/50')}>
                  <Icon className={cn('h-4 w-4', active ? cfg.color : 'text-muted-foreground')} />
                </div>
                <span className={cn('text-[8.5px] font-bold leading-tight text-center px-1 truncate w-full', active ? cfg.color : 'text-muted-foreground')}>
                  {cfg.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
        {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
      </div>

      {/* ── Status ── */}
      {watch('isReimbursement') && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Status</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setValue('status', s.value, { shouldValidate: true })}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95',
                  status === s.value
                    ? s.active
                    : 'border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/50'
                )}
              >
                <span className="text-sm leading-none">{s.emoji}</span>
                {s.label}
                {status === s.value && <Check className="h-3 w-3 ml-auto" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Notes ── */}
      <div className="mb-5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
          Notes <span className="normal-case font-normal">(optional)</span>
        </Label>
        <Textarea
          {...register('description')}
          placeholder="Add context or purpose..."
          className="bg-muted/30 border-border/40 focus:border-primary/40 min-h-[60px] resize-none text-sm placeholder:text-muted-foreground/40"
        />
      </div>

      {/* ── Split Bill ── */}
      <div className="mb-5">
        <SplitBillSection 
          key={splitKey}
          amount={amount || 0} 
          onSplitChange={setSplit} 
          onPaidByChange={setPaidBy}
          initialSplit={split}
          initialPaidBy={paidBy}
          tripParticipants={participants}
        />
      </div>

      {/* ── Reimbursement Toggle ── */}
      <div className="mb-5 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <RefreshCw className={cn("h-4.5 w-4.5 transition-all", watch('isReimbursement') ? "text-primary animate-spin-slow" : "text-muted-foreground")} />
          </div>
          <div>
            <p className="text-sm font-bold">Reimbursable</p>
            <p className="text-[11px] text-muted-foreground">Mark this for office/business refund</p>
          </div>
        </div>
        <Switch
          checked={watch('isReimbursement')}
          onCheckedChange={(checked) => setValue('isReimbursement', checked)}
        />
      </div>

      {/* ── Receipt ── */}
      <div className="mb-5">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
          Receipt <span className="normal-case font-normal">(optional)</span>
        </Label>
        {receiptPreview ? (
          <div className="relative border-2 border-dashed border-border/30 rounded-xl p-1.5 transition-all">
            <img src={receiptPreview} alt="Receipt" className="w-full max-h-28 object-contain rounded-lg" />
            <button
              type="button"
              onClick={e => { e.stopPropagation(); setReceiptPreview(null); }}
              className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-destructive/90 flex items-center justify-center text-white z-20 shadow-md active:scale-95 transition-transform"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {/* Gallery Upload */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer hover:border-primary/40 active:bg-primary/5 group',
                dragOver ? 'border-primary/70 bg-primary/10' : 'border-border/40'
              )}
            >
              <input
                type="file"
                accept="image/*"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Gallery</p>
            </div>

            {/* Camera Capture */}
            <div className="relative flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer hover:border-primary/40 active:bg-primary/5 group border-border/40">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Camera className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">Camera</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tags + Project ── */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Tag className="h-2.5 w-2.5" /> Tags
          </Label>
          <div className="flex gap-1.5">
            <Input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="tag..."
              className="h-9 bg-muted/30 border-border/40 text-xs flex-1 min-w-0"
            />
            <button type="button" onClick={addTag}
              className="h-9 w-9 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 shrink-0">
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {tags.map(t => (
                <Badge key={t} variant="secondary"
                  className="text-[10px] gap-0.5 px-1.5 py-0.5 cursor-pointer hover:bg-destructive/20 hover:text-destructive"
                  onClick={() => setTags(p => p.filter(x => x !== t))}>
                  {t} <X className="h-2 w-2" />
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
            <Briefcase className="h-2.5 w-2.5" /> Project
          </Label>
          <Input {...register('projectCode')} placeholder="PROJ-2024"
            className="h-9 bg-muted/30 border-border/40 text-xs font-mono" />
        </div>
      </div>

      {/* ── Swipe / click to submit ── */}
      <SwipeToAdd
        onConfirm={() => {
          if (!isSubmitting && !success && !isProcessing) {
            handleSubmit(onFormSubmit)();
          }
        }}
        isSubmitting={isSubmitting || isProcessing}
        success={success}
        label={isEdit && !initialData?.receiptImage ? 'Swipe to Update' : 'Swipe to Add Expense'}
      />
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   JS breakpoint hook — avoids inline-style vs Tailwind specificity
   conflicts. Returns true when viewport < 640px (Tailwind sm).
═══════════════════════════════════════════════════════════════════ */


export function ExpenseForm({ 
  onSubmit, 
  initialData, 
  isEdit = false, 
  onClose, 
  trigger,
  open: externalOpen,
  onOpenChange,
  ...props
}: ExpenseFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  
  const isMobile = useIsMobile();

  // Lock body scroll while open
  useEffect(() => {
    if (open && !isEdit) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, isEdit]);

  const formContent = (
    <FormBody 
      onSubmit={onSubmit} 
      initialData={initialData} 
      isEdit={isEdit} 
      onClose={onClose} 
      tripId={props.tripId}
      participants={props.participants}
    />
  );

  if (isEdit) {
    return (
      <div className="w-full max-w-full overflow-x-hidden px-1">
        {formContent}
      </div>
    );
  }

  const overlay = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Shared backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {isMobile ? (
            /* ── Mobile: bottom sheet ── */
            <motion.div
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100) {
                  setOpen(false);
                }
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full z-[9999] rounded-t-3xl border-t border-border/40 overflow-hidden"
              style={{ background: 'hsl(var(--background))', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
              {/* Header */}
              <div className="relative flex items-center justify-center px-5 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Receipt className="h-3.5 w-3.5 text-white" />
                  </div>
                  <h2 className="text-sm font-bold leading-none">{isEdit ? 'Edit Expense' : 'New Expense'}</h2>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="absolute right-5 h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-5 pb-10" style={{ overscrollBehavior: 'contain' }}>
                <FormBody 
                  onSubmit={onSubmit} 
                  onDone={() => setOpen(false)} 
                  initialData={initialData}
                  isEdit={isEdit}
                  tripId={props.tripId}
                  participants={props.participants}
                />
              </div>
            </motion.div>
          ) : (
            /* ── Desktop: centred modal ── */
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl z-[9999] rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
              style={{ background: 'hsl(var(--background))', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold leading-none">{isEdit ? 'Edit Expense' : 'New Expense'}</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{isEdit ? 'Update expense details' : 'Fill in the details below'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 px-6 py-5">
                <FormBody 
                  onSubmit={onSubmit} 
                  onDone={() => setOpen(false)} 
                  initialData={initialData}
                  isEdit={isEdit}
                />
              </div>
            </motion.div>
          )}
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Trigger */}
      {trigger !== null && (
        <div onClick={() => setOpen(true)} className="contents">
          {trigger ?? (
            <Button
              id="btn-add-expense"
              className="bg-gradient-primary hover:opacity-90 transition-all text-white shadow-glow font-semibold gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Expense</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      )}

      {createPortal(overlay, document.body)}
    </>
  );
}