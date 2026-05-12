export interface VehicleRate {
  id: string;
  name: string;
  ratePerKm: number; // for reimbursement
  icon: 'car' | 'bike';
  fuelType?: 'petrol' | 'diesel' | 'cng' | 'electric';
  licensePlate?: string;
  insuranceExpiry?: string;
  serviceInterval?: number; // km
  lastServiceOdo?: number;   // km
  defaultFuelPrice?: number; // for auto-filling
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
  station?: string;
  notes?: string;
  
  // Computed (set during save or calculation)
  distanceSinceLast?: number;
  economy?: number; // km per liter
  economyTrend?: number; // percentage change vs previous
  
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

export interface OdometerLog {
  id: string;
  vehicleId: string;
  date: string;
  reading: number;
  createdAt: string;
}

export interface ReceiptDraft {
  id: string;
  imageUri: string; // Base64 or local uri
  createdAt: string;
}
