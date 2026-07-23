// Formateador compartido para cantidades en todo el frontend.
const numberFormatter = new Intl.NumberFormat("es-MX");

const themeStorageKey = "rmc-control-center-theme";
const opNikePinStorageKey = "rmc-opnike-admin-pin";
const defaultTheme = "dark";

// Tablas que tienen filtros de texto/columna en pantalla.
const filterTargets = [
  "runsTable",
  "itemsTable",
  "mockupTable",
  "mockupItemsTable",
  "rapid27Table",
  "rapid27OrdersTable",
  "gitCommitsTable",
  "opNikeVariantsTable"
];

const excelFilterTargets = [
  "itemsTable",
  "mockupItemsTable"
];

// Tablas que deben permitir ordenar al dar click en sus encabezados.
const sortableTargets = [
  "runsTable",
  "itemsTable",
  "mockupTable",
  "mockupItemsTable",
  "rapid27Table",
  "rapid27OrdersTable",
  "registryTable",
  "tablesTable",
  "gitCommitsTable",
  "opNikeVariantsTable",
  "opNikeFamiliesTable"
];

// Estado de ordenamiento por tabla. Permite alternar ascendente/descendente.
const sortState = {};

// Estado de filtros por valores de columna en tablas de detalle.
const excelFilterState = {};

// Conserva la ultima respuesta del dashboard para filtrar meses sin pedirla otra vez.
let dashboardData = null;

// Cache de embarques agrupados para abrir detalle desde graficas sin nuevas rutas backend.
let nikeRunsCache = [];
let mockupRunsCache = [];
let rapid27ShipmentsCache = [];
let rapid27ActiveShipmentKey = "";
let nikeDetailRequestId = 0;
let mockupDetailRequestId = 0;
let rapid27DetailRequestId = 0;

// Cargas diferidas por vista para que el arranque pinte primero lo operativo.
const lazyViewLoads = {
  registry: false,
  gitHistory: false,
  opNikeCatalog: false,
  rapid27: false
};

let opNikeCatalogData = {
  templateRoot: "",
  families: [],
  variants: []
};
let opNikeSelectedVariantId = null;
let opNikeSelectedFamilyKey = "";
let opNikeLastValidation = null;

const opNikeVariantPresets = {
  official_home: {
    label: "Equipo oficial HOME",
    values: {
      variant_code: "H",
      variant_name: "Home",
      aliases: "Home; HOME",
      opnike_enabled: 1,
      opnike_rule_status: "draft",
      is_official_team: 1,
      requires_design_code: 0,
      opnike_variant_root_folder: "STANDARD",
      opnike_group_folder_pattern: "NIKE Mens and Youth",
      opnike_product_folder_pattern: "{style.product_folder}",
      opnike_version_folder_pattern: "HOME",
      opnike_team_folder_pattern: "",
      opnike_design_folder: "",
      opnike_style_subfolder_rule: "",
      opnike_template_name_pattern: "{liga} {file_team_name} {style} {size}.pdf",
      opnike_output_name_pattern: "{orderId} {liga}-{team_market}{nickname} {style} {size} {identifier}.pdf",
      opnike_fallback_search_mode: "style_and_size",
      opnike_resolution_strategy: "standard_team_version_folder",
      opnike_requires_version_folder: 1,
      opnike_requires_team_folder: 0,
      opnike_requires_design_folder: 0,
      opnike_requires_style_subfolder: 0
    }
  },
  official_away: {
    label: "Equipo oficial AWAY",
    values: {
      variant_code: "A",
      variant_name: "Away",
      aliases: "Away; AWAY",
      opnike_enabled: 1,
      opnike_rule_status: "draft",
      is_official_team: 1,
      requires_design_code: 0,
      opnike_variant_root_folder: "STANDARD",
      opnike_group_folder_pattern: "NIKE Mens and Youth",
      opnike_product_folder_pattern: "{style.product_folder}",
      opnike_version_folder_pattern: "AWAY",
      opnike_team_folder_pattern: "",
      opnike_design_folder: "",
      opnike_style_subfolder_rule: "",
      opnike_template_name_pattern: "{liga} {file_team_name} {style} {size}.pdf",
      opnike_output_name_pattern: "{orderId} {liga}-{team_market}{nickname} {style} {size} {identifier}.pdf",
      opnike_fallback_search_mode: "style_and_size",
      opnike_resolution_strategy: "standard_team_version_folder",
      opnike_requires_version_folder: 1,
      opnike_requires_team_folder: 0,
      opnike_requires_design_folder: 0,
      opnike_requires_style_subfolder: 0
    }
  },
  special_team: {
    label: "Especial por carpeta de equipo",
    values: {
      opnike_enabled: 1,
      opnike_rule_status: "draft",
      is_official_team: 1,
      requires_design_code: 0,
      opnike_variant_root_folder: "SPECIAL",
      opnike_group_folder_pattern: "NIKE Mens and Youth",
      opnike_product_folder_pattern: "{style.product_folder}",
      opnike_version_folder_pattern: "{variant_name}",
      opnike_team_folder_pattern: "{file_team_name}",
      opnike_design_folder: "",
      opnike_style_subfolder_rule: "",
      opnike_template_name_pattern: "{liga} {file_team_name} {style} {size}.pdf",
      opnike_output_name_pattern: "{orderId} {liga}-{team_market}{nickname} {style} {size} {identifier}.pdf",
      opnike_fallback_search_mode: "style_and_size",
      opnike_resolution_strategy: "special_team_folder_with_legacy_version_fallback",
      opnike_requires_version_folder: 1,
      opnike_requires_team_folder: 1,
      opnike_requires_design_folder: 0,
      opnike_requires_style_subfolder: 0
    }
  },
  jr_1500: {
    label: "JR 1500 con subcarpeta A/Y",
    values: {
      opnike_enabled: 1,
      opnike_rule_status: "draft",
      is_official_team: 1,
      requires_design_code: 0,
      opnike_style_scope: "A1500,Y1500",
      opnike_variant_root_folder: "JR",
      opnike_group_folder_pattern: "NIKE Mens and Youth",
      opnike_product_folder_pattern: "{style.product_folder}",
      opnike_version_folder_pattern: "{variant_name}",
      opnike_team_folder_pattern: "{file_team_name}",
      opnike_design_folder: "",
      opnike_style_subfolder_rule: "{style_family}",
      opnike_template_name_pattern: "{liga} {file_team_name} {style} {size}.pdf",
      opnike_output_name_pattern: "{orderId} {liga}-{team_market}{nickname} {style} {size} {identifier}.pdf",
      opnike_fallback_search_mode: "style_and_size",
      opnike_resolution_strategy: "jr_team_folder_with_optional_style_subfolder",
      opnike_requires_version_folder: 1,
      opnike_requires_team_folder: 1,
      opnike_requires_design_folder: 0,
      opnike_requires_style_subfolder: 1
    }
  },
  design_folder: {
    label: "Diseño/causa especial",
    values: {
      opnike_enabled: 1,
      opnike_rule_status: "draft",
      is_official_team: 0,
      requires_design_code: 1,
      opnike_variant_root_folder: "SPECIAL",
      opnike_group_folder_pattern: "NIKE Mens and Youth",
      opnike_product_folder_pattern: "{style.product_folder}",
      opnike_version_folder_pattern: "",
      opnike_team_folder_pattern: "",
      opnike_design_folder: "{design_name}",
      opnike_style_subfolder_rule: "",
      opnike_template_name_pattern: "{liga} {design_name} {style} {size}.pdf",
      opnike_output_name_pattern: "{orderId} {liga}-{design_name} {style} {size} {identifier}.pdf",
      opnike_fallback_search_mode: "style_and_size",
      opnike_resolution_strategy: "design_folder",
      opnike_requires_version_folder: 0,
      opnike_requires_team_folder: 0,
      opnike_requires_design_folder: 1,
      opnike_requires_style_subfolder: 0
    }
  },
  design_version: {
    label: "Diseño con version Home/Away",
    values: {
      opnike_enabled: 1,
      opnike_rule_status: "draft",
      is_official_team: 0,
      requires_design_code: 1,
      opnike_variant_root_folder: "SPECIAL",
      opnike_group_folder_pattern: "NIKE Mens and Youth",
      opnike_product_folder_pattern: "{style.product_folder}",
      opnike_version_folder_pattern: "{variant_name}",
      opnike_team_folder_pattern: "",
      opnike_design_folder: "{design_name}",
      opnike_style_subfolder_rule: "",
      opnike_template_name_pattern: "{liga} {design_name} {variant_name} {style} {size}.pdf",
      opnike_output_name_pattern: "{orderId} {liga}-{design_name} {variant_name} {style} {size} {identifier}.pdf",
      opnike_fallback_search_mode: "style_and_size",
      opnike_resolution_strategy: "design_version_folder",
      opnike_requires_version_folder: 1,
      opnike_requires_team_folder: 0,
      opnike_requires_design_folder: 1,
      opnike_requires_style_subfolder: 0
    }
  }
};

const opNikeDuplicateClearFields = [
  "id",
  "variant_code",
  "variant_name",
  "team_code",
  "team_name",
  "team_market",
  "team_mascot",
  "file_team_name",
  "design_code",
  "design_name",
  "template_name_placeholder",
  "template_number_placeholder",
  "aliases",
  "notes"
];

const rapid27StatusLabels = {
  SIN_OUTPUTS: "Sin outputs",
  EN_ALMACEN: "En almacén",
  PARCIAL_EN_ALMACEN: "Parcial en almacén",
  BAJADO_A_SUBLIMADO: "Bajado a Sublimado",
  PARCIAL_EN_SUBLIMADO: "Parcial en Sublimado",
  EN_PROCESO_DE_IMPRESION: "En proceso de impresión"
};

// Acceso corto a elementos por id para evitar repetir document.getElementById.
function getElement(id) {
  return document.getElementById(id);
}

// Escribe texto en un elemento si existe. Ayuda a que la UI no truene si cambia el HTML.
function setText(id, value) {
  const element = getElement(id);

  if (element) {
    element.textContent = value ?? "";
  }
}

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return stored === "light" || stored === "dark" ? stored : defaultTheme;
  } catch (error) {
    return defaultTheme;
  }
}

function persistTheme(theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch (error) {
    appendLog("No se pudo guardar el tema localmente", "warning");
  }
}

function updateThemeControls(theme) {
  const toggle = getElement("themeToggle");
  const darkLabel = getElement("themeDarkLabel");
  const lightLabel = getElement("themeLightLabel");
  const logo = getElement("rmcSidebarLogo");
  const isLight = theme === "light";

  if (toggle) {
    toggle.checked = isLight;
    toggle.setAttribute("aria-label", isLight ? "Tema Light activo" : "Tema Dark activo");
  }

  if (logo) {
    logo.src = isLight
      ? logo.dataset.lightLogo || logo.src
      : logo.dataset.darkLogo || logo.src;
  }

  darkLabel?.classList.toggle("theme-label-active", !isLight);
  lightLabel?.classList.toggle("theme-label-active", isLight);
}

function applyTheme(theme, options = {}) {
  const nextTheme = theme === "light" ? "light" : "dark";

  document.documentElement.dataset.theme = nextTheme;
  updateThemeControls(nextTheme);

  if (options.persist) {
    persistTheme(nextTheme);
  }

  if (options.log) {
    appendLog(`Tema ${nextTheme === "light" ? "Light" : "Dark"} aplicado`, "success");
  }
}

// Normaliza numeros para mostrarlos con separadores locales.
function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatDDMM(value) {
  if (!value) {
    return "";
  }

  const parts = String(value).trim().split("/");

  if (parts.length === 3) {
    return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
  }

  if (parts.length === 2) {
    return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}`;
  }

  const isoMatch = String(value).match(/^(\d{4})(\d{2})(\d{2})/);

  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}`;
  }

  const dt = new Date(value);

  if (!Number.isNaN(dt.getTime())) {
    return dt.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }

  return value;
}

function getShipmentYearFromKey(key) {
  const match = String(key || "").match(/^(\d{4})-/);
  return match?.[1] || "";
}

function getRunShipmentDate(run) {
  return formatDDMM(run.fecha_embarque || run.created_at || run.fecha);
}

function getRunActionId(run) {
  return run?.sample_run_id || run?.id || "";
}

