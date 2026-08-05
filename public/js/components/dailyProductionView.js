// Componente Produccion diaria: tablero de proyeccion para pantallas de planta.
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.dailyProductionView = function dailyProductionView() {
  return `
    <section id="daily-production-view" class="view daily-production-view">
      <div class="daily-production-toolbar">
        <div class="view-header">
          <div>
            <h2>Produccion diaria</h2>
            <p id="dailyProductionUpdatedAt" class="settings-intro">Sin lectura reciente</p>
          </div>
        </div>

        <form id="dailyProductionTargetForm" class="daily-production-target-form">
          <button id="btnDailyProductionLines" class="secondary-button" type="button">Lineas</button>
          <button id="btnUploadDailyProductionSchedule" class="secondary-button" type="button">Examinar Excel</button>
          <input id="dailyProductionScheduleFile" class="hidden-file-input" type="file" accept=".xlsm,.xlsx,.xlsb">
          <button id="btnRefreshDailyProduction" class="secondary-button" type="button">Actualizar</button>
          <button id="btnDailyProductionFullscreen" class="secondary-button" type="button">Pantalla</button>
        </form>
      </div>

      <section class="production-board" aria-label="Produccion diaria">
        <div class="production-board-header">
          <span>PIEZAS TOTALES</span>
          <strong id="productionTotalPieces">0</strong>
          <time id="productionBoardDate">--/--/--</time>
        </div>

        <div class="production-stage" data-stage="printed" data-status="pending">
          <div class="production-stage-metrics">
            <span>IMPRESAS</span>
            <strong id="productionPrintedPieces">0</strong>
            <b id="productionPrintedPercent">--%</b>
          </div>
          <div id="productionPrintedBar" class="production-segment-bar" aria-hidden="true"></div>
        </div>

        <div class="production-stage" data-stage="sublimated" data-status="pending">
          <div class="production-stage-metrics">
            <span>SUBLIMADAS</span>
            <strong id="productionSublimatedPieces">0</strong>
            <b id="productionSublimatedPercent">--%</b>
          </div>
          <div id="productionSublimatedBar" class="production-segment-bar" aria-hidden="true"></div>
        </div>

        <div class="production-stage" data-stage="finished" data-status="pending">
          <div class="production-stage-metrics">
            <span>TERMINADAS</span>
            <strong id="productionFinishedPieces">PEND.</strong>
            <b id="productionFinishedPercent">--%</b>
          </div>
          <div id="productionFinishedBar" class="production-segment-bar" aria-hidden="true"></div>
        </div>
      </section>

      <div class="production-source-strip">
        <span id="productionScheduleSource">Lista diaria: sin archivo</span>
        <span id="productionPrintSource">Impresion: sin fuente</span>
        <span id="productionSublimationSource">Sublimado: sin fuente</span>
        <span id="productionFinishedSource">Costura/Final: pendiente</span>
      </div>

      <dialog id="dailyProductionLinesModal" class="modal production-lines-modal">
        <form id="dailyProductionLinesForm">
          <div class="modal-header">
            <div>
              <span class="modal-eyebrow">Produccion diaria</span>
              <h3>Lineas visibles</h3>
            </div>

            <button id="btnCloseDailyProductionLines" class="secondary-button" type="button">Cerrar</button>
          </div>

          <div id="dailyProductionLineOptions" class="production-line-options"></div>

          <div class="modal-actions">
            <button class="secondary-button" type="button" data-close-daily-production-lines>Cerrar</button>
            <button type="submit">Aplicar</button>
          </div>
        </form>
      </dialog>
    </section>
  `;
};
