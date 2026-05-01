import { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { biometrics } from '@/lib/biometrics';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';

interface BiometricLockProps {
  children: React.ReactNode;
  enabled: boolean;
}

export function BiometricLock({ children, enabled }: BiometricLockProps) {
  const [isLocked, setIsLocked] = useState(enabled);

  useEffect(() => {
    if (enabled) {
      handleAuth();
    }
  }, [enabled]);

  const handleAuth = async () => {
    const success = await biometrics.authenticate();
    if (success) {
      setIsLocked(false);
      haptics.success();
    } else {
      haptics.error();
    }
  };

  if (!enabled || !isLocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[10000] bg-background flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xs space-y-8"
      >
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-primary/20 rounded-full blur-xl"
          />
          <div className="relative h-20 w-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <Lock className="h-10 w-10 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">App Locked</h2>
          <p className="text-muted-foreground text-sm">
            Please authenticate to access Pixel Reimburse
          </p>
        </div>

        <Button
          onClick={handleAuth}
          className="w-full h-14 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold gap-3 text-lg transition-all active:scale-95"
        >
          <Fingerprint className="h-6 w-6" />
          Unlock with Biometrics
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground opacity-50">
          <ShieldCheck className="h-3 w-3" />
          <span>Secure local authentication</span>
        </div>
      </motion.div>
    </div>
  );
}