function getRunMonthKey(run) {
  const year = String(run?.run_year || getShipmentYearFromKey(getRunActionId(run)) || "").trim();
  const rawDate = String(run?.fecha_embarque || run?.created_at || run?.fecha || "").trim();
  const fullDateMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const shortDateMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})$/);
  const isoMatch = rawDate.match(/^(\d{4})-(\d{2})-\d{2}/);
  const idMatch = String(getRunActionId(run) || "").match(/^(\d{4})(\d{2})\d{2}/);

  if (fullDateMatch) {
    return `${fullDateMatch[3]}-${fullDateMatch[2].padStart(2, "0")}`;
  }

  if (shortDateMatch && year) {
    return `${year}-${shortDateMatch[2].padStart(2, "0")}`;
  }

  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}`;
  }

  if (idMatch) {
    return `${idMatch[1]}-${idMatch[2]}`;
  }

  return "";
}

function filterRunsByMonth(runs, monthKey) {
  if (!monthKey) {
    return runs;
  }

  return runs.filter(run => getRunMonthKey(run) === monthKey);
}

function getToolMonthInput(tool, scope = "dashboard") {
  if (tool === "rapid27") {
    return scope === "runs"
      ? getElement("rapid27MonthFilter")
      : getElement("rapid27DashboardMonthFilter");
  }

  if (scope === "runs") {
    return getElement(tool === "nike" ? "nikeRunsMonthFilter" : "mockupRunsMonthFilter");
  }

  return getElement(`${tool}MonthFilter`);
}

function syncToolMonthInputs(tool, monthKey) {
  [getToolMonthInput(tool, "dashboard"), getToolMonthInput(tool, "runs")].forEach(input => {
    if (input) {
      input.value = monthKey;
    }
  });
}

function getSelectedToolMonth(tool) {
  return getToolMonthInput(tool, "dashboard")?.value || getToolMonthInput(tool, "runs")?.value || "";
}

function extractNikeType(tool) {
  if (!tool) {
    return "";
  }

  const normalized = String(tool).trim().toLowerCase();

  if (normalized.includes("personalizadas")) {
    return "Personalizadas";
  }

  if (normalized.includes("genericas") || normalized.includes("genéricas")) {
    return "Genericas";
  }

  if (normalized.includes("manual")) {
    return "Manual";
  }

  return String(tool).replace(/^RMCOp-Nike\s*/i, "").trim() || "Nike";
}

function normalizeDepartmentText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getDepartmentKey(value) {
  const normalized = normalizeDepartmentText(value);

  if (normalized.includes("calidad") || normalized.includes("caidad")) {
    return "calidad";
  }

  if (
    normalized.includes("diseno") ||
    normalized.includes("dise;o") ||
    normalized.includes("disenador") ||
    normalized.includes("impresion") ||
    normalized.includes("impresor")
  ) {
    return "diseno";
  }

  if (normalized.includes("sublimado")) {
    return "sublimado";
  }

  if (normalized.includes("almacen")) {
    return "almacen";
  }

  if (normalized.includes("costura")) {
    return "costura";
  }

  if (normalized.includes("embarque") || normalized.includes("emparque")) {
    return "embarque";
  }

  return "default";
}

function makeDepartmentBadge(value, context = "") {
  const badge = document.createElement("span");
  badge.className = "department-badge";
  badge.dataset.department = getDepartmentKey(`${value} ${context}`);
  badge.textContent = value || "Sin estado";
  return badge;
}

// Agrega una linea al log compacto. El log puede estar colapsado sin perder mensajes.
function appendLog(message, type = "info") {
  const terminal = getElement("terminal");

  if (!terminal) {
    return;
  }

  const line = document.createElement("div");
  line.className = `log-line log-${type}`;
  line.textContent = `[${new Date().toLocaleTimeString("es-MX")}] ${message}`;
  terminal.appendChild(line);
  terminal.scrollTop = terminal.scrollHeight;
}

function addEmptyTableRow(tbody, message, colSpan) {
  const row = document.createElement("tr");
  const cell = addCell(row, message);
  row.dataset.emptyRow = "true";
  cell.colSpan = colSpan;
  tbody.appendChild(row);
}

function addLoadingTableRow(tbody, message, colSpan) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  const loading = document.createElement("div");
  const spinner = document.createElement("span");
  const text = document.createElement("span");

  row.dataset.emptyRow = "true";
  row.dataset.loadingRow = "true";
  cell.colSpan = colSpan;
  loading.className = "detail-loading";
  loading.setAttribute("role", "status");
  loading.setAttribute("aria-live", "polite");
  spinner.className = "detail-loading-spinner";
  spinner.setAttribute("aria-hidden", "true");
  text.textContent = message;

  loading.append(spinner, text);
  cell.appendChild(loading);
  row.appendChild(cell);
  tbody.appendChild(row);
}

function setDetailToolsLoading(tableId, loading) {
  const tools = document.querySelector(`.table-tools[data-filter-target="${tableId}"]`);

  tools?.querySelectorAll("input, select, button").forEach(control => {
    control.disabled = loading;
  });
}

function showDetailLoading(sectionId, infoId, tableId, message, colSpan) {
  const detailSection = getElement(sectionId);
  const runInfo = getElement(infoId);
  const tbody = getElement(tableId);

  if (!detailSection || !runInfo || !tbody) {
    return;
  }

  closeExcelFilterMenu();
  detailSection.classList.remove("hidden");
  detailSection.setAttribute("aria-busy", "true");
  detailSection.querySelector(".compact-flow-panel")?.classList.add("hidden");
  runInfo.textContent = message;
  tbody.innerHTML = "";
  addLoadingTableRow(tbody, message, colSpan);
  setDetailToolsLoading(tableId, true);
  refreshTableFilter(tableId);
  updateSortIndicators(tableId);
  detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function finishDetailLoading(sectionId, tableId) {
  getElement(sectionId)?.removeAttribute("aria-busy");
  setDetailToolsLoading(tableId, false);
}

function getNikeOperationalState(item) {
  const state = item.print_sublimation?.state;

  if (state?.status) {
    return state;
  }

  return {
    status: "En proceso de impresion",
    detail: "Sin coincidencia en Sublimado",
    stage: "impresion",
    hasPrintSublimationLog: false
  };
}

function getTeamDisplay(item) {
  return item?.equipo_display || item?.equipo || "";
}

function getItemTypeDisplay(item) {
  const tool = String(item?.herramienta || "").toLowerCase();

  if (tool.includes("personaliz")) {
    return "Personalizada";
  }

  if (tool.includes("generic") || tool.includes("generica")) {
    return "Generica";
  }

  if (tool.includes("manual")) {
    return "Manual";
  }

  return "";
}

function getFileStatusText(file, type) {
  const status = file?.status || "missing";

  if (type === "pdf") {
    if (status === "found_original") return "PDF encontrado en ruta original";
    if (status === "found_moved_to_to_print") return "PDF encontrado en TO PRINT";
    if (status === "found_relocated_archive") return "PDF encontrado en carpeta archivada";
    if (status === "invalid_path") return "Ruta PDF fuera del volumen autorizado";
    if (status === "no_path") return "Sin ruta PDF vinculada";
    return "PDF no encontrado";
  }

  if (status === "found_original") return "Maqueta encontrada";
  if (status === "found_genericas") return "Maqueta encontrada en Genericas";
  if (status === "found_relocated_archive") return "Maqueta encontrada en carpeta archivada";
  if (status === "multiple_mockups") return "Multiples maquetas relacionadas";
  if (status === "no_mockup_record") return "Sin maqueta vinculada";
  if (status === "invalid_path") return "Ruta de maqueta fuera del volumen autorizado";
  if (status === "no_path") return "Sin ruta de maqueta vinculada";
  return "Path de maqueta no encontrado";
}

function formatFileStatusLine(file, type) {
  const statusText = getFileStatusText(file, type);
  const displayPath = file?.resolvedPath || file?.originalPath || "";

  return displayPath ? `${statusText} | ${displayPath}` : statusText;
}

function hasResolvedFile(file) {
  return Boolean(file?.exists && file?.resolvedPath);
}

function renderNikeMockupOptions(item) {
  const options = getElement("nikeItemMaquetaOptions");

  if (!options) {
    return;
  }

  options.textContent = "";
  const mockupFiles = Array.isArray(item.mockupFiles) ? item.mockupFiles : [];

  if (mockupFiles.length <= 1) {
    options.classList.add("hidden");
    return;
  }

  options.classList.remove("hidden");

  mockupFiles.forEach(file => {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const action = document.createElement("a");
    const parts = [
      file.talla,
      file.archivo,
      getFileStatusText(file, "mockup")
    ].filter(Boolean);

    row.className = "resource-option";
    label.textContent = parts.join(" | ") || `Maqueta ${file.mockupItemId || ""}`;
    action.className = "resource-state resource-download";
    const hasFile = hasResolvedFile(file);

    action.textContent = hasFile ? "Ver maqueta" : "No disponible";
    action.href = hasFile ? file.resolvedUrl : "#";
    action.target = hasFile ? "_blank" : "";
    action.setAttribute("aria-disabled", String(!hasFile));

    if (!hasFile) {
      action.addEventListener("click", event => {
        event.preventDefault();
        appendLog(getFileStatusText(file, "mockup"), "info");
      });
    }

    row.append(label, action);
    options.appendChild(row);
  });
}

function addOperationalStatusCell(row, item) {
  const state = getNikeOperationalState(item);
  const cell = document.createElement("td");
  const wrapper = document.createElement("div");
  const detail = document.createElement("span");
  const department = getDepartmentKey(`${state.stage || ""} ${state.status || ""} ${state.detail || ""}`);

  wrapper.className = "operational-status";
  wrapper.dataset.stage = state.stage || "impresion";
  wrapper.dataset.department = department;
  cell.dataset.filterValue = state.status || "Sin estado";
  detail.textContent = state.detail || "";
  wrapper.append(makeDepartmentBadge(state.status, `${state.stage || ""} ${state.detail || ""}`), detail);
  cell.appendChild(wrapper);
  row.appendChild(cell);
  return cell;
}

function renderNikeActiveFlowSummary(items) {
  const container = getElement("nikeActiveFlowSummary");

  if (!container) {
    return;
  }

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

  (items || []).forEach(item => {
    const state = getNikeOperationalState(item);
    const key = state.stage === "almacen"
      ? "almacen"
      : state.stage === "sublimado"
        ? "sublimado"
        : "diseno";

    stages[key].count += 1;
    stages[key].pieces += Number(item.piezas || 0);
  });

  const activeStages = Object.values(stages).filter(stage => stage.count > 0);
  container.textContent = "";
  container.classList.toggle("hidden", activeStages.length === 0);

  if (!activeStages.length) {
    return;
  }

  const label = document.createElement("span");
  label.className = "compact-flow-label";
  label.textContent = "Circulacion activa";
  container.appendChild(label);

  activeStages.forEach(stage => {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");

    item.className = "tracking-step compact-tracking-step";
    item.dataset.department = stage.department;
    item.dataset.active = "true";
    title.textContent = `${stage.label}: ${formatNumber(stage.count)}`;
    detail.textContent = `${formatNumber(stage.pieces)} piezas | ${stage.detail}`;
    item.append(title, detail);
    container.appendChild(item);
  });
}

function addDepartmentStatusCell(row, value, className = "") {
  const cell = document.createElement("td");

  if (className) {
    cell.className = className;
  }

  cell.dataset.filterValue = value || "Sin estado";
  cell.appendChild(makeDepartmentBadge(value));
  row.appendChild(cell);
  return cell;
}

// Wrapper para fetch JSON con mensajes de error legibles desde la API.
async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    let message = `Error consultando ${url}`;

    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch (error) {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json();
}

async function sendJSON(url, options = {}) {
  const method = options.method || "POST";
  const headers = {
    "Content-Type": "application/json"
  };

  if (url.startsWith("/api/nike/catalog") && method !== "GET") {
    const pin = getStoredOpNikePin();

    if (pin) {
      headers["X-RMC-OPNIKE-PIN"] = pin;
    }
  }

  const response = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(options.body || {})
  });

  if (!response.ok) {
    let message = `Error consultando ${url}`;
    let body = null;

    try {
      body = await response.json();
      message = body.message || body.error || message;
    } catch (error) {
      message = response.statusText || message;
    }

    const requestError = new Error(message);
    requestError.response = body;
    requestError.status = response.status;
    throw requestError;
  }

  return response.json();
}

function getStoredOpNikePin() {
  try {
    return sessionStorage.getItem(opNikePinStorageKey) || "";
  } catch (error) {
    return "";
  }
}

function setStoredOpNikePin(pin) {
  try {
    sessionStorage.setItem(opNikePinStorageKey, pin);
  } catch (error) {
    appendLog("No se pudo guardar el PIN temporal en esta sesion", "warning");
  }
}

function clearStoredOpNikePin() {
  try {
    sessionStorage.removeItem(opNikePinStorageKey);
  } catch (error) {
    appendLog("No se pudo limpiar el PIN temporal", "warning");
  }
}

function isOpNikeCatalogUnlocked() {
  return Boolean(getStoredOpNikePin());
}

// Crea una celda de tabla y la agrega a la fila recibida.
function addCell(row, value, className) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "";

  if (className) {
    cell.className = className;
  }

  row.appendChild(cell);
  return cell;
}

// Crea una celda con boton de accion, por ejemplo "Ver".
function addButtonCell(row, label, onClick) {
  const cell = document.createElement("td");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "table-button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  cell.appendChild(button);
  row.appendChild(cell);
}

// Crea una celda con link descargable, por ejemplo el Excel de Nike.
function addLinkCell(row, label, href) {
  const cell = document.createElement("td");
  const link = document.createElement("a");
  link.className = "btn table-button";
  link.href = href;
  link.textContent = label;
  cell.appendChild(link);
  row.appendChild(cell);
}

// Cierra el drawer lateral usado en pantallas pequenas.
function closeSidebar() {
  document.body.classList.remove("sidebar-open");
}

// Abre el drawer lateral usado en pantallas pequenas.
function openSidebar() {
  document.body.classList.add("sidebar-open");
}

// Cambia la vista activa y sincroniza el estado visual del menu lateral.
function switchView(viewId) {
  if (viewId === "opnike-catalog-view" && !isOpNikeCatalogUnlocked()) {
    showOpNikePinModal();
    closeSidebar();
    return;
  }

  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active-view", view.id === viewId);
  });

  document.querySelectorAll(".menu-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
  loadViewData(viewId);
}

function findRunByShipment(tool, fechaEmbarque, shipmentKey) {
  const targetDate = formatDDMM(fechaEmbarque);
  const targetYear = getShipmentYearFromKey(shipmentKey);
  const runs = tool === "nike" ? nikeRunsCache : mockupRunsCache;

  const exactYearMatch = runs.find(run => {
    return getRunShipmentDate(run) === targetDate
      && (!targetYear || String(run.run_year || "") === targetYear);
  });

  return exactYearMatch || runs.find(run => getRunShipmentDate(run) === targetDate) || null;
}

function showEmptyShipmentDetail(tool, fechaEmbarque, message) {
  const config = tool === "nike"
    ? {
        viewId: "nike-view",
        detailId: "detailSection",
        infoId: "runInfo",
        tableId: "itemsTable",
        colSpan: 11,
        label: "Nike"
      }
    : {
        viewId: "mockup-view",
        detailId: "mockupDetailSection",
        infoId: "mockupRunInfo",
        tableId: "mockupItemsTable",
        colSpan: 10,
        label: "MockupTool"
      };
  const detailSection = getElement(config.detailId);
  const runInfo = getElement(config.infoId);
  const tbody = getElement(config.tableId);

  switchView(config.viewId);

  if (!detailSection || !runInfo || !tbody) {
    return;
  }

  detailSection.classList.remove("hidden");
  runInfo.textContent = `Embarque ${formatDDMM(fechaEmbarque)} | Sin items disponibles`;
  tbody.innerHTML = "";
  addEmptyTableRow(tbody, message || `No hay items registrados para el embarque ${formatDDMM(fechaEmbarque)}.`, config.colSpan);
  refreshTableFilter(config.tableId);
  updateSortIndicators(config.tableId);
  detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
  appendLog(`${config.label}: sin items para embarque ${formatDDMM(fechaEmbarque)}`, "info");
}

async function navigateToShipmentDetail(tool, fechaEmbarque, shipmentKey) {
  const config = tool === "nike"
    ? {
        viewId: "nike-view",
        loadDetail: loadRunDetail,
        label: "Pedidos RMC Nike"
      }
    : {
        viewId: "mockup-view",
        loadDetail: loadMockupDetail,
        label: "Maquetas RMC Nike"
      };
  const run = findRunByShipment(tool, fechaEmbarque, shipmentKey);

  switchView(config.viewId);

  if (!run) {
    showEmptyShipmentDetail(
      tool,
      fechaEmbarque,
      `No se encontro un embarque ${config.label} para la fecha ${formatDDMM(fechaEmbarque)}.`
    );
    return;
  }

  try {
    await config.loadDetail(getRunActionId(run));
    appendLog(`${config.label}: detalle abierto desde dashboard para ${formatDDMM(fechaEmbarque)}`, "success");
  } catch (error) {
    console.error(error);
    showEmptyShipmentDetail(
      tool,
      fechaEmbarque,
      `No se pudo abrir el detalle del embarque ${formatDDMM(fechaEmbarque)}.`
    );
  }
}

// Obtiene los textos de encabezado de una tabla segun el id de su tbody.
function getTableHeaders(tableId) {
  const table = getElement(tableId)?.closest("table");

  if (!table) {
    return [];
  }

  return Array.from(table.querySelectorAll("thead th")).map(header => {
    return header.dataset.label || header.textContent.trim();
  });
}

// Rellena el selector de columnas de cada filtro con los encabezados reales.
function setupFilterOptions(tableId) {
  const tools = document.querySelector(`.table-tools[data-filter-target="${tableId}"]`);
  const select = tools?.querySelector(".table-column");

  if (!select) {
    return;
  }

  const currentValue = select.value || "all";
  select.innerHTML = '<option value="all">Todas las columnas</option>';

  getTableHeaders(tableId).forEach((header, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = header;
    select.appendChild(option);
  });

  select.value = Array.from(select.options).some(option => option.value === currentValue)
    ? currentValue
    : "all";
}

// Actualiza el contador visible de filas filtradas.
function updateTableCount(tableId, visibleRows, totalRows) {
  const tools = document.querySelector(`.table-tools[data-filter-target="${tableId}"]`);
  const count = tools?.querySelector(".table-count");

  if (count) {
    count.textContent = `${formatNumber(visibleRows)} de ${formatNumber(totalRows)} registros`;
  }
}

function getExcelFilterValue(row, columnIndex) {
  const cell = row.cells[columnIndex];
  const text = String(cell?.dataset.filterValue || cell?.textContent || "").trim();
  return text || "(Vacios)";
}

function getExcelColumnValues(tableId, columnIndex) {
  const rows = Array.from(getElement(tableId)?.querySelectorAll("tr") || []);
  return [...new Set(rows.map(row => getExcelFilterValue(row, columnIndex)))]
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
}

function getActiveExcelFilters(tableId) {
  return excelFilterState[tableId] || {};
}

function passesExcelFilters(tableId, row) {
  const filters = getActiveExcelFilters(tableId);

  return Object.entries(filters).every(([columnIndex, selectedValues]) => {
    if (!selectedValues) {
      return true;
    }

    return selectedValues.has(getExcelFilterValue(row, Number(columnIndex)));
  });
}

function updateExcelFilterButtons(tableId) {
  const table = getElement(tableId)?.closest("table");
  const filters = getActiveExcelFilters(tableId);

  if (!table) {
    return;
  }

  table.querySelectorAll(".excel-filter-button").forEach(button => {
    const columnIndex = button.dataset.columnIndex;
    const isActive = Boolean(filters[columnIndex]);
    button.classList.toggle("active", isActive);
    button.title = isActive ? "Filtro de columna activo" : "Filtrar columna";
  });
}

function closeExcelFilterMenu() {
  document.querySelector(".excel-filter-menu")?.remove();
}

function setExcelColumnFilter(tableId, columnIndex, selectedValues, totalValues) {
  excelFilterState[tableId] = excelFilterState[tableId] || {};

  if (selectedValues.size === totalValues) {
    delete excelFilterState[tableId][columnIndex];
  } else {
    excelFilterState[tableId][columnIndex] = selectedValues;
  }

  closeExcelFilterMenu();
  updateExcelFilterButtons(tableId);
  applyTableFilter(tableId);
}

function openExcelFilterMenu(tableId, columnIndex, anchor) {
  closeExcelFilterMenu();

  const values = getExcelColumnValues(tableId, columnIndex);
  const activeValues = getActiveExcelFilters(tableId)[columnIndex];
  const selectedValues = new Set(activeValues || values);
  const menu = document.createElement("div");
  const title = document.createElement("strong");
  const search = document.createElement("input");
  const actions = document.createElement("div");
  const selectAll = document.createElement("button");
  const clearAll = document.createElement("button");
  const list = document.createElement("div");
  const footer = document.createElement("div");
  const apply = document.createElement("button");
  const clear = document.createElement("button");
  const header = anchor.closest("th");

  menu.className = "excel-filter-menu";
  menu.dataset.tableId = tableId;
  menu.dataset.columnIndex = String(columnIndex);
  title.textContent = header?.dataset.label || "Columna";
  search.type = "search";
  search.placeholder = "Buscar valores";
  search.className = "excel-filter-search";
  actions.className = "excel-filter-actions";
  selectAll.type = "button";
  selectAll.className = "secondary-button";
  selectAll.textContent = "Todos";
  clearAll.type = "button";
  clearAll.className = "secondary-button";
  clearAll.textContent = "Ninguno";
  list.className = "excel-filter-list";
  footer.className = "excel-filter-footer";
  apply.type = "button";
  apply.textContent = "Aplicar";
  clear.type = "button";
  clear.className = "secondary-button";
  clear.textContent = "Limpiar";

  values.forEach(value => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    const text = document.createElement("span");

    checkbox.type = "checkbox";
    checkbox.value = value;
    checkbox.checked = selectedValues.has(value);
    text.textContent = value;
    label.append(checkbox, text);
    list.appendChild(label);
  });

  search.addEventListener("input", () => {
    const needle = search.value.trim().toLowerCase();

    list.querySelectorAll("label").forEach(label => {
      label.hidden = needle && !label.textContent.toLowerCase().includes(needle);
    });
  });

  selectAll.addEventListener("click", () => {
    list.querySelectorAll("input[type='checkbox']").forEach(checkbox => {
      checkbox.checked = true;
    });
  });

  clearAll.addEventListener("click", () => {
    list.querySelectorAll("input[type='checkbox']").forEach(checkbox => {
      checkbox.checked = false;
    });
  });

  apply.addEventListener("click", () => {
    const selected = new Set(Array.from(list.querySelectorAll("input[type='checkbox']:checked"))
      .map(checkbox => checkbox.value));
    setExcelColumnFilter(tableId, columnIndex, selected, values.length);
  });

  clear.addEventListener("click", () => {
    setExcelColumnFilter(tableId, columnIndex, new Set(values), values.length);
  });

  menu.addEventListener("click", event => {
    event.stopPropagation();
  });

  actions.append(selectAll, clearAll);
  footer.append(clear, apply);
  menu.append(title, search, actions, list, footer);
  document.body.appendChild(menu);

  const rect = anchor.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${Math.min(rect.left, window.innerWidth - menu.offsetWidth - 12)}px`;
  search.focus();
}

function setupExcelColumnFilters(tableId) {
  if (!excelFilterTargets.includes(tableId)) {
    return;
  }

  const table = getElement(tableId)?.closest("table");

  if (!table || table.dataset.excelFiltersReady === "true") {
    return;
  }

  table.querySelectorAll("thead th").forEach((header, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "excel-filter-button";
    button.dataset.columnIndex = String(index);
    button.textContent = "v";
    button.title = "Filtrar columna";
    button.setAttribute("aria-label", `Filtrar ${header.dataset.label || header.textContent.trim()}`);
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      openExcelFilterMenu(tableId, index, button);
    });

    header.classList.add("excel-filter-header");
    header.appendChild(button);
  });

  table.dataset.excelFiltersReady = "true";
  updateExcelFilterButtons(tableId);
}

