const express = require("express");
const ExcelJS = require("exceljs");
const db = require("../db");

const router = express.Router();

router.get("/nike/:id/excel", async (req, res) => {
  const { id } = req.params;

  const items = db.prepare(`
    SELECT 
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
    WHERE run_id = ?
    ORDER BY equipo, style, talla
  `).all(id);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("RMCOp Nike");

  sheet.columns = [
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

  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = "A1:P1";

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=RMCOp_Nike_${id}.xlsx`
  );

  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;