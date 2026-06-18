# RMC Control Center - Especificacion del Proyecto

Documento vivo de referencia para entender el estado, decisiones y reglas del repo `RMC Control Center`.

Ultima actualizacion: 2026-06-16

## Objetivo

RMC Control Center es un panel web interno para centralizar metricas, ejecuciones, detalles y reportes de herramientas CEP de RMC.

La meta es que Produccion, Diseno y administracion interna puedan revisar rapidamente:

- Que herramientas CEP estan registradas.
- Cuantas ejecuciones tiene cada herramienta.
- Cuantos registros/items genero cada ejecucion.
- Si hubo errores o faltantes.
- Reportes descargables, empezando por Excel de RMCOp-Nike.
- Informacion historica por dia, mes y ejecucion.

El sistema debe mantenerse simple: Node.js + Express + SQLite + HTML/CSS/JS sin framework ni build step.

## Herramientas Integradas Actualmente

- `RMCOp-Nike`
- `RMC MockupTool`

Herramientas esperadas a futuro:

- `RMC Optimizador`
- Nuevos CEPs RMC registrados desde `CEP Registry`.

## Stack Tecnologico

- Backend: Node.js + Express.
- Base de datos: SQLite.
- Driver SQLite: `better-sqlite3`.
- Frontend: HTML, CSS y JavaScript vanilla.
- Reportes Excel: `exceljs`.
- Estilos: CSS propio basado en guia visual RMC.
- Sin React/Vue/Svelte, sin bundler, sin compilacion.

## Estructura Actual del Repo

```text
.
├── assets/
│   ├── logo rmccc.svg
│   └── logo nike.svg
├── public/
│   ├── index.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js
│       └── components/
│           ├── dashboardView.js
│           ├── layout.js
│           ├── mockupView.js
│           ├── nikeView.js
│           └── registryView.js
├── src/
│   ├── db.js
│   ├── server.js
│   └── routes/
│       ├── dashboard.routes.js
│       ├── mockup.routes.js
│       ├── nike.routes.js
│       └── reports.routes.js
├── .env
├── package.json
├── README.md
└── SPEC_RMC_CONTROL_CENTER.md
```

## Variables de Entorno

Archivo `.env`:

```env
RMC_DB_PATH=/Users/rmlsub1/Documents/RMC - CEP/RMC_BD/RMC_CEP.sqlite
PORT=3000
```

Notas:

- `RMC_DB_PATH` apunta a la BD compartida de los CEPs.
- `PORT` controla el puerto del servidor Express.
- El server escucha en `0.0.0.0` para uso en LAN.

## Servidor

Archivo principal:

```text
src/server.js
```

Responsabilidades:

- Cargar `.env`.
- Crear app Express.
- Habilitar CORS.
- Leer JSON.
- Servir `public/`.
- Servir `/assets`.
- Registrar rutas API:
  - `/api/dashboard`
  - `/api/nike`
  - `/api/mockup`
  - `/api/reports`
- Exponer `/health`.
- Manejar errores finales con JSON.

Endpoint health:

```http
GET /health
```

Respuesta esperada:

```json
{
  "ok": true,
  "service": "RMC Control Center"
}
```

## Base de Datos

Archivo de conexion:

```text
src/db.js
```

Decision importante:

- La BD se abre en modo lectura/escritura.
- Esto es necesario porque `CEP Registry` permite registrar nuevas apps CEP.
- Las rutas operativas siguen usando queries preparadas para limitar el alcance.

Tablas esperadas actualmente:

```text
cep_registry
rmcop_nike_runs
rmcop_nike_items
rmcop_nike_git_commits
rmc_mockuptool_runs
rmc_mockuptool_items
```

## Schema SQLite Actual

### cep_registry

Registra herramientas CEP disponibles.

Columnas:

- `source_app TEXT PRIMARY KEY`
- `runs_table TEXT NOT NULL`
- `app_version TEXT`
- `created_at TEXT`
- `updated_at TEXT`

Uso actual:

- Mostrar apps registradas.
- Agregar nuevas apps CEP desde modal.
- Preparar escalabilidad para futuros CEPs.

### rmcop_nike_runs

Registra ejecuciones de RMCOp-Nike.

Columnas principales:

- `id TEXT PRIMARY KEY`
- `created_at TEXT`
- `started_at TEXT`
- `finished_at TEXT`
- `tiempo TEXT`
- `herramienta TEXT`
- `pedidos INTEGER`
- `piezas INTEGER`
- `estilos INTEGER`
- `ok INTEGER`
- `errores INTEGER`
- `observaciones TEXT`

