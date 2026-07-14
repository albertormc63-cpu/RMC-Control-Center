const express = require("express");
const fs = require("fs");
const path = require("path");
const ExcelJS = require("exceljs");
const db = require("../db");
const { getNikeItemWithFilePaths } = require("../services/nikeFiles");
const { FILE_ROOT, resolveRmcFilePath } = require("../services/rmcFileResolver");

const router = express.Router();
const EXCEL_PREVIEW_MAX_ROWS = 300;

// Limita cualquier lectura de archivos al volumen autorizado para RMC.
const fileRoot = FILE_ROOT;

function getValidatedResolvedFile(item, resolution) {
  if (!resolution || resolution.status === "invalid_path") {
    const error = new Error("La ruta solicitada esta fuera del volumen autorizado");
    error.status = 403;
    throw error;
  }

  if (!resolution.exists || !resolution.resolvedPath) {
    const error = new Error("El archivo registrado ya no existe en el volumen");
    error.status = 404;
    throw error;
  }

  // realpath evita que un enlace simbolico dentro del volumen apunte hacia afuera.
  const realRoot = fs.realpathSync(fileRoot);
  const realFile = fs.realpathSync(resolution.resolvedPath);
  const realRelativePath = path.relative(realRoot, realFile);

  if (realRelativePath.startsWith("..") || path.isAbsolute(realRelativePath)) {
    const error = new Error("El archivo resuelto esta fuera del volumen autorizado");
    error.status = 403;
    throw error;
  }

  return {
    item,
    filePath: realFile,
    fileName: path.basename(realFile),
    resolution
  };
}

function validateFilePath(item, selectedPath, options = {}) {
  const resolution = resolveRmcFilePath(selectedPath, options);

  if (resolution.status === "invalid_path") {
    const error = new Error("La ruta solicitada esta fuera del volumen autorizado");
    error.status = 403;
    throw error;
  }

  return getValidatedResolvedFile(item, resolution);
}

function getNikeFile(itemId, fileType) {
  if (!["maqueta", "plantilla"].includes(fileType)) {
    const error = new Error("Tipo de archivo Nike no reconocido");
    error.status = 404;
    throw error;
  }

  const item = getNikeItemWithFilePaths(db, itemId);

  if (!item) {
    const error = new Error("Item Nike no encontrado");
    error.status = 404;
    throw error;
  }

  if (fileType === "maqueta" && item.mockupFile?.status === "multiple_mockups") {
    const error = new Error("Hay multiples maquetas relacionadas; selecciona una maqueta especifica");
    error.status = 409;
    throw error;
  }

  const selectedFile = fileType === "maqueta" ? item.mockupFile : item.pdfFile;
  const selectedPath = fileType === "maqueta" ? item.maqueta_path : item.plantilla_path;

  if (!selectedPath || !path.isAbsolute(selectedPath)) {
    const error = new Error(`El item no tiene una ruta de ${fileType} registrada`);
    error.status = 404;
    throw error;
  }

  return getValidatedResolvedFile(item, selectedFile);
}

function getNikeExcelFile(itemId) {
  const item = db.prepare(`
    SELECT r.excel_path
    FROM rmcop_nike_items i
    LEFT JOIN rmcop_nike_runs r
      ON r.id = i.run_id
    WHERE i.id = ?
  `).get(itemId);

  if (!item) {
    const error = new Error("Item Nike no encontrado");
    error.status = 404;
    throw error;
  }

  const selectedPath = item.excel_path;

  if (!selectedPath || !path.isAbsolute(selectedPath)) {
    const error = new Error("El item no tiene una ruta de Excel registrada");
    error.status = 404;
    throw error;
  }

  return validateFilePath(item, selectedPath);
}

function getMockupFile(itemId) {
  const item = db.prepare(`
    SELECT id, archivo, path
    FROM rmc_mockuptool_items
    WHERE id = ?
  `).get(itemId);

  if (!item) {
    const error = new Error("Item MockupTool no encontrado");
    error.status = 404;
    throw error;
  }

  if (!item.path || !path.isAbsolute(item.path)) {
    const error = new Error("El item no tiene una ruta de maqueta registrada");
    error.status = 404;
    throw error;
  }

  return validateFilePath(item, item.path, {
    enableGenericasFallback: true,
    enableMockupArchiveFallback: true,
    fileName: item.archivo || item.path
  });
}

