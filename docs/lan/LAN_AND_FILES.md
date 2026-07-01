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
```

## Archivos servidos

La BD conserva rutas absolutas bajo el volumen de trabajo. El navegador no recibe permiso para leer cualquier ruta: solicita el archivo mediante un ID y el servidor valida que el archivo real permanezca dentro de `RMC_FILE_ROOT`.

Antes de servir un archivo, Control Center resuelve candidatos seguros sin modificar la ruta historica guardada en SQLite:

- Primero valida la ruta original registrada.
- Para PDFs Nike bajo `/Volumes/Fullsize/New Art`, si el original ya no existe, prueba candidatos equivalentes bajo `/Volumes/Fullsize/TO PRINT`.
- Para maquetas MockupTool, usa `rmc_mockuptool_items.path` como fuente principal y puede probar un candidato seguro bajo `/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND/Genericas` usando el nombre de archivo registrado.
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
