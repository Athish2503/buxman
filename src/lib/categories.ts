import {
  Plane,
  Utensils,
  Package,
  Bed,
  Car,
  PartyPopper,
  Phone,
  GraduationCap,
  Home,
  Heart,
  Shirt,
  MoreHorizontal
} from 'lucide-react';
import { ExpenseCategory } from '@/types/expense';

export const categoryConfig: Record<ExpenseCategory, {
  label: string;
  icon: typeof Plane;
  color: string;
  bgColor: string;
  gradientFrom: string;
  gradientTo: string;
  description: string;
}> = {
  travel: {
    label: 'Travel',
    icon: Plane,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/15',
    gradientFrom: '#3b82f6',
    gradientTo: '#6366f1',
    description: 'Flights, trains, taxis'
  },
  meals: {
    label: 'Meals & Dining',
    icon: Utensils,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    gradientFrom: '#f97316',
    gradientTo: '#f59e0b',
    description: 'Breakfast, lunch, dinner'
  },
  supplies: {
    label: 'Office Supplies',
    icon: Package,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/15',
    gradientFrom: '#a855f7',
    gradientTo: '#8b5cf6',
    description: 'Stationery, equipment'
  },
  accommodation: {
    label: 'Accommodation',
    icon: Bed,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    gradientFrom: '#10b981',
    gradientTo: '#06b6d4',
    description: 'Hotels, lodging'
  },
  transportation: {
    label: 'Transportation',
    icon: Car,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/15',
    gradientFrom: '#0ea5e9',
    gradientTo: '#38bdf8',
    description: 'Local transport, fuel'
  },
  entertainment: {
    label: 'Entertainment',
    icon: PartyPopper,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/15',
    gradientFrom: '#ec4899',
    gradientTo: '#f43f5e',
    description: 'Client entertainment'
  },
  communication: {
    label: 'Communication',
    icon: Phone,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/15',
    gradientFrom: '#14b8a6',
    gradientTo: '#06b6d4',
    description: 'Phone, internet bills'
  },
  training: {
    label: 'Training',
    icon: GraduationCap,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/15',
    gradientFrom: '#6366f1',
    gradientTo: '#8b5cf6',
    description: 'Courses, conferences'
  },
  healthcare: {
    label: 'Healthcare',
    icon: Heart,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/15',
    gradientFrom: '#f43f5e',
    gradientTo: '#fb7185',
    description: 'Medical expenses'
  },
  home: {
    label: 'Home & Utilities',
    icon: Home,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/15',
    gradientFrom: '#facc15',
    gradientTo: '#eab308',
    description: 'Home office, utilities'
  },
  clothing: {
    label: 'Clothing',
    icon: Shirt,
    color: 'text-violet-400',
    bgColor: 'bg-violet-500/15',
    gradientFrom: '#8b5cf6',
    gradientTo: '#d946ef',
    description: 'Work attire, laundry'
  },
  other: {
    label: 'Other',
    icon: MoreHorizontal,
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/15',
    gradientFrom: '#94a3b8',
    gradientTo: '#64748b',
    description: 'Miscellaneous'
  }
};

export const getCategoryConfig = (category: ExpenseCategory) => categoryConfig[category];