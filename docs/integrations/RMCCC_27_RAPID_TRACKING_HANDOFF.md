# RMC Control Center - Tracking 27/Rapid Desde RMC Optimizador

Documento de traspaso para implementar en `RMC Control Center` la lectura y seguimiento de pedidos 27 Sports/Rapid dados de alta desde `RMC Optimizador`.

## Objetivo

Agregar en `RMC Control Center` una vista y un boton de **Actualizar tracking** para pedidos 27/Rapid, usando los pedidos, lineas, maquetas y outputs esperados que RMC Optimizador dara de alta desde:

- Lista diaria 27/Rapid.
- Carpeta del roster.
- Excel real del roster.
- Maqueta PDF base/anotada.

El tracking operativo de areas debe seguir usando el mismo flujo actual de Control Center:

- Impresores.
- Sublimado.
- Almacen.
- Los mismos Exceles externos que ya se sincronizan por polling.

Este modulo no reemplaza el sync existente de impresores/sublimado. Lo complementa con una capa nueva de outputs esperados para 27/Rapid.

## Principio Central

Para 27/Rapid, la fuente primaria del trabajo de Diseno es el `Roster`.

Para otras areas, el `WO#` sigue siendo una llave importante de busqueda y cruce.

Modelo mental:

```text
Pedido = cliente + roster
Linea = pedido + WO# + style
Output esperado = roster + nombre_pedido + style + subdesign opcional + size + player_number
```

Control Center no debe adivinar todos los archivos escaneando carpetas completas. Primero debe existir una lista de outputs esperados dada de alta por RMC Optimizador. Luego Control Center hace polling solo de esos outputs.

## Responsabilidad Por Herramienta

### RMC Optimizador

Debe producir/dar de alta la verdad esperada:

- Pedidos desde lista diaria.
- Lineas por roster + WO# + style.
- Carpeta actual detectada.
- Excel real del roster.
- Maqueta PDF base.
- Maqueta PDF anotada, si se genera.
- Outputs esperados desde el Excel real del roster.

### RMC Control Center

Debe consumir y mostrar:

- Pedidos y lineas 27/Rapid.
- Maquetas encontradas/generadas.
- Outputs esperados.
- Estado de archivo encontrado o pendiente.
- Estado operativo por cruce con impresores/sublimado/almacen.
- Boton manual **Actualizar tracking**.

Control Center no debe crear pedidos 27/Rapid desde cero ni corregir datos operativos del CEP, salvo endpoints auxiliares documentados para refresh/relocalizacion de tracking.

## Tablas Propuestas

Las tablas pueden ajustarse antes de migrar, pero el modelo recomendado es este.

### `rmc_opt_orders`

Un registro por pedido/roster.

```text
id
cliente
roster
roster_year
nombre_pedido
current_folder
folder_status
source_list_excel
created_at
updated_at
raw_json
```

Clave logica:

```text
cliente + roster
```

### `rmc_opt_order_lines`

Una fila por linea de lista diaria.

```text
id
order_id
fila_lista
wo
style_lista
style_base
style_categoria
pcs_lista
emb
codigo_operativo
tela
raw_json
created_at
updated_at
```

Clave logica:

```text
order_id + wo + style_lista
```

### `rmc_opt_roster_outputs`

Tabla principal para tracking por archivo esperado.

Una fila representa una salida rastreable por Control Center. No necesariamente una prenda fisica individual.

Regla:

```text
Si la fila del roster produce archivos diferentes, registrar cada salida por separado.
Si la fila del roster representa el mismo archivo impreso varias veces, registrar una salida con qty > 1.
```

Campos:

```text
id
order_id
line_id
fila_roster
roster
wo
nombre_pedido
style_roster
style_output
style_base
style_categoria
subdesign
color_or_descriptor
size
player_number
first_name
last_name
position
qty
expected_filename
expected_path
found_path
file_status
tracking_status
tracking_key
last_checked_at
created_at
updated_at
raw_json
```

Estados sugeridos para `file_status`:

```text
PENDIENTE
ENCONTRADO
MOVIDO
NO_ENCONTRADO
INVALIDO
```

Estados sugeridos para `tracking_status`:

```text
PENDIENTE
ARCHIVO_LISTO
EN_PROCESO_IMPRESION
BAJADO_A_SUBLIMADO
EN_ALMACEN
PARCIAL
DETENIDO
ERROR
```

Clave logica recomendada:

