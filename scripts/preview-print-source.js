require("dotenv").config();

const {
  previewPrintSublimationSource
} = require("../src/services/printSublimationSync");

const sourceId = Number(process.argv[2] || 1);

console.log("Leyendo fuente externa ID:", sourceId);

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
    roster: row.roster,
    process: row.process,
    order_quantity: row.order_quantity,
    fecha_impresion_papel: row.fecha_impresion_papel,
    num_impresion_papel: row.num_impresion_papel,
    disenador: row.disenador,
    impresor: row.impresor,
    fecha_embarque: row.fecha_embarque,
    natural_key: row.natural_key.slice(0, 80),
    row_hash: row.row_hash.slice(0, 16)
  })));

  console.log("");
  console.log("Preview terminado correctamente.");
} catch (error) {
  console.error("");
  console.error("Error leyendo fuente:");
  console.error(error.message);
  process.exit(1);
}