function clearExcelColumnFilters(tableId) {
  delete excelFilterState[tableId];
  closeExcelFilterMenu();
  updateExcelFilterButtons(tableId);
}

// Filtra filas por texto. Puede buscar en todas las columnas o en una sola.
function applyTableFilter(tableId) {
  const tools = document.querySelector(`.table-tools[data-filter-target="${tableId}"]`);
  const tbody = getElement(tableId);

  if (!tools || !tbody) {
    return;
  }

  const search = tools.querySelector(".table-search")?.value.trim().toLowerCase() || "";
  const column = tools.querySelector(".table-column")?.value || "all";
  const rows = Array.from(tbody.querySelectorAll("tr"));
  const dataRows = rows.filter(row => row.dataset.emptyRow !== "true");
  let visibleRows = 0;

  rows.forEach(row => {
    if (row.dataset.emptyRow === "true") {
      row.classList.remove("filtered-out");
      return;
    }

    const cells = Array.from(row.cells);
    const haystack = column === "all"
      ? cells.map(cell => cell.textContent).join(" ")
      : cells[Number(column)]?.textContent || "";
    const matchesText = !search || haystack.toLowerCase().includes(search);
    const isVisible = matchesText && passesExcelFilters(tableId, row);

    row.classList.toggle("filtered-out", !isVisible);

    if (isVisible) {
      visibleRows += 1;
    }
  });

  updateTableCount(tableId, visibleRows, dataRows.length);
}

// Recalcula opciones de filtro y contador despues de repintar una tabla.
function refreshTableFilter(tableId) {
  setupFilterOptions(tableId);
  setupExcelColumnFilters(tableId);
  updateExcelFilterButtons(tableId);
  applyTableFilter(tableId);
}

// Convierte textos de tabla a valores comparables para sort numerico, fecha o texto.
function normalizeSortValue(value) {
  const text = String(value || "").trim();
  const cleanNumber = text.replace(/,/g, "");
  const numeric = Number(cleanNumber);
  const dateMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const durationMatch = text.match(/^(\d{2}):(\d{2}):(\d{2})$/);

  if (dateMatch) {
    return Number(`${dateMatch[3]}${dateMatch[2]}${dateMatch[1]}`);
  }

  if (durationMatch) {
    return (Number(durationMatch[1]) * 3600) + (Number(durationMatch[2]) * 60) + Number(durationMatch[3]);
  }

  if (!Number.isNaN(numeric) && cleanNumber !== "") {
    return numeric;
  }

  return text.toLowerCase();
}

// Ordena una tabla por indice de columna y alterna direccion en clicks consecutivos.
function sortTable(tableId, columnIndex) {
  const tbody = getElement(tableId);

  if (!tbody) {
    return;
  }

  const current = sortState[tableId] || {};
  const direction = current.columnIndex === columnIndex && current.direction === "asc"
    ? "desc"
    : "asc";
  const rows = Array.from(tbody.querySelectorAll("tr"));

  rows.sort((a, b) => {
    const aValue = normalizeSortValue(a.cells[columnIndex]?.textContent);
    const bValue = normalizeSortValue(b.cells[columnIndex]?.textContent);

    if (aValue < bValue) {
      return direction === "asc" ? -1 : 1;
    }

    if (aValue > bValue) {
      return direction === "asc" ? 1 : -1;
    }

    return 0;
  });

  rows.forEach(row => tbody.appendChild(row));
  sortState[tableId] = { columnIndex, direction };
  updateSortIndicators(tableId);
  applyTableFilter(tableId);
}

// Actualiza flechas visuales de sort en los encabezados.
function updateSortIndicators(tableId) {
  const table = getElement(tableId)?.closest("table");

  if (!table) {
    return;
  }

  const current = sortState[tableId];

  table.querySelectorAll("thead th").forEach((header, index) => {
    const indicator = header.querySelector(".sort-indicator");

    if (!indicator) {
      return;
    }

    indicator.textContent = current?.columnIndex === index
      ? (current.direction === "asc" ? "^" : "v")
      : "-";
  });
}

// Convierte encabezados normales en botones de sort, manteniendo el texto original.
function setupSortableTable(tableId) {
  const table = getElement(tableId)?.closest("table");

  if (!table || table.dataset.sortReady === "true") {
    return;
  }

  table.querySelectorAll("thead th").forEach((header, index) => {
    const label = header.textContent.trim();
    const button = document.createElement("button");
    const text = document.createElement("span");
    const indicator = document.createElement("span");

    header.dataset.label = label;
    button.type = "button";
    button.className = "sort-button";
    text.textContent = label;
    indicator.className = "sort-indicator";
    indicator.textContent = "-";
    button.append(text, indicator);
    button.addEventListener("click", () => sortTable(tableId, index));
    header.textContent = "";
    header.appendChild(button);
  });

  table.dataset.sortReady = "true";
}

// Limpia un contenedor de grafica y muestra un estado vacio si no hay datos.
function prepareChart(containerId, rows) {
  const container = getElement(containerId);

  if (!container) {
    return null;
  }

  container.innerHTML = "";

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "chart-empty";
    empty.textContent = "Sin datos suficientes todavia";
    container.appendChild(empty);
    return null;
  }

  return container;
}

// Crea un SVG responsive con viewBox estable para que la grafica no se deforme.
function createChartSvg() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 640 220");
  svg.setAttribute("role", "img");
  svg.classList.add("chart-svg");
  return svg;
}

// Dibuja lineas horizontales suaves para dar lectura de escala.
function drawChartGrid(svg, chart) {
  for (let index = 0; index <= 4; index += 1) {
    const y = chart.top + ((chart.height / 4) * index);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");

    line.setAttribute("x1", chart.left);
    line.setAttribute("x2", chart.left + chart.width);
    line.setAttribute("y1", y);
    line.setAttribute("y2", y);
    line.setAttribute("class", "chart-grid-line");
    svg.appendChild(line);
  }

  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", chart.left);
  xAxis.setAttribute("y1", chart.top + chart.height);
  xAxis.setAttribute("x2", chart.left + chart.width);
  xAxis.setAttribute("y2", chart.top + chart.height);
  xAxis.setAttribute("class", "chart-axis-line");
  svg.appendChild(xAxis);

  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", chart.left);
  yAxis.setAttribute("y1", chart.top);
  yAxis.setAttribute("x2", chart.left);
  yAxis.setAttribute("y2", chart.top + chart.height);
  yAxis.setAttribute("class", "chart-axis-line");
  svg.appendChild(yAxis);
}

// Dibuja etiquetas inferiores por dia.
function drawChartLabels(svg, rows, chart, xForIndex) {
  rows.forEach((row, index) => {
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");

    label.setAttribute("x", xForIndex(index));
    label.setAttribute("y", chart.top + chart.height + 24);
    label.setAttribute("class", "chart-label");
    label.textContent = row.label;
    svg.appendChild(label);
  });
}

// Grafica lineal por dia. Si solo hay un dia, centra un punto con etiqueta.
function renderDailyLineChart(containerId, rows, options) {
  const container = prepareChart(containerId, rows);

  if (!container) {
    return;
  }

  const svg = createChartSvg();
  const chart = { left: 46, top: 18, width: 548, height: 142 };
  const maxValue = Math.max(...rows.map(options.value), 1);
  const xForIndex = index => {
    if (rows.length === 1) {
      return chart.left + (chart.width / 2);
    }

    return chart.left + ((chart.width / (rows.length - 1)) * index);
  };
  const yForValue = value => chart.top + chart.height - ((value / maxValue) * chart.height);
  const points = rows.map((row, index) => `${xForIndex(index)},${yForValue(options.value(row))}`).join(" ");

  drawChartGrid(svg, chart);

  const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  polyline.setAttribute("points", points);
  polyline.setAttribute("class", "chart-line");
  svg.appendChild(polyline);

  rows.forEach((row, index) => {
    const value = options.value(row);
    const x = xForIndex(index);
    const y = yForValue(value);
    const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");

    point.setAttribute("cx", x);
    point.setAttribute("cy", y);
    point.setAttribute("r", 5);
    point.setAttribute("class", "chart-point");
    valueLabel.setAttribute("x", x);
    valueLabel.setAttribute("y", y < chart.top + 24 ? y + 22 : y - 10);
    valueLabel.setAttribute("class", "chart-value");
    valueLabel.textContent = options.format(value, row);
    svg.append(point, valueLabel);
  });

  drawChartLabels(svg, rows, chart, xForIndex);
  container.appendChild(svg);
}

// Grafica de barras por dia con ancho maximo para evitar barras gigantes.
function renderDailyBarChart(containerId, rows, options) {
  const container = prepareChart(containerId, rows);

  if (!container) {
    return;
  }

  const svg = createChartSvg();
  const chart = { left: 46, top: 18, width: 548, height: 142 };
  const maxValue = Math.max(...rows.map(options.value), 1);
  const slotWidth = chart.width / rows.length;
  const barWidth = Math.min(slotWidth * 0.56, 46);
  const xForIndex = index => chart.left + (slotWidth * index) + (slotWidth / 2);

  drawChartGrid(svg, chart);

  rows.forEach((row, index) => {
    const value = options.value(row);
    const height = Math.max((value / maxValue) * chart.height, value > 0 ? 4 : 0);
    const x = xForIndex(index);
    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");

    bar.setAttribute("x", x - (barWidth / 2));
    bar.setAttribute("y", chart.top + chart.height - height);
    bar.setAttribute("width", barWidth);
    bar.setAttribute("height", height);
    bar.setAttribute("rx", 4);
    bar.setAttribute("class", "chart-bar");
    valueLabel.setAttribute("x", x);
    valueLabel.setAttribute("y", height > chart.height - 20 ? chart.top + 16 : chart.top + chart.height - height - 8);
    valueLabel.setAttribute("class", "chart-value");
    valueLabel.textContent = options.format(value, row);
    svg.append(bar, valueLabel);
  });

  drawChartLabels(svg, rows, chart, xForIndex);
  container.appendChild(svg);
}

function bindShipmentBar(bar, row, options) {
  if (!options.tool) {
    return;
  }

  const fechaEmbarque = options.shipmentDate ? options.shipmentDate(row) : row.label;
  const toolLabel = options.tool === "rapid27"
    ? "27/Rapid"
    : options.tool === "nike"
      ? "Nike"
      : "MockupTool";

  bar.dataset.tool = options.tool;
  bar.dataset.fechaEmbarque = fechaEmbarque;
  bar.dataset.shipmentKey = row.key || "";
  bar.setAttribute("role", "button");
  bar.setAttribute("tabindex", "0");
  bar.setAttribute(
    "aria-label",
    `Abrir detalle de ${toolLabel} para embarque ${fechaEmbarque}`
  );
  bar.addEventListener("dblclick", event => {
    event.preventDefault();

    if (options.tool === "rapid27") {
      navigateToRapid27ShipmentDetail(row.shipment_key || row.key).catch(error => console.error(error));
      return;
    }

    navigateToShipmentDetail(options.tool, fechaEmbarque, row.key);
  });
}

// Grafica de barras por ejecucion; ideal para comparar corridas Mockup por style.
function renderExecutionBarChart(containerId, rows, options) {
  const container = prepareChart(containerId, rows);

  if (!container) {
    return;
  }

  const svg = createChartSvg();
  const chart = { left: 46, top: 18, width: 548, height: 142 };
  const maxValue = Math.max(...rows.map(options.value), 1);
  const slotWidth = chart.width / rows.length;
  const barWidth = Math.min(slotWidth * 0.62, 42);
  const xForIndex = index => chart.left + (slotWidth * index) + (slotWidth / 2);

  drawChartGrid(svg, chart);

  rows.forEach((row, index) => {
    const value = options.value(row);
    const height = Math.max((value / maxValue) * chart.height, value > 0 ? 4 : 0);
    const x = xForIndex(index);
    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const valueLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");

    bar.setAttribute("x", x - (barWidth / 2));
    bar.setAttribute("y", chart.top + chart.height - height);
    bar.setAttribute("width", barWidth);
    bar.setAttribute("height", height);
    bar.setAttribute("rx", 4);
    bar.setAttribute("class", "chart-bar");
    bindShipmentBar(bar, row, options);
    valueLabel.setAttribute("x", x);
    valueLabel.setAttribute("y", height > chart.height - 20 ? chart.top + 16 : chart.top + chart.height - height - 8);
    valueLabel.setAttribute("class", "chart-value");
    valueLabel.textContent = options.format(value, row);
    svg.append(bar, valueLabel);
  });

  drawChartLabels(svg, rows, chart, index => xForIndex(index));
  rows.forEach((row, index) => {
    const labels = svg.querySelectorAll(".chart-label");
    labels[index].textContent = options.label(row);
  });

  if (options.title) {
    const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
    title.setAttribute("x", chart.left + (chart.width / 2));
    title.setAttribute("y", chart.top - 6);
    title.setAttribute("class", "chart-title");
    title.textContent = options.title;
    svg.appendChild(title);
  }

  if (options.xLabel) {
    const xAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    xAxisLabel.setAttribute("x", chart.left + (chart.width / 2));
    xAxisLabel.setAttribute("y", chart.top + chart.height + 36);
    xAxisLabel.setAttribute("class", "chart-axis-label");
    xAxisLabel.textContent = options.xLabel;
    svg.appendChild(xAxisLabel);
  }

  if (options.yLabel) {
    const yAxisLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yAxisLabel.setAttribute("x", chart.left - 38);
    yAxisLabel.setAttribute("y", chart.top + (chart.height / 2));
    yAxisLabel.setAttribute("transform", `rotate(-90 ${chart.left - 38} ${chart.top + (chart.height / 2)})`);
    yAxisLabel.setAttribute("class", "chart-axis-label");
    yAxisLabel.textContent = options.yLabel;
    svg.appendChild(yAxisLabel);
  }

  container.appendChild(svg);
}

// Pinta una tabla mensual compacta a partir de un arreglo de objetos.
function renderMonthlyTable(tableId, rows, columns) {
  const tbody = getElement(tableId);

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = addCell(row, "Sin datos mensuales todavia");
    cell.colSpan = columns.length;
    tbody.appendChild(row);
    return;
  }

  rows.forEach(item => {
    const row = document.createElement("tr");

    columns.forEach(column => {
      addCell(row, column.value(item));
    });

    tbody.appendChild(row);
  });
}

function filterDashboardPeriod(rows, monthKey) {
  if (!monthKey) {
    return rows;
  }

  return rows.filter(row => String(row.key || "").startsWith(monthKey));
}

function getDashboardMonthKeys(monthlyRows) {
  return [...new Set((monthlyRows || [])
    .map(row => row.key)
    .filter(Boolean))]
    .sort();
}

function setDashboardMonth(tool, monthKey) {
  syncToolMonthInputs(tool, monthKey);

  if (tool === "nike") {
    renderNikeDashboardPeriod(monthKey);
    renderNikeRunsTable();
    return;
  }

  if (tool === "rapid27") {
    renderRapid27DashboardPeriod(monthKey);
    renderRapid27Shipments();
    return;
  }

  renderMockupDashboardPeriod(monthKey);
  renderMockupRunsTable();
}

function updateDashboardMonthNav(tool, monthKey) {
  if (!dashboardData && tool !== "rapid27") return;

  const monthKeys = tool === "rapid27"
    ? getRapid27MonthKeys()
    : getDashboardMonthKeys(tool === "nike" ? dashboardData.nike.monthly : dashboardData.mockup.monthly);
  const prevButton = getElement(tool === "rapid27" ? "rapid27DashboardMonthPrev" : `${tool}MonthPrev`);
  const nextButton = getElement(tool === "rapid27" ? "rapid27DashboardMonthNext" : `${tool}MonthNext`);
  const previousMonth = [...monthKeys].reverse().find(key => key < monthKey);
  const nextMonth = monthKeys.find(key => key > monthKey);

  if (prevButton) {
    prevButton.disabled = !monthKey || !previousMonth;
    prevButton.title = previousMonth ? `Ir a ${previousMonth.slice(5, 7)}/${previousMonth.slice(0, 4)}` : "Sin mes anterior";
  }

  if (nextButton) {
    nextButton.disabled = !monthKey || !nextMonth;
    nextButton.title = nextMonth ? `Ir a ${nextMonth.slice(5, 7)}/${nextMonth.slice(0, 4)}` : "Sin mes siguiente";
  }
}

function moveDashboardMonth(tool, direction) {
  if (!dashboardData && tool !== "rapid27") return;

  const input = getToolMonthInput(tool, "dashboard");
  const monthKeys = tool === "rapid27"
    ? getRapid27MonthKeys()
    : getDashboardMonthKeys(tool === "nike" ? dashboardData.nike.monthly : dashboardData.mockup.monthly);
  const currentMonth = input?.value || "";
  const targetMonth = direction < 0
    ? [...monthKeys].reverse().find(key => !currentMonth || key < currentMonth)
    : monthKeys.find(key => !currentMonth || key > currentMonth);

  if (targetMonth) {
    setDashboardMonth(tool, targetMonth);
  }
}

function renderNikeDashboardPeriod(monthKey) {
  if (!dashboardData) return;

  renderExecutionBarChart(
    "nikeTimeChart",
    filterDashboardPeriod(dashboardData.nike.daily, monthKey),
    {
      title: monthKey ? `Embarques ${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}` : "Todos los embarques",
      tool: "nike",
      shipmentDate: shipment => shipment.label,
      label: shipment => shipment.label,
      value: shipment => Number(shipment.piezas || 0),
      format: value => formatNumber(value),
      xLabel: "Embarque",
      yLabel: "Total de piezas"
    }
  );

  renderMonthlyTable(
    "nikeMonthlyTable",
    filterDashboardPeriod(dashboardData.nike.monthly, monthKey),
    [
      { value: item => item.label },
      { value: item => formatNumber(item.runs) },
      { value: item => formatNumber(item.pedidos) },
      { value: item => formatNumber(item.piezas) },
      { value: item => item.avgTiempo || "00:00:00" },
      { value: item => formatNumber(item.errores) }
    ]
  );

  updateDashboardMonthNav("nike", monthKey);
}

