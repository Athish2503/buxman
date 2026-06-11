import { useMemo, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line
} from 'recharts';
import {
  format, startOfMonth, eachMonthOfInterval, subMonths, isSameMonth,
  eachDayOfInterval, startOfWeek, endOfWeek, getDay, getDate,
  subDays, startOfWeek as startWeek, isSameDay, parseISO
} from 'date-fns';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Table2 } from 'lucide-react';

import { Expense } from '@/types/expense';
import { categoryService } from '@/lib/category-service';
import { formatCurrency, formatCompactCurrency, cn, calculateUserShare } from '@/lib/utils';

interface ChartsProps {
  expenses: Expense[];
}

/* ────────────────────────────────────────────────────────────────
   Shared custom tooltip
   ──────────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────────
   Data table toggle wrapper
   ──────────────────────────────────────────────────────────────── */
function DataTableToggle({ children, headers, rows }: {
  children: React.ReactNode;
  headers: string[];
  rows: (string | number)[][];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {children}
      <button
        onClick={() => setOpen(o => !o)}
        className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-expanded={open}
      >
        <Table2 className="h-3 w-3" />
        {open ? 'Hide' : 'View'} Data Table
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-xl border border-border/40">
          <table className="w-full text-xs" aria-label="Chart data table">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                {headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-bold text-muted-foreground/70 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 tabular-nums whitespace-nowrap">
                      {typeof cell === 'number' ? formatCurrency(cell) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   1. Spending Trend Chart — with time-scale toggle
   ──────────────────────────────────────────────────────────────── */
export function SpendingTrendChart({ expenses }: ChartsProps) {
  const [scale, setScale] = useState<1 | 3 | 6 | 12>(6);

  const data = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), scale - 1),
      end: startOfMonth(now),
    });
    return months.map(m => {
      const monthExp = expenses.filter(e => isSameMonth(new Date(e.date), m));
      return {
        month: format(m, scale > 6 ? 'MMM yy' : 'MMM'),
        total: monthExp.reduce((s, e) => s + calculateUserShare(e), 0),
        reimbursed: monthExp.filter(e => e.status === 'reimbursed').reduce((s, e) => s + calculateUserShare(e), 0),
        pending: monthExp.filter(e => e.status === 'pending').reduce((s, e) => s + calculateUserShare(e), 0),
      };
    });
  }, [expenses, scale]);

  const currentTotal = data[data.length - 1]?.total || 0;
  const prevTotal = data[data.length - 2]?.total || 0;
  const delta = prevTotal ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

  const tableRows = data.map(d => [d.month, d.total, d.reimbursed, d.pending]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between px-1">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 mb-1">Total Spending</p>
          <p className="text-4xl font-black tracking-tighter number-lg">{formatCompactCurrency(currentTotal)}</p>
        </div>
        <div className="flex items-center gap-3">
          {prevTotal > 0 && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-black px-3 py-1.5 rounded-xl border shadow-inner",
              delta > 0 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20"
            )}>
              {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(delta).toFixed(1)}%
            </div>
          )}
          {/* Time scale pills */}
          <div className="flex gap-1">
            {([1, 3, 6, 12] as const).map(s => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={cn(
                  'text-[9px] font-black px-2.5 py-1 rounded-lg transition-all duration-150',
                  scale === s
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/70'
                )}
              >
                {s}M
              </button>
            ))}
          </div>
        </div>
      </div>

      <DataTableToggle
        headers={['Month', 'Total', 'Reimbursed', 'Pending']}
        rows={tableRows}
      >
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38 95% 58%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(38 95% 58%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground) / 0.5)' }}
                axisLine={false} tickLine={false} dy={10}
              />
              <YAxis
                tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground) / 0.5)' }}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => formatCompactCurrency(v)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Area
                type="monotone" dataKey="total" name="Total"
                stroke="hsl(var(--primary))" strokeWidth={4} fill="url(#totalGrad)"
                dot={false} activeDot={{ r: 6, fill: 'hsl(var(--primary))', stroke: '#fff', strokeWidth: 3 }}
                animationDuration={1500}
              />
              <Area
                type="monotone" dataKey="pending" name="Pending"
                stroke="hsl(38 95% 58%)" strokeWidth={3} fill="url(#pendingGrad)"
                dot={false} activeDot={{ r: 5, fill: 'hsl(38 95% 58%)', stroke: '#fff', strokeWidth: 2 }}
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DataTableToggle>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   2. Category Breakdown Chart (Donut + Legend)
   ──────────────────────────────────────────────────────────────── */
