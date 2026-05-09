import { VehicleTracker } from '@/components/fuel-tracker';

interface GarageModuleProps {
  vehicles: any[];
  logs: any[];
  onRefresh: () => void;
}

export function GarageModule({ vehicles, logs, onRefresh }: GarageModuleProps) {
  return (
    <div className="animate-in fade-in duration-500 space-y-5">
      <div className="mb-6 px-1">
        <h1 className="text-3xl font-black tracking-tight">Vehicle</h1>
        <p className="text-xs text-muted-foreground mt-1">Mileage logs and fuel efficiency analysis</p>
      </div>
      <VehicleTracker 
        vehicles={vehicles}
        logs={logs}
        onRefresh={onRefresh}
      />
    </div>
  );
}
