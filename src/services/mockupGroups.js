// Normaliza fecha de embarque y ano para agrupar ejecuciones MockupTool.
const MOCKUP_EMBARK_DATE_SQL = `
  CASE
    WHEN TRIM(COALESCE(fecha_embarque, '')) <> ''
      THEN substr(TRIM(fecha_embarque), 1, 5)
    ELSE substr(TRIM(fecha), 1, 5)
  END
`;

const MOCKUP_RUN_YEAR_SQL = `
  CASE
    WHEN fecha GLOB '__/__/____' THEN substr(fecha, 7, 4)
    ELSE substr(id, 1, 4)
  END
`;

function getMockupRunGroup(db, sampleRunId) {
  const run = db.prepare(`
    SELECT
      *,
      ${MOCKUP_EMBARK_DATE_SQL} AS group_embark_date,
      ${MOCKUP_RUN_YEAR_SQL} AS group_year
    FROM rmc_mockuptool_runs
    WHERE id = ?
  `).get(sampleRunId);

  if (!run) {
    return null;
  }

  const groupRuns = db.prepare(`
    SELECT
      *,
      ${MOCKUP_EMBARK_DATE_SQL} AS group_embark_date,
      ${MOCKUP_RUN_YEAR_SQL} AS group_year
    FROM rmc_mockuptool_runs
    WHERE ${MOCKUP_EMBARK_DATE_SQL} = ?
      AND ${MOCKUP_RUN_YEAR_SQL} = ?
    ORDER BY id DESC
  `).all(run.group_embark_date, run.group_year);

  return {
    run,
    groupRuns,
    embarkDate: run.group_embark_date,
    year: run.group_year,
    runIds: groupRuns.map(groupRun => groupRun.id),
    pedidos: groupRuns.reduce(
      (total, groupRun) => total + Number(groupRun.filas_seleccionadas || 0),
      0
    ),
    maquetas: groupRuns.reduce(
      (total, groupRun) => total + Number(groupRun.pdfs_generados || 0),
      0
    )
  };
}

module.exports = {
  MOCKUP_EMBARK_DATE_SQL,
  MOCKUP_RUN_YEAR_SQL,
  getMockupRunGroup
};
