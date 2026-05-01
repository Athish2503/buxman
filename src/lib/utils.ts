import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  if (currency === 'INR') {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatCompactCurrency(amount: number, currency = 'INR'): string {
  if (amount >= 100000) {
    return (currency === 'INR' ? '₹' : '') + (amount / 100000).toFixed(1) + 'L';
  }
  if (amount >= 1000) {
    return (currency === 'INR' ? '₹' : '') + (amount / 1000).toFixed(1) + 'K';
  }
  return formatCurrency(amount, currency);
}
