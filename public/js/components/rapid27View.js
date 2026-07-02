// Componente provisional 27 Sports / Rapid: espacio de lectura para futuras integraciones.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.rapid27View = function rapid27View() {
  return `
    <section id="rapid27-view" class="view">
      <h2>27 Sports / Rapid</h2>

      <section class="dashboard-block">
        <div class="block-title">
          <h3>Panel provisional</h3>
          <span class="department-badge" data-department="default">Preparado para registros</span>
        </div>

        <div class="summary-grid summary-grid-rapid27">
          <div class="summary-card">
            <span>Pedidos</span>
            <strong id="rapid27Pedidos">0</strong>
          </div>

          <div class="summary-card">
            <span>Registros</span>
            <strong id="rapid27Registros">0</strong>
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
            <span>Impresion</span>
            <strong id="rapid27Impresion">0</strong>
          </div>

          <div class="summary-card">
            <span>Sublimado</span>
            <strong id="rapid27Sublimado">0</strong>
          </div>
        </div>

        <div class="tracking-panel rapid27-flow-panel">
          <div class="tracking-step" data-department="diseno" data-active="false">
            <strong>Impresion: pendiente</strong>
            <span>Excel de impresores</span>
          </div>

          <div class="tracking-step" data-department="sublimado" data-active="false">
            <strong>Sublimado: pendiente</strong>
            <span>Salida de Sublimado</span>
          </div>

          <div class="tracking-step" data-department="embarque" data-active="false">
            <strong>Departamentos: pendiente</strong>
            <span>Pedidos 27 Sports / Rapid</span>
          </div>
        </div>
      </section>

      <section class="dashboard-block">
        <div class="block-title">
          <h3>Pedidos 27 Sports / Rapid</h3>
        </div>

        <div class="table-tools" data-filter-target="rapid27Table">
          <input class="table-search" type="search" placeholder="Filtrar pedidos 27 / Rapid">

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
                <th>Cliente</th>
                <th>Pedidos</th>
                <th>Piezas</th>
                <th>Impresion</th>
                <th>Sublimado</th>
                <th>Estado</th>
              </tr>
            </thead>

            <tbody id="rapid27Table"></tbody>
          </table>
        </div>
      </section>
    </section>
  `;
};
