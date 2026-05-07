import { dbService } from '../DatabaseService';
import { BaseRepository } from './BaseRepository';

export interface MileageLogRecord {
  id: string;
  vehicle_id: string;
  start_km: number;
  end_km: number;
  total_km: number;
  purpose?: string;
  timestamp: string;
  is_billed: number;
  expense_id?: string;
}

export class MileageRepository extends BaseRepository<MileageLogRecord> {
  constructor() {
    super('mileage_logs');
  }

  async findAll(): Promise<MileageLogRecord[]> {
    const result = await dbService.query('SELECT * FROM mileage_logs ORDER BY timestamp DESC');
    return result.values || [];
  }
}

export const mileageRepo = new MileageRepository();