```text
cliente + roster + wo + style_output + subdesign + size + player_number
```

Si no hay `player_number`:

```text
cliente + roster + wo + style_output + subdesign + size + expected_filename
```

### `rmc_opt_assets`

Archivos relacionados al pedido, linea u output.

```text
id
order_id
line_id
output_id
asset_type
path
exists
detected_at
notes
```

Tipos iniciales:

```text
SOURCE_LIST_XLSX
ORDER_FOLDER
ROSTER_XLS
MAQUETA_BASE_PDF
MAQUETA_OUTPUT_PDF
PRODUCTION_OUTPUT_PDF
TO_PRINT_FOLDER
```

## Como Relacionar Archivo Con Pieza/Output

El output esperado debe guardar un nombre esperado y una llave de tracking.

Ejemplos validos:

```text
79822-26 Fielders Choice T4020Y Camo LGE 9.pdf
79822-26 Fielders Choice T4020Y 121 Camo LGE 9.pdf
79822-26 Fielders Choice T4020Y LGE 9.pdf
```

Campos importantes:

```text
roster = 79822-26
nombre_pedido = Fielders Choice
style_output = T4020Y
subdesign = 121, opcional
color_or_descriptor = Camo, opcional
size = LGE
player_number = 9
qty = 1
```

Los subdisenos son numeros despues del style. Ejemplo:

```text
T4020Y 121
```

Debe guardarse como:

```text
style_output = T4020Y
subdesign = 121
```

## Maqueta Vs Output De Produccion

La maqueta anotada no es la misma cosa que los outputs de produccion.

### Maqueta

Normalmente se liga a la linea:

```text
roster + WO# + style
```

Ejemplo:

```text
79822-26 T4020Y WO175675 maqueta.pdf
```

Asset:

```text
asset_type = MAQUETA_OUTPUT_PDF
line_id = linea WO175675/T4020Y
```

### Output de produccion

Se liga al archivo esperado/rastreable:

```text
roster + nombre_pedido + style + subdesign opcional + size + player_number
```

Ejemplo:

```text
79822-26 Fielders Choice T4020Y 121 Camo LGE 9.pdf
```

Asset:

```text
asset_type = PRODUCTION_OUTPUT_PDF
output_id = salida esperada del roster real
```

## Boton `Actualizar Tracking`

Agregar un boton manual en la vista 27/Rapid de Control Center.

Comportamiento:

```text
POST /api/optimizador/tracking/refresh
```

Opciones sugeridas:

```text
?date=YYYY-MM-DD
?cliente=27 Sports
?roster=79822-26
```

Accion:

1. Leer outputs esperados pendientes o recientes.
2. Resolver `expected_path`.
3. Si no existe, buscar por `expected_filename` dentro de carpeta actual del pedido.
4. Si no existe, probar relocalizacion:
   - `/Volumes/Fullsize/New Art`
   - `/Volumes/Fullsize/TO PRINT`
   - `/Volumes/Fullsize/TO PRINT/<roster_year>`
5. Actualizar:
   - `found_path`
   - `file_status`
   - `last_checked_at`
6. Cruzar con sync existente de impresores/sublimado/almacen usando `WO#`, archivo o llaves disponibles.
7. Actualizar `tracking_status`.

El boton debe mostrar resumen:

```text
revisados
encontrados
movidos
pendientes
errores
```

## Polling Automatico

El polling actual de Control Center usa:

```env
RMC_SYNC_POLL_INTERVAL_MS=300000
RMC_SYNC_POLL_STABILIZE_MS=10000
```

Para 27/Rapid se recomienda no escanear carpetas completas cada ciclo.

Propuesta:

```text
Cada 60 segundos:
  revisar outputs pendientes del dia o ultimos N dias

Cada 5 minutos:
  revisar pedidos viejos todavia pendientes

Manual:
  boton Actualizar tracking
```

Variables sugeridas:

```env
RMC_OPT_TRACKING_POLL_ENABLED=true
RMC_OPT_TRACKING_POLL_INTERVAL_MS=60000
RMC_OPT_TRACKING_OLD_POLL_INTERVAL_MS=300000
RMC_OPT_TRACKING_LOOKBACK_DAYS=14
```

Regla importante:

```text
Polling de tracking revisa outputs ya registrados.
No debe descubrir pedidos nuevos escaneando volumen completo.
```

## Resolvedor De Rutas 27/Rapid

Control Center ya tiene un concepto similar en `src/services/rmcFileResolver.js`.

