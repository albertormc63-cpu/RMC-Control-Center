const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const { getNikeItemWithFilePaths } = require("../services/nikeFiles");

const router = express.Router();

// Limita cualquier lectura de archivos al volumen autorizado para RMC.
const fileRoot = path.resolve(process.env.RMC_FILE_ROOT || "/Volumes/Fullsize");

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

  const selectedPath = fileType === "maqueta" ? item.maqueta_path : item.plantilla_path;

  if (!selectedPath || !path.isAbsolute(selectedPath)) {
    const error = new Error(`El item no tiene una ruta de ${fileType} registrada`);
    error.status = 404;
    throw error;
  }

  const requestedPath = path.resolve(selectedPath);
  const relativePath = path.relative(fileRoot, requestedPath);

  // Rechaza recorridos como ../ y rutas de otros discos antes de tocar el sistema.
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    const error = new Error("La ruta solicitada esta fuera del volumen autorizado");
    error.status = 403;
    throw error;
  }

  if (!fs.existsSync(requestedPath) || !fs.statSync(requestedPath).isFile()) {
    const error = new Error("El archivo registrado ya no existe en el volumen");
    error.status = 404;
    throw error;
  }

  // realpath evita que un enlace simbolico dentro del volumen apunte hacia afuera.
  const realRoot = fs.realpathSync(fileRoot);
  const realFile = fs.realpathSync(requestedPath);
  const realRelativePath = path.relative(realRoot, realFile);

  if (realRelativePath.startsWith("..") || path.isAbsolute(realRelativePath)) {
    const error = new Error("El archivo resuelto esta fuera del volumen autorizado");
    error.status = 403;
    throw error;
  }

  return {
    item,
    filePath: realFile,
    fileName: path.basename(realFile)
  };
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

// Abre PDFs y otros archivos compatibles dentro del navegador.
router.get("/nike/:itemId/:fileType/view", (req, res, next) => {
  sendNikeFile(req, res, next, "inline");
});

// Fuerza la descarga del archivo original conservando su nombre.
router.get("/nike/:itemId/:fileType/download", (req, res, next) => {
  sendNikeFile(req, res, next, "attachment");
});

module.exports = router;
