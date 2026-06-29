# RMC CC - Sincronización de fuentes externas

Ultima actualizacion: 2026-06-25.

## Objetivo

RMCCC no reemplaza los Exceles operativos de cada area. Los lee como fuentes externas, guarda una tabla espejo en SQLite y permite cruzar esos datos con los modulos internos como Nike, Rapid, 27 Sports, etc.

La regla principal del modulo es:

```text
Excel operativo existente -> tabla espejo RMCCC -> consulta/cruce en LAN
```

El area sigue usando su Excel. RMCCC solo consolida, audita y muestra datos relacionados.

## Estado actual del modulo

Implementado para el reporte de impresores y la salida de Sublimado:

- Fuente externa registrada en `rmc_external_sources`.
- Lectura manual del Excel funcionando.
- Tabla espejo `rmc_print_sublimation_log` recibiendo registros completos.
- Tabla espejo separada `rmc_sublimation_output_log` recibiendo registros de salida de Sublimado.
- Regla especial para registros `*PARCIAL` implementada.
- Endpoint manual de sincronizacion funcionando.
- Endpoint de cruce Nike item -> impresion/sublimado funcionando.
- Bloque visual `Impresion / Sublimado` en detalle de item Nike implementado.
- Tabla detalle de items Nike muestra estado operativo por area usando resumen de sync.
- Si el Work Order aparece activo en `rmc_sublimation_output_log`, el estado se interpreta como `En almacen`.
- Pendiente posterior: polling automatico.

Validacion observada:

```text
POST /api/sync/sources/1/run
ok: true
rows_valid: 4990
rows_inserted: 1
rows_unchanged: 4989
rows_skipped: 0
```

## Fuentes externas registradas

### Reporte de Impresion y Reposiciones

- Area: Diseno / Impresion
- Tipo: `print_sublimation_excel`
- Archivo real:
  `/Volumes/Carpeta de sublimado/Reporte de Impresion y Reposicioes.xlsx`
- Hoja:
  `Impresión - Sublimado 2026`
- Encabezados reales:
  fila 3, columnas A:L
- Datos reales:
  desde fila 4
- Tabla espejo:
  `rmc_print_sublimation_log`

El archivo es un reporte anual. Actualmente contiene todos los registros del ano y al parecer se vacia/inicia nuevamente cada ano.

### Produccion Sublimado - Liberado a Linea

- Area: Sublimado
- Tipo: `sublimation_output_excel`
- Archivo real:
  `/Volumes/Carpeta de sublimado/PRODUCCION SUBLIMADO3.xlsb`
- Hoja:
  `LIBERADO A LINEA`
- Encabezados reales:
  fila 1, columnas A:M
- Datos reales:
  desde fila 2
- Limite de lectura:
  `A1:M20000`
- Tabla espejo:
  `rmc_sublimation_output_log`

Regla operativa: cuando una pieza aparece en este Excel, significa que ya salio del departamento de Sublimado. Este archivo no debe mezclarse en `rmc_print_sublimation_log`; usa tabla propia.

## Interpretacion operativa del Excel de impresores

El Excel de impresores no representa necesariamente una pieza individual. Una fila puede representar un registro/lote/bajada de impresion.

Ejemplo:

```text
Excel origen Nike / 27 Sports / Rapid:
WO 123 - SO 555 - Roster A - pieza 1
WO 123 - SO 555 - Roster A - pieza 2
WO 123 - SO 555 - Roster A - pieza 3

Excel impresores:
WO 123 - Roster A - cantidad 3
```

Por eso una fila de `rmc_print_sublimation_log` puede relacionarse con varias filas de `rmcop_nike_items`.

Ojo: tambien puede existir el mismo `ship_order` con diferente `wo` o diferente `roster`. No asumir que `ship_order` identifica por si solo una pieza o lote.

## Tablas auxiliares creadas

Estas tablas pertenecen a la capa de sincronizacion/consolidacion de RMCCC. No son tablas operativas de CEPs.

