# CURRENT_STATE.md

Memoria caliente de `RMC Control Center`.

Ultima reorganizacion documental: 2026-06-25.

## Estado actual

Panel interno Node/Express para visualizar herramientas CEP de RMC en LAN. El frontend es HTML/CSS/JS vanilla servido desde `public/`. La base SQLite compartida se configura con `RMC_DB_PATH`.

El Control Center debe seguir siendo consumidor/visualizador de datos operativos. No registra produccion nueva, no corrige items y no escribe las tablas operativas de RMCOp-Nike ni RMC MockupTool.

Excepcion documentada: el modulo de sincronizacion externa escribe tablas auxiliares propias de RMCCC para espejear Exceles compartidos, como `rmc_external_sources`, `rmc_sync_runs` y `rmc_print_sublimation_log`. Ver `docs/sqlite/database-sync.md`.

## Herramientas integradas

- `RMCOp-Nike`: pedidos, piezas, items, commits, archivos de produccion y reportes Excel.
- `RMC MockupTool`: maquetas/mockups generados, faltantes, items y reportes Excel.
- Sincronizacion externa inicial: reporte de impresores `Reporte de Impresion y Reposicioes.xlsx` hacia `rmc_print_sublimation_log`.
- Polling automatico de fuentes externas activas por `mtime`/`size`.

MockupTool es complemento visual de RMCOp-Nike: genera maquetas/mockups, no plantillas/archivos que entran a produccion.

En la UI, `pdfs_generados` se presenta como `Plantillas` o `Maquetas`, no como PDFs.

## Rutas principales

- `GET /health`
- `GET /api/dashboard`
- `GET /api/dashboard/registry`
- `GET /api/dashboard/tables`
- `GET /api/nike/runs`
- `GET /api/nike/runs/:id`
- `GET /api/nike/items/:id/print-sublimation`
- `GET /api/mockup/runs`
- `GET /api/mockup/runs/:id`
- `GET /api/reports/nike/:id/excel`
- `GET /api/reports/mockup/:id/excel`
- `GET /api/files/nike/:itemId/:fileType/view`
- `GET /api/files/nike/:itemId/:fileType/download`
- `GET /api/files/mockup/:itemId/maqueta/view`
- `GET /api/files/mockup/:itemId/maqueta/download`
- `GET /api/sync/sources`
- `POST /api/sync/sources/:id/run`
- `GET /api/sync/sources/:id/runs`

## Codigo principal

- `src/server.js`: Express, static files, rutas API y LAN. Monta tambien `/api/sync`.
- `src/db.js`: conexion SQLite por `RMC_DB_PATH`.
- `src/routes/dashboard.routes.js`: metricas generales, Registry y conteo de tablas.
- `src/routes/nike.routes.js`: listado y detalle agrupado de Nike; tambien endpoint item -> impresion/sublimado.
- `src/routes/mockup.routes.js`: listado y detalle agrupado de MockupTool.
- `src/routes/reports.routes.js`: Excel Nike y MockupTool.
- `src/routes/files.routes.js`: view/download con validacion bajo `RMC_FILE_ROOT`.
- `src/routes/sync.routes.js`: fuentes externas y sincronizacion manual.
- `src/services/nikeGroups.js`: agrupacion Nike por fecha de embarque y ano.
- `src/services/mockupGroups.js`: agrupacion MockupTool por fecha de embarque y ano.
- `src/services/nikeFiles.js`: paths de maqueta/plantilla para items Nike.
- `src/services/printSublimationSync.js`: lectura/sync del Excel de impresores.
- `src/services/syncPoller.js`: polling automatico de fuentes externas activas.
- `public/js/app.js`: carga de APIs, render, filtros, sort y graficas SVG.
- `public/js/components/`: componentes HTML sin imports ni bundler.

## Scripts auxiliares

- `scripts/create-sync-tables.js`: crea/verifica tablas auxiliares de sync.
- `scripts/register-print-source.js`: registra la fuente del Excel de impresores.
- `scripts/preview-print-source.js`: lee Excel sin guardar, para diagnostico.
- `scripts/sync-print-source.js`: ejecuta sync real por consola.
- `scripts/check-print-duplicates.js`: diagnostica duplicados de `natural_key` y `row_hash`.

## Tablas leidas

- `cep_registry`
- `rmcop_nike_runs`
- `rmcop_nike_items`
- `rmcop_nike_git_commits`
- `rmc_mockuptool_runs`
- `rmc_mockuptool_items`
- `rmc_external_sources`
- `rmc_sync_runs`
- `rmc_print_sublimation_log`

## Tablas auxiliares escritas por RMCCC

- `rmc_external_sources`
- `rmc_sync_runs`
- `rmc_print_sublimation_log`

No escribir desde RMCCC en tablas operativas CEP como `rmcop_nike_items`, `rmcop_nike_runs`, `rmc_mockuptool_items` o `rmc_mockuptool_runs` salvo instruccion explicita y documentada.

## Reglas operativas vigentes

- Registry es de consulta desde la UI; no hay alta manual activa desde Control Center.
- Las ejecuciones de Nike y MockupTool se agrupan por `fecha_embarque` y ano.
- El detalle de un embarque consolida todos los runs del grupo.
- Los reportes Excel exportan todos los items del grupo, no solo un run aislado.
- Los archivos se sirven por endpoint, no por rutas directas del navegador.
- El servidor escucha en `0.0.0.0` para acceso LAN.
- RMCCC no reemplaza Exceles operativos de cada area; los puede leer como fuentes externas y espejear en tablas auxiliares.
- El reporte de impresores se cruza inicialmente con Nike por `work_order = wo`.
- Una fila del reporte de impresores puede representar varias piezas Nike.
- Si `fecha_embarque` contiene `*PARCIAL`, el registro debe preservarse como bajada parcial independiente.
- Fechas internas de sync pueden venir en UTC; UI debe usar campos `*_display` cuando existan.
- La tabla `Detalle Nike` muestra estado operativo por area: `En proceso de impresion`, `Bajado a Sublimado` o `Parcial en Sublimado`.
- El modal de item Nike muestra bloque `Impresion / Sublimado` consumiendo `GET /api/nike/items/:id/print-sublimation`.

## Pendientes inmediatos conocidos

- Mantener documentacion en `docs/` sincronizada con cambios reales.
- Validar cualquier cambio de dashboard contra `docs/processes/DASHBOARD_AND_REPORTS.md`.
- Revisar impacto de nuevas herramientas CEP en `TOOL_REGISTRY.md` antes de implementar.
- Considerar autenticacion solo si se expone fuera de LAN confiable.
- Validar cadencia real del polling automatico en operacion diaria.

## Checks utiles

```bash
npm run test:api
```

```bash
node --check src/server.js
node --check src/routes/dashboard.routes.js
node --check src/routes/nike.routes.js
node --check src/routes/mockup.routes.js
node --check src/routes/reports.routes.js
node --check src/routes/files.routes.js
node --check src/routes/sync.routes.js
node --check src/services/printSublimationSync.js
```

Pruebas manuales utiles:

```bash
node scripts/preview-print-source.js 1
node scripts/sync-print-source.js 1
curl -X POST http://localhost:3000/api/sync/sources/1/run
curl http://localhost:3000/api/nike/items/167/print-sublimation
```

Para cambios documentales solamente, revisar `git diff -- '*.md'`.
