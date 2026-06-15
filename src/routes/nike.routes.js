const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/runs", (req, res) => {
  const runs = db.prepare(`
    SELECT *
    FROM rmcop_nike_runs
    ORDER BY created_at DESC
  `).all();

  res.json(runs);
});

router.get("/runs/:id", (req, res) => {
  const { id } = req.params;

  const run = db.prepare(`
    SELECT *
    FROM rmcop_nike_runs
    WHERE id = ?
  `).get(id);

  const items = db.prepare(`
    SELECT *
    FROM rmcop_nike_items
    WHERE run_id = ?
    ORDER BY equipo, style, talla
  `).all(id);

  res.json({ run, items });
});

module.exports = router;