const path = require("path");

const REQUIRED_TABLES = [
  "rmc_opt_orders",
  "rmc_opt_order_lines",
  "rmc_opt_roster_outputs",
  "rmc_opt_assets"
];

const MONTHS_ES = {
  ene: "01",
  enero: "01",
  feb: "02",
  febrero: "02",
  mar: "03",
  marzo: "03",
  abr: "04",
  abril: "04",
  may: "05",
  mayo: "05",
  jun: "06",
  junio: "06",
  jul: "07",
  julio: "07",
  ago: "08",
  agosto: "08",
  sep: "09",
  sept: "09",
  septiembre: "09",
  set: "09",
  octubre: "10",
  oct: "10",
  nov: "11",
  noviembre: "11",
  dic: "12",
  diciembre: "12"
};

function tableExists(db, tableName) {
  return Boolean(db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(tableName));
}

function getAvailability(db) {
  const missingTables = REQUIRED_TABLES.filter(tableName => !tableExists(db, tableName));

  return {
    available: missingTables.length === 0,
    missing_tables: missingTables,
    print_source_available: tableExists(db, "rmc_print_sublimation_log"),
    sublimation_source_available: tableExists(db, "rmc_sublimation_output_log")
  };
}

function assertAvailable(db) {
  const availability = getAvailability(db);

  if (!availability.available) {
    const error = new Error(`Faltan tablas del tracking 27/Rapid: ${availability.missing_tables.join(", ")}`);
    error.status = 503;
    throw error;
  }

  return availability;
}

function normalizedRosterSql(column) {
  return `UPPER(TRIM(CASE
    WHEN INSTR(COALESCE(${column}, ''), '-') > 0
      THEN SUBSTR(${column}, 1, INSTR(${column}, '-') - 1)
    ELSE COALESCE(${column}, '')
  END))`;
}

function outputStyleMatchSql(sourceAlias, outputAlias) {
  return `UPPER(TRIM(COALESCE(${sourceAlias}.style, ''))) IN (
    UPPER(TRIM(COALESCE(${outputAlias}.style_output, ''))),
    UPPER(TRIM(COALESCE(${outputAlias}.style_base, ''))),
    UPPER(TRIM(COALESCE(${outputAlias}.style_roster, '')))
  )`;
}

