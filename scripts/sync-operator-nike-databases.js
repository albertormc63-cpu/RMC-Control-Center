#!/usr/bin/env node

require("dotenv").config();

const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");

const CENTRAL_DB_PATH = process.env.RMC_DB_PATH;
const DEFAULT_OPERATOR_DB_ROOT = "/Volumes/Fullsize/PATRONES ACOMODADOS PARA ROLLO/NIKE LACROSSE/RMCOp-NIKE/ASSETS/BD";
const SOURCE_TYPE = "operator_sqlite_rmcop_nike";
const OPERATOR_TABLE = "rmc_operator_db_meta";
const MAP_TABLE = "rmc_sync_record_map";
const APP_NAME = "RMCOp-Nike";
const NIKE_TOOL_NAMES = [
  "RMCOp-Nike Personalizadas",
  "RMCOp-Nike Genericas"
];
const VALID_SYNC_STATUSES = new Set([
  "INSERTADO",
  "YA_EXISTE",
  "CONFLICTO_CLAVE",
  "CONFLICTO_PATH",
  "ERROR",
  "OMITIDO"
]);

const RUN_COLUMNS = [
  "id",
  "created_at",
  "started_at",
  "finished_at",
  "tiempo",
  "herramienta",
  "pedidos",
  "piezas",
  "estilos",
  "ok",
  "errores",
  "observaciones",
  "fecha_embarque",
  "excel_path",
  "output_root"
];

const ITEM_COLUMNS = [
  "id",
  "run_id",
  "herramienta",
  "fila_excel",
  "wo",
  "ship_order",
  "style",
  "style_family",
  "equipo",
  "variante",
  "version",
  "talla",
  "piezas",
  "nombre",
  "numero",
  "archivo",
  "estado",
  "error",
  "tiempo",
  "clave",
  "fecha_embarque",
  "roster",
  "path",
  "variant_code",
  "design_code",
  "design_name",
  "catalog_variant_id"
];

const INSERT_ITEM_COLUMNS = ITEM_COLUMNS.filter((column) => column !== "id");

