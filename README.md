# RMC Control Center

Panel web interno para monitorear y visualizar datos de herramientas CEP de RMC.

El Control Center es consumidor de datos: lee la base SQLite compartida, agrupa ejecuciones, muestra metricas operativas, expone archivos autorizados y genera reportes Excel. No es la herramienta que produce, corrige o escribe las tablas operativas de CEPs.

## Stack

- Node.js + Express
- SQLite con `better-sqlite3`
- HTML, CSS y JavaScript vanilla
- `exceljs` para reportes Excel
- Sin framework frontend, sin bundler y sin build step

## Como correr

Configurar `.env`:

```env
RMC_DB_PATH=/Users/rmlsub1/Documents/RMC - CEP/RMC_BD/RMC_CEP.sqlite
RMC_FILE_ROOT=/Volumes/Fullsize
RMC_LAN_HOST=RMLART2.local
PORT=3000
```

Comandos:

```bash
npm install
npm run dev
```

Produccion local:

```bash
npm start
```

inicialización de tablas:
```bash
node scripts/create-sync-tables.js
```

Healthcheck:

```http
GET /health
```

## Mapa de documentacion

- `AGENTS.md`: reglas para Codex y otros agentes.
- `CURRENT_STATE.md`: memoria caliente del estado actual.
- `TASK_ROUTER.md`: que leer segun la tarea.
- `docs/architecture/ARCHITECTURE.md`: arquitectura y estructura del repo.
- `docs/api/API_ROUTES.md`: rutas HTTP y contratos de respuesta.
- `docs/sqlite/SQLITE_READ_MODEL.md`: tablas leidas por Control Center.
- `docs/sqlite/database-sync.md`: sincronizacion de fuentes externas y tablas espejo RMCCC.
- `docs/integrations/RMCOP_NIKE_CONTRACT.md`: contrato de lectura RMCOp-Nike.
- `docs/integrations/RMC_MOCKUPTOOL_CONTRACT.md`: contrato de lectura RMC MockupTool.
- `docs/processes/DASHBOARD_AND_REPORTS.md`: dashboard, agrupaciones y reportes.
- `docs/processes/TOOL_REGISTRY.md`: CEP Registry en modo lectura.
- `docs/lan/LAN_AND_FILES.md`: acceso LAN y archivos servidos.
- `docs/ui/UI_CONTRACT.md`: contrato visual y UI.

## Invariantes criticas

- Mantener Control Center como visualizador/consumidor; no convertirlo en escritor de tablas CEP.
- No mezclar reglas internas de RMCOp-Nike o RMC MockupTool; documentar solo lo que Control Center necesita para leer y mostrar.
- Mantener IDs HTML, rutas Express y contratos API estables.
- Mantener `pdfs_generados` como `Plantillas` en UI.
- Mantener lectura de archivos limitada a `RMC_FILE_ROOT`.
- Mantener el servidor escuchando en `0.0.0.0` para LAN.
