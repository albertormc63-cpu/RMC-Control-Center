# CURRENT_STATE.md

Memoria caliente de `RMC Control Center`.

Ultima reorganizacion documental: 2026-06-25.

## Estado actual

Panel interno Node/Express para visualizar herramientas CEP de RMC en LAN. El frontend es HTML/CSS/JS vanilla servido desde `public/`. La base SQLite compartida se configura con `RMC_DB_PATH`.

El Control Center debe seguir siendo consumidor/visualizador de datos operativos. No registra produccion nueva, no corrige items y no escribe las tablas operativas de RMCOp-Nike ni RMC MockupTool.

Excepcion documentada: el modulo de sincronizacion externa escribe tablas auxiliares propias de RMCCC para espejear Exceles compartidos y auditar consolidaciones, como `rmc_external_sources`, `rmc_sync_runs`, `rmc_sync_record_map`, `rmc_print_sublimation_log` y `rmc_sublimation_output_log`. Ver `docs/sqlite/database-sync.md`.

Excepcion Op-Nike: la pantalla `Catalogo Op-Nike` administra `rmc_nike_style_families` y `rmc_nike_style_variants` para configurar familias, variantes, aliases y reglas de ruta/nombre. No escribe runs ni items de produccion.

Excepcion chat LAN: el chat grupal escribe solamente las tablas auxiliares `rmc_chat_messages` y `rmc_chat_reactions`. La IP de la conexion identifica provisionalmente cada mensaje y reaccion hasta integrar usuarios.

## Herramientas integradas

- `RMCOp-Nike`: pedidos, piezas, items, commits, archivos de produccion y reportes Excel.
- `RMC MockupTool`: maquetas/mockups generados, faltantes, items y reportes Excel.
- Sincronizacion externa inicial: reporte de impresores `Reporte de Impresion y Reposiciones.xlsx` hacia `rmc_print_sublimation_log`.
- Sincronizacion externa de Sublimado: `PRODUCCION SUBLIMADO  2026.xlsb` hacia `rmc_sublimation_output_log`, leyendo `A1:M20000`.
- Sincronizacion Nike por operador: BDs `RMC_CEP.sqlite` por operador bajo `RMCOp-NIKE/ASSETS/BD`, registradas como `operator_sqlite_rmcop_nike`, consolidadas con prefijo de operador en `run_id` y auditadas en `rmc_sync_record_map`.
- Sincronizacion Optimizador por operador: BDs `RMC_CEP.sqlite` por operador bajo `RMCOp-NIKE/ASSETS/BD`, registradas como `operator_sqlite_rmc_optimizador`, consolidadas hacia `rmc_opt_*` con IDs centrales nuevos y auditoria en `rmc_sync_record_map`.
- Polling automatico de fuentes externas activas por `mtime`/`size`, ejecutado en worker hijo levantado por el server, con mensajes separados para `Impresores Excel` y `Sublimado Excel`, incluso cuando no hay cambios de archivo.
- Bajas auxiliares de items Nike cancelados por cliente en `rmc_nike_item_cancellations`; no borran ni modifican `rmcop_nike_items`.
- Panel 27 / Rapid en modo lectura sobre `rmc_opt_orders`, `rmc_opt_order_lines`, `rmc_opt_roster_outputs` y `rmc_opt_assets`, con cruce operativo contra Impresion y Sublimado.
- Bajas auxiliares de pedidos 27 / Rapid cancelados por cliente en `rmc_rapid27_order_cancellations`; no borran ni modifican `rmc_opt_*`.

MockupTool es complemento visual de RMCOp-Nike: genera maquetas/mockups, no plantillas/archivos que entran a produccion.

En la UI, `pdfs_generados` se presenta como `Plantillas` o `Maquetas`, no como PDFs.

## Rutas principales

