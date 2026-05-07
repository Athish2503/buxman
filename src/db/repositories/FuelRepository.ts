import { dbService } from '../DatabaseService';
import { BaseRepository } from './BaseRepository';

export interface FuelLogRecord {
  id: string;
  vehicle_id: string;
  odometer: number;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  station?: string;
  timestamp: string;
  distance_since_last?: number;
  economy?: number;
  economy_trend?: number;
  is_full_tank: number;
}

export class FuelRepository extends BaseRepository<FuelLogRecord> {
  constructor() {
    super('fuel_logs');
  }

  async findAllByVehicle(vehicleId: string): Promise<FuelLogRecord[]> {
    const result = await dbService.query(
      'SELECT * FROM fuel_logs WHERE vehicle_id = ? ORDER BY odometer DESC',
      [vehicleId]
    );
    return result.values || [];
  }

  async findAll(): Promise<FuelLogRecord[]> {
    const result = await dbService.query('SELECT * FROM fuel_logs ORDER BY odometer DESC');
    return result.values || [];
  }
}

export const fuelRepo = new FuelRepository();
