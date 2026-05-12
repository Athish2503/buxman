import { useState, useEffect } from 'react';
import { Bell, Phone, Zap, RotateCcw, Check, BatteryCharging, AlertTriangle, Bug, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SubModuleHeader } from './Common';
import FinancialNotification from '@/lib/financial-notifications';
import { Capacitor } from '@capacitor/core';

interface SmartFeaturesModuleProps {
  permissionsStatus: {
    sms: boolean;
    notifications: boolean;
    overlay: boolean;
  };
  onBack: () => void;
}

export function SmartFeaturesModule({ permissionsStatus, onBack }: SmartFeaturesModuleProps) {
  const [isIgnoringBattery, setIsIgnoringBattery] = useState(true);

  useEffect(() => {
    const checkBattery = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const res = await FinancialNotification.isIgnoringBatteryOptimizations();
        setIsIgnoringBattery(res.isIgnoring);
      } catch (e) {
        console.error('Error checking battery optimization status', e);
      }
    };
    checkBattery();
  }, []);

  const handleDisableBatteryOptimization = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.info('Battery optimization controls are native Android features.');
      return;
    }
    toast.info('Opening Android battery optimization settings...');
    try {
      await FinancialNotification.requestIgnoreBatteryOptimizations();
      // Optimistically check back after a short delay
      setTimeout(async () => {
        const res = await FinancialNotification.isIgnoringBatteryOptimizations();
        setIsIgnoringBattery(res.isIgnoring);
        if (res.isIgnoring) {
          toast.success('Battery optimizations ignored successfully!');
        }
      }, 3000);
    } catch (e) {
      toast.error('Failed opening battery optimization interface');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-12">
      <SubModuleHeader title="Smart Capture Engine" onBack={onBack} />
      
      <div className="space-y-4">
        {/* Core Detection Permissions */}
        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", permissionsStatus.notifications ? "bg-emerald-500/5 border-emerald-500/20" : "bg-primary/5 border-primary/20")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", permissionsStatus.notifications ? "bg-emerald-500/20" : "bg-primary/20")}>
                <Bell className={cn("h-5 w-5", permissionsStatus.notifications ? "text-emerald-500" : "text-primary")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">App & Access Monitoring</h4>
                <p className="text-xs text-muted-foreground">NotificationListener & Accessibility capture engine</p>
              </div>
            </div>
            {permissionsStatus.notifications && (
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          <Button 
            className={cn("w-full rounded-2xl h-11 text-white shadow-lg", permissionsStatus.notifications ? "bg-emerald-500 shadow-emerald-500/20" : "bg-primary shadow-primary/20")}
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestNotificationListener());
              toast.info('Requesting notification listener access...');
            }}
          >
            {permissionsStatus.notifications ? 'Engine Monitoring Active' : 'Enable Engine Monitoring'}
          </Button>
        </div>

        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", permissionsStatus.sms ? "bg-emerald-500/5 border-emerald-500/20" : "bg-indigo-500/5 border-indigo-500/20")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", permissionsStatus.sms ? "bg-emerald-500/20" : "bg-indigo-500/20")}>
                <Phone className={cn("h-5 w-5", permissionsStatus.sms ? "text-emerald-500" : "text-indigo-500")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">SMS Fallback Parser</h4>
                <p className="text-xs text-muted-foreground">Parse bank debit SMS background stream</p>
              </div>
            </div>
            {permissionsStatus.sms && (
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          <Button 
            className={cn("w-full rounded-2xl h-11 text-white shadow-lg", permissionsStatus.sms ? "bg-emerald-500 shadow-emerald-500/20" : "bg-indigo-500 shadow-indigo-500/20")}
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestSMSPermission());
              toast.info('Requesting SMS broadcast access...');
            }}
          >
            {permissionsStatus.sms ? 'SMS Parsing Active' : 'Enable SMS Parsing'}
          </Button>
        </div>

        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", permissionsStatus.overlay ? "bg-emerald-500/5 border-emerald-500/20" : "bg-warning/5 border-warning/20")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", permissionsStatus.overlay ? "bg-emerald-500/20" : "bg-warning/20")}>
                <Zap className={cn("h-5 w-5", permissionsStatus.overlay ? "text-emerald-500" : "text-warning")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">Native Overlay Access</h4>
                <p className="text-xs text-muted-foreground">Instantly pop up native glassmorphic interface</p>
              </div>
            </div>
            {permissionsStatus.overlay && (
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
          <Button 
            variant={permissionsStatus.overlay ? "default" : "outline"}
            className={cn("w-full rounded-2xl h-11 shadow-lg", permissionsStatus.overlay ? "bg-emerald-500 text-white shadow-emerald-500/20 border-transparent" : "border-warning/30 hover:bg-warning/10")}
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestOverlayPermission());
              toast.info('Opening native overlay permission setup...');
            }}
          >
            {permissionsStatus.overlay ? 'Overlay Permission Granted' : 'Grant Overlay Permission'}
          </Button>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BATTERY OPTIMIZATION SECTION (Requirement 9)
            ════════════════════════════════════════════════════════════ */}
        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", isIgnoringBattery ? "bg-emerald-500/5 border-emerald-500/20" : "bg-rose-500/5 border-rose-500/20")}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5", isIgnoringBattery ? "bg-emerald-500/20" : "bg-rose-500/20")}>
                <BatteryCharging className={cn("h-5 w-5", isIgnoringBattery ? "text-emerald-500" : "text-rose-500")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">Battery Optimization Survival</h4>
                <p className="text-xs text-muted-foreground">
                  {isIgnoringBattery 
                    ? "Persistent background detection is fully active and shielded." 
                    : "Aggressive OS battery optimization may terminate background capture."}
                </p>
              </div>
            </div>
            {isIgnoringBattery ? (
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 animate-pulse" />
            )}
          </div>

          {!isIgnoringBattery && (
            <div className="bg-black/30 rounded-2xl p-3.5 text-[11px] text-muted-foreground/90 space-y-2 border border-white/5">
              <p className="font-bold text-rose-400">CRITICAL CAPTURE RELIABILITY INSTRUCTIONS:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong className="text-white">MIUI / Xiaomi:</strong> Go to App Info → Enable <em>Autostart</em> and set Battery Saver to <em>No Restrictions</em>.</li>
                <li><strong className="text-white">Realme / Oppo:</strong> Settings → Battery → App Management → Allow <em>Background Activity</em>.</li>
                <li><strong className="text-white">Vivo:</strong> Settings → Battery → High Background Power Consumption → Enable Buxman.</li>
                <li><strong className="text-white">Samsung:</strong> App Info → Battery → Select <em>Unrestricted</em>.</li>
              </ul>
            </div>
          )}

          <Button 
            className={cn("w-full rounded-2xl h-11 text-white shadow-lg font-bold", isIgnoringBattery ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20")}
            onClick={handleDisableBatteryOptimization}
          >
            {isIgnoringBattery ? "Optimizations Properly Ignored" : "Disable Battery Optimization"}
          </Button>
        </div>

        {/* ════════════════════════════════════════════════════════════
            TEST MODE DEVELOPER DEBUG PAGE (Requirement 12)
            ════════════════════════════════════════════════════════════ */}
        <div className="mt-8 pt-6 border-t border-border/40 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Bug className="h-4 w-4 text-primary" />
            <h4 className="text-xs font-black uppercase tracking-widest text-primary">Developer Test Mode Controls</h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="h-12 rounded-2xl border-white/10 hover:bg-white/5 text-xs font-bold gap-2"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  await FinancialNotification.simulateNotification({
                    title: "GPay",
                    text: "Paid ₹1,250 to Starbucks Coffee",
                    packageName: "com.google.android.apps.nbu.paisa.user"
                  });
                  toast.success("Triggered simulated notification flow");
                } else {
                  toast.info("Native execution recommended for simulation tests");
                }
              }}
            >
              <Bell className="w-3.5 h-3.5 text-emerald-400" />
              Simulate Notification
            </Button>

            <Button 
              variant="outline" 
              className="h-12 rounded-2xl border-white/10 hover:bg-white/5 text-xs font-bold gap-2"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  await FinancialNotification.simulateSms({
                    sender: "VM-ICICIB",
                    body: "Your Account X1234 is debited with INR 450.00 spent at Zomato Online on 12-May. Ref: 11223344"
                  });
                  toast.success("Triggered simulated SMS parser flow");
                } else {
                  toast.info("Native execution recommended for simulation tests");
                }
              }}
            >
              <Phone className="w-3.5 h-3.5 text-indigo-400" />
              Simulate SMS
            </Button>

            <Button 
              variant="outline" 
              className="h-12 rounded-2xl border-white/10 hover:bg-white/5 text-xs font-bold gap-2"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  await FinancialNotification.simulateGPayTransaction({
                    amount: 2500,
                    merchant: "POP UPI App Payment"
                  });
                  toast.success("Triggered POP UPI / GPay core simulator");
                } else {
                  toast.info("Native execution recommended for simulation tests");
                }
              }}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Simulate GPay/POP
            </Button>

            <Button 
              className="h-12 rounded-2xl bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 text-xs font-bold gap-2"
              onClick={async () => {
                if (Capacitor.isNativePlatform()) {
                  await FinancialNotification.forceOverlay({
                    amount: 999,
                    merchant: "Force Debug Overlay",
                    appName: "Buxman Test"
                  });
                  toast.success("Forced native glassmorphic overlay popup");
                } else {
                  toast.info("Native overlay works strictly on Android APK build");
                }
              }}
            >
              <Terminal className="w-3.5 h-3.5" />
              Force Overlay
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
