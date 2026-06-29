require("dotenv").config();

const Database = require("better-sqlite3");

const dbPath = process.env.RMC_DB_PATH;

if (!dbPath) {
  throw new Error("Falta configurar RMC_DB_PATH en .env");
}

const db = new Database(dbPath, {
  fileMustExist: true
});

console.log("Usando BD:", dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS rmc_external_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL,
    area TEXT,
    source_type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    sheet_name TEXT,

    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),

    last_mtime_ms INTEGER,
    last_size_bytes INTEGER,
    last_sync_at TEXT,
    last_status TEXT,
    last_error TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rmc_sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    source_id INTEGER NOT NULL,

    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TEXT,
    status TEXT NOT NULL,

    rows_read INTEGER NOT NULL DEFAULT 0,
    rows_valid INTEGER NOT NULL DEFAULT 0,
    rows_inserted INTEGER NOT NULL DEFAULT 0,
    rows_updated INTEGER NOT NULL DEFAULT 0,
    rows_unchanged INTEGER NOT NULL DEFAULT 0,
    rows_missing INTEGER NOT NULL DEFAULT 0,
    rows_skipped INTEGER NOT NULL DEFAULT 0,

    error_message TEXT,

    FOREIGN KEY (source_id)
        REFERENCES rmc_external_sources (id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rmc_print_sublimation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    source_id INTEGER NOT NULL,

    type TEXT,
    plotter_number TEXT,
    work_order TEXT,
    style TEXT,
    roster TEXT,
    process TEXT,
    order_quantity INTEGER,
    fecha_impresion_papel TEXT,
    num_impresion_papel TEXT,
    disenador TEXT,
    impresor TEXT,
    fecha_embarque TEXT,

    source_file TEXT,
    source_sheet TEXT,
    source_row INTEGER,
    source_year TEXT,

    natural_key TEXT NOT NULL,
    row_hash TEXT NOT NULL,

    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_sync_id INTEGER,

    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    missing_since TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id)
        REFERENCES rmc_external_sources (id)
        ON DELETE CASCADE,

    FOREIGN KEY (last_seen_sync_id)
        REFERENCES rmc_sync_runs (id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rmc_sublimation_output_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    source_id INTEGER NOT NULL,

    fecha TEXT,
    work_order TEXT,
    style TEXT,
    pcs INTEGER,
    embarque TEXT,
    maquina TEXT,
    total_piezas TEXT,
    notas TEXT,
    hora_sale_almacen TEXT,

    source_file TEXT,
    source_sheet TEXT,
    source_row INTEGER,
    source_year TEXT,

    natural_key TEXT NOT NULL,
    row_hash TEXT NOT NULL,

    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_sync_id INTEGER,

    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    missing_since TEXT,

    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (source_id)
        REFERENCES rmc_external_sources (id)
        ON DELETE CASCADE,

    FOREIGN KEY (last_seen_sync_id)
        REFERENCES rmc_sync_runs (id)
        ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_print_sublimation_natural_key
ON rmc_print_sublimation_log (source_id, natural_key);

CREATE INDEX IF NOT EXISTS idx_print_sublimation_work_order
ON rmc_print_sublimation_log (work_order);

CREATE INDEX IF NOT EXISTS idx_print_sublimation_style
ON rmc_print_sublimation_log (style);

CREATE INDEX IF NOT EXISTS idx_print_sublimation_roster
ON rmc_print_sublimation_log (roster);

CREATE INDEX IF NOT EXISTS idx_print_sublimation_fecha_embarque
ON rmc_print_sublimation_log (fecha_embarque);

CREATE INDEX IF NOT EXISTS idx_print_sublimation_active
ON rmc_print_sublimation_log (is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sublimation_output_natural_key
ON rmc_sublimation_output_log (source_id, natural_key);

CREATE INDEX IF NOT EXISTS idx_sublimation_output_work_order
ON rmc_sublimation_output_log (work_order);

CREATE INDEX IF NOT EXISTS idx_sublimation_output_style
ON rmc_sublimation_output_log (style);

CREATE INDEX IF NOT EXISTS idx_sublimation_output_fecha
ON rmc_sublimation_output_log (fecha);

CREATE INDEX IF NOT EXISTS idx_sublimation_output_active
ON rmc_sublimation_output_log (is_active);

CREATE INDEX IF NOT EXISTS idx_sync_runs_source
ON rmc_sync_runs (source_id);

CREATE INDEX IF NOT EXISTS idx_external_sources_type
ON rmc_external_sources (source_type);
`);

function ensureColumn(tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

ensureColumn("rmc_sublimation_output_log", "hora_sale_almacen", "TEXT");

const tables = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table'
  AND name IN (
    'rmc_external_sources',
    'rmc_sync_runs',
    'rmc_print_sublimation_log',
    'rmc_sublimation_output_log'
  )
  ORDER BY name
`).all();

console.log("Tablas verificadas:");
for (const table of tables) {
  console.log("-", table.name);
}

db.close();

console.log("Listo. Tablas de sync creadas/verificadas correctamente.");
