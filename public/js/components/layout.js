// Componente Layout: cascaron general, sidebar, log, footer y montaje de vistas.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.sidebar = function sidebar() {
  return `
    <aside id="sidebar" class="sidebar">
      <div class="logo">
        <img
          id="rmcSidebarLogo"
          src="/assets/logo%20rmccc.svg"
          data-dark-logo="/assets/logo%20rmccc.svg"
          data-light-logo="/assets/logo%20rmc%20mt%20light.svg"
          alt="RMC Control Center"
        >
      </div>

      <section class="menu-group">
        <h3>DASHBOARD</h3>
        <button class="menu-item active" type="button" data-view="dashboard-view">
          <span>Dashboard</span>
          <span class="menu-icon menu-icon-dot" aria-hidden="true"></span>
        </button>
      </section>

      <section class="menu-group">
        <h3>HERRAMIENTAS NIKE</h3>
        <button class="menu-item" type="button" data-view="nike-view">
          <span>Pedidos RMC Nike</span>
          <img class="menu-icon menu-icon-img" src="/assets/logo%20nike.svg" alt="">
        </button>

        <button class="menu-item" type="button" data-view="mockup-view">
          <span>Maquetas RMC Nike</span>
          <i class="fi fi-rs-file-pdf menu-icon" aria-hidden="true"></i>
        </button>
      </section>

      <section class="menu-group">
        <h3>HERRAMIENTA 27 SPORTS / RAPID</h3>
        <button class="menu-item" type="button" data-view="rapid27-view">
          <span>Panel 27 / Rapid</span>
          <span class="menu-icon menu-icon-dot" aria-hidden="true"></span>
        </button>
      </section>

      <section class="menu-group">
        <h3>REPORTES</h3>
        <button class="menu-item" type="button" data-view="exports-view">
          <span>Exportaciones</span>
          <span class="menu-icon menu-icon-dot" aria-hidden="true"></span>
        </button>
      </section>

      <section class="menu-group">
        <h3>SISTEMA</h3>
        <button class="menu-item" type="button" data-view="registry-view">
          <span>CEP Registry</span>
          <span class="menu-icon menu-icon-dot" aria-hidden="true"></span>
        </button>
        <button class="menu-item" type="button" data-view="git-history-view">
          <span>Historial de desarrollo</span>
          <span class="menu-icon menu-icon-dot" aria-hidden="true"></span>
        </button>

        <div class="theme-control" aria-label="Tema de interfaz">
          <span id="themeDarkLabel">Dark</span>
          <label class="theme-switch">
            <input id="themeToggle" type="checkbox" role="switch" aria-labelledby="themeDarkLabel themeLightLabel">
            <span class="theme-slider" aria-hidden="true"></span>
          </label>
          <span id="themeLightLabel">Light</span>
        </div>

        <button id="btnOpenAccessModal" class="menu-item access-menu-item" type="button">
          <span>Acceder</span>
          <span class="menu-icon menu-icon-dot" aria-hidden="true"></span>
        </button>
      </section>
    </aside>
  `;
};

window.RMCComponents.gitHistoryView = function gitHistoryView() {
  return `
    <section id="git-history-view" class="view">
      <h2>Historial de desarrollo</h2>

      <div class="table-tools" data-filter-target="gitCommitsTable">
        <input class="table-search" type="search" placeholder="Filtrar commits">

        <select class="table-column">
          <option value="all">Todas las columnas</option>
        </select>

        <select id="gitCommitToolFilter" class="table-column">
          <option value="">Todas</option>
          <option value="rmcop_nike">RMCOp-Nike</option>
          <option value="rmc_control_center">RMC Control Center</option>
          <option value="rmc_mockuptool">RMC MockupTool</option>
          <option value="rmc_optimizador">RMC Optimizador</option>
        </select>

        <button class="secondary-button table-clear" type="button">Limpiar</button>

        <span id="gitCommitsCount" class="table-count">0 registros</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Herramienta</th>
              <th>Fecha</th>
              <th>Commit</th>
              <th>Mensaje</th>
              <th>Autor</th>
              <th>Branch</th>
              <th>Archivos</th>
              <th>Ins</th>
              <th>Del</th>
            </tr>
          </thead>

          <tbody id="gitCommitsTable"></tbody>
        </table>
      </div>
    </section>
  `;
};

window.RMCComponents.logPanel = function logPanel() {
  return `
    <section id="log-container" class="log-container log-collapsed">
      <div class="log-header">
        <span>Log de Consola</span>

        <div class="log-actions">
          <button id="btnToggleLog" type="button">Mostrar</button>
          <button id="btnClearLog" type="button">Limpiar</button>
        </div>
      </div>

      <div id="terminal"></div>
    </section>
  `;
};

window.RMCComponents.accessModal = function accessModal() {
  return `
    <dialog id="accessModal" class="modal access-modal">
      <form method="dialog">
        <div class="modal-header">
          <div>
            <span class="modal-eyebrow">Acceso provisional</span>
            <h3>RMC Control Center</h3>
          </div>

          <button id="btnCloseAccessModal" class="secondary-button" type="button">Cerrar</button>
        </div>

        <p class="access-note">
          Pantalla preparada para integrar usuarios y permisos en una fase posterior.
        </p>

        <label>
          Usuario
          <input type="text" name="username" autocomplete="username" placeholder="Usuario RMC" disabled>
        </label>

        <label>
          Password
          <input type="password" name="password" autocomplete="current-password" placeholder="Pendiente de integrar" disabled>
        </label>

        <div class="modal-actions">
          <button class="secondary-button" type="button" data-close-access>Cerrar</button>
          <button type="button" disabled>Acceder</button>
        </div>
      </form>
    </dialog>
  `;
};

window.RMCComponents.renderApp = function renderApp(root) {
  root.innerHTML = `
    <header class="top-navbar">
      <button id="sidebarToggle" class="sidebar-toggle" type="button" aria-label="Abrir menu">
        <i class="fi fi-br-menu-burger" aria-hidden="true"></i>
      </button>

      <span class="top-navbar-title">RMC Control Center</span>
    </header>

    <div id="sidebarOverlay" class="sidebar-overlay" aria-hidden="true"></div>

    <div class="app-layout">
      ${window.RMCComponents.sidebar()}

      <main class="content">
        ${window.RMCComponents.dashboardView()}
        ${window.RMCComponents.nikeView()}
        ${window.RMCComponents.mockupView()}
        ${window.RMCComponents.rapid27View()}
        ${window.RMCComponents.exportsView()}
        ${window.RMCComponents.registryView()}
        ${window.RMCComponents.gitHistoryView()}
      </main>
    </div>

    ${window.RMCComponents.logPanel()}
    ${window.RMCComponents.accessModal()}

    <footer class="footer-credits">
      Creado por Jose Alberto Villarreal Garcia
    </footer>

  `;
};
