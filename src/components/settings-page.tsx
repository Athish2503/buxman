import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Building, Zap, Phone, Plus, Trash2, Target, 
  Moon, Sun, Lock, Settings, Bell, Database, ShieldAlert, 
  ChevronRight, Fuel, Receipt, Camera, RotateCcw, Shield, Eye, EyeOff,
  ChevronLeft, LayoutGrid, Check, X, Edit3, Palette, MoreHorizontal, Car
} from 'lucide-react';
import { biometrics } from '@/lib/biometrics';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { AppSettings, BudgetGoal, ExpenseCategory } from '@/types/expense';
import { settingsService } from '@/lib/settings';
import { categoryService, CategoryDefinition, iconMap } from '@/lib/category-service';
import { formatCurrency, cn } from '@/lib/utils';

import { createPortal } from 'react-dom';

type SettingsTab = 'overview' | 'organization' | 'smart' | 'security' | 'categories' | 'budgets' | 'data';

interface SettingsPageProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

const SubModuleHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="flex items-center gap-4 mb-6">
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={onBack}
      className="h-10 w-10 rounded-full bg-muted/30 hover:bg-muted/50"
    >
      <ChevronLeft className="h-5 w-5" />
    </Button>
    <div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-xs text-muted-foreground">Configure your preferences</p>
    </div>
  </div>
);

