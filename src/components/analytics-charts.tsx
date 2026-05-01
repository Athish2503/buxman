import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format, startOfMonth, eachMonthOfInterval, subMonths, isSameMonth } from 'date-fns';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { Expense } from '@/types/expense';
import { categoryConfig } from '@/lib/categories';
import { formatCurrency, formatCompactCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ChartsProps {
  expenses: Expense[];
}

const MONTH_COUNT = 6;

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-xl px-3 py-2.5 shadow-xl border border-border/50">
      <p className="text-xs text-muted-foreground mb-1.5 font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export function SpendingTrendChart({ expenses }: ChartsProps) {
  const data = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), MONTH_COUNT - 1),
      end: startOfMonth(now),
    });
    return months.map(m => {
      const monthExp = expenses.filter(e => isSameMonth(new Date(e.date), m));
      return {
        month: format(m, 'MMM'),
        total: monthExp.reduce((s, e) => s + e.amount, 0),
        reimbursed: monthExp.filter(e => e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0),
        pending: monthExp.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [expenses]);

  const currentTotal = data[data.length - 1]?.total || 0;
  const prevTotal = data[data.length - 2]?.total || 0;
  const delta = prevTotal ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">This Month</p>
          <p className="text-3xl font-bold number-lg mt-0.5">{formatCompactCurrency(currentTotal)}</p>
        </div>
        {prevTotal > 0 && (
          <div className={cn(
            "flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full",
            delta > 0 ? "bg-destructive/10 text-destructive" : delta < 0 ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>
            {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(262 85% 65%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(262 85% 65%)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(38 95% 58%)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="hsl(38 95% 58%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="total" name="Total" stroke="hsl(262 85% 65%)" strokeWidth={2} fill="url(#totalGrad)" dot={false} activeDot={{ r: 4, fill: 'hsl(262 85% 65%)' }} />
          <Area type="monotone" dataKey="pending" name="Pending" stroke="hsl(38 95% 58%)" strokeWidth={2} fill="url(#pendingGrad)" dot={false} activeDot={{ r: 4, fill: 'hsl(38 95% 58%)' }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryBreakdownChart({ expenses }: ChartsProps) {
  const data = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });
    return Object.entries(categoryTotals)
      .map(([cat, amount]) => ({
        name: categoryConfig[cat as keyof typeof categoryConfig]?.label || cat,
        value: amount,
        color: categoryConfig[cat as keyof typeof categoryConfig]?.gradientFrom || '#888',
        category: cat,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [expenses]);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data yet</div>
  );

  return (
    <div className="flex flex-col gap-4">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} opacity={0.9} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-2">
        {data.map(item => (
          <div key={item.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-xs text-muted-foreground truncate">{item.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold">{formatCompactCurrency(item.value)}</span>
              <span className="text-[10px] text-muted-foreground w-8 text-right">
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthlyBarChart({ expenses }: ChartsProps) {
  const data = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 5),
      end: startOfMonth(now),
    });
    return months.map(m => {
      const monthExp = expenses.filter(e => isSameMonth(new Date(e.date), m));
      return {
        month: format(m, 'MMM'),
        pending: monthExp.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0),
        approved: monthExp.filter(e => e.status === 'approved').reduce((s, e) => s + e.amount, 0),
        reimbursed: monthExp.filter(e => e.status === 'reimbursed').reduce((s, e) => s + e.amount, 0),
      };
    });
  }, [expenses]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={14} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
        />
        <Bar dataKey="pending" name="Pending" fill="hsl(38 95% 58%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="approved" name="Approved" fill="hsl(152 68% 50%)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="reimbursed" name="Reimbursed" fill="hsl(262 85% 65%)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
