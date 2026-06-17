const express = require("express");
const db = require("../db");

const router = express.Router();

// Lista las ejecuciones de MockupTool para explorarlas desde el dashboard.
router.get("/runs", (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 100));
    const offset = (page - 1) * limit;

    const runs = db.prepare(`
      SELECT *
      FROM rmc_mockuptool_runs
      ORDER BY id DESC
      LIMIT ?
      OFFSET ?
    `).all(limit, offset);

    res.json({ page, limit, runs });
  } catch (error) {
    res.status(500).json({
      error: "No se pudieron leer las ejecuciones MockupTool",
      message: error.message
    });
  }
});

// Regresa una ejecucion MockupTool y sus items consolidados.
router.get("/runs/:id", (req, res) => {
  try {
    const { id } = req.params;

    const run = db.prepare(`
      SELECT *
      FROM rmc_mockuptool_runs
      WHERE id = ?
    `).get(id);

    // Evita que la UI intente pintar detalles cuando el id no existe.
    if (!run) {
      res.status(404).json({ error: "Ejecucion MockupTool no encontrada" });
      return;
    }

    // Orden pensado para revisar plantillas por equipo/style/talla.
    const items = db.prepare(`
      SELECT *
      FROM rmc_mockuptool_items
      WHERE run_id = ?
      ORDER BY equipo, style, talla
    `).all(id);

    res.json({ run, items });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el detalle MockupTool",
      message: error.message
    });
  }
});

module.exports = router;
