export interface InvoiceSettings {
  billedTo: {
    name: string;
    line2: string;
  };
  billedFrom: {
    name: string;
    line2: string;
    email: string;
  };
}

const SETTINGS_KEY = 'reimbursement_settings';

const defaultSettings: InvoiceSettings = {
  billedTo: {
    name: 'Company Name',
    line2: 'Accounts Payable Dept.',
  },
  billedFrom: {
    name: 'Employee Name',
    line2: 'Reimbursement Claim',
    email: '',
  },
};

export const settingsService = {
  get(): InvoiceSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return defaultSettings;
      const parsed = JSON.parse(stored);
      return {
        billedTo: { ...defaultSettings.billedTo, ...parsed.billedTo },
        billedFrom: { ...defaultSettings.billedFrom, ...parsed.billedFrom },
      };
    } catch {
      return defaultSettings;
    }
  },
  save(settings: InvoiceSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
};
