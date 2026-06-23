# CURRENT_STATE.md

Memoria caliente de `RMC Control Center`.

Ultima reorganizacion documental: 2026-06-23.

## Estado actual

Panel interno Node/Express para visualizar herramientas CEP de RMC en LAN. El frontend es HTML/CSS/JS vanilla servido desde `public/`. La base SQLite compartida se configura con `RMC_DB_PATH`.

El Control Center debe seguir siendo consumidor/visualizador de datos. No registra produccion nueva, no corrige items, no genera tablas CEP y no escribe las tablas operativas de RMCOp-Nike ni RMC MockupTool.

## Herramientas integradas

- `RMCOp-Nike`: pedidos, piezas, items, commits y reportes Excel.
- `RMC MockupTool`: maquetas/plantillas generadas, faltantes, items y reportes Excel.

En la UI, `pdfs_generados` se presenta como `Plantillas` o `Maquetas`, no como PDFs.

## Rutas principales

- `GET /health`
- `GET /api/dashboard`
- `GET /api/dashboard/registry`
- `GET /api/dashboard/tables`
- `GET /api/nike/runs`
- `GET /api/nike/runs/:id`
- `GET /api/mockup/runs`
- `GET /api/mockup/runs/:id`
- `GET /api/reports/nike/:id/excel`
- `GET /api/reports/mockup/:id/excel`
- `GET /api/files/nike/:itemId/:fileType/view`
- `GET /api/files/nike/:itemId/:fileType/download`
- `GET /api/files/mockup/:itemId/maqueta/view`
- `GET /api/files/mockup/:itemId/maqueta/download`

## Codigo principal

- `src/server.js`: Express, static files, rutas API y LAN.
- `src/db.js`: conexion SQLite por `RMC_DB_PATH`.
- `src/routes/dashboard.routes.js`: metricas generales, Registry y conteo de tablas.
- `src/routes/nike.routes.js`: listado y detalle agrupado de Nike.
- `src/routes/mockup.routes.js`: listado y detalle agrupado de MockupTool.
- `src/routes/reports.routes.js`: Excel Nike y MockupTool.
- `src/routes/files.routes.js`: view/download con validacion bajo `RMC_FILE_ROOT`.
- `src/services/nikeGroups.js`: agrupacion Nike por fecha de embarque y ano.
- `src/services/mockupGroups.js`: agrupacion MockupTool por fecha de embarque y ano.
- `src/services/nikeFiles.js`: paths de maqueta/plantilla para items Nike.
- `public/js/app.js`: carga de APIs, render, filtros, sort y graficas SVG.
- `public/js/components/`: componentes HTML sin imports ni bundler.

## Tablas leidas

- `cep_registry`
- `rmcop_nike_runs`
- `rmcop_nike_items`
- `rmcop_nike_git_commits`
- `rmc_mockuptool_runs`
- `rmc_mockuptool_items`

## Reglas operativas vigentes

- Registry es de consulta desde la UI; no hay alta manual activa desde Control Center.
- Las ejecuciones de Nike y MockupTool se agrupan por `fecha_embarque` y ano.
- El detalle de un embarque consolida todos los runs del grupo.
- Los reportes Excel exportan todos los items del grupo, no solo un run aislado.
- Los archivos se sirven por endpoint, no por rutas directas del navegador.
- El servidor escucha en `0.0.0.0` para acceso LAN.

## Pendientes inmediatos conocidos

- Mantener documentacion en `docs/` sincronizada con cambios reales.
- Validar cualquier cambio de dashboard contra `docs/processes/DASHBOARD_AND_REPORTS.md`.
- Revisar impacto de nuevas herramientas CEP en `TOOL_REGISTRY.md` antes de implementar.
- Considerar autenticacion solo si se expone fuera de LAN confiable.

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
```

Para cambios documentales solamente, revisar `git diff -- '*.md'`.
