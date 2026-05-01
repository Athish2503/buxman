import { useState } from 'react';
import { FileText, Download, Share2, X, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
  title: string;
  count: number;
}

export function ExportDialog({ isOpen, onClose, onConfirm, title, count }: ExportDialogProps) {
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async () => {
    setIsProcessing(true);
    haptics.medium();
    try {
      await onConfirm(message);
    } finally {
      setIsProcessing(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="glass border-border/50 max-w-sm mx-4 sm:max-w-md overflow-hidden p-0">
        <div className="relative p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Preparing report for {count} expenses</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" /> Share Message (Optional)
              </Label>
              <Textarea
                placeholder="e.g. Please find the reimbursement claim for April..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="bg-muted/30 border-border/40 focus:border-primary/50 min-h-[100px] text-sm resize-none"
              />
              <p className="text-[10px] text-muted-foreground italic">
                This text will be sent along with the PDF in the share sheet.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="h-11 rounded-xl font-semibold border-border/60"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAction}
                disabled={isProcessing}
                className="h-11 rounded-xl bg-gradient-primary text-white shadow-glow font-bold gap-2 group"
              >
                {isProcessing ? 'Generating...' : 'Continue'}
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative background element */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      </DialogContent>
    </Dialog>
  );
}