- `GET /health`
- `GET /api/dashboard`
- `POST /api/production/schedule/upload`
- `GET /api/production/daily`
- `GET /api/dashboard/registry`
- `GET /api/dashboard/tables`
- `GET /api/nike/runs`
- `GET /api/nike/runs/:id`
- `GET /api/nike/runs/:id/items`
- `GET /api/nike/items/:id/print-sublimation`
- `POST /api/nike/items/:id/cancel`
- `GET /api/nike/catalog`
- `POST /api/nike/catalog/unlock`
- `POST /api/nike/catalog/families`
- `PUT /api/nike/catalog/families/:styleFamily`
- `POST /api/nike/catalog/variants`
- `PUT /api/nike/catalog/variants/:id`
- `POST /api/nike/catalog/variants/validate`
- `POST /api/nike/catalog/variants/:id/validate`
- `POST /api/nike/catalog/variants/:id/activate`
- `GET /api/mockup/runs`
- `GET /api/mockup/runs/:id`
- `GET /api/reports/nike/:id/excel`
- `GET /api/reports/mockup/:id/excel`
- `GET /api/files/nike/:itemId/:fileType/view`
- `GET /api/files/nike/:itemId/:fileType/download`
- `GET /api/files/mockup/:itemId/maqueta/view`
- `GET /api/files/mockup/:itemId/maqueta/download`
- `GET /api/git-commits`
- `GET /api/git-commits/:tool_key`
- `GET /api/git-commits/summary`
- `GET /api/sync/sources`
- `POST /api/sync/sources`
- `PUT /api/sync/sources/:id`
- `POST /api/sync/sources/:id/run`
- `GET /api/sync/sources/:id/runs`
- `GET /api/sync/operator-databases`
- `POST /api/sync/operator-databases/optimizador/run`
- `GET /api/chat/messages`
- `POST /api/chat/messages`
- `GET /api/chat/reactions`
- `PUT /api/chat/messages/:id/reaction`
- `GET /api/optimizador/rapid27/availability`
- `GET /api/optimizador/rapid27/summary`
- `GET /api/optimizador/rapid27/shipments`
- `GET /api/optimizador/rapid27/shipments/:shipmentKey`
- `GET /api/optimizador/rapid27/orders`
- `GET /api/optimizador/rapid27/orders/:id`
- `POST /api/optimizador/rapid27/orders/:id/cancel`

## Codigo principal

- `src/server.js`: Express, static files, rutas API y LAN. Monta tambien `/api/sync` y levanta el worker interno de polling.
- `src/syncWorker.js`: proceso hijo de polling/sync externo iniciado automaticamente por el server.
- `src/db.js`: conexion SQLite por `RMC_DB_PATH`.
- `src/routes/dashboard.routes.js`: metricas generales, Registry y conteo de tablas.
- `src/routes/production.routes.js`: resumen operativo de Produccion diaria para pantallas de planta, usando fuentes espejo de Impresion y Sublimado.
- `src/routes/nike.routes.js`: listado, detalle agrupado, baja auxiliar de Nike y endpoint item -> impresion/sublimado.
- `src/routes/nikeCatalog.routes.js`: administracion acotada del catalogo Op-Nike.
- `src/routes/mockup.routes.js`: listado y detalle agrupado de MockupTool.
- `src/routes/reports.routes.js`: Excel Nike y MockupTool.
- `src/routes/files.routes.js`: view/download con validacion bajo `RMC_FILE_ROOT`.
- `src/routes/gitCommits.routes.js`: historial tecnico centralizado de commits del RMC Control System.
- `src/routes/sync.routes.js`: fuentes externas, ajuste de rutas de polling y sincronizacion manual.
- `src/routes/chat.routes.js`: lectura y envio del chat grupal LAN.
- `src/routes/rapid27.routes.js`: resumen, embarques, pedidos, detalle y baja auxiliar para 27/Rapid.
- `src/services/nikeGroups.js`: agrupacion Nike por fecha de embarque y ano.
- `src/services/nikeCancellations.js`: tabla auxiliar y filtro de bajas de items Nike.
- `src/services/mockupGroups.js`: agrupacion MockupTool por fecha de embarque y ano.
- `src/services/nikeFiles.js`: paths de maqueta/plantilla para items Nike.
- `src/services/rmcFileResolver.js`: validacion segura y relocalizacion de archivos movidos dentro de `/Volumes/Fullsize`.
- `src/services/opNikeCatalog.js`: validacion y preview de reglas del catalogo Op-Nike.
- `src/services/gitCommits.js`: consultas de `rmc_git_commits`.
- `src/services/printSublimationSync.js`: lectura/sync del Excel de impresores.
- `src/services/operatorOptimizerSync.js`: consolidacion manual de tablas `rmc_opt_*` desde BDs por operador hacia la central, con snapshot temporal, remapeo de IDs y auditoria.
- `src/services/syncPoller.js`: polling automatico de fuentes externas activas, con timers apagables para correr en worker.
- `src/services/chatMessages.js`: esquema auxiliar, validacion, persistencia e IP del chat.
- `src/services/rapid27Tracking.js`: normalizacion de embarques, agregados, cruces operativos de las tablas `rmc_opt_*` y filtro por bajas auxiliares.
- `src/services/dailyProductionSchedule.js`: carga/lectura del Excel diario `Production Schedule Book`, filtros de lineas y `To DC`, suma de `WO Eaches` y WOs base para `Produccion diaria`.
- `public/js/app.js`: carga de APIs, render, filtros, sort y graficas SVG.
- `public/js/components/`: componentes HTML sin imports ni bundler.

