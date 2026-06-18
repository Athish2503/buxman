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
  Scissors, Brush, Palette,
  // Food & Dining
  Cake, Soup, Popcorn, Cookie, GlassWater, Croissant, ChefHat,
  // Travel & Commute
  Train, Bus, Ship, MapPin, Compass, Anchor, Fuel, Luggage, Route,
  // Supplies & Personal
  Hammer, Paintbrush, Tag, Gem, Sparkles, Smile, Bath, Footprints, Glasses, Clock, HeartPulse,
  // Bills & Utilities
  Plug, ShowerHead, Trash2, Umbrella, TreePine, Flower, Trees,
  // Finance & Business
  PiggyBank, TrendingUp, TrendingDown, Receipt, Percent, Scale, FileText, ClipboardList, Calculator,
  // Health & Family
  Brain, Users, User,
  // Entertainment & General
  Clapperboard, Mic, Projector, Radio, Globe, Sun, Moon, Cloud, Lock, Unlock, Info
} from 'lucide-react';
import { ExpenseCategory } from '@/types/expense';
import { storageEngine } from './storage-engine';

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
  Scissors, Brush, Palette,
  // Food & Dining
  Cake, Soup, Popcorn, Cookie, GlassWater, Croissant, ChefHat,
  // Travel & Commute
  Train, Bus, Ship, MapPin, Compass, Anchor, Fuel, Luggage, Route,
  // Supplies & Personal
  Hammer, Paintbrush, Tag, Gem, Sparkles, Smile, Bath, Footprints, Glasses, Clock, HeartPulse,
  // Bills & Utilities
  Plug, ShowerHead, Trash2, Umbrella, TreePine, Flower, Trees,
  // Finance & Business
  PiggyBank, TrendingUp, TrendingDown, Receipt, Percent, Scale, FileText, ClipboardList, Calculator,
  // Health & Family
  Brain, Users, User,
  // Entertainment & General
  Clapperboard, Mic, Projector, Radio, Globe, Sun, Moon, Cloud, Lock, Unlock, Info
};

const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'travel',
    label: 'Travel',
    iconName: 'Plane',
    color: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/15',
    gradientFrom: '#2563eb',
    gradientTo: '#1d4ed8',
    description: 'Flights, trains, taxis',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'meals',
    label: 'Meals & Dining',
    iconName: 'Utensils',
    color: 'text-amber-600 dark:text-amber-500',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
    gradientFrom: '#d97706',
    gradientTo: '#b45309',
    description: 'Breakfast, lunch, dinner',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'supplies',
    label: 'Office Supplies',
    iconName: 'Package',
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-500/10 dark:bg-slate-500/15',
    gradientFrom: '#64748b',
    gradientTo: '#475569',
    description: 'Stationery, equipment',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'accommodation',
    label: 'Accommodation',
    iconName: 'Bed',
    color: 'text-emerald-600 dark:text-emerald-500',
    bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    gradientFrom: '#0f766e',
    gradientTo: '#0d9488',
    description: 'Hotels, lodging',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'transportation',
    label: 'Transportation',
    iconName: 'Car',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10 dark:bg-blue-500/15',
    gradientFrom: '#1e40af',
    gradientTo: '#2563eb',
    description: 'Local transport, fuel',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    iconName: 'PartyPopper',
    color: 'text-rose-500 dark:text-rose-400',
    bgColor: 'bg-rose-500/10 dark:bg-rose-500/15',
    gradientFrom: '#be123c',
    gradientTo: '#e11d48',
    description: 'Client entertainment',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'communication',
    label: 'Communication',
    iconName: 'Phone',
    color: 'text-sky-500 dark:text-sky-400',
    bgColor: 'bg-sky-500/10 dark:bg-sky-500/15',
    gradientFrom: '#0369a1',
    gradientTo: '#0284c7',
    description: 'Phone, internet bills',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'training',
    label: 'Training',
    iconName: 'GraduationCap',
    color: 'text-indigo-500 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    gradientFrom: '#4f46e5',
    gradientTo: '#6366f1',
    description: 'Courses, conferences',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    iconName: 'Heart',
    color: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-500/10 dark:bg-red-500/15',
    gradientFrom: '#9f1239',
    gradientTo: '#f43f5e',
    description: 'Medical expenses',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'home',
    label: 'Home & Utilities',
    iconName: 'Home',
    color: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
    gradientFrom: '#ca8a04',
    gradientTo: '#eab308',
    description: 'Home office, utilities',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'clothing',
    label: 'Clothing',
    iconName: 'Shirt',
    color: 'text-violet-500 dark:text-violet-400',
    bgColor: 'bg-violet-500/10 dark:bg-violet-500/15',
    gradientFrom: '#581c87',
    gradientTo: '#7e22ce',
    description: 'Work attire, laundry',
    isVisible: true,
    isSystem: true
  },
  {
    id: 'other',
    label: 'Other',
    iconName: 'MoreHorizontal',
    color: 'text-slate-500 dark:text-slate-400',
    bgColor: 'bg-slate-500/10 dark:bg-slate-500/15',
    gradientFrom: '#334155',
    gradientTo: '#475569',
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
    storageEngine.set(STORAGE_KEY, JSON.stringify(categories));
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
