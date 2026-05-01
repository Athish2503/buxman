import { MileageLog, ReceiptDraft, VehicleRate, FuelLog } from '@/types/modules';
import { storageEngine } from '@/lib/storage-engine';

const KEYS = {
  vehicles: 'reimburse_vehicles_v1',
  mileage:  'reimburse_mileage_v1',
  wallet:   'reimburse_wallet_v1',
  fuel:     'reimburse_fuel_v1',
};

const DEFAULT_VEHICLES: VehicleRate[] = [
  { id: 'v1', name: 'Personal Car', ratePerKm: 12.00, icon: 'car' },
  { id: 'v2', name: 'Motorcycle',   ratePerKm: 6.00,  icon: 'bike' },
];

export const mileageService = {
  getVehicles(): VehicleRate[] {
    try { 
      const v = localStorage.getItem(KEYS.vehicles);
      return v ? JSON.parse(v) : DEFAULT_VEHICLES;
    } catch { return DEFAULT_VEHICLES; }
  },
  saveVehicles(items: VehicleRate[]) {
    storageEngine.set(KEYS.vehicles, JSON.stringify(items));
  },
  
  getLogs(): MileageLog[] {
    try { return JSON.parse(localStorage.getItem(KEYS.mileage) || '[]'); } 
    catch { return []; }
  },
  addLog(log: MileageLog) {
    const all = this.getLogs();
    storageEngine.set(KEYS.mileage, JSON.stringify([log, ...all]));
  },
  markBilled(logId: string, expenseId: string) {
    const all = this.getLogs().map(l => 
      l.id === logId ? { ...l, isBilled: true, expenseId } : l
    );
    storageEngine.set(KEYS.mileage, JSON.stringify(all));
  },
  removeLog(id: string) {
    storageEngine.set(KEYS.mileage, JSON.stringify(this.getLogs().filter(l => l.id !== id)));
  }
};

export const fuelService = {
  getLogs(): FuelLog[] {
    try { 
      const logs = JSON.parse(localStorage.getItem(KEYS.fuel) || '[]');
      // Sort descending by date/odometer
      return logs.sort((a: FuelLog, b: FuelLog) => b.odometer - a.odometer);
    } catch { return []; }
  },
  
  addLog(log: FuelLog) {
    let all = this.getLogs();
    
    // Calculate distance and economy if there's a previous log for this vehicle
    const vehicleLogs = all.filter(l => l.vehicleId === log.vehicleId).sort((a, b) => b.odometer - a.odometer);
    const prev = vehicleLogs.find(l => l.odometer < log.odometer);
    
    if (prev) {
      log.distanceSinceLast = log.odometer - prev.odometer;
      if (log.isFullTank && prev.isFullTank) {
        log.economy = log.distanceSinceLast / log.liters;
      }
    }
    
    all = [log, ...all];
    storageEngine.set(KEYS.fuel, JSON.stringify(all));
  },
  
  removeLog(id: string) {
    storageEngine.set(KEYS.fuel, JSON.stringify(this.getLogs().filter(l => l.id !== id)));
  }
};

export const walletService = {
  getReceipts(): ReceiptDraft[] {
    try { return JSON.parse(localStorage.getItem(KEYS.wallet) || '[]'); } 
    catch { return []; }
  },
  addReceipt(imageUri: string) {
    const r: ReceiptDraft = { id: crypto.randomUUID(), imageUri, createdAt: new Date().toISOString() };
    const all = this.getReceipts();
    storageEngine.set(KEYS.wallet, JSON.stringify([r, ...all]));
  },
  removeReceipt(id: string) {
    storageEngine.set(KEYS.wallet, JSON.stringify(this.getReceipts().filter(r => r.id !== id)));
  }
};
