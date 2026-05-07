import { SQLiteDBConnection } from '@capacitor-community/sqlite';

export async function up(db: SQLiteDBConnection): Promise<void> {
  // 1. Vehicles table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rate_per_km REAL DEFAULT 0,
      icon TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Mileage Logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS mileage_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      start_km REAL DEFAULT 0,
      end_km REAL DEFAULT 0,
      total_km REAL DEFAULT 0,
      purpose TEXT,
      timestamp DATETIME NOT NULL,
      is_billed INTEGER DEFAULT 0,
      expense_id TEXT,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );
  `);

  // 3. Fuel Logs
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fuel_logs (
      id TEXT PRIMARY KEY,
      vehicle_id TEXT NOT NULL,
      odometer REAL NOT NULL,
      liters REAL NOT NULL,
      price_per_liter REAL NOT NULL,
      total_cost REAL NOT NULL,
      station TEXT,
      timestamp DATETIME NOT NULL,
      distance_since_last REAL,
      economy REAL,
      economy_trend REAL,
      is_full_tank INTEGER DEFAULT 1,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    );
  `);

  // 4. Wallet (Receipt Drafts)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      image_uri TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      processed_status TEXT DEFAULT 'pending',
      amount REAL,
      merchant TEXT,
      date TEXT
    );
  `);
}

export async function down(db: SQLiteDBConnection): Promise<void> {
  await db.execute('DROP TABLE IF EXISTS receipts;');
  await db.execute('DROP TABLE IF EXISTS fuel_logs;');
  await db.execute('DROP TABLE IF EXISTS mileage_logs;');
  await db.execute('DROP TABLE IF EXISTS vehicles;');
}
