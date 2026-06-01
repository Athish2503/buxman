import { motion, useMotionValue, useTransform, AnimatePresence, animate } from 'framer-motion';
import { format } from 'date-fns';
import { Check, X, Eye, Edit, Trash2, Briefcase } from 'lucide-react';
import { Expense, ExpenseStatus } from '@/types/expense';
import { getCategoryConfig } from '@/lib/categories';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface ExpenseItemProps {
  expense: Expense;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: ExpenseStatus) => void;
}

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending: 'status-pending',
  approved: 'status-approved',
  reimbursed: 'status-reimbursed',
  rejected: 'status-rejected',
};

export function ExpenseItem({
  expense, isSelected, onToggleSelect, onView, onEdit, onDelete, onStatusChange
}: ExpenseItemProps) {
  const x = useMotionValue(0);
  const isReimb = expense.isReimbursement;

  // Configuration for swipe actions based on type
  const swipeConfig = {
    right: isReimb 
      ? { label: 'Approve', icon: Check, color: 'rgb(16, 185, 129)', status: 'approved' } // Emerald-500
      : { label: 'Update', icon: Edit, color: 'rgb(59, 130, 246)', action: () => onEdit(expense) }, // Blue-500
    left: isReimb
      ? { label: 'Reimbursed', icon: Briefcase, color: 'rgb(139, 92, 246)', status: 'reimbursed' } // Violet-500
      : { label: 'Delete', icon: Trash2, color: 'rgb(244, 63, 94)', action: () => onDelete(expense.id) } // Rose-500
  };

  // Swipe right (positive x)
  const backgroundRight = useTransform(x, [0, 80], [`rgba(${swipeConfig.right.color.match(/\d+/g)?.join(',')}, 0)`, swipeConfig.right.color]);
  const opacityRight = useTransform(x, [0, 60], [0, 1]);
  const scaleRight = useTransform(x, [0, 80], [0.5, 1.2]);

  // Swipe left (negative x)
  const backgroundLeft = useTransform(x, [-80, 0], [swipeConfig.left.color, `rgba(${swipeConfig.left.color.match(/\d+/g)?.join(',')}, 0)`]);
  const opacityLeft = useTransform(x, [-60, 0], [1, 0]);
  const scaleLeft = useTransform(x, [-80, 0], [1.2, 0.5]);

  const cfg = getCategoryConfig(expense.category);
  const Icon = cfg.icon;

  const handleDragEnd = (_: any, info: any) => {
    const threshold = 100;
    
    if (info.offset.x > threshold) {
      if (swipeConfig.right.status) {
        haptics.success();
        onStatusChange(expense.id, swipeConfig.right.status as ExpenseStatus);
      } else if (swipeConfig.right.action) {
        haptics.selection();
        swipeConfig.right.action();
      }
    } else if (info.offset.x < -threshold) {
      if (swipeConfig.left.status) {
        haptics.success();
        onStatusChange(expense.id, swipeConfig.left.status as ExpenseStatus);
      } else if (swipeConfig.left.action) {
        haptics.heavy();
        swipeConfig.left.action();
      }
    }
    
    // Always snap back to 0 with a premium spring
    animate(x, 0, { 
      type: 'spring', 
      stiffness: 350, 
      damping: 25,
      mass: 0.8
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3 group">
      {/* Background Actions - Right (Approve/Update) */}
      <motion.div 
        style={{ background: backgroundRight }}
        className="absolute inset-0 flex items-center pl-8 z-0"
      >
        <motion.div style={{ opacity: opacityRight, scale: scaleRight }} className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl">
            <swipeConfig.right.icon className="text-white h-6 w-6" strokeWidth={3} />
          </div>
          <span className="text-[10px] text-white font-black uppercase tracking-[0.2em] mt-2 drop-shadow-md">
            {swipeConfig.right.label}
          </span>
        </motion.div>
      </motion.div>

      {/* Background Actions - Left (Reimbursed/Delete) */}
      <motion.div 
        style={{ background: backgroundLeft }}
        className="absolute inset-0 flex items-center justify-end pr-8 z-0"
      >
        <motion.div style={{ opacity: opacityLeft, scale: scaleLeft }} className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 shadow-xl">
            <swipeConfig.left.icon className="text-white h-6 w-6" strokeWidth={3} />
          </div>
          <span className="text-[10px] text-white font-black uppercase tracking-[0.2em] mt-2 drop-shadow-md">
            {swipeConfig.left.label}
          </span>
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -140, right: 140 }}
        dragElastic={0.15}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        onClick={(e) => {
          // Prevent onView if it was a selection tap or a drag
          if (Math.abs(x.get()) > 5) return;
          onView(expense);
          haptics.selection();
        }}
        style={{ x }}
        className={cn(
          "relative z-10 flex items-center gap-4 p-4 pl-12 transition-all duration-300 cursor-pointer active:scale-[0.99]",
          isSelected
            ? "bg-primary/10 border-primary/40 shadow-glow shadow-primary/5"
            : "glass-card border-white/5 hover:border-white/10"
        )}
      >
        {/* Selection tap area (left) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center cursor-pointer z-20"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onToggleSelect(expense.id);
          }}
        >
          <div className={cn(
            "h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all duration-300",
            isSelected 
              ? "border-primary bg-primary shadow-glow shadow-primary/20" 
              : "border-white/10 bg-white/5"
          )}>
            {isSelected && <Check className="h-3.5 w-3.5 text-white" strokeWidth={4} />}
          </div>
        </div>

        {/* Category icon */}
        <div className={cn(
          "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg relative",
          cfg.bgColor
        )}>
          <Icon className={cn("h-6 w-6", cfg.color)} />
          <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-black text-[15px] tracking-tight truncate text-foreground/90 group-hover:text-foreground transition-colors">
                {expense.vendor}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{cfg.label}</span>
                <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                <span className="text-[10px] font-bold text-muted-foreground/40">{format(new Date(expense.date), 'dd MMM')}</span>
              </div>
            </div>
            <div className="text-right shrink-0 flex flex-col items-end">
              <p className={cn(
                "font-black text-[16px] font-mono tracking-tighter",
                expense.type === 'credit' ? "text-emerald-400" : "text-foreground"
              )}>
                {expense.type === 'credit' ? '+' : ''}{formatCurrency(expense.amount)}
              </p>
              {expense.isReimbursement && (
                <div className={cn(
                  "mt-1.5 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-white/5 shadow-inner",
                  STATUS_COLORS[expense.status].replace('status-', 'bg-').replace('rejected', 'destructive/10 text-destructive border-destructive/20').replace('approved', 'success/10 text-success border-success/20').replace('pending', 'warning/10 text-warning border-warning/20').replace('reimbursed', 'primary/10 text-primary border-primary/20')
                )}>
                   <div className={cn("h-1 w-1 rounded-full", STATUS_COLORS[expense.status].includes('rejected') ? 'bg-destructive' : STATUS_COLORS[expense.status].includes('approved') ? 'bg-success' : STATUS_COLORS[expense.status].includes('pending') ? 'bg-warning' : 'bg-primary')} />
                   <span className="text-[8px] font-black uppercase tracking-widest">{expense.status}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Floating Eye Icon for visual hint */}
        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-20 transition-opacity">
          <Eye className="h-3 w-3" />
        </div>
      </motion.div>
    </div>
  );
}
