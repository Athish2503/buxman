import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Radio, 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  ArrowRightLeft, 
  Receipt, 
  FileText, 
  IndianRupee, 
  Copy,
  Sparkles,
  Share2
} from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NfcExchangePayload, NfcMode, NfcSplitDebtPayload, NfcReportPayload, NfcExpensePayload } from '@/types/nfc';
import { nfcService } from '@/lib/nfc-service';
import { haptics } from '@/lib/haptics';
import { useTransactionStore } from '@/lib/useTransactionStore';
import { contactService } from '@/lib/contact-service';

interface ContactlessExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPayload?: NfcExchangePayload;
  defaultMode?: NfcMode;
}

export function ContactlessExchangeModal({
  isOpen,
  onClose,
  initialPayload,
  defaultMode = 'beam'
}: ContactlessExchangeModalProps) {
  const [mode, setMode] = useState<NfcMode>(defaultMode);
  const [payload, setPayload] = useState<NfcExchangePayload | undefined>(initialPayload);
  const [receivedPayload, setReceivedPayload] = useState<NfcExchangePayload | null>(null);
  const [nfcSupported, setNfcSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('Ready for contactless tap');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const addExpense = useTransactionStore((state) => state.addExpense);

  useEffect(() => {
    setNfcSupported(nfcService.isSupported());
  }, []);

  useEffect(() => {
    if (initialPayload) {
      setPayload(initialPayload);
    }
  }, [initialPayload]);

  // Generate QR fallback whenever payload is updated
  useEffect(() => {
    if (payload) {
      const encoded = nfcService.encodePayload(payload);
      QRCode.toDataURL(encoded, {
        margin: 2,
        width: 320,
        color: {
          dark: '#38bdf8',
          light: '#0b0f17'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code:', err));
    }
  }, [payload]);

  // Handle NFC Listener lifecycle in 'receive' mode
  useEffect(() => {
    if (!isOpen || mode !== 'receive') {
      nfcService.stopListening();
      setIsListening(false);
      return;
    }

    if (!nfcSupported) {
      setStatusText('NFC hardware not detected. Use Peer QR Scan.');
      return;
    }

    setIsListening(true);
    setStatusText('Hold back of phone near sender device...');

    let stopFn: (() => void) | null = null;

    nfcService.startListening(
      (received) => {
        setReceivedPayload(received);
        setIsSuccess(true);
        setStatusText('Data received successfully!');
        haptics.success();
      },
      (err) => {
        console.warn('NFC Listen error:', err);
        setStatusText('Waiting for phone tap...');
      }
    ).then(cleanup => {
      stopFn = cleanup;
    });

    return () => {
      if (stopFn) stopFn();
      nfcService.stopListening();
      setIsListening(false);
    };
  }, [isOpen, mode, nfcSupported]);

  // Trigger NFC Write pulse when in 'beam' mode
  const handleBeamTrigger = async () => {
    if (!payload) return;
    if (!nfcSupported) {
      toast.info('NFC hardware unavailable. Switched to Peer QR Beam.', {
        description: 'Have the receiver scan your screen QR code.'
      });
      setMode('qr');
      return;
    }

    try {
      setStatusText('Ready to Beam! Hold phone against receiver device.');
      await nfcService.writePayload(payload);
      setIsSuccess(true);
      setStatusText('Beam transmitted successfully!');
      toast.success('Beamed payload to nearby phone!');
    } catch (e: any) {
      if (e?.name === 'NotAllowedError' || e?.name === 'AbortError') {
        setStatusText('NFC operation cancelled.');
      } else {
        setStatusText('Tap phone again or use QR code.');
      }
    }
  };

  const handleImportReceivedDebt = () => {
    if (!receivedPayload || receivedPayload.type !== 'SPLIT_DEBT') return;
    const debt = receivedPayload as NfcSplitDebtPayload;

    // Add contact if doesn't exist
    const contacts = contactService.getContacts();
    let contact = contacts.find(c => c.name.toLowerCase() === debt.senderName.toLowerCase());
    if (!contact) {
      contact = contactService.addContact(debt.senderName, debt.senderUpi);
    }

    // Add expense to store with split
    addExpense({
      vendor: debt.vendor,
      amount: debt.totalAmount,
      category: debt.category as any,
      date: debt.date || new Date().toISOString(),
      notes: `[Contactless Import from ${debt.senderName}] ${debt.notes || ''}`,
      paidBy: contact.id,
      split: {
        totalAmount: debt.totalAmount,
        splitType: 'exact',
        userPaid: false,
        members: [
          {
            contactId: contact.id,
            amount: debt.totalAmount - debt.oweAmount,
            paid: true
          }
        ]
      }
    });

    haptics.success();
    toast.success(`Imported debt from ${debt.senderName}!`, {
      description: `You owe ${debt.senderName} ₹${debt.oweAmount.toFixed(2)}`
    });

    onClose();
  };

  const handleImportReceivedExpense = () => {
    if (!receivedPayload || receivedPayload.type !== 'EXPENSE_IMPORT') return;
    const exp = (receivedPayload as NfcExpensePayload).expense;

    addExpense({
      vendor: exp.vendor || 'Beamed Expense',
      amount: exp.amount || 0,
      category: exp.category || 'General',
      date: exp.date || new Date().toISOString(),
      notes: `[Beamed Via NFC] ${exp.notes || ''}`
    });

    haptics.success();
    toast.success('Expense imported to workspace!');
    onClose();
  };

  const copyQrTextToClipboard = async () => {
    if (!payload) return;
    const encoded = nfcService.encodePayload(payload);
    await navigator.clipboard.writeText(encoded);
    haptics.light();
    toast.success('Copied payload data to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#0B0F17]/95 border border-cyan-500/20 backdrop-blur-2xl text-foreground p-6 shadow-2xl rounded-3xl overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <DialogHeader className="relative z-10 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Pixel Beam <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px]">NFC</Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Contactless device-to-device peer exchange
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-muted/20 p-1 rounded-2xl border border-border/40 my-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('beam'); setIsSuccess(false); haptics.selection(); }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'beam' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            Beam
          </button>
          <button
            type="button"
            onClick={() => { setMode('receive'); setIsSuccess(false); haptics.selection(); }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'receive' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            Receive
          </button>
          <button
            type="button"
            onClick={() => { setMode('qr'); setStatusText('Show QR code to receiver phone'); haptics.selection(); }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'qr' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Peer QR
          </button>
        </div>

        {/* Dynamic Content Views */}
        <div className="relative z-10 space-y-4">
          <AnimatePresence mode="wait">

            {/* 1. BEAM MODE */}
            {mode === 'beam' && (
              <motion.div
                key="beam"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-center"
              >
                {/* Sonar Radar Wave Animation */}
                <div className="relative h-44 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.4, 1.8], opacity: [0.6, 0.3, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
                    className="absolute w-28 h-28 rounded-full border-2 border-cyan-500/40 bg-cyan-500/5"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.2, 1.5], opacity: [0.8, 0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: 0.4, ease: 'easeOut' }}
                    className="absolute w-20 h-20 rounded-full border-2 border-blue-500/50 bg-blue-500/10"
                  />
                  
                  <div className="relative z-10 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/20 flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#0B0F17] flex items-center justify-center">
                      <Smartphone className="h-9 w-9 text-cyan-400 animate-bounce" />
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-cyan-300 tracking-wide uppercase">
                    {nfcSupported ? 'NFC Transmitter Active' : 'NFC Hardware Unavailable'}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    {statusText}
                  </p>
                </div>

                {/* Data Summary Card */}
                {payload && (
                  <div className="rounded-2xl bg-muted/10 border border-border/40 p-3 text-left space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-cyan-400" />
                        Payload ready to beam
                      </span>
                      <Badge variant="secondary" className="text-[9px] uppercase font-mono bg-cyan-500/10 text-cyan-300">
                        {payload.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    {payload.type === 'SPLIT_DEBT' && (
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="font-semibold">{payload.vendor}</span>
                        <span className="font-mono text-cyan-400 font-bold">₹{payload.oweAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {payload.type === 'REIMBURSEMENT_REPORT' && (
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="font-semibold">{payload.reportTitle}</span>
                        <span className="font-mono text-cyan-400 font-bold">₹{payload.totalAmount.toFixed(2)}</span>
                      </div>
                    )}

                    {payload.type === 'EXPENSE_IMPORT' && (
                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="font-semibold">{payload.expense.vendor || 'Expense Item'}</span>
                        <span className="font-mono text-cyan-400 font-bold">₹{payload.expense.amount?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 flex gap-2">
                  <Button
                    onClick={handleBeamTrigger}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-cyan-500/20 py-5"
                  >
                    <Smartphone className="h-4 w-4 mr-2" />
                    Touch Phones to Beam
                  </Button>
                </div>
              </motion.div>
            )}

            {/* 2. RECEIVE MODE */}
            {mode === 'receive' && (
              <motion.div
                key="receive"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-center"
              >
                {!receivedPayload ? (
                  <>
                    <div className="relative h-44 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                        className="absolute w-32 h-32 rounded-full border-2 border-dashed border-cyan-500/40"
                      />
                      <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                        <Radio className="h-9 w-9 text-cyan-400 animate-pulse" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                        Listening for Contactless Beam
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {statusText}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Received Contactless Payload!</span>
                    </div>

                    {/* Received Debt Summary */}
                    {receivedPayload.type === 'SPLIT_DEBT' && (
                      <div className="rounded-2xl bg-muted/20 border border-border/40 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-border/30 pb-2">
                          <span className="text-xs text-muted-foreground">Sender</span>
                          <span className="text-sm font-bold text-white">{(receivedPayload as NfcSplitDebtPayload).senderName}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Vendor / Expense</span>
                          <span className="text-sm font-semibold">{(receivedPayload as NfcSplitDebtPayload).vendor}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs font-bold text-cyan-300">Amount You Owe</span>
                          <span className="text-lg font-mono font-bold text-emerald-400">
                            ₹{(receivedPayload as NfcSplitDebtPayload).oweAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Received Expense Summary */}
                    {receivedPayload.type === 'EXPENSE_IMPORT' && (
                      <div className="rounded-2xl bg-muted/20 border border-border/40 p-4 space-y-2">
                        <div className="text-xs text-muted-foreground">Incoming Expense</div>
                        <div className="flex justify-between font-bold text-sm">
                          <span>{(receivedPayload as NfcExpensePayload).expense.vendor}</span>
                          <span className="font-mono text-cyan-400">₹{(receivedPayload as NfcExpensePayload).expense.amount?.toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => {
                          if (receivedPayload.type === 'SPLIT_DEBT') handleImportReceivedDebt();
                          else handleImportReceivedExpense();
                        }}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-2xl py-5"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Import to Workspace
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. PEER QR MODE (Fallback) */}
            {mode === 'qr' && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 text-center"
              >
                {qrDataUrl ? (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-white rounded-3xl shadow-2xl shadow-cyan-500/20 border border-white/20">
                      <img src={qrDataUrl} alt="Peer Beam QR" className="w-56 h-56 rounded-2xl" />
                    </div>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Scan with receiving device camera or Buxman QR reader
                    </p>
                  </div>
                ) : (
                  <div className="h-56 flex items-center justify-center">
                    <div className="text-xs text-muted-foreground">Generating high-density QR...</div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    onClick={copyQrTextToClipboard}
                    className="flex-1 border-border/40 text-xs font-semibold rounded-xl"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Copy Payload Data
                  </Button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </DialogContent>
    </Dialog>
  );
}
