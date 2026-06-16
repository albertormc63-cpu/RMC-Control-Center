const express = require("express");
const db = require("../db");

const router = express.Router();

// Convierte duraciones tipo HH:MM:SS a segundos para poder promediar y graficar.
function durationToSeconds(value) {
  if (!value) {
    return 0;
  }

  const parts = String(value).split(":").map(Number);

  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return 0;
  }

  return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
}

// Regresa segundos a HH:MM:SS para mostrar el promedio en la UI.
function secondsToDuration(totalSeconds) {
  const seconds = Math.round(totalSeconds || 0);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return [hours, minutes, rest]
    .map(part => String(part).padStart(2, "0"))
    .join(":");
}

// Normaliza fechas DD/MM/YYYY o ids YYYYMMDD-* para poder agrupar por dia.
function normalizeDay(row) {
  const rawDate = row.created_at || row.fecha || "";
  const dateMatch = String(rawDate).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const idMatch = String(row.id || "").match(/^(\d{4})(\d{2})(\d{2})/);

  if (dateMatch) {
    return {
      key: `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`,
      label: `${dateMatch[1]}/${dateMatch[2]}`
    };
  }

  if (idMatch) {
    return {
      key: `${idMatch[1]}-${idMatch[2]}-${idMatch[3]}`,
      label: `${idMatch[3]}/${idMatch[2]}`
    };
  }

  return {
    key: "sin-fecha",
    label: "Sin fecha"
  };
}

// Normaliza una fecha a mes YYYY-MM para tablas historicas mensuales.
function normalizeMonth(row) {
  const rawDate = row.created_at || row.fecha || "";
  const dateMatch = String(rawDate).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const idMatch = String(row.id || "").match(/^(\d{4})(\d{2})(\d{2})/);

  if (dateMatch) {
    return {
      key: `${dateMatch[3]}-${dateMatch[2]}`,
      label: `${dateMatch[2]}/${dateMatch[3]}`
    };
  }

  if (idMatch) {
    return {
      key: `${idMatch[1]}-${idMatch[2]}`,
      label: `${idMatch[2]}/${idMatch[1]}`
    };
  }

  return {
    key: "sin-mes",
    label: "Sin mes"
  };
}