### `rmc_external_sources`

Registra fuentes externas que RMCCC puede leer.

Campos principales:

- `id`
- `name`
- `area`
- `source_type`
- `file_path`
- `sheet_name`
- `active`
- `last_mtime_ms`
- `last_size_bytes`
- `last_sync_at`
- `last_status`
- `last_error`
- `created_at`
- `updated_at`

Uso actual:

```text
source_type = print_sublimation_excel
source_type = sublimation_output_excel
```

### `rmc_sync_runs`

Guarda cada corrida de sincronizacion.

Campos principales:

- `id`
- `source_id`
- `started_at`
- `finished_at`
- `status`
- `rows_read`
- `rows_valid`
- `rows_inserted`
- `rows_updated`
- `rows_unchanged`
- `rows_missing`
- `rows_skipped`
- `error_message`

Sirve para mostrar o auditar:

```text
Ultima sync
filas leidas
filas nuevas
filas actualizadas
filas sin cambios
filas desaparecidas
errores
```

### `rmc_print_sublimation_log`

Tabla espejo del Excel de impresores.

Columnas importadas desde Excel:

- `type`
- `plotter_number`
- `work_order`
- `style`
- `roster`
- `process`
- `order_quantity`
- `fecha_impresion_papel`
- `num_impresion_papel`
- `disenador`
- `impresor`
- `fecha_embarque`

Columnas internas de control:

- `source_id`
- `source_file`
- `source_sheet`
- `source_row`
- `source_year`
- `natural_key`
- `row_hash`
- `first_seen_at`
- `last_seen_at`
- `last_seen_sync_id`
- `is_active`
- `missing_since`
- `created_at`
- `updated_at`

Indices importantes:

- `UNIQUE(source_id, natural_key)`
- indice por `work_order`
- indice por `style`
- indice por `roster`
- indice por `fecha_embarque`
- indice por `is_active`

### `rmc_sublimation_output_log`

Tabla espejo del Excel de Sublimado. Se mantiene separada del reporte de impresores para no mezclar semanticas ni columnas.

Columnas importadas desde Excel:

- `fecha`
- `work_order`
- `style`
- `pcs`
- `embarque`
- `maquina`
- `total_piezas`
- `notas`
- `hora_sale_almacen`

Columnas internas de control:

- `source_id`
- `source_file`
- `source_sheet`
- `source_row`
- `source_year`
- `natural_key`
- `row_hash`
- `first_seen_at`
- `last_seen_at`
- `last_seen_sync_id`
- `is_active`
- `missing_since`
- `created_at`
- `updated_at`

Indices importantes:

- `UNIQUE(source_id, natural_key)`
- indice por `work_order`
- indice por `style`
- indice por `fecha`
- indice por `is_active`

## Regla de `natural_key`

Para registros normales, la llave natural se genera con:

```text
source_year
work_order
style
roster
process
fecha_impresion_papel
num_impresion_papel
plotter_number
```

Ejemplo:

```text
2026|173589|A1000H||CP|6/15/26|1|FD1
```

### Regla especial para `*PARCIAL`

Si `fecha_embarque` contiene `PARCIAL`, la llave natural tambien incluye `source_row`:

```text
source_year
work_order
style
roster
process
fecha_impresion_papel
num_impresion_papel
plotter_number
ROW:source_row
```

Motivo de negocio:

```text
*PARCIAL significa que no terminaron un corte completo y bajaron a Sublimado solo cierta cantidad de piezas de ese corte.
```

Por eso, aunque varias filas `*PARCIAL` parezcan duplicadas, se deben conservar como registros independientes porque forman parte del conteo operativo que llevan hacia Sublimado.

No usar `impresor` como parte de la llave porque puede corregirse. Si cambia, debe actualizar el registro, no crear otro. No usar `source_row` en registros normales porque si mueven filas en Excel se perderia continuidad.

## Regla de `row_hash`

`row_hash` se calcula con el contenido operativo de la fila:

