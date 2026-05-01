import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { User, Building, Mail, Phone, MapPin, Plus, Trash2, Target, Moon, Sun, Palette, Lock, Settings, Bell } from 'lucide-react';
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
  <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/40 bg-muted/20">
      <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-white" />
      </div>
      <h3 className="font-semibold text-sm">{title}</h3>
    </div>
    <div className="p-4 space-y-3">{children}</div>
  </div>
);

const Field = ({ id, label, value, onChange, placeholder, type = 'text' }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</Label>
    <Input
      id={id}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-muted/50 border-border/60 h-9 text-sm"
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

  return (
    <div className="space-y-5 pb-24 sm:pb-8">
      {/* System Settings */}
      <Section icon={Settings} title="System">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 h-11 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5"
          onClick={() => {
            const event = new CustomEvent('simulate-sms', { 
              detail: { body: "HDFC Bank: Rs. 1,250.00 spent at STARBUCKS on 01-MAY-26. Info: POS" } 
            });
            window.dispatchEvent(event);
            toast.info('Simulated bank SMS received');
          }}
        >
          <Bell className="h-4 w-4" />
          Simulate Transaction SMS
        </Button>
      </Section>

      {/* Appearance */}
      <Section icon={Palette} title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred look</p>
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

      {/* Invoice — Billed To */}
      <Section icon={Building} title="Billed To (Company)">
        <Field
          id="bt-name" label="Company / Recipient"
          value={settings.billedTo.name}
          onChange={v => update('billedTo', 'name', v)}
          placeholder="Company Name"
        />
        <Field
          id="bt-line2" label="Department / Address"
          value={settings.billedTo.line2}
          onChange={v => update('billedTo', 'line2', v)}
          placeholder="Accounts Payable Dept."
        />
        <Field
          id="bt-address" label="Full Address (optional)"
          value={settings.billedTo.address || ''}
          onChange={v => update('billedTo', 'address', v)}
          placeholder="123 Business Ave, City"
        />
      </Section>

      {/* Invoice — From */}
      <Section icon={User} title="From (Your Info)">
        <Field
          id="bf-name" label="Your Name"
          value={settings.billedFrom.name}
          onChange={v => update('billedFrom', 'name', v)}
          placeholder="Employee Name"
        />
        <Field
          id="bf-line2" label="Title / Role"
          value={settings.billedFrom.line2}
          onChange={v => update('billedFrom', 'line2', v)}
          placeholder="Senior Engineer"
        />
        <Field
          id="bf-email" label="Email" type="email"
          value={settings.billedFrom.email}
          onChange={v => update('billedFrom', 'email', v)}
          placeholder="you@example.com"
        />
        <Field
          id="bf-phone" label="Phone (optional)"
          value={settings.billedFrom.phone || ''}
          onChange={v => update('billedFrom', 'phone', v)}
          placeholder="+91 98765 43210"
        />
      </Section>

      {/* Budget Goals */}
      <Section icon={Target} title="Budget Goals">
        {/* Existing budgets */}
        {(settings.budgets || []).length > 0 && (
          <div className="space-y-2 mb-3">
            {(settings.budgets || []).map(b => {
              const cfg = categoryConfig[b.category];
              const Icon = cfg.icon;
              return (
                <div key={b.category} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0", cfg.bgColor)}>
                    <Icon className={cn("h-3.5 w-3.5", cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(b.limit)} / {b.period}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => removeBudget(b.category)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new budget */}
        <div className="space-y-2 pt-2 border-t border-border/40">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Budget</p>
          <div className="grid grid-cols-1 gap-2">
            <Select value={newBudget.category} onValueChange={v => setNewBudget(p => ({ ...p, category: v as ExpenseCategory }))}>
              <SelectTrigger className="bg-muted/50 border-border/60 h-9 text-sm">
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryConfig).map(([k, c]) => (
                  <SelectItem key={k} value={k}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                <Input
                  type="number"
                  value={newBudget.limit || ''}
                  onChange={e => setNewBudget(p => ({ ...p, limit: Number(e.target.value) }))}
                  placeholder="0"
                  className="pl-6 bg-muted/50 border-border/60 h-9 text-sm"
                />
              </div>
              <Select value={newBudget.period} onValueChange={v => setNewBudget(p => ({ ...p, period: v as BudgetGoal['period'] }))}>
                <SelectTrigger className="bg-muted/50 border-border/60 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={addBudget}
              disabled={!newBudget.category || !newBudget.limit}
              variant="outline"
              className="h-9 text-sm w-full gap-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add Budget Goal
            </Button>
          </div>
        </div>
      </Section>

      {/* Save button */}
      <Button
        onClick={handleSave}
        className={cn(
          "w-full h-12 text-base font-semibold transition-all",
          saved
            ? "bg-success/20 text-success border border-success/30"
            : "bg-gradient-primary text-white shadow-glow hover:opacity-90"
        )}
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </Button>
    </div>
  );
}
