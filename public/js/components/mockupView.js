// Componente RMC MockupTool: historial de plantillas y detalle por ejecucion.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.mockupView = function mockupView() {
  return `
    <section id="mockup-view" class="view">
      <h2>RMC MockupTool</h2>

      <div class="table-tools" data-filter-target="mockupTable">
        <input class="table-search" type="search" placeholder="Filtrar ejecuciones MockupTool">

        <select class="table-column">
          <option value="all">Todas las columnas</option>
        </select>

        <button class="secondary-button table-clear" type="button">Limpiar</button>

        <span class="table-count">0 registros</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Emb</th>
              <th>Seccion</th>
              <th>Disenador</th>
              <th>Styles</th>
              <th>Plantillas</th>
              <th>Detalle</th>
              <th>Excel</th>
            </tr>
          </thead>

          <tbody id="mockupTable"></tbody>
        </table>
      </div>

      <section id="mockupDetailSection" class="detail-panel hidden">
        <div class="detail-header">
          <h3>Detalle MockupTool</h3>
          <div class="detail-actions">
            <div id="mockupRunInfo" class="run-info"></div>
            <button id="hideMockupDetail" class="secondary-button" type="button">Ocultar</button>
          </div>
        </div>

        <div class="table-tools" data-filter-target="mockupItemsTable">
          <input class="table-search" type="search" placeholder="Filtrar detalle MockupTool">

          <select class="table-column">
            <option value="all">Todas las columnas</option>
          </select>

          <button class="secondary-button table-clear" type="button">Limpiar</button>

          <span class="table-count">0 registros</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>WO</th>
                <th>Equipo</th>
                <th>Style</th>
                <th>Talla</th>
                <th>Piezas</th>
                <th>Archivo</th>
                <th>Estado</th>
                <th>Error</th>
              </tr>
            </thead>

            <tbody id="mockupItemsTable"></tbody>
          </table>
        </div>
      </section>
    </section>
  `;
};
