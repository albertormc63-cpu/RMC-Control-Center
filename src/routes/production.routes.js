const express = require("express");
const db = require("../db");
const {
  normalizeKey,
  readDailyProductionSchedule,
  saveUploadedDailyProductionSchedule
} = require("../services/dailyProductionSchedule");

const router = express.Router();
const LOCAL_TIME_ZONE = "America/Mexico_City";
const SOURCE_TYPES = {
  print: "print_sublimation_excel",
  sublimation: "sublimation_output_excel"
};

function getLocalDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LOCAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    iso: `${values.year}-${values.month}-${values.day}`,
    display: `${Number(values.day)}/${Number(values.month)}/${String(values.year).slice(-2)}`
  };
}

function getRequestedDate(value) {
  const requested = String(value || "").trim();

  if (!requested) {
    return getLocalDateParts();
  }

  const match = requested.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    const error = new Error("Fecha invalida. Usa formato YYYY-MM-DD.");
    error.status = 400;
    throw error;
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
    iso: requested,
    display: `${Number(match[3])}/${Number(match[2])}/${String(match[1]).slice(-2)}`
  };
}

function hasTable(tableName) {
  const row = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name = ?
  `).get(tableName);

  return Boolean(row);
}

function getLatestSource(sourceType) {
  if (!hasTable("rmc_external_sources")) {
    return null;
  }

  return db.prepare(`
    SELECT
      id,
      name,
      area,
      source_type,
      active,
      last_sync_at,
      last_status,
      last_error
    FROM rmc_external_sources
    WHERE source_type = ?
    ORDER BY active DESC, id DESC
    LIMIT 1
  `).get(sourceType) || null;
}

function getMirrorWorkOrderMap(tableName, quantityColumn) {
  if (!hasTable(tableName)) {
    return {
      available: false,
      map: new Map(),
      sourceRows: 0
    };
  }

  const rows = db.prepare(`
    SELECT
      work_order,
      SUM(COALESCE(${quantityColumn}, 0)) AS quantity,
      COUNT(*) AS rows
    FROM ${tableName}
    WHERE is_active = 1
    AND COALESCE(${quantityColumn}, 0) > 0
    GROUP BY work_order
  `).all();

  return {
    available: true,
    map: new Map(rows.map(row => [normalizeKey(row.work_order), row])),
    sourceRows: rows.reduce((total, row) => total + (Number(row.rows) || 0), 0)
  };
}

function getMatchedSchedulePieces(scheduleRows, mirror) {
  if (!mirror.available) {
    return {
      available: false,
      pieces: 0,
      matched_rows: 0,
      matched_work_orders: 0,
      mirror_quantity: 0,
      source_rows: 0
    };
  }

  const matchedWorkOrders = new Set();

  return scheduleRows.reduce((summary, row) => {
    const match = mirror.map.get(row.work_order_key);

    if (!match) {
      return summary;
    }

    matchedWorkOrders.add(row.work_order_key);
    summary.pieces += row.pieces;
    summary.matched_rows += 1;
    summary.mirror_quantity += Number(match.quantity) || 0;
    summary.matched_work_orders = matchedWorkOrders.size;

    return summary;
  }, {
    available: true,
    pieces: 0,
    matched_rows: 0,
    matched_work_orders: 0,
    mirror_quantity: 0,
    source_rows: mirror.sourceRows
  });
}

function formatLocalDateTime(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: LOCAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function getUploadFilename(req) {
  const raw = String(req.get("X-RMC-FILE-NAME") || "Production Schedule Book.xlsm");

  try {
    return decodeURIComponent(raw);
  } catch (error) {
    return raw;
  }
}

router.post(
  "/schedule/upload",
  express.raw({
    type: "application/octet-stream",
    limit: "30mb"
  }),
  (req, res, next) => {
    try {
      const uploaded = saveUploadedDailyProductionSchedule(req.body, getUploadFilename(req));
      const schedule = readDailyProductionSchedule({
        lineGroups: req.query.line_groups
      });

      res.json({
        ok: true,
        uploaded,
        schedule: {
          available: schedule.available,
          path: schedule.path,
          sheet_name: schedule.sheet_name,
          file: schedule.file,
          file_exists: schedule.file_exists,
          file_size_bytes: schedule.file_size_bytes,
          file_mtime_ms: schedule.file_mtime_ms,
          total_rows: schedule.total_rows,
          total_pieces: schedule.total_pieces,
          selected_line_groups: schedule.selected_line_groups,
          line_groups: schedule.line_groups,
          by_line_group: schedule.by_line_group
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get("/daily", (req, res, next) => {
  try {
    const targetDate = getRequestedDate(req.query.date);
    const schedule = readDailyProductionSchedule({
      lineGroups: req.query.line_groups
    });
    const printed = getMatchedSchedulePieces(
      schedule.rows,
      getMirrorWorkOrderMap("rmc_print_sublimation_log", "order_quantity")
    );
    const sublimated = getMatchedSchedulePieces(
      schedule.rows,
      getMirrorWorkOrderMap("rmc_sublimation_output_log", "pcs")
    );
    const now = new Date();

    res.json({
      ok: true,
      date: targetDate,
      generated_at: now.toISOString(),
      generated_at_display: formatLocalDateTime(now.toISOString()),
      schedule: {
        available: schedule.available,
        path: schedule.path,
        sheet_name: schedule.sheet_name,
        file: schedule.file,
        file_exists: schedule.file_exists,
        file_size_bytes: schedule.file_size_bytes,
        file_mtime_ms: schedule.file_mtime_ms,
        total_rows: schedule.total_rows,
        total_pieces: schedule.total_pieces,
        selected_line_groups: schedule.selected_line_groups,
        line_groups: schedule.line_groups,
        by_line_group: schedule.by_line_group
      },
      stages: {
        printed: {
          key: "printed",
          label: "Impresas",
          available: schedule.available && printed.available,
          pieces: printed.pieces,
          matched_rows: printed.matched_rows,
          matched_work_orders: printed.matched_work_orders,
          mirror_quantity: printed.mirror_quantity,
          source_rows: printed.source_rows,
          source: getLatestSource(SOURCE_TYPES.print)
        },
        sublimated: {
          key: "sublimated",
          label: "Sublimadas",
          available: schedule.available && sublimated.available,
          pieces: sublimated.pieces,
          matched_rows: sublimated.matched_rows,
          matched_work_orders: sublimated.matched_work_orders,
          mirror_quantity: sublimated.mirror_quantity,
          source_rows: sublimated.source_rows,
          source: getLatestSource(SOURCE_TYPES.sublimation)
        },
        finished: {
          key: "finished",
          label: "Terminadas",
          available: false,
          pieces: null,
          matched_rows: 0,
          matched_work_orders: 0,
          source_rows: 0,
          source: null,
          pending_reason: "Pendiente de Excel/Fuente Costura-Final"
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