- `type`
- `plotter_number`
- `work_order`
- `style`
- `roster`
- `process`
- `order_quantity`
- `fecha_impresion_papel`
- `num_impresion_papel`
- `disenador`
- `impresor`
- `fecha_embarque`

Uso:

```text
natural_key no existe -> insertar
natural_key existe y row_hash cambio -> actualizar
natural_key existe y row_hash igual -> marcar como unchanged/touch
registro antes activo ya no aparece -> is_active = 0, missing_since = timestamp
```

RMCCC no borra fisicamente registros importados por sync normal. Si desaparecen del Excel, se marcan como inactivos.

## Fechas y zona horaria

Las columnas internas `first_seen_at`, `last_seen_at` y `missing_since` pueden almacenarse en UTC/ISO.

Para UI se deben usar campos de presentacion generados por API:

- `first_seen_at_display`
- `last_seen_at_display`
- `missing_since_display`

La zona usada para display actual es:

```text
America/Mexico_City
```

Los campos raw se conservan para depuracion:

- `first_seen_at_raw`
- `last_seen_at_raw`
- `missing_since_raw`

## Relacion con Nike

Relacion inicial:

```text
rmc_print_sublimation_log.work_order = rmcop_nike_items.wo
rmc_sublimation_output_log.work_order = rmcop_nike_items.wo
```

Una fila del reporte de impresores puede representar varias piezas de `rmcop_nike_items`, porque el reporte agrupa piezas por Work Order / Style / Roster / Process y cantidad total.

El endpoint de Nike tambien calcula:

- `is_partial`
- `style_match`
- `roster_match`
- `summary.matches`
- `summary.activeCount`
- `summary.inactiveCount`
- `summary.totalReportedQuantity`
- `summary.partialCount`
- `summary.styleMatches`
- `summary.rosterMatches`

Nota: si `roster` del item Nike viene `null` y el registro de impresion trae `''`, se considera match por normalizacion vacia.

## Archivos creados o modificados

### Nuevos scripts manuales

Estos scripts se usan para inicializar, registrar fuente, probar lectura y diagnosticar.

- `scripts/create-sync-tables.js`
  - Crea/verifica `rmc_external_sources`, `rmc_sync_runs`, `rmc_print_sublimation_log`, `rmc_sublimation_output_log` e indices.

- `scripts/register-print-source.js`
  - Registra la fuente externa del Excel real de impresores.
  - Inserta o actualiza el registro en `rmc_external_sources`.

- `scripts/preview-print-source.js`
  - Lee el Excel y muestra encabezados, filas leidas y filas validas sin guardar en BD.

- `scripts/sync-print-source.js`
  - Ejecuta una sincronizacion real desde consola.

- `scripts/register-sublimation-source.js`
  - Registra la fuente externa del Excel real de Sublimado.
  - Inserta o actualiza el registro en `rmc_external_sources`.

- `scripts/preview-sublimation-source.js`
  - Lee el rango operativo `A1:M20000` del Excel de Sublimado sin guardar en BD.

- `scripts/sync-sublimation-source.js`
  - Ejecuta una sincronizacion real de Sublimado hacia `rmc_sublimation_output_log`.

- `scripts/check-print-duplicates.js`
  - Diagnostico de llaves duplicadas, `row_hash`, duplicados exactos y grupos repetidos.
  - Util para depuracion; no es parte obligatoria del flujo UI.

### Nuevos servicios

- `src/services/printSublimationSync.js`
  - Lee el Excel con `xlsx`.
  - Copia el archivo a temporal antes de leer.
  - Lee solo rango `A1:L20000` para evitar recorrer hojas infladas hasta 1,048,576 filas.
  - Para Sublimado lee solo rango `A1:M20000`.
  - Valida hoja `Impresión - Sublimado 2026`.
  - Valida hoja `LIBERADO A LINEA`.
  - Lee encabezados desde fila 3.
  - Lee datos desde fila 4.
  - Ignora filas sin `Work Order`.
  - Calcula `source_year`, `natural_key` y `row_hash`.
  - Ejecuta upsert a `rmc_print_sublimation_log`.
  - Ejecuta upsert de Sublimado a `rmc_sublimation_output_log`.
  - Marca registros desaparecidos como `is_active = 0`.
  - Registra resumen en `rmc_sync_runs`.
  - Actualiza metadata de fuente en `rmc_external_sources`.