export function CategoryBreakdownChart({ expenses }: ChartsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const data = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(e => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + calculateUserShare(e);
    });
    return Object.entries(categoryTotals)
      .map(([catId, amount]) => {
        const cat = categoryService.getById(catId);
        return {
          name: cat.label || catId,
          value: amount,
          color: cat.gradientFrom || '#888',
          category: catId,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [expenses]);

  const total = data.reduce((s, d) => s + d.value, 0);
  const tableRows = data.map(d => [d.name, d.value, `${total > 0 ? Math.round((d.value / total) * 100) : 0}%`]);

  if (data.length === 0) return (
    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No data yet</div>
  );

  return (
    <DataTableToggle headers={['Category', 'Amount', 'Share']} rows={tableRows}>
      <div className="flex flex-col gap-4">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={85}
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.5}
                  stroke={activeIndex === i ? '#fff' : 'none'}
                  strokeWidth={activeIndex === i ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-2">
          {data.map((item, i) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center justify-between gap-3 rounded-xl px-3 py-1.5 transition-colors",
                activeIndex === i ? "bg-white/5" : ""
              )}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-muted-foreground truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-16 h-1 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: item.color }}
                  />
                </div>
                <span className="text-xs font-semibold tabular-nums w-20 text-right">{formatCompactCurrency(item.value)}</span>
                <span className="text-[10px] text-muted-foreground w-7 text-right">
                  {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DataTableToggle>
  );
}

/* ────────────────────────────────────────────────────────────────
   3. Monthly Breakdown Bar Chart — with drill-down
   ──────────────────────────────────────────────────────────────── */
