import { useState, useEffect } from 'react';
import { Camera as CameraIcon, Check, Plus, Trash2, Receipt, Image as ImageIcon, ArrowRight, Eye } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ReceiptDraft } from '@/types/modules';
import { walletService } from '@/lib/modules-storage';
import { ExpenseForm } from './expense-form';
import { Expense } from '@/types/expense';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { useLongPress } from '@/hooks/useLongPress';
import { notificationService } from '@/lib/notifications';
import { ImageViewer } from './image-viewer';

interface ReceiptWalletProps {
  onAddExpense: (e: Expense) => void;
}

export function ReceiptWallet({ onAddExpense }: ReceiptWalletProps) {
  const [receipts, setReceipts] = useState<ReceiptDraft[]>(() => walletService.getReceipts());
  const [processingReceipt, setProcessingReceipt] = useState<ReceiptDraft | null>(null);
  const [longPressedId, setLongPressedId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptDraft | null>(null);

  // Check for old receipts on mount
  useEffect(() => {
    const oldest = receipts.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
    if (oldest) {
      const days = differenceInDays(new Date(), new Date(oldest.createdAt));
      if (days >= 2) {
        const messages = [
          "💸 Don't you want money? You've got snaps pending!",
          "🐢 Your receipts are getting lonely. Process them for reimbursement!",
          "💎 Found some gold in your wallet! (Just kidding, it's just receipts that need logging)",
          "🌲 Money doesn't grow on trees, but it stays in your pocket if you log these!"
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        
        // Show In-App Toast
        toast(randomMsg, {
          duration: 6000,
          icon: '💰',
          description: `Oldest is ${days} days old`,
          action: {
            label: 'Fix now',
            onClick: () => setProcessingReceipt(oldest)
          }
        });

        // Trigger Native Mobile Notification
        notificationService.scheduleFunnyReminder(
          "Pixel Reimburse", 
          randomMsg
        );
      }
    }
  }, []);

  const reload = () => setReceipts(walletService.getReceipts());

  const handleCapture = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt, // Allows user to choose between camera or photo library
      });

      if (image.base64String) {
        const b64 = `data:image/${image.format};base64,${image.base64String}`;
        walletService.addReceipt(b64);
        haptics.success();
        reload();
        toast.success('Saved to Wallet');
      }
    } catch (error) {
      console.error('Camera error:', error);
      // Don't toast on user cancel
      if (error instanceof Error && error.message.includes('User cancelled')) {
        return;
      }
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    walletService.removeReceipt(id);
    haptics.heavy();
    reload();
  };

  const handleFormSubmit = (expense: Expense) => {
    onAddExpense(expense);
    if (processingReceipt) {
      walletService.removeReceipt(processingReceipt.id);
      setProcessingReceipt(null);
    }
    reload();
  };

  if (processingReceipt) {
    // Generate an initial expense stub populated with the image
    const initialData: Expense = {
      id: crypto.randomUUID(),
      vendor: '',
      category: 'other',
      amount: 0,
      currency: 'INR',
      date: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      status: 'pending',
      receiptImage: processingReceipt.imageUri,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setProcessingReceipt(null)} className="h-8 w-8 rounded-xl bg-muted/50 flex items-center justify-center">
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <h2 className="font-bold">Process Receipt</h2>
        </div>
        
        <div className="border border-border/40 rounded-xl p-2 bg-black/5 flex justify-center mb-4">
          <img 
            src={processingReceipt.imageUri} 
            alt="Receipt" 
            className="max-h-48 rounded-lg object-contain shadow-sm"
          />
        </div>

        {/* Reusing FormBody inline */}
        <ExpenseForm 
          onSubmit={handleFormSubmit} 
          initialData={initialData}
          isEdit // we use isEdit mode to mount FormBody inline instead of a modal
          onClose={() => setProcessingReceipt(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Receipt Wallet</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Snap now, log details later</p>
        </div>
        <button 
          onClick={handleCapture}
          className="h-9 px-3 rounded-xl bg-gradient-primary text-white shadow-glow text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <CameraIcon className="h-4 w-4" /> Snap
        </button>
      </div>

      {receipts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-2xl">
          <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Wallet is empty</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto">Take photos of physical receipts to process them when you have time.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {receipts.map(r => (
            <ReceiptItem 
              key={r.id} 
              receipt={r} 
              onSelect={() => setProcessingReceipt(r)}
              onDelete={(id) => {
                walletService.removeReceipt(id);
                haptics.heavy();
                reload();
              }}
              onView={(r) => setViewingReceipt(r)}
              isLongPressed={longPressedId === r.id}
              setLongPressedId={setLongPressedId}
            />
          ))}
        </div>
      )}

      {viewingReceipt && (
        <ImageViewer
          src={viewingReceipt.imageUri}
          isOpen={!!viewingReceipt}
          onClose={() => setViewingReceipt(null)}
          onDelete={() => {
            walletService.removeReceipt(viewingReceipt.id);
            reload();
          }}
          title={`Receipt from ${format(new Date(viewingReceipt.createdAt), 'dd MMM yyyy')}`}
        />
      )}
    </div>
  );
}

function ReceiptItem({ receipt, onSelect, onDelete, onView, isLongPressed, setLongPressedId }: { 
  receipt: ReceiptDraft; 
  onSelect: () => void; 
  onDelete: (id: string) => void;
  onView: (r: ReceiptDraft) => void;
  isLongPressed: boolean;
  setLongPressedId: (id: string | null) => void;
}) {
  const longPressProps = useLongPress(
    () => {
      haptics.selection();
      setLongPressedId(receipt.id);
    },
    () => {
      if (!isLongPressed) onView(receipt);
    }
  );

  return (
    <div 
      {...(!isLongPressed ? longPressProps : {})}
      className={cn(
        "group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/40 cursor-pointer active:scale-95 transition-transform",
        isLongPressed && "scale-105 ring-2 ring-primary ring-offset-2 z-10"
      )}
    >
      <img src={receipt.imageUri} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Draft" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      {/* Options Overlay on Long Press */}
      {isLongPressed && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2 p-2 animate-in fade-in zoom-in duration-200">
          <button 
            onClick={(e) => { e.stopPropagation(); onView(receipt); setLongPressedId(null); }}
            className="w-full h-9 rounded-lg bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center justify-center gap-2 border border-white/20"
          >
            <Eye className="h-3.5 w-3.5" /> View Full
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(); setLongPressedId(null); }}
            className="w-full h-9 rounded-lg bg-white text-black text-xs font-bold flex items-center justify-center gap-2"
          >
            <Check className="h-3.5 w-3.5" /> Process
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(receipt.id); setLongPressedId(null); }}
            className="w-full h-9 rounded-lg bg-destructive text-white text-xs font-bold flex items-center justify-center gap-2"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setLongPressedId(null); }}
            className="text-[10px] text-white/70 font-medium underline mt-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Normal View Bottom Text */}
      {!isLongPressed && (
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[10px] text-white/80 font-medium">{format(new Date(receipt.createdAt), 'dd MMM, HH:mm')}</p>
          <div className="flex items-center gap-1 text-white text-xs font-bold mt-0.5">
            <Plus className="h-3 w-3" /> Process
          </div>
        </div>
      )}
    </div>
  );
}
