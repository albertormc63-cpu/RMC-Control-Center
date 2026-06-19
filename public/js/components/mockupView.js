// Componente MockupTool: embarques de maquetas y detalle agrupado.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.mockupView = function mockupView() {
  return `
    <section id="mockup-view" class="view">
      <h2>Maquetas RMC Nike</h2>

      <div class="table-tools" data-filter-target="mockupTable">
        <input class="table-search" type="search" placeholder="Filtrar embarques de maquetas">

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
              <th>Año</th>
              <th>Ej.</th>
              <th>Pedidos</th>
              <th>Maquetas</th>
              <th>Detalle</th>
              <th>Excel</th>
            </tr>
          </thead>

          <tbody id="mockupTable"></tbody>
        </table>
      </div>

      <section id="mockupDetailSection" class="detail-panel hidden">
        <div class="detail-header">
          <h3>Detalle de maquetas</h3>
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
                <th>Style</th>
                <th>Equipo</th>
                <th>Variante</th>
                <th>Talla</th>
                <th>Piezas</th>
                <th>Estado</th>
                <th>Ver mas</th>
              </tr>
            </thead>

            <tbody id="mockupItemsTable"></tbody>
          </table>
        </div>
      </section>

      <dialog id="mockupItemModal" class="modal nike-item-modal">
        <div class="modal-header">
          <div>
            <span class="modal-eyebrow">Detalle de maqueta</span>
            <h3 id="mockupItemTitle">Item MockupTool</h3>
          </div>
          <button id="closeMockupItemModal" class="secondary-button" type="button">Cerrar</button>
        </div>

        <div class="nike-item-summary">
          <div>
            <span>Herramienta</span>
            <strong id="mockupItemTool"></strong>
          </div>
          <div>
            <span>Run ID</span>
            <strong id="mockupItemRunId"></strong>
          </div>
          <div>
            <span>Estado</span>
            <strong id="mockupItemStatus"></strong>
          </div>
        </div>

        <div class="resource-list">
          <div class="resource-link">
            <a id="mockupItemMaqueta" class="resource-main-action" href="#" aria-disabled="true">
              <strong>Ver Maqueta</strong>
              <small id="mockupItemMaquetaPath">Ruta pendiente de definir</small>
            </a>
            <a id="mockupItemMaquetaDownload" class="resource-state resource-download" href="#" aria-disabled="true">
              Descargar
            </a>
          </div>
        </div>
      </dialog>
    </section>
  `;
};
