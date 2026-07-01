# API Routes

Contratos HTTP actuales de `RMC Control Center`.

## Health

```http
GET /health
```

Respuesta:

```json
{
  "ok": true,
  "service": "RMC Control Center"
}
```

## Dashboard

```http
GET /api/dashboard
```

Devuelve resumen general, Registry, metricas Nike, metricas MockupTool, series diarias, series mensuales y runs recientes para graficas.

Estructura conceptual:

```json
{
  "toolsCount": 2,
  "gitCommits": 0,
  "errores": 0,
  "registry": [],
  "nike": {
    "runs": 0,
    "pedidos": 0,
    "registros": 0,
    "piezas": 0,
    "estilos": 0,
    "ok": 0,
    "errores": 0,
    "promedioTiempo": "00:00:00",
    "daily": [],
    "monthly": [],
    "recentRuns": []
  },
  "mockup": {
    "runs": 0,
    "registros": 0,
    "plantillas": 0,
    "faltantes": 0,
    "filasSeleccionadas": 0,
    "grupos": 0,
    "disenadores": 0,
    "errores": 0,
    "daily": [],
    "monthly": [],
    "recentRuns": []
  }
}
```

## CEP Registry

```http
GET /api/dashboard/registry
```

Lista apps CEP registradas desde `cep_registry`.

```http
GET /api/dashboard/tables
```

Devuelve conteos de tablas conocidas para diagnostico.

Nota vigente: Control Center no expone alta manual activa de Registry desde la UI.

## Historial de desarrollo

```http
GET /api/git-commits
```

Lee commits centralizados desde `rmc_git_commits`.

Query params:

- `tool_key`
- `date_from`
- `date_to`
- `limit`
- `offset`

```http
GET /api/git-commits/:tool_key
```

Filtra commits por herramienta del RMC Control System.

```http
GET /api/git-commits/summary
```

Devuelve conteo y ultimo commit por herramienta.

## RMCOp-Nike

```http
GET /api/nike/runs
```

Query params:

- `page`: pagina, default `1`.
- `limit`: limite entre `10` y `200`, default `100`.

Devuelve ejecuciones agrupadas por `fecha_embarque` y ano:

```json
{
  "page": 1,
  "limit": 100,
  "runs": []
}
```

```http
GET /api/nike/runs/:id
```

Devuelve el embarque Nike al que pertenece `:id`, consolidando todos los runs del mismo grupo:

- `run`
- `groupDate`
- `runCount`
- `herramienta`
- `totalPedidos`
- `totalPieces`
- `year`
- `runIds`
- `items`

Si no existe responde `404`.

## RMC MockupTool

```http
GET /api/mockup/runs
```

Query params:

- `page`: pagina, default `1`.
- `limit`: limite entre `10` y `200`, default `100`.

Devuelve embarques MockupTool agrupados por `fecha_embarque` y ano.

```http
GET /api/mockup/runs/:id
```

Devuelve el embarque MockupTool al que pertenece `:id`, consolidando todos los runs del mismo grupo:

- `run`
- `groupDate`
- `runCount`
- `totalPedidos`
- `totalMaquetas`
- `year`
- `runIds`
- `items`

Si no existe responde `404`.

## Reportes

```http
GET /api/reports/nike/:id/excel
```

Genera Excel Nike para todos los items del grupo de embarque.

```http
GET /api/reports/mockup/:id/excel
```

Genera Excel MockupTool para todos los items del grupo de embarque.

## Archivos

```http
GET /api/files/nike/:itemId/:fileType/view
GET /api/files/nike/:itemId/:fileType/download
```

`fileType` soportado:

- `maqueta`
- `plantilla`

```http
GET /api/files/mockup/:itemId/maqueta/view
GET /api/files/mockup/:itemId/maqueta/download
```

Todos los endpoints validan que la ruta final permanezca bajo `RMC_FILE_ROOT`.