function renderMockupDashboardPeriod(monthKey) {
  if (!dashboardData) return;

  renderExecutionBarChart(
    "mockupTemplateChart",
    filterDashboardPeriod(dashboardData.mockup.daily, monthKey),
    {
      title: monthKey ? `Embarques ${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}` : "Todos los embarques",
      tool: "mockup",
      shipmentDate: shipment => shipment.label,
      label: shipment => shipment.label,
      value: shipment => Number(shipment.plantillas || 0),
      format: value => formatNumber(value),
      xLabel: "Embarque",
      yLabel: "Total de maquetas"
    }
  );

  renderMonthlyTable(
    "mockupMonthlyTable",
    filterDashboardPeriod(dashboardData.mockup.monthly, monthKey),
    [
      { value: item => item.label },
      { value: item => formatNumber(item.runs) },
      { value: item => formatNumber(item.plantillas) },
      { value: item => formatNumber(item.faltantes) }
    ]
  );

  updateDashboardMonthNav("mockup", monthKey);
}

function getInitialDashboardMonth(monthlyRows) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  if (monthlyRows.some(row => row.key === currentMonth)) {
    return currentMonth;
  }

  return monthlyRows.at(-1)?.key || "";
}

// Cada selector controla exclusivamente la grafica y tabla de su herramienta.
function bindDashboardMonthFilters() {
  const nikeInput = getElement("nikeMonthFilter");
  const mockupInput = getElement("mockupMonthFilter");
  const rapid27Input = getElement("rapid27DashboardMonthFilter");
  const nikeRunsInput = getElement("nikeRunsMonthFilter");
  const mockupRunsInput = getElement("mockupRunsMonthFilter");

  nikeInput?.addEventListener("change", () => setDashboardMonth("nike", nikeInput.value));
  mockupInput?.addEventListener("change", () => setDashboardMonth("mockup", mockupInput.value));
  rapid27Input?.addEventListener("change", () => setDashboardMonth("rapid27", rapid27Input.value));
  nikeRunsInput?.addEventListener("change", () => setDashboardMonth("nike", nikeRunsInput.value));
  mockupRunsInput?.addEventListener("change", () => setDashboardMonth("mockup", mockupRunsInput.value));

  getElement("nikeMonthPrev")?.addEventListener("click", () => moveDashboardMonth("nike", -1));
  getElement("nikeMonthNext")?.addEventListener("click", () => moveDashboardMonth("nike", 1));
  getElement("mockupMonthPrev")?.addEventListener("click", () => moveDashboardMonth("mockup", -1));
  getElement("mockupMonthNext")?.addEventListener("click", () => moveDashboardMonth("mockup", 1));
  getElement("rapid27DashboardMonthPrev")?.addEventListener("click", () => moveDashboardMonth("rapid27", -1));
  getElement("rapid27DashboardMonthNext")?.addEventListener("click", () => moveDashboardMonth("rapid27", 1));

  getElement("nikeMonthAll")?.addEventListener("click", () => {
    setDashboardMonth("nike", "");
  });

  getElement("mockupMonthAll")?.addEventListener("click", () => {
    setDashboardMonth("mockup", "");
  });

  getElement("rapid27DashboardMonthAll")?.addEventListener("click", () => {
    setDashboardMonth("rapid27", "");
  });

  getElement("nikeRunsMonthAll")?.addEventListener("click", () => {
    setDashboardMonth("nike", "");
  });

  getElement("mockupRunsMonthAll")?.addEventListener("click", () => {
    setDashboardMonth("mockup", "");
  });
}

// Pinta las tarjetas y graficas del dashboard con la estructura que manda la API.
async function loadDashboard() {
  const data = await getJSON("/api/dashboard");
  dashboardData = data;

  setText("toolsCount", formatNumber(data.toolsCount));
  setText("gitCommits", formatNumber(data.gitCommits));
  setText("totalErrors", formatNumber(data.errores));

  setText("nikeRuns", formatNumber(data.nike.runs));
  setText("nikePedidos", formatNumber(data.nike.pedidos));
  setText("nikeRegistros", formatNumber(data.nike.registros));
  setText("nikePiezas", formatNumber(data.nike.piezas));
  setText("nikeEstilos", formatNumber(data.nike.estilos));
  setText("nikeAvgTime", data.nike.promedioTiempo || "00:00:00");

  setText("mockupRuns", formatNumber(data.mockup.runs));
  setText("mockupRegistros", formatNumber(data.mockup.registros));
  setText("mockupTemplates", formatNumber(data.mockup.plantillas));
  setText("mockupFaltantes", formatNumber(data.mockup.faltantes));
  setText("mockupRowsSelected", formatNumber(data.mockup.filasSeleccionadas));
  setText("mockupDesigners", formatNumber(data.mockup.disenadores));

  const nikeMonthInput = getElement("nikeMonthFilter");
  const mockupMonthInput = getElement("mockupMonthFilter");

  if (nikeMonthInput && !nikeMonthInput.value) {
    nikeMonthInput.value = getInitialDashboardMonth(data.nike.monthly);
  }

  if (mockupMonthInput && !mockupMonthInput.value) {
    mockupMonthInput.value = getInitialDashboardMonth(data.mockup.monthly);
  }

  setDashboardMonth("nike", nikeMonthInput?.value || "");
  setDashboardMonth("mockup", mockupMonthInput?.value || "");

  appendLog("Dashboard actualizado", "success");
}

async function loadRapid27DashboardData() {
  const [summary, shipmentResponse] = await Promise.all([
    getJSON("/api/optimizador/rapid27/summary"),
    getJSON("/api/optimizador/rapid27/shipments")
  ]);
  const monthInput = getElement("rapid27DashboardMonthFilter");

  rapid27ShipmentsCache = shipmentResponse.shipments || [];
  populateRapid27ClientFilter(rapid27ShipmentsCache);
  renderRapid27Summary(summary);

  if (monthInput && !monthInput.value) {
    monthInput.value = getInitialRapid27Month();
  }

  setDashboardMonth("rapid27", monthInput?.value || "");
  appendLog(`Seguimiento 27/Rapid: ${formatNumber(shipmentResponse.total)} embarques cargados`, "success");
}

function renderNikeRunsTable() {
  const tbody = getElement("runsTable");
  const monthKey = getSelectedToolMonth("nike");
  const runs = filterRunsByMonth(nikeRunsCache, monthKey);

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  if (!runs.length) {
    addEmptyTableRow(
      tbody,
      monthKey
        ? `Sin ejecuciones Nike para ${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}.`
        : "Sin ejecuciones Nike registradas.",
      7
    );
  }

  runs.forEach(run => {
    const row = document.createElement("tr");
    const actionId = run.sample_run_id || run.id;
    const isGrouped = typeof run.run_count !== "undefined";

    row.dataset.runId = actionId;

    addCell(row, formatDDMM(run.fecha_embarque || run.created_at));
    addCell(row, run.run_year || "");
    addCell(
      row,
      isGrouped
        ? `${run.run_count} ${Number(run.run_count) === 1 ? "ejecución" : "ejecuciones"}`
        : "1 ejecución"
    );
    addCell(row, formatNumber(run.pedidos));
    addCell(row, formatNumber(run.piezas));
    addButtonCell(row, "Ver", () => {
      loadRunDetail(actionId).catch(error => console.error(error));
    });
    addLinkCell(row, "Excel", `/api/reports/nike/${encodeURIComponent(actionId)}/excel`);

    row.addEventListener("dblclick", () => {
      loadRunDetail(actionId).catch(error => console.error(error));
    });
    tbody.appendChild(row);
  });

  refreshTableFilter("runsTable");
  updateSortIndicators("runsTable");
}

// Carga la tabla de ejecuciones Nike.
async function loadRuns() {
  const data = await getJSON("/api/nike/runs");
  const runs = Array.isArray(data) ? data : data.runs || [];

  nikeRunsCache = runs;
  renderNikeRunsTable();
  appendLog(`Pedidos Nike Lacrosse: ${runs.length} embarques cargados (página ${data.page || 1})`, "success");
}

// Carga el detalle de una ejecucion Nike y muestra el panel bajo la tabla.
async function loadRunDetail(id) {
  const requestId = ++nikeDetailRequestId;
  const detailSection = getElement("detailSection");
  const runInfo = getElement("runInfo");
  const tbody = getElement("itemsTable");

  showDetailLoading("detailSection", "runInfo", "itemsTable", "Cargando detalle Nike...", 11);

  try {
    const data = await getJSON(`/api/nike/runs/${encodeURIComponent(id)}`);

    if (requestId !== nikeDetailRequestId) {
      return;
    }

    detailSection.classList.remove("hidden");
    const runCount = Number(data.runCount || 1);
    const executionLabel = runCount === 1 ? "ejecución" : "ejecuciones";

    runInfo.textContent = `${runCount} ${executionLabel} | ${formatDDMM(data.groupDate || data.run?.fecha_embarque || data.run?.created_at)} | ${data.herramienta || data.run?.herramienta || "RMCOp-Nike"} | ${formatNumber(data.totalPieces || data.run?.piezas)} piezas | ${data.year || ""}`;
    renderNikeActiveFlowSummary(data.items);
    tbody.innerHTML = "";

    if (!data.items.length) {
      addEmptyTableRow(
        tbody,
        `No hay items registrados para el embarque ${formatDDMM(data.groupDate || data.run?.fecha_embarque || data.run?.created_at)}.`,
        11
      );
    }

    data.items.forEach(item => {
      const row = document.createElement("tr");

      row.dataset.itemId = item.id || "";
      row.dataset.itemRunId = item.run_id || "";

      addCell(row, item.wo || "");
      addCell(row, item.style || "");
      addCell(row, getTeamDisplay(item));
      addCell(row, item.variante || "");
      addCell(row, getItemTypeDisplay(item));
      addCell(row, item.talla || "");
      addCell(row, formatNumber(item.piezas));
      addCell(row, item.nombre || "");
      addCell(row, item.numero || "");
      addOperationalStatusCell(row, item);
      addButtonCell(row, "Ver mas", () => showNikeItemModal(item));

      row.addEventListener("dblclick", () => showNikeItemModal(item));
      tbody.appendChild(row);
    });

    refreshTableFilter("itemsTable");
    updateSortIndicators("itemsTable");
    detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
    appendLog(`Detalle Nike ${id}: ${data.items.length} items`, "success");
  } catch (error) {
    if (requestId === nikeDetailRequestId) {
      tbody.innerHTML = "";
      runInfo.textContent = "No se pudo cargar el detalle Nike";
      addEmptyTableRow(tbody, error.message || "No se pudo cargar el detalle Nike.", 11);
      refreshTableFilter("itemsTable");
      updateSortIndicators("itemsTable");
      appendLog(error.message || `No se pudo cargar detalle Nike ${id}`, "error");
    }

    throw error;
  } finally {
    if (requestId === nikeDetailRequestId) {
      finishDetailLoading("detailSection", "itemsTable");
    }
  }
}

function renderMockupRunsTable() {
  const tbody = getElement("mockupTable");
  const monthKey = getSelectedToolMonth("mockup");
  const runs = filterRunsByMonth(mockupRunsCache, monthKey);

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  if (!runs.length) {
    addEmptyTableRow(
      tbody,
      monthKey
        ? `Sin embarques MockupTool para ${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}.`
        : "Sin embarques MockupTool registrados.",
      7
    );
  }

  runs.forEach(run => {
    const row = document.createElement("tr");
    const actionId = run.sample_run_id || run.id;
    const runCount = Number(run.run_count || 1);
    row.dataset.runId = actionId;

    addCell(row, formatDDMM(run.fecha_embarque || run.fecha));
    addCell(row, run.run_year || "");
    addCell(row, `${runCount} ${runCount === 1 ? "ejecución" : "ejecuciones"}`);
    addCell(row, formatNumber(run.pedidos));
    addCell(row, formatNumber(run.maquetas));
    addButtonCell(row, "Ver", () => {
      loadMockupDetail(actionId).catch(error => console.error(error));
    });
    addLinkCell(row, "Excel", `/api/reports/mockup/${encodeURIComponent(actionId)}/excel`);

    row.addEventListener("dblclick", () => {
      loadMockupDetail(actionId).catch(error => console.error(error));
    });
    tbody.appendChild(row);
  });

  refreshTableFilter("mockupTable");
  updateSortIndicators("mockupTable");
}

// Carga la tabla de ejecuciones MockupTool.
async function loadMockupRuns() {
  const data = await getJSON("/api/mockup/runs");
  const runs = Array.isArray(data) ? data : data.runs || [];

  mockupRunsCache = runs;
  renderMockupRunsTable();
  appendLog(`Maquetas RMC Nike: ${runs.length} embarques cargados`, "success");
}

// Carga el detalle de una ejecucion MockupTool.
async function loadMockupDetail(id) {
  const requestId = ++mockupDetailRequestId;
  const detailSection = getElement("mockupDetailSection");
  const runInfo = getElement("mockupRunInfo");
  const tbody = getElement("mockupItemsTable");

  showDetailLoading("mockupDetailSection", "mockupRunInfo", "mockupItemsTable", "Cargando detalle MockupTool...", 10);

  try {
    const data = await getJSON(`/api/mockup/runs/${encodeURIComponent(id)}`);

    if (requestId !== mockupDetailRequestId) {
      return;
    }

    detailSection.classList.remove("hidden");
    const runCount = Number(data.runCount || 1);
    runInfo.textContent = `${runCount} ${runCount === 1 ? "ejecución" : "ejecuciones"} | ${formatDDMM(data.groupDate || data.run.fecha_embarque)} | ${formatNumber(data.totalMaquetas)} maquetas | ${data.year || ""}`;
    tbody.innerHTML = "";

    if (!data.items.length) {
      addEmptyTableRow(
        tbody,
        `No hay items registrados para el embarque ${formatDDMM(data.groupDate || data.run.fecha_embarque)}.`,
        10
      );
    }

    data.items.forEach(item => {
      const row = document.createElement("tr");

      addCell(row, item.wo || "");
      addCell(row, item.style || "");
      addCell(row, getTeamDisplay(item));
      addCell(row, item.variante || "");
      addCell(row, getItemTypeDisplay(item));
      addCell(row, item.talla || "");
      addCell(row, formatNumber(item.piezas));
      addCell(row, item.disenador || "");
      addDepartmentStatusCell(row, item.estado || "", item.error ? "status-error" : "status-ok");
      addButtonCell(row, "Ver mas", () => showMockupItemModal(item));

      row.dataset.itemId = item.id || "";
      row.dataset.itemRunId = item.run_id || "";
      row.addEventListener("dblclick", () => showMockupItemModal(item));

      tbody.appendChild(row);
    });

    refreshTableFilter("mockupItemsTable");
    updateSortIndicators("mockupItemsTable");
    detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
    appendLog(`Detalle de maquetas ${id}: ${data.items.length} items`, "success");
  } catch (error) {
    if (requestId === mockupDetailRequestId) {
      tbody.innerHTML = "";
      runInfo.textContent = "No se pudo cargar el detalle MockupTool";
      addEmptyTableRow(tbody, error.message || "No se pudo cargar el detalle MockupTool.", 10);
      refreshTableFilter("mockupItemsTable");
      updateSortIndicators("mockupItemsTable");
      appendLog(error.message || `No se pudo cargar detalle MockupTool ${id}`, "error");
    }

    throw error;
  } finally {
    if (requestId === mockupDetailRequestId) {
      finishDetailLoading("mockupDetailSection", "mockupItemsTable");
    }
  }
}

function formatRapid27Status(value) {
  const key = String(value || "PENDIENTE").trim().toUpperCase();

  if (rapid27StatusLabels[key]) {
    return rapid27StatusLabels[key];
  }

  return String(value || "PENDIENTE")
    .replaceAll("_", " ")
    .toLocaleLowerCase("es-MX")
    .replace(/(^|\s)\S/g, character => character.toLocaleUpperCase("es-MX"));
}

function getRapid27Department(value) {
  const status = String(value || "");

  if (/almacen/i.test(status)) return "almacen";
  if (/sublimado/i.test(status)) return "sublimado";
  if (/impresion|archivo/i.test(status)) return "diseno";
  return "default";
}

function addRapid27StatusCell(row, status) {
  const label = formatRapid27Status(status);
  const cell = document.createElement("td");
  const wrapper = document.createElement("div");
  const detail = document.createElement("span");

  wrapper.className = "operational-status";
  wrapper.dataset.department = getRapid27Department(label);
  cell.dataset.filterValue = label;
  detail.textContent = "";
  wrapper.append(makeDepartmentBadge(label, label), detail);
  cell.appendChild(wrapper);
  row.appendChild(cell);
  return cell;
}

function getRapid27MonthFilterValue() {
  return getElement("rapid27MonthFilter")?.value || "";
}

function getRapid27ClientFilterValue() {
  return getElement("rapid27ClientFilter")?.value || "";
}

function filterRapid27Shipments(shipments) {
  const monthKey = getRapid27MonthFilterValue();
  const client = getRapid27ClientFilterValue();

  return (shipments || []).filter(shipment => {
    const matchesMonth = !monthKey || shipment.month_key === monthKey;
    const matchesClient = !client || shipment.cliente === client;

    return matchesMonth && matchesClient;
  });
}

function populateRapid27ClientFilter(shipments) {
  const select = getElement("rapid27ClientFilter");

  if (!select) {
    return;
  }

  const currentValue = select.value;
  const clients = [...new Set((shipments || []).map(shipment => shipment.cliente).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));

  select.innerHTML = '<option value="">Todos los clientes</option>';
  clients.forEach(client => {
    const option = document.createElement("option");
    option.value = client;
    option.textContent = client;
    select.appendChild(option);
  });

  select.value = clients.includes(currentValue) ? currentValue : "";
}

function getRapid27MonthKeys() {
  return [...new Set((rapid27ShipmentsCache || [])
    .map(shipment => shipment.month_key)
    .filter(Boolean))]
    .sort();
}

function getInitialRapid27Month() {
  const monthKeys = getRapid27MonthKeys();

  return monthKeys.at(-1) || "";
}

