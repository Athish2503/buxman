import { dbService } from '../DatabaseService';
import { BaseRepository } from './BaseRepository';

export interface ReceiptRecord {
  id: string;
  image_uri: string;
  created_at: string;
  processed_status: string;
  amount?: number;
  merchant?: string;
  date?: string;
}

export class ReceiptRepository extends BaseRepository<ReceiptRecord> {
  constructor() {
    super('receipts');
  }

  async findAll(): Promise<ReceiptRecord[]> {
    const result = await dbService.query('SELECT * FROM receipts ORDER BY created_at DESC');
    return result.values || [];
  }
}

export const receiptRepo = new ReceiptRepository();
