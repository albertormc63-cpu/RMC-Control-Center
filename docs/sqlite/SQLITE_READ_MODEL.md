# SQLite Read Model

Modelo de lectura usado por `RMC Control Center`.

## Politica

Control Center consume una SQLite compartida configurada por `RMC_DB_PATH`. Este repo no debe crear, migrar ni corregir tablas operativas de CEPs.

La conexion actual usa `better-sqlite3` y `fileMustExist: true`.

## Tablas leidas

```text
cep_registry
rmcop_nike_runs
rmcop_nike_items
rmcop_nike_git_commits
rmc_mockuptool_runs
rmc_mockuptool_items
```

## cep_registry

Metadata de herramientas CEP.

Columnas esperadas:

- `source_app`
- `runs_table`
- `app_version`
- `created_at`
- `updated_at`

Uso:

- Conteo de herramientas.
- Vista CEP Registry en modo consulta.
- Diagnostico de tablas.

## rmcop_nike_runs

Runs producidos por RMCOp-Nike.

Columnas usadas:

- `id`
- `created_at`
- `fecha_embarque`
- `tiempo`
- `herramienta`
- `pedidos`
- `piezas`
- `estilos`
- `ok`
- `errores`

Uso:

- Dashboard Nike.
- Agrupacion por embarque.
- Tabla mensual y serie diaria.
- Reportes Excel agrupados.

## rmcop_nike_items

Items de runs Nike.

Columnas usadas:

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

Uso:

- Detalle Nike.
- Filtros y sort en UI.
- Export Excel Nike.
- Resolucion de archivos de maqueta/plantilla mediante servicios.

## rmcop_nike_git_commits

Historial de commits relacionado con Nike.

Columnas usadas:

- `hash`
- `branch`
- `author`
- `fecha`
- `message`
- `files`
- `change_type`
- `created_at`

Uso:

- Conteo en dashboard como `Commits Nike`.

## rmc_mockuptool_runs

Runs producidos por RMC MockupTool.

Columnas usadas:

- `id`
- `fecha`
- `fecha_embarque`
- `hora`
- `seccion`
- `excel`
- `disenador`
- `filas_excel`
- `filas_seleccionadas`
- `grupos_consolidados`
- `pdfs_generados`
- `mockups_faltantes`
- `styles`
- `tallas`

Uso:

- Dashboard MockupTool.
- Agrupacion por embarque.
- Grafica por ejecucion.
- Tabla mensual.
- Reportes Excel agrupados.

Nota UI: `pdfs_generados` se muestra como `Plantillas` o `Maquetas`.

## rmc_mockuptool_items

Items producidos por MockupTool.

Columnas usadas:

- `id`
- `run_id`
- `herramienta`
- `fila_excel`
- `wo`
- `ship_order`
- `style`
- `style_family`
- `equipo`
- `variante`
- `version`
- `talla`
- `piezas`
- `archivo`
- `path`
- `estado`
- `error`
- `tiempo`
- `clave`

Uso:

- Detalle MockupTool.
- Filtros y sort en UI.
- Export Excel MockupTool.
- View/download de maqueta.

## Tolerancia a tablas faltantes

`dashboard.routes.js` usa helpers `safeGet` y `safeAll` para responder con fallback cuando una tabla esperada todavia no existe o el schema no coincide. Esta tolerancia aplica al dashboard, no a todos los endpoints de detalle.
