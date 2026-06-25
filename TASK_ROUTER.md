# TASK_ROUTER.md

Router de contexto para reducir tokens en Codex.

Leer primero `CURRENT_STATE.md`. Despues abrir solo los documentos y archivos indicados por el tipo de tarea.

## Dashboard

Leer:

- `docs/processes/DASHBOARD_AND_REPORTS.md`
- `docs/sqlite/SQLITE_READ_MODEL.md`
- `docs/ui/UI_CONTRACT.md` si cambia presentacion

Codigo relevante:

- `src/routes/dashboard.routes.js`
- `public/js/app.js`
- `public/js/components/dashboardView.js`

## Reportes

Leer:

- `docs/processes/DASHBOARD_AND_REPORTS.md`
- `docs/api/API_ROUTES.md`
- Integracion correspondiente en `docs/integrations/`

Codigo relevante:

- `src/routes/reports.routes.js`
- `src/services/nikeGroups.js`
- `src/services/mockupGroups.js`

## API

Leer:

- `docs/api/API_ROUTES.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/sqlite/database-sync.md` si la API toca fuentes externas, sync, Exceles compartidos o cruce impresion/sublimado.

Codigo relevante:

- `src/server.js`
- `src/routes/*.routes.js`

## SQLite

Leer:

- `docs/sqlite/SQLITE_READ_MODEL.md`
- `docs/integrations/RMCOP_NIKE_CONTRACT.md` para Nike
- `docs/integrations/RMC_MOCKUPTOOL_CONTRACT.md` para MockupTool
- `docs/sqlite/database-sync.md` para tablas auxiliares `rmc_external_sources`, `rmc_sync_runs` y `rmc_print_sublimation_log`.

Codigo relevante:

- `src/db.js`
- `src/routes/dashboard.routes.js`
- `src/routes/nike.routes.js`
- `src/routes/mockup.routes.js`
- `src/routes/sync.routes.js` para fuentes externas
- `src/services/printSublimationSync.js` para sync de Exceles

## LAN y archivos

Leer:

- `docs/lan/LAN_AND_FILES.md`
- `docs/api/API_ROUTES.md`
- `docs/sqlite/database-sync.md` si la tarea toca archivos Excel en volumen montado `/Volumes/...`.

Codigo relevante:

- `src/server.js`
- `src/routes/files.routes.js`
- `src/services/nikeFiles.js`
- `src/services/printSublimationSync.js` si toca lectura de Excel compartido

## UI

Leer:

- `docs/ui/UI_CONTRACT.md`
- `docs/processes/DASHBOARD_AND_REPORTS.md` si toca dashboard o tablas
- `docs/sqlite/database-sync.md` si toca el detalle Nike, el bloque "Impresion / Sublimado" o datos del reporte de impresores.

Codigo relevante:

- `public/index.html`
- `public/css/style.css`
- `public/js/app.js`
- `public/js/components/*.js`

Para UI de detalle Nike con impresion/sublimado, revisar especialmente:

- `public/js/components/nikeView.js`
- `public/js/app.js`
- `src/routes/nike.routes.js`

## Sincronizacion externa / Exceles compartidos

Leer:

- `docs/sqlite/database-sync.md`
- `docs/api/API_ROUTES.md` si se documentan endpoints
- `docs/ui/UI_CONTRACT.md` si se muestra en frontend

Codigo relevante:

- `src/services/printSublimationSync.js`
- `src/routes/sync.routes.js`
- `src/routes/nike.routes.js`
- `src/server.js`
- `scripts/create-sync-tables.js`
- `scripts/register-print-source.js`
- `scripts/preview-print-source.js`
- `scripts/sync-print-source.js`
- `scripts/check-print-duplicates.js`

Endpoints actuales:

- `GET /api/sync/sources`
- `POST /api/sync/sources/:id/run`
- `GET /api/sync/sources/:id/runs`
- `GET /api/nike/items/:id/print-sublimation`

## Integraciones

Para RMCOp-Nike leer:

- `docs/integrations/RMCOP_NIKE_CONTRACT.md`
- `docs/sqlite/SQLITE_READ_MODEL.md`
- `docs/sqlite/database-sync.md` si se cruza Nike con impresion/sublimado.

Para RMC MockupTool leer:

- `docs/integrations/RMC_MOCKUPTOOL_CONTRACT.md`
- `docs/sqlite/SQLITE_READ_MODEL.md`

Codigo relevante:

- `src/routes/nike.routes.js`
- `src/routes/mockup.routes.js`
- `src/services/nikeGroups.js`
- `src/services/mockupGroups.js`
- `src/services/nikeFiles.js`

## CEP Registry

Leer:

- `docs/processes/TOOL_REGISTRY.md`
- `docs/sqlite/SQLITE_READ_MODEL.md`

Codigo relevante:

- `src/routes/dashboard.routes.js`
- `public/js/components/registryView.js`
- `public/js/app.js`

## Documentacion

Leer:

- `README.md`
- `CURRENT_STATE.md`
- `TASK_ROUTER.md`
- El documento especifico que se va a editar
- `docs/sqlite/database-sync.md` si la documentacion menciona Exceles externos, sync, impresion/sublimado o cruce con Nike.

No abrir specs historicas completas si la tarea puede resolverse con los documentos anteriores.