## Scripts auxiliares

- `scripts/create-sync-tables.js`: crea/verifica tablas auxiliares de sync.
- `scripts/create-git-commits-table.js`: crea/verifica `rmc_git_commits` y migra commits legacy Nike.
- `scripts/import_git_commits.py`: importa commits Git locales hacia `rmc_git_commits`.
- `scripts/git_commit_sources.json`: fuentes configuradas para importar commits por herramienta.
- `scripts/register-print-source.js`: registra la fuente del Excel de impresores.
- `scripts/preview-print-source.js`: lee Excel sin guardar, para diagnostico.
- `scripts/sync-print-source.js`: ejecuta sync real por consola.
- `scripts/sync-operator-nike-databases.js`: consolida BDs SQLite por operador de RMCOp-Nike hacia la BD central, con snapshots temporales, dry-run, prefijo de `run_id`, dedupe por `clave`/`path` y auditoria en `rmc_sync_record_map`.
- `scripts/sync-operator-optimizer-databases.js`: consolida `rmc_opt_orders`, `rmc_opt_order_lines`, `rmc_opt_roster_outputs` y `rmc_opt_assets` desde BDs SQLite por operador hacia la BD central sin copiar IDs fuente.
- `scripts/check-print-duplicates.js`: diagnostica duplicados de `natural_key` y `row_hash`.

## Tablas leidas

- `cep_registry`
- `rmcop_nike_runs`
- `rmcop_nike_items`
- `rmcop_nike_git_commits`
- `rmc_nike_style_families`
- `rmc_nike_style_variants`
- `rmc_git_commits`
- `rmc_mockuptool_runs`
- `rmc_mockuptool_items`
- `rmc_external_sources`
- `rmc_sync_runs`
- `rmc_print_sublimation_log`
- `rmc_sublimation_output_log`
- `rmc_chat_messages`
- `rmc_chat_reactions`
- `rmc_nike_item_cancellations`
- `rmc_rapid27_order_cancellations`
- `rmc_opt_orders`
- `rmc_opt_order_lines`
- `rmc_opt_roster_outputs`
- `rmc_opt_assets`

## Tablas auxiliares escritas por RMCCC

- `rmc_external_sources`
- `rmc_sync_runs`
- `rmc_print_sublimation_log`
- `rmc_sublimation_output_log`
- `rmc_sync_record_map`
- `rmc_nike_style_families`
- `rmc_nike_style_variants`
- `rmc_chat_messages`
- `rmc_chat_reactions`
- `rmc_nike_item_cancellations`
- `rmc_rapid27_order_cancellations`

No escribir desde RMCCC en tablas operativas CEP como `rmcop_nike_items`, `rmcop_nike_runs`, `rmc_mockuptool_items` o `rmc_mockuptool_runs` salvo instruccion explicita y documentada. Excepcion documentada: la sincronizacion Optimizador por operador puede insertar/actualizar `rmc_opt_*` en la BD central usando IDs centrales nuevos y mapa de auditoria; no modifica BDs de operadores ni la logica interna de RMC Optimizador.

Las tablas `rmc_nike_style_families` y `rmc_nike_style_variants` son catalogo/configuracion Op-Nike. Antes de permitir `opnike_rule_status = active`, RMCCC valida campos obligatorios y mantiene `draft`, `shadow`, `active` e `inactive`.

`Produccion diaria` vive como entrada directa del sidebar para proyectarse en pantallas de planta. Permite cargar el Excel diario desde `Examinar Excel`; el servidor guarda la copia activa en `data/daily-production/current-schedule.xlsm` (ignorada por Git). Toma `Piezas totales` del `Production Schedule Book`, hoja `ProdSched`, filtrando `Sew Unit` por lineas seleccionadas y `To DC` vacio, y sumando `WO Eaches`. El default visual es `27 Sports + Rapid` (`27SPTS`, `RAPIDA`, `RAPIDT`). Impresion y Sublimado cruzan los `Work Order` de esa lista contra `rmc_print_sublimation_log` y `rmc_sublimation_output_log`; Costura/Final queda pendiente hasta definir su Excel/fuente.

`Sistema` muestra `Ajustes` como hub tipo dashboard para no extender el sidebar. Desde ahi se abre `Catalogo Op-Nike`, `Ajuste de Rutas Polling`, Exportaciones, CEP Registry e Historial de desarrollo.

