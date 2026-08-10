require("dotenv").config();

const db = require("../src/db");
const {
  LABEL_DELIVERY_SOURCE_TYPE,
  syncPrintSublimationSource
} = require("../src/services/printSublimationSync");

const sourceId = Number(process.argv[2]) || null;
const source = sourceId
  ? db.prepare(`
      SELECT *
      FROM rmc_external_sources
      WHERE id = ?
    `).get(sourceId)
  : db.prepare(`
      SELECT *
      FROM rmc_external_sources
      WHERE source_type = ?
      ORDER BY id DESC
      LIMIT 1
    `).get(LABEL_DELIVERY_SOURCE_TYPE);

if (!source) {
  throw new Error("No hay fuente registrada para Registro de impresion de etiquetas");
}

if (source.source_type !== LABEL_DELIVERY_SOURCE_TYPE) {
  throw new Error(`La fuente ${source.id} no es label_delivery_excel`);
}

console.log("Sincronizando fuente:", {
  id: source.id,
  name: source.name,
  file_path: source.file_path,
  sheet_name: source.sheet_name
});

const result = syncPrintSublimationSource(source.id);

console.log("Resultado:");
console.log(JSON.stringify(result, null, 2));