function renderRapid27DashboardPeriod(monthKey) {
  const rows = (rapid27ShipmentsCache || [])
    .filter(shipment => !monthKey || shipment.month_key === monthKey)
    .sort((a, b) => String(a.sort_key || "").localeCompare(String(b.sort_key || "")));

  renderExecutionBarChart(
    "rapid27TrackingChart",
    rows,
    {
      title: monthKey ? `Embarques ${monthKey.slice(5, 7)}/${monthKey.slice(0, 4)}` : "Todos los embarques",
      tool: "rapid27",
      shipmentDate: shipment => shipment.fecha_embarque || shipment.emb || "",
      label: shipment => shipment.fecha_embarque || shipment.emb || "",
      value: shipment => Number(shipment.pieces || 0),
      format: value => formatNumber(value),
      xLabel: "Embarque",
      yLabel: "Total de piezas"
    }
  );

  updateDashboardMonthNav("rapid27", monthKey);
}

async function navigateToRapid27ShipmentDetail(shipmentKey) {
  if (!shipmentKey) {
    return;
  }

  const shouldLoad = !lazyViewLoads.rapid27;

  if (shouldLoad) {
    lazyViewLoads.rapid27 = true;
  }

  switchView("rapid27-view");

  if (shouldLoad) {
    await loadRapid27Data();
  }

  await showRapid27Shipment(shipmentKey);
}

function setRapid27Flow(summary) {
  const flows = [
    ["rapid27FilesFlow", "Archivos", summary.files_ready, "diseno"],
    ["rapid27PrintFlow", "Sublimado", summary.print_matched_outputs, "sublimado"],
    ["rapid27WarehouseFlow", "Almacén", summary.sublimation_matched_outputs, "almacen"]
  ];

  flows.forEach(([id, label, count]) => {
    const title = getElement(id);
    const step = title?.closest(".tracking-step");

    if (title) title.textContent = `${label}: ${formatNumber(count)}`;
    if (step) step.dataset.active = String(Number(count || 0) > 0);
  });
}

function renderRapid27Summary(summary) {
  setText("rapid27Embarques", formatNumber(summary.shipments));
  setText("rapid27Pedidos", formatNumber(summary.orders));
  setText("rapid27Piezas", formatNumber(summary.pieces));
  setText("rapid27Estilos", formatNumber(summary.styles));
  setText("rapid27Impresion", formatNumber(summary.files_ready));
  setText("rapid27Sublimado", formatNumber(summary.sublimation_matched_outputs));
  setText("rapid27UpdatedAt", summary.updated_at ? `Actualizado: ${summary.updated_at}` : "");
  setRapid27Flow(summary);

  const availability = getElement("rapid27Availability");

  if (availability) {
    availability.textContent = summary.available ? "Datos conectados" : "Tablas no disponibles";
    availability.dataset.department = summary.available ? "almacen" : "default";
  }
}

function renderRapid27Shipments() {
  const tbody = getElement("rapid27Table");
  const shipments = filterRapid27Shipments(rapid27ShipmentsCache);
  const monthKey = getRapid27MonthFilterValue();
  const client = getRapid27ClientFilterValue();

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  if (!shipments.length) {
    const message = monthKey || client
      ? "Sin embarques 27/Rapid para los filtros seleccionados."
      : "No hay embarques registrados en rmc_opt_order_lines.";
    addEmptyTableRow(tbody, message, 9);
  }

  shipments.forEach(shipment => {
    const row = document.createElement("tr");

    addCell(row, shipment.fecha_embarque || shipment.emb || "");
    addCell(row, shipment.year || "");
    addCell(row, shipment.cliente || "");
    addCell(row, formatNumber(shipment.order_count));
    addCell(row, formatNumber(shipment.pieces));
    addCell(row, formatNumber(shipment.styles));
    addCell(row, `${formatNumber(shipment.files_ready)}/${formatNumber(shipment.outputs)}`);
    addRapid27StatusCell(row, shipment.operational_status);
    addButtonCell(row, "Ver", () => showRapid27Shipment(shipment.shipment_key));
    row.dataset.shipmentKey = shipment.shipment_key;
    row.dataset.client = shipment.cliente || "";
    row.dataset.monthKey = shipment.month_key || "";
    row.addEventListener("dblclick", () => showRapid27Shipment(shipment.shipment_key));
    tbody.appendChild(row);
  });

  refreshTableFilter("rapid27Table");
  updateSortIndicators("rapid27Table");
}

function renderRapid27ShipmentFlow(shipment) {
  const container = getElement("rapid27ShipmentFlowSummary");

  if (!container) {
    return;
  }

  const stages = [
    ["diseno", "Impresion", Math.max(0, shipment.outputs - shipment.print_matched_outputs - shipment.sublimation_matched_outputs), "En proceso"],
    ["sublimado", "Sublimado", shipment.print_matched_outputs, "Bajado / parcial"],
    ["almacen", "Almacen", shipment.sublimation_matched_outputs, "Liberado a linea"]
  ].filter(([, , count]) => Number(count || 0) > 0);

  container.textContent = "";
  container.classList.toggle("hidden", stages.length === 0);

  if (!stages.length) {
    return;
  }

  const label = document.createElement("span");
  label.className = "compact-flow-label";
  label.textContent = "Circulacion activa";
  container.appendChild(label);

  stages.forEach(([department, labelText, count, detailText]) => {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");

    item.className = "tracking-step compact-tracking-step";
    item.dataset.department = department;
    item.dataset.active = "true";
    title.textContent = `${labelText}: ${formatNumber(count)}`;
    detail.textContent = detailText;
    item.append(title, detail);
    container.appendChild(item);
  });
}

function renderRapid27ShipmentDetail(data) {
  const { shipment, orders } = data;
  const tbody = getElement("rapid27OrdersTable");

  setText(
    "rapid27ShipmentInfo",
    `${shipment.cliente || "Sin cliente"} | ${shipment.fecha_embarque || shipment.emb || "Sin emb"} | ${formatNumber(shipment.order_count)} pedidos | ${formatNumber(shipment.pieces)} piezas | ${formatRapid27Status(shipment.operational_status)}`
  );
  renderRapid27ShipmentFlow(shipment);

  tbody.innerHTML = "";

  if (!orders.length) {
    addEmptyTableRow(tbody, "Este embarque no tiene pedidos vinculados.", 7);
  }

  orders.forEach(order => {
    const row = document.createElement("tr");

    addCell(row, order.roster || "");
    addCell(row, order.nombre_pedido || "");
    addCell(row, formatNumber(order.pieces || order.listed_pieces));
    addCell(row, formatNumber(order.styles));
    addCell(row, `${formatNumber(order.files_ready)}/${formatNumber(order.outputs)}`);
    addRapid27StatusCell(row, order.operational_status);
    addButtonCell(row, "Ver", () => showRapid27OrderModal(order.id, order.shipment_key));
    row.dataset.orderId = order.id;
    row.addEventListener("dblclick", () => showRapid27OrderModal(order.id, order.shipment_key));
    tbody.appendChild(row);
  });

  refreshTableFilter("rapid27OrdersTable");
  updateSortIndicators("rapid27OrdersTable");
}

async function showRapid27Shipment(shipmentKey) {
  const requestId = ++rapid27DetailRequestId;
  const section = getElement("rapid27DetailSection");
  const tbody = getElement("rapid27OrdersTable");

  rapid27ActiveShipmentKey = shipmentKey;
  section.classList.remove("hidden");
  section.setAttribute("aria-busy", "true");
  setText("rapid27ShipmentInfo", "Cargando detalle de embarque...");
  getElement("rapid27ShipmentFlowSummary")?.classList.add("hidden");
  tbody.innerHTML = "";
  addLoadingTableRow(tbody, "Cargando pedidos del embarque...", 7);
  setDetailToolsLoading("rapid27OrdersTable", true);
  section.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const data = await getJSON(`/api/optimizador/rapid27/shipments/${encodeURIComponent(shipmentKey)}`);

    if (requestId !== rapid27DetailRequestId) {
      return;
    }

    renderRapid27ShipmentDetail(data);
    appendLog(`Embarque 27/Rapid cargado: ${data.shipment.fecha_embarque || data.shipment.emb}`, "success");
  } catch (error) {
    if (requestId === rapid27DetailRequestId) {
      setText("rapid27ShipmentInfo", error.message || "No se pudo cargar el embarque");
      tbody.innerHTML = "";
      addEmptyTableRow(tbody, error.message, 7);
      appendLog(error.message || "No se pudo cargar el embarque 27/Rapid", "error");
    }
  } finally {
    if (requestId === rapid27DetailRequestId) {
      section.removeAttribute("aria-busy");
      setDetailToolsLoading("rapid27OrdersTable", false);
      refreshTableFilter("rapid27OrdersTable");
    }
  }
}

function renderRapid27ModalTracking(order) {
  const status = getElement("rapid27ModalTrackingStatus");
  const summary = getElement("rapid27ModalTrackingSummary");
  const matches = getElement("rapid27ModalTrackingMatches");
  const pending = Math.max(0, Number(order.outputs || 0) - Number(order.print_matched_outputs || 0) - Number(order.sublimation_matched_outputs || 0));

  if (status) {
    const label = formatRapid27Status(order.operational_status);
    status.textContent = label;
    status.className = "department-badge";
    status.dataset.department = getRapid27Department(label);
  }

  if (summary) {
    summary.textContent = [
      `${formatNumber(order.outputs)} outputs`,
      `${formatNumber(order.files_ready)} archivos listos`,
      `${formatNumber(order.print_matched_outputs)} bajados a Sublimado`,
      `${formatNumber(order.sublimation_matched_outputs)} en Almacen`
    ].join(" | ");
  }

  if (!matches) {
    return;
  }

  matches.textContent = "";
  [
    ["diseno", "Impresion", pending, "Sin coincidencia activa en Sublimado"],
    ["sublimado", "Sublimado", order.print_matched_outputs, "Coincidencia en reporte de impresion"],
    ["almacen", "Almacen", order.sublimation_matched_outputs, "Liberado a linea"]
  ].filter(([, , count]) => Number(count || 0) > 0)
    .forEach(([department, titleText, count, detailText]) => {
      const item = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("span");

      item.className = "tracking-match";
      item.dataset.department = department;
      title.textContent = `${titleText}: ${formatNumber(count)}`;
      detail.textContent = detailText;
      item.append(title, detail);
      matches.appendChild(item);
    });
}

function renderRapid27OrderModal(data) {
  const { order, outputs } = data;
  const tbody = getElement("rapid27PiecesTable");
  const estadoLabel = formatRapid27Status(order.operational_status);

  setText("rapid27ModalTitle", order.nombre_pedido || order.roster || "27 Sports / Rapid");
  setText("rapid27ModalCliente", order.cliente || "N/D");
  setText("rapid27ModalEmb", order.fecha_embarque || order.emb || "N/D");
  setText("rapid27ModalRoster", order.roster || "N/D");
  setText("rapid27ModalPedido", order.nombre_pedido || "Sin nombre");
  setText("rapid27ModalPiezas", formatNumber(order.pieces || order.listed_pieces));
  setText("rapid27ModalEstado", estadoLabel);
  getElement("rapid27ModalEstado").className = "department-badge";
  getElement("rapid27ModalEstado").dataset.department = getRapid27Department(estadoLabel);
  renderRapid27ModalTracking(order);

  tbody.innerHTML = "";

  if (!outputs.length) {
    addEmptyTableRow(tbody, "Este pedido no tiene piezas de roster para el embarque.", 9);
  }

  outputs.forEach(output => {
    const row = document.createElement("tr");
    const player = [output.first_name, output.last_name].filter(Boolean).join(" ");

    addCell(row, output.wo || "");
    addCell(row, output.style_output || output.style_base || output.style_roster || "");
    addCell(row, output.subdesign || output.color_or_descriptor || "");
    addCell(row, output.size || "");
    addCell(row, player);
    addCell(row, output.player_number || "");
    addCell(row, formatNumber(output.qty));
    addDepartmentStatusCell(row, formatRapid27Status(output.file_status));
    addRapid27StatusCell(row, output.computed_tracking_status);
    tbody.appendChild(row);
  });
}

async function showRapid27OrderModal(orderId, shipmentKey = rapid27ActiveShipmentKey) {
  const modal = getElement("rapid27OrderModal");
  const tbody = getElement("rapid27PiecesTable");
  const url = new URL(`/api/optimizador/rapid27/orders/${encodeURIComponent(orderId)}`, window.location.origin);

  if (shipmentKey) {
    url.searchParams.set("shipment_key", shipmentKey);
  }

  setText("rapid27ModalTitle", "Cargando pedido...");
  setText("rapid27ModalCliente", "");
  setText("rapid27ModalEmb", "");
  setText("rapid27ModalRoster", "");
  setText("rapid27ModalPedido", "");
  setText("rapid27ModalPiezas", "");
  setText("rapid27ModalEstado", "");
  setText("rapid27ModalTrackingStatus", "Consultando");
  setText("rapid27ModalTrackingSummary", "Consultando fuentes de producción...");
  getElement("rapid27ModalTrackingMatches").textContent = "";
  tbody.innerHTML = "";
  addLoadingTableRow(tbody, "Cargando piezas del pedido...", 9);
  modal.showModal();

  try {
    const data = await getJSON(`${url.pathname}${url.search}`);
    renderRapid27OrderModal(data);
    appendLog(`Pedido 27/Rapid cargado: ${data.order.roster || orderId}`, "success");
  } catch (error) {
    setText("rapid27ModalTitle", "No se pudo cargar el pedido");
    tbody.innerHTML = "";
    addEmptyTableRow(tbody, error.message || "No se pudo cargar el pedido.", 9);
    appendLog(error.message || "No se pudo cargar el pedido 27/Rapid", "error");
  }
}

async function loadRapid27Data() {
  const tbody = getElement("rapid27Table");

  tbody.innerHTML = "";
  addLoadingTableRow(tbody, "Cargando embarques 27/Rapid...", 9);

  const [summary, shipmentResponse] = await Promise.all([
    getJSON("/api/optimizador/rapid27/summary"),
    getJSON("/api/optimizador/rapid27/shipments")
  ]);

  rapid27ShipmentsCache = shipmentResponse.shipments || [];
  const dashboardMonthInput = getElement("rapid27DashboardMonthFilter");

  if (dashboardMonthInput && !dashboardMonthInput.value) {
    dashboardMonthInput.value = getInitialRapid27Month();
  }

  populateRapid27ClientFilter(rapid27ShipmentsCache);
  renderRapid27Summary(summary);
  renderRapid27DashboardPeriod(dashboardMonthInput?.value || getInitialRapid27Month());
  renderRapid27Shipments();
  appendLog(`27/Rapid conectado: ${formatNumber(shipmentResponse.total)} embarques`, "success");
}

// Carga CEP Registry y el conteo de tablas SQLite conocidas.
async function loadRegistry() {
  const registry = await getJSON("/api/dashboard/registry");
  const tables = await getJSON("/api/dashboard/tables");
  const registryTbody = getElement("registryTable");
  const tablesTbody = getElement("tablesTable");

  registryTbody.innerHTML = "";
  tablesTbody.innerHTML = "";

  registry.forEach(item => {
    const row = document.createElement("tr");
    addCell(row, item.source_app);
    addCell(row, item.runs_table);
    addCell(row, item.app_version || "");
    addCell(row, item.updated_at || "");
    registryTbody.appendChild(row);
  });

  tables.forEach(table => {
    const row = document.createElement("tr");
    addCell(row, table.name);
    addCell(row, formatNumber(table.rows));
    tablesTbody.appendChild(row);
  });

  updateSortIndicators("registryTable");
  updateSortIndicators("tablesTable");
  appendLog(`BD verificada: ${tables.length} tablas del sistema RMC`, "success");
}

async function loadGitCommits() {
  const toolFilter = getElement("gitCommitToolFilter");
  const tbody = getElement("gitCommitsTable");
  const count = getElement("gitCommitsCount");

  if (!tbody) {
    return;
  }

  const params = new URLSearchParams({ limit: "100" });

  if (toolFilter?.value) {
    params.set("tool_key", toolFilter.value);
  }

  const data = await getJSON(`/api/git-commits?${params.toString()}`);
  tbody.innerHTML = "";

  if (!data.commits?.length) {
    addEmptyTableRow(tbody, "No hay commits importados en rmc_git_commits.", 9);
  }

  (data.commits || []).forEach(commit => {
    const row = document.createElement("tr");
    addCell(row, commit.tool_name || commit.tool_key || "");
    addCell(row, commit.commit_date || "");
    addCell(row, commit.short_hash || "");
    addCell(row, commit.commit_subject || "");
    addCell(row, commit.author_name || "");
    addCell(row, commit.branch_name || "");
    addCell(row, formatNumber(commit.files_changed));
    addCell(row, formatNumber(commit.insertions));
    addCell(row, formatNumber(commit.deletions));
    tbody.appendChild(row);
  });

  if (count) {
    count.textContent = `${formatNumber(data.total || 0)} registros`;
  }

  refreshTableFilter("gitCommitsTable");
  updateSortIndicators("gitCommitsTable");
  appendLog(`Historial de desarrollo: ${formatNumber(data.commits?.length || 0)} commits cargados`, "success");
}

function getOpNikeVariantForm() {
  return getElement("opNikeVariantForm");
}

function getOpNikeFamilyForm() {
  return getElement("opNikeFamilyForm");
}

function setFormValues(form, row = {}) {
  if (!form) {
    return;
  }

  Array.from(form.elements).forEach(control => {
    if (!control.name) {
      return;
    }

    if (control.type === "checkbox") {
      control.checked = Number(row[control.name] ?? 0) === 1;
      return;
    }

    control.value = row[control.name] ?? "";
  });
}

function collectFormPayload(form) {
  return Array.from(form.elements).reduce((payload, control) => {
    if (!control.name || control.disabled || control.type === "hidden" && control.name === "original_style_family") {
      return payload;
    }

    payload[control.name] = control.type === "checkbox"
      ? (control.checked ? 1 : 0)
      : control.value.trim();

    return payload;
  }, {});
}

