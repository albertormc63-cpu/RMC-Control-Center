// Componente Sistema: hub de ajustes y formulario de rutas de polling.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.systemSettingsView = function systemSettingsView() {
  return `
    <section id="system-settings-view" class="view">
      <div class="view-header">
        <div>
          <h2>Sistema / Ajustes</h2>
          <p class="settings-intro">Opciones de configuracion operativa del Control Center.</p>
        </div>
      </div>

      <div class="settings-card-grid">
        <button class="settings-nav-card" type="button" data-view="opnike-catalog-view">
          <span class="settings-card-kicker">Nike</span>
          <strong>Catalogo Op-Nike (Variantes)</strong>
          <small>Familias, variantes, aliases y reglas de plantillas.</small>
        </button>

        <button class="settings-nav-card" type="button" data-view="polling-routes-view">
          <span class="settings-card-kicker">Polling</span>
          <strong>Ajuste de Rutas Polling</strong>
          <small>Rutas, hojas y estado activo de Exceles compartidos.</small>
        </button>

        <button class="settings-nav-card" type="button" data-view="exports-view">
          <span class="settings-card-kicker">Reportes</span>
          <strong>Exportaciones</strong>
          <small>Acceso operativo a notas de reportes Excel.</small>
        </button>

        <button class="settings-nav-card" type="button" data-view="registry-view">
          <span class="settings-card-kicker">Registry</span>
          <strong>CEP Registry</strong>
          <small>Apps registradas y conteos de tablas SQLite.</small>
        </button>

        <button class="settings-nav-card" type="button" data-view="git-history-view">
          <span class="settings-card-kicker">Auditoria</span>
          <strong>Historial de desarrollo</strong>
          <small>Commits importados por herramienta RMC.</small>
        </button>
      </div>
    </section>
  `;
};

window.RMCComponents.pollingRoutesView = function pollingRoutesView() {
  return `
    <section id="polling-routes-view" class="view">
      <div class="view-header">
        <div>
          <h2>Ajuste de Rutas Polling</h2>
          <p class="settings-intro">Fuentes externas activas que el worker revisa por cambios de archivo.</p>
        </div>

        <button class="secondary-button settings-back-button" type="button" data-view="system-settings-view">
          Volver a Ajustes
        </button>
      </div>

      <div id="pollingSourcesCards" class="polling-source-grid"></div>

      <div class="settings-editor-grid">
        <section class="detail-panel polling-editor-panel">
          <div class="detail-header">
            <h3>Fuente seleccionada</h3>
            <button id="btnRefreshPollingSources" class="secondary-button" type="button">Actualizar</button>
          </div>

          <form id="pollingSourceForm" class="polling-form">
            <input id="pollingSourceId" type="hidden">

            <label>
              Nombre
              <input id="pollingSourceName" type="text" autocomplete="off" required>
            </label>

            <label>
              Area
              <input id="pollingSourceArea" type="text" autocomplete="off">
            </label>

            <label>
              Tipo de fuente
              <input id="pollingSourceType" type="text" readonly>
            </label>

            <label class="span-2">
              Ruta del archivo
              <input id="pollingSourcePath" type="text" autocomplete="off" placeholder="/Volumes/.../archivo.xlsx" required>
            </label>

            <label class="span-2">
              Hoja
              <input id="pollingSourceSheet" type="text" autocomplete="off" required>
            </label>

            <label class="checkbox-label polling-active-label">
              <input id="pollingSourceActive" type="checkbox">
              Fuente activa para polling automatico
            </label>

            <p id="pollingSourceMessage" class="form-message span-2"></p>

            <div class="modal-actions span-2">
              <button class="secondary-button" type="button" data-view="system-settings-view">Cancelar</button>
              <button id="btnRunPollingSource" class="secondary-button" type="button">Sincronizar ahora</button>
              <button type="submit">Guardar ruta</button>
            </div>
          </form>
        </section>

        <section class="detail-panel polling-runs-panel">
          <div class="detail-header">
            <h3>Ultimas corridas</h3>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Validas</th>
                  <th>Nuevas</th>
                  <th>Actualizadas</th>
                  <th>Faltantes</th>
                </tr>
              </thead>
              <tbody id="pollingRunsTable"></tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  `;
};
