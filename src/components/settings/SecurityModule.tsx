import { Shield, Moon, Sun, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { AppSettings } from '@/types/expense';
import { biometrics } from '@/lib/biometrics';
import { SubModuleHeader } from './Common';

interface SecurityModuleProps {
  settings: AppSettings;
  theme: 'dark' | 'light';
  bioAvailable: boolean;
  onThemeToggle: () => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
}

export function SecurityModule({
  settings,
  theme,
  bioAvailable,
  onThemeToggle,
  updateSettings,
  onBack
}: SecurityModuleProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Security & System" onBack={onBack} />
      
      <div className="space-y-4">
        {bioAvailable && (
          <div className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold">Biometric Lock</p>
                <p className="text-[10px] text-muted-foreground">Secure app with fingerprint/face ID</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!settings.biometricLock) {
                  const success = await biometrics.authenticate();
                  if (success) {
                    updateSettings({ biometricLock: true });
                    toast.success('Biometric lock enabled');
                  }
                } else {
                  updateSettings({ biometricLock: false });
                  toast.success('Biometric lock disabled');
                }
              }}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors duration-200 outline-none",
                settings.biometricLock ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <div className={cn(
                "absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-200 shadow-sm",
                settings.biometricLock ? "left-6" : "left-1"
              )} />
            </button>
          </div>
        )}

        <div className="flex items-center justify-between p-5 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="h-5 w-5 text-indigo-400" /> : <Sun className="h-5 w-5 text-indigo-600" />}
            </div>
            <div>
              <p className="text-sm font-bold">App Theme</p>
              <p className="text-[10px] text-muted-foreground">Toggle between light and dark</p>
            </div>
          </div>
          <button
            onClick={onThemeToggle}
            className={cn(
              "relative h-8 w-16 rounded-full border-2 transition-all duration-300",
              theme === 'dark' ? "border-primary bg-primary/20" : "border-warning bg-warning/20"
            )}
          >
            <div className={cn(
              "absolute top-0.5 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm",
              theme === 'dark' ? "left-0.5 bg-primary" : "left-8 bg-warning"
            )}>
              {theme === 'dark' ? <Moon className="h-3.5 w-3.5 text-white" /> : <Sun className="h-3.5 w-3.5 text-white" />}
            </div>
          </button>
        </div>

        <div className="p-6 rounded-[2.5rem] bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-6 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold">Premium Customization</p>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Accent & Glassmorphism</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Accent Color</p>
              <div className="grid grid-cols-7 gap-2">
                {[
                  '#3b82f6', '#f97316', '#a855f7', '#10b981', '#f43f5e', '#8b5cf6', '#0ea5e9'
                ].map(c => (
                  <button
                    key={c}
                    onClick={() => updateSettings({ accentColor: c })}
                    className={cn(
                      "h-8 w-full rounded-full border-2 transition-all",
                      settings.accentColor === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Glass Intensity</p>
                <p className="text-[10px] font-bold text-primary">{(settings.glassIntensity || 0.6) * 100}%</p>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.glassIntensity || 0.6}
                onChange={e => updateSettings({ glassIntensity: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