function setFormControlValue(form, name, value) {
  const control = form?.elements?.[name];

  if (!control) {
    return;
  }

  if (control.type === "checkbox") {
    control.checked = Number(value ?? 0) === 1;
    return;
  }

  control.value = value ?? "";
}

function patchFormValues(form, values = {}) {
  Object.entries(values).forEach(([name, value]) => setFormControlValue(form, name, value));
}

function normalizeAliasList(value) {
  const seen = new Set();

  return String(value || "")
    .split(/[;,\n|]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .filter(item => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

function buildOpNikeAliasSuggestions(payload = {}) {
  return normalizeAliasList([
    payload.aliases,
    payload.team_market,
    payload.team_mascot,
    payload.team_name,
    payload.file_team_name,
    payload.design_code,
    payload.design_name,
    payload.variant_code,
    payload.variant_name
  ].filter(Boolean).join("; "));
}

function clearOpNikeFieldHighlights(form = getOpNikeVariantForm()) {
  form?.querySelectorAll(".catalog-field-missing").forEach(label => {
    label.classList.remove("catalog-field-missing");
  });
}

function highlightOpNikeMissingFields(missingFields = []) {
  const form = getOpNikeVariantForm();

  clearOpNikeFieldHighlights(form);
  missingFields.forEach(field => {
    const control = form?.elements?.[field];
    const label = control?.closest?.("label");

    label?.classList.add("catalog-field-missing");
  });
}

function updateOpNikeCaptureSummary(message = "") {
  const form = getOpNikeVariantForm();
  const summary = getElement("opNikeCaptureSummary");

  if (!form || !summary) {
    return;
  }

  const payload = collectFormPayload(form);
  const parts = [];

  if (payload.variant_code || payload.variant_name) {
    parts.push(`${payload.variant_code || "sin code"} · ${payload.variant_name || "sin nombre"}`);
  }

  if (payload.opnike_style_scope) {
    parts.push(`styles ${payload.opnike_style_scope}`);
  }

  if (payload.opnike_resolution_strategy) {
    parts.push(payload.opnike_resolution_strategy);
  }

  summary.textContent = message || parts.join(" | ") || "Elige una plantilla, completa identidad/equipo y valida antes de activar.";
}

function renderOpNikeCatalogHelpers() {
  const familyList = getElement("opNikeStyleFamiliesDatalist");
  const ligaList = getElement("opNikeLigaDatalist");

  if (familyList) {
    familyList.innerHTML = "";
    opNikeCatalogData.families.forEach(family => {
      const option = document.createElement("option");

      option.value = family.style_family || "";
      option.label = [family.liga, family.line_name, family.product_folder].filter(Boolean).join(" · ");
      familyList.appendChild(option);
    });
  }

  if (ligaList) {
    ligaList.innerHTML = "";
    Array.from(new Set(opNikeCatalogData.families.map(family => family.liga).filter(Boolean))).sort().forEach(liga => {
      const option = document.createElement("option");

      option.value = liga;
      ligaList.appendChild(option);
    });
  }
}

function getVariantIdentity(variant) {
  return [
    variant.team_market,
    variant.team_mascot,
    variant.design_code,
    variant.design_name
  ].filter(Boolean).join(" | ") || variant.aliases || "Sin equipo/diseño";
}

function getRuleStatusDepartment(status) {
  if (status === "active") return "almacen";
  if (status === "shadow") return "sublimado";
  if (status === "inactive") return "costura";
  return "default";
}

function getFilePreviewText(file) {
  if (!file) {
    return "Sin preview de archivo";
  }

  if (file.status === "found_expected") return "Plantilla final encontrada";
  if (file.status === "found_candidate") return "Candidato final encontrado";
  if (file.status === "source_or_roll_file_rejected") return "Archivo fuente/ROLLO rechazado";
  if (file.status === "folder_not_found") return "Carpeta no existe";
  return "No existe plantilla final";
}

function markOpNikeValidationStale() {
  opNikeLastValidation = null;
  const activateButton = getElement("opNikeActivateRule");
  const badge = getElement("opNikeValidationBadge");

  if (activateButton) {
    activateButton.disabled = true;
  }

  if (badge) {
    badge.textContent = "Pendiente";
    badge.dataset.department = "default";
  }

  clearOpNikeFieldHighlights();
  updateOpNikeCaptureSummary();
}

function renderOpNikeValidation(result) {
  const validation = result?.validation || {};
  const preview = result?.preview || {};
  const missing = getElement("opNikeMissingFields");
  const previewContainer = getElement("opNikePreview");
  const badge = getElement("opNikeValidationBadge");
  const activateButton = getElement("opNikeActivateRule");
  const canActivate = Boolean(validation.canActivate);

  opNikeLastValidation = result;
  highlightOpNikeMissingFields(validation.missingFields || []);
  updateOpNikeCaptureSummary(
    canActivate
      ? "Regla completa: ya puede guardarse/activarse cuando corresponda."
      : `Faltan ${formatNumber(validation.missingFields?.length || 0)} campo(s) para activar.`
  );

  if (badge) {
    badge.textContent = canActivate ? "Completa" : "Incompleta";
    badge.dataset.department = canActivate ? "almacen" : "costura";
  }

  if (activateButton) {
    activateButton.disabled = !canActivate || !opNikeSelectedVariantId;
  }

  if (missing) {
    missing.textContent = "";

    if (validation.missingFields?.length) {
      validation.missingFields.forEach(field => {
        const chip = document.createElement("span");
        chip.className = "catalog-chip catalog-chip-missing";
        chip.textContent = field;
        missing.appendChild(chip);
      });
    } else {
      const chip = document.createElement("span");
      chip.className = "catalog-chip catalog-chip-ok";
      chip.textContent = "Sin campos faltantes";
      missing.appendChild(chip);
    }

    (validation.warnings || []).forEach(warning => {
      const chip = document.createElement("span");
      chip.className = "catalog-chip catalog-chip-warning";
      chip.textContent = warning;
      missing.appendChild(chip);
    });
  }

  if (previewContainer) {
    const tokens = preview.tokens || {};
    const tokenText = Object.entries(tokens)
      .filter(([, value]) => String(value || "").trim())
      .map(([key, value]) => `${key}=${value}`)
      .join(" | ");

    previewContainer.innerHTML = "";

    [
      ["Ruta esperada", preview.expectedTemplatePath || "Sin ruta calculada"],
      ["Nombre final", preview.outputName || "Sin nombre calculado"],
      ["Archivo", `${getFilePreviewText(preview.file)}${preview.file?.path ? ` | ${preview.file.path}` : ""}`],
      ["Tokens usados", tokenText || "Sin tokens"]
    ].forEach(([label, value]) => {
      const item = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("span");

      title.textContent = label;
      detail.textContent = value;
      item.append(title, detail);
      previewContainer.appendChild(item);
    });
  }
}

function renderOpNikeVariants() {
  const tbody = getElement("opNikeVariantsTable");

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  if (!opNikeCatalogData.variants.length) {
    addEmptyTableRow(tbody, "Sin variantes Op-Nike registradas.", 6);
  }

  opNikeCatalogData.variants.forEach(variant => {
    const row = document.createElement("tr");
    const statusCell = document.createElement("td");
    const statusBadge = makeDepartmentBadge(variant.opnike_rule_status || "draft");
    const validationMessage = variant.opnike_validation_message || "Pendiente";

    row.dataset.variantId = variant.id;
    row.classList.toggle("selected-row", Number(variant.id) === Number(opNikeSelectedVariantId));
    statusBadge.dataset.department = getRuleStatusDepartment(variant.opnike_rule_status);
    statusCell.dataset.filterValue = variant.opnike_rule_status || "draft";
    statusCell.appendChild(statusBadge);

    addCell(row, variant.id);
    addCell(row, `${variant.variant_code || ""} | ${variant.variant_name || ""}`);
    addCell(row, getVariantIdentity(variant));
    row.appendChild(statusCell);
    addCell(row, variant.opnike_style_scope || "");
    addCell(row, validationMessage);

    row.addEventListener("click", () => selectOpNikeVariant(variant.id));
    tbody.appendChild(row);
  });

  refreshTableFilter("opNikeVariantsTable");
  updateSortIndicators("opNikeVariantsTable");
}

function renderOpNikeFamilies() {
  const tbody = getElement("opNikeFamiliesTable");

  if (!tbody) {
    return;
  }

  tbody.innerHTML = "";

  if (!opNikeCatalogData.families.length) {
    addEmptyTableRow(tbody, "Sin familias de style registradas.", 6);
  }

  opNikeCatalogData.families.forEach(family => {
    const row = document.createElement("tr");

    row.dataset.styleFamily = family.style_family;
    row.classList.toggle("selected-row", family.style_family === opNikeSelectedFamilyKey);
    addCell(row, family.style_family);
    addCell(row, family.liga);
    addCell(row, family.line_name);
    addCell(row, family.audience);
    addCell(row, family.product_folder);
    addCell(row, Number(family.is_active) === 1 ? "Si" : "No");
    row.addEventListener("click", () => selectOpNikeFamily(family.style_family));
    tbody.appendChild(row);
  });

  updateSortIndicators("opNikeFamiliesTable");
}

function applyOpNikeVariantPreset() {
  const form = getOpNikeVariantForm();
  const select = getElement("opNikeVariantPreset");
  const preset = opNikeVariantPresets[select?.value || ""];

  if (!form || !preset) {
    appendLog("Selecciona una plantilla de regla Op-Nike", "warning");
    return;
  }

  patchFormValues(form, preset.values);
  markOpNikeValidationStale();
  updateOpNikeCaptureSummary(`Plantilla aplicada: ${preset.label}. Completa los datos propios de la variante.`);
  appendLog(`Plantilla Op-Nike aplicada: ${preset.label}`, "info");
}

function duplicateOpNikeSelectedVariant() {
  const form = getOpNikeVariantForm();

  if (!form || !opNikeSelectedVariantId) {
    appendLog("Selecciona una variante existente para duplicarla", "warning");
    return;
  }

  const payload = collectFormPayload(form);
  opNikeDuplicateClearFields.forEach(field => {
    payload[field] = "";
  });
  payload.is_active = 1;
  payload.opnike_enabled = 0;
  payload.opnike_rule_status = "draft";

  opNikeSelectedVariantId = null;
  setText("opNikeVariantFormTitle", "Nueva variante desde copia");
  setFormValues(form, payload);
  clearOpNikeFieldHighlights(form);
  markOpNikeValidationStale();
  renderOpNikeVariants();
  updateOpNikeCaptureSummary("Copia lista: captura code, nombre, equipo/diseño y aliases antes de guardar.");
  appendLog("Variante duplicada como borrador local; aun no se guarda en SQLite", "info");
}

function suggestOpNikeAliases() {
  const form = getOpNikeVariantForm();

  if (!form) {
    return;
  }

  const payload = collectFormPayload(form);
  const aliases = buildOpNikeAliasSuggestions(payload).join("; ");

  setFormControlValue(form, "aliases", aliases);
  markOpNikeValidationStale();
  updateOpNikeCaptureSummary("Aliases sugeridos a partir de equipo, diseño y variante.");
}

function normalizeOpNikeAliases() {
  const form = getOpNikeVariantForm();
  const aliases = normalizeAliasList(form?.elements?.aliases?.value).join("; ");

  setFormControlValue(form, "aliases", aliases);
  markOpNikeValidationStale();
  updateOpNikeCaptureSummary("Aliases ordenados y sin duplicados.");
}

function selectOpNikeVariant(id) {
  const variant = opNikeCatalogData.variants.find(item => Number(item.id) === Number(id));
  const form = getOpNikeVariantForm();

  if (!variant || !form) {
    return;
  }

  opNikeSelectedVariantId = Number(variant.id);
  setText("opNikeVariantFormTitle", `Editando variante #${variant.id}`);
  setFormValues(form, variant);
  markOpNikeValidationStale();
  renderOpNikeVariants();
  validateOpNikeRule({ persist: true }).catch(error => {
    console.error(error);
    appendLog(error.message || "No se pudo validar la regla Op-Nike", "error");
  });
}

function resetOpNikeVariantForm() {
  const form = getOpNikeVariantForm();

  opNikeSelectedVariantId = null;
  setText("opNikeVariantFormTitle", "Nueva variante Op-Nike");
  form?.reset();
  setFormValues(form, {
    is_active: 1,
    opnike_enabled: 0,
    opnike_rule_status: "draft",
    opnike_fallback_search_mode: "style_and_size",
    opnike_resolution_strategy: "standard_team_version_folder"
  });
  markOpNikeValidationStale();
  renderOpNikeVariants();
}

function selectOpNikeFamily(styleFamily) {
  const family = opNikeCatalogData.families.find(item => item.style_family === styleFamily);
  const form = getOpNikeFamilyForm();

  if (!family || !form) {
    return;
  }

  opNikeSelectedFamilyKey = family.style_family;
  setFormValues(form, family);
  form.elements.original_style_family.value = family.style_family;
  renderOpNikeFamilies();
}

function resetOpNikeFamilyForm() {
  const form = getOpNikeFamilyForm();

  opNikeSelectedFamilyKey = "";
  form?.reset();
  setFormValues(form, {
    is_active: 1,
    garment_type: "jersey"
  });
  renderOpNikeFamilies();
}

async function loadOpNikeCatalog() {
  const data = await getJSON("/api/nike/catalog");

  opNikeCatalogData = {
    templateRoot: data.templateRoot || "",
    families: data.families || [],
    variants: data.variants || []
  };

  setText("opNikeCatalogRoot", `Raiz de plantillas: ${opNikeCatalogData.templateRoot}`);
  renderOpNikeCatalogHelpers();
  renderOpNikeVariants();
  renderOpNikeFamilies();

  if (!opNikeSelectedVariantId && opNikeCatalogData.variants[0]) {
    selectOpNikeVariant(opNikeCatalogData.variants[0].id);
  }

  if (!opNikeSelectedFamilyKey && opNikeCatalogData.families[0]) {
    selectOpNikeFamily(opNikeCatalogData.families[0].style_family);
  }

  appendLog(`Catalogo Op-Nike: ${formatNumber(opNikeCatalogData.variants.length)} variantes cargadas`, "success");
}

async function saveOpNikeVariant(options = {}) {
  const form = getOpNikeVariantForm();

  if (!form) {
    return null;
  }

  const payload = {
    ...collectFormPayload(form),
    ...(options.overrides || {})
  };
  const id = payload.id || opNikeSelectedVariantId;
  const url = id
    ? `/api/nike/catalog/variants/${encodeURIComponent(id)}`
    : "/api/nike/catalog/variants";
  const result = await sendJSON(url, {
    method: id ? "PUT" : "POST",
    body: payload
  });

  opNikeSelectedVariantId = Number(result.variant?.id || id);
  renderOpNikeValidation(result);
  await loadOpNikeCatalog();

  if (opNikeSelectedVariantId) {
    selectOpNikeVariant(opNikeSelectedVariantId);
  }

  if (!options.silent) {
    appendLog(`Variante Op-Nike guardada: ${payload.variant_code || ""}`, "success");
  }

  return result;
}

async function validateOpNikeRule(options = {}) {
  const form = getOpNikeVariantForm();

  if (!form) {
    return null;
  }

  const payload = collectFormPayload(form);
  const id = payload.id || opNikeSelectedVariantId;
  const url = id && options.persist
    ? `/api/nike/catalog/variants/${encodeURIComponent(id)}/validate`
    : "/api/nike/catalog/variants/validate";
  const result = await sendJSON(url, {
    method: "POST",
    body: payload
  });

  renderOpNikeValidation(result);
  appendLog(
    result.validation?.canActivate
      ? "Regla Op-Nike completa"
      : `Regla Op-Nike incompleta: ${(result.validation?.missingFields || []).join(", ")}`,
    result.validation?.canActivate ? "success" : "warning"
  );
  return result;
}

async function activateOpNikeRule() {
  const form = getOpNikeVariantForm();
  const id = form?.elements.id?.value || opNikeSelectedVariantId;

  if (!id || !opNikeLastValidation?.validation?.canActivate) {
    appendLog("Valida y guarda la regla antes de activar", "warning");
    return;
  }

  await saveOpNikeVariant({
    silent: true,
    overrides: {
      opnike_enabled: 1,
      opnike_rule_status: "shadow"
    }
  });

  const result = await sendJSON(`/api/nike/catalog/variants/${encodeURIComponent(id)}/activate`, {
    method: "POST",
    body: {}
  });

  opNikeSelectedVariantId = Number(result.variant?.id || id);
  renderOpNikeValidation(result);
  await loadOpNikeCatalog();
  appendLog(`Regla Op-Nike activada: #${id}`, "success");
}

async function saveOpNikeFamily() {
  const form = getOpNikeFamilyForm();

  if (!form) {
    return;
  }

  const payload = collectFormPayload(form);
  const originalKey = form.elements.original_style_family.value;
  const url = originalKey
    ? `/api/nike/catalog/families/${encodeURIComponent(originalKey)}`
    : "/api/nike/catalog/families";

  await sendJSON(url, {
    method: originalKey ? "PUT" : "POST",
    body: payload
  });

  opNikeSelectedFamilyKey = payload.style_family;
  await loadOpNikeCatalog();
  selectOpNikeFamily(opNikeSelectedFamilyKey);
  appendLog(`Familia Op-Nike guardada: ${payload.style_family}`, "success");
}

function loadViewData(viewId) {
  if (viewId === "rapid27-view" && !lazyViewLoads.rapid27) {
    lazyViewLoads.rapid27 = true;
    loadRapid27Data().catch(error => {
      lazyViewLoads.rapid27 = false;
      console.error(error);
      const tbody = getElement("rapid27Table");
      tbody.innerHTML = "";
      addEmptyTableRow(tbody, error.message || "No se pudo cargar 27/Rapid.", 9);
      refreshTableFilter("rapid27Table");
      appendLog(error.message || "No se pudo cargar 27/Rapid", "error");
    });
  }

  if (viewId === "opnike-catalog-view" && !lazyViewLoads.opNikeCatalog) {
    lazyViewLoads.opNikeCatalog = true;
    loadOpNikeCatalog().catch(error => {
      lazyViewLoads.opNikeCatalog = false;
      console.error(error);
      appendLog(error.message || "No se pudo cargar catalogo Op-Nike", "error");
    });
  }

  if (viewId === "registry-view" && !lazyViewLoads.registry) {
    lazyViewLoads.registry = true;
    loadRegistry().catch(error => {
      lazyViewLoads.registry = false;
      console.error(error);
      appendLog(error.message || "No se pudo cargar CEP Registry", "error");
    });
  }

  if (viewId === "git-history-view" && !lazyViewLoads.gitHistory) {
    lazyViewLoads.gitHistory = true;
    loadGitCommits().catch(error => {
      lazyViewLoads.gitHistory = false;
      console.error(error);
      appendLog(error.message || "No se pudo cargar historial de desarrollo", "error");
    });
  }
}

// Conecta los botones del sidebar con las vistas internas.
function bindNavigation() {
  document.querySelectorAll(".menu-item[data-view]").forEach(button => {
    button.addEventListener("click", () => {
      switchView(button.dataset.view);
    });
  });
}

// Conecta el drawer movil: boton hamburguesa, overlay y tecla Escape.
function bindSidebarControls() {
  const toggle = getElement("sidebarToggle");
  const overlay = getElement("sidebarOverlay");

  if (toggle) {
    toggle.addEventListener("click", () => {
      if (document.body.classList.contains("sidebar-open")) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  window.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });
}

function bindThemeControls() {
  const toggle = getElement("themeToggle");

  applyTheme(getStoredTheme());

  if (!toggle) {
    return;
  }

  toggle.addEventListener("change", () => {
    applyTheme(toggle.checked ? "light" : "dark", { persist: true, log: true });
  });
}

function bindAccessControls() {
  const modal = getElement("accessModal");
  const openButton = getElement("btnOpenAccessModal");
  const closeButton = getElement("btnCloseAccessModal");

  if (!modal || !openButton) {
    return;
  }

  openButton.addEventListener("click", () => {
    closeSidebar();
    modal.showModal();
    appendLog("Pantalla de acceso provisional abierta", "info");
  });

  closeButton?.addEventListener("click", () => modal.close());

  modal.querySelectorAll("[data-close-access]").forEach(button => {
    button.addEventListener("click", () => modal.close());
  });
}

function showOpNikePinModal() {
  const modal = getElement("opNikePinModal");
  const input = getElement("opNikePinInput");
  const message = getElement("opNikePinMessage");

  if (!modal) {
    return;
  }

  if (message) {
    message.textContent = "";
  }

  if (input) {
    input.value = "";
  }

  modal.showModal();
  window.setTimeout(() => input?.focus(), 0);
}

function bindOpNikePinControls() {
  const modal = getElement("opNikePinModal");
  const form = getElement("opNikePinForm");
  const input = getElement("opNikePinInput");
  const message = getElement("opNikePinMessage");
  const closeButton = getElement("btnCloseOpNikePinModal");

  if (!modal || !form || !input) {
    return;
  }

  function closePinModal() {
    modal.close();
    closeSidebar();
  }

  closeButton?.addEventListener("click", closePinModal);
  modal.querySelectorAll("[data-close-opnike-pin]").forEach(button => {
    button.addEventListener("click", closePinModal);
  });

  form.addEventListener("submit", event => {
    event.preventDefault();

    const pin = input.value.trim();

    if (!pin) {
      if (message) {
        message.textContent = "Ingresa el PIN.";
      }
      return;
    }

    sendJSON("/api/nike/catalog/unlock", {
      method: "POST",
      body: { pin }
    }).then(() => {
      setStoredOpNikePin(pin);
      modal.close();
      appendLog("Catalogo Op-Nike desbloqueado para esta sesion", "success");
      switchView("opnike-catalog-view");
    }).catch(error => {
      clearStoredOpNikePin();
      if (message) {
        message.textContent = error.message || "PIN invalido";
      }
      appendLog("PIN Op-Nike invalido", "warning");
    });
  });
}

// Conecta el log compacto: mostrar/ocultar y limpiar.
function bindLogControls() {
  const clearButton = getElement("btnClearLog");
  const toggleButton = getElement("btnToggleLog");
  const logContainer = getElement("log-container");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      getElement("terminal").innerHTML = "";
    });
  }

  if (toggleButton && logContainer) {
    toggleButton.addEventListener("click", () => {
      const isCollapsed = logContainer.classList.toggle("log-collapsed");
      toggleButton.textContent = isCollapsed ? "Mostrar" : "Ocultar";
    });
  }
}

// Conecta botones para ocultar paneles de detalle.
function bindDetailControls() {
  const hideNikeDetail = getElement("hideNikeDetail");
  const hideMockupDetail = getElement("hideMockupDetail");
  const hideRapid27Detail = getElement("hideRapid27Detail");

  if (hideNikeDetail) {
    hideNikeDetail.addEventListener("click", () => {
      getElement("detailSection").classList.add("hidden");
      appendLog("Detalle Nike oculto", "info");
    });
  }

  if (hideMockupDetail) {
    hideMockupDetail.addEventListener("click", () => {
      getElement("mockupDetailSection").classList.add("hidden");
      appendLog("Detalle MockupTool oculto", "info");
    });
  }

  if (hideRapid27Detail) {
    hideRapid27Detail.addEventListener("click", () => {
      getElement("rapid27DetailSection").classList.add("hidden");
      appendLog("Detalle 27/Rapid oculto", "info");
    });
  }
}

function bindRapid27Controls() {
  const clientFilter = getElement("rapid27ClientFilter");
  const monthFilter = getElement("rapid27MonthFilter");
  const monthAll = getElement("rapid27MonthAll");
  const tools = document.querySelector('.table-tools[data-filter-target="rapid27Table"]');

  clientFilter?.addEventListener("change", renderRapid27Shipments);
  monthFilter?.addEventListener("change", renderRapid27Shipments);
  monthAll?.addEventListener("click", () => {
    if (monthFilter) {
      monthFilter.value = "";
    }

    renderRapid27Shipments();
  });
  tools?.querySelector(".table-clear")?.addEventListener("click", () => {
    if (clientFilter) {
      clientFilter.value = "";
    }

    if (monthFilter) {
      monthFilter.value = "";
    }

    renderRapid27Shipments();
  });
}

function bindRapid27OrderModal() {
  const modal = getElement("rapid27OrderModal");
  const closeButton = getElement("closeRapid27OrderModal");

  if (!modal || !closeButton) {
    return;
  }

  closeButton.addEventListener("click", () => {
    modal.close();
  });
}

function bindGitCommitControls() {
  const toolFilter = getElement("gitCommitToolFilter");

  if (toolFilter) {
    toolFilter.addEventListener("change", () => {
      loadGitCommits().catch(error => {
        console.error(error);
        appendLog(error.message || "No se pudo cargar historial de desarrollo", "error");
      });
    });
  }
}

function bindOpNikeCatalogControls() {
  const variantForm = getOpNikeVariantForm();
  const familyForm = getOpNikeFamilyForm();

  getElement("opNikeRefreshCatalog")?.addEventListener("click", () => {
    loadOpNikeCatalog().catch(error => {
      console.error(error);
      appendLog(error.message || "No se pudo actualizar catalogo Op-Nike", "error");
    });
  });

  getElement("opNikeNewVariant")?.addEventListener("click", resetOpNikeVariantForm);
  getElement("opNikeNewFamily")?.addEventListener("click", resetOpNikeFamilyForm);
  getElement("opNikeApplyPreset")?.addEventListener("click", applyOpNikeVariantPreset);
  getElement("opNikeDuplicateVariant")?.addEventListener("click", duplicateOpNikeSelectedVariant);
  getElement("opNikeBuildAliases")?.addEventListener("click", suggestOpNikeAliases);
  getElement("opNikeNormalizeAliases")?.addEventListener("click", normalizeOpNikeAliases);

  getElement("opNikeSaveVariant")?.addEventListener("click", () => {
    saveOpNikeVariant().catch(error => {
      console.error(error);
      if (error.status === 401) {
        clearStoredOpNikePin();
        showOpNikePinModal();
      }
      renderOpNikeValidation(error.response || null);
      appendLog(error.message || "No se pudo guardar variante Op-Nike", "error");
    });
  });

  getElement("opNikeValidateRule")?.addEventListener("click", () => {
    validateOpNikeRule({ persist: Boolean(opNikeSelectedVariantId) }).catch(error => {
      console.error(error);
      if (error.status === 401) {
        clearStoredOpNikePin();
        showOpNikePinModal();
      }
      renderOpNikeValidation(error.response || null);
      appendLog(error.message || "No se pudo validar regla Op-Nike", "error");
    });
  });

  getElement("opNikeActivateRule")?.addEventListener("click", () => {
    activateOpNikeRule().catch(error => {
      console.error(error);
      if (error.status === 401) {
        clearStoredOpNikePin();
        showOpNikePinModal();
      }
      renderOpNikeValidation(error.response || null);
      appendLog(error.message || "No se pudo activar regla Op-Nike", "error");
    });
  });

  getElement("opNikeSaveFamily")?.addEventListener("click", () => {
    saveOpNikeFamily().catch(error => {
      console.error(error);
      if (error.status === 401) {
        clearStoredOpNikePin();
        showOpNikePinModal();
      }
      appendLog(error.message || "No se pudo guardar familia Op-Nike", "error");
    });
  });

  variantForm?.addEventListener("input", markOpNikeValidationStale);
  variantForm?.addEventListener("change", markOpNikeValidationStale);
  familyForm?.addEventListener("submit", event => event.preventDefault());
  variantForm?.addEventListener("submit", event => event.preventDefault());
}

function renderNikePrintSublimationTracking(data, loading = false) {
  const status = getElement("nikeItemPrintStatus");
  const summary = getElement("nikeItemPrintSummary");
  const matches = getElement("nikeItemPrintMatches");

  if (!status || !summary || !matches) {
    return;
  }

  matches.textContent = "";

  if (loading) {
    status.textContent = "Consultando";
    status.className = "department-badge";
    status.dataset.department = "default";
    summary.textContent = "Consultando fuentes de produccion...";
    return;
  }

  const state = data?.state || {
    status: "En proceso de impresion",
    detail: "Sin coincidencia en Sublimado"
  };
  const info = data?.summary || {};

  status.textContent = state.status;
  status.className = "department-badge";
  status.dataset.department = getDepartmentKey(`${state.stage || ""} ${state.status || ""} ${state.detail || ""}`);

  if (!data?.hasWorkOrder) {
    summary.textContent = "Sin WO disponible para cruzar con fuentes de produccion.";
    return;
  }

  if (!data?.hasPrintSublimationLog) {
    summary.textContent = "En proceso de impresion. No detectado todavia en fuentes de produccion.";
    return;
  }

  summary.textContent = [
    `WO: ${data.item?.wo || ""}`,
    `Cantidad reportada: ${formatNumber(info.totalReportedQuantity)}`,
    `Registros activos: ${formatNumber(info.activeCount)}`,
    `Almacen: ${formatNumber(info.sublimationOutputCount || 0)}`,
    `Parciales: ${formatNumber(info.partialCount)}`
  ].join(" | ");

  const activePrintMatches = (data.matches || []).filter(match => Number(match.is_active) === 1);
  const activeSublimationOutputs = (data.sublimation_outputs || []).filter(output => Number(output.is_active) === 1);
  const firstPrint = activePrintMatches[0] || (data.matches || [])[0];
  const firstOutput = activeSublimationOutputs[0] || (data.sublimation_outputs || [])[0];

  function appendTrackingStep(department, label, stateLabel, lines, active = false) {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");

    item.className = "tracking-step";
    item.dataset.department = department;
    item.dataset.active = String(active);
    title.textContent = `${label}: ${stateLabel}`;
    detail.textContent = lines.filter(Boolean).join(" | ");
    item.append(title, detail);
    matches.appendChild(item);
  }

  appendTrackingStep(
    "diseno",
    "Impresion",
    firstPrint ? "Detectado" : "Pendiente",
    firstPrint
      ? [
          `Fecha papel: ${firstPrint.fecha_impresion_papel || "N/D"}`,
          `Impresor: ${firstPrint.impresor || "N/D"}`,
          `Plotter: ${firstPrint.plotter_number || "N/D"}`
        ]
      : ["Sin registro activo en reporte de impresores"],
    Boolean(firstPrint)
  );

  appendTrackingStep(
    "sublimado",
    "Sublimado",
    firstPrint ? (Number(firstPrint.is_partial) === 1 ? "Parcial" : "Bajado") : "Pendiente",
    firstPrint
      ? [
          `Embarque: ${firstPrint.fecha_embarque || "N/D"}`,
          `Proceso: ${firstPrint.process || "N/D"}`,
          `Cantidad: ${formatNumber(firstPrint.order_quantity)}`
        ]
      : ["Sin bajada detectada desde impresion"],
    Boolean(firstPrint)
  );

  appendTrackingStep(
    "almacen",
    "Almacen",
    firstOutput ? "En almacen" : "Pendiente",
    firstOutput
      ? [
          `Fecha: ${firstOutput.fecha || "N/D"}`,
          `Hora: ${firstOutput.hora_sale_almacen || "N/D"}`,
          `Maquina: ${firstOutput.maquina || "N/D"}`,
          `PCS: ${formatNumber(firstOutput.pcs)}`
        ]
      : ["Sin salida registrada desde Sublimado"],
    Boolean(firstOutput)
  );

  if ((data.sublimation_outputs || []).length > 1) {
    const extra = document.createElement("div");
    extra.className = "tracking-match";
    extra.textContent = `Hay ${formatNumber(data.sublimation_outputs.length - 1)} registros adicionales de almacen.`;
    matches.appendChild(extra);
  }

  (data.matches || []).slice(0, 6).forEach(match => {
    const item = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    const sync = document.createElement("span");

    item.className = "tracking-match";
    title.textContent = [
      match.process || "Proceso sin dato",
      match.plotter_number ? `Plotter ${match.plotter_number}` : "",
      Number(match.is_partial) === 1 ? "Parcial" : ""
    ].filter(Boolean).join(" | ");
    detail.textContent = [
      `Style: ${match.style || "N/D"}`,
      `Roster: ${match.roster || "N/D"}`,
      `Cantidad: ${formatNumber(match.order_quantity)}`,
      `Imp. papel: ${match.num_impresion_papel || "N/D"}`,
      `Fecha: ${match.fecha_impresion_papel || "N/D"}`,
      `Embarque: ${match.fecha_embarque || "N/D"}`
    ].join(" | ");
    sync.textContent = [
      `Disenador: ${match.disenador || "N/D"}`,
      `Impresor: ${match.impresor || "N/D"}`,
      `Ultima sync: ${match.last_seen_at_display || "N/D"}`
    ].join(" | ");

    item.append(title, detail, sync);
    matches.appendChild(item);
  });

  if ((data.matches || []).length > 6) {
    const extra = document.createElement("div");
    extra.className = "tracking-match";
    extra.textContent = `Hay ${formatNumber(data.matches.length - 6)} coincidencias adicionales.`;
    matches.appendChild(extra);
  }
}

async function loadNikePrintSublimationTracking(itemId) {
  if (!itemId) {
    renderNikePrintSublimationTracking({
      hasWorkOrder: false,
      hasPrintSublimationLog: false
    });
    return;
  }

  renderNikePrintSublimationTracking(null, true);

  try {
    const data = await getJSON(`/api/nike/items/${encodeURIComponent(itemId)}/print-sublimation`);
    renderNikePrintSublimationTracking(data);
  } catch (error) {
    console.error(error);
    renderNikePrintSublimationTracking({
      hasWorkOrder: true,
      hasPrintSublimationLog: false,
      state: {
        status: "Sin datos de tracking",
        detail: "No se pudo consultar impresion/sublimado"
      },
      summary: {},
      matches: []
    });
    appendLog(error.message || "No se pudo consultar impresion/sublimado", "error");
  }
}

function showNikeItemModal(item) {
  const modal = getElement("nikeItemModal");
  const roster = getElement("nikeItemRoster");
  const wo = getElement("nikeItemWo");
  const equipo = getElement("nikeItemEquipo");
  const variante = getElement("nikeItemVariante");
  const style = getElement("nikeItemStyle");
  const size = getElement("nikeItemSize");
  const numero = getElement("nikeItemNumero");
  const tool = getElement("nikeItemTool");
  const runId = getElement("nikeItemRunId");
  const status = getElement("nikeItemStatus");
  const maqueta = getElement("nikeItemMaqueta");
  const maquetaDownload = getElement("nikeItemMaquetaDownload");
  const maquetaPath = getElement("nikeItemMaquetaPath");
  const plantilla = getElement("nikeItemPlantilla");
  const plantillaDownload = getElement("nikeItemPlantillaDownload");
  const plantillaPath = getElement("nikeItemPlantillaPath");
  const excel = getElement("nikeItemExcel");
  const excelPreview = getElement("nikeItemExcelPreview");
  const excelCopy = getElement("nikeItemExcelCopy");
  const excelPath = getElement("nikeItemExcelPath");

  if (!modal || !roster || !wo || !equipo || !variante || !style || !size || !numero || !tool || !runId || !status || !maqueta || !maquetaDownload || !plantilla || !plantillaDownload || !excel || !excelPreview || !excelCopy) {
    return;
  }

  const operationalState = getNikeOperationalState(item);
  const pdfFile = item.pdfFile || {
    originalPath: item.plantilla_path || item.path || "",
    resolvedPath: item.plantilla_resolved_path || "",
    exists: Boolean(item.plantilla_resolved_path),
    status: item.plantilla_file_status || "found_original"
  };
  const mockupFile = item.mockupFile || {
    originalPath: item.maqueta_path || "",
    resolvedPath: item.maqueta_resolved_path || "",
    exists: Boolean(item.maqueta_resolved_path),
    status: item.maqueta_file_status || "found_original"
  };
  roster.textContent = item.roster || "N/D";
  wo.textContent = item.wo || "N/D";
  equipo.textContent = getTeamDisplay(item) || "N/D";
  variante.textContent = item.variante || "N/D";
  style.textContent = item.style || "N/D";
  size.textContent = item.talla || "N/D";
  numero.textContent = item.numero || "N/D";
  tool.textContent = item.herramienta || "Sin herramienta";
  runId.textContent = item.run_id || "Sin run";
  status.textContent = operationalState.status;
  status.className = "department-badge";
  status.dataset.department = getDepartmentKey(
    `${operationalState.stage || ""} ${operationalState.status || ""} ${operationalState.detail || ""}`
  );

  const paths = {
    maqueta: mockupFile.resolvedPath || mockupFile.originalPath || item.maqueta_path || "",
    plantilla: pdfFile.resolvedPath || pdfFile.originalPath || item.plantilla_path || item.path || "",
    excel: item.excel_path || item.roster_path || ""
  };

  const hasMultipleMockups = mockupFile.status === "multiple_mockups";
  const hasMaqueta = Boolean(item.id && hasResolvedFile(mockupFile) && !hasMultipleMockups);
  maqueta.href = hasMaqueta
    ? `/api/files/nike/${encodeURIComponent(item.id)}/maqueta/view`
    : "#";
  maqueta.target = hasMaqueta ? "_blank" : "";
  maquetaDownload.href = hasMaqueta
    ? `/api/files/nike/${encodeURIComponent(item.id)}/maqueta/download`
    : "#";
  const hasPlantilla = Boolean(item.id && hasResolvedFile(pdfFile));
  plantilla.href = hasPlantilla
    ? `/api/files/nike/${encodeURIComponent(item.id)}/plantilla/view`
    : "#";
  plantilla.target = hasPlantilla ? "_blank" : "";
  plantillaDownload.href = hasPlantilla
    ? `/api/files/nike/${encodeURIComponent(item.id)}/plantilla/download`
    : "#";
  const hasExcelDownload = Boolean(item.id);
  const hasExcelPath = Boolean(paths.excel);
  excel.href = hasExcelDownload
    ? `/api/files/nike/${encodeURIComponent(item.id)}/excel/download`
    : "#";
  excelPreview.href = hasExcelDownload
    ? `/api/files/nike/${encodeURIComponent(item.id)}/excel/preview`
    : "#";
  maqueta.dataset.path = paths.maqueta;
  maquetaDownload.dataset.path = paths.maqueta;
  plantilla.dataset.path = paths.plantilla;
  plantillaDownload.dataset.path = paths.plantilla;
  excel.dataset.path = paths.excel;
  excelPreview.dataset.path = paths.excel;
  excelCopy.dataset.path = paths.excel;

  maqueta.setAttribute("aria-disabled", String(!hasMaqueta));
  maquetaDownload.setAttribute("aria-disabled", String(!hasMaqueta));
  maquetaDownload.textContent = hasMaqueta ? "Descargar" : "No disponible";
  plantilla.setAttribute("aria-disabled", String(!hasPlantilla));
  plantillaDownload.setAttribute("aria-disabled", String(!hasPlantilla));
  plantillaDownload.textContent = hasPlantilla ? "Descargar" : "No disponible";
  excel.setAttribute("aria-disabled", String(!hasExcelDownload));
  excelPreview.setAttribute("aria-disabled", String(!hasExcelDownload));
  excelCopy.setAttribute("aria-disabled", String(!hasExcelPath));
  excelCopy.textContent = hasExcelPath ? "Copiar ruta" : "Sin ruta";

  if (maquetaPath) maquetaPath.textContent = formatFileStatusLine(mockupFile, "mockup");
  if (plantillaPath) plantillaPath.textContent = formatFileStatusLine(pdfFile, "pdf");
  if (excelPath) excelPath.textContent = paths.excel || "Excel disponible por backend";

  renderNikeMockupOptions(item);

  renderNikePrintSublimationTracking({
    item,
    hasWorkOrder: Boolean(item.wo),
    hasPrintSublimationLog: Boolean(item.print_sublimation?.state?.hasPrintSublimationLog),
    summary: item.print_sublimation?.summary || {},
    state: operationalState,
    matches: []
  });
  loadNikePrintSublimationTracking(item.id);

  modal.showModal();
}

function bindNikeItemModal() {
  const modal = getElement("nikeItemModal");
  const closeButton = getElement("closeNikeItemModal");
  const maquetaLink = getElement("nikeItemMaqueta");
  const maquetaDownload = getElement("nikeItemMaquetaDownload");
  const plantillaLink = getElement("nikeItemPlantilla");
  const plantillaDownload = getElement("nikeItemPlantillaDownload");
  const excelLink = getElement("nikeItemExcel");
  const excelPreview = getElement("nikeItemExcelPreview");
  const excelCopy = getElement("nikeItemExcelCopy");

  if (!modal || !closeButton) {
    return;
  }

  closeButton.addEventListener("click", () => {
    modal.close();
  });

  [maquetaLink, maquetaDownload, plantillaLink, plantillaDownload, excelLink, excelPreview].forEach(link => {
    if (!link) return;
    link.addEventListener("click", event => {
      if (link.getAttribute("aria-disabled") !== "true") {
        if (link === excelPreview) {
          event.preventDefault();
          appendLog("Preview Excel Nike solicitado", "success");
          loadExcelPreview(link.href);
          return;
        }

        if (link === excelLink) {
          event.preventDefault();
          appendLog(
            link.dataset.path
              ? `Excel Nike solicitado: ${link.dataset.path}`
              : "Excel Nike solicitado por backend",
            "success"
          );
          downloadLinkedFile(link, "RMCOp_Nike_item.xlsx");
          return;
        }

        appendLog(
          `Archivo solicitado: ${link.dataset.path}`,
          "success"
        );
        return;
      }

      event.preventDefault();
      if (link === excelLink || link === excelPreview) {
        appendLog("Sin Excel vinculado", "info");
        return;
      }

      appendLog(
        link.dataset.path
          ? `Archivo pendiente de habilitar: ${link.dataset.path}`
          : "Ruta exacta pendiente de implementar",
        "info"
      );
    });
  });

  if (excelCopy) {
    excelCopy.addEventListener("click", event => {
      event.preventDefault();

      if (excelCopy.getAttribute("aria-disabled") === "true") {
        appendLog("Sin Excel vinculado para copiar", "info");
        return;
      }

      copyResourcePath(excelCopy.dataset.path, "Excel Nike");
    });
  }
}

async function copyResourcePath(pathValue, label) {
  if (!pathValue) {
    appendLog(`Sin ruta para copiar: ${label}`, "info");
    return;
  }

  try {
    await navigator.clipboard.writeText(pathValue);
    appendLog(`Ruta copiada: ${label}`, "success");
  } catch (error) {
    console.error(error);
    appendLog("No se pudo copiar la ruta al portapapeles", "error");
  }
}

function getDownloadFileName(response, fallback) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);

  if (encodedMatch) {
    return decodeURIComponent(encodedMatch[1]);
  }

  return plainMatch?.[1] || fallback;
}

