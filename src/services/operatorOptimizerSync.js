const crypto = require("crypto");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");

const DEFAULT_OPERATOR_DB_ROOT = "/Volumes/Fullsize/PATRONES ACOMODADOS PARA ROLLO/NIKE LACROSSE/RMCOp-NIKE/ASSETS/BD";
const SOURCE_TYPE = "operator_sqlite_rmc_optimizador";
const APP_NAME = "RMC Optimizador";
const OPERATOR_TABLE = "rmc_operator_db_meta";
const MAP_TABLE = "rmc_sync_record_map";

const ORDER_COLUMNS = [
  "id",
  "cliente",
  "roster",
  "roster_year",
  "nombre_pedido",
  "current_folder",
  "folder_status",
  "source_list_excel",
  "estado",
  "created_at",
  "updated_at",
  "raw_json"
];

const LINE_COLUMNS = [
  "id",
  "order_id",
  "fila_lista",
  "wo",
  "style_lista",
  "style_base",
  "style_categoria",
  "pcs_lista",
  "emb",
  "codigo_operativo",
  "tela",
  "estado",
  "created_at",
  "updated_at",
  "raw_json"
];

const OUTPUT_COLUMNS = [
  "id",
  "order_id",
  "line_id",
  "fila_roster",
  "roster",
  "wo",
  "nombre_pedido",
  "style_roster",
  "style_output",
  "style_base",
  "style_categoria",
  "subdesign",
  "color_or_descriptor",
  "size",
  "player_number",
  "first_name",
  "last_name",
  "position",
  "qty",
  "expected_filename",
  "expected_path",
  "found_path",
  "file_status",
  "tracking_status",
  "tracking_key",
  "last_checked_at",
  "created_at",
  "updated_at",
  "raw_json"
];

const ASSET_COLUMNS = [
  "id",
  "order_id",
  "line_id",
  "output_id",
  "asset_type",
  "path",
  "asset_exists",
  "detected_at",
  "notes",
  "raw_json"
];

const INSERT_ORDER_COLUMNS = ORDER_COLUMNS.filter((column) => column !== "id");
const INSERT_LINE_COLUMNS = LINE_COLUMNS.filter((column) => column !== "id");
const INSERT_OUTPUT_COLUMNS = OUTPUT_COLUMNS.filter((column) => column !== "id");
const INSERT_ASSET_COLUMNS = ASSET_COLUMNS.filter((column) => column !== "id");

