require("dotenv").config();

const {
  previewPrintSublimationSource
} = require("../src/services/printSublimationSync");

const sourceId = Number(process.argv[2] || 1);

const result = previewPrintSublimationSource(sourceId);

const groups = new Map();

for (const row of result.rows) {
  if (!groups.has(row.natural_key)) {
    groups.set(row.natural_key, []);
  }

  groups.get(row.natural_key).push(row);
}

const duplicates = [];

for (const [naturalKey, rows] of groups.entries()) {
  if (rows.length > 1) {
    const hashes = new Set(rows.map((row) => row.row_hash));

    duplicates.push({
      naturalKey,
      count: rows.length,
      unique_hashes: hashes.size,
      exact_duplicate: hashes.size === 1,
      rows
    });
  }
}

console.log("Total grupos duplicados:", duplicates.length);
console.log(
  "Total filas duplicadas adicionales:",
  duplicates.reduce((total, item) => total + item.count - 1, 0)
);

console.log("");
console.log("Resumen por grupo:");
console.table(duplicates.map((item, index) => ({
  group: index + 1,
  count: item.count,
  unique_hashes: item.unique_hashes,
  exact_duplicate: item.exact_duplicate,
  naturalKey: item.naturalKey
})));

for (const item of duplicates) {
  console.log("");
  console.log("NATURAL KEY:", item.naturalKey);
  console.log("Filas:", item.count);
  console.log("Hashes únicos:", item.unique_hashes);
  console.log("Duplicado exacto:", item.exact_duplicate);

  console.table(item.rows.map((row) => ({
    source_row: row.source_row,
    type: row.type,
    plotter_number: row.plotter_number,
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
    row_hash: row.row_hash.slice(0, 12)
  })));
}