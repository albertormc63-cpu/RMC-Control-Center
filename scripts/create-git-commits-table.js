require("dotenv").config();

const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.RMC_DB_PATH;

if (!dbPath) {
  throw new Error("Falta configurar RMC_DB_PATH en .env");
}

const migrationPath = path.join(
  __dirname,
  "migrations",
  "001_create_rmc_git_commits.sql"
);
const db = new Database(dbPath, {
  fileMustExist: true
});

function tableExists(tableName) {
  return Boolean(db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
      AND name = ?
  `).get(tableName));
}

console.log("Usando BD:", dbPath);

db.exec(fs.readFileSync(migrationPath, "utf8"));
console.log("Tabla rmc_git_commits creada/verificada.");

if (tableExists("rmcop_nike_git_commits")) {
  const before = db.prepare("SELECT COUNT(*) AS total FROM rmc_git_commits").get().total;

  db.exec(`
    INSERT OR IGNORE INTO rmc_git_commits (
      tool_key,
      tool_name,
      repo_name,
      branch_name,
      commit_hash,
      short_hash,
      author_name,
      commit_date,
      commit_subject,
      files_changed,
      created_at
    )
    SELECT
      'rmcop_nike' AS tool_key,
      'RMCOp-Nike' AS tool_name,
      'RMCOp-Nike' AS repo_name,
      branch AS branch_name,
      hash AS commit_hash,
      SUBSTR(hash, 1, 12) AS short_hash,
      author AS author_name,
      COALESCE(fecha, created_at) AS commit_date,
      COALESCE(NULLIF(message, ''), '(sin mensaje)') AS commit_subject,
      CASE
        WHEN files GLOB '[0-9]*' THEN CAST(files AS INTEGER)
        ELSE NULL
      END AS files_changed,
      COALESCE(created_at, CURRENT_TIMESTAMP) AS created_at
    FROM rmcop_nike_git_commits
    WHERE hash IS NOT NULL
      AND TRIM(hash) <> ''
      AND COALESCE(fecha, created_at) IS NOT NULL
  `);

  const after = db.prepare("SELECT COUNT(*) AS total FROM rmc_git_commits").get().total;
  console.log(`Datos migrados desde rmcop_nike_git_commits: ${after - before} nuevos.`);
} else {
  console.log("Tabla vieja rmcop_nike_git_commits no existe; no hay datos legacy que migrar.");
}

const rows = db.prepare(`
  SELECT tool_key, COUNT(*) AS total
  FROM rmc_git_commits
  GROUP BY tool_key
  ORDER BY tool_key
`).all();

console.log("Conteo actual por herramienta:");
if (!rows.length) {
  console.log("- sin commits importados");
} else {
  rows.forEach(row => {
    console.log(`- ${row.tool_key}: ${row.total}`);
  });
}

db.close();
console.log("Listo. rmc_git_commits queda disponible para RMC Control System.");
