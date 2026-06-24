const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const XLSX = require("xlsx");

const db = require("../db");

function cleanValue(value) {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).trim();
}

function normalizeKeyPart(value) {
  return cleanValue(value)
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function makeHash(payload) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

function extractSourceYear(sheetName, fechaEmbarque) {
  const fromSheet = String(sheetName || "").match(/20\d{2}/);
  if (fromSheet) return fromSheet[0];

  const fromDate = String(fechaEmbarque || "").match(/20\d{2}/);
  if (fromDate) return fromDate[0];

  return String(new Date().getFullYear());
}

function isPartialRow(row) {
  return normalizeKeyPart(row.fecha_embarque).includes("PARCIAL");
}

function buildNaturalKey(row, sourceYear) {
  const parts = [
    sourceYear,
    row.work_order,
    row.style,
    row.roster,
    row.process,
    row.fecha_impresion_papel,
    row.num_impresion_papel,
    row.plotter_number
  ];

  // Regla de negocio:
  // Si es parcial, cada línea del Excel puede representar una bajada parcial distinta,
  // aunque los datos se vean repetidos. Por eso se preserva por source_row.
  if (isPartialRow(row)) {
    parts.push(`ROW:${row.source_row}`);
  }

  return parts.map(normalizeKeyPart).join("|");
}

function copyExcelToTemp(filePath) {
  const tempFile = path.join(
    os.tmpdir(),
    `rmc-print-sync-${Date.now()}-${path.basename(filePath)}`
  );

  fs.copyFileSync(filePath, tempFile);
  return tempFile;
}

function readPrintSublimationExcel(source) {
  if (!fs.existsSync(source.file_path)) {
    throw new Error(`No existe el archivo o el volumen no está montado: ${source.file_path}`);
  }

  const stat = fs.statSync(source.file_path);
  const tempFile = copyExcelToTemp(source.file_path);

  try {
    const workbook = XLSX.readFile(tempFile, {
      cellDates: true
    });

    const sheetName = source.sheet_name;

    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(
        `No existe la hoja "${sheetName}". Hojas disponibles: ${workbook.SheetNames.join(", ")}`
      );
    }

    const sheet = workbook.Sheets[sheetName];

    // Lee toda la hoja como arreglo de arreglos.
    // La fila 3 de Excel es índice 2 en JS.
    const MAX_ROWS_TO_SCAN = 20000;

    // Leemos solo columnas A:L y máximo hasta fila 20000.
    // Esto evita que Excel nos mande hasta la fila 1,048,576 por formato vacío.
    const matrix = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        raw: false,
        range: `A1:L${MAX_ROWS_TO_SCAN}`
    });
    const headerRowIndex = 2;
    const dataStartIndex = 3;

    const headers = (matrix[headerRowIndex] || [])
      .slice(0, 12)
      .map(cleanValue);

    const expectedHeaders = [
      "TYPE",
      "Plotter #",
      "Work Order",
      "Style",
      "Roster",
      "Process",
      "Order Quantity",
      "Fecha impresión papel",
      "# Impresion papel",
      "Diseñador",
      "Impresor",
      "FECHA DE EMBARQUE"
    ];

    const rows = [];

    for (let index = dataStartIndex; index < matrix.length; index++) {
      const excelRowNumber = index + 1;
      const cells = matrix[index] || [];

      const row = {
        type: cleanValue(cells[0]),
        plotter_number: cleanValue(cells[1]),
        work_order: cleanValue(cells[2]),
        style: cleanValue(cells[3]),
        roster: cleanValue(cells[4]),
        process: cleanValue(cells[5]),
        order_quantity: Number(cleanValue(cells[6])) || 0,
        fecha_impresion_papel: cleanValue(cells[7]),
        num_impresion_papel: cleanValue(cells[8]),
        disenador: cleanValue(cells[9]),
        impresor: cleanValue(cells[10]),
        fecha_embarque: cleanValue(cells[11]),
        source_file: source.file_path,
        source_sheet: sheetName,
        source_row: excelRowNumber
      };

      // Fila sin Work Order no cuenta como registro válido.
      if (!row.work_order) {
        continue;
      }

      const sourceYear = extractSourceYear(sheetName, row.fecha_embarque);
      row.source_year = sourceYear;
      row.natural_key = buildNaturalKey(row, sourceYear);
      row.row_hash = makeHash({
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
        fecha_embarque: row.fecha_embarque
      });

      rows.push(row);
    }

    return {
      source,
      file: {
        path: source.file_path,
        size_bytes: stat.size,
        mtime_ms: Math.round(stat.mtimeMs)
      },
      headers,
      expectedHeaders,
      rows_read: Math.max(matrix.length - dataStartIndex, 0),
      rows_valid: rows.length,
      sample_rows: rows.slice(0, 5),
      rows
    };
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch (error) {
      // No detenemos el proceso si no se pudo borrar el temporal.
      console.warn("No se pudo eliminar archivo temporal:", tempFile);
    }
  }
}