Uso actual:

- Tabla principal Nike.
- Dashboard Nike.
- Tiempo promedio por dia.
- Resumen mensual Nike.
- Reporte Excel por ejecucion.

### rmcop_nike_items

Items de una ejecucion Nike.

Columnas principales:

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

Uso actual:

- Detalle Nike al presionar `Ver`.
- Filtros y sort por columnas.
- Export Excel.

### rmcop_nike_git_commits

Historial de commits relacionado con Nike.

Columnas:

- `hash`
- `branch`
- `author`
- `fecha`
- `message`
- `files`
- `change_type`
- `created_at`

Uso actual:

- Conteo en dashboard general como `Commits Nike`.

### rmc_mockuptool_runs

Registra ejecuciones de MockupTool.

Columnas principales:

- `id`
- `fecha`
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

Nota de lenguaje UI:

- En UI, `pdfs_generados` debe mostrarse como `Plantillas`, no como PDFs.

Uso actual:

- Tabla principal MockupTool.
- Dashboard MockupTool.
- Grafica por ejecucion.
- Resumen mensual MockupTool.

### rmc_mockuptool_items

Items generados por MockupTool.

Columnas principales:

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
- `estado`
- `error`
- `tiempo`
- `clave`

Uso actual:

- Detalle MockupTool.
- Filtros y sort.

## APIs

### Dashboard

```http
GET /api/dashboard
```

Devuelve:

- Resumen general.
- Registry basico.
- Metricas Nike.
- Metricas MockupTool.
- Series diarias y mensuales.
- Ejecuciones recientes MockupTool para grafica por ejecucion.

Estructura conceptual:

```json
{
  "toolsCount": 2,
  "gitCommits": 0,
  "errores": 0,
  "registry": [],
  "nike": {
    "runs": 1,
    "pedidos": 166,
    "registros": 166,
    "piezas": 173,
    "estilos": 8,
    "ok": 166,
    "errores": 0,
    "promedioTiempo": "00:03:28",
    "daily": [],
    "monthly": [],
    "recentRuns": []
  },
  "mockup": {
    "runs": 4,
    "registros": 165,
    "plantillas": 165,
    "faltantes": 0,
    "filasSeleccionadas": 166,
    "grupos": 165,
    "disenadores": 1,
    "errores": 0,
    "daily": [],
    "monthly": [],
    "recentRuns": []
  }
}
```

### CEP Registry

```http
GET /api/dashboard/registry
```

Lista apps CEP registradas.

```http
POST /api/dashboard/registry
```

Body:

```json
{
  "source_app": "RMC Optimizador",
  "runs_table": "rmc_optimizador_runs",
  "app_version": "1.0.0"
}
```

Reglas:

- `source_app` obligatorio.
- `runs_table` obligatorio.
- `app_version` opcional.
- Si `source_app` ya existe responde `409`.
- Este endpoint solo registra metadata; no crea tablas operativas.

### Conteo de Tablas

```http
GET /api/dashboard/tables
```

Devuelve conteos de tablas conocidas.

### Nike

```http
GET /api/nike/runs
```

Lista ejecuciones Nike ordenadas por `id DESC`.

```http
GET /api/nike/runs/:id
```

Devuelve:

- `run`
- `items`

Si no existe responde `404`.

### MockupTool

```http
GET /api/mockup/runs
```

Lista ejecuciones MockupTool ordenadas por `id DESC`.

```http
GET /api/mockup/runs/:id
```

Devuelve:

- `run`
- `items`

Si no existe responde `404`.

### Reports

```http
GET /api/reports/nike/:id/excel
```

Genera Excel para una ejecucion Nike.

Columnas exportadas:

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

## Frontend

### index.html

`public/index.html` debe mantenerse pequeno.

Responsabilidad:

- Definir `#appRoot`.
- Cargar CSS.
- Cargar componentes.
- Cargar `app.js`.

No debe contener toda la UI completa.

### Componentes

Los componentes viven en:

```text
public/js/components/
```

Patron:

```js
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.nombre = function nombre() {
  return `...html...`;
};
```

No usan imports ni bundler para mantener compatibilidad directa con Express static.

### layout.js

Responsabilidades:

- Renderizar navbar movil.
- Renderizar sidebar.
- Renderizar layout general.
- Montar vistas.
- Renderizar log colapsable.
- Renderizar footer.
- Renderizar modal Registry.

Funcion principal:

```js
window.RMCComponents.renderApp(root)
```

