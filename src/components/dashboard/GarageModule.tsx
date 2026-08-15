import { VehicleTracker } from '@/components/fuel-tracker';
import { Expense } from '@/types/expense';

interface GarageModuleProps {
  vehicles: any[];
  logs: any[];
  onRefresh: () => void;
  onAddExpense?: (expense: Expense) => void;
}

export function GarageModule({ vehicles, logs, onRefresh, onAddExpense }: GarageModuleProps) {
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
        onAddExpense={onAddExpense}
      />
    </div>
  );
}
