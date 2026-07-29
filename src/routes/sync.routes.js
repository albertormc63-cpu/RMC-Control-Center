const express = require("express");
const fs = require("fs");
const db = require("../db");

const {
  SUPPORTED_SOURCE_TYPES,
  syncPrintSublimationSource
} = require("../services/printSublimationSync");

const router = express.Router();

function cleanText(value) {
  return String(value || "").trim();
}

function getSourceFileStatus(filePath) {
  try {
    const stat = fs.statSync(filePath);

    return {
      file_exists: true,
      file_size_bytes: stat.size,
      file_mtime_ms: Math.round(stat.mtimeMs)
    };
  } catch (error) {
    return {
      file_exists: false,
      file_size_bytes: null,
      file_mtime_ms: null
    };
  }
}

function serializeSource(source) {
  return {
    id: source.id,
    name: source.name,
    area: source.area,
    source_type: source.source_type,
    file_path: source.file_path,
    sheet_name: source.sheet_name,
    active: source.active,
    last_mtime_ms: source.last_mtime_ms,
    last_size_bytes: source.last_size_bytes,
    last_sync_at: source.last_sync_at,
    last_status: source.last_status,
    last_error: source.last_error,
    created_at: source.created_at,
    updated_at: source.updated_at,
    ...getSourceFileStatus(source.file_path)
  };
}

router.get("/sources", (req, res, next) => {
  try {
    const sources = db.prepare(`
      SELECT
        id,
        name,
        area,
        source_type,
        file_path,
        sheet_name,
        active,
        last_mtime_ms,
        last_size_bytes,
        last_sync_at,
        last_status,
        last_error,
        created_at,
        updated_at
      FROM rmc_external_sources
      ORDER BY id DESC
    `).all();

    res.json({
      ok: true,
      sources: sources.map(serializeSource)
    });
  } catch (error) {
    next(error);
  }
});

router.put("/sources/:id", (req, res, next) => {
  try {
    const sourceId = Number(req.params.id);

    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      return res.status(400).json({
        ok: false,
        error: "ID de fuente inválido"
      });
    }

    const source = db.prepare(`
      SELECT *
      FROM rmc_external_sources
      WHERE id = ?
    `).get(sourceId);

    if (!source) {
      return res.status(404).json({
        ok: false,
        error: "Fuente externa no encontrada"
      });
    }

    if (!SUPPORTED_SOURCE_TYPES.has(source.source_type)) {
      return res.status(400).json({
        ok: false,
        error: `Tipo de fuente no soportado todavía: ${source.source_type}`
      });
    }

    const payload = req.body || {};
    const nextName = cleanText(payload.name) || source.name;
    const nextArea = cleanText(payload.area) || source.area;
    const nextFilePath = cleanText(payload.file_path);
    const nextSheetName = cleanText(payload.sheet_name);
    const nextActive = Object.prototype.hasOwnProperty.call(payload, "active")
      ? payload.active === true || payload.active === 1 || payload.active === "1" ? 1 : 0
      : Number(source.active || 0);

    if (!nextFilePath) {
      return res.status(400).json({
        ok: false,
        error: "La ruta del archivo es obligatoria"
      });
    }

    if (!nextSheetName) {
      return res.status(400).json({
        ok: false,
        error: "El nombre de la hoja es obligatorio"
      });
    }

    const pathChanged = nextFilePath !== source.file_path;
    const sheetChanged = nextSheetName !== source.sheet_name;

    db.prepare(`
      UPDATE rmc_external_sources
      SET
        name = ?,
        area = ?,
        file_path = ?,
        sheet_name = ?,
        active = ?,
        last_mtime_ms = CASE WHEN ? THEN NULL ELSE last_mtime_ms END,
        last_size_bytes = CASE WHEN ? THEN NULL ELSE last_size_bytes END,
        last_error = CASE WHEN ? THEN NULL ELSE last_error END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      nextName,
      nextArea,
      nextFilePath,
      nextSheetName,
      nextActive,
      pathChanged || sheetChanged ? 1 : 0,
      pathChanged || sheetChanged ? 1 : 0,
      pathChanged || sheetChanged ? 1 : 0,
      sourceId
    );

    const updated = db.prepare(`
      SELECT *
      FROM rmc_external_sources
      WHERE id = ?
    `).get(sourceId);

    res.json({
      ok: true,
      source: serializeSource(updated)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/sources/:id/run", (req, res, next) => {
  try {
    const sourceId = Number(req.params.id);

    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      return res.status(400).json({
        ok: false,
        error: "ID de fuente inválido"
      });
    }

    const source = db.prepare(`
      SELECT *
      FROM rmc_external_sources
      WHERE id = ?
    `).get(sourceId);

    if (!source) {
      return res.status(404).json({
        ok: false,
        error: "Fuente externa no encontrada"
      });
    }

    if (!source.active) {
      return res.status(400).json({
        ok: false,
        error: "La fuente externa está inactiva"
      });
    }

    if (!SUPPORTED_SOURCE_TYPES.has(source.source_type)) {
      return res.status(400).json({
        ok: false,
        error: `Tipo de fuente no soportado todavía: ${source.source_type}`
      });
    }

    const result = syncPrintSublimationSource(sourceId);

    res.json({
      ok: true,
      sync_run_id: result.sync_run_id,
      source: {
        id: result.source.id,
        name: result.source.name,
        area: result.source.area,
        source_type: result.source.source_type,
        file_path: result.source.file_path,
        sheet_name: result.source.sheet_name
      },
      file: result.file,
      summary: result.summary
    });
  } catch (error) {
    next(error);
  }
});

router.get("/sources/:id/runs", (req, res, next) => {
  try {
    const sourceId = Number(req.params.id);

    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      return res.status(400).json({
        ok: false,
        error: "ID de fuente inválido"
      });
    }

    const runs = db.prepare(`
      SELECT
        id,
        source_id,
        started_at,
        finished_at,
        status,
        rows_read,
        rows_valid,
        rows_inserted,
        rows_updated,
        rows_unchanged,
        rows_missing,
        rows_skipped,
        error_message
      FROM rmc_sync_runs
      WHERE source_id = ?
      ORDER BY id DESC
      LIMIT 20
    `).all(sourceId);

    res.json({
      ok: true,
      runs
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
