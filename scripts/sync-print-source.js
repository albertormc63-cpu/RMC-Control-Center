require("dotenv").config();

const {
  syncPrintSublimationSource
} = require("../src/services/printSublimationSync");

const sourceId = Number(process.argv[2] || 1);

console.log("Sincronizando fuente externa ID:", sourceId);

try {
  const result = syncPrintSublimationSource(sourceId);

  console.log("");
  console.log("Archivo:");
  console.log(result.file);

  console.log("");
  console.log("Resumen sync:");
  console.table(result.summary);

  console.log("");
  console.log("Sync terminado correctamente.");
} catch (error) {
  console.error("");
  console.error("Error sincronizando fuente:");
  console.error(error.message);
  process.exit(1);
}