async function downloadLinkedFile(link, fallbackName) {
  try {
    const response = await fetch(link.href);

    if (!response.ok) {
      let message = "No se pudo descargar el Excel vinculado";

      try {
        const body = await response.json();
        message = body.message || body.error || message;
      } catch (error) {
        message = response.statusText || message;
      }

      appendLog(message, "error");
      alert(message);
      return;
    }

    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = getDownloadFileName(response, fallbackName);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error(error);
    appendLog("No se pudo descargar el Excel vinculado", "error");
    alert("No se pudo descargar el Excel vinculado");
  }
}

function ensureExcelPreviewModal() {
  let modal = getElement("excelPreviewModal");

  if (modal) {
    return modal;
  }

  modal = document.createElement("dialog");
  modal.id = "excelPreviewModal";
  modal.className = "modal excel-preview-modal";

  const header = document.createElement("div");
  header.className = "modal-header";

  const titleWrap = document.createElement("div");
  const eyebrow = document.createElement("span");
  const title = document.createElement("h3");
  eyebrow.className = "modal-eyebrow";
  eyebrow.textContent = "Preview Excel";
  title.id = "excelPreviewTitle";
  title.textContent = "Excel";
  titleWrap.append(eyebrow, title);

  const closeButton = document.createElement("button");
  closeButton.id = "closeExcelPreviewModal";
  closeButton.className = "secondary-button";
  closeButton.type = "button";
  closeButton.textContent = "Cerrar";
  closeButton.addEventListener("click", () => modal.close());
  header.append(titleWrap, closeButton);

  const meta = document.createElement("p");
  meta.id = "excelPreviewMeta";
  meta.className = "excel-preview-meta";
  meta.textContent = "Cargando...";

  const wrap = document.createElement("div");
  wrap.className = "excel-preview-wrap";

  const table = document.createElement("table");
  table.id = "excelPreviewTable";
  table.className = "excel-preview-table";
  wrap.appendChild(table);

  modal.append(header, meta, wrap);
  document.body.appendChild(modal);

  return modal;
}

