import { Expense, ExpenseCategory } from '@/types/expense';
import { storageService } from './storage';
import { categoryService } from './category-service';

/**
 * Local Intelligence Module
 * Handles auto-categorization and smart suggestions based on local data patterns.
 */

interface KeywordPattern {
  keywords: string[];
  category: ExpenseCategory;
  priority: number;
}

const DEFAULT_PATTERNS: KeywordPattern[] = [
  { keywords: ['zomato', 'swiggy', 'uber eats', 'restaurant', 'cafe', 'starbucks', 'mcdonalds'], category: 'food', priority: 1 },
  { keywords: ['uber', 'ola', 'rapido', 'taxi', 'metro', 'petrol', 'fuel', 'shell', 'hpcl', 'bpcl'], category: 'transport', priority: 1 },
  { keywords: ['amazon', 'flipkart', 'myntra', 'shopping', 'mall', 'retail'], category: 'shopping', priority: 1 },
  { keywords: ['jio', 'airtel', 'vi', 'recharge', 'netflix', 'spotify', 'prime video', 'apple'], category: 'bills', priority: 1 },
  { keywords: ['hospital', 'pharmacy', 'medicine', 'clinic', 'doctor'], category: 'health', priority: 1 },
  { keywords: ['cinema', 'pvr', 'inox', 'theatre', 'gaming', 'pub', 'club'], category: 'entertainment', priority: 1 },
];

export const localIntelligence = {
  /**
   * Predicts the category for a new expense based on its merchant/description.
   */
  predictCategory(description: string, amount: number): ExpenseCategory {
    const desc = description.toLowerCase();
    
    // 1. Check against keyword patterns
    let bestMatch: KeywordPattern | null = null;
    for (const pattern of DEFAULT_PATTERNS) {
      if (pattern.keywords.some(k => desc.includes(k))) {
        if (!bestMatch || pattern.priority > bestMatch.priority) {
          bestMatch = pattern;
        }
      }
    }
    
    if (bestMatch) return bestMatch.category;

    // 2. Check historical data for exact or similar merchant matches
    const history = storageService.getExpenses();
    const exactMatch = history.find(e => (e.description || '').toLowerCase() === desc);
    if (exactMatch) return exactMatch.category;

    // 3. Fallback to 'others' or 'general'
    return 'others' as ExpenseCategory;
  },

  /**
   * Suggests recurring expenses based on frequency.
   */
  detectRecurringPotential(): { description: string, category: ExpenseCategory, frequency: 'monthly' | 'weekly', confidence: number }[] {
    const history = storageService.getExpenses();
    const suggestions: any[] = [];
    
    // Simple grouping by description
    const groups: Record<string, Expense[]> = {};
    history.forEach(e => {
      const key = e.description.toLowerCase().trim();
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    Object.entries(groups).forEach(([desc, items]) => {
      if (items.length < 3) return;

      // Sort by date
      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate intervals
      const intervals: number[] = [];
      for (let i = 1; i < items.length; i++) {
        const d1 = new Date(items[i-1].date).getTime();
        const d2 = new Date(items[i].date).getTime();
        intervals.push((d2 - d1) / (1000 * 60 * 60 * 24));
      }

      const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length;
      const variance = intervals.reduce((s, i) => s + Math.pow(i - avgInterval, 2), 0) / intervals.length;

      // If low variance and interval is roughly 30 days
      if (variance < 50) {
        if (avgInterval >= 25 && avgInterval <= 35) {
          suggestions.push({
            description: items[0].description,
            category: items[0].category,
            frequency: 'monthly',
            confidence: Math.max(0, 1 - variance / 100)
          });
        } else if (avgInterval >= 5 && avgInterval <= 9) {
          suggestions.push({
            description: items[0].description,
            category: items[0].category,
            frequency: 'weekly',
            confidence: Math.max(0, 1 - variance / 100)
          });
        }
      }
    });

    return suggestions;
  },

  /**
   * Forecasts spending for the next month based on historical trends.
   */
  forecastNextMonthSpending(): { predicted: number, confidence: number } {
    const history = storageService.getExpenses();
    if (history.length < 5) return { predicted: 0, confidence: 0 };

    // Group by month
    const monthlyTotals: Record<string, number> = {};
    history.forEach(e => {
      const monthKey = e.date.substring(0, 7); // YYYY-MM
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + e.amount;
    });

    const sortedMonths = Object.keys(monthlyTotals).sort();
    const values = sortedMonths.map(m => monthlyTotals[m]);

    if (values.length < 3) return { predicted: values[values.length - 1] || 0, confidence: 0.3 };

    // Simple Linear Regression
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predicted = Math.max(0, slope * n + intercept);
    
    // Confidence based on standard deviation/variance from the line
    let totalError = 0;
    for (let i = 0; i < n; i++) {
      const expected = slope * i + intercept;
      totalError += Math.pow(values[i] - expected, 2);
    }
    const standardError = Math.sqrt(totalError / n);
    const avgValue = sumY / n;
    const confidence = Math.max(0.1, Math.min(0.9, 1 - (standardError / (avgValue || 1))));

    return { predicted, confidence };
  }
};
