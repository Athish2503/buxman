import { useState, useEffect } from 'react';
import { Shield, Camera, Bell, CheckCircle2, ArrowRight, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { permissions, PermissionStatus } from '@/lib/permissions';
import { haptics } from '@/lib/haptics';

interface PermissionGuardProps {
  children: React.ReactNode;
}

export function PermissionGuard({ children }: PermissionGuardProps) {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const check = async () => {
    const s = await permissions.checkStatus();
    setStatus(s);
    setLoading(false);
  };

  useEffect(() => {
    check();
  }, []);

  const handleGrant = async () => {
    haptics.medium();
    const s = await permissions.requestAll();
    setStatus(s);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-12 w-12 rounded-2xl bg-primary/20 border border-primary/40"
        />
      </div>
    );
  }

  if (status?.allGranted) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[5000] bg-background bg-aurora overflow-y-auto">
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Header */}
          <div className="space-y-4">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
              />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">System Access</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                To provide a seamless experience, Reimburse needs access to some native features.
              </p>
            </div>
          </div>

          {/* Permission List */}
          <div className="space-y-3">
            <PermissionItem 
              icon={Camera} 
              title="Camera & Photos" 
              desc="Scan receipts and save images" 
              granted={status?.camera} 
            />
            <PermissionItem 
              icon={Bell} 
              title="Notifications" 
              desc="Background alerts and reminders" 
              granted={status?.notifications} 
            />
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/40 flex items-center gap-4 text-left">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Lock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold">Privacy First</p>
                <p className="text-[11px] text-muted-foreground">Data is stored locally on your device.</p>
              </div>
            </div>
          </div>

          {/* Action */}
          <div className="space-y-4">
            <Button
              onClick={handleGrant}
              className="w-full h-14 rounded-2xl bg-primary text-white font-bold shadow-glow text-lg group active:scale-95 transition-all"
            >
              Enable All Features
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <button 
              onClick={() => setStatus({ ...status!, allGranted: true })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors font-medium underline underline-offset-4"
            >
              Continue with limited features
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PermissionItem({ icon: Icon, title, desc, granted }: any) {
  return (
    <div className={cn(
      "p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between text-left",
      granted ? "bg-success/10 border-success/30" : "bg-card/50 border-border/60"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
          granted ? "bg-success/20" : "bg-muted"
        )}>
          <Icon className={cn("h-5 w-5", granted ? "text-success" : "text-muted-foreground")} />
        </div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-[11px] text-muted-foreground">{desc}</p>
        </div>
      </div>
      {granted && (
        <CheckCircle2 className="h-5 w-5 text-success animate-scale-in" />
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
