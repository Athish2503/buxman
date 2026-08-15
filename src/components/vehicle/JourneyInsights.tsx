import React from 'react';
import { FuelLog } from '@/types/modules';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, IndianRupee, Zap, Gauge } from 'lucide-react';

interface JourneyInsightsProps {
  logs: FuelLog[];
  stats: {
    avgEconomy: number;
    totalSpent: number;
    totalDist: number;
    costPerKm: number;
  } | null;
}

export const JourneyInsights: React.FC<JourneyInsightsProps> = ({ logs, stats }) => {
  if (!logs.length) return null;

  // Calculate best economy log
  const economyLogs = logs.filter(l => l.economy);
  const bestEconomyLog = economyLogs.length
    ? [...economyLogs].sort((a, b) => (b.economy || 0) - (a.economy || 0))[0]
    : null;

  // Chart data for economy trend (chronological)
  const chartData = [...logs]
    .filter(l => l.economy)
    .reverse()
    .slice(-10)
    .map(l => ({
      date: format(new Date(l.date), 'dd MMM'),
      economy: Number(l.economy?.toFixed(1)),
    }));

  return (
    <div className="space-y-4 pt-2">
      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 px-1">
        Journey Insights
      </h3>

      {/* Horizontally Scrollable Insight Cards */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
        {/* BEST ECONOMY CARD */}
        <div className="min-w-[150px] p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-2">
            <Zap className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Best Economy
            </span>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-emerald-400">
              {bestEconomyLog?.economy ? bestEconomyLog.economy.toFixed(1) : '--'}
            </p>
            <p className="text-[9px] font-bold text-slate-400 opacity-80 mt-0.5">
              {bestEconomyLog ? format(new Date(bestEconomyLog.date), 'dd MMM yyyy') : 'N/A'}
            </p>
          </div>
        </div>

        {/* TOTAL SPEND CARD */}
        <div className="min-w-[150px] p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-1.5 text-amber-400 mb-2">
            <IndianRupee className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Total Spend
            </span>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-slate-100">
              {formatCurrency(stats?.totalSpent || 0)}
            </p>
            <p className="text-[9px] font-bold text-slate-400 opacity-80 mt-0.5">
              {logs.length} Refills
            </p>
          </div>
        </div>

        {/* AVG ECONOMY CARD */}
        <div className="min-w-[150px] p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-1.5 text-sky-400 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Avg Economy
            </span>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-sky-400">
              {stats?.avgEconomy ? stats.avgEconomy.toFixed(1) : '--'}
            </p>
            <p className="text-[9px] font-bold text-slate-400 opacity-80 mt-0.5">
              km per Liter
            </p>
          </div>
        </div>

        {/* COST PER KM CARD */}
        <div className="min-w-[150px] p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between shadow-xl">
          <div className="flex items-center gap-1.5 text-purple-400 mb-2">
            <Gauge className="h-4 w-4" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Cost / KM
            </span>
          </div>
          <div>
            <p className="text-2xl font-black font-mono text-purple-300">
              ₹{stats?.costPerKm ? stats.costPerKm.toFixed(2) : '0.00'}
            </p>
            <p className="text-[9px] font-bold text-slate-400 opacity-80 mt-0.5">
              Per Kilometer
            </p>
          </div>
        </div>
      </div>

      {/* Economy Trend Compact Chart */}
      {chartData.length >= 2 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Efficiency Trend (km/l)
            </h4>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
              Telemetry
            </span>
          </div>

          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="economyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }}
                />
                <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#090d16',
                    border: '1px solid #1e293b',
                    borderRadius: '12px',
                    fontSize: '10px',
                  }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area
                  type="monotone"
                  dataKey="economy"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#economyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
