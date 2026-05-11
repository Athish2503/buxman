import { Bell, Phone, Zap, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SubModuleHeader } from './Common';

interface SmartFeaturesModuleProps {
  permissionsStatus: {
    sms: boolean;
    notifications: boolean;
    overlay: boolean;
  };
  onBack: () => void;
}

export function SmartFeaturesModule({ permissionsStatus, onBack }: SmartFeaturesModuleProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Smart Features" onBack={onBack} />
      
      <div className="space-y-4">
        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", permissionsStatus.notifications ? "bg-emerald-500/5 border-emerald-500/20" : "bg-primary/5 border-primary/20")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", permissionsStatus.notifications ? "bg-emerald-500/20" : "bg-primary/20")}>
                <Bell className={cn("h-5 w-5", permissionsStatus.notifications ? "text-emerald-500" : "text-primary")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">App Monitoring</h4>
                <p className="text-xs text-muted-foreground">Detect expenses from bank notifications</p>
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
              toast.info('Requesting notification access...');
            }}
          >
            {permissionsStatus.notifications ? 'Monitoring Active' : 'Enable App Monitoring'}
          </Button>
        </div>

        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", permissionsStatus.sms ? "bg-emerald-500/5 border-emerald-500/20" : "bg-indigo-500/5 border-indigo-500/20")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", permissionsStatus.sms ? "bg-emerald-500/20" : "bg-indigo-500/20")}>
                <Phone className={cn("h-5 w-5", permissionsStatus.sms ? "text-emerald-500" : "text-indigo-500")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">SMS Monitoring</h4>
                <p className="text-xs text-muted-foreground">Detect expenses from bank SMS messages</p>
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
              toast.info('Requesting SMS permission...');
            }}
          >
            {permissionsStatus.sms ? 'SMS Detection Active' : 'Enable SMS Detection'}
          </Button>
        </div>

        <div className={cn("p-5 rounded-3xl border transition-all space-y-4", permissionsStatus.overlay ? "bg-emerald-500/5 border-emerald-500/20" : "bg-warning/5 border-warning/20")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center", permissionsStatus.overlay ? "bg-emerald-500/20" : "bg-warning/20")}>
                <Zap className={cn("h-5 w-5", permissionsStatus.overlay ? "text-emerald-500" : "text-warning")} />
              </div>
              <div>
                <h4 className="text-sm font-bold">Overlay Detection</h4>
                <p className="text-xs text-muted-foreground">Show transaction popups over other apps</p>
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
              toast.info('Opening system overlay settings...');
            }}
          >
            {permissionsStatus.overlay ? 'Overlay Permission Granted' : 'Grant Overlay Permission'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 mt-4">
          <Button 
            variant="ghost" 
            className="w-full justify-center gap-3 h-12 rounded-2xl border-dashed border-border/60 text-muted-foreground hover:bg-muted/50 transition-all"
            onClick={async () => {
              const { Capacitor } = await import('@capacitor/core');
              if (Capacitor.isNativePlatform()) {
                const FinancialNotification = (await import('@/lib/financial-notifications')).default;
                await FinancialNotification.simulateTransaction({ 
                  amount: 1250, 
                  merchant: "STARBUCKS", 
                  appName: "GPay" 
                });
                toast.info('Native simulation triggered');
              } else {
                const event = new CustomEvent('simulate-sms', { 
                  detail: { body: "HDFC Bank: Rs. 1,250.00 spent at STARBUCKS on 01-MAY-26. Info: POS" } 
                });
                window.dispatchEvent(event);
                toast.info('Web simulation triggered');
              }
            }}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Test Detection Simulation</span>
          </Button>

          <Button 
            variant="ghost" 
            className="w-full justify-center gap-3 h-12 rounded-2xl border-dashed border-border/60 text-emerald-500/80 hover:bg-emerald-500/5 transition-all"
            onClick={async () => {
              const { notificationService } = await import('@/lib/notifications');
              await notificationService.testNotification();
              toast.success('Android notification scheduled (2s delay)');
            }}
          >
            <Bell className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Test Actual Android Notification</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