export function MonthlyBarChart({ expenses }: ChartsProps) {
  const [drillMonth, setDrillMonth] = useState<string | null>(null);

  const monthData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 11),
      end: startOfMonth(now),
    });
    return months.map(m => {
      const monthExp = expenses.filter(e => isSameMonth(new Date(e.date), m));
      return {
        month: format(m, 'MMM'),
        fullMonth: format(m, 'MMMM yyyy'),
        monthKey: format(m, 'yyyy-MM'),
        pending: monthExp.filter(e => e.status === 'pending').reduce((s, e) => s + calculateUserShare(e), 0),
        approved: monthExp.filter(e => e.status === 'approved').reduce((s, e) => s + calculateUserShare(e), 0),
        reimbursed: monthExp.filter(e => e.status === 'reimbursed').reduce((s, e) => s + calculateUserShare(e), 0),
        total: monthExp.reduce((s, e) => s + calculateUserShare(e), 0),
      };
    });
  }, [expenses]);

  const drillData = useMemo(() => {
    if (!drillMonth) return [];
    const filtered = expenses.filter(e => e.date.startsWith(drillMonth));
    if (filtered.length === 0) return [];

    const byDay: Record<string, number> = {};
    filtered.forEach(e => {
      const day = e.date.substring(0, 10);
      byDay[day] = (byDay[day] || 0) + calculateUserShare(e);
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        day: format(new Date(date + 'T00:00:00'), 'd MMM'),
        amount,
      }));
  }, [expenses, drillMonth]);

  const tableRows = monthData.map(d => [d.fullMonth, d.total, d.pending, d.approved, d.reimbursed]);
  const drillRows = drillData.map(d => [d.day, d.amount]);

  if (drillMonth) {
    const selectedLabel = monthData.find(m => m.monthKey === drillMonth)?.fullMonth || drillMonth;
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setDrillMonth(null)}
            className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
          >
            ← All Months
          </button>
          <span className="text-[10px] text-muted-foreground">/</span>
          <span className="text-[10px] font-bold uppercase tracking-wider">{selectedLabel}</span>
        </div>
        <DataTableToggle headers={['Day', 'Amount']} rows={drillRows}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={drillData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" name="Spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DataTableToggle>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[10px] text-muted-foreground mb-3 px-1">Click a bar to drill into that month's daily breakdown</p>
      <DataTableToggle
        headers={['Month', 'Total', 'Pending', 'Approved', 'Reimbursed']}
        rows={tableRows}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={monthData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            barSize={10}
            barCategoryGap="25%"
            onClick={(data) => {
              if (data?.activePayload?.[0]) {
                const monthKey = monthData.find(m => m.month === data.activeLabel)?.monthKey;
                if (monthKey) setDrillMonth(monthKey);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.05)', cursor: 'pointer' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            <Bar dataKey="pending" name="Pending" fill="hsl(38 95% 58%)" radius={[3, 3, 0, 0]} style={{ cursor: 'pointer' }} />
            <Bar dataKey="approved" name="Approved" fill="hsl(152 68% 50%)" radius={[3, 3, 0, 0]} style={{ cursor: 'pointer' }} />
            <Bar dataKey="reimbursed" name="Reimbursed" fill="hsl(262 85% 65%)" radius={[3, 3, 0, 0]} style={{ cursor: 'pointer' }} />
          </BarChart>
        </ResponsiveContainer>
      </DataTableToggle>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   4. Category × Month Matrix — which category cost what per month
   ──────────────────────────────────────────────────────────────── */
export function CategoryMonthMatrix({ expenses }: ChartsProps) {
  const { data, topCats, months } = useMemo(() => {
    const now = new Date();
    const recentMonths = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 5),
      end: startOfMonth(now),
    });

    const catTotals: Record<string, number> = {};
    expenses.forEach(e => {
      catTotals[e.category] = (catTotals[e.category] || 0) + calculateUserShare(e);
    });
    const topCats = Object.entries(catTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat]) => {
        const cfg = categoryService.getById(cat);
        return { id: cat, label: cfg.label || cat, color: cfg.gradientFrom || '#888' };
      });

    const data = recentMonths.map(m => {
      const monthExp = expenses.filter(e => isSameMonth(new Date(e.date), m));
      const point: any = { month: format(m, 'MMM') };
      topCats.forEach(cat => {
        point[cat.label] = monthExp
          .filter(e => e.category === cat.id)
          .reduce((s, e) => s + calculateUserShare(e), 0);
      });
      return point;
    });

    return { data, topCats, months: recentMonths };
  }, [expenses]);

  if (topCats.length === 0) return (
    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">No data yet</div>
  );

  const tableHeaders = ['Month', ...topCats.map(c => c.label)];
  const tableRows = data.map(d => [d.month, ...topCats.map(c => d[c.label] || 0)]);

  return (
    <DataTableToggle headers={tableHeaders} rows={tableRows}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barSize={12} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCompactCurrency(v)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }} />
          {topCats.map(cat => (
            <Bar
              key={cat.id}
              dataKey={cat.label}
              fill={cat.color}
              radius={[3, 3, 0, 0]}
              stackId="stack"
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </DataTableToggle>
  );
}

/* ────────────────────────────────────────────────────────────────
   5. Weekly Spending Heatmap — last 12 weeks
   ──────────────────────────────────────────────────────────────── */
export function WeeklyHeatmap({ expenses }: ChartsProps) {
  const { weeks, maxAmount } = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 83); // ~12 weeks back

    // Build a map of date → total spend
    const dayMap: Record<string, number> = {};
    expenses.forEach(e => {
      const d = e.date.substring(0, 10);
      dayMap[d] = (dayMap[d] || 0) + calculateUserShare(e);
    });

    // Build 12 weeks × 7 days grid
    const weeks: { date: Date; amount: number; dateStr: string }[][] = [];
    let currentWeek: { date: Date; amount: number; dateStr: string }[] = [];

    const allDays = eachDayOfInterval({ start, end: today });
    allDays.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const amount = dayMap[dateStr] || 0;
      const dow = getDay(day); // 0=Sun

      if (dow === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push({ date: day, amount, dateStr });
    });
    if (currentWeek.length > 0) weeks.push(currentWeek);

    const maxAmount = Math.max(...Object.values(dayMap), 1);
    return { weeks, maxAmount };
  }, [expenses]);

  const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const getColor = (amount: number) => {
    if (amount === 0) return 'hsl(var(--muted) / 0.3)';
    const intensity = Math.min(amount / maxAmount, 1);
    if (intensity < 0.25) return 'hsl(262 85% 65% / 0.25)';
    if (intensity < 0.5) return 'hsl(262 85% 65% / 0.5)';
    if (intensity < 0.75) return 'hsl(262 85% 65% / 0.75)';
    return 'hsl(262 85% 65%)';
  };

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1" role="grid" aria-label="Weekly spending heatmap">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 mr-1 shrink-0">
          <div className="h-3" />
          {DOW_LABELS.map((d, i) => (
            <div key={i} className="h-[14px] flex items-center text-[8px] text-muted-foreground/50 w-3">{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1 shrink-0" role="row">
            {/* Month label for first day */}
            <div className="h-3 text-[8px] text-muted-foreground/50 text-center">
              {week[0] && getDate(week[0].date) <= 7 ? format(week[0].date, 'MMM') : ''}
            </div>
            {week.map((day, di) => (
              <div
                key={di}
                role="gridcell"
                className="h-[14px] w-[14px] rounded-[3px] transition-all duration-150 hover:scale-110 hover:ring-1 hover:ring-primary/50 cursor-default"
                style={{ backgroundColor: getColor(day.amount) }}
                title={day.amount > 0 ? `${format(day.date, 'dd MMM')}: ${formatCurrency(day.amount)}` : format(day.date, 'dd MMM')}
                aria-label={day.amount > 0 ? `${format(day.date, 'dd MMM')}: ${formatCurrency(day.amount)}` : `${format(day.date, 'dd MMM')}: no spending`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-muted-foreground/50">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((intensity, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded-sm"
            style={{
              backgroundColor: intensity === 0
                ? 'hsl(var(--muted) / 0.3)'
                : `hsl(262 85% 65% / ${intensity})`
            }}
          />
        ))}
        <span className="text-[9px] text-muted-foreground/50">More</span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   6. Vehicle charts (unchanged)
   ──────────────────────────────────────────────────────────────── */
export function VehicleEfficiencyChart({ logs, vehicles }: { logs: any[], vehicles: any[] }) {
  const data = useMemo(() => {
    const dates = Array.from(new Set(logs.filter(l => l.economy).map(l => format(new Date(l.date), 'dd MMM')))).reverse();
    return dates.map(date => {
      const point: any = { date };
      vehicles.forEach(v => {
        const vLog = logs.find(l => l.vehicleId === v.id && format(new Date(l.date), 'dd MMM') === date);
        if (vLog?.economy) {
          point[v.name] = Number(vLog.economy.toFixed(1));
        }
      });
      return point;
    });
  }, [logs, vehicles]);

  if (logs.filter(l => l.economy).length < 2) return (
    <div className="h-48 flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-2xl">
      Need 2+ logs with economy data to show trend
    </div>
  );

  const COLORS = ['hsl(142 71% 45%)', 'hsl(262 85% 65%)', 'hsl(38 95% 58%)', 'hsl(199 89% 48%)'];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          {vehicles.map((v, i) => (
            <linearGradient key={v.id} id={`ecoGrad-${v.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2} />
              <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
        <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '12px', fontSize: '10px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
        />
        {vehicles.map((v, i) => (
          <Area
            key={v.id}
            type="monotone"
            dataKey={v.name}
            name={v.name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={3}
            fill={`url(#ecoGrad-${v.id})`}
            dot={{ r: 3, fill: COLORS[i % COLORS.length], strokeWidth: 0 }}
            activeDot={{ r: 5, fill: COLORS[i % COLORS.length] }}
          />
        ))}
        {vehicles.length > 1 && <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function FuelCostChart({ logs }: { logs: any[] }) {
  const data = useMemo(() => {
    return [...logs]
      .slice(0, 10)
      .reverse()
      .map(l => ({
        date: format(new Date(l.date), 'dd MMM'),
        cost: l.totalCost
      }));
  }, [logs]);

  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.4)" />
        <XAxis dataKey="date" hide />
        <YAxis hide />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: 'none', borderRadius: '12px', fontSize: '10px' }}
          formatter={(v: number) => `₹${v}`}
        />
        <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