function operationalSelects(availability, outputAlias = "ro") {
  const printMatch = availability.print_source_available
    ? `EXISTS (
        SELECT 1
        FROM rmc_print_sublimation_log ps
        WHERE COALESCE(ps.is_active, 1) = 1
          AND TRIM(CAST(ps.work_order AS TEXT)) = TRIM(CAST(${outputAlias}.wo AS TEXT))
          AND ${outputStyleMatchSql("ps", outputAlias)}
          AND ${normalizedRosterSql("ps.roster")} = ${normalizedRosterSql(`${outputAlias}.roster`)}
      )`
    : "0";
  const sublimationMatch = availability.sublimation_source_available
    ? `EXISTS (
        SELECT 1
        FROM rmc_sublimation_output_log so
        WHERE COALESCE(so.is_active, 1) = 1
          AND TRIM(CAST(so.work_order AS TEXT)) = TRIM(CAST(${outputAlias}.wo AS TEXT))
          AND ${outputStyleMatchSql("so", outputAlias)}
      )`
    : "0";

  return { printMatch, sublimationMatch };
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeYear(value, fallbackYear) {
  const raw = String(value || "").trim();

  if (/^\d{4}$/.test(raw)) return raw;
  if (/^\d{2}$/.test(raw)) return `20${raw}`;
  return String(fallbackYear || new Date().getFullYear());
}

function getFallbackYear(order) {
  if (order?.roster_year) {
    return String(order.roster_year);
  }

  const dateText = String(order?.updated_at || order?.created_at || "");
  const isoMatch = dateText.match(/^(\d{4})-/);

  return isoMatch?.[1] || String(new Date().getFullYear());
}

function parseEmbarkDate(value, fallbackYear) {
  const raw = String(value || "").trim();
  const fallback = normalizeYear("", fallbackYear);

  if (!raw) {
    return {
      raw: "",
      display: "Sin emb",
      sort_key: `${fallback}-00-00`,
      date_key: `${fallback}-00-00`,
      month_key: ""
    };
  }

  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");

    return {
      raw,
      display: `${day}/${month}`,
      sort_key: `${year}-${month}-${day}`,
      date_key: `${year}-${month}-${day}`,
      month_key: `${year}-${month}`
    };
  }

  const ddmmMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/);

  if (ddmmMatch) {
    const year = normalizeYear(ddmmMatch[3], fallback);
    const month = ddmmMatch[2].padStart(2, "0");
    const day = ddmmMatch[1].padStart(2, "0");

    return {
      raw,
      display: `${day}/${month}`,
      sort_key: `${year}-${month}-${day}`,
      date_key: `${year}-${month}-${day}`,
      month_key: `${year}-${month}`
    };
  }

  const spanishMatch = raw.match(/^(\d{1,2})[\s/-]+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ.]+)(?:[\s/-]+(\d{2,4}))?$/);

  if (spanishMatch) {
    const token = normalizeText(spanishMatch[2]).replace(/\.$/, "");
    const month = MONTHS_ES[token] || "00";
    const year = normalizeYear(spanishMatch[3], fallback);
    const day = spanishMatch[1].padStart(2, "0");

    return {
      raw,
      display: month === "00" ? raw : `${day}/${month}`,
      sort_key: `${year}-${month}-${day}`,
      date_key: `${year}-${month}-${day}`,
      month_key: month === "00" ? "" : `${year}-${month}`
    };
  }

  return {
    raw,
    display: raw,
    sort_key: `${fallback}-99-99-${raw}`,
    date_key: `${fallback}-99-99-${raw}`,
    month_key: ""
  };
}

function makeShipmentKey(shipment, cliente) {
  return `${shipment.date_key}|${String(cliente || "").trim()}`;
}

function isFileReady(status) {
  return ["ENCONTRADO", "MOVIDO"].includes(String(status || "").trim().toUpperCase());
}

function createAggregate() {
  return {
    lines: 0,
    listed_pieces: 0,
    outputs: 0,
    pieces: 0,
    styles: new Set(),
    files_ready: 0,
    print_matched_outputs: 0,
    sublimation_matched_outputs: 0
  };
}

function addOutputToAggregate(aggregate, output) {
  aggregate.outputs += 1;
  aggregate.pieces += Number(output.qty || 0);

  const style = String(output.style_output || output.style_base || output.style_roster || "").trim().toUpperCase();

  if (style) {
    aggregate.styles.add(style);
  }

  if (isFileReady(output.file_status)) {
    aggregate.files_ready += 1;
  }

  aggregate.print_matched_outputs += Number(output.print_match || 0);
  aggregate.sublimation_matched_outputs += Number(output.sublimation_match || 0);
}

function finalizeAggregate(aggregate) {
  return {
    ...aggregate,
    styles: aggregate.styles.size,
    operational_status: deriveAggregateStatus(aggregate)
  };
}

function deriveAggregateStatus(row) {
  const outputs = Number(row.outputs || 0);
  const printMatched = Number(row.print_matched_outputs || 0);
  const sublimationMatched = Number(row.sublimation_matched_outputs || 0);

  if (!outputs) return "SIN_OUTPUTS";
  if (sublimationMatched >= outputs) return "EN_ALMACEN";
  if (sublimationMatched > 0) return "PARCIAL_EN_ALMACEN";
  if (printMatched >= outputs) return "BAJADO_A_SUBLIMADO";
  if (printMatched > 0) return "PARCIAL_EN_SUBLIMADO";
  return "EN_PROCESO_DE_IMPRESION";
}

function deriveOutputStatus(output) {
  if (Number(output.sublimation_match || 0) > 0) return "EN_ALMACEN";
  if (Number(output.print_match || 0) > 0) return "BAJADO_A_SUBLIMADO";
  return "EN_PROCESO_DE_IMPRESION";
}

