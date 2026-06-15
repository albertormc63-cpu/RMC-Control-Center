require("dotenv").config();

const Database = require("better-sqlite3");

const dbPath = process.env.RMC_DB_PATH;

if (!dbPath) {
  throw new Error("Falta configurar RMC_DB_PATH en .env");
}

const db = new Database(dbPath, {
  readonly: true,
  fileMustExist: true
});

module.exports = db;