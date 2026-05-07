export const INITIAL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    merchant TEXT,
    category_id TEXT,
    account_id TEXT,
    type TEXT CHECK(type IN ('income', 'expense', 'transfer')) NOT NULL,
    is_reimbursement INTEGER DEFAULT 0,
    timestamp DATETIME NOT NULL,
    notes TEXT,
    source TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL,
    FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    amount REAL NOT NULL,
    period TEXT CHECK(period IN ('monthly', 'weekly', 'yearly')) NOT NULL,
    start_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transaction_tags (
    transaction_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (transaction_id, tag_id),
    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS transaction_attachments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    file_uri TEXT NOT NULL,
    file_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS notification_metadata (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    raw_data TEXT,
    source_app TEXT,
    detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT CHECK(action IN ('create', 'update', 'delete')) NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    synced_at DATETIME
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
  CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);
`;

export const MIGRATIONS = [
  {
    version: 1,
    statements: [INITIAL_SCHEMA]
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        rate_per_km REAL DEFAULT 0,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS mileage_logs (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL,
        start_km REAL DEFAULT 0,
        end_km REAL DEFAULT 0,
        total_km REAL DEFAULT 0,
        purpose TEXT,
        timestamp DATETIME NOT NULL,
        is_billed INTEGER DEFAULT 0,
        expense_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      );`,
      `CREATE TABLE IF NOT EXISTS fuel_logs (
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      );`,
      `CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        image_uri TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_status TEXT DEFAULT 'pending',
        amount REAL,
        merchant TEXT,
        date TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    ]
  },
  {
    version: 3,
    statements: [
      `ALTER TABLE transactions ADD COLUMN is_reimbursement INTEGER DEFAULT 0;`
    ]
  },
  {
    version: 4,
    statements: [
      `ALTER TABLE vehicles ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE mileage_logs ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE mileage_logs ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE fuel_logs ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE fuel_logs ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;`,
      `ALTER TABLE receipts ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;`
    ]
  }
];