function getContext(db) {
  const availability = assertAvailable(db);
  const { printMatch, sublimationMatch } = operationalSelects(availability, "ro");

  const orders = db.prepare(`
    SELECT id, cliente, roster, roster_year, nombre_pedido,
           folder_status, estado, created_at, updated_at
    FROM rmc_opt_orders
    ORDER BY updated_at DESC, id DESC
  `).all();

  const orderById = new Map(orders.map(order => [Number(order.id), order]));

  const lines = db.prepare(`
    SELECT id, order_id, fila_lista, wo, style_lista, style_base, style_categoria,
           pcs_lista, emb, codigo_operativo, tela, estado, created_at, updated_at
    FROM rmc_opt_order_lines
    ORDER BY fila_lista, id
  `).all().map(line => {
    const order = orderById.get(Number(line.order_id)) || {};
    const shipment = parseEmbarkDate(line.emb, getFallbackYear(order));

    return {
      ...line,
      cliente: order.cliente || "",
      roster: order.roster || "",
      roster_year: order.roster_year || "",
      nombre_pedido: order.nombre_pedido || "",
      folder_status: order.folder_status || "",
      order_estado: order.estado || "",
      shipment,
      shipment_key: makeShipmentKey(shipment, order.cliente)
    };
  });

  const lineById = new Map(lines.map(line => [Number(line.id), line]));

  const outputs = db.prepare(`
    SELECT
      ro.id,
      ro.order_id,
      ro.line_id,
      ro.fila_roster,
      ro.roster,
      ro.wo,
      ro.nombre_pedido,
      ro.style_roster,
      ro.style_output,
      ro.style_base,
      ro.style_categoria,
      ro.subdesign,
      ro.color_or_descriptor,
      ro.size,
      ro.player_number,
      ro.first_name,
      ro.last_name,
      ro.position,
      ro.qty,
      ro.expected_filename,
      ro.file_status,
      ro.tracking_status,
      ro.tracking_key,
      ro.last_checked_at,
      ro.created_at,
      ro.updated_at,
      CASE WHEN ${printMatch} THEN 1 ELSE 0 END AS print_match,
      CASE WHEN ${sublimationMatch} THEN 1 ELSE 0 END AS sublimation_match
    FROM rmc_opt_roster_outputs ro
    ORDER BY ro.line_id, ro.fila_roster, ro.id
  `).all().map(output => {
    const line = lineById.get(Number(output.line_id)) || {};
    const computed = deriveOutputStatus(output);

    return {
      ...output,
      cliente: line.cliente || "",
      emb: line.emb || "",
      shipment_key: line.shipment_key || "",
      shipment: line.shipment || null,
      computed_tracking_status: computed,
      print_match: Number(output.print_match || 0),
      sublimation_match: Number(output.sublimation_match || 0)
    };
  });

  const outputsByLineId = new Map();
  const outputsByOrderId = new Map();

  outputs.forEach(output => {
    const lineId = Number(output.line_id || 0);
    const orderId = Number(output.order_id || 0);

    if (lineId) {
      outputsByLineId.set(lineId, [...(outputsByLineId.get(lineId) || []), output]);
    }

    if (orderId) {
      outputsByOrderId.set(orderId, [...(outputsByOrderId.get(orderId) || []), output]);
    }
  });

  return {
    availability,
    orders,
    orderById,
    lines,
    lineById,
    outputs,
    outputsByLineId,
    outputsByOrderId
  };
}

