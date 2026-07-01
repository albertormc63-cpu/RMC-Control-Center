# Historial de commits - RMC Control System

## Objetivo

`rmc_git_commits` centraliza el historial tecnico de commits de herramientas internas del RMC Control System:

- RMCOp-Nike
- RMC Control Center
- RMC MockupTool
- RMC Optimizador

La tabla permite documentar avances reales, construir changelog interno, mostrar historial tecnico desde RMC Control Center y conservar trazabilidad de desarrollo por herramienta.

## Tabla central

Tabla:

```sql
rmc_git_commits
```

Campos principales:

- `tool_key`: clave estable de herramienta.
- `tool_name`: nombre visible.
- `repo_name`: nombre del repositorio.
- `repo_path`: ruta local desde donde se importo.
- `branch_name`: branch activa al importar.
- `commit_hash` y `short_hash`.
- `author_name` y `author_email`.
- `commit_date`.
- `commit_subject` y `commit_body`.
- `files_changed`, `insertions`, `deletions`.
- `is_merge`.
- `created_at`, `updated_at`.

La restriccion `UNIQUE(tool_key, commit_hash)` evita duplicados entre importaciones.

## Crear tabla y migrar legacy Nike

Ejecutar:

```bash
node scripts/create-git-commits-table.js
```

Este script:

1. Crea `rmc_git_commits` si no existe.
2. Crea indices por `tool_key`, `commit_date` y `(tool_key, commit_date)`.
3. Si existe `rmcop_nike_git_commits`, copia datos hacia `rmc_git_commits` con:
   - `tool_key = rmcop_nike`
   - `tool_name = RMCOp-Nike`
   - `repo_name = RMCOp-Nike`
4. Usa `INSERT OR IGNORE`; no borra la tabla vieja ni modifica sus datos.

SQL base:

```text
scripts/migrations/001_create_rmc_git_commits.sql
```

## Configurar repos

Editar:

```text
scripts/git_commit_sources.json
```

Cada fuente tiene:

```json
{
  "tool_key": "rmc_control_center",
  "tool_name": "RMC Control Center",
  "repo_name": "RMC Control Center",
  "repo_path": "/ruta/local/al/repo"
}
```

`tool_key` soportados:

- `rmcop_nike`
- `rmc_control_center`
- `rmc_mockuptool`
- `rmc_optimizador`

## Importar commits de un repo

```bash
python3 scripts/import_git_commits.py \
  --repo-path "/ruta/al/repo" \
  --tool-key "rmc_control_center" \
  --tool-name "RMC Control Center" \
  --repo-name "RMC Control Center"
```

## Importar todos los repos configurados

```bash
python3 scripts/import_git_commits.py --all
```

Para pruebas acotadas:

```bash
python3 scripts/import_git_commits.py --all --max-count 20
```

El importador:

- valida que la ruta exista;
- valida que sea un repo Git;
- lee branch, autor, fecha ISO, subject, body, shortstat y si es merge;
- ignora commits ya importados;
- reporta nuevos, existentes y errores por repo;
- continua con las demas fuentes si una ruta falla.

## API en RMC Control Center

Listado general:

```http
GET /api/git-commits
```

Filtros:

- `tool_key`
- `date_from`
- `date_to`
- `limit`
- `offset`

Por herramienta:

```http
GET /api/git-commits/rmc_control_center
```

Resumen:

```http
GET /api/git-commits/summary
```

La UI incluye la vista `Historial de desarrollo` con filtro por herramienta.

## Validacion SQL

Conteo por herramienta:

```sql
SELECT tool_key, COUNT(*) AS total
FROM rmc_git_commits
GROUP BY tool_key
ORDER BY tool_key;
```

Ultimos commits:

```sql
SELECT tool_name, commit_date, short_hash, commit_subject
FROM rmc_git_commits
ORDER BY commit_date DESC
LIMIT 20;
```

Duplicados:

```sql
SELECT tool_key, commit_hash, COUNT(*) AS total
FROM rmc_git_commits
GROUP BY tool_key, commit_hash
HAVING total > 1;
```