Para 27/Rapid se necesita una variante o extension que entienda:

```text
/Volumes/Fullsize/New Art/<carpeta pedido>
/Volumes/Fullsize/TO PRINT/<carpeta pedido>
/Volumes/Fullsize/TO PRINT/<anio>/<carpeta pedido>
```

`roster_year` se deriva de `-26`:

```text
79822-26 -> 2026
79822-27 -> 2027
```

Busqueda recomendada por output:

1. `expected_path`.
2. `found_path` anterior si existe.
3. Misma carpeta del pedido.
4. Carpeta equivalente en `TO PRINT`.
5. Carpeta equivalente en `TO PRINT/<roster_year>`.
6. Busqueda controlada por basename dentro de esas carpetas, no escaneo global.

## Cruce Con Impresores/Sublimado/Almacen

No cambiar el flujo existente.

El tracking 27/Rapid debe consumir las tablas espejo actuales generadas desde los mismos Exceles externos.

Cruces posibles:

```text
WO# -> work_order / wo
archivo -> nombre de archivo si existe en el Excel externo
roster -> si aparece en observaciones o nombre
style + size + player_number -> fallback de match
```

Orden recomendado:

1. Cruce fuerte por archivo si existe.
2. Cruce por WO# + archivo/parcial de nombre.
3. Cruce por WO# + style + size + player_number.
4. Cruce por WO# solamente solo como resumen de linea, no como confirmacion de output individual.

## Fases Recomendadas

### Fase 1 - Solo tablas y alta desde RMC Optimizador

- Crear tablas `rmc_opt_*`.
- RMC Optimizador da de alta pedidos, lineas, assets y outputs esperados.
- Control Center solo lee y muestra.

### Fase 2 - Boton manual `Actualizar tracking`

- Agregar endpoint.
- Agregar servicio resolvedor 27/Rapid.
- Actualizar `file_status` y `found_path`.
- Mostrar resumen en UI.

### Fase 3 - Cruce operativo

- Cruzar outputs esperados con impresores/sublimado/almacen.
- Actualizar `tracking_status`.
- Mostrar detalle por output.

### Fase 4 - Polling automatico

- Worker propio o extension controlada del worker actual.
- Revisar solo outputs pendientes/recientes.
- Mantener boton manual.

## Reglas Que No Deben Romperse

- No usar ejecuciones de RMC Optimizador como unica fuente de verdad.
- No mezclar datos 27/Rapid en tablas Nike.
- No depender de escaneo profundo de `/Volumes/Fullsize/TO PRINT`.
- No asumir que `style_lista` siempre sera igual al style del PDF final.
- No asumir que todos los outputs tienen `player_number`.
- No reemplazar archivos existentes.
- No registrar varias piezas fisicas como outputs separados si son el mismo archivo impreso varias veces.
- No usar `WO#` como unica identidad para Diseno; el eje operativo de Diseno es `Roster`.

## Ejemplo 79822-26

Lista diaria:

```text
79822-26 | WO 175674 | T4020A | 1 pcs
79822-26 | WO 175675 | T4020Y | 5 pcs
```

Roster real:

```text
T4020A | SML | #12 | qty 1
T4020Y | LGE | #9  | qty 1
T4020Y | LGE | #3  | qty 1
T4020Y | XLG | #8  | qty 1
T4020Y | XLG | #5  | qty 1
T4020Y | XLG | #4  | qty 1
```

Outputs esperados:

```text
79822-26 Fielders Choice T4020A Camo SML 12.pdf
79822-26 Fielders Choice T4020Y Camo LGE 9.pdf
79822-26 Fielders Choice T4020Y Camo LGE 3.pdf
79822-26 Fielders Choice T4020Y Camo XLG 8.pdf
79822-26 Fielders Choice T4020Y Camo XLG 5.pdf
79822-26 Fielders Choice T4020Y Camo XLG 4.pdf
```

Si hay subdiseno:

```text
79822-26 Fielders Choice T4020Y 121 Camo LGE 9.pdf
```

Registrar:

```text
style_output = T4020Y
subdesign = 121
size = LGE
player_number = 9
```

## Resumen

RMC Optimizador debe dar de alta lo esperado. RMC Control Center debe actualizar tracking de lo esperado.

El boton **Actualizar tracking** debe relocalizar archivos y cruzar estados operativos sin descubrir pedidos nuevos ni escanear el volumen completo.

