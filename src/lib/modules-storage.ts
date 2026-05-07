import { MileageLog, ReceiptDraft, VehicleRate, FuelLog } from '@/types/modules';
import { storageEngine } from '@/lib/storage-engine';
import { vehicleRepo } from '@/db/repositories/VehicleRepository';
import { mileageRepo } from '@/db/repositories/MileageRepository';
import { fuelRepo } from '@/db/repositories/FuelRepository';
import { receiptRepo } from '@/db/repositories/ReceiptRepository';
import { dataMigrationService } from './data-migration';

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
  async getVehicles(): Promise<VehicleRate[]> {
    if (await dataMigrationService.isSqliteActive()) {
      const vehicles = await vehicleRepo.findAll();
      return vehicles.map(v => ({
        id: v.id,
        name: v.name,
        ratePerKm: v.rate_per_km,
        icon: v.icon as any
      }));
    }
    try { 
      const v = localStorage.getItem(KEYS.vehicles);
      return v ? JSON.parse(v) : DEFAULT_VEHICLES;
    } catch { return DEFAULT_VEHICLES; }
  },
  async saveVehicles(items: VehicleRate[]) {
    if (await dataMigrationService.isSqliteActive()) {
      for (const v of items) {
        await vehicleRepo.create({
          id: v.id,
          name: v.name,
          rate_per_km: v.ratePerKm,
          icon: v.icon
        }).catch(() => vehicleRepo.update({
          id: v.id,
          name: v.name,
          rate_per_km: v.ratePerKm,
          icon: v.icon
        }));
      }
    }
    storageEngine.set(KEYS.vehicles, JSON.stringify(items));
  },
  
  async getLogs(): Promise<MileageLog[]> {
    if (await dataMigrationService.isSqliteActive()) {
      const logs = await mileageRepo.findAll();
      return logs.map(l => ({
        id: l.id,
        vehicleId: l.vehicle_id,
        startKm: l.start_km,
        endKm: l.end_km,
        totalKm: l.total_km,
        purpose: l.purpose,
        date: l.timestamp,
        isBilled: l.is_billed === 1,
        expenseId: l.expense_id
      }));
    }
    try { return JSON.parse(localStorage.getItem(KEYS.mileage) || '[]'); } 
    catch { return []; }
  },
  async addLog(log: MileageLog) {
    if (await dataMigrationService.isSqliteActive()) {
      await mileageRepo.create({
        id: log.id,
        vehicle_id: log.vehicleId,
        start_km: log.startKm,
        end_km: log.endKm,
        total_km: log.totalKm,
        purpose: log.purpose,
        timestamp: log.date,
        is_billed: log.isBilled ? 1 : 0,
        expense_id: log.expenseId
      });
    }
    const all = await this.getLogs();
    storageEngine.set(KEYS.mileage, JSON.stringify([log, ...all]));
  },
  async markBilled(logId: string, expenseId: string) {
    if (await dataMigrationService.isSqliteActive()) {
      await mileageRepo.update({ id: logId, is_billed: 1, expense_id: expenseId } as any);
    }
    const all = (await this.getLogs()).map(l => 
      l.id === logId ? { ...l, isBilled: true, expenseId } : l
    );
    storageEngine.set(KEYS.mileage, JSON.stringify(all));
  },
  async removeLog(id: string) {
    if (await dataMigrationService.isSqliteActive()) {
      await mileageRepo.delete(id);
    }
    const logs = await this.getLogs();
    storageEngine.set(KEYS.mileage, JSON.stringify(logs.filter(l => l.id !== id)));
  }
};

