import { dbService } from '../DatabaseService';
import { BaseRepository } from './BaseRepository';

export interface Vehicle {
  id: string;
  name: string;
  rate_per_km: number;
  icon?: string;
  created_at?: string;
}

export class VehicleRepository extends BaseRepository<Vehicle> {
  constructor() {
    super('vehicles');
  }

  async findAll(): Promise<Vehicle[]> {
    const result = await dbService.query('SELECT * FROM vehicles ORDER BY name ASC');
    return result.values || [];
  }
}

export const vehicleRepo = new VehicleRepository();