function getSummary(db) {
  const availability = assertAvailable(db);
  const { printMatch, sublimationMatch } = operationalSelects(availability);

  const summary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM rmc_opt_orders) AS orders,
      (SELECT COUNT(DISTINCT emb) FROM rmc_opt_order_lines WHERE TRIM(COALESCE(emb, '')) <> '') AS shipments,
      (SELECT COUNT(*) FROM rmc_opt_order_lines) AS lines,
      (SELECT COUNT(*) FROM rmc_opt_roster_outputs) AS outputs,
      (SELECT COALESCE(SUM(qty), 0) FROM rmc_opt_roster_outputs) AS pieces,
      (SELECT COUNT(DISTINCT UPPER(TRIM(COALESCE(style_output, style_base, style_roster, ''))))
       FROM rmc_opt_roster_outputs
       WHERE TRIM(COALESCE(style_output, style_base, style_roster, '')) <> '') AS styles,
      (SELECT COUNT(*)
       FROM rmc_opt_roster_outputs
       WHERE UPPER(TRIM(COALESCE(file_status, ''))) IN ('ENCONTRADO', 'MOVIDO')) AS files_ready,
      (SELECT COUNT(*) FROM rmc_opt_roster_outputs ro WHERE ${printMatch}) AS print_matched_outputs,
      (SELECT COUNT(*) FROM rmc_opt_roster_outputs ro WHERE ${sublimationMatch}) AS sublimation_matched_outputs,
      (SELECT MAX(updated_at) FROM rmc_opt_orders) AS updated_at
  `).get();

  return { ...availability, ...summary };
}

function getShipments(db) {
  const context = getContext(db);
  const shipments = new Map();

  context.lines.forEach(line => {
    if (!shipments.has(line.shipment_key)) {
      shipments.set(line.shipment_key, {
        shipment_key: line.shipment_key,
        emb: line.shipment.raw,
        fecha_embarque: line.shipment.display,
        sort_key: line.shipment.sort_key,
        month_key: line.shipment.month_key,
        year: line.shipment.sort_key.slice(0, 4),
        cliente: line.cliente,
        orders: new Set(),
        aggregate: createAggregate()
      });
    }

    const shipment = shipments.get(line.shipment_key);

    shipment.orders.add(Number(line.order_id));
    shipment.aggregate.lines += 1;
    shipment.aggregate.listed_pieces += Number(line.pcs_lista || 0);

    (context.outputsByLineId.get(Number(line.id)) || []).forEach(output => {
      addOutputToAggregate(shipment.aggregate, output);
    });
  });

  return [...shipments.values()]
    .map(shipment => ({
      ...shipment,
      order_count: shipment.orders.size,
      ...finalizeAggregate(shipment.aggregate),
      orders: undefined,
      aggregate: undefined
    }))
    .sort((a, b) => String(b.sort_key).localeCompare(String(a.sort_key)) || String(a.cliente).localeCompare(String(b.cliente)));
}

function getShipmentDetail(db, shipmentKey) {
  const context = getContext(db);
  const shipmentLines = context.lines.filter(line => line.shipment_key === shipmentKey);

  if (!shipmentLines.length) {
    const error = new Error("Embarque 27/Rapid no encontrado");
    error.status = 404;
    throw error;
  }

  const firstLine = shipmentLines[0];
  const shipmentAggregate = createAggregate();
  const orderGroups = new Map();

  shipmentLines.forEach(line => {
    shipmentAggregate.lines += 1;
    shipmentAggregate.listed_pieces += Number(line.pcs_lista || 0);

    const order = context.orderById.get(Number(line.order_id)) || {};
    const orderKey = Number(line.order_id);

    if (!orderGroups.has(orderKey)) {
      orderGroups.set(orderKey, {
        id: orderKey,
        cliente: order.cliente || "",
        roster: order.roster || "",
        nombre_pedido: order.nombre_pedido || "",
        folder_status: order.folder_status || "",
        estado: order.estado || "",
        shipment_key: line.shipment_key,
        lines: 0,
        listed_pieces: 0,
        aggregate: createAggregate()
      });
    }

    const orderGroup = orderGroups.get(orderKey);

    orderGroup.lines += 1;
    orderGroup.listed_pieces += Number(line.pcs_lista || 0);
    orderGroup.aggregate.lines += 1;
    orderGroup.aggregate.listed_pieces += Number(line.pcs_lista || 0);

    (context.outputsByLineId.get(Number(line.id)) || []).forEach(output => {
      addOutputToAggregate(shipmentAggregate, output);
      addOutputToAggregate(orderGroup.aggregate, output);
    });
  });

  const orders = [...orderGroups.values()]
    .map(order => ({
      ...order,
      ...finalizeAggregate(order.aggregate),
      aggregate: undefined
    }))
    .sort((a, b) => String(a.roster || "").localeCompare(String(b.roster || ""), "es", { numeric: true }));

  return {
    availability: context.availability,
    shipment: {
      shipment_key: firstLine.shipment_key,
      emb: firstLine.shipment.raw,
      fecha_embarque: firstLine.shipment.display,
      sort_key: firstLine.shipment.sort_key,
      month_key: firstLine.shipment.month_key,
      year: firstLine.shipment.sort_key.slice(0, 4),
      cliente: firstLine.cliente,
      order_count: orderGroups.size,
      ...finalizeAggregate(shipmentAggregate)
    },
    orders
  };
}

function getOrders(db) {
  const context = getContext(db);
  const rows = [];

  context.orders.forEach(order => {
    const aggregate = createAggregate();
    const lines = context.lines.filter(line => Number(line.order_id) === Number(order.id));

    lines.forEach(line => {
      aggregate.lines += 1;
      aggregate.listed_pieces += Number(line.pcs_lista || 0);
    });

    (context.outputsByOrderId.get(Number(order.id)) || []).forEach(output => {
      addOutputToAggregate(aggregate, output);
    });

    rows.push({
      ...order,
      shipments: [...new Set(lines.map(line => line.shipment.display))].join(", "),
      ...finalizeAggregate(aggregate)
    });
  });

  return rows;
}

function getOrderDetail(db, orderId, options = {}) {
  const context = getContext(db);
  const id = Number(orderId);

  if (!Number.isInteger(id) || id < 1) {
    const error = new Error("ID de pedido 27/Rapid invalido");
    error.status = 400;
    throw error;
  }

  const order = context.orderById.get(id);

  if (!order) {
    const error = new Error("Pedido 27/Rapid no encontrado");
    error.status = 404;
    throw error;
  }

  const shipmentKey = String(options.shipmentKey || "").trim();
  const lines = context.lines.filter(line => {
    if (Number(line.order_id) !== id) return false;
    return !shipmentKey || line.shipment_key === shipmentKey;
  });
  const lineIds = new Set(lines.map(line => Number(line.id)));
  const outputs = (context.outputsByOrderId.get(id) || []).filter(output => {
    return !shipmentKey || lineIds.has(Number(output.line_id));
  });
  const aggregate = createAggregate();

  lines.forEach(line => {
    aggregate.lines += 1;
    aggregate.listed_pieces += Number(line.pcs_lista || 0);
  });
  outputs.forEach(output => addOutputToAggregate(aggregate, output));

  const assets = db.prepare(`
    SELECT id, order_id, line_id, output_id, asset_type, path, asset_exists,
           detected_at, notes
    FROM rmc_opt_assets
    WHERE order_id = ?
    ORDER BY asset_type, id
  `).all(id)
    .filter(asset => {
      if (!shipmentKey) return true;
      return lineIds.has(Number(asset.line_id)) || outputs.some(output => Number(output.id) === Number(asset.output_id));
    })
    .map(asset => ({
      ...asset,
      filename: asset.path ? path.basename(asset.path) : "",
      path: undefined
    }));

  return {
    availability: context.availability,
    order: {
      ...order,
      ...finalizeAggregate(aggregate),
      lines: lines.length,
      assets: assets.length,
      shipment_key: shipmentKey || lines[0]?.shipment_key || "",
      emb: lines[0]?.shipment.raw || "",
      fecha_embarque: lines[0]?.shipment.display || "",
      year: lines[0]?.shipment.sort_key?.slice(0, 4) || getFallbackYear(order)
    },
    lines,
    outputs,
    assets
  };
}

module.exports = {
  getAvailability,
  getSummary,
  getShipments,
  getShipmentDetail,
  getOrders,
  getOrderDetail
};
