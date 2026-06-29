const express = require("express");
const db = require("../db");
const {
  EMBARK_DATE_SQL,
  RUN_YEAR_SQL,
  TOOL_SQL,
  getNikeRunGroup
} = require("../services/nikeGroups");
const { attachNikeFilePaths } = require("../services/nikeFiles");

const router = express.Router();

function buildPrintSublimationState(summary) {
  if (Number(summary?.sublimationOutputCount || 0) > 0) {
    const pieces = Number(summary.sublimationOutputPieces || 0);

    return {
      status: "En almacen",
      detail: `${summary.sublimationOutputCount} registros en almacen | ${pieces} piezas`,
      stage: "almacen",
      hasPrintSublimationLog: true
    };
  }

  if (!summary || Number(summary.activeCount || 0) === 0) {
    return {
      status: "En proceso de impresion",
      detail: "Sin coincidencia en Sublimado",
      stage: "impresion",
      hasPrintSublimationLog: false
    };
  }

  if (Number(summary.partialCount || 0) > 0) {
    return {
      status: "Parcial en Sublimado",
      detail: `${summary.activeCount} registros activos | ${summary.totalReportedQuantity} piezas reportadas`,
      stage: "sublimado",
      hasPrintSublimationLog: true
    };
  }

  return {
    status: "Bajado a Sublimado",
    detail: `${summary.activeCount} registros activos | ${summary.totalReportedQuantity} piezas reportadas`,
    stage: "sublimado",
    hasPrintSublimationLog: true
  };
}

function getPrintSublimationSummariesByWorkOrder(workOrders) {
  const uniqueWorkOrders = [...new Set(workOrders.filter(Boolean).map(String))];

  if (!uniqueWorkOrders.length) {
    return new Map();
  }

  try {
    const rows = db.prepare(`
      SELECT
        work_order,
        COUNT(*) AS matches,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeCount,
        SUM(CASE WHEN is_active = 1 THEN COALESCE(order_quantity, 0) ELSE 0 END) AS totalReportedQuantity,
        SUM(
          CASE
            WHEN is_active = 1 AND UPPER(COALESCE(fecha_embarque, '')) LIKE '%PARCIAL%'
            THEN 1
            ELSE 0
          END
        ) AS partialCount
      FROM rmc_print_sublimation_log
      WHERE work_order IN (${uniqueWorkOrders.map(() => "?").join(",")})
      GROUP BY work_order
    `).all(...uniqueWorkOrders);

    return new Map(rows.map(row => [String(row.work_order), {
      matches: Number(row.matches || 0),
      activeCount: Number(row.activeCount || 0),
      totalReportedQuantity: Number(row.totalReportedQuantity || 0),
      partialCount: Number(row.partialCount || 0)
    }]));
  } catch (error) {
    if (error && (error.code === "SQLITE_ERROR" || error.code === "SQLITE_SCHEMA")) {
      return new Map();
    }

    throw error;
  }
}

function getSublimationOutputSummariesByWorkOrder(workOrders) {
  const uniqueWorkOrders = [...new Set(workOrders.filter(Boolean).map(String))];

  if (!uniqueWorkOrders.length) {
    return new Map();
  }

  try {
    const rows = db.prepare(`
      SELECT
        work_order,
        COUNT(*) AS matches,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS activeCount,
        SUM(CASE WHEN is_active = 1 THEN COALESCE(pcs, 0) ELSE 0 END) AS totalPieces
      FROM rmc_sublimation_output_log
      WHERE work_order IN (${uniqueWorkOrders.map(() => "?").join(",")})
      GROUP BY work_order
    `).all(...uniqueWorkOrders);

    return new Map(rows.map(row => [String(row.work_order), {
      matches: Number(row.matches || 0),
      activeCount: Number(row.activeCount || 0),
      totalPieces: Number(row.totalPieces || 0)
    }]));
  } catch (error) {
    if (error && (error.code === "SQLITE_ERROR" || error.code === "SQLITE_SCHEMA")) {
      return new Map();
    }

    throw error;
  }
}

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

    const rawItems = db.prepare(`
      SELECT *
      FROM rmcop_nike_items
      WHERE run_id IN (${group.runIds.map(() => "?").join(",")})
      ORDER BY run_id, equipo, style, talla
    `).all(...group.runIds);
    const printSummaryByWorkOrder = getPrintSublimationSummariesByWorkOrder(
      rawItems.map(item => item.wo)
    );
    const sublimationOutputByWorkOrder = getSublimationOutputSummariesByWorkOrder(
      rawItems.map(item => item.wo)
    );
    const items = rawItems.map(item => {
      const printSublimationSummary = printSummaryByWorkOrder.get(String(item.wo || "")) || {
        matches: 0,
        activeCount: 0,
        totalReportedQuantity: 0,
        partialCount: 0
      };
      const sublimationOutputSummary = sublimationOutputByWorkOrder.get(String(item.wo || "")) || {
        matches: 0,
        activeCount: 0,
        totalPieces: 0
      };
      const operationalSummary = {
        ...printSublimationSummary,
        sublimationOutputCount: sublimationOutputSummary.activeCount,
        sublimationOutputPieces: sublimationOutputSummary.totalPieces
      };

      return {
        ...attachNikeFilePaths(db, item),
        print_sublimation: {
          summary: operationalSummary,
          state: buildPrintSublimationState(operationalSummary)
        }
      };
    });

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