### dashboardView.js

Responsabilidades:

- Dashboard General.
- Dashboard RMCOp-Nike.
- Dashboard RMC MockupTool.
- Contenedores de graficas.
- Tablas mensuales.

### nikeView.js

Responsabilidades:

- Tabla de ejecuciones Nike.
- Filtro por texto/columna.
- Panel de detalle.
- Tabla de items Nike.
- Mostrar herramienta por ítem en detalle.
- Boton ocultar detalle.

### mockupView.js

Responsabilidades:

- Tabla de ejecuciones MockupTool.
- Filtro por texto/columna.
- Panel de detalle.
- Tabla de items MockupTool.
- Boton ocultar detalle.

### registryView.js

Responsabilidades:

- Vista Exportaciones.
- Vista CEP Registry.
- Tabla de apps registradas.
- Tabla de conteos SQLite.
- Modal de alta CEP.

### app.js

Responsabilidades:

- Montar componentes con `RMCComponents.renderApp`.
- Cargar datos de APIs.
- Pintar dashboard.
- Pintar tablas.
- Pintar graficas.
- Aplicar filtros.
- Aplicar sort.
- Controlar sidebar movil.
- Controlar log.
- Controlar modal Registry.

Orden de arranque:

1. Renderizar componentes.
2. Conectar eventos.
3. Cargar datos iniciales.

## UI / UX

La UI debe seguir la guia visual RMC.

Principios:

- Herramienta de produccion.
- Oscura, compacta, directa.
- No parecer landing page.
- Paneles simples.
- Lectura rapida.
- Acciones claras.
- Logs disponibles pero no invasivos.

## Paleta Oficial

```css
--rmc-bg: #2b2b2b;
--rmc-surface: #3a3a3a;
--rmc-surface-soft: #333333;
--rmc-surface-deep: #1e1e1e;
--rmc-field: #181a1d;
--rmc-border: #444444;
--rmc-border-strong: #666666;
--rmc-text: #ffffff;
--rmc-text-soft: #eeeeee;
--rmc-muted: #cccccc;
--rmc-muted-low: #888888;
--rmc-primary: #821424;
--rmc-primary-hover: #a21a2f;
--rmc-primary-strong: #bd1f36;
--rmc-secondary: #444444;
--rmc-secondary-hover: #555555;
--rmc-focus: #f7c948;
--rmc-log-text: #00ff00;
--rmc-log-success: #50fa7b;
--rmc-log-error: #ff5555;
--rmc-log-warning: #f1fa8c;
```

Fuentes:

- UI: `Arial`
- Log: `monospace`

## Assets

```text
assets/logo rmccc.svg
assets/logo nike.svg
```

Uso:

- `logo rmccc.svg`: logo principal del sidebar.
- `logo nike.svg`: icono del boton de RMCOp-Nike.

Los assets se sirven desde:

```http
/assets/...
```

## Sidebar y Responsive

Desktop:

- Sidebar fijo en layout grid.
- Logo centrado arriba.
- Botones por grupos:
  - Dashboard
  - Herramientas
  - Reportes
  - Sistema

Mobile:

- Existe navbar superior fija.
- El boton hamburguesa vive en esa navbar.
- El sidebar se oculta como drawer lateral.
- Overlay oscuro cierra el drawer.
- Tecla `Escape` tambien cierra el drawer.

Iconos:

- Burger: `<i class="fi fi-br-menu-burger"></i>`
- Mockup: `<i class="fi fi-rs-file-pdf"></i>`
- Nike: `assets/logo nike.svg`

El CSS incluye fallback visual para los iconos `fi` si la fuente externa no esta cargada.

## Dashboard

### General

Cards:

- Herramientas CEP
- Commits Nike
- Errores Totales

### RMCOp-Nike

Cards:

- Ejecuciones
- Pedidos
- Registros
- Piezas
- Estilos
- Tiempo Promedio

Visualizaciones:

- Grafica de tiempo promedio por dia.
- Tabla mensual Nike.

Tabla mensual Nike:

- Mes
- Ejecuciones
- Pedidos
- Piezas
- Tiempo prom.
- Errores

### RMC MockupTool

Cards:

- Ejecuciones
- Registros
- Plantillas Generadas
- Plantillas Faltantes
- Filas Seleccionadas
- Disenadores

Importante:

- En UI se debe decir `Plantillas`, no `PDFs`.

Visualizaciones:

- Grafica de plantillas por ejecucion.
- Tabla mensual MockupTool.

