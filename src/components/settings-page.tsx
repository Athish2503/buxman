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
import { storageEngine } from '@/lib/storage-engine';
import { formatCurrency, cn } from '@/lib/utils';
import { MigrationManager } from '@/db/MigrationManager';
import { dataMigrationService } from '@/lib/data-migration';
import { dbService } from '@/db/DatabaseService';

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
    className="w-full flex items-center gap-4 p-4 rounded-3xl border border-border/40 bg-card/40 dark:bg-card/40 backdrop-blur-md hover:border-primary/40 hover:bg-muted/10 transition-all text-left group shadow-sm dark:shadow-none"
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

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showImportOptions, setShowImportOptions] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<'not_started' | 'completed' | 'failed'>('not_started');

  // Category Editor State
  const [editingCategory, setEditingCategory] = useState<CategoryDefinition | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState({
    sms: false,
    notifications: false,
    overlay: false
  });
  const [showConfirm, setShowConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
    variant: 'destructive' | 'warning' | 'info';
  } | null>(null);
  const [advDeleteType, setAdvDeleteType] = useState<string | null>(null);
  const [advDeleteDays, setAdvDeleteDays] = useState('30');
  const [advDeleteStart, setAdvDeleteStart] = useState('');
  const [advDeleteEnd, setAdvDeleteEnd] = useState('');

  useEffect(() => {
    biometrics.isAvailable().then(setBioAvailable);
    MigrationManager.getMigrationStatus().then(setMigrationStatus);
    
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
      
      <div className="mt-8 mb-4 text-center">
        <p className="text-[10px] font-black tracking-[0.3em] text-muted-foreground/30 uppercase">Buxman v1.1.0</p>
        <p className="text-[9px] text-muted-foreground/20 mt-1 uppercase tracking-tighter">Native Code Revision: 2</p>
      </div>
    </div>
  );

  const renderOrganization = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Organization Details" onBack={() => setActiveTab('overview')} />
      
      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-4 shadow-sm dark:shadow-none">
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

        <div className="p-6 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-4 shadow-sm dark:shadow-none">
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
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 group hover:border-primary/40 transition-all shadow-sm dark:shadow-none">
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
      </div>
    </div>
  );

  const renderBudgets = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Budget Controls" onBack={() => setActiveTab('overview')} />
      
      <div className="space-y-6">
        <div className="p-5 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-4 shadow-sm dark:shadow-none">
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
              <div key={b.category} className="flex items-center gap-3 p-4 rounded-3xl bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 shadow-sm dark:shadow-none">
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

  const executeAdvancedDelete = async (type: string) => {
    const sqliteActive = await dataMigrationService.isSqliteActive();
    
    if (sqliteActive) {
      let table = '';
      let dateField = 'timestamp';
      
      if (type === 'expenses') table = 'transactions';
      else if (type === 'fuel') table = 'fuel_logs';
      else if (type === 'mileage') table = 'mileage_logs';
      else if (type === 'wallet') {
        table = 'receipts';
        dateField = 'created_at';
      }
      
      if (table) {
        let query = `DELETE FROM ${table}`;
        let params: any[] = [];
        
        if (advDeleteDays && !advDeleteStart && !advDeleteEnd) {
          query += ` WHERE ${dateField} < datetime("now", ?)`;
          params = [`-${advDeleteDays} days`];
        } else if (advDeleteStart || advDeleteEnd) {
          const start = advDeleteStart || '0000-01-01';
          const end = advDeleteEnd || '9999-12-31';
          query += ` WHERE ${dateField} BETWEEN ? AND ?`;
          params = [start, end];
        }
        
        await dbService.run(query, params);
        toast.success(`SQLite ${type} records filtered and deleted`);
        setAdvDeleteType(null);
        setTimeout(() => window.location.reload(), 1000);
        return;
      }
    }

    const keys: Record<string, string> = {
      expenses: 'reimburse_expenses_v2',
      fuel: 'reimburse_fuel_v1',
      wallet: 'reimburse_wallet_v1',
      mileage: 'reimburse_mileage_v1'
    };
    
    const key = keys[type];
    if (!key) return;

    const raw = localStorage.getItem(key);
    if (!raw) return;

    try {
      let data = JSON.parse(raw);
      const now = new Date();
      
      const filtered = data.filter((item: any) => {
        const itemDate = new Date(item.date || item.createdAt);
        
        // Filter by days
        if (advDeleteDays && !advDeleteStart && !advDeleteEnd) {
          const diff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
          return diff < Number(advDeleteDays);
        }
        
        // Filter by range
        if (advDeleteStart || advDeleteEnd) {
          const start = advDeleteStart ? new Date(advDeleteStart) : new Date(0);
          const end = advDeleteEnd ? new Date(advDeleteEnd) : new Date();
          return itemDate < start || itemDate > end;
        }

        return true;
      });

      const deletedCount = data.length - filtered.length;
      storageEngine.set(key, JSON.stringify(filtered));
      toast.success(`${deletedCount} records deleted`);
      setAdvDeleteType(null);
    } catch (e) {
      toast.error('Failed to parse data for filtering');
    }
  };

  const renderDataManagement = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Data Management" onBack={() => setActiveTab('overview')} />
      
      <div className="space-y-4">
        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-3xl flex items-start gap-3 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12 transition-transform group-hover:scale-110">
            <ShieldAlert className="h-20 w-20 text-amber-500" />
          </div>
          <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 relative z-10" />
          <div className="relative z-10">
            <h4 className="text-sm font-bold text-amber-600 dark:text-amber-500">Local-Only Storage</h4>
            <p className="text-[11px] text-amber-700 dark:text-amber-200/70 leading-relaxed mt-1">
              Your data never leaves this device. This means erasing it is permanent. 
              Always backup (export) your data before doing a reset.
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
           <div className="p-6 rounded-[2.5rem] bg-white dark:bg-card/30 border border-border/50 dark:border-border/40 space-y-6 relative overflow-hidden shadow-sm dark:shadow-none">
             <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                 <Database className="h-6 w-6 text-primary" />
               </div>
               <div>
                 <h4 className="text-sm font-bold">Secure Ecosystem Sync</h4>
                 <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Backup & Recovery Hub</p>
               </div>
             </div>

             {migrationStatus !== 'completed' && (
               <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 space-y-3">
                 <div className="flex items-center gap-3">
                   <Database className="h-5 w-5 text-indigo-500" />
                   <div>
                     <h5 className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Upgrade to SQLite Architecture</h5>
                     <p className="text-[10px] text-muted-foreground leading-tight">Move data from legacy storage to production-grade SQLite engine.</p>
                   </div>
                 </div>
                 <Button 
                   className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 shadow-lg shadow-indigo-600/20"
                   onClick={() => {
                     setShowConfirm({
                       title: 'Migrate to SQLite?',
                       description: 'This will move all your data to a new high-performance database. Legacy storage will be wiped after successful migration.',
                       variant: 'info',
                       onConfirm: async () => {
                         toast.info('Starting migration...');
                         try {
                           await MigrationManager.backupBeforeMigration();
                           await MigrationManager.migrateAll();
                           await MigrationManager.clearLegacyData();
                           setMigrationStatus('completed');
                           toast.success('Migration successful!', {
                             description: 'Application will reload to apply changes.'
                           });
                           setTimeout(() => window.location.reload(), 2000);
                         } catch (e) {
                           console.error('Migration failed:', e);
                           toast.error('Migration failed. Check console for details.');
                         }
                       }
                     });
                   }}
                 >
                   <Zap className="h-4 w-4" /> Start Migration
                 </Button>
               </div>
             )}
 
             <div className="grid grid-cols-2 gap-3">
               <Button 
                 variant="outline" 
                 className="h-20 flex-col rounded-3xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary gap-1 font-bold transition-all group"
                 onClick={() => setShowExportOptions(true)}
               >
                 <ChevronRight className="h-5 w-5 rotate-90 group-hover:translate-y-1 transition-transform" />
                 <span className="text-[10px] uppercase tracking-widest">Export All</span>
               </Button>
 
               <div className="relative">
                  <input 
                    id="import-data-input"
                    type="file" 
                    accept=".json,.csv"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      const format = file.name.endsWith('.csv') ? 'csv' : 'json';
                      toast.info(`Processing ${format.toUpperCase()} backup file...`);
                      const reader = new FileReader();
                      
                      reader.onload = async (event) => {
                        try {
                          const content = event.target?.result as string;
                          if (!content) throw new Error('File is empty');
                          
                          const m = await import('@/lib/data-migration');
                          const success = await m.dataMigrationService.importData(content, format);
                          
                          // Reset input value so it can be triggered again even if same file
                          e.target.value = '';
                          
                          if (success) {
                            setShowConfirm({
                              title: 'Restore Complete!',
                              description: 'Your data has been successfully imported. The application needs to reload to apply changes.',
                              variant: 'info',
                              onConfirm: () => {
                                toast.info('Reloading app...');
                                setTimeout(() => window.location.reload(), 500);
                              }
                            });
                          } else {
                            toast.error('Import Failed', { description: 'The file format is incorrect or incompatible.' });
                          }
                        } catch (err) {
                          console.error('Import error:', err);
                          toast.error('Error parsing file');
                          e.target.value = '';
                        }
                      };
                      
                      reader.onerror = () => {
                        toast.error('Failed to read file');
                        e.target.value = '';
                      };
                      
                      reader.readAsText(file);
                    }}
                  />
                  <Button 
                    variant="outline"
                    className="h-20 w-full flex-col rounded-3xl border border-dashed border-border/60 hover:border-primary/40 hover:bg-muted/50 flex items-center justify-center gap-1 transition-all group"
                    onClick={async () => {
                      const { Capacitor } = await import('@capacitor/core');
                      if (Capacitor.isNativePlatform()) {
                        toast.info('Opening file picker...');
                        const m = await import('@/lib/data-migration');
                        const success = await m.dataMigrationService.pickAndImportData();
                        if (success) {
                          setShowConfirm({
                            title: 'Restore Complete!',
                            description: 'Your data has been successfully imported. The application needs to reload to apply changes.',
                            variant: 'info',
                            onConfirm: () => {
                              toast.info('Reloading app...');
                              setTimeout(() => window.location.reload(), 500);
                            }
                          });
                        } else {
                          toast.error('Import cancelled or failed');
                        }
                      } else {
                        document.getElementById('import-data-input')?.click();
                      }
                    }}
                  >
                    <ChevronRight className="h-5 w-5 -rotate-90 group-hover:-translate-y-1 transition-transform" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Import Data</span>
                  </Button>
                </div>
             </div>
           </div>
 
           <div className="mt-4 px-2">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-4 ml-1">Advanced Selective Eraser</p>
             <div className="space-y-2">
               {[
                 { label: 'Expenses', icon: Receipt, type: 'expenses' },
                 { label: 'Fuel Logs', icon: Fuel, type: 'fuel' },
                 { label: 'Wallet', icon: Camera, type: 'wallet' },
                 { label: 'Vehicles', icon: Car, type: 'mileage' }
               ].map(item => (
                 <div key={item.type} className="group flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 justify-between h-14 px-5 rounded-3xl border-border/50 dark:border-border/40 bg-white dark:bg-card/20 hover:bg-destructive/5 hover:text-destructive hover:border-destructive/20 transition-all shadow-sm dark:shadow-none"
                      onClick={() => {
                        setShowConfirm({
                          title: `Delete all ${item.label}?`,
                          description: `This will permanently erase every single ${item.label.toLowerCase()} record from your device storage.`,
                          variant: 'destructive',
                          onConfirm: async () => {
                            const sqliteActive = await dataMigrationService.isSqliteActive();
                            
                            if (sqliteActive && item.type === 'expenses') {
                              await dbService.run('DELETE FROM transactions');
                            }
                            
                            const keys: Record<string, string[]> = {
                              expenses: ['reimburse_expenses_v2'],
                              fuel: ['reimburse_fuel_v1'],
                              wallet: ['reimburse_wallet_v1'],
                              mileage: ['reimburse_mileage_v1', 'reimburse_vehicles_v1']
                            };
                            keys[item.type].forEach(k => storageEngine.remove(k));
                            toast.success(`${item.label} wiped clean`);
                            window.location.reload();
                          }
                        });
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className="h-5 w-5 opacity-60 group-hover:opacity-100" />
                        <span className="text-sm font-bold">{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-20 group-hover:opacity-100 transition-opacity" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setAdvDeleteType(item.type)}
                      className="h-14 w-14 rounded-3xl bg-muted/40 dark:bg-muted/20 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all shrink-0"
                    >
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                 </div>
               ))}
             </div>
           </div>
 
           <Button 
              variant="destructive" 
              className="h-20 mt-8 shadow-2xl shadow-destructive/20 font-black text-xs uppercase tracking-[0.3em] gap-3 rounded-[2.5rem] relative overflow-hidden group"
              onClick={() => {
                setShowConfirm({
                  title: 'ULTIMATE FACTORY RESET?',
                  description: 'This is the point of no return. Every single preference, expense, vehicle, and setting will be obliterated. Are you absolutely certain?',
                  variant: 'destructive',
                  onConfirm: async () => {
                    await storageEngine.clearAll();
                    window.location.reload();
                  }
                });
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <RotateCcw className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
              Factory Reset Application
            </Button>
        </div>
      </div>
    </div>
  );


  return (
    <>
      <div className="max-w-2xl mx-auto pb-24 px-1">
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
      </div>

      {createPortal(
        <AnimatePresence>
          {showConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden"
              >
                <div className="p-8 text-center space-y-6">
                  <div className={cn(
                    "h-20 w-20 rounded-[2rem] mx-auto flex items-center justify-center shadow-lg",
                    showConfirm.variant === 'destructive' ? "bg-destructive/10 text-destructive shadow-destructive/10" : 
                    showConfirm.variant === 'warning' ? "bg-amber-500/10 text-amber-500 shadow-amber-500/10" : 
                    "bg-primary/10 text-primary shadow-primary/10"
                  )}>
                    {showConfirm.variant === 'destructive' ? <Trash2 className="h-10 w-10" /> : <ShieldAlert className="h-10 w-10" />}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight">{showConfirm.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{showConfirm.description}</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <Button 
                      className={cn(
                        "h-14 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95",
                        showConfirm.variant === 'destructive' ? "bg-destructive shadow-destructive/20" : "bg-primary shadow-primary/20"
                      )}
                      onClick={() => {
                        showConfirm.onConfirm();
                        setShowConfirm(null);
                      }}
                    >
                      Confirm Action
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="h-12 rounded-2xl font-bold text-muted-foreground"
                      onClick={() => setShowConfirm(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {advDeleteType && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="w-full max-w-md bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden"
              >
                <div className="p-8 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-bold">Advanced Filter</h4>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-0.5">Selective Deletion: {advDeleteType}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setAdvDeleteType(null)} className="rounded-full">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Time Horizon (Days)</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {['7', '30', '90', '180'].map(d => (
                          <button
                            key={d}
                            onClick={() => { setAdvDeleteDays(d); setAdvDeleteStart(''); setAdvDeleteEnd(''); }}
                            className={cn(
                              "h-10 rounded-xl border text-xs font-bold transition-all",
                              advDeleteDays === d && !advDeleteStart ? "bg-primary/10 border-primary text-primary" : "border-border/40 text-muted-foreground"
                            )}
                          >
                            {d}d
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="relative py-2 flex items-center justify-center">
                       <div className="absolute inset-x-0 h-px bg-border/40" />
                       <span className="relative bg-card px-3 text-[9px] font-black text-muted-foreground/40 uppercase">Or custom range</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Start Date</Label>
                        <Input 
                          type="date" value={advDeleteStart} onChange={e => { setAdvDeleteStart(e.target.value); setAdvDeleteDays(''); }}
                          className="h-12 rounded-2xl bg-muted/30 border-border/40 text-xs"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">End Date</Label>
                        <Input 
                          type="date" value={advDeleteEnd} onChange={e => { setAdvDeleteEnd(e.target.value); setAdvDeleteDays(''); }}
                          className="h-12 rounded-2xl bg-muted/30 border-border/40 text-xs"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10">
                      <p className="text-[10px] text-destructive font-bold leading-relaxed text-center">
                        Warning: This will delete data {advDeleteStart || advDeleteEnd ? `between ${advDeleteStart || 'ever'} and ${advDeleteEnd || 'today'}` : `older than ${advDeleteDays} days`}.
                      </p>
                    </div>

                    <Button 
                      className="w-full h-14 rounded-2xl bg-destructive text-white font-black uppercase tracking-widest shadow-lg shadow-destructive/20"
                      onClick={() => {
                        setShowConfirm({
                          title: 'Confirm Surgical Deletion?',
                          description: 'You are about to delete records based on your custom filter. This cannot be undone.',
                          variant: 'destructive',
                          onConfirm: () => executeAdvancedDelete(advDeleteType!)
                        });
                      }}
                    >
                      Delete Selected
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
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
          {showExportOptions && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-[2.5rem] overflow-hidden"
              >
                <div className="p-8 text-center space-y-6">
                  <div className="h-20 w-20 rounded-[2rem] mx-auto flex items-center justify-center bg-primary/10 text-primary shadow-lg shadow-primary/10">
                    <Database className="h-10 w-10" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight">Export Format</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Choose how you want to save your data backup</p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button 
                      className="h-16 rounded-2xl font-bold bg-primary text-white shadow-lg shadow-primary/20 flex justify-between px-6 group"
                      onClick={async () => {
                        setShowExportOptions(false);
                        toast.info('Generating JSON backup...');
                        const m = await import('@/lib/data-migration');
                        await m.dataMigrationService.downloadBackup('json');
                      }}
                    >
                      <span className="flex flex-col items-start">
                        <span>JSON Data</span>
                        <span className="text-[10px] opacity-70 font-normal uppercase tracking-widest">Full System Restore</span>
                      </span>
                      <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    
                    <Button 
                      variant="outline"
                      className="h-16 rounded-2xl font-bold border-border hover:bg-muted transition-all flex justify-between px-6 group"
                      onClick={async () => {
                        setShowExportOptions(false);
                        toast.info('Generating CSV backup...');
                        const m = await import('@/lib/data-migration');
                        await m.dataMigrationService.downloadBackup('csv');
                      }}
                    >
                      <span className="flex flex-col items-start">
                        <span>CSV Spreadsheet</span>
                        <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-widest">Excel / Sheets compatible</span>
                      </span>
                      <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>

                    <Button 
                      variant="ghost" 
                      className="h-12 rounded-xl font-bold text-muted-foreground"
                      onClick={() => setShowExportOptions(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </>
  );
}
