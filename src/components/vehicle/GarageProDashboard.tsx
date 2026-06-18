import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Wrench, ShieldAlert, TrendingUp, Fuel, Calendar, Compass, ArrowRight, Settings2, Plus, Sparkles } from 'lucide-react';
import { VehicleRate, FuelLog } from '@/types/modules';
import { formatCurrency, cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { mileageService } from '@/lib/modules-storage';
import { toast } from 'sonner';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { HeroSection } from './HeroSection';

interface GarageProDashboardProps {
  vehicle: VehicleRate;
  logs: FuelLog[];
  stats: {
    avgEconomy: number;
    totalSpent: number;
    totalDist: number;
    costPerKm: number;
  } | null;
  onAddLog: () => void;
  onManage: () => void;
  viewMode: 'roadway' | 'garage' | 'simple';
  onViewModeChange: (mode: 'roadway' | 'garage' | 'simple') => void;
  onRefresh: () => void;
}

interface RadialGaugeProps {
  percentage: number;
  label: string;
  sublabel: string;
  colorClass: string;
  icon: React.ReactNode;
  alert?: boolean;
  onClickSetup?: () => void;
}

const RadialGauge: React.FC<RadialGaugeProps> = ({ 
  percentage, label, sublabel, colorClass, icon, alert, onClickSetup 
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-5 rounded-xl bg-card border border-border relative overflow-hidden group min-h-[220px] shadow-sm transition-colors duration-200 hover:border-primary/30">
      {percentage === 0 && onClickSetup ? (
        <div className="flex flex-col items-center justify-center text-center space-y-3 z-10">
          <div className="h-12 w-12 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground">
            {icon}
          </div>
          <div>
            <h5 className="text-sm font-semibold tracking-tight text-foreground">{label}</h5>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>
          </div>
          <button 
            onClick={onClickSetup}
            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider hover:bg-primary/20 active:scale-95 transition-all"
          >
            Configure
          </button>
        </div>
      ) : (
        <div className="relative w-32 h-32 flex items-center justify-center z-10">
          <svg className="w-full h-full transform -rotate-90">
            {/* Track Circle */}
            <circle
              cx="64"
              cy="64"
              r="52"
              className="stroke-border fill-transparent"
              strokeWidth="8"
            />
            {/* Active Indicator Ring */}
            <motion.circle
              cx="64"
              cy="64"
              r="52"
              className={cn("fill-transparent transition-all duration-1000 ease-out", colorClass)}
              strokeWidth="8"
              strokeDasharray="326.7" // 2 * Math.PI * 52
              initial={{ strokeDashoffset: 326.7 }}
              animate={{ strokeDashoffset: 326.7 - (326.7 * percentage) / 100 }}
              strokeLinecap="round"
            />
          </svg>
          
          <div className="absolute flex flex-col items-center justify-center text-center">
            <div className="mb-0.5 opacity-80">{icon}</div>
            <span className="text-xl font-bold font-mono tracking-tight leading-none">{label}</span>
            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-1.5">{sublabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const GarageProDashboard: React.FC<GarageProDashboardProps> = ({
  vehicle, logs, stats, onAddLog, onManage, viewMode, onViewModeChange, onRefresh
}) => {
  const latestOdo = logs.length > 0 ? logs[0].odometer : 0;

  // 1. Service Health Calculations
  const serviceInterval = vehicle.serviceInterval;
  const lastServiceOdo = vehicle.lastServiceOdo || 0;
  const kmsSinceService = Math.max(0, latestOdo - lastServiceOdo);
  const hasServiceConfig = !!serviceInterval;

  const { servicePct, serviceColor, serviceLabel, serviceSub, needsService } = useMemo(() => {
    if (!hasServiceConfig) {
      return { 
        servicePct: 0, 
        serviceColor: "stroke-muted", 
        serviceLabel: "Setup Service", 
        serviceSub: "Required",
        needsService: false
      };
    }

    const remaining = Math.max(0, serviceInterval - kmsSinceService);
    const pct = Math.max(0, Math.min(100, (remaining / serviceInterval) * 100));
    const overdue = kmsSinceService >= serviceInterval;

    let color = "stroke-success";
    let labelText = `${Math.round(pct)}%`;
    let sub = `${remaining.toLocaleString()} km left`;

    if (overdue) {
      color = "stroke-destructive animate-pulse";
      labelText = "DUE";
      sub = `Overdue by ${(kmsSinceService - serviceInterval).toLocaleString()} km`;
    } else if (pct < 30) {
      color = "stroke-destructive animate-pulse";
      sub = `Due in ${remaining.toLocaleString()} km`;
    } else if (pct < 70) {
      color = "stroke-warning";
      sub = `Healthy · ${remaining.toLocaleString()} km`;
    }

    return { 
      servicePct: pct, 
      serviceColor: color, 
      serviceLabel: labelText, 
      serviceSub: sub,
      needsService: overdue || pct < 30
    };
  }, [hasServiceConfig, serviceInterval, kmsSinceService]);

  // 2. Insurance Calculations
  const insuranceExpiry = vehicle.insuranceExpiry;
  const hasInsuranceConfig = !!insuranceExpiry;

  const { insurancePct, insuranceColor, insuranceLabel, insuranceSub, isInsuranceUrgent } = useMemo(() => {
    if (!hasInsuranceConfig) {
      return {
        insurancePct: 0,
        insuranceColor: "stroke-muted",
        insuranceLabel: "Setup Expiry",
        insuranceSub: "Required",
        isInsuranceUrgent: false
      };
    }

    const days = Math.ceil((new Date(insuranceExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const expired = days <= 0;
    const pct = expired ? 0 : Math.max(0, Math.min(100, (days / 365) * 100));

    let color = "stroke-success";
    let labelText = `${days} Days`;
    let sub = `Expires ${format(new Date(insuranceExpiry), 'dd MMM yy')}`;

    if (expired) {
      color = "stroke-destructive animate-pulse";
      labelText = "EXPIRED";
      sub = "Renew Immediately";
    } else if (days <= 30) {
      color = "stroke-warning";
      sub = `${days} Days Left`;
    }

    return {
      insurancePct: expired ? 1 : pct, // Small value to show red ring outline
      insuranceColor: color,
      insuranceLabel: labelText,
      insuranceSub: sub,
      isInsuranceUrgent: expired || days <= 30
    };
  }, [hasInsuranceConfig, insuranceExpiry]);

  // 3. Price-per-Liter historical trend line
  const priceTrendData = useMemo(() => {
    return [...logs]
      .filter(l => l.pricePerLiter)
      .reverse() // chronologically oldest first
      .slice(-8)
      .map(l => ({
        date: format(new Date(l.date), 'dd MMM'),
        price: l.pricePerLiter
      }));
  }, [logs]);

  // 4. Secondary statistics
  const avgLiters = useMemo(() => {
    if (!logs.length) return 0;
    return logs.reduce((s, l) => s + l.liters, 0) / logs.length;
  }, [logs]);

  const priceVariance = useMemo(() => {
    const priced = logs.filter(l => l.pricePerLiter);
    if (priced.length < 2) return null;
    const avg = priced.reduce((s, l) => s + l.pricePerLiter, 0) / priced.length;
    const latest = priced[0].pricePerLiter;
    const diffPct = ((latest - avg) / avg) * 100;
    return { diffPct, latest, avg };
  }, [logs]);

  // Interactive reset logic
  const handleMarkServiced = () => {
    if (!serviceInterval) {
      toast.error('Please configure a service interval in vehicle settings first.');
      return;
    }

    const updatedVehicle: VehicleRate = {
      ...vehicle,
      lastServiceOdo: latestOdo
    };

    const vehicles = mileageService.getVehicles();
    const updatedList = vehicles.map(v => v.id === vehicle.id ? updatedVehicle : v);
    
    mileageService.saveVehicles(updatedList);
    haptics.success();
    toast.success('Vehicle marked as serviced! Odometer logged at ' + latestOdo.toLocaleString() + ' KM.');
    onRefresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-40 relative">
      <HeroSection 
        vehicle={vehicle} 
        logs={logs} 
        stats={stats} 
        onManage={onManage}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      <div className="px-6 space-y-6 -mt-10 relative z-20">
        
        {/* Visual Gauges HUD */}
        <div className="grid grid-cols-2 gap-4">
          <RadialGauge 
            percentage={servicePct}
            label={serviceLabel}
            sublabel={serviceSub}
            colorClass={serviceColor}
            alert={needsService}
            onClickSetup={onManage}
            icon={<Wrench className={cn("h-5 w-5", needsService ? "text-destructive" : "text-primary")} />}
          />
          <RadialGauge 
            percentage={insurancePct}
            label={insuranceLabel}
            sublabel={insuranceSub}
            colorClass={insuranceColor}
            alert={isInsuranceUrgent}
            onClickSetup={onManage}
            icon={<ShieldAlert className={cn("h-5 w-5", isInsuranceUrgent ? "text-destructive" : "text-primary")} />}
          />
        </div>

        {/* Quick Action Button for Service Reset */}
        {hasServiceConfig && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-card border border-border flex items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Serviced Vehicle?</h4>
                <p className="text-[10px] text-muted-foreground">Log today's mileage as service mark</p>
              </div>
            </div>
            <button
              onClick={handleMarkServiced}
              className="px-4 py-2 bg-success text-success-foreground hover:bg-success/90 rounded-lg text-[10px] font-bold uppercase tracking-widest shadow-sm active:scale-95 transition-all"
            >
              Reset Health
            </button>
          </motion.div>
        )}

        {/* Historical Price Chart */}
        {priceTrendData.length >= 2 ? (
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Fuel className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Price per Liter Trend</h4>
                  <p className="text-[10px] text-muted-foreground">Historical pricing dynamics</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                  Rupees (₹)
                </span>
              </div>
            </div>
            
            <div className="h-40 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={priceTrendData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.3)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: '500'}} 
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{fontSize: 9, fill: 'hsl(var(--muted-foreground))', fontWeight: '500'}}
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: 'var(--radius)', 
                      fontSize: '10px' 
                    }}
                    itemStyle={{ color: 'hsl(var(--primary))', fontWeight: '600' }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: '600', marginBottom: '4px' }}
                    formatter={(value: any) => [`₹${value}/L`, 'Price']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorPrice)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/10 p-8 text-center py-10">
            <Fuel className="h-8 w-8 text-muted-foreground/45 mx-auto mb-3" />
            <p className="text-xs font-semibold text-muted-foreground">Log more fuel entries to unlock price trends!</p>
            <p className="text-[9px] text-muted-foreground mt-1 uppercase tracking-wider">Historical chart requires at least 2 priced logs</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Avg. Volume / Fill</p>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold font-mono tracking-tight text-foreground">{avgLiters ? avgLiters.toFixed(1) : '--'}</span>
              <span className="text-[10px] font-medium text-muted-foreground">Liters</span>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between shadow-sm">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Price Deviation</p>
            {priceVariance ? (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold font-mono tracking-tight text-foreground">
                    {priceVariance.diffPct > 0 ? '+' : ''}{priceVariance.diffPct.toFixed(1)}%
                  </span>
                </div>
                <span className={cn(
                  "text-[8px] font-bold uppercase mt-1 tracking-wider",
                  priceVariance.diffPct > 0 ? "text-destructive" : "text-success"
                )}>
                  {priceVariance.diffPct > 0 ? 'Fuel is more expensive' : 'Fuel is cheaper than avg'}
                </span>
              </div>
            ) : (
              <div className="flex items-baseline">
                <span className="text-xs font-semibold text-muted-foreground/40 uppercase tracking-widest">Awaiting Logs</span>
              </div>
            )}
          </div>
        </div>

        {/* Add Entry Quick Trigger */}
        <button 
          onClick={onAddLog}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 font-semibold flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] transition-all"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Log New Fuel Entry
        </button>

      </div>
    </div>
  );
};