function getMockupExcelFile(itemId) {
  const item = db.prepare(`
    SELECT r.excel_path
    FROM rmc_mockuptool_items i
    LEFT JOIN rmc_mockuptool_runs r ON r.id = i.run_id
    WHERE i.id = ?
  `).get(itemId);

  if (!item) {
    const error = new Error("Item MockupTool no encontrado");
    error.status = 404;
    throw error;
  }

  if (!item.excel_path || !path.isAbsolute(item.excel_path)) {
    const error = new Error("El item no tiene una ruta de Excel registrada");
    error.status = 404;
    throw error;
  }

  return validateFilePath(item, item.excel_path);
}

function sendNikeFile(req, res, next, disposition) {
  try {
    const file = getNikeFile(req.params.itemId, req.params.fileType);

    res.type(path.extname(file.fileName));
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
    );
    res.sendFile(file.filePath, error => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
}

function sendMockupFile(req, res, next, disposition) {
  try {
    const file = getMockupFile(req.params.itemId);

    res.type(path.extname(file.fileName));
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
    );
    res.sendFile(file.filePath, error => {
      if (error) next(error);
    });
  } catch (error) {
    next(error);
  }
}

function sendExcelFile(req, res, next, getFile) {
  try {
    const file = getFile(req.params.itemId);

    res.type(path.extname(file.fileName));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
    );
    res.sendFile(file.filePath, error => {
      if (error) next(error);
    });
  } catch (error) {
    if (error.status === 403) {
      error.status = 404;
    }

    next(error);
  }
}

function normalizeExcelCellValue(value) {
  if (value === null || typeof value === "undefined") {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      return normalizeExcelCellValue(value.result);
    }

    if (value.text) {
      return String(value.text);
    }

    if (value.hyperlink && value.text) {
      return String(value.text);
    }

    if (Array.isArray(value.richText)) {
      return value.richText.map(part => part.text || "").join("");
    }

    return JSON.stringify(value);
  }

  return String(value);
}

async function sendExcelPreview(req, res, next, getFile) {
  try {
    const file = getFile(req.params.itemId);
    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(file.filePath);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      const error = new Error("El Excel no tiene hojas disponibles");
      error.status = 404;
      throw error;
    }

    const rowCount = worksheet.actualRowCount || worksheet.rowCount || 0;
    const columnCount = worksheet.actualColumnCount || worksheet.columnCount || 0;
    const maxRows = EXCEL_PREVIEW_MAX_ROWS;
    const rows = [];

    for (let rowIndex = 1; rowIndex <= Math.min(rowCount, maxRows); rowIndex += 1) {
      const row = worksheet.getRow(rowIndex);
      const values = [];

      for (let columnIndex = 1; columnIndex <= columnCount; columnIndex += 1) {
        values.push(normalizeExcelCellValue(row.getCell(columnIndex).value));
      }

      rows.push(values);
    }

    res.json({
      fileName: file.fileName,
      sheetName: worksheet.name,
      rowCount,
      columnCount,
      truncated: rowCount > maxRows,
      maxRows,
      rows
    });
  } catch (error) {
    if (error.status === 403) {
      error.status = 404;
    }

    next(error);
  }
}

// Abre PDFs y otros archivos compatibles dentro del navegador.
router.get("/nike/:itemId/:fileType/view", (req, res, next) => {
  sendNikeFile(req, res, next, "inline");
});

router.get("/nike/:itemId/excel/preview", (req, res, next) => {
  sendExcelPreview(req, res, next, getNikeExcelFile);
});

router.get("/nike/:itemId/excel/download", (req, res, next) => {
  sendExcelFile(req, res, next, getNikeExcelFile);
});

// Fuerza la descarga del archivo original conservando su nombre.
router.get("/nike/:itemId/:fileType/download", (req, res, next) => {
  sendNikeFile(req, res, next, "attachment");
});

router.get("/mockup/:itemId/maqueta/view", (req, res, next) => {
  sendMockupFile(req, res, next, "inline");
});

router.get("/mockup/:itemId/maqueta/download", (req, res, next) => {
  sendMockupFile(req, res, next, "attachment");
});

router.get("/mockup/:itemId/excel/download", (req, res, next) => {
  sendExcelFile(req, res, next, getMockupExcelFile);
});

router.get("/mockup/:itemId/excel/preview", (req, res, next) => {
  sendExcelPreview(req, res, next, getMockupExcelFile);
});

module.exports = router;
