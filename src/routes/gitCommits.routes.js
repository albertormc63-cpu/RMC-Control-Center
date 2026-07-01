const express = require("express");
const db = require("../db");
const {
  getCommitCount,
  getCommitCountsByTool,
  getLatestCommitByTool,
  getRecentCommits
} = require("../services/gitCommits");

const router = express.Router();

function getQueryFilters(req) {
  return {
    toolKey: req.params.toolKey || req.query.tool_key || "",
    dateFrom: req.query.date_from || "",
    dateTo: req.query.date_to || "",
    limit: req.query.limit,
    offset: req.query.offset
  };
}

router.get("/", (req, res) => {
  try {
    const filters = getQueryFilters(req);
    res.json({
      total: getCommitCount(db, filters),
      commits: getRecentCommits(db, filters)
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el historial de commits",
      message: error.message
    });
  }
});

router.get("/summary", (req, res) => {
  try {
    res.json({
      byTool: getCommitCountsByTool(db),
      latestByTool: getLatestCommitByTool(db)
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el resumen de commits",
      message: error.message
    });
  }
});

router.get("/:toolKey", (req, res) => {
  try {
    const filters = getQueryFilters(req);
    res.json({
      tool_key: req.params.toolKey,
      total: getCommitCount(db, filters),
      commits: getRecentCommits(db, filters)
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el historial de commits por herramienta",
      message: error.message
    });
  }
});

module.exports = router;