function renderExcelPreviewTable(rows) {
  const table = getElement("excelPreviewTable");

  if (!table) {
    return;
  }

  table.textContent = "";

  if (!rows.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.textContent = "La hoja no tiene datos para mostrar";
    row.appendChild(cell);
    table.appendChild(row);
    return;
  }

  const fragment = document.createDocumentFragment();

  rows.forEach(rowValues => {
    const row = document.createElement("tr");

    rowValues.forEach(value => {
      const cell = document.createElement("td");
      cell.textContent = value ?? "";
      row.appendChild(cell);
    });

    fragment.appendChild(row);
  });

  table.appendChild(fragment);
}

async function loadExcelPreview(url) {
  const modal = ensureExcelPreviewModal();
  const title = getElement("excelPreviewTitle");
  const meta = getElement("excelPreviewMeta");

  if (title) {
    title.textContent = "Excel";
  }

  if (meta) {
    meta.textContent = "Cargando preview...";
  }

  renderExcelPreviewTable([]);
  modal.showModal();

  try {
    const data = await getJSON(url);

    if (title) {
      title.textContent = data.fileName || "Excel";
    }

    if (meta) {
      const truncatedText = data.truncated
        ? ` | Vista limitada a ${formatNumber(data.maxRows)} filas`
        : "";
      meta.textContent = `${data.sheetName || "Primera hoja"} | ${formatNumber(data.rowCount)} filas | ${formatNumber(data.columnCount)} columnas${truncatedText}`;
    }

    renderExcelPreviewTable(data.rows || []);
    appendLog(`Preview Excel cargado: ${data.fileName || "archivo"}`, "success");
  } catch (error) {
    console.error(error);

    if (title) {
      title.textContent = "No se pudo leer el Excel";
    }

    if (meta) {
      meta.textContent = error.message || "No se pudo cargar el preview";
    }

    renderExcelPreviewTable([]);
    appendLog(error.message || "No se pudo cargar el preview Excel", "error");
  }
}

// Muestra exclusivamente la maqueta creada por RMC MockupTool para este item.
function showMockupItemModal(item) {
  const modal = getElement("mockupItemModal");
  const title = getElement("mockupItemTitle");
  const tool = getElement("mockupItemTool");
  const runId = getElement("mockupItemRunId");
  const status = getElement("mockupItemStatus");
  const maqueta = getElement("mockupItemMaqueta");
  const download = getElement("mockupItemMaquetaDownload");
  const pathLabel = getElement("mockupItemMaquetaPath");
  const excel = getElement("mockupItemExcel");
  const excelPreview = getElement("mockupItemExcelPreview");
  const excelCopy = getElement("mockupItemExcelCopy");
  const excelPath = getElement("mockupItemExcelPath");

  if (!modal || !title || !tool || !runId || !status || !maqueta || !download || !excel || !excelPreview || !excelCopy) {
    return;
  }

  const mockupFile = {
    originalPath: item.path || "",
    resolvedPath: item.maqueta_resolved_path || "",
    exists: Boolean(item.maqueta_exists),
    status: item.maqueta_file_status || (item.path ? "missing" : "no_path")
  };
  const hasMaqueta = Boolean(item.id && hasResolvedFile(mockupFile));
  const hasExcelDownload = Boolean(item.id);
  const hasExcelPath = Boolean(item.excel_path);
  title.textContent = [item.wo, item.style, item.talla].filter(Boolean).join(" | ") || "Maqueta";
  tool.textContent = item.herramienta || "RMC MockupTool";
  runId.textContent = item.run_id || "Sin run";
  status.textContent = item.estado || "Sin estado";
  status.className = "department-badge";
  status.dataset.department = getDepartmentKey(item.estado);
  maqueta.href = hasMaqueta
    ? `/api/files/mockup/${encodeURIComponent(item.id)}/maqueta/view`
    : "#";
  maqueta.target = hasMaqueta ? "_blank" : "";
  download.href = hasMaqueta
    ? `/api/files/mockup/${encodeURIComponent(item.id)}/maqueta/download`
    : "#";
  excel.href = hasExcelDownload
    ? `/api/files/mockup/${encodeURIComponent(item.id)}/excel/download`
    : "#";
  excelPreview.href = hasExcelDownload
    ? `/api/files/mockup/${encodeURIComponent(item.id)}/excel/preview`
    : "#";
  maqueta.dataset.path = item.path || "";
  download.dataset.path = item.path || "";
  excel.dataset.path = item.excel_path || "";
  excelPreview.dataset.path = item.excel_path || "";
  excelCopy.dataset.path = item.excel_path || "";
  maqueta.setAttribute("aria-disabled", String(!hasMaqueta));
  download.setAttribute("aria-disabled", String(!hasMaqueta));
  download.textContent = hasMaqueta ? "Descargar" : "Pendiente";
  excel.setAttribute("aria-disabled", String(!hasExcelDownload));
  excelPreview.setAttribute("aria-disabled", String(!hasExcelDownload));
  excelCopy.setAttribute("aria-disabled", String(!hasExcelPath));
  excelCopy.textContent = hasExcelPath ? "Copiar ruta" : "Sin ruta";

  if (pathLabel) {
    pathLabel.textContent = formatFileStatusLine(mockupFile, "mockup");
  }

  if (excelPath) {
    excelPath.textContent = item.excel_path || "Excel vinculado por corrida";
  }

  modal.showModal();
}

function bindMockupItemModal() {
  const modal = getElement("mockupItemModal");
  const closeButton = getElement("closeMockupItemModal");
  const maqueta = getElement("mockupItemMaqueta");
  const download = getElement("mockupItemMaquetaDownload");
  const excel = getElement("mockupItemExcel");
  const excelPreview = getElement("mockupItemExcelPreview");
  const excelCopy = getElement("mockupItemExcelCopy");

  if (!modal || !closeButton) {
    return;
  }

  closeButton.addEventListener("click", () => modal.close());

  [maqueta, download, excel, excelPreview].forEach(link => {
    if (!link) return;

    link.addEventListener("click", event => {
      if (link.getAttribute("aria-disabled") !== "true") {
        if (link === excelPreview) {
          event.preventDefault();
          appendLog("Preview Excel MockupTool solicitado", "success");
          loadExcelPreview(link.href);
          return;
        }

        if (link === excel) {
          event.preventDefault();
          appendLog(
            link.dataset.path
              ? `Excel MockupTool solicitado: ${link.dataset.path}`
              : "Excel MockupTool solicitado por backend",
            "success"
          );
          downloadLinkedFile(link, "RMC_MockupTool_item.xlsx");
          return;
        }

        appendLog(
          `Maqueta solicitada: ${link.dataset.path}`,
          "success"
        );
        return;
      }

      event.preventDefault();
      appendLog((link === excel || link === excelPreview) ? "Sin Excel vinculado" : "La maqueta no tiene una ruta disponible", "info");
    });
  });

  if (excelCopy) {
    excelCopy.addEventListener("click", event => {
      event.preventDefault();

      if (excelCopy.getAttribute("aria-disabled") === "true") {
        appendLog("Sin Excel vinculado para copiar", "info");
        return;
      }

      copyResourcePath(excelCopy.dataset.path, "Excel MockupTool");
    });
  }
}

// Conecta filtros de texto/columna para todas las tablas configuradas.
function bindTableFilters() {
  filterTargets.forEach(tableId => {
    const tools = document.querySelector(`.table-tools[data-filter-target="${tableId}"]`);

    if (!tools) {
      return;
    }

    tools.querySelector(".table-search")?.addEventListener("input", () => {
      applyTableFilter(tableId);
    });

    tools.querySelector(".table-column")?.addEventListener("change", () => {
      applyTableFilter(tableId);
    });

    tools.querySelector(".table-clear")?.addEventListener("click", () => {
      const search = tools.querySelector(".table-search");
      const column = tools.querySelector(".table-column");
      const monthInput = tools.querySelector(".run-month-filter");

      if (search) {
        search.value = "";
      }

      if (column) {
        column.value = "all";
      }

      clearExcelColumnFilters(tableId);

      if (monthInput?.dataset.monthTool) {
        setDashboardMonth(monthInput.dataset.monthTool, "");
        return;
      }

      applyTableFilter(tableId);
    });

    setupFilterOptions(tableId);
  });
}

// Activa sort por encabezado en todas las tablas registradas.
function bindTableSorting() {
  sortableTargets.forEach(setupSortableTable);
  excelFilterTargets.forEach(setupExcelColumnFilters);
}

function bindExcelFilterMenuClose() {
  document.addEventListener("click", closeExcelFilterMenu);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeExcelFilterMenu();
    }
  });
}

// Arranque de la aplicacion: primero conecta eventos, luego carga datos iniciales.
async function init() {
  applyTheme(getStoredTheme());

  if (window.RMCComponents?.renderApp) {
    window.RMCComponents.renderApp(getElement("appRoot"));
  }

  bindNavigation();
  bindSidebarControls();
  bindThemeControls();
  bindAccessControls();
  bindOpNikePinControls();
  bindLogControls();
  bindDetailControls();
  bindGitCommitControls();
  bindOpNikeCatalogControls();
  bindNikeItemModal();
  bindMockupItemModal();
  bindRapid27Controls();
  bindRapid27OrderModal();
  bindDashboardMonthFilters();
  bindTableFilters();
  bindTableSorting();
  bindExcelFilterMenuClose();
  try {
    await Promise.all([
      loadDashboard(),
      loadRapid27DashboardData(),
      loadRuns(),
      loadMockupRuns()
    ]);
  } catch (error) {
    console.error(error);
    appendLog(error.message, "error");
    alert("Error cargando datos. Revisa la ruta de la BD o la consola.");
  }
}

init();
