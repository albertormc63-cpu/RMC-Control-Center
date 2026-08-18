const SOURCE_FIELD_CONFIGS = {
  print_sublimation_excel: {
    headerRowNumber: 3,
    dataStartRowNumber: 4,
    readRange: "A1:L20000",
    fields: [
      { key: "type", label: "Tipo", aliases: ["TYPE"], fallbackIndex: 0 },
      { key: "plotterNumber", label: "Plotter", aliases: ["Plotter #", "PLOTTER"], fallbackIndex: 1 },
      { key: "workOrder", label: "Work Order", aliases: ["Work Order", "WO", "WO#"], fallbackIndex: 2, required: true },
      { key: "style", label: "Style", aliases: ["Style", "Estilo"], fallbackIndex: 3 },
      { key: "roster", label: "Roster", aliases: ["Roster"], fallbackIndex: 4 },
      { key: "process", label: "Proceso", aliases: ["Process", "Proceso"], fallbackIndex: 5 },
      { key: "orderQuantity", label: "Cantidad orden", aliases: ["Order Quantity", "Cantidad", "Cantidad de piezas de la orden"], fallbackIndex: 6 },
      { key: "fechaImpresionPapel", label: "Fecha impresion papel", aliases: ["Fecha impresión papel", "Fecha impresion papel", "Fecha de Impresión"], fallbackIndex: 7 },
      { key: "numImpresionPapel", label: "# impresion papel", aliases: ["# Impresion papel", "# impresion papel", "# impresión papel"], fallbackIndex: 8 },
      { key: "disenador", label: "Disenador", aliases: ["Diseñador", "Disenador"], fallbackIndex: 9 },
      { key: "impresor", label: "Impresor", aliases: ["Impresor"], fallbackIndex: 10 },
      { key: "fechaEmbarque", label: "Fecha embarque", aliases: ["FECHA DE EMBARQUE", "Fecha de embarque", "Embarque"], fallbackIndex: 11 }
    ]
  },
  sublimation_output_excel: {
    headerRowNumber: 1,
    dataStartRowNumber: 2,
    readRange: "A1:M20000",
    fields: [
      { key: "fecha", label: "Fecha", aliases: ["FECHA", "Fecha"], fallbackIndex: 0 },
      { key: "workOrder", label: "Work Order", aliases: ["WORK ORDER", "Work Order", "WO", "WO#"], fallbackIndex: 1, required: true },
      { key: "style", label: "Style", aliases: ["STYLE", "Style", "Estilo"], fallbackIndex: 2 },
      { key: "pcs", label: "Piezas", aliases: ["PCS", "Piezas"], fallbackIndex: 3 },
      { key: "embarque", label: "Embarque", aliases: ["EMBARQUE", "Embarque"], fallbackIndex: null },
      { key: "maquina", label: "Maquina", aliases: ["MAQUINA", "MÁQUINA", "Maquina", "Máquina"], fallbackIndex: 7 },
      { key: "totalPiezas", label: "Total piezas", aliases: ["TOTAL DE PIEZAS", "Total de piezas"], fallbackIndex: 9 },
      { key: "notas", label: "Notas", aliases: ["NOTAS", "Notas", "Observaciones"], fallbackIndex: 11 },
      { key: "horaSaleAlmacen", label: "Hora salida almacen", aliases: ["HORA QUE SALE A ALMACEN", "HORA QUE SALE A ALMACÉN", "HORA SALE ALMACEN", "HORA SALE ALMACÉN", "HORA", "Hora"], fallbackIndex: 12 }
    ]
  },
  label_delivery_excel: {
    headerRowNumber: 5,
    dataStartRowNumber: 6,
    readRange: "A1:E20000",
    fields: [
      { key: "workOrder", label: "Numero de corte", aliases: ["NUMERO DE CORTE", "NÚMERO DE CORTE", "WO#", "WORK ORDER"], fallbackIndex: 0, required: true },
      { key: "deliveredQuantity", label: "Cantidad entregada", aliases: ["CANTIDAD ENTREGADA", "PIEZAS", "PCS"], fallbackIndex: 1 },
      { key: "deliveredDate", label: "Fecha", aliases: ["FECHA", "FECHA MANDADO COSTURA", "FECHA MANDADO A COSTURA"], fallbackIndex: 2 },
      { key: "deliveredTime", label: "Hora", aliases: ["HORA"], fallbackIndex: 3 },
      { key: "observations", label: "Observaciones", aliases: ["OBSERVACIONES", "NOTAS"], fallbackIndex: 4 }
    ]
  }
};

