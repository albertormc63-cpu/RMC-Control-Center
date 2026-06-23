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

Codigo relevante:

- `src/server.js`
- `src/routes/*.routes.js`

## SQLite

Leer:

- `docs/sqlite/SQLITE_READ_MODEL.md`
- `docs/integrations/RMCOP_NIKE_CONTRACT.md` para Nike
- `docs/integrations/RMC_MOCKUPTOOL_CONTRACT.md` para MockupTool

Codigo relevante:

- `src/db.js`
- `src/routes/dashboard.routes.js`
- `src/routes/nike.routes.js`
- `src/routes/mockup.routes.js`

## LAN y archivos

Leer:

- `docs/lan/LAN_AND_FILES.md`
- `docs/api/API_ROUTES.md`

Codigo relevante:

- `src/server.js`
- `src/routes/files.routes.js`
- `src/services/nikeFiles.js`

## UI

Leer:

- `docs/ui/UI_CONTRACT.md`
- `docs/processes/DASHBOARD_AND_REPORTS.md` si toca dashboard o tablas

Codigo relevante:

- `public/index.html`
- `public/css/style.css`
- `public/js/app.js`
- `public/js/components/*.js`

## Integraciones

Para RMCOp-Nike leer:

- `docs/integrations/RMCOP_NIKE_CONTRACT.md`
- `docs/sqlite/SQLITE_READ_MODEL.md`

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

No abrir specs historicas completas si la tarea puede resolverse con los documentos anteriores.