function getSourceById(sourceId) {
  const source = db.prepare(`
    SELECT *
    FROM rmc_external_sources
    WHERE id = ?
  `).get(sourceId);

  if (!source) {
    throw new Error(`No existe fuente externa con id ${sourceId}`);
  }

  return source;
}

function previewPrintSublimationSource(sourceId) {
  const source = getSourceById(sourceId);
  return readPrintSublimationExcel(source);
}
function createSyncRun(sourceId) {
  const result = db.prepare(`
    INSERT INTO rmc_sync_runs (
      source_id,
      status
    )
    VALUES (?, ?)
  `).run(sourceId, "running");

  return result.lastInsertRowid;
}

function finishSyncRun(syncRunId, summary) {
  db.prepare(`
    UPDATE rmc_sync_runs
    SET
      finished_at = CURRENT_TIMESTAMP,
      status = ?,
      rows_read = ?,
      rows_valid = ?,
      rows_inserted = ?,
      rows_updated = ?,
      rows_unchanged = ?,
      rows_missing = ?,
      rows_skipped = ?,
      error_message = ?
    WHERE id = ?
  `).run(
    summary.status,
    summary.rows_read,
    summary.rows_valid,
    summary.rows_inserted,
    summary.rows_updated,
    summary.rows_unchanged,
    summary.rows_missing,
    summary.rows_skipped,
    summary.error_message || null,
    syncRunId
  );
}

