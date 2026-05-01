import { categoryService, iconMap } from './category-service';
import { ExpenseCategory } from '@/types/expense';
import { MoreHorizontal } from 'lucide-react';

// For backward compatibility
export const categoryConfig: any = new Proxy({}, {
  get(target, prop: string) {
    if (prop === 'then') return undefined;
    const cat = categoryService.getById(prop);
    return {
      ...cat,
      icon: iconMap[cat.iconName] || MoreHorizontal
    };
  },
  ownKeys() {
    return categoryService.getAll().map(c => c.id);
  },
  getOwnPropertyDescriptor(target, prop) {
    return {
      enumerable: true,
      configurable: true,
    };
  }
});

export const getCategoryConfig = (category: ExpenseCategory) => {
  const cat = categoryService.getById(category);
  return {
    ...cat,
    icon: iconMap[cat.iconName] || MoreHorizontal
  };
};