// Componente Dashboard: tarjetas, graficas y tablas ejecutivas.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.dashboardView = function dashboardView() {
  return `
    <section id="dashboard-view" class="view active-view">
      <h2>Dashboard</h2>

      <section class="dashboard-block">
        <div class="block-title">
          <h3>General</h3>
        </div>

        <div class="summary-grid summary-grid-general">
          <div class="summary-card">
            <span>Herramientas CEP</span>
            <strong id="toolsCount">0</strong>
          </div>

          <div class="summary-card">
            <span>Commits Nike</span>
            <strong id="gitCommits">0</strong>
          </div>

          <div class="summary-card danger">
            <span>Errores Totales</span>
            <strong id="totalErrors">0</strong>
          </div>
        </div>
      </section>

      <section class="dashboard-block">
        <div class="block-title">
          <h3>Seguimiento operativo 27 / Rapid</h3>
          <div class="dashboard-period-filter">
            <label for="rapid27DashboardMonthFilter">Mes de embarque</label>
            <input class="MonthFilter" id="rapid27DashboardMonthFilter" type="month">
            <button id="rapid27DashboardMonthAll" class="secondary-button" type="button">Todos</button>
            <span id="rapid27Availability" class="department-badge" data-department="default">Consultando datos</span>
          </div>
        </div>

        <div class="summary-grid summary-grid-rapid27">
          <div class="summary-card">
            <span>Embarques</span>
            <strong id="rapid27Embarques">0</strong>
          </div>

          <div class="summary-card">
            <span>Pedidos</span>
            <strong id="rapid27Pedidos">0</strong>
          </div>

          <div class="summary-card">
            <span>Piezas</span>
            <strong id="rapid27Piezas">0</strong>
          </div>

          <div class="summary-card">
            <span>Estilos</span>
            <strong id="rapid27Estilos">0</strong>
          </div>

          <div class="summary-card">
            <span>Archivos listos</span>
            <strong id="rapid27Impresion">0</strong>
          </div>

          <div class="summary-card">
            <span>En almacén</span>
            <strong id="rapid27Sublimado">0</strong>
          </div>
        </div>

        <div class="tracking-panel rapid27-flow-panel" aria-live="polite">
          <div class="tracking-step" data-department="diseno" data-active="false">
            <strong id="rapid27FilesFlow">Archivos: 0</strong>
            <span>PDF encontrado o movido</span>
          </div>

          <div class="tracking-step" data-department="sublimado" data-active="false">
            <strong id="rapid27PrintFlow">Sublimado: 0</strong>
            <span>Cruce por WO + style + roster</span>
          </div>

          <div class="tracking-step" data-department="almacen" data-active="false">
            <strong id="rapid27WarehouseFlow">Almacén: 0</strong>
            <span>Cruce por WO + style</span>
          </div>
        </div>

        <div class="chart-panel">
          <h4>Piezas por fecha de embarque</h4>
          <div class="chart-month-nav" aria-label="Navegacion mensual 27 Rapid">
            <button id="rapid27DashboardMonthPrev" class="chart-nav-button" type="button" aria-label="Mes anterior 27 Rapid">&lt;</button>
            <div id="rapid27TrackingChart" class="chart-canvas"></div>
            <button id="rapid27DashboardMonthNext" class="chart-nav-button" type="button" aria-label="Mes siguiente 27 Rapid">&gt;</button>
          </div>
        </div>
      </section>

      <section class="dashboard-block">
        <div class="block-title">
          <h3>RMCOp-Nike</h3>
          <div class="dashboard-period-filter">
            <label for="nikeMonthFilter">Mes de embarque</label>
            <input class="MonthFilter" id="nikeMonthFilter" type="month">
            <button id="nikeMonthAll" class="secondary-button" type="button">Todos</button>
          </div>
        </div>

        <div class="summary-grid summary-grid-nike">
          <div class="summary-card">
            <span>Ejecuciones</span>
            <strong id="nikeRuns">0</strong>
          </div>

          <div class="summary-card">
            <span>Pedidos</span>
            <strong id="nikePedidos">0</strong>
          </div>

          <div class="summary-card">
            <span>Registros</span>
            <strong id="nikeRegistros">0</strong>
          </div>

          <div class="summary-card">
            <span>Piezas</span>
            <strong id="nikePiezas">0</strong>
          </div>

          <div class="summary-card">
            <span>Estilos</span>
            <strong id="nikeEstilos">0</strong>
          </div>

          <div class="summary-card">
            <span>Tiempo Promedio</span>
            <strong id="nikeAvgTime">00:00:00</strong>
          </div>
        </div>

        <div class="chart-panel">
          <h4>Piezas por fecha de embarque</h4>
          <div class="chart-month-nav" aria-label="Navegacion mensual Nike">
            <button id="nikeMonthPrev" class="chart-nav-button" type="button" aria-label="Mes anterior Nike">&lt;</button>
            <div id="nikeTimeChart" class="chart-canvas"></div>
            <button id="nikeMonthNext" class="chart-nav-button" type="button" aria-label="Mes siguiente Nike">&gt;</button>
          </div>
        </div>

        <div class="dashboard-table-panel">
          <h4>Resumen mensual Nike</h4>
          <div class="table-wrap">
            <table class="compact-table">
              <thead>
                <tr>
                  <th>Mes/Año</th>
                  <th>Ejecuciones</th>
                  <th>Pedidos</th>
                  <th>Piezas</th>
                  <th>Tiempo prom.</th>
                  <th>Errores</th>
                </tr>
              </thead>
              <tbody id="nikeMonthlyTable"></tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="mockupDashboardBlock" class="dashboard-block hidden">
        <div class="block-title">
          <h3>RMC MockupTool</h3>
          <div class="dashboard-period-filter">
            <label for="mockupMonthFilter">Mes de embarque</label>
            <input class="MonthFilter" id="mockupMonthFilter" type="month">
            <button id="mockupMonthAll" class="secondary-button" type="button">Todos</button>
          </div>
        </div>

        <div class="summary-grid summary-grid-mockup">
          <div class="summary-card">
            <span>Ejecuciones</span>
            <strong id="mockupRuns">0</strong>
          </div>

          <div class="summary-card">
            <span>Registros</span>
            <strong id="mockupRegistros">0</strong>
          </div>

          <div class="summary-card">
            <span>Plantillas Generadas</span>
            <strong id="mockupTemplates">0</strong>
          </div>

          <div class="summary-card">
            <span>Plantillas Faltantes</span>
            <strong id="mockupFaltantes">0</strong>
          </div>

          <div class="summary-card">
            <span>Filas Seleccionadas</span>
            <strong id="mockupRowsSelected">0</strong>
          </div>

          <div class="summary-card">
            <span>Disenadores</span>
            <strong id="mockupDesigners">0</strong>
          </div>
        </div>

        <div class="chart-panel">
          <h4>Maquetas por fecha de embarque</h4>
          <div class="chart-month-nav" aria-label="Navegacion mensual MockupTool">
            <button id="mockupMonthPrev" class="chart-nav-button" type="button" aria-label="Mes anterior MockupTool">&lt;</button>
            <div id="mockupTemplateChart" class="chart-canvas"></div>
            <button id="mockupMonthNext" class="chart-nav-button" type="button" aria-label="Mes siguiente MockupTool">&gt;</button>
          </div>
        </div>

        <div class="dashboard-table-panel">
          <h4>Resumen mensual MockupTool</h4>
          <div class="table-wrap">
            <table class="compact-table">
              <thead>
                <tr>
                  <th>Mes/Año</th>
                  <th>Ejecuciones</th>
                  <th>Plantillas</th>
                  <th>Faltantes</th>
                </tr>
              </thead>
              <tbody id="mockupMonthlyTable"></tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  `;
};
