# Contrato de Lectura RMCOp-Nike

Este documento describe solo lo que `RMC Control Center` necesita leer y mostrar de RMCOp-Nike. No documenta reglas internas de generacion, validacion o produccion de Nike.

## Fuente de datos

Tablas:

- `rmcop_nike_runs`
- `rmcop_nike_items`
- `rmcop_nike_git_commits`
- `rmc_nike_style_variants`

## Agrupacion operativa

Las ejecuciones se agrupan por:

- `fecha_embarque`, normalizada a `DD/MM`.
- Ano derivado de `created_at` o del prefijo del `id`.

El listado `/api/nike/runs` devuelve embarques agrupados, no runs aislados. El detalle `/api/nike/runs/:id` toma un run de muestra y devuelve todos los items de runs que comparten embarque y ano.

## Campos de runs consumidos

- `id`
- `created_at`
- `fecha_embarque`
- `herramienta`
- `tiempo`
- `pedidos`
- `piezas`
- `estilos`
- `ok`
- `errores`

Si `herramienta` esta vacio, Control Center muestra `RMCOp-Nike`. Si el grupo mezcla herramientas, muestra `RMCOp-Nike Mixta`.

## Campos de items consumidos

- `run_id`
- `wo`
- `ship_order`
- `style`
- `style_family`
- `equipo`
- `variante`
- `version`
- `talla`
- `piezas`
- `nombre`
- `numero`
- `archivo`
- `estado`
- `error`
- `tiempo`
- `clave`
- `catalog_variant_id`
- `variant_code`

Para items All Star (`AS`) con `equipo` vacio, el detalle puede usar el catalogo `rmc_nike_style_variants` para mostrar `team_market team_mascot` como valor de presentacion en la columna Equipo.

## Campos de catalogo de variantes consumidos

- `id`
- `variant_code`
- `variant_name`
- `team_market`
- `team_mascot`

## Archivos Nike

Control Center no abre rutas del navegador directamente. Usa endpoints bajo `/api/files/nike/`.

Tipos soportados:

- `maqueta`: maqueta creada por RMC MockupTool asociada al item Nike.
- `plantilla`: plantilla creada por RMCOp-Nike.

Toda ruta resuelta debe permanecer dentro de `RMC_FILE_ROOT`.

## Reporte Excel

`GET /api/reports/nike/:id/excel` exporta todos los items del grupo de embarque. El nombre del archivo usa fecha de embarque y ano del grupo.

Columnas:

- Run ID
- WO
- Ship Order
- Style
- Family
- Equipo
- Variante
- Version
- Talla
- Piezas
- Nombre
- Numero
- Archivo
- Estado
- Error
- Tiempo
- Clave

## Limites

- Control Center no crea runs ni items Nike.
- Control Center no corrige errores de Nike.
- Control Center no define reglas internas de RMCOp-Nike; solo consume su salida registrada.
