const express = require("express");
const ExcelJS = require("exceljs");
const db = require("../db");
const { getMockupRunGroup } = require("../services/mockupGroups");
const { getNikeRunGroup } = require("../services/nikeGroups");

const router = express.Router();

// Exporta los items de una ejecucion Nike en Excel para revision externa.
router.get("/nike/:id/excel", async (req, res) => {
  try {
    const { id } = req.params;

    const group = getNikeRunGroup(db, id);

    // El reporte se genera solo si la ejecucion existe.
    if (!group) {
      res.status(404).json({ error: "Ejecucion Nike no encontrada" });
      return;
    }

    // Columnas operativas que Produccion/Diseno suelen revisar en Excel.
    const items = db.prepare(`
      SELECT 
        run_id,
        wo,
        ship_order,
        style,
        style_family,
        equipo,
        variante,
        version,
        talla,
        piezas,
        nombre,
        numero,
        archivo,
        estado,
        error,
        tiempo,
        clave
      FROM rmcop_nike_items
      WHERE run_id IN (${group.runIds.map(() => "?").join(",")})
      ORDER BY run_id, equipo, style, talla
    `).all(...group.runIds);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("RMCOp Nike");

    // Definicion explicita de headers para mantener estable el archivo exportado.
    sheet.columns = [
      { header: "Run ID", key: "run_id", width: 20 },
      { header: "WO", key: "wo", width: 18 },
      { header: "Ship Order", key: "ship_order", width: 18 },
      { header: "Style", key: "style", width: 16 },
      { header: "Family", key: "style_family", width: 16 },
      { header: "Equipo", key: "equipo", width: 22 },
      { header: "Variante", key: "variante", width: 16 },
      { header: "Version", key: "version", width: 12 },
      { header: "Talla", key: "talla", width: 10 },
      { header: "Piezas", key: "piezas", width: 10 },
      { header: "Nombre", key: "nombre", width: 22 },
      { header: "Numero", key: "numero", width: 12 },
      { header: "Archivo", key: "archivo", width: 35 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Error", key: "error", width: 35 },
      { header: "Tiempo", key: "tiempo", width: 14 },
      { header: "Clave", key: "clave", width: 30 }
    ];

    items.forEach(item => sheet.addRow(item));

    // Filtro nativo de Excel para que el archivo se pueda explorar al abrirlo.
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = "A1:Q1";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=RMCOp_Nike_${group.embarkDate.replace("/", "-")}_${group.year}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      error: "No se pudo generar el reporte Excel",
      message: error.message
    });
  }
});

router.get("/mockup/:id/excel", async (req, res) => {
  try {
    const { id } = req.params;

    const group = getMockupRunGroup(db, id);

    if (!group) {
      res.status(404).json({ error: "Ejecucion MockupTool no encontrada" });
      return;
    }

    const items = db.prepare(`
      SELECT
        wo,
        run_id,
        herramienta,
        fila_excel,
        ship_order,
        style,
        style_family,
        equipo,
        variante,
        version,
        talla,
        piezas,
        archivo,
        estado,
        error,
        tiempo,
        clave
      FROM rmc_mockuptool_items
      WHERE run_id IN (${group.runIds.map(() => "?").join(",")})
      ORDER BY run_id, equipo, style, talla
    `).all(...group.runIds);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("MockupTool");

    sheet.columns = [
      { header: "WO", key: "wo", width: 18 },
      { header: "Run ID", key: "run_id", width: 20 },
      { header: "Herramienta", key: "herramienta", width: 18 },
      { header: "Fila Excel", key: "fila_excel", width: 12 },
      { header: "Ship Order", key: "ship_order", width: 18 },
      { header: "Style", key: "style", width: 16 },
      { header: "Family", key: "style_family", width: 16 },
      { header: "Equipo", key: "equipo", width: 22 },
      { header: "Variante", key: "variante", width: 16 },
      { header: "Version", key: "version", width: 12 },
      { header: "Talla", key: "talla", width: 10 },
      { header: "Piezas", key: "piezas", width: 10 },
      { header: "Archivo", key: "archivo", width: 35 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Error", key: "error", width: 35 },
      { header: "Tiempo", key: "tiempo", width: 14 },
      { header: "Clave", key: "clave", width: 30 }
    ];

    items.forEach(item => sheet.addRow(item));
    sheet.getRow(1).font = { bold: true };
    sheet.autoFilter = "A1:Q1";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=MockupTool_${group.embarkDate.replace("/", "-")}_${group.year}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({
      error: "No se pudo generar el reporte Excel MockupTool",
      message: error.message
    });
  }
});

module.exports = router;