function cleanValue(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeKeyPart(value) {
  return cleanValue(value).toUpperCase().replace(/\s+/g, " ");
}

function normalizeOperatorCode(value) {
  return normalizeKeyPart(value).replace(/[^A-Z0-9_-]/g, "_");
}

function hashPayload(payload) {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function sqlIdentifier(name) {
  return `"${String(name).replace(/"/g, "\"\"")}"`;
}

function nowIso() {
  return new Date().toISOString();
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanValue(item)).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function discoverOperatorDatabases(root = DEFAULT_OPERATOR_DB_ROOT, requestedOperators = []) {
  if (!fs.existsSync(root)) {
    throw new Error(`No existe la carpeta de BDs por operador: ${root}`);
  }

  const requested = splitList(requestedOperators).map((operator) => normalizeOperatorCode(operator));
  const operators = requested.length
    ? requested
    : fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => normalizeOperatorCode(entry.name));

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
    `rmccc-opt-${normalizeOperatorCode(name).toLowerCase()}-${Date.now()}-${process.pid}.sqlite`
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

function openSnapshotDatabase(dbPath) {
  const db = new Database(dbPath, {
    fileMustExist: true,
    readonly: true
  });
  db.pragma(`busy_timeout = ${Number(process.env.RMC_DB_BUSY_TIMEOUT_MS) || 5000}`);
  db.pragma("foreign_keys = ON");
  return db;
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

CREATE INDEX IF NOT EXISTS idx_sync_runs_source
ON rmc_sync_runs (source_id);

CREATE INDEX IF NOT EXISTS idx_external_sources_type
ON rmc_external_sources (source_type);

CREATE INDEX IF NOT EXISTS idx_sync_record_map_source
ON ${MAP_TABLE} (source_id, source_table, source_pk);

CREATE INDEX IF NOT EXISTS idx_sync_record_map_natural_key
ON ${MAP_TABLE} (natural_key);

CREATE INDEX IF NOT EXISTS idx_sync_record_map_status
ON ${MAP_TABLE} (sync_status);
`);

  ensureColumn(db, "rmc_external_sources", "operator_code", "TEXT");
  ensureColumn(db, "rmc_external_sources", "app_name", "TEXT");

  db.exec(`
CREATE INDEX IF NOT EXISTS idx_external_sources_operator_app
ON rmc_external_sources (source_type, operator_code, app_name);
`);
}

function getTableColumns(db, tableName) {
  const exists = db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(tableName);

  if (!exists) {
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

function validateOptimizerSchema(db, label) {
  assertColumns(db, "rmc_opt_orders", ORDER_COLUMNS, label);
  assertColumns(db, "rmc_opt_order_lines", LINE_COLUMNS, label);
  assertColumns(db, "rmc_opt_roster_outputs", OUTPUT_COLUMNS, label);
  assertColumns(db, "rmc_opt_assets", ASSET_COLUMNS, label);
}

function validateSourceSchema(db, label) {
  validateOptimizerSchema(db, label);
  assertColumns(db, OPERATOR_TABLE, ["key", "value"], label);
}

function getOperatorMeta(sourceDb, fallbackOperator) {
  const row = sourceDb.prepare(`
    SELECT value
    FROM ${OPERATOR_TABLE}
    WHERE key = 'operator_code'
  `).get();

  return {
    operatorCode: normalizeOperatorCode(row && row.value ? row.value : fallbackOperator)
  };
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
      `${APP_NAME} ${source.operator}`,
      "RMC Optimizador / Operador",
      source.dbPath,
      now,
      existing.id
    );
    return Number(existing.id);
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
    `${APP_NAME} ${source.operator}`,
    "RMC Optimizador / Operador",
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
    errorMessage || null,
    syncRunId
  );
}

function updateSourceAfterSync(db, sourceId, sourcePath, status, errorMessage = null) {
  const stat = fs.statSync(sourcePath);

  db.prepare(`
    UPDATE rmc_external_sources
    SET last_mtime_ms = ?,
        last_size_bytes = ?,
        last_sync_at = CURRENT_TIMESTAMP,
        last_status = ?,
        last_error = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    Math.round(stat.mtimeMs),
    stat.size,
    status,
    errorMessage,
    sourceId
  );
}

function readOptimizerRows(sourceDb) {
  return {
    orders: sourceDb.prepare(`
      SELECT ${ORDER_COLUMNS.map(sqlIdentifier).join(", ")}
      FROM rmc_opt_orders
      ORDER BY id
    `).all(),
    lines: sourceDb.prepare(`
      SELECT ${LINE_COLUMNS.map(sqlIdentifier).join(", ")}
      FROM rmc_opt_order_lines
      ORDER BY order_id, id
    `).all(),
    outputs: sourceDb.prepare(`
      SELECT ${OUTPUT_COLUMNS.map(sqlIdentifier).join(", ")}
      FROM rmc_opt_roster_outputs
      ORDER BY order_id, line_id, id
    `).all(),
    assets: sourceDb.prepare(`
      SELECT ${ASSET_COLUMNS.map(sqlIdentifier).join(", ")}
      FROM rmc_opt_assets
      ORDER BY order_id, line_id, output_id, id
    `).all()
  };
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

function makeMapPayload(context, row, config, centralRow, rowHash, status, conflictReason = "") {
  return {
    source_id: context.sourceId,
    source_operator: context.operator,
    source_table: config.sourceTable,
    source_pk: String(row.id),
    source_run_id: config.getSourceRunId(row),
    central_table: config.centralTable,
    central_pk: centralRow ? String(centralRow.id) : null,
    central_run_id: centralRow ? String(config.getCentralRunId(centralRow)) : null,
    natural_key: config.getNaturalKey(row, context),
    row_hash: rowHash,
    sync_status: status,
    conflict_reason: conflictReason
  };
}

function getRowById(db, tableName, columns, id) {
  if (!id) return null;

  return db.prepare(`
    SELECT ${columns.map(sqlIdentifier).join(", ")}
    FROM ${tableName}
    WHERE id = ?
  `).get(id);
}

function rowHash(row, fields) {
  const payload = {};
  fields.forEach((field) => {
    payload[field] = row[field];
  });
  return hashPayload(payload);
}

function equivalentRows(sourceRow, centralRow, fields) {
  return fields.every((field) => normalizeKeyPart(sourceRow[field]) === normalizeKeyPart(centralRow[field]));
}

function insertRow(db, tableName, columns, payload) {
  const placeholders = columns.map((column) => `@${column}`).join(", ");
  const result = db.prepare(`
    INSERT INTO ${tableName} (${columns.map(sqlIdentifier).join(", ")})
    VALUES (${placeholders})
  `).run(payload);

  return Number(result.lastInsertRowid);
}

function updateRow(db, tableName, columns, id, payload) {
  const assignments = columns
    .map((column) => `${sqlIdentifier(column)} = @${column}`)
    .join(", ");

  db.prepare(`
    UPDATE ${tableName}
    SET ${assignments}
    WHERE id = @id
  `).run({
    ...payload,
    id
  });
}

function orderNaturalKey(order) {
  return [
    "rmc_opt_orders",
    order.cliente,
    order.roster
  ].map(normalizeKeyPart).join("|");
}

function lineNaturalKey(line, context) {
  const centralOrderId = context.orderIdMap.get(Number(line.order_id)) || "";
  return [
    "rmc_opt_order_lines",
    centralOrderId,
    line.wo,
    line.style_lista
  ].map(normalizeKeyPart).join("|");
}

function outputNaturalKey(output) {
  return [
    "rmc_opt_roster_outputs",
    output.tracking_key
  ].map(normalizeKeyPart).join("|");
}

function assetNaturalKey(asset) {
  return [
    "rmc_opt_assets",
    asset.asset_type,
    asset.path
  ].map(normalizeKeyPart).join("|");
}

function buildOrderPayload(order) {
  const payload = {};
  INSERT_ORDER_COLUMNS.forEach((column) => {
    payload[column] = order[column];
  });
  return payload;
}

function buildLinePayload(line, context) {
  const payload = {};
  INSERT_LINE_COLUMNS.forEach((column) => {
    payload[column] = line[column];
  });
  payload.order_id = context.orderIdMap.get(Number(line.order_id)) || null;
  return payload;
}

function buildOutputPayload(output, context) {
  const payload = {};
  INSERT_OUTPUT_COLUMNS.forEach((column) => {
    payload[column] = output[column];
  });
  payload.order_id = context.orderIdMap.get(Number(output.order_id)) || null;
  payload.line_id = output.line_id ? context.lineIdMap.get(Number(output.line_id)) || null : null;
  return payload;
}

function buildAssetPayload(asset, context) {
  const payload = {};
  INSERT_ASSET_COLUMNS.forEach((column) => {
    payload[column] = asset[column];
  });
  payload.order_id = asset.order_id ? context.orderIdMap.get(Number(asset.order_id)) || null : null;
  payload.line_id = asset.line_id ? context.lineIdMap.get(Number(asset.line_id)) || null : null;
  payload.output_id = asset.output_id ? context.outputIdMap.get(Number(asset.output_id)) || null : null;
  return payload;
}

function findExistingOrder(db, order) {
  return db.prepare(`
    SELECT ${ORDER_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmc_opt_orders
    WHERE cliente = ?
      AND roster = ?
    LIMIT 1
  `).get(order.cliente, order.roster);
}

function findExistingLine(db, line, context) {
  const centralOrderId = context.orderIdMap.get(Number(line.order_id));
  if (!centralOrderId) return null;

  return db.prepare(`
    SELECT ${LINE_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmc_opt_order_lines
    WHERE order_id = ?
      AND COALESCE(wo, '') = COALESCE(?, '')
      AND style_lista = ?
    LIMIT 1
  `).get(centralOrderId, line.wo, line.style_lista);
}

function findExistingOutput(db, output) {
  return db.prepare(`
    SELECT ${OUTPUT_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmc_opt_roster_outputs
    WHERE tracking_key = ?
    LIMIT 1
  `).get(output.tracking_key);
}

function findExistingAsset(db, asset) {
  return db.prepare(`
    SELECT ${ASSET_COLUMNS.map(sqlIdentifier).join(", ")}
    FROM rmc_opt_assets
    WHERE asset_type = ?
      AND path = ?
    LIMIT 1
  `).get(asset.asset_type, asset.path);
}

function syncGenericRow(db, context, row, config) {
  const sourcePk = String(row.id);
  const hash = rowHash(row, config.hashFields);
  const mapped = getMappedRecord(db, context.sourceId, config.sourceTable, sourcePk);
  const mappedCentral = mapped && mapped.sync_status === "INSERTADO"
    ? getRowById(db, config.centralTable, config.columns, mapped.central_pk)
    : null;

  if (mappedCentral && mapped.row_hash === hash) {
    upsertMap(db, makeMapPayload(context, row, config, mappedCentral, hash, "INSERTADO", ""));
    context.summary.rowsUnchanged += 1;
    config.captureMap(context, row, mappedCentral);
    return mappedCentral.id;
  }

  const payload = config.buildPayload(row, context);

  if (config.requiresParent && !config.hasRequiredParent(payload)) {
    upsertMap(db, makeMapPayload(context, row, config, null, hash, "OMITIDO", "No se encontro el registro padre central."));
    context.summary.rowsSkipped += 1;
    return null;
  }

  if (mappedCentral) {
    updateRow(db, config.centralTable, config.insertColumns, mappedCentral.id, payload);
    const centralRow = getRowById(db, config.centralTable, config.columns, mappedCentral.id);
    upsertMap(db, makeMapPayload(context, row, config, centralRow, hash, "INSERTADO", ""));
    context.summary.rowsUpdated += 1;
    config.captureMap(context, row, centralRow);
    return centralRow.id;
  }

  const existing = config.findExisting(db, row, context);

  if (existing) {
    const equivalent = equivalentRows(row, existing, config.equivalenceFields);
    const status = equivalent ? "YA_EXISTE" : "CONFLICTO_CLAVE";
    const reason = equivalent
      ? ""
      : `La llave natural ya existe en ${config.centralTable} con datos distintos.`;

    upsertMap(db, makeMapPayload(context, row, config, existing, hash, status, reason));
    context.summary[status === "YA_EXISTE" ? "rowsUnchanged" : "rowsSkipped"] += 1;
    if (status !== "YA_EXISTE") {
      context.summary.conflicts += 1;
    }
    config.captureMap(context, row, existing);
    return existing.id;
  }

  try {
    const centralId = insertRow(db, config.centralTable, config.insertColumns, payload);
    const centralRow = getRowById(db, config.centralTable, config.columns, centralId);
    upsertMap(db, makeMapPayload(context, row, config, centralRow, hash, "INSERTADO", ""));
    context.summary.rowsInserted += 1;
    config.captureMap(context, row, centralRow);
    return centralId;
  } catch (error) {
    upsertMap(db, makeMapPayload(context, row, config, null, hash, "ERROR", error.message));
    context.summary.rowsSkipped += 1;
    context.summary.errors += 1;
    return null;
  }
}

function buildConfigs() {
  return {
    orders: {
      sourceTable: "rmc_opt_orders",
      centralTable: "rmc_opt_orders",
      columns: ORDER_COLUMNS,
      insertColumns: INSERT_ORDER_COLUMNS,
      hashFields: INSERT_ORDER_COLUMNS,
      equivalenceFields: ["cliente", "roster"],
      buildPayload: buildOrderPayload,
      findExisting: findExistingOrder,
      getNaturalKey: orderNaturalKey,
      getSourceRunId: (row) => row.id,
      getCentralRunId: (row) => row.id,
      requiresParent: false,
      hasRequiredParent: () => true,
      captureMap: (context, sourceRow, centralRow) => {
        if (centralRow) {
          context.orderIdMap.set(Number(sourceRow.id), Number(centralRow.id));
        }
      }
    },
    lines: {
      sourceTable: "rmc_opt_order_lines",
      centralTable: "rmc_opt_order_lines",
      columns: LINE_COLUMNS,
      insertColumns: INSERT_LINE_COLUMNS,
      hashFields: INSERT_LINE_COLUMNS,
      equivalenceFields: ["wo", "style_lista", "style_base", "style_categoria", "emb"],
      buildPayload: buildLinePayload,
      findExisting: findExistingLine,
      getNaturalKey: lineNaturalKey,
      getSourceRunId: (row) => row.order_id,
      getCentralRunId: (row) => row.order_id,
      requiresParent: true,
      hasRequiredParent: (payload) => Boolean(payload.order_id),
      captureMap: (context, sourceRow, centralRow) => {
        if (centralRow) {
          context.lineIdMap.set(Number(sourceRow.id), Number(centralRow.id));
        }
      }
    },
    outputs: {
      sourceTable: "rmc_opt_roster_outputs",
      centralTable: "rmc_opt_roster_outputs",
      columns: OUTPUT_COLUMNS,
      insertColumns: INSERT_OUTPUT_COLUMNS,
      hashFields: INSERT_OUTPUT_COLUMNS,
      equivalenceFields: ["tracking_key", "expected_path", "found_path", "style_output", "size", "player_number"],
      buildPayload: buildOutputPayload,
      findExisting: findExistingOutput,
      getNaturalKey: outputNaturalKey,
      getSourceRunId: (row) => row.order_id,
      getCentralRunId: (row) => row.order_id,
      requiresParent: true,
      hasRequiredParent: (payload) => Boolean(payload.order_id),
      captureMap: (context, sourceRow, centralRow) => {
        if (centralRow) {
          context.outputIdMap.set(Number(sourceRow.id), Number(centralRow.id));
        }
      }
    },
    assets: {
      sourceTable: "rmc_opt_assets",
      centralTable: "rmc_opt_assets",
      columns: ASSET_COLUMNS,
      insertColumns: INSERT_ASSET_COLUMNS,
      hashFields: INSERT_ASSET_COLUMNS,
      equivalenceFields: ["asset_type", "path"],
      buildPayload: buildAssetPayload,
      findExisting: findExistingAsset,
      getNaturalKey: assetNaturalKey,
      getSourceRunId: (row) => row.order_id || row.output_id || row.line_id || row.id,
      getCentralRunId: (row) => row.order_id || row.output_id || row.line_id || row.id,
      requiresParent: false,
      hasRequiredParent: () => true,
      captureMap: () => {}
    }
  };
}

function emptySummary() {
  return {
    rowsRead: 0,
    rowsValid: 0,
    rowsInserted: 0,
    rowsUpdated: 0,
    rowsUnchanged: 0,
    rowsSkipped: 0,
    conflicts: 0,
    errors: 0,
    byTable: {
      orders: 0,
      lines: 0,
      outputs: 0,
      assets: 0
    }
  };
}

async function syncOperatorSource(centralDb, source) {
  let snapshotPath = "";
  let sourceDb = null;
  let sourceId = null;
  let syncRunId = null;
  const summary = emptySummary();

  try {
    snapshotPath = await copyDatabaseSnapshot(source.dbPath, source.operator);
    sourceDb = openSnapshotDatabase(snapshotPath);
    validateSourceSchema(sourceDb, `BD operador ${source.operator}`);

    const meta = getOperatorMeta(sourceDb, source.operator);
    const normalizedSource = {
      ...source,
      operator: meta.operatorCode
    };

    sourceId = upsertExternalSource(centralDb, normalizedSource);
    syncRunId = createSyncRun(centralDb, sourceId);

    const rows = readOptimizerRows(sourceDb);
    summary.byTable.orders = rows.orders.length;
    summary.byTable.lines = rows.lines.length;
    summary.byTable.outputs = rows.outputs.length;
    summary.byTable.assets = rows.assets.length;
    summary.rowsRead = summary.byTable.orders + summary.byTable.lines + summary.byTable.outputs + summary.byTable.assets;
    summary.rowsValid = summary.rowsRead;

    const configs = buildConfigs();
    const context = {
      sourceId,
      operator: normalizedSource.operator,
      summary,
      orderIdMap: new Map(),
      lineIdMap: new Map(),
      outputIdMap: new Map()
    };

    const transaction = centralDb.transaction(() => {
      rows.orders.forEach((row) => syncGenericRow(centralDb, context, row, configs.orders));
      rows.lines.forEach((row) => syncGenericRow(centralDb, context, row, configs.lines));
      rows.outputs.forEach((row) => syncGenericRow(centralDb, context, row, configs.outputs));
      rows.assets.forEach((row) => syncGenericRow(centralDb, context, row, configs.assets));

      const status = summary.conflicts || summary.errors ? "partial" : "success";
      finishSyncRun(centralDb, syncRunId, status, summary);
      updateSourceAfterSync(centralDb, sourceId, source.dbPath, status, null);
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
      updateSourceAfterSync(centralDb, sourceId, source.dbPath, "error", error.message);
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

async function syncOperatorOptimizerDatabases(centralDb, options = {}) {
  ensureSyncSchema(centralDb);
  validateOptimizerSchema(centralDb, "BD central");

  const root = options.root || process.env.RMC_OPERATOR_DB_ROOT || DEFAULT_OPERATOR_DB_ROOT;
  const operators = splitList(options.operators);
  const sources = discoverOperatorDatabases(root, operators);

  if (!sources.length) {
    throw new Error("No se encontraron BDs de operador para sincronizar Optimizador.");
  }

  const results = [];

  for (const source of sources) {
    results.push(await syncOperatorSource(centralDb, source));
  }

  return {
    ok: true,
    source_type: SOURCE_TYPE,
    app_name: APP_NAME,
    root,
    operators: results.map((result) => result.operator),
    results,
    totals: results.reduce((totals, result) => {
      totals.rowsRead += result.summary.rowsRead;
      totals.rowsValid += result.summary.rowsValid;
      totals.rowsInserted += result.summary.rowsInserted;
      totals.rowsUpdated += result.summary.rowsUpdated;
      totals.rowsUnchanged += result.summary.rowsUnchanged;
      totals.rowsSkipped += result.summary.rowsSkipped;
      totals.conflicts += result.summary.conflicts;
      totals.errors += result.summary.errors;
      totals.byTable.orders += result.summary.byTable.orders;
      totals.byTable.lines += result.summary.byTable.lines;
      totals.byTable.outputs += result.summary.byTable.outputs;
      totals.byTable.assets += result.summary.byTable.assets;
      return totals;
    }, emptySummary())
  };
}

module.exports = {
  APP_NAME,
  DEFAULT_OPERATOR_DB_ROOT,
  SOURCE_TYPE,
  discoverOperatorDatabases,
  syncOperatorOptimizerDatabases
};
