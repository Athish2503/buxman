import { 
  Plane, 
  Utensils, 
  Package, 
  Bed, 
  Car, 
  PartyPopper, 
  Phone, 
  GraduationCap, 
  Heart, 
  MoreHorizontal 
} from 'lucide-react';
import { ExpenseCategory } from '@/types/expense';

export const categoryConfig: Record<ExpenseCategory, {
  label: string;
  icon: typeof Plane;
  color: string;
  description: string;
}> = {
  travel: {
    label: 'Travel',
    icon: Plane,
    color: 'text-blue-600',
    description: 'Flights, trains, taxis'
  },
  meals: {
    label: 'Meals & Dining',
    icon: Utensils,
    color: 'text-orange-600',
    description: 'Breakfast, lunch, dinner'
  },
  supplies: {
    label: 'Office Supplies',
    icon: Package,
    color: 'text-purple-600',
    description: 'Stationery, equipment'
  },
  accommodation: {
    label: 'Accommodation',
    icon: Bed,
    color: 'text-green-600',
    description: 'Hotels, lodging'
  },
  transportation: {
    label: 'Transportation',
    icon: Car,
    color: 'text-blue-500',
    description: 'Local transport, fuel'
  },
  entertainment: {
    label: 'Entertainment',
    icon: PartyPopper,
    color: 'text-pink-600',
    description: 'Client entertainment'
  },
  communication: {
    label: 'Communication',
    icon: Phone,
    color: 'text-teal-600',
    description: 'Phone, internet bills'
  },
  training: {
    label: 'Training & Development',
    icon: GraduationCap,
    color: 'text-indigo-600',
    description: 'Courses, conferences'
  },
  healthcare: {
    label: 'Healthcare',
    icon: Heart,
    color: 'text-red-600',
    description: 'Medical expenses'
  },
  other: {
    label: 'Other',
    icon: MoreHorizontal,
    color: 'text-gray-600',
    description: 'Miscellaneous expenses'
  }
};

export const getCategoryConfig = (category: ExpenseCategory) => {
  return categoryConfig[category];
};