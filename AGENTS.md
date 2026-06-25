# AGENTS.md

Instrucciones para Codex y agentes trabajando en `RMC Control Center`.

## Lectura inicial obligatoria

Antes de tocar cualquier archivo, leer:

1. `CURRENT_STATE.md`
2. `TASK_ROUTER.md`

Usar esos dos archivos como contexto caliente. No leer toda la documentacion pesada ni la spec historica salvo que la tarea lo pida o el router indique que es necesario.

Si la tarea menciona Exceles compartidos, sync, impresores, sublimado, `rmc_print_sublimation_log`, fuentes externas, o detalle Nike con `Impresion / Sublimado`, leer tambien:

3. `docs/sqlite/database-sync.md`

## Alcance del repo

Trabajar solo dentro de `RMC Control Center`.

Este repo es un panel consumidor/visualizador:

- Lee SQLite compartido.
- Muestra metricas, ejecuciones, detalles y reportes.
- Sirve archivos ya registrados bajo controles de ruta.
- Puede escribir tablas auxiliares propias de RMCCC solo para modulos documentados, como sincronizacion externa.
- No debe producir datos CEP ni escribir tablas operativas de CEPs.

## Invariantes

- No cambiar rutas, APIs, comportamiento ni contratos sin instruccion explicita.
- No modificar `package.json` salvo que la tarea lo pida directamente o la dependencia ya este documentada para el modulo activo.
- No modificar tablas operativas de CEPs desde este repo.
- No crear migraciones nuevas sin instruccion explicita.
- Para sync externo, respetar `docs/sqlite/database-sync.md` y las tablas auxiliares ya documentadas.
- No agregar features cuando la tarea sea documental, diagnostica o de mantenimiento.
- No mezclar logica interna de `RMCOp-Nike` o `RMC MockupTool`; documentar y consumir solo sus contratos de lectura.
- Mantener tono tecnico-operativo en espanol.

## Orden recomendado

1. Leer `CURRENT_STATE.md`.
2. Leer `TASK_ROUTER.md`.
3. Abrir solo los documentos indicados para la tarea.
4. Si la tarea toca sync/Exceles/impresion/sublimado, abrir `docs/sqlite/database-sync.md`.
5. Si hace falta confirmar implementacion, leer el archivo de codigo exacto.
6. Mantener cambios pequenos y verificables.

## Spec historica

`SPEC_RMC_CONTROL_CENTER.md` queda como archivo legado de entrada. Para trabajo activo usar `README.md`, `CURRENT_STATE.md`, `TASK_ROUTER.md` y `docs/`.