`Catalogo Op-Nike` vive bajo `Sistema / Ajustes` y usa PIN temporal para administracion en LAN. Default actual: `290497`, configurable por `RMC_OPNIKE_ADMIN_PIN`. El desbloqueo es efimero por vista: al salir del catalogo o presionar `Bloquear`, vuelve a pedir PIN al entrar.

`Ajuste de Rutas Polling` edita `rmc_external_sources` para cambiar nombre, area, ruta de archivo, hoja y estado activo de fuentes externas soportadas. Tambien permite dar de alta fuentes nuevas de tipos soportados por el worker (`print_sublimation_excel` y `sublimation_output_excel`). Si cambia ruta u hoja, limpia `last_mtime_ms` y `last_size_bytes` para que el worker detecte la siguiente lectura.

## Reglas operativas vigentes

- Registry es de consulta desde la UI; no hay alta manual activa desde Control Center.
- Las ejecuciones de Nike y MockupTool se agrupan por `fecha_embarque` y ano.
- El detalle de un embarque consolida todos los runs del grupo.
- El detalle Nike carga encabezado/resumen primero y pagina items desde `GET /api/nike/runs/:id/items`; la busqueda se aplica en SQL sobre todo el embarque, no solo sobre la pagina visible.
- Los reportes Excel exportan todos los items del grupo, no solo un run aislado.
- Los archivos se sirven por endpoint, no por rutas directas del navegador.
- Los paths historicos de SQLite no se reescriben cuando el volumen archiva carpetas; `rmcFileResolver` busca candidatos seguros bajo `TO PRINT/NIKE ORDERS`, carpetas mensuales/anuales y listas Nike/On Demand.
- El servidor escucha en `0.0.0.0` para acceso LAN.
- El servidor agrega `X-RMC-Duration-Ms` a respuestas `/api/*` y registra en consola endpoints lentos desde `RMC_API_SLOW_MS` (default `500` ms); `RMC_API_TIMING_ENABLED=false` lo desactiva.
- El access log omite por default los `GET` periodicos del chat; `RMC_ACCESS_LOG_POLLING_ENABLED=true` permite registrarlos para diagnostico.
- RMCCC no reemplaza Exceles operativos de cada area; los puede leer como fuentes externas y espejear en tablas auxiliares.
- El reporte de impresores se cruza inicialmente con Nike por `work_order = wo`.
- Una fila del reporte de impresores puede representar varias piezas Nike.
- Si `fecha_embarque` contiene `*PARCIAL`, el registro debe preservarse como bajada parcial independiente.
- Fechas internas de sync pueden venir en UTC; UI debe usar campos `*_display` cuando existan.
- La tabla `Detalle Nike` muestra estado operativo por area: `En proceso de impresion`, `Bajado a Sublimado` o `Parcial en Sublimado`.
- Si una pieza aparece activa en `rmc_sublimation_output_log`, el estado operativo se presenta como `En almacen`.
- El modal de item Nike muestra tracking tipo historial por area consumiendo `GET /api/nike/items/:id/print-sublimation`.
- El modal de item Nike permite `Dar de baja` un registro cancelado; la baja se guarda en tabla auxiliar y se descuenta de dashboard, embarques, detalles y Excel.
- El Dashboard principal muestra `Seguimiento operativo 27 / Rapid` con cards, flujo y grafica por embarque; el bloque Dashboard de MockupTool queda oculto temporalmente porque no es esencial para seguimiento operativo.
- El modal de pedido 27 / Rapid permite `Dar de baja` un pedido cancelado; la baja se guarda en tabla auxiliar y se descuenta de cards, embarques y detalles.

## Pendientes inmediatos conocidos

- Mantener documentacion en `docs/` sincronizada con cambios reales.
- Validar cualquier cambio de dashboard contra `docs/processes/DASHBOARD_AND_REPORTS.md`.
- Revisar impacto de nuevas herramientas CEP en `TOOL_REGISTRY.md` antes de implementar.
- Considerar autenticacion solo si se expone fuera de LAN confiable.
- Validar cadencia real del polling automatico en operacion diaria.
- Observar locks SQLite durante sync externo; `busy_timeout` del panel evita fallos por locks cortos.

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
node --check src/services/syncPoller.js
```

Pruebas manuales utiles:

```bash
node scripts/preview-print-source.js 1
node scripts/sync-print-source.js 1
node scripts/preview-sublimation-source.js
node scripts/sync-sublimation-source.js
curl -X POST http://localhost:3000/api/sync/sources/1/run
curl http://localhost:3000/api/nike/items/167/print-sublimation
```

Para cambios documentales solamente, revisar `git diff -- '*.md'`.
