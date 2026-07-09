const express = require("express");
const db = require("../db");
const {
  MOCKUP_EMBARK_DATE_SQL,
  MOCKUP_RUN_YEAR_SQL,
  getMockupRunGroup
} = require("../services/mockupGroups");
const { resolveRmcFilePath } = require("../services/rmcFileResolver");

const router = express.Router();

// Lista embarques MockupTool agrupando sus ejecuciones por fecha y ano.
router.get("/runs", (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 100));
    const offset = (page - 1) * limit;

    const runs = db.prepare(`
      WITH normalized_runs AS (
        SELECT
          id,
          ${MOCKUP_EMBARK_DATE_SQL} AS fecha_embarque,
          ${MOCKUP_RUN_YEAR_SQL} AS run_year,
          COALESCE(filas_seleccionadas, 0) AS pedidos,
          COALESCE(pdfs_generados, 0) AS maquetas
        FROM rmc_mockuptool_runs
      )
      SELECT
        fecha_embarque,
        run_year,
        MAX(id) AS sample_run_id,
        COUNT(*) AS run_count,
        SUM(pedidos) AS pedidos,
        SUM(maquetas) AS maquetas
      FROM normalized_runs
      GROUP BY fecha_embarque, run_year
      ORDER BY MAX(id) DESC
      LIMIT ?
      OFFSET ?
    `).all(limit, offset);

    res.json({ page, limit, runs });
  } catch (error) {
    res.status(500).json({
      error: "No se pudieron leer las ejecuciones MockupTool",
      message: error.message
    });
  }
});

// Regresa todos los items del embarque al que pertenece la ejecucion elegida.
router.get("/runs/:id", (req, res) => {
  try {
    const { id } = req.params;

    const group = getMockupRunGroup(db, id);

    // Evita que la UI intente pintar detalles cuando el id no existe.
    if (!group) {
      res.status(404).json({ error: "Ejecucion MockupTool no encontrada" });
      return;
    }

    // Conserva el run_id para identificar de que ejecucion proviene cada maqueta.
    const rawItems = db.prepare(`
      SELECT
        i.*,
        r.disenador AS disenador,
        r.excel_path AS excel_path
      FROM rmc_mockuptool_items i
      LEFT JOIN rmc_mockuptool_runs r
        ON r.id = i.run_id
      WHERE i.run_id IN (${group.runIds.map(() => "?").join(",")})
      ORDER BY i.run_id, i.equipo, i.style, i.talla
    `).all(...group.runIds);
    const items = rawItems.map(item => {
      const maquetaFile = resolveRmcFilePath(item.path, {
        enableGenericasFallback: true,
        fileName: item.archivo || item.path
      });

      return {
        ...item,
        maqueta_resolved_path: maquetaFile.resolvedPath || "",
        maqueta_file_status: maquetaFile.status,
        maqueta_exists: maquetaFile.exists
      };
    });

    res.json({
      run: group.run,
      groupDate: group.embarkDate,
      runCount: group.groupRuns.length,
      totalPedidos: group.pedidos,
      totalMaquetas: group.maquetas,
      year: group.year,
      runIds: group.runIds,
      items
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo leer el detalle MockupTool",
      message: error.message
    });
  }
});

module.exports = router;
