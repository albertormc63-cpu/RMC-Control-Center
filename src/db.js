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

module.exports = db;
