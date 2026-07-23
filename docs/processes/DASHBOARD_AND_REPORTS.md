# Dashboard y Reportes

## Dashboard general

`GET /api/dashboard` mezcla metricas de Registry, Nike, MockupTool y commits Nike.

Cards generales:

- Herramientas CEP
- Commits Nike
- Errores Totales

Errores totales suma errores detectados en items Nike y MockupTool.

## Dashboard RMCOp-Nike

Cards:

- Ejecuciones
- Pedidos
- Registros
- Piezas
- Estilos
- Tiempo Promedio

Visualizaciones:

- Grafica diaria de tiempo promedio.
- Tabla mensual Nike.

Tabla mensual:

- Mes
- Ejecuciones
- Pedidos
- Piezas
- Tiempo prom.
- Errores

## Dashboard RMC MockupTool

Temporalmente oculto en el Dashboard principal porque no es esencial para el seguimiento operativo diario. La vista `Maquetas RMC Nike` sigue disponible desde el menu lateral.

Cards:

- Ejecuciones
- Registros
- Plantillas Generadas
- Plantillas Faltantes
- Filas Seleccionadas
- Disenadores

Visualizaciones:

- Grafica de plantillas por ejecucion.
- Tabla mensual MockupTool.

Tabla mensual:

- Mes
- Ejecuciones
- Plantillas
- Faltantes

## Panel 27 Sports / Rapid

La UI incluye una vista `Panel 27 / Rapid` separada de Nike y en modo lectura sobre las tablas `rmc_opt_*`.

Estado actual:

- Cards de embarques, pedidos, piezas, estilos, archivos listos y outputs detectados en Almacen.
- Tabla principal agrupada por embarque y cliente, con filtro por mes y por cliente `27 Sports` / `Rapid`.
- `Ver` abre el detalle del embarque con la tabla `Pedidos 27 Sports / Rapid`.
- La tabla del detalle usa columnas `Roster`, `Nombre Pedido`, `Piezas`, `Estilos`, `Archivos`, `Estado` y `Detalle`.
- `Ver` en un pedido abre un modal con las piezas/outputs del roster y tracking por area.
- No registra produccion ni modifica datos CEP.

## Agrupacion por embarque

Nike:

- `fecha_embarque` tiene prioridad.
- Si falta, se usa `created_at`.
- El ano viene de `created_at` o del prefijo del `id`.

MockupTool:

- `fecha_embarque` tiene prioridad.
- Si falta, se usa `fecha`.
- El ano viene de `fecha` o del prefijo del `id`.

27 Sports / Rapid:

- `emb` de `rmc_opt_order_lines` tiene prioridad.
- El ano viene de `roster_year` o de fechas internas del pedido.
- El agrupado se calcula por embarque normalizado y cliente.

El detalle y los reportes deben usar todos los runs del grupo.

## Graficas

Las graficas se dibujan en SVG desde `public/js/app.js`.

Tipos actuales:

- Line chart diario para Nike.
- Bar chart por ejecucion para MockupTool.
- Bar chart por embarque para 27 Sports / Rapid.

No se usa libreria externa.

## Tablas

Funciones comunes:

- Filtro por texto.
- Filtro por columna.
- Filtros por valores de columna tipo Excel en tablas de detalle.
- Boton limpiar.
- Contador visible.
- Sort por encabezado.

Tablas con filtro:

- `runsTable`
- `itemsTable`
- `mockupTable`
- `mockupItemsTable`

`runsTable` y `mockupTable` tambien se filtran por mes de embarque. El selector mensual del Dashboard y el selector mensual local de cada tabla comparten el mismo estado por herramienta.

El bloque `Seguimiento operativo 27 / Rapid` vive en el Dashboard y usa filtro mensual propio. El panel `Panel 27 / Rapid` conserva la tabla principal y el detalle por embarque/pedido.

Tablas con sort:

- `runsTable`
- `itemsTable`
- `mockupTable`
- `mockupItemsTable`
- `registryTable`
- `tablesTable`

Sort soporta texto, numeros, fechas `DD/MM/YYYY` y duraciones `HH:MM:SS`.

## Detalle Nike

Al abrir `Ver`:

- Se muestra el grupo de embarque.
- Se cargan items de todos los runs agrupados.
- Se muestra herramienta por item.
- Hay filtros, sort y boton de ocultar.
- La tabla detalle muestra `Tipo` para separar genericas, personalizadas o manuales.
- Los archivos se abren con endpoints `/api/files/nike/...`.

## Detalle MockupTool

Al abrir `Ver`:

- Se muestra el grupo de embarque.
- Se cargan items de todos los runs agrupados.
- Hay filtros, sort y boton de ocultar.
- La tabla detalle muestra `Tipo` para separar genericas o personalizadas.
- Las maquetas se abren con endpoints `/api/files/mockup/...`.

## Reportes Excel

Nike:

```http
GET /api/reports/nike/:id/excel
```

MockupTool:

```http
GET /api/reports/mockup/:id/excel
```

Ambos reportes exportan todos los items del grupo de embarque. No deben limitarse al run de muestra.

Las barras del dashboard permiten doble click para navegar a Nike o MockupTool y abrir el detalle filtrado por fecha_embarque.