Tabla mensual MockupTool:

- Mes
- Ejecuciones
- Plantillas
- Faltantes

## Graficas

Las graficas se dibujan en SVG desde `public/js/app.js`.

No se usa libreria externa.

Tipos actuales:

- Line chart diario para Nike.
- Bar chart por ejecucion para MockupTool.

Decision tomada:

- Nike por ejecucion se ve mal con pocos datos.
- Nike necesita tabla mensual para lectura estable.
- Mockup por ejecucion si es util porque muestra estilos como `A1000`, `Y1000`, `A2000`, `Y2000`.

## Tablas

Funciones comunes:

- Filtro por texto.
- Filtro por columna.
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

Sort soporta:

- Texto alfabetico.
- Numeros.
- Fechas `DD/MM/YYYY`.
- Duraciones `HH:MM:SS`.

## Detalles

### Nike

Al dar click en `Ver`:

- Se abre `detailSection`.
- Muestra run id, fecha, piezas, tiempo y errores.
- Carga items relacionados.
- Permite filtrar/sortear items.
- Tiene boton `Ocultar`.

### MockupTool

Al dar click en `Ver`:

- Se abre `mockupDetailSection`.
- Muestra run id, fecha/hora y plantillas.
- Carga items relacionados.
- Permite filtrar/sortear items.
- Tiene boton `Ocultar`.

## Log de Consola

El log existe pero esta colapsado por defecto.

Motivo:

- Es util para diagnostico.
- No debe robar espacio del dashboard.

Controles:

- Mostrar/Ocultar.
- Limpiar.

Colores:

- Normal: verde terminal.
- Success: verde suave.
- Warning: amarillo.
- Error: rojo.

## CEP Registry

Pantalla de sistema para registrar y revisar CEPs.

Incluye:

- Tabla de apps registradas.
- Tabla de conteos SQLite.
- Boton `Agregar nuevo`.
- Modal con formulario.

Formulario:

- App
- Tabla runs
- Version

Endpoint:

```http
POST /api/dashboard/registry
```

Importante:

- Registrar un CEP no crea automaticamente sus tablas.
- Solo agrega metadata a `cep_registry`.
- La integracion real de una nueva herramienta requiere crear rutas, queries y componentes o una estrategia generica por `runs_table`.

## Reportes

Actualmente:

- Excel Nike por ejecucion.

Pendiente probable:

- Excel MockupTool.
- Reportes agregados mensuales.
- Reportes por herramienta desde vista `Exportaciones`.

## Convenciones de Codigo

- Usar comentarios por bloque funcional, no comentar cada linea.
- Mantener IDs HTML estables porque `app.js` los usa para pintar datos.
- Nuevas vistas deben ir en `public/js/components/`.
- Nuevas APIs deben ir en `src/routes/`.
- Evitar meter framework hasta que haya una razon fuerte.
- Evitar duplicar queries complejas en frontend; agregaciones deben venir del backend.
- Mantener UI compacta y pensada para produccion.

## Como Agregar una Nueva CEP

Pasos sugeridos:

1. Registrar metadata en `CEP Registry`.
2. Crear tablas SQLite de runs/items para esa herramienta.
3. Crear ruta en `src/routes/nueva.routes.js`.
4. Montar ruta en `src/server.js`.
5. Crear componente en `public/js/components/nuevaView.js`.
6. Agregar boton en sidebar dentro de `layout.js`.
7. Agregar loader/render en `public/js/app.js`.
8. Agregar metricas al dashboard si aplica.

## Estado Actual Verificado

Pruebas realizadas durante el desarrollo:

- `node --check` en scripts backend y frontend.
- Endpoints principales responden `200`.
- Registry duplicado responde `409`.
- Dashboard carga sin errores de consola.
- Componentes renderizan desde `#appRoot`.
- Sort funciona.
- Filtros funcionan.
- Modal Registry abre.
- Mockup muestra grafica por ejecucion con 4 barras.
- Nike muestra resumen mensual y grafica diaria.
- Responsive drawer funciona.

## Decisiones Pendientes / Ideas

- Definir si `CEP Registry` debe crear tablas automaticamente o solo registrar metadata.
- Agregar reportes Excel para MockupTool.
- Convertir graficas a componentes separados si crecen mas.
- Agregar paginacion si las tablas llegan a miles de rows.
- Agregar endpoint generico por CEP cuando haya mas herramientas.
- Agregar autenticacion si se expone mas alla de LAN confiable.
- Agregar respaldo/validacion de schema al iniciar.

