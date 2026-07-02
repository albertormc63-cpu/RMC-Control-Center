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
                <th>Tipo</th>
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
          </div>
          <button id="closeNikeItemModal" class="secondary-button" type="button">Cerrar</button>
        </div>

        <div class="nike-item-summary">
          <div>
            <span>Roster</span>
            <strong id="nikeItemRoster"></strong>
          </div>
          <div>
            <span>WO</span>
            <strong id="nikeItemWo"></strong>
          </div>
          <div>
            <span>Equipo</span>
            <strong id="nikeItemEquipo"></strong>
          </div>
          <div>
            <span>Variante</span>
            <strong id="nikeItemVariante"></strong>
          </div>
          <div>
            <span>Style</span>
            <strong id="nikeItemStyle"></strong>
          </div>
          <div>
            <span>Size</span>
            <strong id="nikeItemSize"></strong>
          </div>
          <div>
            <span>Numero</span>
            <strong id="nikeItemNumero"></strong>
          </div>
          <div>
            <span>Estado</span>
            <strong id="nikeItemStatus"></strong>
          </div>
          <div>
            <span>Herramienta</span>
            <strong id="nikeItemTool"></strong>
          </div>
          <div>
            <span>Run ID</span>
            <strong id="nikeItemRunId"></strong>
          </div>
        </div>

        <section id="nikeItemPrintSublimation" class="tracking-panel">
          <div class="tracking-header">
            <div>
              <span class="modal-eyebrow">Tracking por area</span>
              <h4>Tracking del producto</h4>
            </div>
            <strong id="nikeItemPrintStatus">Pendiente</strong>
          </div>
          <p id="nikeItemPrintSummary" class="tracking-summary">Consultando fuentes de produccion...</p>
          <div id="nikeItemPrintMatches" class="tracking-match-list"></div>
        </section>

        <div class="resource-list">
          <div class="resource-link">
            <a id="nikeItemMaqueta" class="resource-main-action" href="#" aria-disabled="true">
              <strong>Ver Maqueta</strong>
              <small id="nikeItemMaquetaPath">Ruta pendiente de definir</small>
            </a>
            <a id="nikeItemMaquetaDownload" class="resource-state resource-download" href="#" aria-disabled="true">
              Descargar
            </a>
          </div>
          <div id="nikeItemMaquetaOptions" class="resource-options hidden"></div>

          <div class="resource-link">
            <a id="nikeItemPlantilla" class="resource-main-action" href="#" aria-disabled="true">
              <strong>Ver PDF</strong>
              <small id="nikeItemPlantillaPath">Ruta pendiente de definir</small>
            </a>
            <a id="nikeItemPlantillaDownload" class="resource-state resource-download" href="#" aria-disabled="true">
              Descargar
            </a>
          </div>

          <div class="resource-link">
            <a id="nikeItemExcel" class="resource-main-action" href="#" aria-disabled="true">
              <strong>Descargar Excel</strong>
              <small id="nikeItemExcelPath">Sin Excel vinculado</small>
            </a>
            <div class="resource-link-actions">
              <a id="nikeItemExcelPreview" class="resource-state resource-download" href="#" aria-disabled="true">
                Ver Excel
              </a>
              <a id="nikeItemExcelCopy" class="resource-state resource-download" href="#" aria-disabled="true">
                Copiar ruta
              </a>
            </div>
          </div>
        </div>
      </dialog>
    </section>
  `;
};
