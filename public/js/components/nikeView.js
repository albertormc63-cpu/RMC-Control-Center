// Componente RMCOp-Nike: ejecuciones, filtros y detalle de items.
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
              <th>Herramienta</th>
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
                <th>ID Run</th>
                <th>WO</th>
                <th>Equipo</th>
                <th>Style</th>
                <th>Talla</th>
                <th>Piezas</th>
                <th>Nombre</th>
                <th>Numero</th>
                <th>Estado</th>
                <th>Error</th>
              </tr>
            </thead>

            <tbody id="itemsTable"></tbody>
          </table>
        </div>
      </section>
    </section>
  `;
};
