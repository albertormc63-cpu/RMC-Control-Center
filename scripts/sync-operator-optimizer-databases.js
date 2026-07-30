#!/usr/bin/env node

require("dotenv").config();

const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");

const {
  DEFAULT_OPERATOR_DB_ROOT,
  discoverOperatorDatabases,
  syncOperatorOptimizerDatabases
} = require("../src/services/operatorOptimizerSync");

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  const options = {
    central: process.env.RMC_DB_PATH || "",
    root: process.env.RMC_OPERATOR_DB_ROOT || DEFAULT_OPERATOR_DB_ROOT,
    operators: [],
    dryRun: false,
    discoverOnly: false,
    keepTemp: false
  };

  argv.forEach((arg) => {
    if (arg === "--dry-run") {
      options.dryRun = true;
      return;
    }

    if (arg === "--discover-only") {
      options.discoverOnly = true;
      return;
    }

    if (arg === "--keep-temp") {
      options.keepTemp = true;
      return;
    }

    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (!match) {
      throw new Error(`Argumento no reconocido: ${arg}`);
    }

    const key = match[1];
    const value = match[2];

    if (key === "central") {
      options.central = value;
    } else if (key === "root") {
      options.root = value;
    } else if (key === "operators") {
      options.operators = splitList(value);
    } else {
      throw new Error(`Opcion no reconocida: --${key}`);
    }
  });

  return options;
}

async function copyCentralForDryRun(sourcePath) {
  const tempPath = path.join(os.tmpdir(), `rmccc-opt-central-dry-run-${Date.now()}-${process.pid}.sqlite`);
  const db = new Database(sourcePath, {
    fileMustExist: true,
    readonly: true
  });

  try {
    await db.backup(tempPath);
  } finally {
    db.close();
  }

  return tempPath;
}

function assertDatabasePath(dbPath, label) {
  if (!dbPath) {
    throw new Error(`Falta configurar ruta de ${label}`);
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`No existe ${label}: ${dbPath}`);
  }
}

function printResults(result) {
  result.results.forEach((operatorResult) => {
    console.log("");
    console.log(`${operatorResult.operator}: ${operatorResult.dbPath}`);
    console.log(`source_id=${operatorResult.sourceId} sync_run_id=${operatorResult.syncRunId}`);
    console.table(operatorResult.summary);
  });

  console.log("");
  console.log("Totales:");
  console.table(result.totals);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.discoverOnly) {
    const sources = discoverOperatorDatabases(options.root, options.operators);
    console.log("Fuentes de operador detectadas:");
    sources.forEach((source) => {
      console.log(`- ${source.operator}: ${source.dbPath}`);
    });
    return;
  }

  assertDatabasePath(options.central, "BD central");

  let centralPath = options.central;
  let dryRunPath = "";

  if (options.dryRun) {
    dryRunPath = await copyCentralForDryRun(options.central);
    centralPath = dryRunPath;
    console.log(`Dry run: usando copia temporal de la central: ${dryRunPath}`);
    console.log(`La BD central real no sera modificada: ${options.central}`);
  }

  const centralDb = new Database(centralPath, {
    fileMustExist: true
  });
  centralDb.pragma(`busy_timeout = ${Number(process.env.RMC_DB_BUSY_TIMEOUT_MS) || 5000}`);
  centralDb.pragma("foreign_keys = ON");

  try {
    const result = await syncOperatorOptimizerDatabases(centralDb, {
      root: options.root,
      operators: options.operators
    });

    printResults(result);
    console.log(options.dryRun
      ? "Dry run Optimizador por operador terminado sin modificar la central real."
      : "Sync Optimizador por operador terminado.");

    if (options.dryRun && options.keepTemp) {
      console.log(`Copia temporal conservada para inspeccion: ${dryRunPath}`);
    }
  } finally {
    centralDb.close();

    if (dryRunPath && !options.keepTemp) {
      try {
        fs.rmSync(dryRunPath, { force: true });
      } catch (error) {
        console.warn(`No se pudo borrar copia temporal de dry-run: ${dryRunPath}`);
      }
    }
  }
}

main().catch((error) => {
  console.error("");
  console.error("Error sincronizando Optimizador por operador:");
  console.error(error.message);
  process.exit(1);
});
