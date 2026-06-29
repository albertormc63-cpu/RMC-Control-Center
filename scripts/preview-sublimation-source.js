require("dotenv").config();

const db = require("../src/db");
const {
  previewPrintSublimationSource
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

console.log("Leyendo fuente externa de Sublimado ID:", sourceId);

try {
  const result = previewPrintSublimationSource(sourceId);

  console.log("");
  console.log("Archivo:");
  console.log(result.file);

  console.log("");
  console.log("Encabezados detectados:");
  console.table(result.headers);

  console.log("");
  console.log("Resumen:");
  console.table({
    rows_read: result.rows_read,
    rows_valid: result.rows_valid
  });

  console.log("");
  console.log("Primeras filas válidas:");
  console.table(result.sample_rows.map((row) => ({
    source_row: row.source_row,
    work_order: row.work_order,
    style: row.style,
    pcs: row.pcs,
    maquina: row.maquina,
    fecha: row.fecha,
    embarque: row.embarque,
    hora_sale_almacen: row.hora_sale_almacen,
    natural_key: row.natural_key.slice(0, 80),
    row_hash: row.row_hash.slice(0, 16)
  })));

  console.log("");
  console.log("Preview terminado correctamente.");
} catch (error) {
  console.error("");
  console.error("Error leyendo fuente de Sublimado:");
  console.error(error.message);
  process.exit(1);
}
