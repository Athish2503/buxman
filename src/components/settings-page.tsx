import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { 
  User, Building, Zap, Mail, Phone, MapPin, Plus, Trash2, Target, 
  Moon, Sun, Palette, Lock, Settings, Bell, Database, ShieldAlert, 
  ChevronRight, Fuel, Receipt, Camera, RotateCcw, Shield
} from 'lucide-react';
import { useEffect } from 'react';
import { biometrics } from '@/lib/biometrics';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { AppSettings, BudgetGoal, ExpenseCategory } from '@/types/expense';
import { settingsService } from '@/lib/settings';
import { categoryConfig } from '@/lib/categories';
import { formatCurrency, cn } from '@/lib/utils';

interface SettingsPageProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const Section = ({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) => (
  <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md overflow-hidden transition-all hover:border-border/60 group">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-border/20 bg-muted/10 group-hover:bg-muted/20 transition-colors">
      <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
        <Icon className="h-4 w-4 text-white" />
      </div>
      <h3 className="font-bold text-sm tracking-tight">{title}</h3>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const Field = ({ id, label, value, onChange, placeholder, type = 'text' }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <div className="space-y-2">
    <Label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70 ml-1">{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-muted/30 border-border/40 h-11 rounded-xl text-sm focus:bg-muted/50 focus:border-primary/40 transition-all placeholder:text-muted-foreground/30"
    />
  </div>
);

export function SettingsPage({ theme, onThemeToggle }: SettingsPageProps) {
  const [settings, setSettings] = useState<AppSettings>(settingsService.get());
  const [newBudget, setNewBudget] = useState<Partial<BudgetGoal>>({ period: 'monthly' });
  const [saved, setSaved] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    biometrics.isAvailable().then(setBioAvailable);
  }, []);

  const toggleBio = async () => {
    if (!settings.biometricLock) {
      const success = await biometrics.authenticate();
      if (success) {
        const updated = { ...settings, biometricLock: true };
        setSettings(updated);
        settingsService.save(updated);
        toast.success('Biometric lock enabled');
      }
    } else {
      const updated = { ...settings, biometricLock: false };
      setSettings(updated);
      settingsService.save(updated);
      toast.success('Biometric lock disabled');
    }
  };

  const update = (path: 'billedTo' | 'billedFrom', key: string, value: string) => {
    setSettings(s => ({ ...s, [path]: { ...s[path], [key]: value } }));
  };

  const handleSave = () => {
    settingsService.save(settings);
    setSaved(true);
    toast.success('Settings saved successfully');
    setTimeout(() => setSaved(false), 2000);
  };

  const addBudget = () => {
    if (!newBudget.category || !newBudget.limit) return;
    const budget: BudgetGoal = {
      category: newBudget.category as ExpenseCategory,
      limit: Number(newBudget.limit),
      period: newBudget.period as BudgetGoal['period'] || 'monthly',
    };
    const updated = { ...settings, budgets: [...(settings.budgets || []).filter(b => b.category !== budget.category), budget] };
    setSettings(updated);
    settingsService.save(updated);
    setNewBudget({ period: 'monthly' });
    toast.success(`Budget set for ${categoryConfig[budget.category].label}`);
  };

  const removeBudget = (category: ExpenseCategory) => {
    const updated = { ...settings, budgets: (settings.budgets || []).filter(b => b.category !== category) };
    setSettings(updated);
    settingsService.save(updated);
  };

  const handleEraseData = (type: 'expenses' | 'fuel' | 'mileage' | 'wallet' | 'all') => {
    const confirmMessage = type === 'all' 
      ? "FACTORY RESET: This will delete EVERYTHING (expenses, logs, wallet, settings). Are you absolutely sure?" 
      : `Are you sure you want to permanently erase all ${type}? This cannot be undone.`;

    if (window.confirm(confirmMessage)) {
      if (type === 'expenses' || type === 'all') {
        localStorage.removeItem('reimburse_expenses_v2');
      }
      if (type === 'fuel' || type === 'all') {
        localStorage.removeItem('reimburse_fuel_v1');
      }
      if (type === 'mileage' || type === 'all') {
        localStorage.removeItem('reimburse_mileage_v1');
        localStorage.removeItem('reimburse_vehicles_v1');
      }
      if (type === 'wallet' || type === 'all') {
        localStorage.removeItem('reimburse_wallet_v1');
      }
      if (type === 'all') {
        localStorage.removeItem('reimburse_settings_v1');
        window.location.reload();
      } else {
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data cleared successfully`);
      }
    }
  };

  return (
    <div className="space-y-6 pb-24 sm:pb-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground font-medium italic">Configure your experience & data</p>
      </div>

      {/* System Settings */}
      <Section icon={Zap} title="Smart Features">
        <div className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-between gap-2 h-12 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-left"
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestNotificationListener());
              toast.info('Grant "Reimburse" access to read notifications to detect transactions automatically.');
            }}
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bell className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Transaction Monitor</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Detect expenses from bank SMS</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-primary/40" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-between gap-2 h-12 rounded-2xl border-warning/20 bg-warning/5 hover:bg-warning/10 transition-all text-left"
            onClick={() => {
              import('@/lib/permissions').then(m => m.permissions.requestOverlayPermission());
              toast.info('Enable "Display over other apps" to see transaction popups anywhere.');
            }}
          >
             <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Zap className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-semibold">Overlay Detection</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Show popups over other apps</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-warning/40" />
          </Button>

          <Button 
            variant="outline" 
            className="w-full justify-start gap-3 h-11 rounded-2xl border-dashed border-border/60 text-muted-foreground hover:bg-muted/50 transition-all"
            onClick={() => {
              const event = new CustomEvent('simulate-sms', { 
                detail: { body: "HDFC Bank: Rs. 1,250.00 spent at STARBUCKS on 01-MAY-26. Info: POS" } 
              });
              window.dispatchEvent(event);
              toast.info('Simulated bank notification received');
            }}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-xs font-semibold">Test Detection Simulation</span>
          </Button>
        </div>
      </Section>

      {/* Security */}
      {bioAvailable && (
        <Section icon={Lock} title="Security">
          <div className="flex items-center justify-between p-1">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">Biometric Lock</p>
                <p className="text-[10px] text-muted-foreground">Secure app with fingerprint or face ID</p>
              </div>
            </div>
            <button
              onClick={toggleBio}
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
        </Section>
      )}

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <div className="flex items-center justify-between p-1">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              {theme === 'dark' ? <Moon className="h-4 w-4 text-indigo-400" /> : <Sun className="h-4 w-4 text-indigo-600" />}
            </div>
            <div>
              <p className="text-sm font-semibold">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
              <p className="text-[10px] text-muted-foreground">Current system aesthetic</p>
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
              {theme === 'dark'
                ? <Moon className="h-3.5 w-3.5 text-white" />
                : <Sun className="h-3.5 w-3.5 text-white" />
              }
            </div>
          </button>
        </div>
      </Section>

      {/* Invoice Details */}
      <Section icon={Building} title="Organization">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-4">
             <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-2">Billed To (Company)</p>
             <Field
              id="bt-name" label="Company / Recipient"
              value={settings.billedTo.name}
              onChange={v => update('billedTo', 'name', v)}
              placeholder="Google Cloud"
            />
            <Field
              id="bt-line2" label="Department"
              value={settings.billedTo.line2}
              onChange={v => update('billedTo', 'line2', v)}
              placeholder="Accounts Dept."
            />
            <Field
              id="bt-address" label="Company Address"
              value={settings.billedTo.address || ''}
              onChange={v => update('billedTo', 'address', v)}
              placeholder="1600 Amphitheatre Pkwy"
            />
          </div>
          <div className="space-y-4">
             <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400/70 mb-2">From (Employee)</p>
             <Field
              id="bf-name" label="Your Full Name"
              value={settings.billedFrom.name}
              onChange={v => update('billedFrom', 'name', v)}
              placeholder="John Doe"
            />
            <Field
              id="bf-line2" label="Designation"
              value={settings.billedFrom.line2}
              onChange={v => update('billedFrom', 'line2', v)}
              placeholder="Software Engineer"
            />
            <Field
              id="bf-email" label="Work Email" type="email"
              value={settings.billedFrom.email}
              onChange={v => update('billedFrom', 'email', v)}
              placeholder="john@work.com"
            />
          </div>
        </div>
      </Section>

      {/* Budget Goals */}
      <Section icon={Target} title="Budget Controls">
        <div className="space-y-4">
          {/* Existing budgets */}
          {(settings.budgets || []).length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(settings.budgets || []).map(b => {
                const cfg = categoryConfig[b.category];
                if (!cfg) return null;
                const Icon = cfg.icon;
                return (
                  <div key={b.category} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border/40 group hover:border-primary/30 transition-all">
                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm", cfg.bgColor)}>
                      <Icon className={cn("h-4 w-4", cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{cfg.label}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{formatCurrency(b.limit)} / {b.period}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"
                      onClick={() => removeBudget(b.category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new budget */}
          <div className="pt-4 border-t border-border/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Set New Budget Goal</p>
            <div className="grid grid-cols-1 gap-3">
              <Select value={newBudget.category} onValueChange={v => setNewBudget(p => ({ ...p, category: v as ExpenseCategory }))}>
                <SelectTrigger className="bg-muted/50 border-border/60 h-10 rounded-xl text-sm">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(categoryConfig).map(([k, c]) => (
                    <SelectItem key={k} value={k} className="rounded-lg">
                      <div className="flex items-center gap-2">
                        <c.icon className={cn("h-3.5 w-3.5", c.color)} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                  <Input
                    type="number"
                    value={newBudget.limit || ''}
                    onChange={e => setNewBudget(p => ({ ...p, limit: Number(e.target.value) }))}
                    placeholder="Limit"
                    className="pl-7 bg-muted/50 border-border/60 h-10 rounded-xl text-sm font-bold"
                  />
                </div>
                <Select value={newBudget.period} onValueChange={v => setNewBudget(p => ({ ...p, period: v as BudgetGoal['period'] }))}>
                  <SelectTrigger className="bg-muted/50 border-border/60 h-10 rounded-xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={addBudget}
                disabled={!newBudget.category || !newBudget.limit}
                className="h-10 text-sm w-full gap-2 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" /> Add Goal
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Data Management */}
      <Section icon={Database} title="Data Management">
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-200/80 leading-relaxed font-medium">
              Data is stored only on this device. Erasing data is permanent and cannot be undone. 
              We recommend exporting your reports before performing a factory reset.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
             <Button 
                variant="outline" 
                className="justify-between h-12 px-4 rounded-2xl border-destructive/10 bg-destructive/5 hover:bg-destructive/10 text-destructive group transition-all"
                onClick={() => handleEraseData('expenses')}
              >
                <div className="flex items-center gap-3">
                  <Receipt className="h-4 w-4" />
                  <span className="text-sm font-semibold">Clean Expenses</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
              </Button>

              <Button 
                variant="outline" 
                className="justify-between h-12 px-4 rounded-2xl border-destructive/10 bg-destructive/5 hover:bg-destructive/10 text-destructive group transition-all"
                onClick={() => handleEraseData('fuel')}
              >
                <div className="flex items-center gap-3">
                  <Fuel className="h-4 w-4" />
                  <span className="text-sm font-semibold">Wipe Fuel Logs</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
              </Button>

              <Button 
                variant="outline" 
                className="justify-between h-12 px-4 rounded-2xl border-destructive/10 bg-destructive/5 hover:bg-destructive/10 text-destructive group transition-all"
                onClick={() => handleEraseData('wallet')}
              >
                <div className="flex items-center gap-3">
                  <Camera className="h-4 w-4" />
                  <span className="text-sm font-semibold">Clear Wallet</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-30 group-hover:opacity-100 transition-opacity" />
              </Button>

              <Button 
                variant="destructive" 
                className="h-12 shadow-lg shadow-destructive/20 font-bold gap-2 rounded-2xl"
                onClick={() => handleEraseData('all')}
              >
                <RotateCcw className="h-4 w-4" />
                Factory Reset App
              </Button>
          </div>
        </div>
      </Section>

      {/* Save button */}
      <Button
        onClick={handleSave}
        className={cn(
          "w-full h-14 text-lg font-black tracking-wide transition-all rounded-2xl",
          saved
            ? "bg-success/20 text-success border border-success/30 scale-95"
            : "bg-gradient-primary text-white shadow-glow hover:scale-[1.02] active:scale-[0.98]"
        )}
      >
        {saved ? '✓ CONFIGURATION SAVED' : 'COMMIT SETTINGS'}
      </Button>
    </div>
  );
}
