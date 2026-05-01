import { 
  Plane, Utensils, Package, Bed, Car, PartyPopper, Phone, 
  GraduationCap, Home, Heart, Shirt, MoreHorizontal,
  LucideIcon, ShoppingBag, Coffee, CarTaxiFront, 
  Briefcase, Gift, Wrench, Zap, Shield, HelpCircle,
  Smartphone, Laptop, Tv, Headset, Gamepad2,
  Dumbbell, Bike, Dog, Cat, Baby,
  Flame, Droplets, Lightbulb, Wifi,
  Ticket, Camera, Music, Book, Newspaper,
  CreditCard, Banknote, Landmark, Wallet,
  Trophy, Star, Crown, Ghost,
  Apple, Pizza, Beer, Wine, IceCream,
  Activity, Pill, Stethoscope,
  Scissors, Brush, Palette
} from 'lucide-react';
import { ExpenseCategory } from '@/types/expense';

export interface CategoryDefinition {
  id: string;
  label: string;
  iconName: string;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
  isVisible: boolean;
  isSystem?: boolean;
}

export const iconMap: Record<string, LucideIcon> = {
  Plane, Utensils, Package, Bed, Car, PartyPopper, Phone, 
  GraduationCap, Home, Heart, Shirt, MoreHorizontal,
  ShoppingBag, Coffee, CarTaxiFront, Briefcase, Gift, 
  Wrench, Zap, Shield, HelpCircle,
  Smartphone, Laptop, Tv, Headset, Gamepad2,
  Dumbbell, Bike, Dog, Cat, Baby,
  Flame, Droplets, Lightbulb, Wifi,
  Ticket, Camera, Music, Book, Newspaper,
  CreditCard, Banknote, Landmark, Wallet,
  Trophy, Star, Crown, Ghost,
  Apple, Pizza, Beer, Wine, IceCream,
  Activity, Pill, Stethoscope,
  Scissors, Brush, Palette
};

const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'travel',
    label: 'Travel',
    iconName: 'Plane',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    gradientFrom: '#3b82f6',
    gradientTo: '#6366f1',
    description: 'Flights, trains, taxis',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'meals',
    label: 'Meals & Dining',
    iconName: 'Utensils',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    gradientFrom: '#f97316',
    gradientTo: '#f59e0b',
    description: 'Breakfast, lunch, dinner',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'supplies',
    label: 'Office Supplies',
    iconName: 'Package',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
    gradientFrom: '#a855f7',
    gradientTo: '#8b5cf6',
    description: 'Stationery, equipment',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'accommodation',
    label: 'Accommodation',
    iconName: 'Bed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    gradientFrom: '#10b981',
    gradientTo: '#06b6d4',
    description: 'Hotels, lodging',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'transportation',
    label: 'Transportation',
    iconName: 'Car',
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15',
    gradientFrom: '#0ea5e9',
    gradientTo: '#38bdf8',
    description: 'Local transport, fuel',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    iconName: 'PartyPopper',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/15',
    gradientFrom: '#ec4899',
    gradientTo: '#f43f5e',
    description: 'Client entertainment',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'communication',
    label: 'Communication',
    iconName: 'Phone',
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/15',
    gradientFrom: '#14b8a6',
    gradientTo: '#06b6d4',
    description: 'Phone, internet bills',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'training',
    label: 'Training',
    iconName: 'GraduationCap',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/15',
    gradientFrom: '#6366f1',
    gradientTo: '#8b5cf6',
    description: 'Courses, conferences',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    iconName: 'Heart',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    gradientFrom: '#f43f5e',
    gradientTo: '#fb7185',
    description: 'Medical expenses',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'home',
    label: 'Home & Utilities',
    iconName: 'Home',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15',
    gradientFrom: '#facc15',
    gradientTo: '#eab308',
    description: 'Home office, utilities',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'clothing',
    label: 'Clothing',
    iconName: 'Shirt',
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    gradientFrom: '#8b5cf6',
    gradientTo: '#d946ef',
    description: 'Work attire, laundry',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'other',
    label: 'Other',
    iconName: 'MoreHorizontal',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    gradientFrom: '#94a3b8',
    gradientTo: '#64748b',
    description: 'Miscellaneous',
    isVisible: true,
    isSystem: true
  }
];

const STORAGE_KEY = 'reimburse_categories_v1';

export const categoryService = {
  getAll(): CategoryDefinition[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_CATEGORIES;
    try {
      const parsed = JSON.parse(stored);
      // Merge stored with system defaults to ensure system categories exist
      const systemIds = DEFAULT_CATEGORIES.map(c => c.id);
      const userCategories = parsed.filter((c: CategoryDefinition) => !systemIds.includes(c.id));
      
      // Update system categories from storage (for colors/visibility) but keep system flags
      const systemCategories = DEFAULT_CATEGORIES.map(def => {
        const custom = parsed.find((p: CategoryDefinition) => p.id === def.id);
        return custom ? { ...def, ...custom, isSystem: true } : def;
      });

      return [...systemCategories, ...userCategories];
    } catch {
      return DEFAULT_CATEGORIES;
    }
  },

  getVisible(): CategoryDefinition[] {
    return this.getAll().filter(c => c.isVisible);
  },

  getById(id: string): CategoryDefinition {
    return this.getAll().find(c => c.id === id) || DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
  },

  save(categories: CategoryDefinition[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
    // Dispatch event for components to listen
    window.dispatchEvent(new CustomEvent('categories-updated'));
  },

  add(category: CategoryDefinition) {
    const all = this.getAll();
    this.save([...all, category]);
  },

  update(id: string, updates: Partial<CategoryDefinition>) {
    const all = this.getAll();
    const index = all.findIndex(c => c.id === id);
    if (index === -1) return;
    all[index] = { ...all[index], ...updates };
    this.save(all);
  },

  delete(id: string) {
    const all = this.getAll();
    const category = all.find(c => c.id === id);
    if (category?.isSystem) return; // Cannot delete system categories
    this.save(all.filter(c => c.id !== id));
  }
};
