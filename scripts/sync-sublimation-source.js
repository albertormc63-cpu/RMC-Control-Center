require("dotenv").config();

const db = require("../src/db");
const {
  syncPrintSublimationSource
} = require("../src/services/printSublimationSync");

function getDefaultSourceId() {
  const source = db.prepare(`
    SELECT id
    FROM rmc_external_sources
    WHERE source_type = 'sublimation_output_excel'
    AND file_path = '/Volumes/Carpeta de sublimado/PRODUCCION SUBLIMADO3.xlsb'
    ORDER BY id DESC
    LIMIT 1
  `).get();

  if (!source) {
    throw new Error(
      "No está registrada la fuente de Sublimado. Ejecuta: node scripts/register-sublimation-source.js"
    );
  }

  return source.id;
}

const sourceId = Number(process.argv[2] || getDefaultSourceId());

console.log("Sincronizando fuente externa de Sublimado ID:", sourceId);

try {
  const result = syncPrintSublimationSource(sourceId);

  console.log("");
  console.log("Archivo:");
  console.log(result.file);

  console.log("");
  console.log("Resumen sync:");
  console.table(result.summary);

  console.log("");
  console.log("Sync de Sublimado terminado correctamente.");
} catch (error) {
  console.error("");
  console.error("Error sincronizando fuente de Sublimado:");
  console.error(error.message);
  process.exit(1);
}