// Agrupa ejecuciones Nike por dia y calcula tiempo promedio/piezas.
function buildNikeDaily(rows) {
  const days = new Map();

  rows.forEach(row => {
    const day = normalizeDay(row);
    const seconds = durationToSeconds(row.tiempo);
    const current = days.get(day.key) || {
      key: day.key,
      label: day.label,
      runs: 0,
      piezas: 0,
      totalSeconds: 0,
      timedRuns: 0
    };

    current.runs += 1;
    current.piezas += Number(row.piezas || 0);

    if (seconds > 0) {
      current.totalSeconds += seconds;
      current.timedRuns += 1;
    }

    days.set(day.key, current);
  });

  return Array.from(days.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(day => ({
      key: day.key,
      label: day.label,
      runs: day.runs,
      piezas: day.piezas,
      avgSeconds: day.timedRuns ? Math.round(day.totalSeconds / day.timedRuns) : 0,
      avgTiempo: secondsToDuration(day.timedRuns ? day.totalSeconds / day.timedRuns : 0)
    }));
}

// Resume Nike por mes para una lectura mas estable cuando hay pocos dias.
function buildNikeMonthly(rows) {
  const months = new Map();

  rows.forEach(row => {
    const month = normalizeMonth(row);
    const seconds = durationToSeconds(row.tiempo);
    const current = months.get(month.key) || {
      key: month.key,
      label: month.label,
      runs: 0,
      pedidos: 0,
      piezas: 0,
      errores: 0,
      totalSeconds: 0,
      timedRuns: 0
    };

    current.runs += 1;
    current.pedidos += Number(row.pedidos || 0);
    current.piezas += Number(row.piezas || 0);
    current.errores += Number(row.errores || 0);

    if (seconds > 0) {
      current.totalSeconds += seconds;
      current.timedRuns += 1;
    }

    months.set(month.key, current);
  });

  return Array.from(months.values())
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(month => ({
      ...month,
      avgSeconds: month.timedRuns ? Math.round(month.totalSeconds / month.timedRuns) : 0,
      avgTiempo: secondsToDuration(month.timedRuns ? month.totalSeconds / month.timedRuns : 0)
    }));
}

// Agrupa ejecuciones MockupTool por dia y suma plantillas/faltantes.
function buildMockupDaily(rows) {
  const days = new Map();

  rows.forEach(row => {
    const day = normalizeDay(row);
    const current = days.get(day.key) || {
      key: day.key,
      label: day.label,
      runs: 0,
      plantillas: 0,
      faltantes: 0
    };

    current.runs += 1;
    current.plantillas += Number(row.pdfs_generados || 0);
    current.faltantes += Number(row.mockups_faltantes || 0);
    days.set(day.key, current);
  });

  return Array.from(days.values()).sort((a, b) => a.key.localeCompare(b.key));
}

// Resume MockupTool por mes para tener una tabla ejecutiva estable.
function buildMockupMonthly(rows) {
  const months = new Map();

  rows.forEach(row => {
    const month = normalizeMonth(row);
    const current = months.get(month.key) || {
      key: month.key,
      label: month.label,
      runs: 0,
      plantillas: 0,
      faltantes: 0
    };

    current.runs += 1;
    current.plantillas += Number(row.pdfs_generados || 0);
    current.faltantes += Number(row.mockups_faltantes || 0);
    months.set(month.key, current);
  });

  return Array.from(months.values()).sort((a, b) => a.key.localeCompare(b.key));
}

// Dashboard principal: mezcla metricas generales, Nike, MockupTool y datos para graficas.
router.get("/", (req, res) => {
  try {
    const tools = db.prepare(`
      SELECT COUNT(*) AS total
      FROM cep_registry
    `).get();

    const nikeRuns = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(pedidos), 0) AS pedidos,
        COALESCE(SUM(piezas), 0) AS piezas,
        COALESCE(SUM(estilos), 0) AS estilos,
        COALESCE(SUM(ok), 0) AS ok,
        COALESCE(SUM(errores), 0) AS errores
      FROM rmcop_nike_runs
    `).get();

    const nikeItems = db.prepare(`
      SELECT 
        COUNT(*) AS registros,
        COALESCE(SUM(piezas), 0) AS piezas,
        SUM(CASE WHEN error IS NOT NULL AND TRIM(error) != '' THEN 1 ELSE 0 END) AS errores
      FROM rmcop_nike_items
    `).get();

    const nikeRecentRuns = db.prepare(`
      SELECT id, created_at, tiempo, piezas, pedidos, errores
      FROM rmcop_nike_runs
      ORDER BY id DESC
      LIMIT 12
    `).all().reverse();

    const nikeDailyRuns = db.prepare(`
      SELECT id, created_at, tiempo, piezas, pedidos, errores
      FROM rmcop_nike_runs
      ORDER BY id ASC
    `).all();

    const nikeDurationSeconds = nikeRecentRuns
      .map(run => durationToSeconds(run.tiempo))
      .filter(seconds => seconds > 0);

    const mockupRuns = db.prepare(`
      SELECT
        COUNT(*) AS total,
        COALESCE(SUM(pdfs_generados), 0) AS plantillas,
        COALESCE(SUM(mockups_faltantes), 0) AS faltantes,
        COALESCE(SUM(filas_seleccionadas), 0) AS filas_seleccionadas,
        COALESCE(SUM(grupos_consolidados), 0) AS grupos_consolidados,
        COUNT(DISTINCT disenador) AS disenadores
      FROM rmc_mockuptool_runs
    `).get();

    const mockupItems = db.prepare(`
      SELECT
        COUNT(*) AS registros,
        SUM(CASE WHEN error IS NOT NULL AND TRIM(error) != '' THEN 1 ELSE 0 END) AS errores
      FROM rmc_mockuptool_items
    `).get();

    const mockupRecentRuns = db.prepare(`
      SELECT id, fecha, hora, styles, pdfs_generados, mockups_faltantes
      FROM rmc_mockuptool_runs
      ORDER BY id DESC
      LIMIT 12
    `).all().reverse();

    const mockupDailyRuns = db.prepare(`
      SELECT id, fecha, pdfs_generados, mockups_faltantes
      FROM rmc_mockuptool_runs
      ORDER BY id ASC
    `).all();

    const gitCommits = db.prepare(`
      SELECT COUNT(*) AS total
      FROM rmcop_nike_git_commits
    `).get();

    const registry = db.prepare(`
      SELECT source_app, runs_table, app_version, updated_at
      FROM cep_registry
      ORDER BY source_app
    `).all();

    const avgNikeSeconds = nikeDurationSeconds.length
      ? nikeDurationSeconds.reduce((sum, seconds) => sum + seconds, 0) / nikeDurationSeconds.length
      : 0;

    res.json({
      toolsCount: tools.total,
      gitCommits: gitCommits.total,
      errores: (nikeItems.errores || 0) + (mockupItems.errores || 0),
      registry,
      nike: {
        runs: nikeRuns.total,
        pedidos: nikeRuns.pedidos,
        registros: nikeItems.registros,
        piezas: nikeItems.piezas,
        estilos: nikeRuns.estilos,
        ok: nikeRuns.ok,
        errores: nikeRuns.errores + (nikeItems.errores || 0),
        promedioTiempo: secondsToDuration(avgNikeSeconds),
        daily: buildNikeDaily(nikeDailyRuns),
        monthly: buildNikeMonthly(nikeDailyRuns),
        recentRuns: nikeRecentRuns.map(run => ({
          ...run,
          tiempo_segundos: durationToSeconds(run.tiempo)
        }))
      },
      mockup: {
        runs: mockupRuns.total,
        registros: mockupItems.registros,
        plantillas: mockupRuns.plantillas,
        faltantes: mockupRuns.faltantes,
        filasSeleccionadas: mockupRuns.filas_seleccionadas,
        grupos: mockupRuns.grupos_consolidados,
        disenadores: mockupRuns.disenadores,
        errores: mockupItems.errores || 0,
        daily: buildMockupDaily(mockupDailyRuns),
        monthly: buildMockupMonthly(mockupDailyRuns),
        recentRuns: mockupRecentRuns
      }
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el dashboard",
      message: error.message
    });
  }
});

// Lista de CEPs registrados para la pantalla CEP Registry.
router.get("/registry", (req, res) => {
  try {
    const registry = db.prepare(`
      SELECT source_app, runs_table, app_version, created_at, updated_at
      FROM cep_registry
      ORDER BY source_app
    `).all();

    res.json(registry);
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el registro CEP",
      message: error.message
    });
  }
});

// Alta manual de apps CEP. Solo registra metadata, no crea tablas operativas.
router.post("/registry", (req, res) => {
  try {
    const sourceApp = String(req.body.source_app || "").trim();
    const runsTable = String(req.body.runs_table || "").trim();
    const appVersion = String(req.body.app_version || "").trim();

    if (!sourceApp || !runsTable) {
      res.status(400).json({
        error: "Faltan datos",
        message: "source_app y runs_table son obligatorios"
      });
      return;
    }

    db.prepare(`
      INSERT INTO cep_registry (source_app, runs_table, app_version)
      VALUES (?, ?, ?)
    `).run(sourceApp, runsTable, appVersion || null);

    const created = db.prepare(`
      SELECT source_app, runs_table, app_version, created_at, updated_at
      FROM cep_registry
      WHERE source_app = ?
    `).get(sourceApp);

    res.status(201).json(created);
  } catch (error) {
    const isDuplicate = error.code === "SQLITE_CONSTRAINT_PRIMARYKEY";

    res.status(isDuplicate ? 409 : 500).json({
      error: isDuplicate ? "CEP ya registrado" : "No se pudo registrar el CEP",
      message: error.message
    });
  }
});

// Conteo fijo de tablas conocidas para diagnostico rapido de la BD.
router.get("/tables", (req, res) => {
  try {
    const tables = [
      {
        name: "cep_registry",
        rows: db.prepare("SELECT COUNT(*) AS total FROM cep_registry").get().total
      },
      {
        name: "rmcop_nike_runs",
        rows: db.prepare("SELECT COUNT(*) AS total FROM rmcop_nike_runs").get().total
      },
      {
        name: "rmcop_nike_items",
        rows: db.prepare("SELECT COUNT(*) AS total FROM rmcop_nike_items").get().total
      },
      {
        name: "rmcop_nike_git_commits",
        rows: db.prepare("SELECT COUNT(*) AS total FROM rmcop_nike_git_commits").get().total
      },
      {
        name: "rmc_mockuptool_runs",
        rows: db.prepare("SELECT COUNT(*) AS total FROM rmc_mockuptool_runs").get().total
      },
      {
        name: "rmc_mockuptool_items",
        rows: db.prepare("SELECT COUNT(*) AS total FROM rmc_mockuptool_items").get().total
      }
    ];

    res.json(tables);
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el conteo de tablas",
      message: error.message
    });
  }
});

module.exports = router;
