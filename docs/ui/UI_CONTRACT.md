# UI Contract

Contrato visual y de comportamiento para la interfaz de `RMC Control Center`.

## Principios

- Herramienta de produccion.
- Oscura, compacta y directa.
- No debe parecer landing page.
- Paneles simples.
- Lectura rapida.
- Acciones claras.
- Logs disponibles pero no invasivos.

## Paleta base

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

- `assets/logo rmccc.svg`: logo principal del sidebar.
- `assets/logo nike.svg`: icono del boton de RMCOp-Nike.

Se sirven desde `/assets/...`.

## Layout

Desktop:

- Sidebar fijo en layout grid.
- Logo centrado arriba.
- Botones por grupos: Dashboard, Herramientas, Reportes, Sistema.

Mobile:

- Navbar superior fija.
- Boton hamburguesa en navbar.
- Sidebar como drawer lateral.
- Overlay oscuro para cerrar.
- Tecla `Escape` cierra drawer.

Iconos:

- Burger: `<i class="fi fi-br-menu-burger"></i>`
- Mockup: `<i class="fi fi-rs-file-pdf"></i>`
- Nike: `assets/logo nike.svg`

El CSS incluye fallback visual si la fuente externa de iconos no carga.

## Componentes

`layout.js`:

- Navbar movil.
- Sidebar.
- Layout general.
- Montaje de vistas.
- Log colapsable.
- Footer.

`dashboardView.js`:

- Dashboard general.
- Dashboard RMCOp-Nike.
- Dashboard RMC MockupTool.
- Contenedores de graficas.
- Tablas mensuales.

`nikeView.js`:

- Tabla de ejecuciones Nike.
- Filtro por texto/columna.
- Panel de detalle.
- Tabla de items Nike.
- Herramienta por item.
- Boton ocultar detalle.

`mockupView.js`:

- Tabla de ejecuciones MockupTool.
- Filtro por texto/columna.
- Panel de detalle.
- Tabla de items MockupTool.
- Boton ocultar detalle.

`registryView.js`:

- Vista Exportaciones.
- Vista CEP Registry.
- Tabla de apps registradas.
- Tabla de conteos SQLite.

## Log de consola

El log esta colapsado por defecto.

Controles:

- Mostrar/Ocultar.
- Limpiar.

Colores:

- Normal: verde terminal.
- Success: verde suave.
- Warning: amarillo.
- Error: rojo.

## Lenguaje UI

- Usar `Plantillas` o `Maquetas` para resultados de MockupTool.
- Evitar mostrar `PDFs` como etiqueta principal.
- Mantener terminos operativos: embarque, pedidos, piezas, estilos, errores, faltantes.
