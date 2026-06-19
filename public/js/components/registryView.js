// Componente CEP Registry: inventario de herramientas en modo solo lectura.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.exportsView = function exportsView() {
  return `
    <section id="exports-view" class="view">
      <h2>Exportaciones</h2>
      <p>Los reportes Excel de Nike se descargan desde cada ejecucion.</p>
    </section>
  `;
};

window.RMCComponents.registryView = function registryView() {
  return `
    <section id="registry-view" class="view">
      <div class="view-header">
        <h2>CEP Registry</h2>
      </div>

      <div class="registry-grid">
        <section class="detail-panel">
          <h3>Apps registradas</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>App</th>
                  <th>Tabla runs</th>
                  <th>Version</th>
                  <th>Actualizado</th>
                </tr>
              </thead>
              <tbody id="registryTable"></tbody>
            </table>
          </div>
        </section>

        <section class="detail-panel">
          <h3>Tablas SQLite</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tabla</th>
                  <th>Registros</th>
                </tr>
              </thead>
              <tbody id="tablesTable"></tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  `;
};
