# CEP Registry

## Estado vigente

CEP Registry funciona como vista de consulta y diagnostico dentro de Control Center.

Politica actual:

- No hay boton activo para alta manual desde la UI.
- No hay flujo operativo para crear tablas desde Control Center.
- Control Center puede leer `cep_registry` y mostrar conteos.
- La integracion real de una nueva herramienta requiere contrato de lectura, rutas, queries y UI explicita.

## Tabla

`cep_registry`:

- `source_app`
- `runs_table`
- `app_version`
- `created_at`
- `updated_at`

## Endpoints vigentes

```http
GET /api/dashboard/registry
```

Lista herramientas registradas.

```http
GET /api/dashboard/tables
```

Devuelve conteos de tablas conocidas.

## Vista UI

La vista de sistema puede mostrar:

- Apps registradas.
- Conteos SQLite.
- Estado de lectura.

No debe sugerir que Control Center crea o corrige tablas CEP.

## Agregar una herramienta CEP a futuro

Antes de implementar:

1. Definir contrato de lectura de la herramienta.
2. Confirmar tablas producidas fuera de Control Center.
3. Agregar rutas de lectura.
4. Agregar componentes UI.
5. Agregar metricas al dashboard si aplica.
6. Documentar en `docs/integrations/`.

No asumir que `runs_table` basta para integrar automaticamente una herramienta nueva.
