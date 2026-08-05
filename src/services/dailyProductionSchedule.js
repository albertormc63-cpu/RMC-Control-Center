const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const DEFAULT_SCHEDULE_PATH = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS NIKE/COMPOSER/529945 Production Schedule Book [RML].xlsm";
const DEFAULT_SCHEDULE_SHEET = "ProdSched";
const UPLOAD_DIR = process.env.RMC_DAILY_PRODUCTION_UPLOAD_DIR ||
  path.join(process.cwd(), "data", "daily-production");
const ACTIVE_SCHEDULE_PATH = path.join(UPLOAD_DIR, "current-schedule.xlsm");
const ACTIVE_SCHEDULE_META_PATH = path.join(UPLOAD_DIR, "current-schedule.json");

const LINE_GROUPS = [
  {
    key: "27sports",
    label: "27 Sports",
    units: ["27SPTS"],
    defaultSelected: true
  },
  {
    key: "rapid",
    label: "Rapid",
    units: ["RAPIDA", "RAPIDT"],
    defaultSelected: true
  },
  {
    key: "lat",
    label: "LAT",
    units: ["LAT"],
    defaultSelected: false
  },
  {
    key: "nike",
    label: "Nike",
    units: ["PLL", "WLL"],
    defaultSelected: false
  }
];

const COLUMN_INDEX = {
  sewUnit: 3,
  workOrder: 7,
  woEaches: 13,
  sewFin: 24,
  toDc: 26,
  ioStart: 34,
  ioCompl: 35
};

function cleanText(value) {
  return String(value ?? "").trim();
}

function normalizeKey(value) {
  return cleanText(value).toUpperCase().replace(/\s+/g, " ");
}