function parseArgs(argv) {
  const options = {
    central: process.env.RMC_DB_PATH || "",
    root: process.env.RMC_OPERATOR_DB_ROOT || DEFAULT_OPERATOR_DB_ROOT,
    operators: [],
    dryRun: false,
    discoverOnly: false,
    keepTemp: false,
    verbose: false
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

    if (arg === "--verbose") {
      options.verbose = true;
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
      options.operators = splitList(value).map((operator) => operator.toUpperCase());
    } else {
      throw new Error(`Opcion no reconocida: --${key}`);
    }
  });

  return options;
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeKeyPart(value) {
  return cleanValue(value).toUpperCase().replace(/\s+/g, " ");
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function sqlIdentifier(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

function assertDatabasePath(dbPath, label) {
  if (!dbPath) {
    throw new Error(`Falta configurar ruta de ${label}`);
  }

  if (!fs.existsSync(dbPath)) {
    throw new Error(`No existe ${label}: ${dbPath}`);
  }
}

function discoverOperatorDatabases(root, requestedOperators) {
  if (!fs.existsSync(root)) {
    throw new Error(`No existe la carpeta de BDs por operador: ${root}`);
  }

  const operators = requestedOperators.length
    ? requestedOperators
    : fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name.toUpperCase());

  return operators
    .map((operator) => ({
      operator,
      dbPath: path.join(root, operator, "RMC_CEP.sqlite")
    }))
    .filter((source) => fs.existsSync(source.dbPath));
}

async function copyDatabaseSnapshot(sourcePath, name) {
  const tempPath = path.join(
    os.tmpdir(),
    `rmccc-${normalizeOperatorCode(name).toLowerCase()}-${Date.now()}-${process.pid}.sqlite`
  );
  let sourceDb = null;

  try {
    sourceDb = new Database(sourcePath, {
      fileMustExist: true,
      readonly: true
    });
    await sourceDb.backup(tempPath);
  } catch (error) {
    backupDatabaseWithSqliteCli(sourcePath, tempPath, error);
  } finally {
    if (sourceDb) {
      sourceDb.close();
    }
  }

  return tempPath;
}

function backupDatabaseWithSqliteCli(sourcePath, tempPath, originalError) {
  try {
    execFileSync("sqlite3", [
      "-cmd",
      `.timeout ${Number(process.env.RMC_DB_BUSY_TIMEOUT_MS) || 5000}`,
      sourcePath,
      `.backup ${tempPath}`
    ], {
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    throw new Error(
      `No se pudo crear snapshot de ${sourcePath}. ` +
      `better-sqlite3: ${originalError.message}. sqlite3: ${error.stderr || error.message}`
    );
  }
}

function openDatabase(dbPath, options = {}) {
  const db = new Database(dbPath, {
    fileMustExist: true,
    readonly: Boolean(options.readonly)
  });
  db.pragma(`busy_timeout = ${Number(process.env.RMC_DB_BUSY_TIMEOUT_MS) || 5000}`);
  db.pragma("foreign_keys = ON");
  return db;
}

function ensureSyncSchema(db) {
  db.exec(`
CREATE TABLE IF NOT EXISTS rmc_external_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area TEXT,
  source_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sheet_name TEXT,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  last_mtime_ms INTEGER,
  last_size_bytes INTEGER,
  last_sync_at TEXT,
  last_status TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rmc_sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL,
  rows_read INTEGER NOT NULL DEFAULT 0,
  rows_valid INTEGER NOT NULL DEFAULT 0,
  rows_inserted INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_unchanged INTEGER NOT NULL DEFAULT 0,
  rows_missing INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  FOREIGN KEY (source_id)
    REFERENCES rmc_external_sources (id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ${MAP_TABLE} (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER NOT NULL,
  source_operator TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_pk TEXT NOT NULL,
  source_run_id TEXT,
  central_table TEXT NOT NULL,
  central_pk TEXT,
  central_run_id TEXT,
  natural_key TEXT,
  row_hash TEXT,
  sync_status TEXT NOT NULL,
  conflict_reason TEXT,
  first_synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_synced_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source_id, source_table, source_pk)
);

CREATE INDEX IF NOT EXISTS idx_sync_record_map_source
ON ${MAP_TABLE} (source_id, source_table, source_pk);

CREATE INDEX IF NOT EXISTS idx_sync_record_map_natural_key
ON ${MAP_TABLE} (natural_key);

CREATE INDEX IF NOT EXISTS idx_sync_record_map_status
ON ${MAP_TABLE} (sync_status);

CREATE INDEX IF NOT EXISTS idx_sync_runs_source
ON rmc_sync_runs (source_id);

CREATE INDEX IF NOT EXISTS idx_external_sources_type
ON rmc_external_sources (source_type);
`);

  ensureColumn(db, "rmc_external_sources", "operator_code", "TEXT");
  ensureColumn(db, "rmc_external_sources", "app_name", "TEXT");

  db.exec(`
CREATE INDEX IF NOT EXISTS idx_external_sources_operator_app
ON rmc_external_sources (source_type, operator_code, app_name);
`);
}

function ensureColumn(db, tableName, columnName, columnDefinition) {
  const exists = db
    .prepare(`PRAGMA table_info(${sqlIdentifier(tableName)})`)
    .all()
    .some((column) => column.name === columnName);

  if (!exists) {
    db.exec(`ALTER TABLE ${sqlIdentifier(tableName)} ADD COLUMN ${sqlIdentifier(columnName)} ${columnDefinition}`);
  }
}

function getOperatorMeta(sourceDb, fallbackOperator) {
  const tableExists = sourceDb.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(OPERATOR_TABLE);

  if (!tableExists) {
    return { operatorCode: fallbackOperator };
  }

  const row = sourceDb.prepare(`
    SELECT value
    FROM ${OPERATOR_TABLE}
    WHERE key = 'operator_code'
  `).get();

  return {
    operatorCode: normalizeOperatorCode(row && row.value ? row.value : fallbackOperator)
  };
}

function normalizeOperatorCode(value) {
  return normalizeKeyPart(value).replace(/[^A-Z0-9_-]/g, "_");
}

function getTableColumns(db, tableName) {
  const tableExists = db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(tableName);

  if (!tableExists) {
    throw new Error(`Falta la tabla requerida: ${tableName}`);
  }

  return db
    .prepare(`PRAGMA table_info(${sqlIdentifier(tableName)})`)
    .all()
    .map((column) => column.name);
}

function assertColumns(db, tableName, expectedColumns, label) {
  const columns = new Set(getTableColumns(db, tableName));
  const missing = expectedColumns.filter((column) => !columns.has(column));

  if (missing.length) {
    throw new Error(`${label}: faltan columnas en ${tableName}: ${missing.join(", ")}`);
  }
}

function validateCentralSchema(db) {
  assertColumns(db, "rmcop_nike_runs", RUN_COLUMNS, "BD central");
  assertColumns(db, "rmcop_nike_items", ITEM_COLUMNS, "BD central");
  assertColumns(db, "rmc_external_sources", [
    "id",
    "name",
    "area",
    "source_type",
    "file_path",
    "sheet_name",
    "active",
    "last_mtime_ms",
    "last_size_bytes",
    "last_sync_at",
    "last_status",
    "last_error",
    "created_at",
    "updated_at",
    "operator_code",
    "app_name"
  ], "BD central");
  assertColumns(db, "rmc_sync_runs", [
    "id",
    "source_id",
    "started_at",
    "finished_at",
    "status",
    "rows_read",
    "rows_valid",
    "rows_inserted",
    "rows_updated",
    "rows_unchanged",
    "rows_missing",
    "rows_skipped",
    "error_message"
  ], "BD central");
  assertColumns(db, MAP_TABLE, [
    "id",
    "source_id",
    "source_operator",
    "source_table",
    "source_pk",
    "source_run_id",
    "central_table",
    "central_pk",
    "central_run_id",
    "natural_key",
    "row_hash",
    "sync_status",
    "conflict_reason",
    "first_synced_at",
    "last_synced_at"
  ], "BD central");
}

function validateSourceSchema(sourceDb, sourceLabel) {
  assertColumns(sourceDb, "rmcop_nike_runs", RUN_COLUMNS, sourceLabel);
  assertColumns(sourceDb, "rmcop_nike_items", ITEM_COLUMNS, sourceLabel);
  assertColumns(sourceDb, OPERATOR_TABLE, ["key", "value"], sourceLabel);
}

function upsertExternalSource(db, source) {
  const now = nowIso();
  const existing = db.prepare(`
    SELECT id
    FROM rmc_external_sources
    WHERE source_type = ?
      AND operator_code = ?
      AND app_name = ?
    LIMIT 1
  `).get(SOURCE_TYPE, source.operator, APP_NAME);

  if (existing) {
    db.prepare(`
      UPDATE rmc_external_sources
      SET name = ?,
          area = ?,
          file_path = ?,
          active = 1,
          updated_at = ?
      WHERE id = ?
    `).run(
      `RMCOp-Nike ${source.operator}`,
      "RMCOp-Nike / Operador",
      source.dbPath,
      now,
      existing.id
    );
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO rmc_external_sources (
      name,
      area,
      source_type,
      file_path,
      sheet_name,
      active,
      operator_code,
      app_name,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, NULL, 1, ?, ?, ?, ?)
  `).run(
    `RMCOp-Nike ${source.operator}`,
    "RMCOp-Nike / Operador",
    SOURCE_TYPE,
    source.dbPath,
    source.operator,
    APP_NAME,
    now,
    now
  );

  return Number(result.lastInsertRowid);
}

function createSyncRun(db, sourceId) {
  const result = db.prepare(`
    INSERT INTO rmc_sync_runs (source_id, status)
    VALUES (?, 'running')
  `).run(sourceId);

  return Number(result.lastInsertRowid);
}

function finishSyncRun(db, syncRunId, status, summary, errorMessage = "") {
  db.prepare(`
    UPDATE rmc_sync_runs
    SET finished_at = CURRENT_TIMESTAMP,
        status = ?,
        rows_read = ?,
        rows_valid = ?,
        rows_inserted = ?,
        rows_updated = ?,
        rows_unchanged = ?,
        rows_missing = 0,
        rows_skipped = ?,
        error_message = ?
    WHERE id = ?
  `).run(
    status,
    summary.rowsRead,
    summary.rowsValid,
    summary.rowsInserted,
    summary.rowsUpdated,
    summary.rowsUnchanged,
    summary.rowsSkipped,
    errorMessage,
    syncRunId
  );
}

function readNikeRows(sourceDb) {
  const toolPlaceholders = NIKE_TOOL_NAMES.map(() => "?").join(", ");
  const runs = sourceDb.prepare(`
    SELECT ${RUN_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmcop_nike_runs
    WHERE herramienta IN (${toolPlaceholders})
    ORDER BY id
  `).all(...NIKE_TOOL_NAMES);

  const items = sourceDb.prepare(`
    SELECT ${ITEM_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmcop_nike_items
    WHERE herramienta IN (${toolPlaceholders})
    ORDER BY run_id, id
  `).all(...NIKE_TOOL_NAMES);

  return { runs, items };
}

function buildCentralRunId(operator, sourceRunId) {
  return `${operator}-${sourceRunId}`;
}

function runHash(run) {
  return hashPayload({
    source_run_id: run.id,
    herramienta: run.herramienta,
    created_at: run.created_at,
    started_at: run.started_at,
    finished_at: run.finished_at,
    fecha_embarque: run.fecha_embarque,
    excel_path: run.excel_path,
    output_root: run.output_root,
    pedidos: run.pedidos,
    piezas: run.piezas,
    estilos: run.estilos,
    ok: run.ok,
    errores: run.errores
  });
}

function itemHash(item) {
  return hashPayload({
    source_item_id: item.id,
    source_run_id: item.run_id,
    herramienta: item.herramienta,
    fila_excel: item.fila_excel,
    wo: item.wo,
    roster: item.roster,
    ship_order: item.ship_order,
    style: item.style,
    equipo: item.equipo,
    talla: item.talla,
    nombre: item.nombre,
    numero: item.numero,
    archivo: item.archivo,
    path: item.path,
    estado: item.estado,
    clave: item.clave,
    fecha_embarque: item.fecha_embarque
  });
}

function getMappedRecord(db, sourceId, sourceTable, sourcePk) {
  return db.prepare(`
    SELECT *
    FROM ${MAP_TABLE}
    WHERE source_id = ?
      AND source_table = ?
      AND source_pk = ?
  `).get(sourceId, sourceTable, String(sourcePk));
}

function upsertMap(db, payload) {
  if (!VALID_SYNC_STATUSES.has(payload.sync_status)) {
    throw new Error(`Estado de sync no soportado: ${payload.sync_status}`);
  }

  db.prepare(`
    INSERT INTO ${MAP_TABLE} (
      source_id,
      source_operator,
      source_table,
      source_pk,
      source_run_id,
      central_table,
      central_pk,
      central_run_id,
      natural_key,
      row_hash,
      sync_status,
      conflict_reason,
      first_synced_at,
      last_synced_at
    ) VALUES (
      @source_id,
      @source_operator,
      @source_table,
      @source_pk,
      @source_run_id,
      @central_table,
      @central_pk,
      @central_run_id,
      @natural_key,
      @row_hash,
      @sync_status,
      @conflict_reason,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(source_id, source_table, source_pk)
    DO UPDATE SET
      central_pk = excluded.central_pk,
      central_run_id = excluded.central_run_id,
      natural_key = excluded.natural_key,
      row_hash = excluded.row_hash,
      sync_status = excluded.sync_status,
      conflict_reason = excluded.conflict_reason,
      last_synced_at = CURRENT_TIMESTAMP
  `).run(payload);
}

function buildRunPayload(context, run) {
  return {
    centralRunId: buildCentralRunId(context.operator, run.id),
    created_at: run.created_at,
    started_at: run.started_at,
    finished_at: run.finished_at,
    tiempo: run.tiempo,
    herramienta: run.herramienta,
    pedidos: run.pedidos || 0,
    piezas: run.piezas || 0,
    estilos: run.estilos || 0,
    ok: run.ok || 0,
    errores: run.errores || 0,
    observaciones: appendSyncNote(run.observaciones, context.operator, run.id),
    fecha_embarque: run.fecha_embarque,
    excel_path: run.excel_path,
    output_root: run.output_root
  };
}

function insertRunRow(db, payload) {
  db.prepare(`
    INSERT INTO rmcop_nike_runs (
      id,
      created_at,
      started_at,
      finished_at,
      tiempo,
      herramienta,
      pedidos,
      piezas,
      estilos,
      ok,
      errores,
      observaciones,
      fecha_embarque,
      excel_path,
      output_root
    ) VALUES (
      @centralRunId,
      @created_at,
      @started_at,
      @finished_at,
      @tiempo,
      @herramienta,
      @pedidos,
      @piezas,
      @estilos,
      @ok,
      @errores,
      @observaciones,
      @fecha_embarque,
      @excel_path,
      @output_root
    )
  `).run(payload);
}

function updateRunRow(db, payload) {
  db.prepare(`
    UPDATE rmcop_nike_runs
    SET created_at = @created_at,
        started_at = @started_at,
        finished_at = @finished_at,
        tiempo = @tiempo,
        herramienta = @herramienta,
        pedidos = @pedidos,
        piezas = @piezas,
        estilos = @estilos,
        ok = @ok,
        errores = @errores,
        observaciones = @observaciones,
        fecha_embarque = @fecha_embarque,
        excel_path = @excel_path,
        output_root = @output_root
    WHERE id = @centralRunId
  `).run(payload);
}

function syncRunRow(db, context, run) {
  const centralRunId = buildCentralRunId(context.operator, run.id);
  const rowHash = runHash(run);
  const mapped = getMappedRecord(db, context.sourceId, "rmcop_nike_runs", run.id);
  const payload = buildRunPayload(context, run);
  const central = db.prepare("SELECT id FROM rmcop_nike_runs WHERE id = ?").get(centralRunId);

  if (mapped && mapped.row_hash === rowHash && mapped.sync_status === "INSERTADO" && central) {
    context.summary.rowsUnchanged += 1;
    return centralRunId;
  }

  if (central) {
    if (mapped && mapped.sync_status === "INSERTADO") {
      updateRunRow(db, payload);
      context.summary.rowsUpdated += 1;
    } else {
      context.summary.rowsUnchanged += 1;
    }

    upsertMap(db, {
      source_id: context.sourceId,
      source_operator: context.operator,
      source_table: "rmcop_nike_runs",
      source_pk: String(run.id),
      source_run_id: run.id,
      central_table: "rmcop_nike_runs",
      central_pk: centralRunId,
      central_run_id: centralRunId,
      natural_key: centralRunId,
      row_hash: rowHash,
      sync_status: mapped && mapped.sync_status === "INSERTADO" ? "INSERTADO" : "YA_EXISTE",
      conflict_reason: ""
    });
    return centralRunId;
  }

  insertRunRow(db, payload);

  upsertMap(db, {
    source_id: context.sourceId,
    source_operator: context.operator,
    source_table: "rmcop_nike_runs",
    source_pk: String(run.id),
    source_run_id: run.id,
    central_table: "rmcop_nike_runs",
    central_pk: centralRunId,
    central_run_id: centralRunId,
    natural_key: centralRunId,
    row_hash: rowHash,
    sync_status: "INSERTADO",
    conflict_reason: ""
  });

  context.summary.rowsInserted += 1;
  return centralRunId;
}

function appendSyncNote(existingNotes, operator, sourceRunId) {
  const note = `[sync ${operator}:${sourceRunId}]`;
  const current = cleanValue(existingNotes);
  if (!current) return note;
  if (current.includes(note)) return current;
  return `${current} ${note}`;
}

function normalizeComparable(value) {
  return normalizeKeyPart(value);
}

function isCompletedItem(item) {
  return normalizeComparable(item.estado) === "COMPLETADO";
}

function buildItemPayload(item, centralRunId) {
  const payload = Object.assign({}, item, {
    run_id: centralRunId
  });
  delete payload.id;
  return payload;
}

function getCentralItemById(db, itemId) {
  if (!itemId) return null;
  return db.prepare(`
    SELECT ${ITEM_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmcop_nike_items
    WHERE id = ?
  `).get(itemId);
}

function findCompletedItemByKey(db, key, excludeItemId = null) {
  if (!cleanValue(key)) return null;
  return db.prepare(`
    SELECT ${ITEM_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmcop_nike_items
    WHERE UPPER(TRIM(COALESCE(clave, ''))) = ?
      AND estado = 'Completado'
      AND (? IS NULL OR id != ?)
    LIMIT 1
  `).get(normalizeComparable(key), excludeItemId, excludeItemId);
}

function findCompletedItemByPath(db, pathValue, excludeItemId = null) {
  if (!cleanValue(pathValue)) return null;
  return db.prepare(`
    SELECT ${ITEM_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmcop_nike_items
    WHERE UPPER(TRIM(COALESCE(path, ''))) = ?
      AND estado = 'Completado'
      AND (? IS NULL OR id != ?)
    LIMIT 1
  `).get(normalizeComparable(pathValue), excludeItemId, excludeItemId);
}

function equivalentWhenPresent(left, right, fields) {
  return fields.every((field) => {
    const leftValue = normalizeComparable(left[field]);
    const rightValue = normalizeComparable(right[field]);
    if (!leftValue && !rightValue) return true;
    if (!leftValue || !rightValue) return false;
    return leftValue === rightValue;
  });
}

function itemDataLooksEquivalent(sourceItem, centralItem) {
  return equivalentWhenPresent(sourceItem, centralItem, [
    "clave",
    "path",
    "wo",
    "ship_order",
    "style",
    "talla",
    "nombre",
    "numero",
    "archivo"
  ]);
}

function mapItem(db, context, item, centralItem, rowHash, status, conflictReason = "") {
  upsertMap(db, {
    source_id: context.sourceId,
    source_operator: context.operator,
    source_table: "rmcop_nike_items",
    source_pk: String(item.id),
    source_run_id: item.run_id,
    central_table: "rmcop_nike_items",
    central_pk: centralItem ? String(centralItem.id) : null,
    central_run_id: centralItem ? centralItem.run_id : null,
    natural_key: cleanValue(item.clave),
    row_hash: rowHash,
    sync_status: status,
    conflict_reason: conflictReason
  });
}

function findItemConflict(db, item, excludeItemId = null) {
  if (!isCompletedItem(item)) return null;

  const naturalKey = cleanValue(item.clave);
  const pathValue = cleanValue(item.path);

  if (naturalKey) {
    const existingByKey = findCompletedItemByKey(db, naturalKey, excludeItemId);

    if (existingByKey) {
      if (itemDataLooksEquivalent(item, existingByKey)) {
        return {
          status: "YA_EXISTE",
          existingItem: existingByKey,
          conflictReason: ""
        };
      }

      return {
        status: "CONFLICTO_CLAVE",
        existingItem: existingByKey,
        conflictReason: `Clave ya completada en item central ${existingByKey.id} con path o datos distintos.`
      };
    }
  }

  if (pathValue) {
    const existingByPath = findCompletedItemByPath(db, pathValue, excludeItemId);

    if (existingByPath) {
      const sameKey = normalizeComparable(existingByPath.clave) === normalizeComparable(naturalKey);

      if (sameKey && itemDataLooksEquivalent(item, existingByPath)) {
        return {
          status: "YA_EXISTE",
          existingItem: existingByPath,
          conflictReason: ""
        };
      }

      return {
        status: "CONFLICTO_PATH",
        existingItem: existingByPath,
        conflictReason: `Path ya completado en item central ${existingByPath.id} con clave distinta o datos sospechosos.`
      };
    }
  }

  return null;
}

function updateItemRow(db, itemId, payload) {
  const assignments = INSERT_ITEM_COLUMNS
    .map((column) => `${sqlIdentifier(column)} = @${column}`)
    .join(", ");

  db.prepare(`
    UPDATE rmcop_nike_items
    SET ${assignments}
    WHERE id = @id
  `).run({
    ...payload,
    id: itemId
  });
}

function syncItemRow(db, context, item, centralRunId) {
  const rowHash = itemHash(item);
  const sourcePk = String(item.id);
  const mapped = getMappedRecord(db, context.sourceId, "rmcop_nike_items", sourcePk);
  const mappedCentralItem = mapped && mapped.sync_status === "INSERTADO"
    ? getCentralItemById(db, mapped.central_pk)
    : null;

  if (mappedCentralItem && mapped.row_hash === rowHash) {
    context.summary.rowsUnchanged += 1;
    return;
  }

  const existingConflict = findItemConflict(
    db,
    item,
    mappedCentralItem ? mappedCentralItem.id : null
  );

  if (existingConflict) {
    mapItem(
      db,
      context,
      item,
      existingConflict.existingItem,
      rowHash,
      existingConflict.status,
      existingConflict.conflictReason
    );

    if (existingConflict.status === "YA_EXISTE") {
      context.summary.rowsUnchanged += 1;
    } else {
      context.summary.rowsSkipped += 1;
      context.summary.conflicts += 1;
    }
    return;
  }

  const insertPayload = buildItemPayload(item, centralRunId);

  if (mappedCentralItem) {
    updateItemRow(db, mappedCentralItem.id, insertPayload);
    mapItem(db, context, item, {
      id: mappedCentralItem.id,
      run_id: centralRunId
    }, rowHash, "INSERTADO", "");
    context.summary.rowsUpdated += 1;
    return;
  }

  if (mapped && mapped.sync_status === "INSERTADO" && !mappedCentralItem) {
    mapItem(
      db,
      context,
      item,
      null,
      rowHash,
      "OMITIDO",
      `El item central mapeado ${mapped.central_pk || "(sin id)"} ya no existe.`
    );
    context.summary.rowsSkipped += 1;
    return;
  }

  if (!db.prepare("SELECT id FROM rmcop_nike_runs WHERE id = ?").get(centralRunId)) {
    mapItem(
      db,
      context,
      item,
      null,
      rowHash,
      "OMITIDO",
      `No existe el run central requerido: ${centralRunId}.`
    );
    context.summary.rowsSkipped += 1;
    return;
  }

  try {
    const placeholders = INSERT_ITEM_COLUMNS.map((column) => `@${column}`).join(", ");
    const result = db.prepare(`
      INSERT INTO rmcop_nike_items (${INSERT_ITEM_COLUMNS.map(sqlIdentifier).join(", ")})
      VALUES (${placeholders})
    `).run(insertPayload);

    mapItem(db, context, item, {
      id: Number(result.lastInsertRowid),
      run_id: centralRunId
    }, rowHash, "INSERTADO", "");

    context.summary.rowsInserted += 1;
  } catch (error) {
    mapItem(db, context, item, null, rowHash, "ERROR", error.message);
    context.summary.rowsSkipped += 1;
    context.summary.errors += 1;
    if (context.options.verbose) {
      console.warn(`ERROR item ${context.operator}:${sourcePk}: ${error.message}`);
    }
  }
}

async function syncOperatorSource(centralDb, source, options = {}) {
  let snapshotPath = "";
  let sourceDb = null;
  let sourceId = null;
  let syncRunId = null;
  let summary = {
    rowsRead: 0,
    rowsValid: 0,
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsUnchanged: 0,
    rowsSkipped: 0,
    conflicts: 0,
    errors: 0
  };

  try {
    snapshotPath = await copyDatabaseSnapshot(source.dbPath, source.operator);
    sourceDb = openDatabase(snapshotPath, { readonly: true });
    validateSourceSchema(sourceDb, `BD operador ${source.operator}`);

    const meta = getOperatorMeta(sourceDb, source.operator);
    const normalizedSource = Object.assign({}, source, {
      operator: meta.operatorCode
    });
    sourceId = upsertExternalSource(centralDb, normalizedSource);
    syncRunId = createSyncRun(centralDb, sourceId);
    const rows = readNikeRows(sourceDb);
    summary = {
      rowsRead: rows.runs.length + rows.items.length,
      rowsValid: rows.runs.length + rows.items.length,
      rowsInserted: 0,
      rowsUpdated: 0,
      rowsUnchanged: 0,
      rowsSkipped: 0,
      conflicts: 0,
      errors: 0
    };

    const context = {
      sourceId,
      syncRunId,
      operator: normalizedSource.operator,
      sourcePath: source.dbPath,
      summary,
      options
    };

    const transaction = centralDb.transaction(() => {
      const runIdMap = new Map();

      rows.runs.forEach((run) => {
        const centralRunId = syncRunRow(centralDb, context, run);
        runIdMap.set(run.id, centralRunId);
      });

      rows.items.forEach((item) => {
        const centralRunId = runIdMap.get(item.run_id) || buildCentralRunId(context.operator, item.run_id);
        syncItemRow(centralDb, context, item, centralRunId);
      });

      finishSyncRun(
        centralDb,
        syncRunId,
        summary.conflicts || summary.errors ? "partial" : "success",
        summary
      );

      const sourceStat = fs.statSync(source.dbPath);
      centralDb.prepare(`
        UPDATE rmc_external_sources
        SET last_mtime_ms = ?,
            last_size_bytes = ?,
            last_sync_at = CURRENT_TIMESTAMP,
            last_status = ?,
            last_error = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        Math.round(sourceStat.mtimeMs),
        sourceStat.size,
        summary.conflicts || summary.errors ? "partial" : "success",
        sourceId
      );
    });

    transaction();

    return {
      operator: normalizedSource.operator,
      sourceId,
      syncRunId,
      dbPath: source.dbPath,
      summary
    };
  } catch (error) {
    if (sourceId && syncRunId) {
      finishSyncRun(centralDb, syncRunId, "error", summary, error.message);
      centralDb.prepare(`
        UPDATE rmc_external_sources
        SET last_sync_at = CURRENT_TIMESTAMP,
            last_status = 'error',
            last_error = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(error.message, sourceId);
    }
    throw error;
  } finally {
    if (sourceDb) {
      sourceDb.close();
    }
    if (snapshotPath) {
      try {
        fs.rmSync(snapshotPath, { force: true });
      } catch (error) {
        console.warn(`No se pudo borrar snapshot temporal: ${snapshotPath}`);
      }
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const sources = discoverOperatorDatabases(options.root, options.operators);
  if (!sources.length) {
    throw new Error("No se encontraron BDs de operador para sincronizar.");
  }

  if (options.discoverOnly) {
    console.log("Fuentes detectadas:");
    sources.forEach((source) => {
      console.log(`- ${source.operator}: ${source.dbPath}`);
    });
    return;
  }

  assertDatabasePath(options.central, "BD central");

  let centralDbPath = options.central;
  let dryRunCentralPath = "";

  if (options.dryRun) {
    dryRunCentralPath = await copyDatabaseSnapshot(options.central, "central-dry-run");
    centralDbPath = dryRunCentralPath;
    console.log(`Dry run: usando copia temporal de la central: ${dryRunCentralPath}`);
    console.log(`La BD central real no sera modificada: ${options.central}`);
  }

  const centralDb = openDatabase(centralDbPath);

  try {
    ensureSyncSchema(centralDb);
    validateCentralSchema(centralDb);

    const results = [];
    for (const source of sources) {
      results.push(await syncOperatorSource(centralDb, source, options));
    }

    results.forEach((result) => {
      console.log("");
      console.log(`${result.operator}: ${result.dbPath}`);
      console.log(`source_id=${result.sourceId} sync_run_id=${result.syncRunId}`);
      console.table(result.summary);
    });

    console.log("");
    console.log(options.dryRun
      ? "Dry run Nike por operador terminado sin modificar la central real."
      : "Sync Nike por operador terminado.");

    if (options.dryRun && options.keepTemp) {
      console.log(`Copia temporal conservada para inspeccion: ${dryRunCentralPath}`);
    }
  } finally {
    centralDb.close();
    if (dryRunCentralPath && !options.keepTemp) {
      try {
        fs.rmSync(dryRunCentralPath, { force: true });
      } catch (error) {
        console.warn(`No se pudo borrar copia temporal de dry-run: ${dryRunCentralPath}`);
      }
    }
  }
}

try {
  main().catch((error) => {
    console.error("");
    console.error("Error sincronizando BDs de operador:");
    console.error(error.message);
    process.exit(1);
  });
} catch (error) {
  console.error("");
  console.error("Error sincronizando BDs de operador:");
  console.error(error.message);
  process.exit(1);
}
