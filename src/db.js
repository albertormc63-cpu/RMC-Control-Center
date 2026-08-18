require("dotenv").config();

const Database = require("better-sqlite3");

// Ruta centralizada de la BD compartida entre las herramientas CEP.
const dbPath = process.env.RMC_DB_PATH;

if (!dbPath) {
  throw new Error("Falta configurar RMC_DB_PATH en .env");
}

// La BD se abre en modo lectura/escritura porque CEP Registry permite registrar apps.
// Las rutas operativas siguen usando consultas preparadas para limitar el alcance.
const db = new Database(dbPath, {
  fileMustExist: true
});

// Cuando el worker de sync esta escribiendo, las lecturas del panel esperan
// brevemente en vez de fallar por un lock corto de SQLite.
db.pragma(`busy_timeout = ${Number(process.env.RMC_DB_BUSY_TIMEOUT_MS) || 5000}`);

function ensureColumn(tableName, columnName, columnDefinition) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
  }
}

ensureColumn("rmc_external_sources", "header_row_number", "INTEGER");
ensureColumn("rmc_external_sources", "data_start_row_number", "INTEGER");
ensureColumn("rmc_external_sources", "read_range", "TEXT");
ensureColumn("rmc_external_sources", "field_map_json", "TEXT");

module.exports = db;
