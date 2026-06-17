const express = require("express");
const db = require("../db");

const router = express.Router();

// Lista las ejecuciones Nike mas recientes para la tabla principal.
router.get("/runs", (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 100));
    const offset = (page - 1) * limit;

    const runs = db.prepare(`
      SELECT *
      FROM rmcop_nike_runs
      ORDER BY id DESC
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

// Regresa una ejecucion Nike y todos sus items para el panel de detalle.
router.get("/runs/:id", (req, res) => {
  try {
    const { id } = req.params;

    const run = db.prepare(`
      SELECT *
      FROM rmcop_nike_runs
      WHERE id = ?
    `).get(id);

    // Si el usuario abre una ejecucion vieja o inexistente, se responde 404 limpio.
    if (!run) {
      res.status(404).json({ error: "Ejecucion Nike no encontrada" });
      return;
    }

    // Los items se ordenan de forma natural para produccion: equipo, style y talla.
    const items = db.prepare(`
      SELECT *
      FROM rmcop_nike_items
      WHERE run_id = ?
      ORDER BY equipo, style, talla
    `).all(id);

    res.json({ run, items });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el detalle Nike",
      message: error.message
    });
  }
});

module.exports = router;
