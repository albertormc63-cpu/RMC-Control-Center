const express = require("express");
const db = require("../db");

const {
  SUPPORTED_SOURCE_TYPES,
  syncPrintSublimationSource
} = require("../services/printSublimationSync");

const router = express.Router();

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
      sources
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
