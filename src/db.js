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

module.exports = db;
