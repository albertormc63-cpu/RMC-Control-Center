const express = require("express");
const db = require("../db");
const {
  EMBARK_DATE_SQL,
  RUN_YEAR_SQL,
  TOOL_SQL,
  getNikeRunGroup
} = require("../services/nikeGroups");

const router = express.Router();

// Lista las ejecuciones Nike agrupadas por fecha de embarque.
router.get("/runs", (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 100));
    const offset = (page - 1) * limit;

    const runs = db.prepare(`
      WITH normalized_runs AS (
        SELECT
          id,
          ${EMBARK_DATE_SQL} AS fecha_embarque,
          ${RUN_YEAR_SQL} AS run_year,
          ${TOOL_SQL} AS herramienta,
          COALESCE(pedidos, 0) AS pedidos,
          COALESCE(piezas, 0) AS piezas
        FROM rmcop_nike_runs
      )
      SELECT
        fecha_embarque,
        run_year,
        MAX(id) AS sample_run_id,
        COUNT(*) AS run_count,
        SUM(pedidos) AS pedidos,
        SUM(piezas) AS piezas
      FROM normalized_runs
      GROUP BY fecha_embarque, run_year
      ORDER BY MAX(id) DESC
      LIMIT ?
      OFFSET ?
    `).all(limit, offset);

    res.json({ page, limit, runs });
  } catch (error) {
    res.status(500).json({
      error: "No se pudieron leer las ejecuciones Nike",
      message: error.message
    });
  }
});

// Regresa los items de Nike para todos los runs con la misma fecha de embarque.
router.get("/runs/:id", (req, res) => {
  try {
    const { id } = req.params;

    const group = getNikeRunGroup(db, id);

    if (!group) {
      res.status(404).json({ error: "Ejecucion Nike no encontrada" });
      return;
    }

    const items = db.prepare(`
      SELECT *
      FROM rmcop_nike_items
      WHERE run_id IN (${group.runIds.map(() => "?").join(",")})
      ORDER BY run_id, equipo, style, talla
    `).all(...group.runIds);

    res.json({
      run: group.run,
      groupDate: group.embarkDate,
      runCount: group.groupRuns.length,
      herramienta: group.herramienta,
      totalPedidos: group.pedidos,
      totalPieces: group.piezas,
      year: group.year,
      runIds: group.runIds,
      items
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el detalle Nike",
      message: error.message
    });
  }
});

module.exports = router;
