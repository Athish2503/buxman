import { AppSettings, BudgetGoal } from '@/types/expense';
import { storageEngine } from '@/lib/storage-engine';

const SETTINGS_KEY = 'reimburse_settings_v2';

const defaultSettings: AppSettings = {
  billedTo: {
    name: 'Company Name',
    line2: 'Accounts Payable Dept.',
    address: '',
  },
  billedFrom: {
    name: 'Employee Name',
    line2: 'Reimbursement Claim',
    email: '',
    phone: '',
  },
  currency: 'INR',
  theme: 'dark',
  accentColor: '#3b82f6',
  glassIntensity: 0.6,
  budgets: [],
  hapticsEnabled: true,
  navOrder: ['dashboard', 'expenses', 'splits', 'food', 'reimbursements', 'trips', 'vehicle', 'analytics', 'settings'],
  upiId: '',
};

export const settingsService = {
  get(): AppSettings {
    try {
      // Migrate old settings
      const oldData = localStorage.getItem('reimbursement_settings');
      if (oldData && !localStorage.getItem(SETTINGS_KEY)) {
        const old = JSON.parse(oldData);
        const migrated: AppSettings = {
          ...defaultSettings,
          billedTo: { ...defaultSettings.billedTo, ...old.billedTo },
          billedFrom: { ...defaultSettings.billedFrom, ...old.billedFrom },
        };
        storageEngine.set(SETTINGS_KEY, JSON.stringify(migrated));
        return migrated;
      }
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return defaultSettings;
      const parsed = JSON.parse(stored);
      return {
        ...defaultSettings,
        ...parsed,
        billedTo: { ...defaultSettings.billedTo, ...parsed.billedTo },
        billedFrom: { ...defaultSettings.billedFrom, ...parsed.billedFrom },
        budgets: parsed.budgets || [],
        navOrder: (() => {
          const currentOrder = parsed.navOrder || defaultSettings.navOrder;
          const missing = defaultSettings.navOrder.filter(t => !currentOrder.includes(t));
          return [...currentOrder, ...missing];
        })(),
      };
    } catch {
      return defaultSettings;
    }
  },

  save(settings: AppSettings): void {
    storageEngine.set(SETTINGS_KEY, JSON.stringify(settings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('settings-updated'));
      
      // Trigger native OS widgets redraw
      import('@capacitor/core').then(({ Capacitor }) => {
        if (Capacitor.isNativePlatform()) {
          import('@/lib/financial-notifications').then(({ default: fn }) => {
            fn.updateWidgets().catch(err => console.error('Failed updating widgets:', err));
          });
        }
      });
    }
  },

  updateBudget(budget: BudgetGoal): void {
    const settings = this.get();
    const idx = settings.budgets.findIndex(b => b.category === budget.category);
    if (idx >= 0) settings.budgets[idx] = budget;
    else settings.budgets.push(budget);
    this.save(settings);
  },

  removeBudget(category: string): void {
    const settings = this.get();
    settings.budgets = settings.budgets.filter(b => b.category !== category);
    this.save(settings);
  }
};

// Legacy alias
export type { AppSettings as InvoiceSettings };
