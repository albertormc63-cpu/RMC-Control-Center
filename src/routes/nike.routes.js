const express = require("express");
const db = require("../db");
const {
  EMBARK_DATE_SQL,
  RUN_YEAR_SQL,
  TOOL_SQL,
  getNikeRunGroup
} = require("../services/nikeGroups");
const {
  activeNikeItemWhere,
  cancelNikeItem,
  ensureNikeCancellationSchema
} = require("../services/nikeCancellations");
const { attachNikeFilePaths } = require("../services/nikeFiles");

const router = express.Router();

ensureNikeCancellationSchema(db);

function getClientIp(req) {
  const ip = String(req.socket?.remoteAddress || req.ip || "").trim();

  if (!ip || ip === "::1") {
    return "127.0.0.1";
  }

  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

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

function isAllStarItem(item) {
  return [
    item.variant_code,
    item.catalog_variant_code,
    item.variante,
    item.catalog_variant_name
  ].some(value => /(^|\b)AS($|\b)|ALL\s*STARS?/i.test(String(value || "")));
}

function buildTeamDisplay(item) {
  const equipo = String(item.equipo || "").trim();

  if (equipo) {
    return equipo;
  }

  const teamDisplay = [item.team_market, item.team_mascot]
    .map(value => String(value || "").trim())
    .filter(Boolean)
    .join(" ");

  if (isAllStarItem(item) && teamDisplay) {
    return teamDisplay;
  }

  const hasCatalogTeam = [item.team_code, item.team_name]
    .some(value => String(value || "").trim());

  if (hasCatalogTeam) {
    return teamDisplay
      || String(item.team_name || "").trim()
      || String(item.team_code || "").trim();
  }

  return String(item.aliases || "")
    .split(";")
    .map(alias => alias.trim())
    .find(Boolean) || "";
}

function getCatalogVariantsById(items) {
  const ids = [...new Set(items
    .map(item => Number(item.catalog_variant_id))
    .filter(Number.isInteger))];

  if (!ids.length) {
    return new Map();
  }

  try {
    const rows = db.prepare(`
      SELECT
        id,
        variant_code,
        variant_name,
        team_code,
        team_name,
        team_market,
        team_mascot,
        aliases
      FROM rmc_nike_style_variants
      WHERE id IN (${ids.map(() => "?").join(",")})
    `).all(...ids);

    return new Map(rows.map(row => [Number(row.id), row]));
  } catch (error) {
    if (error && (error.code === "SQLITE_ERROR" || error.code === "SQLITE_SCHEMA")) {
      return new Map();
    }

    throw error;
  }
}

const NIKE_ITEM_SORTS = {
  wo: { sql: "i.wo", collate: true },
  style: { sql: "i.style", collate: true },
  equipo: {
    sql: "COALESCE(NULLIF(TRIM(i.equipo), ''), NULLIF(TRIM(v.team_market), ''), NULLIF(TRIM(v.team_name), ''), NULLIF(TRIM(v.aliases), ''), '')",
    collate: true
  },
  variante: { sql: "i.variante", collate: true },
  tipo: { sql: "i.herramienta", collate: true },
  talla: { sql: "i.talla", collate: true },
  piezas: { sql: "COALESCE(i.piezas, 0)", collate: false },
  nombre: { sql: "i.nombre", collate: true },
  numero: { sql: "i.numero", collate: true },
  estado: { sql: "i.estado", collate: true }
};
const NIKE_ITEM_SEARCH_COLUMNS = {
  0: ["i.wo"],
  1: ["i.style", "i.style_family"],
  2: ["i.equipo", "v.team_market", "v.team_mascot", "v.team_name", "v.aliases"],
  3: ["i.variante", "v.variant_code", "v.variant_name"],
  4: ["i.herramienta"],
  5: ["i.talla"],
  6: ["i.piezas"],
  7: ["i.nombre"],
  8: ["i.numero"],
  9: ["i.estado"]
};

function parsePositiveInteger(value, fallback, options = {}) {
  const min = options.min || 1;
  const max = options.max || Number.MAX_SAFE_INTEGER;
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function getNikeItemSearchSql(search, params, column) {
  const q = String(search || "").trim();

  if (!q) {
    return "";
  }

  const fields = NIKE_ITEM_SEARCH_COLUMNS[String(column || "")] || [
    "i.wo",
    "i.ship_order",
    "i.style",
    "i.style_family",
    "i.equipo",
    "i.variante",
    "i.version",
    "i.talla",
    "i.nombre",
    "i.numero",
    "i.archivo",
    "i.estado",
    "i.roster",
    "v.variant_code",
    "v.variant_name",
    "v.team_market",
    "v.team_mascot",
    "v.aliases"
  ];
  const like = `%${q}%`;

  fields.forEach(() => params.push(like));
  return `AND (${fields.map(field => `COALESCE(${field}, '') LIKE ?`).join(" OR ")})`;
}

function getNikeItemSortSql(sortKey, directionValue) {
  const sort = NIKE_ITEM_SORTS[String(sortKey || "").trim()] || null;
  const direction = String(directionValue || "").toLowerCase() === "desc" ? "DESC" : "ASC";

  if (!sort) {
    return "i.run_id ASC, COALESCE(i.equipo, '') COLLATE NOCASE ASC, COALESCE(i.style, '') COLLATE NOCASE ASC, COALESCE(i.talla, '') COLLATE NOCASE ASC, i.id ASC";
  }

  const collate = sort.collate ? " COLLATE NOCASE" : "";
  return `${sort.sql}${collate} ${direction}, i.id ASC`;
}

function getNikeItemsBaseQuery(runIds, search, extraParams = [], searchColumn = "all") {
  const params = [...runIds];
  const searchSql = getNikeItemSearchSql(search, params, searchColumn);

  extraParams.push(...params);

  return `
    FROM rmcop_nike_items i
    LEFT JOIN rmc_nike_style_variants v
      ON v.id = CAST(i.catalog_variant_id AS INTEGER)
    WHERE i.run_id IN (${runIds.map(() => "?").join(",")})
      AND ${activeNikeItemWhere("i")}
      ${searchSql}
  `;
}

function hydrateNikeItems(rawItems) {
  const printSummaryByWorkOrder = getPrintSublimationSummariesByWorkOrder(
    rawItems.map(item => item.wo)
  );
  const sublimationOutputByWorkOrder = getSublimationOutputSummariesByWorkOrder(
    rawItems.map(item => item.wo)
  );

  return rawItems.map(item => {
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
      equipo_display: buildTeamDisplay(item),
      print_sublimation: {
        summary: operationalSummary,
        state: buildPrintSublimationState(operationalSummary)
      }
    };
  });
}

function buildNikeFlowSummary(rawItems) {
  const printSummaryByWorkOrder = getPrintSublimationSummariesByWorkOrder(
    rawItems.map(item => item.wo)
  );
  const sublimationOutputByWorkOrder = getSublimationOutputSummariesByWorkOrder(
    rawItems.map(item => item.wo)
  );
  const stages = {
    diseno: {
      department: "diseno",
      label: "Impresion",
      detail: "En proceso",
      count: 0,
      pieces: 0
    },
    sublimado: {
      department: "sublimado",
      label: "Sublimado",
      detail: "Bajado / parcial",
      count: 0,
      pieces: 0
    },
    almacen: {
      department: "almacen",
      label: "Almacen",
      detail: "Liberado a linea",
      count: 0,
      pieces: 0
    }
  };

  rawItems.forEach(item => {
    const printSummary = printSummaryByWorkOrder.get(String(item.wo || "")) || {
      matches: 0,
      activeCount: 0,
      totalReportedQuantity: 0,
      partialCount: 0
    };
    const sublimationSummary = sublimationOutputByWorkOrder.get(String(item.wo || "")) || {
      activeCount: 0,
      totalPieces: 0
    };
    const state = buildPrintSublimationState({
      ...printSummary,
      sublimationOutputCount: sublimationSummary.activeCount,
      sublimationOutputPieces: sublimationSummary.totalPieces
    });
    const key = state.stage === "almacen"
      ? "almacen"
      : state.stage === "sublimado"
        ? "sublimado"
        : "diseno";

    stages[key].count += 1;
    stages[key].pieces += Number(item.piezas || 0);
  });

  return Object.values(stages).filter(stage => stage.count > 0);
}

function getNikeGroupItemData(group, options = {}) {
  const params = [];
  const baseQuery = getNikeItemsBaseQuery(group.runIds, options.search, params, options.searchColumn);
  const summary = db.prepare(`
    SELECT
      COUNT(*) AS itemCount,
      COUNT(DISTINCT COALESCE(NULLIF(TRIM(i.ship_order), ''), NULLIF(TRIM(i.wo), ''), CAST(i.id AS TEXT))) AS totalPedidos,
      COALESCE(SUM(i.piezas), 0) AS totalPieces
    ${baseQuery}
  `).get(...params);
  const flowRows = db.prepare(`
    SELECT
      i.id,
      i.wo,
      i.piezas
    ${baseQuery}
  `).all(...params);
  const limit = options.limit ? parsePositiveInteger(options.limit, 50, { min: 1, max: 200 }) : null;
  const totalItems = Number(summary.itemCount || 0);
  const totalPages = limit ? Math.max(1, Math.ceil(totalItems / limit)) : 1;
  const requestedPage = parsePositiveInteger(options.page, 1, { min: 1 });
  const page = Math.min(requestedPage, totalPages);
  const offset = limit ? (page - 1) * limit : 0;
  const orderSql = getNikeItemSortSql(options.sort, options.direction);
  const pageParams = [...params];
  const limitSql = limit ? "LIMIT ? OFFSET ?" : "";
  const includeItems = options.includeItems !== false;

  if (limit) {
    pageParams.push(limit, offset);
  }

  const rawItems = includeItems
    ? db.prepare(`
      SELECT
        i.*,
        v.variant_code AS catalog_variant_code,
        v.variant_name AS catalog_variant_name,
        v.team_code,
        v.team_name,
        v.team_market,
        v.team_mascot,
        v.aliases
      ${baseQuery}
      ORDER BY ${orderSql}
      ${limitSql}
    `).all(...pageParams)
    : [];
  return {
    summary: {
      totalItems,
      totalPedidos: Number(summary.totalPedidos || 0),
      totalPieces: Number(summary.totalPieces || 0)
    },
    flowSummary: buildNikeFlowSummary(flowRows),
    items: includeItems ? hydrateNikeItems(rawItems) : [],
    pagination: {
      page,
      limit: limit || totalItems,
      total: totalItems,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages
    }
  };
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
      ),
      active_items AS (
        SELECT
          i.run_id,
          COUNT(*) AS registros,
          COUNT(DISTINCT COALESCE(NULLIF(TRIM(i.ship_order), ''), NULLIF(TRIM(i.wo), ''), CAST(i.id AS TEXT))) AS pedidos,
          COALESCE(SUM(i.piezas), 0) AS piezas
        FROM rmcop_nike_items i
        WHERE ${activeNikeItemWhere("i")}
        GROUP BY i.run_id
      )
      SELECT
        nr.fecha_embarque,
        nr.run_year,
        MAX(nr.id) AS sample_run_id,
        COUNT(*) AS run_count,
        COALESCE(SUM(ai.pedidos), 0) AS pedidos,
        COALESCE(SUM(ai.piezas), 0) AS piezas
      FROM normalized_runs nr
      LEFT JOIN active_items ai ON ai.run_id = nr.id
      GROUP BY nr.fecha_embarque, nr.run_year
      HAVING COALESCE(SUM(ai.registros), 0) > 0
      ORDER BY MAX(nr.id) DESC
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
    const includeItems = String(req.query.include_items ?? "1") !== "0";

    const group = getNikeRunGroup(db, id);

    if (!group) {
      res.status(404).json({ error: "Ejecucion Nike no encontrada" });
      return;
    }

    const detail = getNikeGroupItemData(group, {
      limit: includeItems ? null : 1,
      includeItems
    });
    const items = includeItems ? detail.items : [];

    res.json({
      run: group.run,
      groupDate: group.embarkDate,
      runCount: group.groupRuns.length,
      herramienta: group.herramienta,
      totalPedidos: detail.summary.totalPedidos,
      totalPieces: detail.summary.totalPieces,
      totalItems: detail.summary.totalItems,
      year: group.year,
      runIds: group.runIds,
      flowSummary: detail.flowSummary,
      items
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el detalle Nike",
      message: error.message
    });
  }
});

