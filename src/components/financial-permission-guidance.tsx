import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Layout, ArrowRight, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { permissions } from '@/lib/permissions';
import { haptics } from '@/lib/haptics';

export function FinancialPermissionGuidance({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState({ notifications: false, overlay: false });
  const [loading, setLoading] = useState(true);

  const check = async () => {
    const s = await permissions.checkStatus();
    setStatus({ 
      notifications: s.financialNotifications, 
      overlay: s.overlay 
    });
    setLoading(false);
    
    if (s.financialNotifications && s.overlay) {
      onComplete();
    }
  };

  useEffect(() => {
    check();
    // Re-check when app regains focus
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  const handleRequestNotifications = async () => {
    haptics.medium();
    await permissions.requestNotificationListener();
  };

  const handleRequestOverlay = async () => {
    haptics.medium();
    await permissions.requestOverlayPermission();
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 z-[6000] bg-background bg-aurora overflow-y-auto">
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Header */}
          <div className="space-y-4">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-xl">
                <Wallet className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                Auto Expense
              </h2>
              <p className="text-muted-foreground text-sm leading-relaxed px-4">
                Enable these features to automatically track your expenses from banking apps.
              </p>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <div 
              onClick={!status.notifications ? handleRequestNotifications : undefined}
              className={`p-5 rounded-3xl border transition-all duration-500 cursor-pointer ${
                status.notifications 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-card/50 border-border/60 hover:border-primary/40 active:scale-[0.98]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  status.notifications ? "bg-emerald-500/20" : "bg-primary/10"
                }`}>
                  <Bell className={`h-6 w-6 ${status.notifications ? "text-emerald-500" : "text-primary"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">Transaction Reader</p>
                  <p className="text-xs text-muted-foreground">Detect SMS & App alerts</p>
                </div>
                {status.notifications && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              </div>
            </div>

            <div 
              onClick={!status.overlay ? handleRequestOverlay : undefined}
              className={`p-5 rounded-3xl border transition-all duration-500 cursor-pointer ${
                status.overlay 
                ? "bg-emerald-500/10 border-emerald-500/30" 
                : "bg-card/50 border-border/60 hover:border-primary/40 active:scale-[0.98]"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                  status.overlay ? "bg-emerald-500/20" : "bg-primary/10"
                }`}>
                  <Layout className={`h-6 w-6 ${status.overlay ? "text-emerald-500" : "text-primary"}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold">Quick Log Popup</p>
                  <p className="text-xs text-muted-foreground">Show entry screen over apps</p>
                </div>
                {status.overlay && <CheckCircle2 className="h-6 w-6 text-emerald-500" />}
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground bg-muted/30 py-2 px-4 rounded-full w-fit mx-auto">
            <ShieldCheck className="h-3 w-3" />
            <span>Bank-grade privacy: No data leaves your device</span>
          </div>

          {/* Action */}
          <div className="pt-4">
            {status.notifications && status.overlay ? (
              <Button
                onClick={onComplete}
                className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-glow text-lg animate-bounce-subtle"
              >
                Let's Go!
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <p className="text-[10px] text-muted-foreground animate-pulse">
                Waiting for permissions...
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
