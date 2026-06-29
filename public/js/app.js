// Formateador compartido para cantidades en todo el frontend.
const numberFormatter = new Intl.NumberFormat("es-MX");

// Tablas que tienen filtros de texto/columna en pantalla.
const filterTargets = [
  "runsTable",
  "itemsTable",
  "mockupTable",
  "mockupItemsTable"
];

// Tablas que deben permitir ordenar al dar click en sus encabezados.
const sortableTargets = [
  "runsTable",
  "itemsTable",
  "mockupTable",
  "mockupItemsTable",
  "registryTable",
  "tablesTable"
];

// Estado de ordenamiento por tabla. Permite alternar ascendente/descendente.
const sortState = {};

// Conserva la ultima respuesta del dashboard para filtrar meses sin pedirla otra vez.
let dashboardData = null;

// Cache de embarques agrupados para abrir detalle desde graficas sin nuevas rutas backend.
let nikeRunsCache = [];
let mockupRunsCache = [];

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
  cell.colSpan = colSpan;
  tbody.appendChild(row);
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

function addOperationalStatusCell(row, item) {
  const state = getNikeOperationalState(item);
  const cell = document.createElement("td");
  const wrapper = document.createElement("div");
  const detail = document.createElement("span");
  const department = getDepartmentKey(`${state.stage || ""} ${state.status || ""} ${state.detail || ""}`);

  wrapper.className = "operational-status";
  wrapper.dataset.stage = state.stage || "impresion";
  wrapper.dataset.department = department;
  detail.textContent = state.detail || "";
  wrapper.append(makeDepartmentBadge(state.status, `${state.stage || ""} ${state.detail || ""}`), detail);
  cell.appendChild(wrapper);
  row.appendChild(cell);
  return cell;
}

function addDepartmentStatusCell(row, value, className = "") {
  const cell = document.createElement("td");

  if (className) {
    cell.className = className;
  }

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
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active-view", view.id === viewId);
  });

  document.querySelectorAll(".menu-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });

  closeSidebar();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
        colSpan: 10,
        label: "Nike"
      }
    : {
        viewId: "mockup-view",
        detailId: "mockupDetailSection",
        infoId: "mockupRunInfo",
        tableId: "mockupItemsTable",
        colSpan: 8,
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
  let visibleRows = 0;

  rows.forEach(row => {
    const cells = Array.from(row.cells);
    const haystack = column === "all"
      ? cells.map(cell => cell.textContent).join(" ")
      : cells[Number(column)]?.textContent || "";
    const isVisible = !search || haystack.toLowerCase().includes(search);

    row.classList.toggle("filtered-out", !isVisible);

    if (isVisible) {
      visibleRows += 1;
    }
  });

  updateTableCount(tableId, visibleRows, rows.length);
}

