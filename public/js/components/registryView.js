// Componente CEP Registry: inventario de herramientas y modal de alta.
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
        <button id="openRegistryModal" type="button">Agregar nuevo</button>
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

window.RMCComponents.registryModal = function registryModal() {
  return `
    <dialog id="registryModal" class="modal">
      <form id="registryForm" method="dialog">
        <div class="modal-header">
          <h3>Agregar CEP</h3>
          <button id="closeRegistryModal" class="secondary-button" type="button">Cerrar</button>
        </div>

        <label>
          App
          <input name="source_app" type="text" placeholder="RMC Optimizador" required>
        </label>

        <label>
          Tabla runs
          <input name="runs_table" type="text" placeholder="rmc_optimizador_runs" required>
        </label>

        <label>
          Version
          <input name="app_version" type="text" placeholder="1.0.0">
        </label>

        <p id="registryFormMessage" class="form-message"></p>

        <div class="modal-actions">
          <button type="submit">Guardar</button>
        </div>
      </form>
    </dialog>
  `;
};
