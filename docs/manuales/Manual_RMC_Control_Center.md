# Manual de RMC Control Center

## Parte del RMC Control System

**Sistema paraguas:** RMC Control System  
**Herramienta:** RMC Control Center  
**Documento:** Manual resumido para junta interna de RMC  
**Fecha:** 1 de julio de 2026  
**Desarrollado y documentado por:** Alberto Villarreal

RMC Control Center es un panel web interno de planta para consultar información operativa generada por herramientas internas de RMC. Su función es dar visibilidad, trazabilidad y control interno sin reemplazar a Lansa ni modificar los procesos oficiales conectados con USA.

> [INSERTAR IMAGEN: Página principal de RMC Control Center]

## 1. Descripción general

RMC Control Center forma parte del RMC Control System como herramienta complementaria de consulta. El sistema lee una base SQLite compartida, muestra métricas, ejecuciones, piezas, archivos, maquetas, plantillas, reportes y avances generados principalmente por RMCOp-Nike, RMC MockupTool y fuentes externas sincronizadas.

La herramienta está pensada para uso interno de planta. No produce datos CEP, no corrige items operativos y no escribe tablas operativas de RMCOp-Nike ni RMC MockupTool. La excepción documentada es el módulo de sincronización externa, que escribe tablas auxiliares propias de RMC Control Center para espejear Exceles operativos.

## 2. Objetivo

El objetivo es centralizar información operativa que normalmente está dispersa entre herramientas, carpetas, archivos, Exceles y consultas informales. Con esto se busca:

- Reducir llamadas y mensajes repetidos.
- Facilitar búsqueda de pedidos, piezas, maquetas, plantillas y archivos.
- Mejorar trazabilidad interna por Work Order, Style, Ship Order y embarque.
- Dar visibilidad al avance operativo entre áreas.
- Crear una base para monitoreo interno por etapas.

## 3. Relación con Lansa

Lansa sigue siendo el sistema oficial conectado con USA para pedidos y reportes oficiales. RMC Control Center no reemplaza Lansa, no necesita duplicar todos sus datos y no debe usarse como sistema oficial de reporte.

La diferencia práctica es:

| Sistema | Responde principalmente |
|---|---|
| Lansa | Qué pedidos existen oficialmente y qué se reporta a USA |
| RMC Control Center | Qué está pasando internamente con registros, piezas, archivos, maquetas y áreas |

RMC Control Center funciona como una capa interna de visibilidad para planta, supervisión y soporte operativo.

## 4. Problemas que resuelve

- Información dispersa entre bases, carpetas y Exceles.
- Dificultad para encontrar PDFs, plantillas o maquetas.
- Falta de visibilidad del avance interno.
- Preguntas repetidas sobre si algo ya se generó o procesó.
- Dependencia de una sola persona para localizar información.
- Falta de historial consultable por embarque, pedido o pieza.

## 5. Qué muestra actualmente

La inspección del repo detectó estas funciones reales:

| Módulo | Funciones actuales |
|---|---|
| Dashboard | Métricas generales, Nike, MockupTool, errores, series diarias y resumen mensual |
| RMCOp-Nike | Runs agrupados por embarque, detalle de items, filtros, sort, exporte Excel y recursos por pieza |
| RMC MockupTool | Runs de maquetas agrupados por embarque, detalle de items, filtros, sort, exporte Excel y recursos por maqueta |
| Archivos | Visualización y descarga segura de maqueta, plantilla/PDF y Excel vinculado |
| CEP Registry | Consulta de herramientas registradas y conteos SQLite |
| Sync externo | Fuentes externas, corridas de sincronización, historial y cruce con Nike |
| Tracking por área | Estado operativo Nike: En proceso de impresión, Bajado a Sublimado, Parcial en Sublimado o En almacén |

> [INSERTAR IMAGEN: Búsqueda de pedido]  
> [INSERTAR IMAGEN: Detalle de pieza]  
> [INSERTAR IMAGEN: Visualización de PDF]  
> [INSERTAR IMAGEN: Visualización de maqueta]

## 6. Flujo general de uso

