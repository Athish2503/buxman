import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera as CameraIcon, Check, Plus, Trash2, Receipt, Image as ImageIcon, ArrowRight, Eye, X } from 'lucide-react';
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
  expenses: Expense[];
  onAddExpense: (e: Expense) => void;
}

export function ReceiptWallet({ expenses, onAddExpense }: ReceiptWalletProps) {
  const [receipts, setReceipts] = useState<ReceiptDraft[]>([]);

  useEffect(() => {
    walletService.getReceipts().then(setReceipts);
  }, []);
  const [processingReceipt, setProcessingReceipt] = useState<ReceiptDraft | null>(null);
  const [longPressedId, setLongPressedId] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<ReceiptDraft | null>(null);
  const [showSourcePicker, setShowSourcePicker] = useState(false);

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
        
        toast(randomMsg, {
          duration: 6000,
          icon: '💰',
          description: `Oldest is ${days} days old`,
          action: {
            label: 'Fix now',
            onClick: () => setProcessingReceipt(oldest)
          }
        });

        notificationService.scheduleFunnyReminder("Pixel Reimburse", randomMsg);
      }
    }
  }, []);

  const reload = async () => setReceipts(await walletService.getReceipts());

  const handleCapture = (source: CameraSource) => {
    setShowSourcePicker(false);
    setTimeout(async () => {
      try {
        const image = await Camera.getPhoto({
          quality: 90,
          allowEditing: false,
          resultType: CameraResultType.Base64,
          source,
        });

        if (image.base64String) {
          const b64 = `data:image/${image.format};base64,${image.base64String}`;
          await walletService.addReceipt(b64);
          haptics.success();
          await reload();
          toast.success('Saved to Wallet');
        }
      } catch (error) {
        console.error('Camera error:', error);
      }
    }, 100);
  };

  const handleFormSubmit = async (expense: Expense) => {
    onAddExpense(expense);
    if (processingReceipt) {
      await walletService.removeReceipt(processingReceipt.id);
      setProcessingReceipt(null);
    }
    await reload();
  };

  if (processingReceipt) {
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
      isReimbursement: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-4"
      >
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

        <ExpenseForm 
          onSubmit={handleFormSubmit} 
          initialData={initialData}
          isEdit 
          onClose={() => setProcessingReceipt(null)}
        />
      </motion.div>
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
          onClick={() => { haptics.selection(); setShowSourcePicker(true); }}
          className="h-9 px-3 rounded-xl bg-gradient-primary text-white shadow-glow text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <CameraIcon className="h-4 w-4" /> Snap
        </button>
      </div>

      <AnimatePresence>
        {showSourcePicker && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowSourcePicker(false)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm bg-card border border-border/40 rounded-[32px] overflow-hidden shadow-2xl p-6"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">Capture Receipt</h3>
                  <button onClick={() => setShowSourcePicker(false)} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleCapture(CameraSource.Camera)}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-primary/10 border border-primary/20 active:scale-95 transition-transform"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                      <CameraIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-bold">Take Photo</span>
                  </button>
                  <button
                    onClick={() => handleCapture(CameraSource.Photos)}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 active:scale-95 transition-transform"
                  >
                    <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <ImageIcon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-sm font-bold">From Gallery</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {receipts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border/40 rounded-2xl">
          <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">Wallet is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {receipts.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ReceiptItem 
                receipt={r} 
                onSelect={() => setProcessingReceipt(r)}
                onDelete={async (id) => {
                  await walletService.removeReceipt(id);
                  await reload();
                }}
                onView={(r) => setViewingReceipt(r)}
                isLongPressed={longPressedId === r.id}
                setLongPressedId={setLongPressedId}
              />
            </motion.div>
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
    <motion.div 
      {...(!isLongPressed ? longPressProps : {})}
      drag="y"
      dragConstraints={{ top: -100, bottom: 0 }}
      dragElastic={0.1}
      onDragEnd={(_, info) => {
        if (info.offset.y < -80) {
          haptics.success();
          onSelect();
        }
      }}
      className={cn(
        "group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/40 cursor-pointer active:scale-95 transition-transform bg-muted/20",
        isLongPressed && "scale-105 ring-2 ring-primary ring-offset-2 z-10"
      )}
    >
      <img src={receipt.imageUri} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Draft" />
      
      {/* Swipe Indicator */}
      <div className="absolute top-2 left-0 right-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-full flex items-center gap-1">
          <ArrowRight className="h-3 w-3 -rotate-90 text-white" />
          <span className="text-[8px] text-white font-bold uppercase">Swipe Up to Process</span>
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      
      <AnimatePresence>
        {isLongPressed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, scale: 1, backdropFilter: 'blur(2px)' }}
            exit={{ opacity: 0, scale: 0.9, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 p-2 z-20"
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {!isLongPressed && (
        <div className="absolute bottom-2 left-2 right-2">
          <p className="text-[10px] text-white/80 font-medium">{format(new Date(receipt.createdAt), 'dd MMM, HH:mm')}</p>
          <div className="flex items-center gap-1 text-white text-xs font-bold mt-0.5">
            <Plus className="h-3 w-3" /> Process
          </div>
        </div>
      )}
    </motion.div>
  );
}
