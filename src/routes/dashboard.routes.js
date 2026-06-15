const express = require("express");
const db = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  const nikeRuns = db.prepare(`
    SELECT COUNT(*) AS total
    FROM rmcop_nike_runs
  `).get();

  const nikeItems = db.prepare(`
    SELECT 
      COUNT(*) AS registros,
      COALESCE(SUM(piezas), 0) AS piezas
    FROM rmcop_nike_items
  `).get();

  const mockupRuns = db.prepare(`
    SELECT COUNT(*) AS total
    FROM rmc_mockuptool_runs
  `).get();

  const errors = db.prepare(`
    SELECT COUNT(*) AS total
    FROM rmcop_nike_items
    WHERE error IS NOT NULL AND TRIM(error) != ''
  `).get();

  res.json({
    nikeRuns: nikeRuns.total,
    nikeRegistros: nikeItems.registros,
    nikePiezas: nikeItems.piezas,
    mockupRuns: mockupRuns.total,
    errores: errors.total
  });
});

module.exports = router;