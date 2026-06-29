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

## Agrupacion por embarque

Nike:

- `fecha_embarque` tiene prioridad.
- Si falta, se usa `created_at`.
- El ano viene de `created_at` o del prefijo del `id`.

MockupTool:

- `fecha_embarque` tiene prioridad.
- Si falta, se usa `fecha`.
- El ano viene de `fecha` o del prefijo del `id`.

El detalle y los reportes deben usar todos los runs del grupo.

## Graficas

Las graficas se dibujan en SVG desde `public/js/app.js`.

Tipos actuales:

- Line chart diario para Nike.
- Bar chart por ejecucion para MockupTool.

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
- Los archivos se abren con endpoints `/api/files/nike/...`.

## Detalle MockupTool

Al abrir `Ver`:

- Se muestra el grupo de embarque.
- Se cargan items de todos los runs agrupados.
- Hay filtros, sort y boton de ocultar.
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
