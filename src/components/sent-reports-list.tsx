import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, CheckCircle2, Share2, Trash2, ChevronDown, ChevronUp, Clock, Calendar, Check } from 'lucide-react';
import { toast } from 'sonner';

import { ReimbursementReport, Expense } from '@/types/expense';
import { reimbursementService } from '@/lib/reimbursement-service';
import { generateExpensesPDF } from '@/lib/pdf-generator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, cn, rewardBurst } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { settingsService } from '@/lib/settings';
import { getCategoryConfig } from '@/lib/categories';
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

interface SentReportsListProps {
  expenses: Expense[];
}

export function SentReportsList({ expenses }: SentReportsListProps) {
  const [reports, setReports] = useState<ReimbursementReport[]>(() => reimbursementService.getReports());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setReports(reimbursementService.getReports());
    };
    window.addEventListener('reimburse-reports-updated', handleUpdate);
    return () => {
      window.removeEventListener('reimburse-reports-updated', handleUpdate);
    };
  }, []);

  const toggleExpand = (id: string) => {
    haptics.light();
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleMarkReimbursed = (report: ReimbursementReport) => {
    haptics.success();
    rewardBurst();
    reimbursementService.markAsReimbursed(report.id);
    toast.success(`Report ${report.invoiceNo} marked as reimbursed!`);
  };

  const handleResharePDF = async (report: ReimbursementReport, e: React.MouseEvent) => {
    e.stopPropagation();
    haptics.light();
    
    // Find expenses that were part of this report and still exist
    const reportExpenses = expenses.filter(exp => report.expenseIds.includes(exp.id));
    
    if (reportExpenses.length === 0) {
      toast.error('The expenses belonging to this report have been deleted.');
      return;
    }

    const toastId = toast.loading('Regenerating PDF report...');
    try {
      const settings = settingsService.get();
      const exportSummary = {
        total: reportExpenses.reduce((s, exp) => s + exp.amount, 0),
        pending: reportExpenses.filter(exp => exp.status === 'pending').reduce((s, exp) => s + exp.amount, 0),
        approved: reportExpenses.filter(exp => exp.status === 'approved').reduce((s, exp) => s + exp.amount, 0),
        reimbursed: reportExpenses.filter(exp => exp.status === 'reimbursed').reduce((s, exp) => s + exp.amount, 0),
        rejected: reportExpenses.filter(exp => exp.status === 'rejected').reduce((s, exp) => s + exp.amount, 0),
        count: reportExpenses.length,
      };

      await generateExpensesPDF(reportExpenses, exportSummary, {
        title: 'Expense Reimbursement Invoice',
        billedTo: settings.billedTo,
        billedFrom: settings.billedFrom,
        invoiceNo: report.invoiceNo, // Re-use the exact same invoice number
      });
      toast.success('Report regenerated successfully', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Failed to regenerate PDF', { id: toastId });
    }
  };

  const confirmDelete = () => {
    if (reportToDelete) {
      reimbursementService.deleteReport(reportToDelete);
      setReportToDelete(null);
      toast.success('Report history removed');
      haptics.medium();
    }
  };

  if (reports.length === 0) {
    return (
      <div className="py-20 text-center">
        <div className="h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4 border border-dashed border-border">
          <FileText className="h-8 w-8 text-muted-foreground/30" />
        </div>
        <p className="font-bold text-muted-foreground">No reports shared yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Select claims in the "Log" and share as PDF to create reports
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map(report => {
        const isExpanded = expandedId === report.id;
        const isReimbursed = report.status === 'reimbursed';
        const reportExpenses = expenses.filter(exp => report.expenseIds.includes(exp.id));

        return (
          <div
            key={report.id}
            onClick={() => toggleExpand(report.id)}
            className={cn(
              "glass border rounded-2xl p-4 transition-all duration-300 relative overflow-hidden cursor-pointer",
              isExpanded ? "border-primary/30 shadow-xl" : "border-white/5 hover:border-white/10"
            )}
          >
            {/* Status gradient background glow */}
            <div
              className={cn(
                "absolute top-0 right-0 w-32 h-32 rounded-full filter blur-[40px] opacity-10 pointer-events-none -mr-10 -mt-10 transition-all duration-500",
                isReimbursed ? "bg-purple-500" : "bg-amber-500"
              )}
            />

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-tight">{report.title}</h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] font-black uppercase tracking-wider py-0 px-2 rounded-full border-none",
                      isReimbursed
                        ? "bg-purple-500/15 text-purple-400"
                        : "bg-amber-500/15 text-amber-400 animate-pulse-glow"
                    )}
                  >
                    {isReimbursed ? 'Reimbursed' : 'Sent'}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(report.date), 'do MMM yyyy, h:mm a')}
                </p>
              </div>

              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-muted-foreground/75 hover:text-foreground hover:bg-white/5"
                  onClick={(e) => handleResharePDF(report, e)}
                  title="Reshare PDF"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-muted-foreground/75 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setReportToDelete(report.id)}
                  title="Delete Report"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-b border-white/5 py-3">
              <div className="space-y-0.5">
                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">Amount</span>
                <p className="text-sm font-black font-mono tracking-tight">{formatCurrency(report.totalAmount)}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">Claims</span>
                <p className="text-sm font-bold">{report.count} items</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest">Invoice No</span>
                <p className="text-[10px] font-mono font-medium text-muted-foreground">{report.invoiceNo}</p>
              </div>
            </div>

            {/* Quick Reimbursement Action Button */}
            <div className="mt-4 flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
              <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {isExpanded ? 'Hide claims list' : 'View claims list'}
              </span>

              <Button
                size="sm"
                variant={isReimbursed ? "ghost" : "default"}
                onClick={() => !isReimbursed && handleMarkReimbursed(report)}
                disabled={isReimbursed}
                className={cn(
                  "h-8 text-[10px] px-3.5 font-black uppercase tracking-wider rounded-xl gap-1.5 transition-all duration-300",
                  isReimbursed
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 cursor-default"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-md hover:scale-[1.02] press-scale"
                )}
              >
                {isReimbursed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Reimbursed
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Mark Reimbursed
                  </>
                )}
              </Button>
            </div>

            {/* Expandable Expense Details list */}
            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-2 animate-slide-down">
                <div className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-wider mb-2 px-0.5">
                  Included Expenses ({reportExpenses.length})
                </div>
                {reportExpenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic p-2 bg-white/5 rounded-xl text-center">
                    All expenses from this report have been deleted.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {reportExpenses.map(exp => {
                      const catConfig = getCategoryConfig(exp.category);
                      const CatIcon = catConfig.icon;
                      return (
                        <div
                          key={exp.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border border-white/5"
                              style={{ backgroundColor: `${catConfig.color}15`, color: catConfig.color }}
                            >
                              <CatIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold leading-tight">{exp.vendor}</p>
                              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                                {format(new Date(exp.date), 'dd/MM/yyyy')} • {catConfig.label}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-right">
                            <div>
                              <p className="text-xs font-mono font-black">{formatCurrency(exp.amount)}</p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[8px] font-black uppercase tracking-tighter py-0 px-1 border-none mt-0.5",
                                  exp.status === 'reimbursed' ? "bg-purple-500/10 text-purple-400" :
                                  exp.status === 'approved' ? "bg-emerald-500/10 text-emerald-400" :
                                  exp.status === 'pending' ? "bg-amber-500/10 text-amber-400" :
                                  "bg-rose-500/10 text-rose-400"
                                )}
                              >
                                {exp.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-white/10 glass max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Remove Report from History?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete this report from your history? The associated expenses will remain in your claims log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white border-none"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
