# LAN y Archivos

## Direccion interna

El servidor escucha en `0.0.0.0`, por lo que otros equipos de la misma red pueden entrar usando la IP de la Mac y el puerto configurado.

La Mac servidor publica actualmente:

```text
http://RMLART2.local:3000
```

Para usar `http://rmccontrolcenter.local:3000`, configurar una sola vez el nombre Bonjour de la Mac servidor:

```bash
sudo scutil --set LocalHostName rmccontrolcenter
sudo scutil --set HostName rmccontrolcenter.local
```

Despues reiniciar mDNS o la Mac.

Notas:

- Clientes Mac suelen resolver `.local` directamente.
- En Windows se requiere compatibilidad mDNS/Bonjour.
- Si la red no resuelve `.local`, conviene crear `rmccontrolcenter` en DNS del router apuntando a una IP reservada para la Mac.
- El puerto `:3000` sigue siendo necesario.
- Para usar solo `http://rmccontrolcenter`, se necesita proxy local en puerto 80 o regla equivalente de infraestructura.

## Variables relacionadas

```env
PORT=3000
RMC_LAN_HOST=RMLART2.local
RMC_FILE_ROOT=/Volumes/Fullsize
RMC_ACCESS_LOG_ENABLED=true
RMC_ACCESS_LOG_PATH=logs/access.log
RMC_ACCESS_LOG_CLIENT_NAMES=127.0.0.1=Servidor,10.5.2.36=Equipo-LAN
```

## Registro de accesos

El servidor registra cada request HTTP en `logs/access.log` usando formato JSON Lines. El archivo queda fuera de git por `.gitignore`.

Cada linea incluye:

- `ts`: fecha/hora ISO del request.
- `client_ip`: IP detectada del cliente.
- `client_name`: alias configurado para esa IP, si existe.
- `is_local`: `true` para `localhost`/`127.0.0.1`, `false` para otra PC de la LAN.
- `method`, `path`, `status` y `duration_ms`.
- `user_agent` y `referer`.

Los alias se configuran en `.env` separando pares `ip=Nombre` con comas:

```env
RMC_ACCESS_LOG_CLIENT_NAMES=127.0.0.1=Servidor,10.5.2.36=Equipo-LAN
```

Al iniciar el server se imprime la ruta activa del log. Cuando aparece una IP no-local por primera vez durante esa ejecucion, tambien se imprime en consola:

```text
[access-log] Cliente LAN detectado: Equipo-LAN (10.5.2.36) (GET /)
```

Para revisar accesos recientes:

```bash
tail -n 50 logs/access.log
```

Para desactivar el registro:

```env
RMC_ACCESS_LOG_ENABLED=false
```

## Archivos servidos

La BD conserva rutas absolutas bajo el volumen de trabajo. El navegador no recibe permiso para leer cualquier ruta: solicita el archivo mediante un ID y el servidor valida que el archivo real permanezca dentro de `RMC_FILE_ROOT`.

Antes de servir un archivo, Control Center resuelve candidatos seguros sin modificar la ruta historica guardada en SQLite:

- Primero valida la ruta original registrada.
- Para PDFs Nike bajo `/Volumes/Fullsize/New Art`, si el original ya no existe, prueba candidatos equivalentes bajo `/Volumes/Fullsize/TO PRINT`.
- Para PDFs Nike ya registrados bajo `/Volumes/Fullsize/TO PRINT/NIKE ORDERS`, si la carpeta del pedido fue movida a una carpeta mensual como `JUNIO`, `NIKE JULIO` o una carpeta anual como `NIKE 2026/JULIO`, prueba candidatos equivalentes usando `fecha_embarque` y el nombre de la carpeta original.
- Para maquetas MockupTool, usa `rmc_mockuptool_items.path` como fuente principal y puede probar candidatos seguros bajo `LISTAS ON DEMAND/Genericas`, `LISTAS ON DEMAND/Personalizadas`, `LISTAS NIKE/Genericas` y `LISTAS NIKE/Personalizadas`.
- Para carpetas de pedido movidas, conserva el tramo final del path registrado. Ejemplo: `NIKE OD 3 JUL/Y1000/SML/archivo.pdf` puede resolverse aunque haya pasado de `LISTAS ON DEMAND/Personalizadas` a `LISTAS NIKE/Personalizadas`.
- Si no hay archivo resuelto, la API responde error controlado y la UI muestra estado textual.

Nike:

```http
GET /api/files/nike/:itemId/maqueta/view
GET /api/files/nike/:itemId/maqueta/download
GET /api/files/nike/:itemId/plantilla/view
GET /api/files/nike/:itemId/plantilla/download
```

MockupTool:

```http
GET /api/files/mockup/:itemId/maqueta/view
GET /api/files/mockup/:itemId/maqueta/download
```

## Seguridad de ruta

`src/routes/files.routes.js` valida:

- Que la ruta solicitada sea absoluta cuando aplica.
- Que la ruta normalizada permanezca dentro de `RMC_FILE_ROOT`.
- Que el archivo exista y sea archivo regular.
- Que `realpath` final no escape por enlace simbolico.

No se ejecutan comandos `open`, `explorer` ni rutas recibidas directamente desde el navegador. Esto permite que clientes Mac y Windows usen el mismo flujo sin abrir Finder en la Mac servidor.
