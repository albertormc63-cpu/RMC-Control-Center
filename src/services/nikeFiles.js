const path = require("path");
const { GENERICAS_ROOT, resolveRmcFilePath } = require("./rmcFileResolver");

// Equivalencias entre las tallas guardadas por RMCOp-Nike y RMC MockupTool.
const MOCKUP_SIZE_BY_NIKE_SIZE = {
  "2X": "2XL",
  XL: "XLG",
  LG: "LGE",
  MD: "MED",
  SM: "SML",
  XS: "XSM"
};

function normalize(value) {
  return String(value || "").trim().toUpperCase();
}

function isGenericNikeItem(nikeItem) {
  const text = [
    nikeItem.herramienta,
    nikeItem.archivo,
    nikeItem.path
  ].filter(Boolean).join(" ").toLowerCase();

  return text.includes("generica") || text.includes("genérica") || text.includes("sin_datos");
}

function getOrderPrefix(value) {
  const basename = path.basename(String(value || ""));
  const match = basename.match(/^(\d{5}-\d{2})\b/);
  return match?.[1] || "";
}

function getNikeOrderPrefix(nikeItem) {
  return getOrderPrefix(nikeItem.archivo) || getOrderPrefix(nikeItem.path);
}

function isInsideGenericas(filePath) {
  const normalizedPath = path.resolve(filePath || "");
  const normalizedRoot = path.resolve(GENERICAS_ROOT);
  const relativePath = path.relative(normalizedRoot, normalizedPath);

  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function getGenericMockupCandidates(db, nikeItem) {
  const orderPrefix = getNikeOrderPrefix(nikeItem);

  if (!isGenericNikeItem(nikeItem) || !orderPrefix || !nikeItem.style) {
    return [];
  }

  return db.prepare(`
    SELECT id, run_id, wo, ship_order, style, equipo, variante, talla, archivo, path, estado
    FROM rmc_mockuptool_items
    WHERE TRIM(style) = TRIM(?)
      AND COALESCE(path, '') <> ''
      AND path LIKE ?
      AND (
        archivo LIKE ?
        OR path LIKE ?
      )
    ORDER BY id DESC
  `).all(
    nikeItem.style,
    `${GENERICAS_ROOT}/%`,
    `${orderPrefix}%`,
    `%/${orderPrefix}%`
  );
}

function getMockupMatches(db, nikeItem) {
  if (!nikeItem.style) {
    return [];
  }

  // WO, ship order y style identifican el pedido; la talla resuelve casos duplicados.
  const candidates = nikeItem.wo
    ? db.prepare(`
      SELECT id, run_id, wo, ship_order, style, equipo, variante, talla, archivo, path, estado
      FROM rmc_mockuptool_items
      WHERE TRIM(wo) = TRIM(?)
        AND TRIM(style) = TRIM(?)
        AND (
          TRIM(COALESCE(?, '')) = ''
          OR TRIM(COALESCE(ship_order, '')) = TRIM(?)
        )
        AND COALESCE(path, '') <> ''
      ORDER BY id DESC
    `).all(nikeItem.wo, nikeItem.style, nikeItem.ship_order, nikeItem.ship_order)
    : [];
  const resolvedCandidates = candidates.length ? candidates : getGenericMockupCandidates(db, nikeItem);

  const expectedSize = MOCKUP_SIZE_BY_NIKE_SIZE[normalize(nikeItem.talla)] || normalize(nikeItem.talla);
  const matchingSizes = resolvedCandidates.filter(candidate =>
    normalize(candidate.talla).split("-").includes(expectedSize)
  );

  if (!expectedSize) {
    return resolvedCandidates;
  }

  if (!matchingSizes.length) {
    return resolvedCandidates;
  }

  // Prefiere maquetas de talla individual; si no hay, devuelve las combinadas.
  const exactSize = matchingSizes.find(candidate => normalize(candidate.talla) === expectedSize);
  return exactSize ? [exactSize] : matchingSizes;
}

function resolveMockupMatch(match) {
  const originalPath = match?.path || "";

  if (!originalPath) {
    return {
      source: "rmc_mockuptool_items",
      mockupItemId: match?.id || null,
      originalPath,
      resolvedPath: "",
      resolvedUrl: "",
      downloadUrl: "",
      exists: false,
      status: "no_path",
      candidates: []
    };
  }

  const resolution = resolveRmcFilePath(originalPath, {
    enableGenericasFallback: true,
    fileName: match.archivo || originalPath
  });
  const status = resolution.status === "found_original" && isInsideGenericas(resolution.resolvedPath)
    ? "found_genericas"
    : resolution.status;

  return {
    source: "rmc_mockuptool_items",
    mockupItemId: match.id,
    runId: match.run_id,
    wo: match.wo,
    shipOrder: match.ship_order,
    style: match.style,
    equipo: match.equipo,
    variante: match.variante,
    talla: match.talla,
    archivo: match.archivo,
    originalPath: resolution.originalPath,
    resolvedPath: resolution.resolvedPath,
    resolvedUrl: resolution.exists ? `/api/files/mockup/${encodeURIComponent(match.id)}/maqueta/view` : "",
    downloadUrl: resolution.exists ? `/api/files/mockup/${encodeURIComponent(match.id)}/maqueta/download` : "",
    exists: resolution.exists,
    status,
    candidates: resolution.candidates
  };
}

function resolveNikePdfFile(nikeItem) {
  const originalPath = nikeItem.path || "";
  const resolution = resolveRmcFilePath(originalPath, {
    enableNewArtToPrint: true,
    fechaEmbarque: nikeItem.fecha_embarque
  });

  return {
    source: "rmcop_nike_items",
    originalPath: resolution.originalPath,
    resolvedPath: resolution.resolvedPath,
    resolvedUrl: resolution.exists && nikeItem.id
      ? `/api/files/nike/${encodeURIComponent(nikeItem.id)}/plantilla/view`
      : "",
    downloadUrl: resolution.exists && nikeItem.id
      ? `/api/files/nike/${encodeURIComponent(nikeItem.id)}/plantilla/download`
      : "",
    exists: resolution.exists,
    status: resolution.status,
    candidates: resolution.candidates
  };
}

function attachNikeFilePaths(db, nikeItem) {
  const mockupMatches = getMockupMatches(db, nikeItem);
  const mockupFiles = mockupMatches.map(resolveMockupMatch);
  const selectedMockupFile = mockupFiles.length === 1
    ? mockupFiles[0]
    : {
        source: "rmc_mockuptool_items",
        originalPath: "",
        resolvedPath: "",
        resolvedUrl: "",
        downloadUrl: "",
        exists: false,
        status: mockupFiles.length > 1 ? "multiple_mockups" : "no_mockup_record",
        candidates: []
      };
  const pdfFile = resolveNikePdfFile(nikeItem);

  return {
    ...nikeItem,
    maqueta_path: selectedMockupFile.originalPath || "",
    maqueta_resolved_path: selectedMockupFile.resolvedPath || "",
    maqueta_file_status: selectedMockupFile.status,
    plantilla_path: nikeItem.path || "",
    plantilla_resolved_path: pdfFile.resolvedPath || "",
    plantilla_file_status: pdfFile.status,
    roster_path: nikeItem.roster || "",
    pdfFile,
    mockupFile: selectedMockupFile,
    mockupFiles
  };
}

function getNikeItemWithFilePaths(db, itemId) {
  const item = db.prepare(`
    SELECT *
    FROM rmcop_nike_items
    WHERE id = ?
  `).get(itemId);

  return item ? attachNikeFilePaths(db, item) : null;
}

module.exports = {
  attachNikeFilePaths,
  getNikeItemWithFilePaths,
  getMockupMatches,
  resolveNikePdfFile,
  resolveMockupMatch
};