1. Acceder desde la red local, por ejemplo `http://RMLART2.local:3000`.
2. Revisar el dashboard para ver actividad general.
3. Entrar a Pedidos RMC Nike o Maquetas RMC Nike.
4. Buscar por campos reales como WO, Ship Order, Style, Equipo, Variante, Talla, Estado, Diseñador o archivo.
5. Abrir el detalle del embarque.
6. Filtrar u ordenar la tabla para ubicar una pieza.
7. Abrir el detalle del item.
8. Consultar maqueta, plantilla/PDF, Excel vinculado o tracking por área cuando aplique.

> [INSERTAR IMAGEN: Ejemplo de acceso por LAN]

## 7. Entradas y salidas principales

| Entrada | Uso |
|---|---|
| Base SQLite compartida (`RMC_DB_PATH`) | Fuente principal de runs, items, registry, commits y tablas espejo |
| RMCOp-Nike | Pedidos, piezas, plantillas, estados y errores |
| RMC MockupTool | Maquetas, runs, diseñadores, faltantes y rutas |
| Reporte de Impresión y Reposiciones | Cruce inicial de Diseño / Impresión hacia Sublimado |
| Producción Sublimado - Liberado a Línea | Detección de salida de Sublimado hacia almacén |
| Rutas bajo `RMC_FILE_ROOT` | Archivos servidos de forma segura desde backend |

| Salida o consulta | Beneficio |
|---|---|
| Dashboard | Vista rápida para supervisión |
| Detalle Nike | Consulta de piezas y recursos relacionados |
| Detalle MockupTool | Consulta de maquetas y recursos relacionados |
| Reportes Excel | Revisión externa o análisis operativo |
| Tracking por área | Visibilidad interna del avance |
| CEP Registry | Diagnóstico técnico e inventario de herramientas |

## 8. Monitoreo por áreas

El monitoreo por áreas está iniciando con el flujo Diseño / Impresión / Sublimado / Almacén para items Nike.

Estado actual:

- Reporte de Impresión y Reposiciones: implementado como fuente externa.
- Producción Sublimado - Liberado a Línea: implementado como fuente externa.
- Cruce principal: `work_order = wo`.
- Bloque visual de tracking en detalle Nike: implementado.
- Expansión a más áreas: pendiente de validar por etapas.

La regla de trabajo recomendada es no conectar áreas al tanteo. Cada fuente debe validarse con datos reales, significado operativo, responsable, frecuencia y confiabilidad.

> [INSERTAR IMAGEN: Flujo Diseño -> Sublimado]

## 9. Estado actual

Implementado:

- Servidor Node/Express con acceso LAN.
- Frontend HTML/CSS/JS vanilla sin build step.
- Dashboard general, Nike y MockupTool.
- Detalle agrupado por embarque.
- Filtros, sort y filtros por columna tipo Excel.
- Exportes Excel por embarque.
- Visualización y descarga segura de archivos.
- CEP Registry en modo consulta.
- Sync externo de Impresión/Sublimado y Sublimado/Almacén.
- Polling automático por cambio de archivo.

Pendiente de validar:

- Cadencia real del polling en operación diaria.
- Monitoreo de áreas adicionales.
- Roles, usuarios o autenticación si se expone fuera de LAN confiable.
- Reglas completas para casos de múltiples maquetas relacionadas.

Conteos reales detectados en SQLite el 1 de julio de 2026:

| Tabla | Registros |
|---|---:|
| `cep_registry` | 2 |
| `rmcop_nike_runs` | 22 |
| `rmcop_nike_items` | 496 |
| `rmc_mockuptool_runs` | 20 |
| `rmc_mockuptool_items` | 498 |
| `rmc_external_sources` | 2 |
| `rmc_sync_runs` | 58 |
| `rmc_print_sublimation_log` | 5,269 |
| `rmc_sublimation_output_log` | 12,624 |

## 10. Requisitos técnicos

| Elemento | Detalle |
|---|---|
| Backend | Node.js + Express |
| Base de datos | SQLite con `better-sqlite3` |
| Frontend | HTML, CSS y JavaScript vanilla |
| Excel | `exceljs` para reportes y `xlsx` para fuentes externas |
| Servidor | Escucha en `0.0.0.0` para LAN |
| Ruta BD | `RMC_DB_PATH` |
| Ruta archivos | `RMC_FILE_ROOT=/Volumes/Fullsize` |
| Puerto | `PORT=3000` |
| Host LAN | `RMC_LAN_HOST=RMLART2.local` |