// Recalcula opciones de filtro y contador despues de repintar una tabla.
function refreshTableFilter(tableId) {
  setupFilterOptions(tableId);
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

  bar.dataset.tool = options.tool;
  bar.dataset.fechaEmbarque = fechaEmbarque;
  bar.dataset.shipmentKey = row.key || "";
  bar.setAttribute("role", "button");
  bar.setAttribute("tabindex", "0");
  bar.setAttribute(
    "aria-label",
    `Abrir detalle de ${options.tool === "nike" ? "Nike" : "MockupTool"} para embarque ${fechaEmbarque}`
  );
  bar.addEventListener("dblclick", event => {
    event.preventDefault();
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

  nikeInput?.addEventListener("change", () => renderNikeDashboardPeriod(nikeInput.value));
  mockupInput?.addEventListener("change", () => renderMockupDashboardPeriod(mockupInput.value));

  getElement("nikeMonthAll")?.addEventListener("click", () => {
    nikeInput.value = "";
    renderNikeDashboardPeriod("");
  });

  getElement("mockupMonthAll")?.addEventListener("click", () => {
    mockupInput.value = "";
    renderMockupDashboardPeriod("");
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

  renderNikeDashboardPeriod(nikeMonthInput?.value || "");
  renderMockupDashboardPeriod(mockupMonthInput?.value || "");

  appendLog("Dashboard actualizado", "success");
}

// Carga la tabla de ejecuciones Nike.
async function loadRuns() {
  const data = await getJSON("/api/nike/runs");
  const runs = Array.isArray(data) ? data : data.runs || [];
  const tbody = getElement("runsTable");

  nikeRunsCache = runs;
  tbody.innerHTML = "";

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
    addButtonCell(row, "Ver", () => loadRunDetail(actionId));
    addLinkCell(row, "Excel", `/api/reports/nike/${encodeURIComponent(actionId)}/excel`);

    row.addEventListener("dblclick", () => loadRunDetail(actionId));
    tbody.appendChild(row);
  });

  refreshTableFilter("runsTable");
  updateSortIndicators("runsTable");
  appendLog(`RMCOp-Nike: ${runs.length} ejecuciones cargadas (página ${data.page || 1})`, "success");
}

// Carga el detalle de una ejecucion Nike y muestra el panel bajo la tabla.
async function loadRunDetail(id) {
  const data = await getJSON(`/api/nike/runs/${encodeURIComponent(id)}`);
  const detailSection = getElement("detailSection");
  const runInfo = getElement("runInfo");
  const tbody = getElement("itemsTable");

  detailSection.classList.remove("hidden");
  const runCount = Number(data.runCount || 1);
  const executionLabel = runCount === 1 ? "ejecución" : "ejecuciones";

  runInfo.textContent = `${runCount} ${executionLabel} | ${formatDDMM(data.groupDate || data.run?.fecha_embarque || data.run?.created_at)} | ${data.herramienta || data.run?.herramienta || "RMCOp-Nike"} | ${formatNumber(data.totalPieces || data.run?.piezas)} piezas | ${data.year || ""}`;
  tbody.innerHTML = "";

  if (!data.items.length) {
    addEmptyTableRow(
      tbody,
      `No hay items registrados para el embarque ${formatDDMM(data.groupDate || data.run?.fecha_embarque || data.run?.created_at)}.`,
      10
    );
  }

  data.items.forEach(item => {
    const row = document.createElement("tr");

    row.dataset.itemId = item.id || "";
    row.dataset.itemRunId = item.run_id || "";

    addCell(row, item.wo || "");
    addCell(row, item.style || "");
    addCell(row, item.equipo || "");
    addCell(row, item.variante || "");
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
}

// Carga la tabla de ejecuciones MockupTool.
async function loadMockupRuns() {
  const data = await getJSON("/api/mockup/runs");
  const runs = Array.isArray(data) ? data : data.runs || [];
  const tbody = getElement("mockupTable");

  mockupRunsCache = runs;
  tbody.innerHTML = "";

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
    addButtonCell(row, "Ver", () => loadMockupDetail(actionId));
    addLinkCell(row, "Excel", `/api/reports/mockup/${encodeURIComponent(actionId)}/excel`);

    row.addEventListener("dblclick", () => loadMockupDetail(actionId));
    tbody.appendChild(row);
  });

  refreshTableFilter("mockupTable");
  updateSortIndicators("mockupTable");
  appendLog(`Maquetas RMC Nike: ${runs.length} embarques cargados`, "success");
}

// Carga el detalle de una ejecucion MockupTool.
async function loadMockupDetail(id) {
  const data = await getJSON(`/api/mockup/runs/${encodeURIComponent(id)}`);
  const detailSection = getElement("mockupDetailSection");
  const runInfo = getElement("mockupRunInfo");
  const tbody = getElement("mockupItemsTable");

  detailSection.classList.remove("hidden");
  const runCount = Number(data.runCount || 1);
  runInfo.textContent = `${runCount} ${runCount === 1 ? "ejecución" : "ejecuciones"} | ${formatDDMM(data.groupDate || data.run.fecha_embarque)} | ${formatNumber(data.totalMaquetas)} maquetas | ${data.year || ""}`;
  tbody.innerHTML = "";

  if (!data.items.length) {
    addEmptyTableRow(
      tbody,
      `No hay items registrados para el embarque ${formatDDMM(data.groupDate || data.run.fecha_embarque)}.`,
      8
    );
  }

  data.items.forEach(item => {
    const row = document.createElement("tr");

    addCell(row, item.wo || "");
    addCell(row, item.style || "");
    addCell(row, item.equipo || "");
    addCell(row, item.variante || "");
    addCell(row, item.talla || "");
    addCell(row, formatNumber(item.piezas));
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

// Conecta los botones del sidebar con las vistas internas.
function bindNavigation() {
  document.querySelectorAll(".menu-item").forEach(button => {
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
  const title = getElement("nikeItemTitle");
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

  if (!modal || !title || !tool || !runId || !status || !maqueta || !maquetaDownload || !plantilla || !plantillaDownload || !excel || !excelPreview || !excelCopy) {
    return;
  }

  const operationalState = getNikeOperationalState(item);
  title.textContent = [item.wo, item.style, item.talla].filter(Boolean).join(" | ") || "Item Nike";
  tool.textContent = item.herramienta || "Sin herramienta";
  runId.textContent = item.run_id || "Sin run";
  status.textContent = operationalState.status;
  status.className = "department-badge";
  status.dataset.department = getDepartmentKey(
    `${operationalState.stage || ""} ${operationalState.status || ""} ${operationalState.detail || ""}`
  );

  const paths = {
    maqueta: item.maqueta_path || "",
    plantilla: item.plantilla_path || item.path || "",
    excel: item.excel_path || item.roster_path || ""
  };

  const hasMaqueta = Boolean(item.id && paths.maqueta);
  maqueta.href = hasMaqueta
    ? `/api/files/nike/${encodeURIComponent(item.id)}/maqueta/view`
    : "#";
  maqueta.target = hasMaqueta ? "_blank" : "";
  maquetaDownload.href = hasMaqueta
    ? `/api/files/nike/${encodeURIComponent(item.id)}/maqueta/download`
    : "#";
  const hasPlantilla = Boolean(item.id && paths.plantilla);
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
  maquetaDownload.textContent = hasMaqueta ? "Descargar" : "Pendiente";
  plantilla.setAttribute("aria-disabled", String(!hasPlantilla));
  plantillaDownload.setAttribute("aria-disabled", String(!hasPlantilla));
  plantillaDownload.textContent = hasPlantilla ? "Descargar" : "Pendiente";
  excel.setAttribute("aria-disabled", String(!hasExcelDownload));
  excelPreview.setAttribute("aria-disabled", String(!hasExcelDownload));
  excelCopy.setAttribute("aria-disabled", String(!hasExcelPath));
  excelCopy.textContent = hasExcelPath ? "Copiar ruta" : "Sin ruta";

  if (maquetaPath) maquetaPath.textContent = paths.maqueta || "Ruta pendiente de definir";
  if (plantillaPath) plantillaPath.textContent = paths.plantilla || "Ruta pendiente de definir";
  if (excelPath) excelPath.textContent = paths.excel || "Excel disponible por backend";

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

  const hasMaqueta = Boolean(item.id && item.path);
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
    pathLabel.textContent = item.path || "Ruta pendiente de definir";
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

      if (search) {
        search.value = "";
      }

      if (column) {
        column.value = "all";
      }

      applyTableFilter(tableId);
    });

    setupFilterOptions(tableId);
  });
}

// Activa sort por encabezado en todas las tablas registradas.
function bindTableSorting() {
  sortableTargets.forEach(setupSortableTable);
}

// Arranque de la aplicacion: primero conecta eventos, luego carga datos iniciales.
async function init() {
  if (window.RMCComponents?.renderApp) {
    window.RMCComponents.renderApp(getElement("appRoot"));
  }

  bindNavigation();
  bindSidebarControls();
  bindLogControls();
  bindDetailControls();
  bindNikeItemModal();
  bindMockupItemModal();
  bindDashboardMonthFilters();
  bindTableFilters();
  bindTableSorting();

  try {
    await Promise.all([
      loadDashboard(),
      loadRuns(),
      loadMockupRuns(),
      loadRegistry()
    ]);
  } catch (error) {
    console.error(error);
    appendLog(error.message, "error");
    alert("Error cargando datos. Revisa la ruta de la BD o la consola.");
  }
}

init();
