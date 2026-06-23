# AGENTS.md

Instrucciones para Codex y agentes trabajando en `RMC Control Center`.

## Lectura inicial obligatoria

Antes de tocar cualquier archivo, leer:

1. `CURRENT_STATE.md`
2. `TASK_ROUTER.md`

Usar esos dos archivos como contexto caliente. No leer toda la documentacion pesada ni la spec historica salvo que la tarea lo pida o el router indique que es necesario.

## Alcance del repo

Trabajar solo dentro de `RMC Control Center`.

Este repo es un panel consumidor/visualizador:

- Lee SQLite compartido.
- Muestra metricas, ejecuciones, detalles y reportes.
- Sirve archivos ya registrados bajo controles de ruta.
- No debe producir datos CEP ni escribir tablas operativas de CEPs.

## Invariantes

- No cambiar rutas, APIs, comportamiento ni contratos sin instruccion explicita.
- No modificar `package.json` salvo que la tarea lo pida directamente.
- No modificar SQLite ni crear migraciones desde este repo.
- No agregar features cuando la tarea sea documental, diagnostica o de mantenimiento.
- No mezclar logica interna de `RMCOp-Nike` o `RMC MockupTool`; documentar y consumir solo sus contratos de lectura.
- Mantener tono tecnico-operativo en espanol.

## Orden recomendado

1. Leer `CURRENT_STATE.md`.
2. Leer `TASK_ROUTER.md`.
3. Abrir solo los documentos indicados para la tarea.
4. Si hace falta confirmar implementacion, leer el archivo de codigo exacto.
5. Mantener cambios pequenos y verificables.

## Spec historica

`SPEC_RMC_CONTROL_CENTER.md` queda como archivo legado de entrada. Para trabajo activo usar `README.md`, `CURRENT_STATE.md`, `TASK_ROUTER.md` y `docs/`.