// Regresa items Nike paginados para un embarque agrupado. La busqueda se aplica
// en SQLite sobre todo el grupo, no solo sobre la pagina visible.
router.get("/runs/:id/items", (req, res) => {
  try {
    const { id } = req.params;
    const group = getNikeRunGroup(db, id);

    if (!group) {
      res.status(404).json({ error: "Ejecucion Nike no encontrada" });
      return;
    }

    const detail = getNikeGroupItemData(group, {
      page: req.query.page,
      limit: req.query.limit || 50,
      search: req.query.q,
      searchColumn: req.query.column,
      sort: req.query.sort,
      direction: req.query.direction
    });

    res.json({
      run: group.run,
      groupDate: group.embarkDate,
      runCount: group.groupRuns.length,
      herramienta: group.herramienta,
      totalPedidos: detail.summary.totalPedidos,
      totalPieces: detail.summary.totalPieces,
      totalItems: detail.summary.totalItems,
      year: group.year,
      runIds: group.runIds,
      search: String(req.query.q || "").trim(),
      sort: String(req.query.sort || ""),
      direction: String(req.query.direction || "asc").toLowerCase() === "desc" ? "desc" : "asc",
      flowSummary: detail.flowSummary,
      pagination: detail.pagination,
      items: detail.items
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudieron leer los items Nike",
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
      FROM rmcop_nike_items i
      WHERE i.id = ?
        AND ${activeNikeItemWhere("i")}
    `).get(itemId);

    if (!item) {
      const cancelledItem = db.prepare(`
        SELECT 1
        FROM rmcop_nike_items i
        WHERE i.id = ?
          AND NOT ${activeNikeItemWhere("i")}
      `).get(itemId);

      if (cancelledItem) {
        res.status(410).json({
          error: "Item Nike dado de baja",
          message: "Este item Nike ya fue dado de baja"
        });
        return;
      }

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

router.post("/items/:id/cancel", (req, res) => {
  try {
    const result = cancelNikeItem(db, {
      itemId: req.params.id,
      reason: req.body?.reason,
      cancelledBy: getClientIp(req)
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : "No se pudo dar de baja el item Nike",
      message: error.message
    });
  }
});

module.exports = router;
