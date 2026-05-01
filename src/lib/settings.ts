import { AppSettings, BudgetGoal } from '@/types/expense';

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
  budgets: [],
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
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
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
      };
    } catch {
      return defaultSettings;
    }
  },

  save(settings: AppSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
