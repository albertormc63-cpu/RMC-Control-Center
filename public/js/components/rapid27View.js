// Panel de lectura 27 Sports / Rapid alimentado por las tablas rmc_opt_*.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.rapid27View = function rapid27View() {
  return `
    <section id="rapid27-view" class="view">
      <h2>Panel 27 / Rapid</h2>

      <section class="dashboard-block">
        <div class="block-title">
          <h3>Embarques 27 Sports / Rapid</h3>
          <span id="rapid27UpdatedAt" class="run-info"></span>
        </div>

        <div class="table-tools" data-filter-target="rapid27Table">
          <input class="table-search" type="search" placeholder="Filtrar embarques 27/Rapid">

          <select class="table-column">
            <option value="all">Todas las columnas</option>
          </select>

          <select id="rapid27ClientFilter" class="table-column" aria-label="Filtrar cliente 27/Rapid">
            <option value="">Todos los clientes</option>
          </select>

          <label class="table-month-filter" for="rapid27MonthFilter">
            <span>Mes</span>
            <input class="MonthFilter" id="rapid27MonthFilter" type="month">
          </label>

          <button id="rapid27MonthAll" class="secondary-button" type="button">Todos</button>

          <button class="secondary-button table-clear" type="button">Limpiar</button>

          <span class="table-count">0 registros</span>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Emb</th>
                <th>Año</th>
                <th>Cliente</th>
                <th>Pedidos</th>
                <th>Piezas</th>
                <th>Estilos</th>
                <th>Archivos</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>

            <tbody id="rapid27Table"></tbody>
          </table>
        </div>
      </section>

      <section id="rapid27DetailSection" class="detail-panel hidden">
        <div class="detail-header">
          <h3>Pedidos 27 Sports / Rapid</h3>
          <div class="detail-actions">
            <div id="rapid27ShipmentInfo" class="run-info"></div>
            <button id="hideRapid27Detail" class="secondary-button" type="button">Ocultar</button>
          </div>
        </div>

        <div id="rapid27ShipmentFlowSummary" class="tracking-panel compact-flow-panel hidden" aria-live="polite"></div>

        <div class="table-tools" data-filter-target="rapid27OrdersTable">
          <input class="table-search" type="search" placeholder="Filtrar roster, pedido o estado">

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
                <th>Roster</th>
                <th>Nombre Pedido</th>
                <th>Piezas</th>
                <th>Estilos</th>
                <th>Archivos</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>

            <tbody id="rapid27OrdersTable"></tbody>
          </table>
        </div>
      </section>

      <dialog id="rapid27OrderModal" class="modal nike-item-modal">
        <div class="modal-header">
          <div>
            <span class="modal-eyebrow">Detalle de pedido</span>
            <h3 id="rapid27ModalTitle">27 Sports / Rapid</h3>
          </div>
          <button id="closeRapid27OrderModal" class="secondary-button" type="button">Cerrar</button>
        </div>

        <div class="nike-item-summary">
          <div>
            <span>Cliente</span>
            <strong id="rapid27ModalCliente"></strong>
          </div>
          <div>
            <span>Embarque</span>
            <strong id="rapid27ModalEmb"></strong>
          </div>
          <div>
            <span>Roster</span>
            <strong id="rapid27ModalRoster"></strong>
          </div>
          <div>
            <span>Pedido</span>
            <strong id="rapid27ModalPedido"></strong>
          </div>
          <div>
            <span>Piezas</span>
            <strong id="rapid27ModalPiezas"></strong>
          </div>
          <div>
            <span>Estado</span>
            <strong id="rapid27ModalEstado"></strong>
          </div>
        </div>

        <section class="tracking-panel">
          <div class="tracking-header">
            <div>
              <span class="modal-eyebrow">Tracking por área</span>
              <h4>Tracking del pedido</h4>
            </div>
            <strong id="rapid27ModalTrackingStatus">Pendiente</strong>
          </div>
          <p id="rapid27ModalTrackingSummary" class="tracking-summary">Consultando fuentes de producción...</p>
          <div id="rapid27ModalTrackingMatches" class="tracking-match-list"></div>
        </section>

        <div class="table-wrap rapid27-modal-table">
          <table>
            <thead>
              <tr>
                <th>WO</th>
                <th>Style</th>
                <th>Subdesign</th>
                <th>Talla</th>
                <th>Jugador</th>
                <th>#</th>
                <th>Qty</th>
                <th>Archivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody id="rapid27PiecesTable"></tbody>
          </table>
        </div>
      </dialog>
    </section>
  `;
};
