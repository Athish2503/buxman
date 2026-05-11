import {
  LayoutDashboard, Receipt, BarChart3, Settings,
  Car, Briefcase, Utensils, Plane
} from 'lucide-react';

export type Tab = 'dashboard' | 'expenses' | 'food' | 'reimbursements' | 'trips' | 'vehicle' | 'analytics' | 'settings';

export const NAV_ITEMS_CONFIG: Record<Tab, { id: Tab; label: string; icon: any }> = {
  dashboard:      { id: 'dashboard',      label: 'Home',     icon: LayoutDashboard },
  expenses:       { id: 'expenses',       label: 'Expenses', icon: Receipt         },
  food:           { id: 'food',           label: 'Dining',   icon: Utensils        },
  reimbursements: { id: 'reimbursements', label: 'Claims',   icon: Briefcase       },
  trips:          { id: 'trips',          label: 'Trips',    icon: Plane           },
  vehicle:        { id: 'vehicle',        label: 'Garage',   icon: Car             },
  analytics:      { id: 'analytics',      label: 'Charts',   icon: BarChart3       },
  settings:       { id: 'settings',       label: 'Settings', icon: Settings        },
};