Comandos principales:

```bash
npm install
npm start
```

Healthcheck:

```http
GET /health
```

## 11. Manual rápido

Para consultar un pedido Nike:

1. Abrir RMC Control Center.
2. Entrar a Pedidos RMC Nike.
3. Buscar por WO, Ship Order, Style o Talla.
4. Abrir el detalle del embarque.
5. Abrir Ver más en la pieza.
6. Revisar maqueta, plantilla/PDF, Excel o tracking por área.

Para consultar maquetas:

1. Entrar a Maquetas RMC Nike.
2. Buscar por WO, Style, Equipo, Variante, Talla o Diseñador.
3. Abrir detalle del embarque.
4. Abrir Ver más en la maqueta.
5. Visualizar o descargar maqueta y Excel vinculado.

## 12. Qué no hace actualmente

- No reemplaza Lansa.
- No reporta oficialmente a USA.
- No crea ni corrige runs/items de RMCOp-Nike.
- No genera maquetas de RMC MockupTool.
- No contiene necesariamente todos los datos de Lansa.
- No tiene autenticación documentada para red externa.
- No debe considerarse sistema final para todas las áreas.
- No debe usarse para procesos todavía no validados.

## 13. Mantenimiento y soporte

Archivos clave:

| Archivo | Uso |
|---|---|
| `src/server.js` | Express, rutas API, static files y LAN |
| `src/db.js` | Conexión SQLite por `RMC_DB_PATH` |
| `src/routes/nike.routes.js` | Nike y tracking Impresión/Sublimado |
| `src/routes/mockup.routes.js` | MockupTool |
| `src/routes/files.routes.js` | Archivos seguros |
| `src/routes/sync.routes.js` | Fuentes externas |
| `src/services/printSublimationSync.js` | Lectura y sync de Exceles |
| `src/services/syncPoller.js` | Polling automático |
| `public/js/app.js` | UI, filtros, sort, modales y gráficas |

Problemas comunes:

| Problema | Revisar |
|---|---|
| No abre la página | `npm start`, puerto 3000 y red local |
| Dashboard vacío | `RMC_DB_PATH` y tablas SQLite |
| Archivo no disponible | Ruta bajo `RMC_FILE_ROOT` |
| Tracking vacío | Work Order y tablas espejo de sync |
| Sync falla | Volumen montado, hoja correcta y fuente activa |

## 14. Roadmap

| Mejora | Prioridad | Estado |
|---|---|---|
| Fortalecer flujo Diseño -> Sublimado | Alta | En evolución |
| Integrar más áreas | Alta | Pendiente de validar |
| Dashboards por área | Media | Pendiente |
| Roles/usuarios | Media | Pendiente |
| Mejorar resolución New Art / TO PRINT | Alta | En evolución |
| Reportes adicionales | Media | Pendiente |
| Mejor auditoría de sync | Media | Base implementada |

## 15. Espacios para imágenes

- [INSERTAR IMAGEN: Página principal de RMC Control Center]
- [INSERTAR IMAGEN: Búsqueda de pedido]
- [INSERTAR IMAGEN: Detalle de pieza]
- [INSERTAR IMAGEN: Visualización de PDF]
- [INSERTAR IMAGEN: Visualización de maqueta]
- [INSERTAR IMAGEN: Flujo Diseño -> Sublimado]
- [INSERTAR IMAGEN: Ejemplo de acceso por LAN]

## Anexo. Endpoints principales

| Ruta | Uso |
|---|---|
| `GET /api/dashboard` | Dashboard |
| `GET /api/nike/runs` | Runs Nike |
| `GET /api/nike/runs/:id` | Detalle Nike |
| `GET /api/nike/items/:id/print-sublimation` | Tracking por área |
| `GET /api/mockup/runs` | Runs MockupTool |
| `GET /api/mockup/runs/:id` | Detalle MockupTool |
| `GET /api/reports/nike/:id/excel` | Export Nike |
| `GET /api/reports/mockup/:id/excel` | Export MockupTool |
| `GET /api/files/...` | Visualización, descarga y preview de archivos |
| `GET /api/sync/sources` | Fuentes externas |
| `POST /api/sync/sources/:id/run` | Sync manual |
