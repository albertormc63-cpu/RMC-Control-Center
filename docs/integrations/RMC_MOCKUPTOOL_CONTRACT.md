# Contrato de Lectura RMC MockupTool

Este documento describe solo lo que `RMC Control Center` necesita leer y mostrar de RMC MockupTool. No documenta reglas internas de generacion de maquetas.

## Fuente de datos

Tablas:

- `rmc_mockuptool_runs`
- `rmc_mockuptool_items`

## Agrupacion operativa

Las ejecuciones se agrupan por:

- `fecha_embarque`, normalizada a `DD/MM`.
- Ano derivado de `fecha` o del prefijo del `id`.

El listado `/api/mockup/runs` devuelve embarques agrupados. El detalle `/api/mockup/runs/:id` consolida todos los items de runs con el mismo embarque y ano.

## Campos de runs consumidos

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

## Lenguaje UI

`pdfs_generados` no debe mostrarse como PDFs en la interfaz. Usar:

- `Plantillas`
- `Maquetas`

La eleccion depende del contexto visible, pero nunca debe sonar a detalle tecnico de archivo si el usuario esta revisando produccion.

## Campos de items consumidos

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

## Archivos MockupTool

Control Center sirve maquetas por endpoint:

```http
GET /api/files/mockup/:itemId/maqueta/view
GET /api/files/mockup/:itemId/maqueta/download
```

La ruta final se valida contra `RMC_FILE_ROOT`.

## Reporte Excel

`GET /api/reports/mockup/:id/excel` exporta todos los items del grupo de embarque.

Columnas:

- WO
- Run ID
- Herramienta
- Fila Excel
- Ship Order
- Style
- Family
- Equipo
- Variante
- Version
- Talla
- Piezas
- Archivo
- Estado
- Error
- Tiempo
- Clave

## Limites

- Control Center no genera maquetas.
- Control Center no modifica items MockupTool.
- Control Center no decide reglas internas de consolidacion fuera del contrato de lectura.
