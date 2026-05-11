import { MileageLog, ReceiptDraft, VehicleRate, FuelLog } from '@/types/modules';
import { storageEngine } from '@/lib/storage-engine';
import { notificationService } from './notifications';

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
    const all = [log, ...this.getLogs()];
    this.saveAll(all);
  },
  
  updateLog(updated: FuelLog) {
    const all = this.getLogs().map(l => l.id === updated.id ? updated : l);
    this.saveAll(all);
  },

  saveAll(logs: FuelLog[]) {
    // Re-calculate all economy/distance stats whenever list changes to ensure accuracy
    // Sort by odometer ascending first to calculate forwards
    const sorted = [...logs].sort((a, b) => a.odometer - b.odometer);
    
    const processed = sorted.map((log, index) => {
      const prev = sorted.slice(0, index).reverse().find(l => l.vehicleId === log.vehicleId);
      
      if (prev) {
        log.distanceSinceLast = log.odometer - prev.odometer;
        
        // Calculate economy: distance since last / liters added this time
        // This provides an "interval efficiency" estimate even for partial fills
        if (log.liters > 0) {
          log.economy = log.distanceSinceLast / log.liters;
          
          // Calculate trend (comparison to previous log's economy)
          if (prev.economy) {
            const diff = log.economy - prev.economy;
            log.economyTrend = (diff / prev.economy) * 100;
          }
        }
      } else {
        log.distanceSinceLast = undefined;
        log.economy = undefined;
        log.economyTrend = undefined;
      }
      return log;
    });

    storageEngine.set(KEYS.fuel, JSON.stringify(processed));
  },
  
  removeLog(id: string) {
    const remaining = this.getLogs().filter(l => l.id !== id);
    this.saveAll(remaining);
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
    
    // Schedule reminders
    notificationService.scheduleWalletReminders(r.id, r.createdAt);
  },
  removeReceipt(id: string) {
    storageEngine.set(KEYS.wallet, JSON.stringify(this.getReceipts().filter(r => r.id !== id)));
    
    // Cancel reminders
    notificationService.cancelWalletReminders(id);
  },
  syncReminders() {
    const receipts = this.getReceipts();
    receipts.forEach(r => {
      notificationService.scheduleWalletReminders(r.id, r.createdAt);
    });
  }
};

