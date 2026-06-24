# RMC CC - Sincronización de fuentes externas

## Objetivo

RMCCC no reemplaza los Exceles operativos de cada área. Los lee como fuentes externas, guarda una tabla espejo en SQLite y permite cruzar esos datos con los módulos internos como Nike, Rapid, 27 Sports, etc.

## Fuentes externas registradas

### Reporte de Impresión y Reposiciones

- Área: Diseño / Impresión
- Tipo: `print_sublimation_excel`
- Archivo real:
  `/Volumes/Carpeta de sublimado/Reporte de Impresion y Reposicioes.xlsx`
- Hoja:
  `Impresión - Sublimado 2026`
- Tabla espejo:
  `rmc_print_sublimation_log`

## Tabla espejo: rmc_print_sublimation_log

Esta tabla guarda los datos del Excel de impresores.

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

## Regla de natural_key

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