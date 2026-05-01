import { useState } from 'react';
import { Camera as CameraIcon, Check, Plus, Trash2, Receipt, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ReceiptDraft } from '@/types/modules';
import { walletService } from '@/lib/modules-storage';
import { ExpenseForm } from './expense-form';
import { Expense } from '@/types/expense';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ReceiptWalletProps {
  onAddExpense: (e: Expense) => void;
}

export function ReceiptWallet({ onAddExpense }: ReceiptWalletProps) {
  const [receipts, setReceipts] = useState<ReceiptDraft[]>(() => walletService.getReceipts());
  const [processingReceipt, setProcessingReceipt] = useState<ReceiptDraft | null>(null);

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
            <div 
              key={r.id} 
              onClick={() => setProcessingReceipt(r)}
              className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/40 cursor-pointer active:scale-95 transition-transform"
            >
              <img src={r.imageUri} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Draft" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              
              <button 
                onClick={(e) => handleDelete(r.id, e)}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>

              <div className="absolute bottom-2 left-2 right-2">
                <p className="text-[10px] text-white/80 font-medium">{format(new Date(r.createdAt), 'dd MMM, HH:mm')}</p>
                <div className="flex items-center gap-1 text-white text-xs font-bold mt-0.5">
                  <Plus className="h-3 w-3" /> Process
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