### Nuevas rutas

- `src/routes/sync.routes.js`
  - `GET /api/sync/sources`
  - `POST /api/sync/sources/:id/run`
  - `GET /api/sync/sources/:id/runs`

### Archivos modificados

- `src/server.js`
  - Importa `syncRoutes`.
  - Monta `app.use("/api/sync", syncRoutes)`.

- `src/routes/nike.routes.js`
  - Agrega endpoint:
    `GET /api/nike/items/:id/print-sublimation`
  - Consulta item Nike por `id`.
  - Cruza por `rmcop_nike_items.wo = rmc_print_sublimation_log.work_order`.
  - Devuelve `summary` y `matches`.
  - Agrega campos `*_display` para mostrar fechas en hora local.

- `package.json` / `package-lock.json`
  - Se agrega dependencia `xlsx` para lectura de Excel.

## Endpoints disponibles

### Listar fuentes externas

```http
GET /api/sync/sources
```

Uso:

```bash
curl http://localhost:3000/api/sync/sources
```

### Ejecutar sync manual

```http
POST /api/sync/sources/:id/run
```

Uso:

```bash
curl -X POST http://localhost:3000/api/sync/sources/1/run
```

Respuesta esperada:

```json
{
  "ok": true,
  "sync_run_id": 3,
  "summary": {
    "status": "success",
    "rows_read": 19997,
    "rows_valid": 4990,
    "rows_inserted": 1,
    "rows_updated": 0,
    "rows_unchanged": 4989,
    "rows_missing": 0,
    "rows_skipped": 0,
    "error_message": null
  }
}
```

### Ver historial de sync

```http
GET /api/sync/sources/:id/runs
```

Uso:

```bash
curl http://localhost:3000/api/sync/sources/1/runs
```

### Consultar impresion/sublimado para item Nike

```http
GET /api/nike/items/:id/print-sublimation
```

Uso:

```bash
curl http://localhost:3000/api/nike/items/167/print-sublimation
```

Respuesta resumida:

```json
{
  "item": {
    "id": 167,
    "wo": "173589",
    "style": "A1000H",
    "archivo": "173589 PLL-Boston Cannons A1000H 2X 8.pdf"
  },
  "hasWorkOrder": true,
  "hasPrintSublimationLog": true,
  "summary": {
    "matches": 1,
    "activeCount": 1,
    "inactiveCount": 0,
    "totalReportedQuantity": 1,
    "partialCount": 0,
    "styleMatches": 1,
    "rosterMatches": 1
  },
  "state": {
    "status": "Bajado a Sublimado",
    "detail": "1 registros activos | 1 piezas reportadas",
    "stage": "sublimado",
    "hasPrintSublimationLog": true
  },
  "matches": [
    {
      "plotter_number": "FD1",
      "work_order": "173589",
      "style": "A1000H",
      "process": "CP",
      "order_quantity": 1,
      "fecha_impresion_papel": "6/15/26",
      "num_impresion_papel": "1",
      "disenador": "ALBERTO",
      "impresor": "OSCAR",
      "fecha_embarque": "6/19/26",
      "is_partial": 0,
      "style_match": 1,
      "roster_match": 1,
      "first_seen_at_display": "24/06/2026, 16:01:52",
      "last_seen_at_display": "25/06/2026, 09:28:19"
    }
  ]
}
```

## UI/UX implementada

La tabla `Detalle Nike` muestra en la columna `Estado` un estado operativo calculado desde la tabla espejo:

- `En proceso de impresion`: no hay coincidencia activa en `rmc_print_sublimation_log`.
- `Bajado a Sublimado`: hay coincidencia activa por `work_order = wo`.
- `Parcial en Sublimado`: hay coincidencia activa y alguna fila contiene `PARCIAL` en `fecha_embarque`.
- `En almacen`: hay coincidencia activa en `rmc_sublimation_output_log`.

El modal `Ver mas` del item Nike muestra un bloque de tracking tipo historial por area:

- `Impresion`: datos del reporte de impresores cuando existan.
- `Sublimado`: bajada o parcial hacia Sublimado desde el reporte de impresores.
- `Almacen`: salida registrada desde `rmc_sublimation_output_log`.

Despues del historial, muestra coincidencias compactas del reporte de impresores como detalle secundario.

Archivos relacionados:

- `public/js/components/nikeView.js`
- `public/js/app.js`
- `public/css/style.css`
- `src/routes/nike.routes.js`

Endpoint a consumir:

```http
GET /api/nike/items/:id/print-sublimation
```

Reglas de UI:

- No modificar tablas SQLite para esta tarea.
- No ejecutar sync automatico desde el detalle del item.
- No reemplazar estados existentes de Nike todavia.
- Mostrar el estado del cruce como informacion complementaria.
- Usar `*_display` para fechas internas de sync.
- Mostrar `fecha_impresion_papel` y `fecha_embarque` como vienen del Excel.
- Si no hay coincidencias, mostrar algo como:
  `No detectado todavia en reporte de impresion/sublimado.`
- Si hay coincidencias, mostrar resumen:
  - cantidad reportada
  - numero de registros activos
  - si hay parciales
  - proceso
  - plotter
  - fecha impresion papel
  - numero impresion papel
  - disenador
  - impresor
- Si hay multiples coincidencias, mostrar lista compacta o tabla secundaria.

Texto sugerido para el bloque:

```text
Impresion / Sublimado
Detectado en reporte de impresores
Cantidad reportada: X
Proceso: CP
Plotter: FD1
Fecha impresion papel: 6/15/26
# Impresion papel: 1
Disenador: ALBERTO
Impresor: OSCAR
Ultima sync: 25/06/2026, 09:28:19
```

Para parciales:

```text
Parcial: si
Este registro corresponde a una bajada parcial a Sublimado.
```

## Polling automatico

Implementado para fuentes activas con:

- `source_type = print_sublimation_excel`
- `source_type = sublimation_output_excel`
- `active = 1`

Usa polling controlado por `mtime`/`size`, no `fs.watch` como mecanismo principal.

Flujo:

```text
cada X minutos:
  revisar fuentes activas
  revisar mtime/size
  si cambio:
    esperar estabilizacion
    copiar Excel a temporal
    sincronizar
```

Mantener siempre boton/endpoint manual `POST /api/sync/sources/:id/run` para pruebas y recuperacion.

Variables de entorno:

```env
RMC_SYNC_POLL_ENABLED=true
RMC_SYNC_POLL_INTERVAL_MS=300000
RMC_SYNC_POLL_STABILIZE_MS=10000
```

Reglas:

- Si `mtime/size` no cambian contra `rmc_external_sources.last_mtime_ms` y `last_size_bytes`, no ejecuta sync.
- Si el archivo cambia durante la ventana de estabilizacion, espera otra ventana antes de sincronizar.
- Si el volumen o archivo no esta disponible, registra advertencia en consola y espera el siguiente ciclo.
- El endpoint manual se conserva sin cambios.

## Checks utiles

```bash
node --check src/services/printSublimationSync.js
node --check src/services/syncPoller.js
node --check src/routes/sync.routes.js
node --check src/routes/nike.routes.js
node --check src/server.js
```

Pruebas manuales:

```bash
node scripts/preview-print-source.js 1
node scripts/sync-print-source.js 1
node scripts/preview-sublimation-source.js
node scripts/sync-sublimation-source.js
curl -X POST http://localhost:3000/api/sync/sources/1/run
curl http://localhost:3000/api/nike/items/167/print-sublimation
```