export const fuelService = {
  async getLogs(): Promise<FuelLog[]> {
    if (await dataMigrationService.isSqliteActive()) {
      const logs = await fuelRepo.findAll();
      return logs.map(l => ({
        id: l.id,
        vehicleId: l.vehicle_id,
        odometer: l.odometer,
        liters: l.liters,
        pricePerLiter: l.price_per_liter,
        totalCost: l.total_cost,
        station: l.station,
        date: l.timestamp,
        distanceSinceLast: l.distance_since_last,
        economy: l.economy,
        economyTrend: l.economy_trend,
        isFullTank: l.is_full_tank === 1
      }));
    }
    try { 
      const logs = JSON.parse(localStorage.getItem(KEYS.fuel) || '[]');
      return logs.sort((a: FuelLog, b: FuelLog) => b.odometer - a.odometer);
    } catch { return []; }
  },
  
  async addLog(log: FuelLog) {
    const all = [log, ...(await this.getLogs())];
    await this.saveAll(all);
  },
  
  async updateLog(updated: FuelLog) {
    const all = (await this.getLogs()).map(l => l.id === updated.id ? updated : l);
    await this.saveAll(all);
  },

  async saveAll(logs: FuelLog[]) {
    const sorted = [...logs].sort((a, b) => a.odometer - b.odometer);
    
    const processed = sorted.map((log, index) => {
      const prev = sorted.slice(0, index).reverse().find(l => l.vehicleId === log.vehicleId);
      
      if (prev) {
        log.distanceSinceLast = log.odometer - prev.odometer;
        if (log.liters > 0) {
          log.economy = log.distanceSinceLast / log.liters;
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

    if (await dataMigrationService.isSqliteActive()) {
      for (const log of processed) {
        await fuelRepo.create({
          id: log.id,
          vehicle_id: log.vehicleId,
          odometer: log.odometer,
          liters: log.liters,
          price_per_liter: log.pricePerLiter,
          total_cost: log.totalCost,
          station: log.station,
          timestamp: log.date,
          distance_since_last: log.distanceSinceLast,
          economy: log.economy,
          economy_trend: log.economyTrend,
          is_full_tank: log.isFullTank ? 1 : 0
        }).catch(() => fuelRepo.update({
          id: log.id,
          vehicle_id: log.vehicleId,
          odometer: log.odometer,
          liters: log.liters,
          price_per_liter: log.pricePerLiter,
          total_cost: log.totalCost,
          station: log.station,
          timestamp: log.date,
          distance_since_last: log.distanceSinceLast,
          economy: log.economy,
          economy_trend: log.economyTrend,
          is_full_tank: log.isFullTank ? 1 : 0
        }));
      }
    }

    storageEngine.set(KEYS.fuel, JSON.stringify(processed));
  },
  
  async removeLog(id: string) {
    if (await dataMigrationService.isSqliteActive()) {
      await fuelRepo.delete(id);
    }
    const remaining = (await this.getLogs()).filter(l => l.id !== id);
    await this.saveAll(remaining);
  }
};

export const walletService = {
  async getReceipts(): Promise<ReceiptDraft[]> {
    if (await dataMigrationService.isSqliteActive()) {
      const rs = await receiptRepo.findAll();
      return rs.map(r => ({
        id: r.id,
        imageUri: r.image_uri,
        createdAt: r.created_at
      }));
    }
    try { return JSON.parse(localStorage.getItem(KEYS.wallet) || '[]'); } 
    catch { return []; }
  },
  async addReceipt(imageUri: string) {
    const r: ReceiptDraft = { id: crypto.randomUUID(), imageUri, createdAt: new Date().toISOString() };
    if (await dataMigrationService.isSqliteActive()) {
      await receiptRepo.create({
        id: r.id,
        image_uri: r.imageUri,
        created_at: r.createdAt,
        processed_status: 'pending'
      });
    }
    const all = await this.getReceipts();
    storageEngine.set(KEYS.wallet, JSON.stringify([r, ...all]));
  },
  async removeReceipt(id: string) {
    if (await dataMigrationService.isSqliteActive()) {
      await receiptRepo.delete(id);
    }
    const receipts = await this.getReceipts();
    storageEngine.set(KEYS.wallet, JSON.stringify(receipts.filter(r => r.id !== id)));
  }
};
