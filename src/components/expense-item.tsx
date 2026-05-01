import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
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
  
  // Swipe right to approve (positive x)
  const backgroundRight = useTransform(x, [0, 80], ['#00000000', '#22c55e']);
  const opacityRight = useTransform(x, [0, 60], [0, 1]);
  const scaleRight = useTransform(x, [0, 60], [0.5, 1]);

  // Swipe left to reject (negative x)
  const backgroundLeft = useTransform(x, [-80, 0], ['#ef4444', '#00000000']);
  const opacityLeft = useTransform(x, [-60, 0], [1, 0]);
  const scaleLeft = useTransform(x, [-60, 0], [1, 0.5]);

  const cfg = getCategoryConfig(expense.category);
  const Icon = cfg.icon;

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      haptics.success();
      onStatusChange(expense.id, 'approved');
    } else if (info.offset.x < -100) {
      haptics.warning();
      onStatusChange(expense.id, 'rejected');
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl mb-2">
      {/* Background Actions */}
      <motion.div 
        style={{ background: backgroundRight }}
        className="absolute inset-0 flex items-center pl-6 z-0"
      >
        <motion.div style={{ opacity: opacityRight, scale: scaleRight }}>
          <Check className="text-white h-6 w-6" />
        </motion.div>
      </motion.div>

      <motion.div 
        style={{ background: backgroundLeft }}
        className="absolute inset-0 flex items-center justify-end pr-6 z-0"
      >
        <motion.div style={{ opacity: opacityLeft, scale: scaleLeft }}>
          <X className="text-white h-6 w-6" />
        </motion.div>
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          "relative z-10 flex items-start gap-3 p-3 pl-12 transition-all duration-200",
          isSelected
            ? "border-primary/50 bg-primary/5"
            : "border border-border/60 bg-card hover:border-border hover:bg-card/90"
        )}
      >
        {/* Selection tap area (left) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center cursor-pointer z-10"
          onClick={() => onToggleSelect(expense.id)}
        >
          <div className={cn(
            "h-4 w-4 rounded border-2 flex items-center justify-center transition-all",
            isSelected ? "border-primary bg-primary" : "border-border/60 opacity-40 group-hover:opacity-100"
          )}>
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>
        </div>

        {/* Category icon */}
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform",
          cfg.bgColor
        )}>
          <Icon className={cn("h-5 w-5", cfg.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-sm leading-tight truncate">{expense.vendor}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                {cfg.label} · {format(new Date(expense.date), 'dd MMM yyyy')}
                {expense.isReimbursement && (
                  <span className="flex items-center gap-0.5 px-1 rounded-sm bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
                    <Briefcase className="h-2.5 w-2.5" />
                    Work
                  </span>
                )}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-sm font-mono">{formatCurrency(expense.amount)}</p>
              <Badge className={cn("mt-1 text-[10px] py-0 px-1.5 h-4 rounded-full capitalize font-medium", STATUS_COLORS[expense.status])}>
                {expense.status}
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 mt-2">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] rounded-lg" onClick={() => onView(expense)}>
              <Eye className="h-3 w-3 mr-1" /> View
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] rounded-lg" onClick={() => onEdit(expense)}>
              <Edit className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