function cleanText(value) {
  return String(value || "").trim();
}

function parsePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function getDefaultSourceConfig(sourceType) {
  const config = SOURCE_FIELD_CONFIGS[sourceType] || SOURCE_FIELD_CONFIGS.print_sublimation_excel;

  return {
    headerRowNumber: config.headerRowNumber,
    dataStartRowNumber: config.dataStartRowNumber,
    readRange: config.readRange,
    fields: config.fields.map((field) => ({
      ...field,
      aliases: [...field.aliases]
    }))
  };
}

function parseFieldMapJson(value) {
  if (!value) {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
}

function normalizeAliases(value) {
  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean);
  }

  return cleanText(value)
    .split(",")
    .map(cleanText)
    .filter(Boolean);
}

function getEffectiveSourceConfig(source) {
  const defaults = getDefaultSourceConfig(source.source_type);
  const map = parseFieldMapJson(source.field_map_json);

  const fields = defaults.fields.map((field) => {
    const override = map[field.key];
    const aliases = normalizeAliases(override);

    return {
      ...field,
      aliases: aliases.length ? aliases : field.aliases
    };
  });

  return {
    headerRowNumber: parsePositiveInteger(source.header_row_number, defaults.headerRowNumber),
    dataStartRowNumber: parsePositiveInteger(source.data_start_row_number, defaults.dataStartRowNumber),
    readRange: cleanText(source.read_range) || defaults.readRange,
    fields
  };
}

function normalizeSourceConfigPayload(sourceType, payload = {}) {
  const defaults = getDefaultSourceConfig(sourceType);
  const fieldMap = {};
  const incomingMap = payload.field_map && typeof payload.field_map === "object"
    ? payload.field_map
    : parseFieldMapJson(payload.field_map_json);

  defaults.fields.forEach((field) => {
    const aliases = normalizeAliases(incomingMap[field.key]);
    if (aliases.length) {
      fieldMap[field.key] = aliases;
    }
  });

  return {
    headerRowNumber: parsePositiveInteger(payload.header_row_number, defaults.headerRowNumber),
    dataStartRowNumber: parsePositiveInteger(payload.data_start_row_number, defaults.dataStartRowNumber),
    readRange: cleanText(payload.read_range) || defaults.readRange,
    fieldMapJson: Object.keys(fieldMap).length ? JSON.stringify(fieldMap) : null
  };
}

function getSourceConfigForClient(source) {
  const defaults = getDefaultSourceConfig(source.source_type);
  const effective = getEffectiveSourceConfig(source);

  return {
    header_row_number: effective.headerRowNumber,
    data_start_row_number: effective.dataStartRowNumber,
    read_range: effective.readRange,
    fields: effective.fields.map((field) => {
      const defaultField = defaults.fields.find((item) => item.key === field.key) || field;

      return {
        key: field.key,
        label: field.label,
        aliases: field.aliases,
        default_aliases: defaultField.aliases,
        required: Boolean(field.required)
      };
    })
  };
}

module.exports = {
  getDefaultSourceConfig,
  getEffectiveSourceConfig,
  getSourceConfigForClient,
  normalizeSourceConfigPayload,
  parseFieldMapJson,
  SOURCE_FIELD_CONFIGS
};
