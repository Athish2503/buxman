import { AppSettings } from '@/types/expense';
import { SubModuleHeader, Field } from './Common';

interface OrganizationModuleProps {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  onBack: () => void;
}

export function OrganizationModule({ settings, updateSettings, onBack }: OrganizationModuleProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <SubModuleHeader title="Organization Details" onBack={onBack} />
      
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
          <Field
            id="bf-upi" label="Your UPI ID (For receiving splits)"
            value={settings.upiId || ''}
            onChange={v => updateSettings({ upiId: v })}
            placeholder="username@okaxis"
          />
        </div>
      </div>
    </div>
  );
}
