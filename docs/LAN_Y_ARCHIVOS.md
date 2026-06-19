# LAN y archivos de RMC Control Center

## Direccion interna

El servidor escucha en `0.0.0.0`, por lo que otros equipos de la misma red pueden entrar usando la IP de la Mac y el puerto configurado.

Actualmente la Mac servidor ya publica `RMLART2.local`, por lo que la direccion disponible sin cambios adicionales es `http://RMLART2.local:3000`.

Para usar `http://rmccontrolcenter.local:3000`, configura una sola vez el nombre Bonjour de la Mac servidor:

```bash
sudo scutil --set LocalHostName rmccontrolcenter
sudo scutil --set HostName rmccontrolcenter.local
```

Despues, reinicia el servicio mDNS o la Mac. Los clientes Mac suelen resolver `.local` directamente. En Windows se requiere compatibilidad mDNS/Bonjour; si la red no la ofrece, conviene crear el nombre `rmccontrolcenter` en el DNS del router apuntando a una IP reservada para la Mac.

El puerto `:3000` sigue siendo necesario. Para usar solamente `http://rmccontrolcenter`, se necesita un proxy local en el puerto 80 o una regla equivalente en la infraestructura de red.

## Archivos Nike

La BD conserva rutas absolutas bajo `/Volumes/Fullsize`. El navegador no recibe permiso para leer cualquier ruta: solicita el archivo mediante el ID del item Nike y el servidor valida que el archivo real permanezca dentro de `RMC_FILE_ROOT`.

- `GET /api/files/nike/:itemId/maqueta/view` muestra la maqueta creada por RMC MockupTool.
- `GET /api/files/nike/:itemId/plantilla/view` muestra la plantilla creada por RMCOp-Nike.
- Al cambiar `/view` por `/download`, se descarga el archivo correspondiente.

No se ejecutan comandos `open`, `explorer` ni rutas recibidas directamente desde el navegador. Esto permite que el mismo flujo funcione desde clientes Mac y Windows sin abrir Finder en la Mac servidor.
