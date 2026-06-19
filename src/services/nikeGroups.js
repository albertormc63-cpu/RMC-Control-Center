// Expresiones SQL compartidas para normalizar embarque y ano de ejecucion.
// fecha_embarque puede venir como DD/MM o DD/MM/YYYY; la UI usa DD/MM.
const EMBARK_DATE_SQL = `
  CASE
    WHEN TRIM(COALESCE(fecha_embarque, '')) <> ''
      THEN substr(TRIM(fecha_embarque), 1, 5)
    ELSE substr(TRIM(created_at), 1, 5)
  END
`;

// El ano se obtiene de created_at (DD/MM/YYYY) y usa el prefijo del id como respaldo.
const RUN_YEAR_SQL = `
  CASE
    WHEN created_at GLOB '__/__/____' THEN substr(created_at, 7, 4)
    ELSE substr(id, 1, 4)
  END
`;

const TOOL_SQL = `
  COALESCE(NULLIF(TRIM(herramienta), ''), 'RMCOp-Nike')
`;

// Busca un run y todos los runs que comparten fecha de embarque y ano.
function getNikeRunGroup(db, sampleRunId) {
  const run = db.prepare(`
    SELECT
      *,
      ${EMBARK_DATE_SQL} AS group_embark_date,
      ${RUN_YEAR_SQL} AS group_year,
      ${TOOL_SQL} AS group_tool
    FROM rmcop_nike_runs
    WHERE id = ?
  `).get(sampleRunId);

  if (!run) {
    return null;
  }

  const groupRuns = db.prepare(`
    SELECT
      *,
      ${EMBARK_DATE_SQL} AS group_embark_date,
      ${RUN_YEAR_SQL} AS group_year,
      ${TOOL_SQL} AS group_tool
    FROM rmcop_nike_runs
    WHERE ${EMBARK_DATE_SQL} = ?
      AND ${RUN_YEAR_SQL} = ?
    ORDER BY id DESC
  `).all(run.group_embark_date, run.group_year);

  const tools = [...new Set(groupRuns.map(groupRun => groupRun.group_tool))];

  return {
    run,
    groupRuns,
    embarkDate: run.group_embark_date,
    year: run.group_year,
    herramienta: tools.length === 1 ? tools[0] : "RMCOp-Nike Mixta",
    runIds: groupRuns.map(groupRun => groupRun.id),
    pedidos: groupRuns.reduce((total, groupRun) => total + Number(groupRun.pedidos || 0), 0),
    piezas: groupRuns.reduce((total, groupRun) => total + Number(groupRun.piezas || 0), 0)
  };
}

module.exports = {
  EMBARK_DATE_SQL,
  RUN_YEAR_SQL,
  TOOL_SQL,
  getNikeRunGroup
};