// Regresa coincidencias del reporte de impresión/sublimado para un item Nike.
// Relación principal:
// rmcop_nike_items.wo = rmc_print_sublimation_log.work_order
router.get("/items/:id/print-sublimation", (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      res.status(400).json({
        error: "ID de item Nike inválido"
      });
      return;
    }

    const item = db.prepare(`
      SELECT
        id,
        run_id,
        fila_excel,
        wo,
        ship_order,
        style,
        style_family,
        equipo,
        variante,
        version,
        talla,
        piezas,
        nombre,
        numero,
        archivo,
        estado,
        fecha_embarque,
        roster,
        path
      FROM rmcop_nike_items
      WHERE id = ?
    `).get(itemId);

    if (!item) {
      res.status(404).json({
        error: "Item Nike no encontrado"
      });
      return;
    }

    if (!item.wo) {
      res.json({
        item,
        hasWorkOrder: false,
        hasPrintSublimationLog: false,
        summary: {
          matches: 0,
          totalReportedQuantity: 0,
          partialCount: 0,
          activeCount: 0,
          inactiveCount: 0,
          styleMatches: 0,
          rosterMatches: 0,
          sublimationOutputCount: 0,
          sublimationOutputPieces: 0
        },
        state: buildPrintSublimationState(null),
        sublimation_outputs: [],
        matches: []
      });
      return;
    }

    const matches = db.prepare(`
      SELECT
        id,
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
        is_active,
        missing_since,

        CASE
          WHEN UPPER(COALESCE(fecha_embarque, '')) LIKE '%PARCIAL%'
          THEN 1
          ELSE 0
        END AS is_partial,

        CASE
          WHEN TRIM(UPPER(COALESCE(style, ''))) = TRIM(UPPER(COALESCE(?, '')))
          THEN 1
          ELSE 0
        END AS style_match,

        CASE
          WHEN TRIM(UPPER(COALESCE(roster, ''))) = TRIM(UPPER(COALESCE(?, '')))
          THEN 1
          ELSE 0
        END AS roster_match

      FROM rmc_print_sublimation_log
      WHERE work_order = ?
      ORDER BY
        is_active DESC,
        fecha_impresion_papel DESC,
        source_row DESC
    `).all(item.style || "", item.roster || "", item.wo);

    let sublimationOutputs = [];

    try {
      sublimationOutputs = db.prepare(`
        SELECT
          id,
          source_id,
          fecha,
          work_order,
          style,
          pcs,
          embarque,
          maquina,
          total_piezas,
          notas,
          hora_sale_almacen,
          source_file,
          source_sheet,
          source_row,
          source_year,
          natural_key,
          row_hash,
          first_seen_at,
          last_seen_at,
          is_active,
          missing_since,

          CASE
            WHEN TRIM(UPPER(COALESCE(style, ''))) = TRIM(UPPER(COALESCE(?, '')))
            THEN 1
            ELSE 0
          END AS style_match

        FROM rmc_sublimation_output_log
        WHERE work_order = ?
        ORDER BY
          is_active DESC,
          fecha DESC,
          source_row DESC
      `).all(item.style || "", item.wo);
    } catch (error) {
      if (!error || (error.code !== "SQLITE_ERROR" && error.code !== "SQLITE_SCHEMA")) {
        throw error;
      }
    }

    
    const activeMatches = matches.filter(match => match.is_active === 1);
    const activeSublimationOutputs = sublimationOutputs.filter(output => output.is_active === 1);

    const summary = {
      matches: matches.length,
      activeCount: activeMatches.length,
      inactiveCount: matches.length - activeMatches.length,
      totalReportedQuantity: activeMatches.reduce((total, match) => {
        return total + (Number(match.order_quantity) || 0);
      }, 0),
      partialCount: activeMatches.filter(match => match.is_partial === 1).length,
      styleMatches: activeMatches.filter(match => match.style_match === 1).length,
      rosterMatches: activeMatches.filter(match => match.roster_match === 1).length,
      sublimationOutputCount: activeSublimationOutputs.length,
      sublimationOutputPieces: activeSublimationOutputs.reduce((total, output) => {
        return total + (Number(output.pcs) || 0);
      }, 0)
    };
    
    function formatLocalDateTime(value) {
      if (!value) return null;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return value;
      }

      return new Intl.DateTimeFormat("es-MX", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).format(date);
    }

    const formattedMatches = matches.map(match => ({
      ...match,

      // valores originales crudos de BD
      first_seen_at_raw: match.first_seen_at,
      last_seen_at_raw: match.last_seen_at,
      missing_since_raw: match.missing_since,

      // valores bonitos para mostrar en RMC CC
      first_seen_at_display: formatLocalDateTime(match.first_seen_at),
      last_seen_at_display: formatLocalDateTime(match.last_seen_at),
      missing_since_display: formatLocalDateTime(match.missing_since)
    }));

    const formattedSublimationOutputs = sublimationOutputs.map(output => ({
      ...output,

      first_seen_at_raw: output.first_seen_at,
      last_seen_at_raw: output.last_seen_at,
      missing_since_raw: output.missing_since,

      first_seen_at_display: formatLocalDateTime(output.first_seen_at),
      last_seen_at_display: formatLocalDateTime(output.last_seen_at),
      missing_since_display: formatLocalDateTime(output.missing_since)
    }));

    res.json({
      item,
      hasWorkOrder: true,
      hasPrintSublimationLog: activeMatches.length > 0 || activeSublimationOutputs.length > 0,
      summary,
      state: buildPrintSublimationState(summary),
      sublimation_outputs: formattedSublimationOutputs,
      matches: formattedMatches
    });

  } catch (error) {
    res.status(500).json({
      error: "No se pudo consultar impresión/sublimado para el item Nike",
      message: error.message
    });
  }
});

module.exports = router;
