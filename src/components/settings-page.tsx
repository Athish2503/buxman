import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  Settings, Trash2, ShieldAlert, ChevronLeft, RotateCcw, X, Palette, MoreHorizontal
} from 'lucide-react';
import { biometrics } from '@/lib/biometrics';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { AppSettings, BudgetGoal, ExpenseCategory } from '@/types/expense';
import { settingsService } from '@/lib/settings';
import { CategoryDefinition, categoryService, iconMap } from '@/lib/category-service';
import { storageEngine } from '@/lib/storage-engine';
import { cn } from '@/lib/utils';

import { createPortal } from 'react-dom';

// Import sub-modules
import { ProfileModule } from './settings/ProfileModule';
import { OverviewModule } from './settings/OverviewModule';
import { OrganizationModule } from './settings/OrganizationModule';
import { SmartFeaturesModule } from './settings/SmartFeaturesModule';
import { CategoryManagementModule } from './settings/CategoryManagementModule';
import { BudgetControlsModule } from './settings/BudgetControlsModule';
import { SecurityModule } from './settings/SecurityModule';
import { DataManagementModule } from './settings/DataManagementModule';
import { NavigationSettingsModule } from './settings/NavigationSettingsModule';
import { Field } from './settings/Common';

type SettingsTab = 'overview' | 'profile' | 'organization' | 'smart' | 'security' | 'categories' | 'budgets' | 'data' | 'navigation';

interface SettingsPageProps {
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
}

export function SettingsPage({ theme, onThemeToggle }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('overview');
  const [settings, setSettings] = useState<AppSettings>(settingsService.get());
  const [categories, setCategories] = useState<CategoryDefinition[]>(categoryService.getAll());
  const [newBudget, setNewBudget] = useState<Partial<BudgetGoal>>({ period: 'monthly' });
  const [bioAvailable, setBioAvailable] = useState(false);

  const [showExportOptions, setShowExportOptions] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDefinition | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [permissionsStatus, setPermissionsStatus] = useState({
    sms: false,
    notifications: false,
    overlay: false,
    isMiui: false
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
    
    const handleUpdate = () => setCategories(categoryService.getAll());
    window.addEventListener('categories-updated', handleUpdate);

    // Poll for permission status when on Smart tab
    let interval: any;
    if (activeTab === 'smart') {
      const check = async () => {
        const { permissions } = await import('@/lib/permissions');
        const status = await permissions.checkStatus();
        const sms = await permissions.checkSMSStatus();
        setPermissionsStatus({ 
          sms, 
          notifications: status.financialNotifications, 
          overlay: status.overlay, 
          isMiui: status.isMiui || false 
        });
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

  const executeAdvancedDelete = (type: string) => {
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
        
        if (advDeleteDays && !advDeleteStart && !advDeleteEnd) {
          const diff = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
          return diff < Number(advDeleteDays);
        }
        
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

  const renderActiveModule = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewModule onNavigate={setActiveTab} />;
      case 'profile':
        return <ProfileModule settings={settings} updateSettings={updateSettings} onBack={() => setActiveTab('overview')} />;
      case 'organization':
        return <OrganizationModule settings={settings} updateSettings={updateSettings} onBack={() => setActiveTab('overview')} />;
      case 'smart':
        return <SmartFeaturesModule permissionsStatus={permissionsStatus} onBack={() => setActiveTab('overview')} />;
      case 'categories':
        return <CategoryManagementModule categories={categories} setEditingCategory={setEditingCategory} setIsAddingCategory={setIsAddingCategory} onBack={() => setActiveTab('overview')} />;
      case 'budgets':
        return <BudgetControlsModule settings={settings} categories={categories} newBudget={newBudget} setNewBudget={setNewBudget} updateSettings={updateSettings} onBack={() => setActiveTab('overview')} />;
      case 'security':
        return <SecurityModule settings={settings} theme={theme} bioAvailable={bioAvailable} onThemeToggle={onThemeToggle} updateSettings={updateSettings} onBack={() => setActiveTab('overview')} />;
      case 'navigation':
        return <NavigationSettingsModule onBack={() => setActiveTab('overview')} />;
      case 'data':
        return (
          <DataManagementModule 
            onBack={() => setActiveTab('overview')}
            setShowExportOptions={setShowExportOptions}
            setShowConfirm={setShowConfirm}
            advDeleteType={advDeleteType}
            setAdvDeleteType={setAdvDeleteType}
            advDeleteDays={advDeleteDays}
            setAdvDeleteDays={setAdvDeleteDays}
            advDeleteStart={advDeleteStart}
            setAdvDeleteStart={setAdvDeleteStart}
            advDeleteEnd={advDeleteEnd}
            setAdvDeleteEnd={setAdvDeleteEnd}
            executeAdvancedDelete={executeAdvancedDelete}
          />
        );
      default:
        return <OverviewModule onNavigate={setActiveTab} />;
    }
  };

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
            {renderActiveModule()}
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
                    <MoreHorizontal className="h-10 w-10 rotate-90" />
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