function updateSourceAfterSync(sourceId, file, status, errorMessage = null) {
  db.prepare(`
    UPDATE rmc_external_sources
    SET
      last_mtime_ms = ?,
      last_size_bytes = ?,
      last_sync_at = CURRENT_TIMESTAMP,
      last_status = ?,
      last_error = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    file?.mtime_ms || null,
    file?.size_bytes || null,
    status,
    errorMessage,
    sourceId
  );
}

function upsertPrintSublimationRows(sourceId, syncRunId, rows) {
  const now = new Date().toISOString();

  const existingStmt = db.prepare(`
    SELECT id, row_hash, is_active
    FROM rmc_print_sublimation_log
    WHERE source_id = ?
    AND natural_key = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO rmc_print_sublimation_log (
      source_id,

      type,
      plotter_number,
      work_order,
      style,
      roster,
      process,
      order_quantity,
      fecha_impresion_papel,
      num_impresion_papel,
      disenador,
      impresor,
      fecha_embarque,

      source_file,
      source_sheet,
      source_row,
      source_year,

      natural_key,
      row_hash,

      first_seen_at,
      last_seen_at,
      last_seen_sync_id,

      is_active,
      missing_since,

      created_at,
      updated_at
    )
    VALUES (
      @source_id,

      @type,
      @plotter_number,
      @work_order,
      @style,
      @roster,
      @process,
      @order_quantity,
      @fecha_impresion_papel,
      @num_impresion_papel,
      @disenador,
      @impresor,
      @fecha_embarque,

      @source_file,
      @source_sheet,
      @source_row,
      @source_year,

      @natural_key,
      @row_hash,

      @now,
      @now,
      @sync_run_id,

      1,
      NULL,

      @now,
      @now
    )
  `);

  const updateStmt = db.prepare(`
    UPDATE rmc_print_sublimation_log
    SET
      type = @type,
      plotter_number = @plotter_number,
      work_order = @work_order,
      style = @style,
      roster = @roster,
      process = @process,
      order_quantity = @order_quantity,
      fecha_impresion_papel = @fecha_impresion_papel,
      num_impresion_papel = @num_impresion_papel,
      disenador = @disenador,
      impresor = @impresor,
      fecha_embarque = @fecha_embarque,

      source_file = @source_file,
      source_sheet = @source_sheet,
      source_row = @source_row,
      source_year = @source_year,

      row_hash = @row_hash,
      last_seen_at = @now,
      last_seen_sync_id = @sync_run_id,

      is_active = 1,
      missing_since = NULL,

      updated_at = @now
    WHERE source_id = @source_id
    AND natural_key = @natural_key
  `);

  const touchStmt = db.prepare(`
    UPDATE rmc_print_sublimation_log
    SET
      last_seen_at = @now,
      last_seen_sync_id = @sync_run_id,
      is_active = 1,
      missing_since = NULL
    WHERE source_id = @source_id
    AND natural_key = @natural_key
  `);

  const markMissingStmt = db.prepare(`
    UPDATE rmc_print_sublimation_log
    SET
      is_active = 0,
      missing_since = COALESCE(missing_since, CURRENT_TIMESTAMP),
      updated_at = CURRENT_TIMESTAMP
    WHERE source_id = ?
    AND is_active = 1
    AND (
      last_seen_sync_id IS NULL
      OR last_seen_sync_id != ?
    )
  `);

  let rows_inserted = 0;
  let rows_updated = 0;
  let rows_unchanged = 0;
  let rows_skipped = 0;

  const seenKeys = new Set();

  const transaction = db.transaction(() => {
    for (const row of rows) {
      if (!row.work_order || !row.natural_key) {
        rows_skipped++;
        continue;
      }

      // Evita que dos filas idénticas del mismo Excel choquen en la misma sync.
      if (seenKeys.has(row.natural_key)) {
        rows_skipped++;
        continue;
      }

      seenKeys.add(row.natural_key);

      const payload = {
        ...row,
        source_id: sourceId,
        sync_run_id: syncRunId,
        now
      };

      const existing = existingStmt.get(sourceId, row.natural_key);

      if (!existing) {
        insertStmt.run(payload);
        rows_inserted++;
        continue;
      }

      if (existing.row_hash !== row.row_hash || existing.is_active === 0) {
        updateStmt.run(payload);
        rows_updated++;
        continue;
      }

      touchStmt.run(payload);
      rows_unchanged++;
    }

    const missingResult = markMissingStmt.run(sourceId, syncRunId);

    return {
      rows_inserted,
      rows_updated,
      rows_unchanged,
      rows_missing: missingResult.changes,
      rows_skipped
    };
  });

  return transaction();
}

function syncPrintSublimationSource(sourceId) {
  const syncRunId = createSyncRun(sourceId);

  let result = null;

  try {
    result = previewPrintSublimationSource(sourceId);

    const upsertSummary = upsertPrintSublimationRows(
      sourceId,
      syncRunId,
      result.rows
    );

    const summary = {
      status: "success",
      rows_read: result.rows_read,
      rows_valid: result.rows_valid,
      rows_inserted: upsertSummary.rows_inserted,
      rows_updated: upsertSummary.rows_updated,
      rows_unchanged: upsertSummary.rows_unchanged,
      rows_missing: upsertSummary.rows_missing,
      rows_skipped: upsertSummary.rows_skipped,
      error_message: null
    };

    finishSyncRun(syncRunId, summary);
    updateSourceAfterSync(sourceId, result.file, "success", null);

    return {
      sync_run_id: syncRunId,
      source: result.source,
      file: result.file,
      summary
    };
  } catch (error) {
    const summary = {
      status: "error",
      rows_read: 0,
      rows_valid: 0,
      rows_inserted: 0,
      rows_updated: 0,
      rows_unchanged: 0,
      rows_missing: 0,
      rows_skipped: 0,
      error_message: error.message
    };

    finishSyncRun(syncRunId, summary);
    updateSourceAfterSync(sourceId, result?.file || null, "error", error.message);

    throw error;
  }
}

module.exports = {
  previewPrintSublimationSource,
  readPrintSublimationExcel,
  syncPrintSublimationSource
};