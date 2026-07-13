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

La interfaz soporta tema `Dark` y tema `Light`.

- `Dark` es el modo por defecto para operacion diaria.
- `Light` usa superficies claras para usuarios que prefieren lectura en blanco/claro.
- El rojo RMC se mantiene como color de acciones principales, estado activo y acentos de marca.
- La preferencia se guarda localmente en el navegador.

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
- `assets/logo rmc mt light.svg`: logo alterno del sidebar para tema `Light`.
- `assets/logo nike.svg`: icono del boton de RMCOp-Nike.

Se sirven desde `/assets/...`.

## Layout

Desktop:

- Sidebar fijo en layout grid.
- Logo centrado arriba.
- Botones por grupos: Dashboard, Herramientas Nike, Herramienta 27 Sports / Rapid, Reportes, Sistema.
- `Herramientas Nike` contiene `Pedidos RMC Nike` y `Maquetas RMC Nike`.
- `Herramienta 27 Sports / Rapid` muestra un panel provisional sin integracion operativa real todavia.
- Debajo de `SISTEMA` se muestra el selector de tema `Dark / Light`.
- Debajo del selector se muestra `Acceder` como entrada provisional para futura autenticacion y permisos.
- `Catalogo Op-Nike` vive en `SISTEMA` y pide PIN temporal antes de abrir la pantalla.

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
- Selector local de tema claro/oscuro.
- Modal provisional de acceso.
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
- Filtro por mes sincronizado con el mes del Dashboard y selector local en la tabla.
- Panel de detalle.
- Resumen compacto de circulacion activa por etapa dentro del detalle Nike.
- Tabla de items Nike.
- Columna `Tipo` entre `Variante` y `Talla` para filtrar `Generica`, `Personalizada` o `Manual`.
- Filtros por columna tipo Excel en la tabla de detalle.
- Herramienta por item.
- Boton ocultar detalle.

`opNikeCatalogView.js`:

- Pantalla `Catalogo Op-Nike` bajo `SISTEMA`.
- Acceso protegido por PIN temporal `290497` mientras no exista autenticacion formal.
- Tabla de variantes/diseños desde `rmc_nike_style_variants`.
- Formulario de alta/edicion de variantes, aliases y reglas de ruta/nombre.
- Formulario de alta/edicion de familias desde `rmc_nike_style_families`.
- Boton `Validar regla` con campos faltantes visibles.
- Boton `Activar` deshabilitado hasta que la validacion permita `active`.
- Preview de ruta esperada, nombre final, tokens usados y estado de archivo.
- No acepta JavaScript editable por usuario; usa patrones y estrategias controladas.

`mockupView.js`:

- Tabla de ejecuciones MockupTool.
- Filtro por texto/columna.
- Filtro por mes sincronizado con el mes del Dashboard y selector local en la tabla.
- Panel de detalle.
- Tabla de items MockupTool.
- Columna `Tipo` entre `Variante` y `Talla` para filtrar `Generica` o `Personalizada`.
- Filtros por columna tipo Excel en la tabla de detalle.
- Boton ocultar detalle.

`rapid27View.js`:

- Panel provisional 27 Sports / Rapid.
- Cards de pedidos, registros, piezas, estilos, impresion y sublimado.
- Tabla preparada para embarques/pedidos futuros.
- No consulta ni escribe tablas operativas de 27 Sports / Rapid mientras no exista contrato de lectura.

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
