# SQLite Read Model

Modelo de lectura usado por `RMC Control Center`.

## Politica

Control Center consume una SQLite compartida configurada por `RMC_DB_PATH`. Este repo no debe crear, migrar ni corregir tablas operativas de CEPs.

Excepcion vigente: la pantalla `Catalogo Op-Nike` administra el catalogo SQLite usado por RMCOp-Nike para resolver styles, variantes, rutas de plantillas y nombres finales. Esa pantalla escribe solo `rmc_nike_style_families` y `rmc_nike_style_variants`.

La conexion actual usa `better-sqlite3` y `fileMustExist: true`.

El chat grupal LAN es un modulo auxiliar propio de RMCCC. Crea y escribe solamente `rmc_chat_messages` y `rmc_chat_reactions`; no modifica datos operativos de ningun CEP.

## Tablas leidas

```text
cep_registry
rmcop_nike_runs
rmcop_nike_items
rmcop_nike_git_commits
rmc_git_commits
rmc_nike_style_variants
rmc_nike_style_families
rmc_mockuptool_runs
rmc_mockuptool_items
rmc_chat_messages
rmc_chat_reactions
```

## rmc_chat_messages

Mensajes del canal grupal interno de Control Center.

Columnas:

- `id`
- `client_ip`
- `message`
- `created_at`

Uso:

- Historial compartido del chat LAN.
- Identificacion provisional por IP hasta integrar usuarios y permisos.

## rmc_chat_reactions

Reaccion unica por mensaje e IP.

Columnas:

- `message_id`
- `client_ip`
- `reaction`
- `created_at`
- `updated_at`

Uso:

- Conteos `like`, `love`, `haha`, `wow`, `sad` y `angry`.
- Reemplazo o eliminacion de la reaccion activa de cada IP.

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
- `catalog_variant_id`
- `variant_code`

Uso:

- Detalle Nike.
- Filtros y sort en UI.
- Export Excel Nike.
- Resolucion de archivos de maqueta/plantilla mediante servicios.
- Presentacion de equipo para versiones All Star mediante catalogo de variantes.

## rmc_nike_style_variants

Catalogo de variantes Nike.

Columnas usadas:

- `id`
- `variant_code`
- `variant_name`
- `team_code`
- `team_name`
- `team_market`
- `team_mascot`
- `aliases`
- `opnike_enabled`
- `opnike_rule_status`
- `opnike_style_scope`
- `opnike_variant_root_folder`
- `opnike_group_folder_pattern`
- `opnike_product_folder_pattern`
- `opnike_version_folder_pattern`
- `opnike_team_folder_pattern`
- `opnike_design_folder`
- `opnike_style_subfolder_rule`
- `opnike_template_code`
- `opnike_template_name_pattern`
- `opnike_output_name_pattern`
- `opnike_fallback_search_mode`
- `opnike_resolution_strategy`
- `opnike_requires_version_folder`
- `opnike_requires_team_folder`
- `opnike_requires_design_folder`
- `opnike_requires_style_subfolder`
- `opnike_validated_at`
- `opnike_validation_message`

Uso:

- Completar la columna Equipo del detalle Nike cuando `equipo` viene vacio: para All Star (`AS`) mostrar `team_market team_mascot` y, cuando `team_code` y `team_name` estan vacios, mostrar el primer alias no vacio separado por `;`.
- Administrar reglas Op-Nike en estados `draft`, `shadow`, `active` e `inactive`.
- Validar campos obligatorios antes de permitir `opnike_rule_status = active`.

## rmc_nike_style_families

Catalogo de familias de style Nike.

Columnas usadas:

- `style_family`
- `liga`
- `line_name`
- `audience`
- `product_folder`
- `garment_type`
- `is_active`
- `source_notes`

Uso:

- Administrar familias disponibles para reglas Op-Nike.
- Resolver tokens de preview como `{style.product_folder}`.

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

## rmc_git_commits

Historial tecnico centralizado de commits del RMC Control System.

Columnas usadas:

- `tool_key`
- `tool_name`
- `repo_name`
- `repo_path`
- `branch_name`
- `commit_hash`
- `short_hash`
- `author_name`
- `author_email`
- `commit_date`
- `commit_subject`
- `commit_body`
- `files_changed`
- `insertions`
- `deletions`
- `is_merge`
- `created_at`
- `updated_at`

Uso:

- Conteo general de commits en dashboard.
- API `/api/git-commits`.
- Vista `Historial de desarrollo`.
- Base para changelog interno del RMC Control System.

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
