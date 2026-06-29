require("dotenv").config();

const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = process.env.RMC_DB_PATH;

if (!dbPath) {
  throw new Error("Falta configurar RMC_DB_PATH en .env");
}

const db = new Database(dbPath, {
  fileMustExist: true
});

const source = {
  name: "Produccion Sublimado - Liberado a Linea",
  area: "Sublimado",
  source_type: "sublimation_output_excel",
  file_path: "/Volumes/Carpeta de sublimado/PRODUCCION SUBLIMADO3.xlsb",
  sheet_name: "LIBERADO A LINEA"
};

console.log("Registrando fuente externa:");
console.log(source);

const existsOnDisk = fs.existsSync(source.file_path);

if (!existsOnDisk) {
  console.warn("");
  console.warn("ADVERTENCIA:");
  console.warn("El archivo no existe o el volumen no está montado:");
  console.warn(source.file_path);
  console.warn("");
  console.warn("Aun así se registrará la fuente en BD.");
  console.warn("Después podremos sincronizar cuando el volumen esté disponible.");
}

const existing = db.prepare(`
  SELECT *
  FROM rmc_external_sources
  WHERE source_type = ?
  AND file_path = ?
`).get(source.source_type, source.file_path);

if (existing) {
  db.prepare(`
    UPDATE rmc_external_sources
    SET
      name = ?,
      area = ?,
      sheet_name = ?,
      active = 1,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    source.name,
    source.area,
    source.sheet_name,
    existing.id
  );

  console.log("");
  console.log("Fuente ya existía. Se actualizó:");
  console.log("ID:", existing.id);
} else {
  const result = db.prepare(`
    INSERT INTO rmc_external_sources (
      name,
      area,
      source_type,
      file_path,
      sheet_name,
      active
    )
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    source.name,
    source.area,
    source.source_type,
    source.file_path,
    source.sheet_name
  );

  console.log("");
  console.log("Fuente registrada correctamente:");
  console.log("ID:", result.lastInsertRowid);
}

const rows = db.prepare(`
  SELECT
    id,
    name,
    area,
    source_type,
    file_path,
    sheet_name,
    active,
    last_sync_at,
    last_status
  FROM rmc_external_sources
  ORDER BY id
`).all();

console.log("");
console.log("Fuentes registradas:");
console.table(rows);

db.close();