const ModuleCard = ({ icon: Icon, title, description, onClick, color = 'bg-primary' }: { 
  icon: React.ElementType; title: string; description: string; onClick: () => void; color?: string;
}) => (
  <button 
    onClick={onClick}
    className="w-full flex items-center gap-4 p-4 rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md hover:border-primary/40 hover:bg-muted/10 transition-all text-left group"
  >
    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform", color)}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="font-bold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground truncate">{description}</p>
    </div>
    <ChevronRight className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary transition-colors" />
  </button>
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [settings, setSettings] = useState<AppSettings>(settingsService.get());
  const [categories, setCategories] = useState<CategoryDefinition[]>(categoryService.getAll());
  const [newBudget, setNewBudget] = useState<Partial<BudgetGoal>>({ period: 'monthly' });
  const [bioAvailable, setBioAvailable] = useState(false);

  // Category Editor State
  const [editingCategory, setEditingCategory] = useState<CategoryDefinition | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const [permissionsStatus, setPermissionsStatus] = useState({
    sms: false,
    notifications: false,
    overlay: false
  });

  useEffect(() => {
    biometrics.isAvailable().then(setBioAvailable);
    
    const handleUpdate = () => setCategories(categoryService.getAll());
    window.addEventListener('categories-updated', handleUpdate);

    // Poll for permission status when on Smart tab
    let interval: any;
    if (activeTab === 'smart') {
      const check = async () => {
        const { permissions } = await import('@/lib/permissions');
        const sms = await permissions.checkSMSStatus();
        const notifications = await permissions.checkNotificationStatus();
        const overlay = await permissions.checkOverlayStatus();
        setPermissionsStatus({ sms, notifications, overlay });
      };
      check();
      interval = setInterval(check, 2000);
    }

    return () => {
      window.removeEventListener('categories-updated', handleUpdate);
      if (interval) clearInterval(interval);
    };
  }, [activeTab]);

  const updateSettings = (updates: Partial<AppSettings>) => {
    const updated = { ...settings, ...updates };
    setSettings(updated);
    settingsService.save(updated);
  };

  const handleSaveCategory = (cat: CategoryDefinition) => {
    if (isAddingCategory) {
      categoryService.add(cat);
    } else {
      categoryService.update(cat.id, cat);
    }
    setEditingCategory(null);
    setIsAddingCategory(false);
    toast.success('Category saved');
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 gap-3 px-1">
      <ModuleCard 
        icon={Building} title="Organization" description="Company & personal billing details" 
        onClick={() => setActiveTab('organization')} color="bg-blue-500"
      />
      <ModuleCard 
        icon={Zap} title="Smart Features" description="Auto-detection & notification tools" 
        onClick={() => setActiveTab('smart')} color="bg-amber-500"
      />
      <ModuleCard 
        icon={LayoutGrid} title="Categories" description="Manage expense types, icons & visibility" 
        onClick={() => setActiveTab('categories')} color="bg-purple-500"
      />
      <ModuleCard 
        icon={Target} title="Budgeting" description="Set spending limits & goals" 
        onClick={() => setActiveTab('budgets')} color="bg-emerald-500"
      />
      <ModuleCard 
        icon={Lock} title="Security & System" description="Biometrics, appearance & settings" 
        onClick={() => setActiveTab('security')} color="bg-indigo-500"
      />
      <ModuleCard 
        icon={Database} title="Data Management" description="Backup, restore & erase application data" 
        onClick={() => setActiveTab('data')} color="bg-rose-500"
      />
    </div>
  );

  const renderOrganization = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Organization Details" onBack={() => setActiveTab('overview')} />
      
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-card/30 border border-border/40 space-y-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-primary">Billed To (Company)</p>
          <Field
            id="bt-name" label="Company Name"
            value={settings.billedTo.name}
            onChange={v => updateSettings({ billedTo: { ...settings.billedTo, name: v } })}
            placeholder="Google Cloud"
          />
          <Field
            id="bt-line2" label="Department"
            value={settings.billedTo.line2}
            onChange={v => updateSettings({ billedTo: { ...settings.billedTo, line2: v } })}
            placeholder="Accounts Dept."
          />
          <Field
            id="bt-address" label="Address"
            value={settings.billedTo.address || ''}
            onChange={v => updateSettings({ billedTo: { ...settings.billedTo, address: v } })}
            placeholder="1600 Amphitheatre Pkwy"
          />
        </div>

        <div className="p-6 rounded-3xl bg-card/30 border border-border/40 space-y-4">
          <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400">From (Employee)</p>
          <Field
            id="bf-name" label="Your Name"
            value={settings.billedFrom.name}
            onChange={v => updateSettings({ billedFrom: { ...settings.billedFrom, name: v } })}
            placeholder="John Doe"
          />
          <Field
            id="bf-line2" label="Designation"
            value={settings.billedFrom.line2}
            onChange={v => updateSettings({ billedFrom: { ...settings.billedFrom, line2: v } })}
            placeholder="Software Engineer"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              id="bf-email" label="Email" type="email"
              value={settings.billedFrom.email}
              onChange={v => updateSettings({ billedFrom: { ...settings.billedFrom, email: v } })}
              placeholder="john@work.com"
            />
            <Field
              id="bf-phone" label="Phone" type="tel"
              value={settings.billedFrom.phone || ''}
              onChange={v => updateSettings({ billedFrom: { ...settings.billedFrom, phone: v } })}
              placeholder="+91 98765 43210"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSmartFeatures = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Smart Features" onBack={() => setActiveTab('overview')} />
      
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

        <Button 
          variant="ghost" 
          className="w-full justify-center gap-3 h-12 rounded-2xl border-dashed border-border/60 text-muted-foreground hover:bg-muted/50 transition-all mt-4"
          onClick={() => {
            const event = new CustomEvent('simulate-sms', { 
              detail: { body: "HDFC Bank: Rs. 1,250.00 spent at STARBUCKS on 01-MAY-26. Info: POS" } 
            });
            window.dispatchEvent(event);
            toast.info('Simulating bank notification...');
          }}
        >
          <RotateCcw className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Test Detection Simulation</span>
        </Button>
      </div>
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Category Management" onBack={() => setActiveTab('overview')} />
      
      <div className="flex flex-col gap-3">
        <Button 
          onClick={() => {
            setIsAddingCategory(true);
            setEditingCategory({
              id: `custom_${Date.now()}`,
              label: '',
              iconName: 'MoreHorizontal',
              color: 'text-slate-400',
              bgColor: 'bg-slate-500/15',
              gradientFrom: '#94a3b8',
              gradientTo: '#64748b',
              description: '',
              isVisible: true,
              isSystem: false
            });
          }}
          className="w-full h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 gap-2 mb-2"
        >
          <Plus className="h-4 w-4" /> Add Custom Category
        </Button>

        <div className="grid grid-cols-1 gap-2">
          {categories.map(cat => {
            const Icon = iconMap[cat.iconName] || MoreHorizontal;
            return (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card/30 border border-border/40 group hover:border-primary/40 transition-all">
                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", cat.bgColor)}>
                  <Icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{cat.label}</p>
                    {cat.isSystem && <span className="text-[8px] font-black bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-tighter">System</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{cat.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl hover:bg-primary/10 text-primary"
                    onClick={() => setEditingCategory(cat)}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9 rounded-xl transition-colors",
                      cat.isVisible ? "text-emerald-500 hover:bg-emerald-500/10" : "text-muted-foreground hover:bg-muted/20"
                    )}
                    onClick={() => categoryService.update(cat.id, { isVisible: !cat.isVisible })}
                  >
                    {cat.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  {!cat.isSystem && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        toast.warning('Delete this category?', {
                          description: 'Expenses using it will still work but you cannot select it anymore.',
                          action: {
                            label: 'Delete',
                            onClick: () => categoryService.delete(cat.id)
                          }
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );


  const renderSecurity = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Security & System" onBack={() => setActiveTab('overview')} />
      
      <div className="space-y-4">
        {bioAvailable && (
          <div className="flex items-center justify-between p-5 rounded-3xl bg-card/30 border border-border/40">
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

        <div className="flex items-center justify-between p-5 rounded-3xl bg-card/30 border border-border/40">
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
      </div>
    </div>
  );

  const renderBudgets = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Budget Controls" onBack={() => setActiveTab('overview')} />
      
      <div className="space-y-6">
        <div className="p-5 rounded-3xl bg-card/30 border border-border/40 space-y-4">
           <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">New Spending Goal</p>
           <div className="grid grid-cols-1 gap-3">
              <Select value={newBudget.category} onValueChange={v => setNewBudget(p => ({ ...p, category: v as ExpenseCategory }))}>
                <SelectTrigger className="bg-muted/50 border-border/60 h-12 rounded-2xl text-sm">
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {categories.filter(c => c.isVisible).map(c => {
                    const Icon = iconMap[c.iconName] || MoreHorizontal;
                    return (
                      <SelectItem key={c.id} value={c.id} className="rounded-xl">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-4 w-4", c.color)} />
                          {c.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                  <Input
                    type="number"
                    value={newBudget.limit || ''}
                    onChange={e => setNewBudget(p => ({ ...p, limit: Number(e.target.value) }))}
                    placeholder="Limit"
                    className="pl-8 bg-muted/50 border-border/60 h-12 rounded-2xl text-sm font-bold"
                  />
                </div>
                <Select value={newBudget.period} onValueChange={v => setNewBudget(p => ({ ...p, period: v as BudgetGoal['period'] }))}>
                  <SelectTrigger className="bg-muted/50 border-border/60 h-12 rounded-2xl text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  if (!newBudget.category || !newBudget.limit) return;
                  const budget: BudgetGoal = {
                    category: newBudget.category,
                    limit: Number(newBudget.limit),
                    period: newBudget.period as BudgetGoal['period'] || 'monthly',
                  };
                  const updatedBudgets = [...(settings.budgets || []).filter(b => b.category !== budget.category), budget];
                  updateSettings({ budgets: updatedBudgets });
                  setNewBudget({ period: 'monthly' });
                  toast.success(`Budget goal set!`);
                }}
                disabled={!newBudget.category || !newBudget.limit}
                className="h-12 text-sm w-full gap-2 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" /> Add Goal
              </Button>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {settings.budgets.map(b => {
            const cat = categoryService.getById(b.category);
            const Icon = iconMap[cat.iconName] || MoreHorizontal;
            return (
              <div key={b.category} className="flex items-center gap-3 p-4 rounded-3xl bg-card/30 border border-border/40">
                <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", cat.bgColor)}>
                  <Icon className={cn("h-5 w-5", cat.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{cat.label}</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">{formatCurrency(b.limit)} / {b.period}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl"
                  onClick={() => {
                    updateSettings({ budgets: settings.budgets.filter(x => x.category !== b.category) });
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderDataManagement = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Data Management" onBack={() => setActiveTab('overview')} />
      
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex items-start gap-3">
          <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-amber-500">Local-Only Storage</h4>
            <p className="text-[11px] text-amber-200/70 leading-relaxed mt-1">
              Your data never leaves this device. This means erasing it is permanent. 
              Always backup (export) your data before doing a reset.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
           <div className="p-5 rounded-3xl bg-card/30 border border-border/40 space-y-4">
             <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                 <Database className="h-5 w-5 text-primary" />
               </div>
               <div>
                 <h4 className="text-sm font-bold">Migration Hub</h4>
                 <p className="text-[10px] text-muted-foreground">Backup & restore your full ecosystem</p>
               </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
               <Button 
                 variant="outline" 
                 className="h-14 rounded-2xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary gap-2 font-bold transition-all"
                 onClick={() => {
                   import('@/lib/data-migration').then(m => m.dataMigrationService.downloadBackup());
                   toast.success('Generating secure backup...', { description: 'Save this file to a safe location.' });
                 }}
               >
                 <ChevronRight className="h-4 w-4 rotate-90" />
                 Export All
               </Button>

               <label className="relative cursor-pointer">
                 <input 
                   type="file" 
                   accept=".json"
                   className="sr-only"
                   onChange={async (e) => {
                     const file = e.target.files?.[0];
                     if (!file) return;
                     
                     const reader = new FileReader();
                     reader.onload = async (event) => {
                       const content = event.target?.result as string;
                       const m = await import('@/lib/data-migration');
                       const success = await m.dataMigrationService.importData(content);
                       if (success) {
                         toast.success('System Restored!', { 
                           description: 'Your data has been imported. The app will now reload.',
                           duration: 2000
                         });
                         setTimeout(() => window.location.reload(), 2000);
                       } else {
                         toast.error('Restore Failed', { description: 'The backup file is invalid or corrupted.' });
                       }
                     };
                     reader.readAsText(file);
                   }}
                 />
                 <div className="h-14 rounded-2xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/50 flex items-center justify-center gap-2 text-sm font-bold text-muted-foreground transition-all">
                   <ChevronRight className="h-4 w-4 -rotate-90" />
                   Import Data
                 </div>
               </label>
             </div>
           </div>

           {[
             { label: 'Clean Expenses', icon: Receipt, type: 'expenses' },
             { label: 'Wipe Fuel Logs', icon: Fuel, type: 'fuel' },
             { label: 'Clear Wallet', icon: Camera, type: 'wallet' },
             { label: 'Delete Vehicles', icon: Car, type: 'mileage' }
           ].map(item => (
              <Button 
                key={item.type}
                variant="outline" 
                className="justify-between h-14 px-5 rounded-3xl border-destructive/10 bg-destructive/5 hover:bg-destructive/10 text-destructive group transition-all"
                onClick={() => {
                  toast.error(`Erase all ${item.type}?`, {
                    description: 'This action is permanent and cannot be undone.',
                    action: {
                      label: 'Erase Data',
                      onClick: () => {
                        const keys: Record<string, string[]> = {
                          expenses: ['reimburse_expenses_v2'],
                          fuel: ['reimburse_fuel_v1'],
                          wallet: ['reimburse_wallet_v1'],
                          mileage: ['reimburse_mileage_v1', 'reimburse_vehicles_v1']
                        };
                        keys[item.type].forEach(k => localStorage.removeItem(k));
                        toast.success(`${item.label} cleared`);
                      }
                    }
                  });
                }}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-bold">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 opacity-30 group-hover:opacity-100" />
              </Button>
           ))}

           <Button 
              variant="destructive" 
              className="h-16 mt-4 shadow-xl shadow-destructive/20 font-black text-sm uppercase tracking-widest gap-3 rounded-3xl"
              onClick={() => {
                toast.error('FACTORY RESET?', {
                  description: 'This will delete EVERYTHING and restart the app. Are you sure?',
                  action: {
                    label: 'RESET APP',
                    onClick: () => {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }
                });
              }}
            >
              <RotateCcw className="h-5 w-5" />
              Factory Reset App
            </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto pb-24 px-1">
      {/* Dynamic Header */}
      <div className="flex flex-col gap-1 mb-8 px-2">
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h2>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em]">Preferences & Infrastructure</p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'organization' && renderOrganization()}
          {activeTab === 'smart' && renderSmartFeatures()}
          {activeTab === 'categories' && renderCategories()}
          {activeTab === 'budgets' && renderBudgets()}
          {activeTab === 'security' && renderSecurity()}
          {activeTab === 'data' && renderDataManagement()}
        </motion.div>
      </AnimatePresence>

      {/* Global Persistence Reminder */}
      {activeTab !== 'overview' && (
        <div className="mt-12 text-center p-6 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-4">Auto-saving active</p>
          <Button 
            variant="ghost" 
            onClick={() => setActiveTab('overview')}
            className="rounded-full gap-2 text-xs font-bold"
          >
            <ChevronLeft className="h-4 w-4" /> Return to Settings Overview
          </Button>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {editingCategory && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="w-full max-w-md bg-card border border-border shadow-2xl rounded-3xl overflow-y-auto max-h-[90vh] custom-scrollbar"
              >
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold">{isAddingCategory ? 'New Category' : 'Edit Category'}</h4>
                    <Button variant="ghost" size="icon" onClick={() => setEditingCategory(null)} className="rounded-full">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Field 
                      id="cat-label" label="Label" value={editingCategory.label} 
                      onChange={v => setEditingCategory({ ...editingCategory, label: v })} 
                      placeholder="e.g. Subscriptions"
                    />
                    <Field 
                      id="cat-desc" label="Description" value={editingCategory.description} 
                      onChange={v => setEditingCategory({ ...editingCategory, description: v })} 
                      placeholder="Short summary"
                    />

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Icon Selection</Label>
                      <div className="grid grid-cols-5 gap-2 p-3 bg-muted/20 rounded-2xl border border-border/40 max-h-60 overflow-y-auto custom-scrollbar">
                        {Object.keys(iconMap).map(name => {
                          const Icon = iconMap[name];
                          return (
                            <button
                              key={name}
                              type="button"
                              onClick={() => setEditingCategory({ ...editingCategory, iconName: name })}
                              className={cn(
                                "h-12 w-full rounded-xl flex items-center justify-center transition-all",
                                editingCategory.iconName === name ? "bg-primary text-white shadow-lg scale-110" : "hover:bg-muted text-muted-foreground"
                              )}
                            >
                              <Icon className="h-6 w-6" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Aesthetic Palette</Label>
                      </div>

                      <div 
                        className="relative p-4 rounded-3xl border border-white/10 overflow-hidden group transition-all"
                        style={{ background: `linear-gradient(135deg, ${editingCategory.gradientFrom}20, ${editingCategory.gradientTo}10)` }}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-xl shrink-0 transition-transform group-hover:scale-105", editingCategory.bgColor)}
                            style={editingCategory.bgColor === 'bg-muted/20' ? { backgroundColor: `${editingCategory.gradientFrom}30` } : {}}
                          >
                            {(() => {
                              const PreviewIcon = iconMap[editingCategory.iconName] || MoreHorizontal;
                              return <PreviewIcon 
                                className={cn("h-7 w-7", editingCategory.color)} 
                                style={editingCategory.color === 'text-white' ? { color: editingCategory.gradientFrom } : {}}
                              />;
                            })()}
                          </div>
                          <div className="flex-1">
                             <p className="text-xs font-bold mb-1">Aesthetic Preview</p>
                             <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer border border-white/5">
                               <Palette className="h-3.5 w-3.5" />
                               <span className="text-[10px] font-black uppercase tracking-wider">Custom Color</span>
                               <input 
                                  type="color" 
                                  value={editingCategory.gradientFrom}
                                  onChange={(e) => setEditingCategory({ 
                                    ...editingCategory, 
                                    gradientFrom: e.target.value,
                                    gradientTo: e.target.value,
                                    color: 'text-white',
                                    bgColor: 'bg-muted/20'
                                  })}
                                  className="sr-only"
                                />
                             </label>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-2 p-1">
                        {[
                          { from: '#3b82f6', to: '#6366f1', text: 'text-blue-400', bg: 'bg-blue-500/15' },
                          { from: '#f97316', to: '#f59e0b', text: 'text-orange-400', bg: 'bg-orange-500/15' },
                          { from: '#a855f7', to: '#8b5cf6', text: 'text-purple-400', bg: 'bg-purple-500/15' },
                          { from: '#10b981', to: '#06b6d4', text: 'text-emerald-400', bg: 'bg-emerald-500/15' },
                          { from: '#f43f5e', to: '#fb7185', text: 'text-rose-400', bg: 'bg-rose-500/15' },
                          { from: '#8b5cf6', to: '#d946ef', text: 'text-violet-400', bg: 'bg-violet-500/15' },
                          { from: '#0ea5e9', to: '#38bdf8', text: 'text-sky-400', bg: 'bg-sky-500/15' },
                          { from: '#14b8a6', to: '#0d9488', text: 'text-teal-400', bg: 'bg-teal-500/15' },
                          { from: '#facc15', to: '#ca8a04', text: 'text-yellow-400', bg: 'bg-yellow-500/15' },
                          { from: '#4ade80', to: '#16a34a', text: 'text-green-400', bg: 'bg-green-500/15' },
                          { from: '#2dd4bf', to: '#0f766e', text: 'text-teal-400', bg: 'bg-teal-500/15' },
                          { from: '#94a3b8', to: '#475569', text: 'text-slate-400', bg: 'bg-slate-500/15' },
                          { from: '#e879f9', to: '#d946ef', text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/15' },
                          { from: '#fbbf24', to: '#d97706', text: 'text-amber-400', bg: 'bg-amber-500/15' },
                        ].map((style, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditingCategory({ 
                              ...editingCategory, 
                              gradientFrom: style.from, 
                              gradientTo: style.to, 
                              color: style.text, 
                              bgColor: style.bg 
                            })}
                            className={cn(
                              "h-9 w-full rounded-xl border-2 transition-all",
                              editingCategory.gradientFrom === style.from ? "border-white scale-110 shadow-lg" : "border-transparent"
                            )}
                            style={{ background: `linear-gradient(135deg, ${style.from}, ${style.to})` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setEditingCategory(null)} className="flex-1 h-12 rounded-2xl">Cancel</Button>
                      <Button onClick={() => handleSaveCategory(editingCategory)} className="flex-1 h-12 rounded-2xl bg-gradient-primary text-white">Save Category</Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
