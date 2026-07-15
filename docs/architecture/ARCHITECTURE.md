# Arquitectura

`RMC Control Center` es una aplicacion interna simple: Express sirve APIs JSON, archivos estaticos y endpoints de descarga; el frontend vanilla consume esas APIs y pinta dashboard, tablas, detalles, graficas SVG y reportes.

## Principios

- Consumir datos existentes, no producir datos CEP.
- Mantener Node.js + Express + SQLite + HTML/CSS/JS sin build step.
- Mantener agregaciones y normalizacion de datos en backend cuando afecten contratos compartidos.
- Mantener el frontend como renderizador compacto y operativo.
- Evitar dependencias nuevas salvo necesidad explicita.

## Estructura

```text
.
├── assets/
│   ├── logo rmccc.svg
│   └── logo nike.svg
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       └── components/
├── src/
│   ├── db.js
│   ├── server.js
│   ├── routes/
│   └── services/
├── docs/
├── AGENTS.md
├── CURRENT_STATE.md
├── TASK_ROUTER.md
└── README.md
```

## Backend

`src/server.js`:

- Carga `.env`.
- Crea app Express.
- Habilita CORS y JSON.
- Sirve `public/`.
- Sirve `/assets`.
- Expone `/health`.
- Monta `/api/dashboard`, `/api/nike`, `/api/mockup`, `/api/reports` y `/api/files`.
- Monta `/api/chat` para el canal grupal LAN persistido en una tabla auxiliar propia.
- Escucha en `0.0.0.0` para LAN.
- Devuelve errores finales en JSON.

`src/db.js`:

- Abre SQLite con `better-sqlite3`.
- Usa `RMC_DB_PATH`.
- Requiere que el archivo exista.

## Frontend

`public/index.html` debe mantenerse pequeno:

- Define `#appRoot`.
- Carga CSS.
- Carga componentes.
- Carga `app.js`.

Los componentes viven en `public/js/components/` y usan el patron global:

```js
window.RMCComponents = window.RMCComponents || {};

window.RMCComponents.nombre = function nombre() {
  return `...html...`;
};
```

No usan imports, bundler ni framework.

El widget de chat se monta de forma independiente con `public/js/chat.js`, permanece disponible al cambiar de vista y consulta mensajes nuevos mediante sondeo incremental.

## Servicios de agrupacion

- `src/services/nikeGroups.js`: normaliza `fecha_embarque` y ano para consolidar ejecuciones Nike.
- `src/services/mockupGroups.js`: aplica el mismo modelo a MockupTool.
- `src/services/nikeFiles.js`: adjunta rutas derivadas para maqueta y plantilla Nike.

## Variables de entorno

```env
RMC_DB_PATH=/Users/rmlsub1/Documents/RMC - CEP/RMC_BD/RMC_CEP.sqlite
RMC_FILE_ROOT=/Volumes/Fullsize
RMC_LAN_HOST=RMLART2.local
PORT=3000
```

## Limites

- No hay autenticacion documentada para red externa.
- La aplicacion esta pensada para LAN confiable.
- SQLite es compartido con herramientas CEP externas; este repo debe tratarlo como modelo de lectura.
