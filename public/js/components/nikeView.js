// Componente RMCOp-Nike: historial de ejecuciones y detalle por embarque.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.nikeView = function nikeView() {
  return `
    <section id="nike-view" class="view">
      <h2>RMCOp-Nike</h2>

      <div class="table-tools" data-filter-target="runsTable">
        <input class="table-search" type="search" placeholder="Filtrar ejecuciones Nike">

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
              <th>Piezas</th>
              <th>Detalle</th>
              <th>Excel</th>
            </tr>
          </thead>

          <tbody id="runsTable"></tbody>
        </table>
      </div>

      <section id="detailSection" class="detail-panel hidden">
        <div class="detail-header">
          <h3>Detalle Nike</h3>
          <div class="detail-actions">
            <div id="runInfo" class="run-info"></div>
            <button id="hideNikeDetail" class="secondary-button" type="button">Ocultar</button>
          </div>
        </div>

        <div class="table-tools" data-filter-target="itemsTable">
          <input class="table-search" type="search" placeholder="Filtrar detalle Nike">

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
                <th>Nombre</th>
                <th>Numero</th>
                <th>Estado</th>
                <th>Ver mas</th>
              </tr>
            </thead>

            <tbody id="itemsTable"></tbody>
          </table>
        </div>
      </section>

      <dialog id="nikeItemModal" class="modal nike-item-modal">
        <div class="modal-header">
          <div>
            <span class="modal-eyebrow">Detalle de item</span>
            <h3 id="nikeItemTitle">Item Nike</h3>
          </div>
          <button id="closeNikeItemModal" class="secondary-button" type="button">Cerrar</button>
        </div>

        <div class="nike-item-summary">
          <div>
            <span>Herramienta</span>
            <strong id="nikeItemTool"></strong>
          </div>
          <div>
            <span>Run ID</span>
            <strong id="nikeItemRunId"></strong>
          </div>
          <div>
            <span>Estado</span>
            <strong id="nikeItemStatus"></strong>
          </div>
        </div>

        <div class="resource-list">
          <a id="nikeItemMaqueta" class="resource-link" href="#" aria-disabled="true">
            <span class="resource-copy">
              <strong>Ver Maqueta</strong>
              <small id="nikeItemMaquetaPath">Ruta pendiente de definir</small>
            </span>
            <span class="resource-state">Pendiente</span>
          </a>

          <a id="nikeItemPlantilla" class="resource-link" href="#" aria-disabled="true">
            <span class="resource-copy">
              <strong>Ver Plantilla</strong>
              <small id="nikeItemPlantillaPath">Ruta pendiente de definir</small>
            </span>
            <span class="resource-state">Pendiente</span>
          </a>

          <a id="nikeItemExcel" class="resource-link" href="#" aria-disabled="true">
            <span class="resource-copy">
              <strong>Ver WO/Roster en Excel</strong>
              <small id="nikeItemExcelPath">Ruta pendiente de definir</small>
            </span>
            <span class="resource-state">Pendiente</span>
          </a>
        </div>
      </dialog>
    </section>
  `;
};
