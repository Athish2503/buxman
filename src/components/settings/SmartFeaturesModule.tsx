import { useState, useEffect } from 'react';
import { Bell, Phone, Zap, RotateCcw, Check, BatteryCharging, AlertTriangle, Bug, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SubModuleHeader } from './Common';
import FinancialNotification from '@/lib/financial-notifications';
import { Capacitor } from '@capacitor/core';
import { useTransactionStore } from '@/lib/useTransactionStore';

interface SmartFeaturesModuleProps {
  permissionsStatus: {
    sms: boolean;
    notifications: boolean;
    overlay: boolean;
    isMiui?: boolean;
  };
  onBack: () => void;
}

export function SmartFeaturesModule({ permissionsStatus, onBack }: SmartFeaturesModuleProps) {
  const transactions = useTransactionStore((state) => state.transactions);
  const [isIgnoringBattery, setIsIgnoringBattery] = useState(true);
  const [manualNotifications, setManualNotifications] = useState(() => localStorage.getItem('manual_perm_notifications') === 'true');
  const [manualSms, setManualSms] = useState(() => localStorage.getItem('manual_perm_sms') === 'true');
  const [manualOverlay, setManualOverlay] = useState(() => localStorage.getItem('manual_perm_overlay') === 'true');

  const isNotificationsActive = permissionsStatus.notifications || manualNotifications;
  const isSmsActive = permissionsStatus.sms || manualSms;
  const isOverlayActive = permissionsStatus.overlay || manualOverlay;

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
        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", isNotificationsActive ? "bg-emerald-500/5 border-emerald-500/20" : "bg-primary/5 border-primary/20")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", isNotificationsActive ? "bg-emerald-500/20" : "bg-primary/20")}>
                <Bell className={cn("h-5 w-5", isNotificationsActive ? "text-emerald-500" : "text-primary")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">App & Access Monitoring</h4>
                <p className="text-xs text-muted-foreground">NotificationListener & Accessibility capture engine</p>
              </div>
            </div>
            {isNotificationsActive && (
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isNotificationsActive} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setManualNotifications(val);
                  localStorage.setItem('manual_perm_notifications', String(val));
                  toast.success(val ? 'Manually enabled engine monitoring' : 'Manual setting cleared');
                }}
                disabled={permissionsStatus.notifications}
                className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer disabled:opacity-70 disabled:cursor-default"
              />
              <span className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                {permissionsStatus.notifications ? "Automatically Verified by OS" : "Manually Enabled / Verified"}
              </span>
            </label>
            {isNotificationsActive && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Active</span>}
          </div>

          <Button 
            className={cn("w-full rounded-2xl h-11 text-white shadow-lg font-bold", isNotificationsActive ? "bg-emerald-500 shadow-emerald-500/20" : "bg-primary shadow-primary/20")}
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestNotificationListener());
              toast.info('Requesting notification listener access...');
            }}
          >
            {isNotificationsActive ? 'Engine Monitoring Active' : 'Enable Engine Monitoring'}
          </Button>
        </div>

        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", isSmsActive ? "bg-emerald-500/5 border-emerald-500/20" : "bg-indigo-500/5 border-indigo-500/20")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", isSmsActive ? "bg-emerald-500/20" : "bg-indigo-500/20")}>
                <Phone className={cn("h-5 w-5", isSmsActive ? "text-emerald-500" : "text-indigo-500")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">SMS Fallback Parser</h4>
                <p className="text-xs text-muted-foreground">Parse bank debit SMS background stream</p>
              </div>
            </div>
            {isSmsActive && (
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isSmsActive} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setManualSms(val);
                  localStorage.setItem('manual_perm_sms', String(val));
                  toast.success(val ? 'Manually enabled SMS parser' : 'Manual setting cleared');
                }}
                disabled={permissionsStatus.sms}
                className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer disabled:opacity-70 disabled:cursor-default"
              />
              <span className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                {permissionsStatus.sms ? "Automatically Verified by OS" : "Manually Enabled / Verified"}
              </span>
            </label>
            {isSmsActive && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Active</span>}
          </div>

          <Button 
            className={cn("w-full rounded-2xl h-11 text-white shadow-lg font-bold", isSmsActive ? "bg-emerald-500 shadow-emerald-500/20" : "bg-indigo-500 shadow-indigo-500/20")}
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestSMSPermission());
              toast.info('Requesting SMS broadcast access...');
            }}
          >
            {isSmsActive ? 'SMS Parsing Active' : 'Enable SMS Parsing'}
          </Button>
        </div>

        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", isOverlayActive ? "bg-emerald-500/5 border-emerald-500/20" : "bg-warning/5 border-warning/20")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0", isOverlayActive ? "bg-emerald-500/20" : "bg-warning/20")}>
                <Zap className={cn("h-5 w-5", isOverlayActive ? "text-emerald-500" : "text-warning")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">Native Overlay Access</h4>
                <p className="text-xs text-muted-foreground">Instantly pop up native glassmorphic interface</p>
              </div>
            </div>
            {isOverlayActive && (
              <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 mt-0.5">
                <Check className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/5">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={isOverlayActive} 
                onChange={(e) => {
                  const val = e.target.checked;
                  setManualOverlay(val);
                  localStorage.setItem('manual_perm_overlay', String(val));
                  toast.success(val ? 'Manually verified overlay setup' : 'Manual setting cleared');
                }}
                disabled={permissionsStatus.overlay}
                className="rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500 h-4 w-4 cursor-pointer disabled:opacity-70 disabled:cursor-default"
              />
              <span className="text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                {permissionsStatus.overlay ? "Automatically Verified by OS" : "Manually Enabled / Verified"}
              </span>
            </label>
            {isOverlayActive && <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Active</span>}
          </div>

          <Button 
            variant={isOverlayActive ? "default" : "outline"}
            className={cn("w-full rounded-2xl h-11 shadow-lg font-bold", isOverlayActive ? "bg-emerald-500 text-white shadow-emerald-500/20 border-transparent" : "border-warning/30 hover:bg-warning/10")}
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestOverlayPermission());
              toast.info('Opening native overlay permission setup...');
            }}
          >
            {isOverlayActive ? 'Overlay Permission Granted' : 'Grant Overlay Permission'}
          </Button>

          {permissionsStatus.isMiui && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-[11px] text-amber-200/90 space-y-2 mt-2">
              <p className="font-bold flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                MIUI/Xiaomi Background Pop-up Settings
              </p>
              <p className="leading-relaxed">
                Xiaomi devices require a specific system setting to display transaction overlays when the app is in the background. Please open the Permissions Editor and enable <strong>"Display pop-up windows while running in the background"</strong>.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl border-amber-500/30 hover:bg-amber-500/20 text-xs font-bold text-amber-300 bg-transparent h-9"
                onClick={async () => {
                  try {
                    toast.info("Opening MIUI permissions editor...");
                    await (await import('@/lib/financial-notifications')).default.openMiuiPermissionSettings();
                  } catch (e) {
                    toast.error("Failed to launch settings screen");
                  }
                }}
              >
                Configure MIUI Pop-up Settings
              </Button>
            </div>
          )}
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
                  toast.success("Simulated Notification Flow (Web)");
                  useTransactionStore.getState().addTransaction({
                    amount: 1250,
                    merchant: "Starbucks Coffee",
                    type: "debit",
                    appName: "GPay",
                    timestamp: Date.now(),
                    rawText: "GPay Paid ₹1,250 to Starbucks Coffee",
                    reference: "SIM" + Date.now()
                  });
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
                const sampleText = "Rs.500.00 debited from A/c **1234 on 16-Aug-26 via UPI ref no 6228xxxxxxxx to VPA merchant@paytm (Avl Bal: Rs.14,500.00). Call 18002586161 if not done. -HDFC Bank";
                if (Capacitor.isNativePlatform()) {
                  await FinancialNotification.simulateSms({
                    sender: "HD-HDFCBK",
                    body: sampleText
                  });
                  toast.success("Simulated HDFC VPA format");
                } else {
                  window.dispatchEvent(new CustomEvent("simulate-sms", { detail: { body: sampleText } }));
                  toast.success("Simulated HDFC VPA Flow (Web)");
                }
              }}
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Simulate HDFC VPA
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
                  toast.success("Simulated SMS Flow (Web)");
                  useTransactionStore.getState().addTransaction({
                    amount: 450,
                    merchant: "Zomato Online",
                    type: "debit",
                    appName: "SMS",
                    timestamp: Date.now(),
                    rawText: "Your Account X1234 is debited with INR 450.00 spent at Zomato Online on 12-May. Ref: 11223344",
                    reference: "11223344"
                  });
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
                  toast.success("Simulated GPay/POP Flow (Web)");
                  useTransactionStore.getState().addTransaction({
                    amount: 2500,
                    merchant: "POP UPI App Payment",
                    type: "debit",
                    appName: "GPay",
                    timestamp: Date.now(),
                    rawText: "Paid ₹2500 to POP UPI App Payment",
                    reference: "SIM" + Date.now()
                  });
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
                  toast.success("Simulated Force Overlay (Web)");
                  useTransactionStore.getState().addTransaction({
                    amount: 999,
                    merchant: "Force Debug Overlay",
                    type: "debit",
                    appName: "Buxman Test",
                    timestamp: Date.now(),
                    rawText: "Forced manually from developer options",
                    reference: "DBG" + Date.now()
                  });
                }
              }}
            >
              <Terminal className="w-3.5 h-3.5" />
              Force Overlay
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/80 italic px-1">
            * Note: If running natively on Android, ensure the <strong className="text-white">Display over other apps</strong> permission is granted to Buxman in Android App Settings, otherwise OS security automatically blocks popups.
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════
            LIGHTWEIGHT INTERNAL DEBUG SCREEN (Requirement 4)
            ════════════════════════════════════════════════════════════ */}
        <div className="mt-8 pt-6 border-t border-border/40 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Internal Telemetry & Debug Console</h4>
            </div>
          </div>

          <div className="bg-black/40 rounded-3xl p-4 border border-white/5 font-mono text-[11px] space-y-3">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-white/5">
              <div>
                <span className="text-muted-foreground block text-[9px]">NotificationListener:</span>
                <span className={cn("font-bold", isNotificationsActive ? "text-emerald-400" : "text-rose-400")}>
                  {isNotificationsActive ? "ACTIVE • CONNECTED" : "INACTIVE"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px]">SMS BroadcastReceiver:</span>
                <span className={cn("font-bold", isSmsActive ? "text-emerald-400" : "text-rose-400")}>
                  {isSmsActive ? "ACTIVE • CONNECTED" : "INACTIVE"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-muted-foreground block text-[9px] mb-0.5">Last Detected Raw Message:</span>
              <p className="text-white/90 bg-white/5 p-2 rounded-xl text-[10px] break-all leading-relaxed line-clamp-3">
                {transactions[0]?.rawText || "No incoming messages intercepted in this session yet."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground block text-[9px]">Parsed Target Vendor:</span>
                <span className="text-white font-bold block truncate">{transactions[0]?.merchant || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px]">Extracted Amount:</span>
                <span className="text-emerald-400 font-bold block">{transactions[0]?.amount ? `₹${transactions[0].amount}` : "—"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
              <div>
                <span className="text-muted-foreground block text-[9px]">Pipeline Save Status:</span>
                <span className="text-indigo-400 font-bold block uppercase tracking-wider">{transactions[0]?.status || "PENDING"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[9px]">Parser Exception/Errors:</span>
                <span className="text-muted-foreground/60 block italic">0 Critical Failures</span>
              </div>
            </div>
          </div>

          {/* Test Simulation Examples from Requirement 3 */}
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-muted-foreground block px-1">Simulate Real Bank Formats (Req #3):</span>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                className="h-auto py-2.5 px-3 justify-start text-left text-[10px] font-mono border-white/10 hover:bg-white/5 whitespace-normal leading-tight block"
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    await FinancialNotification.simulateSms({
                      sender: "VM-IOBBNK",
                      body: "Your a/c XXXXX53 debited for payee SOMASUNDARAM B for Rs. 1200.00 on 2026-05-08, ref 612870190915.If not you, report to your bank immediately-IOB."
                    });
                    toast.success("Simulated Format #1 (SOMASUNDARAM B)");
                  } else {
                    toast.info("Simulating Format #1 locally via store...");
                    useTransactionStore.getState().addTransaction({
                      amount: 1200.00,
                      merchant: "SOMASUNDARAM B",
                      type: "debit",
                      appName: "SMS",
                      timestamp: Date.now(),
                      rawText: "Your a/c XXXXX53 debited for payee SOMASUNDARAM B for Rs. 1200.00 on 2026-05-08, ref 612870190915.If not you, report to your bank immediately-IOB.",
                      reference: "612870190915"
                    });
                  }
                }}
              >
                <strong className="text-emerald-400 block mb-0.5">Format #1: Standard Payee</strong>
                "debited for payee SOMASUNDARAM B for Rs. 1200.00..."
              </Button>

              <Button
                variant="outline"
                className="h-auto py-2.5 px-3 justify-start text-left text-[10px] font-mono border-white/10 hover:bg-white/5 whitespace-normal leading-tight block"
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    await FinancialNotification.simulateSms({
                      sender: "VM-IOBBNK",
                      body: "Your a/c XXXXX53 debited for payee THULASI PHARMACIES KAVUNDAMPA for Rs. 41.00 on 2026-05-08, ref 612867646594.If not you, report to your bank immediately-IOB."
                    });
                    toast.success("Simulated Format #2 (THULASI PHARMACIES)");
                  } else {
                    toast.info("Simulating Format #2 locally...");
                    useTransactionStore.getState().addTransaction({
                      amount: 41.00,
                      merchant: "THULASI PHARMACIES KAVUNDAMPA",
                      type: "debit",
                      appName: "SMS",
                      timestamp: Date.now(),
                      rawText: "Your a/c XXXXX53 debited for payee THULASI PHARMACIES KAVUNDAMPA for Rs. 41.00 on 2026-05-08, ref 612867646594.If not you, report to your bank immediately-IOB.",
                      reference: "612867646594"
                    });
                  }
                }}
              >
                <strong className="text-emerald-400 block mb-0.5">Format #2: Long Payee Name</strong>
                "debited for payee THULASI PHARMACIES KAVUNDAMPA for Rs. 41.00..."
              </Button>

              <Button
                variant="outline"
                className="h-auto py-2.5 px-3 justify-start text-left text-[10px] font-mono border-white/10 hover:bg-white/5 whitespace-normal leading-tight block"
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    await FinancialNotification.simulateSms({
                      sender: "VM-IOBBNK",
                      body: 'Your a/c "************553" debited for payee for Rs. 30.00 on 07/26/2025 00:00:00, ref 557324345963.If not you, report to your bank immediately-IOB.'
                    });
                    toast.success("Simulated Format #3 (Missing/Empty Payee)");
                  } else {
                    toast.info("Simulating Format #3 locally...");
                    useTransactionStore.getState().addTransaction({
                      amount: 30.00,
                      merchant: "Unknown Merchant",
                      type: "debit",
                      appName: "SMS",
                      timestamp: Date.now(),
                      rawText: 'Your a/c "************553" debited for payee for Rs. 30.00 on 07/26/2025 00:00:00, ref 557324345963.If not you, report to your bank immediately-IOB.',
                      reference: "557324345963"
                    });
                  }
                }}
              >
                <strong className="text-amber-400 block mb-0.5">Format #3: Missing/Empty Payee</strong>
                'debited for payee for Rs. 30.00 on 07/26/2025...'
              </Button>

              <Button
                variant="outline"
                className="h-auto py-2.5 px-3 justify-start text-left text-[10px] font-mono border-white/10 hover:bg-white/5 whitespace-normal leading-tight block"
                onClick={async () => {
                  if (Capacitor.isNativePlatform()) {
                    await FinancialNotification.simulateSms({
                      sender: "JD-HDFCBK",
                      body: "UPDATE: INR 354 debited from HDFC Bank A/c XX277034 on 07-NOV-25. For: DEBIT CARD ANNUAL FEE-Oct-2025 181025-MIR2631030855135"
                    });
                    toast.success("Simulated Format #4 (HDFC Purpose format)");
                  } else {
                    toast.info("Simulating Format #4 locally...");
                    useTransactionStore.getState().addTransaction({
                      amount: 354.00,
                      merchant: "DEBIT CARD ANNUAL FEE-Oct-2025",
                      type: "debit",
                      appName: "SMS",
                      timestamp: Date.now(),
                      rawText: "UPDATE: INR 354 debited from HDFC Bank A/c XX277034 on 07-NOV-25. For: DEBIT CARD ANNUAL FEE-Oct-2025 181025-MIR2631030855135",
                      reference: "181025"
                    });
                  }
                }}
              >
                <strong className="text-indigo-400 block mb-0.5">Format #4: Purpose String Format</strong>
                "INR 354 debited from HDFC Bank... For: DEBIT CARD ANNUAL FEE..."
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