function toNumber(value) {
  const number = Number(cleanText(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function getDefaultLineGroupKeys() {
  return LINE_GROUPS
    .filter(group => group.defaultSelected)
    .map(group => group.key);
}

function normalizeLineGroupKeys(value) {
  const rawValues = Array.isArray(value)
    ? value
    : cleanText(value).split(",");
  const validKeys = new Set(LINE_GROUPS.map(group => group.key));
  const selected = rawValues
    .map(item => normalizeKey(item).toLowerCase())
    .filter(key => validKeys.has(key));

  return selected.length ? Array.from(new Set(selected)) : getDefaultLineGroupKeys();
}

function getLineGroupByUnit(unit) {
  const normalizedUnit = normalizeKey(unit);
  return LINE_GROUPS.find(group => group.units.includes(normalizedUnit)) || null;
}

function getSchedulePath() {
  if (fs.existsSync(ACTIVE_SCHEDULE_PATH)) {
    return ACTIVE_SCHEDULE_PATH;
  }

  return cleanText(process.env.RMC_DAILY_PRODUCTION_SCHEDULE_PATH) || DEFAULT_SCHEDULE_PATH;
}

function getScheduleSheetName() {
  return cleanText(process.env.RMC_DAILY_PRODUCTION_SCHEDULE_SHEET) || DEFAULT_SCHEDULE_SHEET;
}

function getFileStatus(filePath) {
  try {
    const stat = fs.statSync(filePath);

    return {
      file_exists: true,
      file_size_bytes: stat.size,
      file_mtime_ms: Math.round(stat.mtimeMs)
    };
  } catch (error) {
    return {
      file_exists: false,
      file_size_bytes: null,
      file_mtime_ms: null
    };
  }
}

function getActiveScheduleMeta() {
  try {
    return JSON.parse(fs.readFileSync(ACTIVE_SCHEDULE_META_PATH, "utf8"));
  } catch (error) {
    return null;
  }
}

function getScheduleFileMeta(filePath) {
  const activeMeta = getActiveScheduleMeta();

  if (filePath === ACTIVE_SCHEDULE_PATH && activeMeta) {
    return activeMeta;
  }

  return {
    original_name: path.basename(filePath),
    uploaded_at: null
  };
}

function sanitizeFilename(value) {
  return cleanText(value)
    .replace(/[\\/]/g, "")
    .replace(/[^\w .()[\]-]/g, "")
    .slice(0, 180) || "Production Schedule Book.xlsm";
}

function assertWorkbookExtension(filename) {
  const ext = path.extname(filename).toLowerCase();

  if (![".xlsm", ".xlsx", ".xlsb"].includes(ext)) {
    const error = new Error("Archivo invalido. Carga un Excel .xlsm, .xlsx o .xlsb.");
    error.status = 400;
    throw error;
  }
}

function getCellValue(row, columnName) {
  return row?.[COLUMN_INDEX[columnName]];
}

function readDailyProductionSchedule(options = {}) {
  const filePath = cleanText(options.filePath) || getSchedulePath();
  const sheetName = cleanText(options.sheetName) || getScheduleSheetName();
  const selectedLineGroupKeys = normalizeLineGroupKeys(options.lineGroups);
  const selectedLineGroups = LINE_GROUPS.filter(group => selectedLineGroupKeys.includes(group.key));
  const selectedUnits = new Set(selectedLineGroups.flatMap(group => group.units));
  const fileStatus = getFileStatus(filePath);

  if (!fileStatus.file_exists) {
    return {
      available: false,
      path: filePath,
      sheet_name: sheetName,
      ...fileStatus,
      line_groups: LINE_GROUPS,
      selected_line_groups: selectedLineGroupKeys,
      rows: [],
      total_rows: 0,
      total_pieces: 0,
      by_line_group: {}
    };
  }

  const workbook = XLSX.readFile(filePath, {
    cellDates: false
  });

  const worksheet = workbook.Sheets[sheetName] || workbook.Sheets[workbook.SheetNames[0]];

  if (!worksheet) {
    const error = new Error(`No se encontro hoja para lista diaria: ${sheetName}`);
    error.status = 500;
    throw error;
  }

  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false
  });

  const rows = [];
  const byLineGroup = {};

  for (let index = 2; index < matrix.length; index++) {
    const sourceRow = index + 1;
    const row = matrix[index] || [];
    const sewUnit = normalizeKey(getCellValue(row, "sewUnit"));
    const lineGroup = getLineGroupByUnit(sewUnit);
    const toDc = cleanText(getCellValue(row, "toDc"));
    const pieces = toNumber(getCellValue(row, "woEaches"));
    const workOrder = cleanText(getCellValue(row, "workOrder"));

    if (!lineGroup || !selectedUnits.has(sewUnit) || toDc || !workOrder || pieces <= 0) {
      continue;
    }

    const item = {
      source_row: sourceRow,
      line_group: lineGroup.key,
      line_label: lineGroup.label,
      sew_unit: sewUnit,
      work_order: workOrder,
      work_order_key: normalizeKey(workOrder),
      pieces,
      io_start: cleanText(getCellValue(row, "ioStart")),
      io_compl: cleanText(getCellValue(row, "ioCompl")),
      sew_fin: cleanText(getCellValue(row, "sewFin"))
    };

    rows.push(item);

    if (!byLineGroup[item.line_group]) {
      byLineGroup[item.line_group] = {
        key: item.line_group,
        label: item.line_label,
        rows: 0,
        pieces: 0,
        io_start_pieces: 0,
        io_compl_pieces: 0,
        sew_fin_pieces: 0
      };
    }

    byLineGroup[item.line_group].rows += 1;
    byLineGroup[item.line_group].pieces += pieces;

    if (item.io_start) {
      byLineGroup[item.line_group].io_start_pieces += pieces;
    }

    if (item.io_compl) {
      byLineGroup[item.line_group].io_compl_pieces += pieces;
    }

    if (item.sew_fin) {
      byLineGroup[item.line_group].sew_fin_pieces += pieces;
    }
  }

  return {
    available: true,
    path: filePath,
    sheet_name: worksheet === workbook.Sheets[sheetName] ? sheetName : workbook.SheetNames[0],
    file: getScheduleFileMeta(filePath),
    ...fileStatus,
    line_groups: LINE_GROUPS,
    selected_line_groups: selectedLineGroupKeys,
    rows,
    total_rows: rows.length,
    total_pieces: rows.reduce((total, row) => total + row.pieces, 0),
    by_line_group: byLineGroup
  };
}

function saveUploadedDailyProductionSchedule(buffer, originalName) {
  const safeName = sanitizeFilename(originalName);

  assertWorkbookExtension(safeName);

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const error = new Error("El archivo esta vacio o no se recibio correctamente.");
    error.status = 400;
    throw error;
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const tempPath = path.join(UPLOAD_DIR, `upload-${Date.now()}-${safeName}`);
  fs.writeFileSync(tempPath, buffer);

  try {
    readDailyProductionSchedule({
      filePath: tempPath,
      sheetName: getScheduleSheetName()
    });

    fs.renameSync(tempPath, ACTIVE_SCHEDULE_PATH);
    const meta = {
      original_name: safeName,
      uploaded_at: new Date().toISOString()
    };

    fs.writeFileSync(ACTIVE_SCHEDULE_META_PATH, JSON.stringify(meta, null, 2));

    return {
      path: ACTIVE_SCHEDULE_PATH,
      ...meta
    };
  } catch (error) {
    try {
      fs.unlinkSync(tempPath);
    } catch (unlinkError) {
      // Ignore cleanup errors; the original parse error is more useful.
    }

    throw error;
  }
}

module.exports = {
  LINE_GROUPS,
  normalizeLineGroupKeys,
  normalizeKey,
  readDailyProductionSchedule,
  saveUploadedDailyProductionSchedule
};
