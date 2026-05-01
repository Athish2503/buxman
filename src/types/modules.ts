export interface VehicleRate {
  id: string;
  name: string;
  ratePerKm: number; // for reimbursement
  icon: 'car' | 'bike';
  initialOdometer?: number; // for Fuelio tracking
}

export interface FuelLog {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  isFullTank: boolean;
  notes?: string;
  
  // Computed (set during save or calculation)
  distanceSinceLast?: number;
  economy?: number; // km per liter
  
  createdAt: string;
}

export interface MileageLog {
  id: string;
  date: string;
  vehicleId: string;
  distance: number;
  rateApplied: number;
  totalAmount: number;
  purpose: string;
  isBilled: boolean;
  expenseId?: string; 
  createdAt: string;
}

export interface ReceiptDraft {
  id: string;
  imageUri: string; // Base64 or local uri
  createdAt: string;
}
