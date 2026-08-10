require("dotenv").config();

const db = require("../src/db");
const {
  LABEL_DELIVERY_SOURCE_TYPE,
  previewPrintSublimationSource
} = require("../src/services/printSublimationSync");

const source = db.prepare(`
  SELECT *
  FROM rmc_external_sources
  WHERE source_type = ?
  ORDER BY id DESC
  LIMIT 1
`).get(LABEL_DELIVERY_SOURCE_TYPE);

if (!source) {
  throw new Error("No hay fuente registrada para Registro de impresion de etiquetas");
}

const preview = previewPrintSublimationSource(source.id);

console.log("Fuente:", {
  id: source.id,
  name: source.name,
  file_path: source.file_path,
  sheet_name: source.sheet_name
});
console.log("Archivo:", preview.file);
console.log("Encabezados esperados:", preview.expectedHeaders);
console.log("Encabezados leidos:", preview.headers);
console.log("Filas leidas:", preview.rows_read);
console.log("Filas validas:", preview.rows_valid);
console.log("Muestra:");
console.table(preview.sample_rows);
