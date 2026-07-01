const fs = require("fs");
const path = require("path");

const NEW_ART_ROOT = "/Volumes/Fullsize/New Art";
const TO_PRINT_ROOT = "/Volumes/Fullsize/TO PRINT";
const GENERICAS_ROOT = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND/Genericas";
const FILE_ROOT = path.resolve(process.env.RMC_FILE_ROOT || "/Volumes/Fullsize");

const DEFAULT_ALLOWED_ROOTS = [
  FILE_ROOT,
  NEW_ART_ROOT,
  TO_PRINT_ROOT
].map(root => path.resolve(root));

const MONTH_FOLDER_BY_NUMBER = {
  1: "NIKE ENERO",
  2: "NIKE FEBRERO",
  3: "NIKE MARZO",
  4: "NIKE ABRIL",
  5: "NIKE MAYO",
  6: "NIKE JUNIO",
  7: "NIKE JULIO",
  8: "NIKE AGOSTO",
  9: "NIKE SEPTIEMBRE",
  10: "NIKE OCTUBRE",
  11: "NIKE NOVIEMBRE",
  12: "NIKE DICIEMBRE"
};

function hasTraversal(rawPath) {
  return String(rawPath || "").split(/[\\/]+/).includes("..");
}

function normalizePathPart(value) {
  return String(value || "").trim().toLowerCase();
}

function isInsideRoot(filePath, rootPath) {
  const relativePath = path.relative(rootPath, filePath);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function isAllowedPath(filePath, allowedRoots = DEFAULT_ALLOWED_ROOTS) {
  return allowedRoots.some(root => isInsideRoot(filePath, root));
}

function getRealRoot(rootPath) {
  try {
    return fs.realpathSync(rootPath);
  } catch (error) {
    return null;
  }
}

function validateExistingFile(filePath, allowedRoots = DEFAULT_ALLOWED_ROOTS) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return false;
  }

  const realFile = fs.realpathSync(filePath);
  return allowedRoots.some(root => {
    const realRoot = getRealRoot(root);
    return realRoot ? isInsideRoot(realFile, realRoot) : false;
  });
}

function normalizeCandidate(candidate) {
  if (!candidate || !candidate.path) {
    return null;
  }

  return {
    path: path.resolve(candidate.path),
    reason: candidate.reason || "candidate",
    status: candidate.status || "found_original"
  };
}

function addUniqueCandidate(candidates, candidate) {
  const normalized = normalizeCandidate(candidate);

  if (!normalized) {
    return;
  }

  if (!candidates.some(existing => existing.path === normalized.path)) {
    candidates.push(normalized);
  }
}

function buildNewArtToPrintCandidate(originalPath) {
  const normalizedOriginal = path.resolve(originalPath);
  const normalizedNewArt = path.resolve(NEW_ART_ROOT);

  if (!isInsideRoot(normalizedOriginal, normalizedNewArt)) {
    return null;
  }

  const relativePath = path.relative(normalizedNewArt, normalizedOriginal);

  return {
    path: path.join(TO_PRINT_ROOT, relativePath),
    reason: "new_art_to_to_print",
    status: "found_moved_to_to_print"
  };
}

function parseMonthNumber(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const dateMatch = text.match(/\b(\d{1,2})[/-](\d{1,4})(?:[/-](\d{2,4}))?\b/);

  if (dateMatch) {
    const firstNumber = Number(dateMatch[1]);
    const secondNumber = Number(dateMatch[2]);
    const month = !dateMatch[3] && secondNumber > 12 ? firstNumber : secondNumber;
    return month >= 1 && month <= 12 ? month : null;
  }

  const lowerText = text.toLowerCase();
  const monthNames = [
    ["enero", 1],
    ["febrero", 2],
    ["marzo", 3],
    ["abril", 4],
    ["mayo", 5],
    ["junio", 6],
    ["julio", 7],
    ["agosto", 8],
    ["septiembre", 9],
    ["setiembre", 9],
    ["octubre", 10],
    ["noviembre", 11],
    ["diciembre", 12]
  ];
  const foundMonth = monthNames.find(([name]) => lowerText.includes(name));

  return foundMonth ? foundMonth[1] : null;
}

function buildNikeToPrintMonthCandidate(originalPath, fechaEmbarque) {
  const monthNumber = parseMonthNumber(fechaEmbarque);

  if (!monthNumber || !MONTH_FOLDER_BY_NUMBER[monthNumber]) {
    return null;
  }

  const normalizedOriginal = path.resolve(originalPath);
  const normalizedNewArt = path.resolve(NEW_ART_ROOT);

  if (!isInsideRoot(normalizedOriginal, normalizedNewArt)) {
    return null;
  }

  const relativePath = path.relative(normalizedNewArt, normalizedOriginal);
  const relativeParts = relativePath.split(path.sep);
  const trimmedRelativeParts = normalizePathPart(relativeParts[0]) === "nike orders"
    ? relativeParts.slice(1)
    : relativeParts;
  const safeRelativePath = trimmedRelativeParts.length
    ? path.join(...trimmedRelativeParts)
    : relativePath;

  return {
    path: path.join(TO_PRINT_ROOT, "NIKE ORDERS", MONTH_FOLDER_BY_NUMBER[monthNumber], safeRelativePath),
    reason: "to_print_nike_month",
    status: "found_moved_to_to_print"
  };
}

function buildGenericasCandidate(originalPath, fileName) {
  const safeFileName = path.basename(fileName || originalPath || "");

  if (!safeFileName || safeFileName === "." || safeFileName.includes("..")) {
    return null;
  }

  return {
    path: path.join(GENERICAS_ROOT, safeFileName),
    reason: "genericas",
    status: "found_genericas"
  };
}

function resolveRmcFilePath(originalPath, options = {}) {
  const originalPathText = String(originalPath || "").trim();
  const allowedRoots = (options.allowedRoots || DEFAULT_ALLOWED_ROOTS).map(root => path.resolve(root));

  if (!originalPathText) {
    return {
      originalPath: originalPath || "",
      resolvedPath: "",
      exists: false,
      status: options.emptyStatus || "no_path",
      candidates: []
    };
  }

  if (!path.isAbsolute(originalPathText) || hasTraversal(originalPathText)) {
    return {
      originalPath: originalPathText,
      resolvedPath: "",
      exists: false,
      status: "invalid_path",
      candidates: []
    };
  }

  const normalizedOriginal = path.resolve(originalPathText);

  if (!isAllowedPath(normalizedOriginal, allowedRoots)) {
    return {
      originalPath: originalPathText,
      resolvedPath: "",
      exists: false,
      status: "invalid_path",
      candidates: [
        {
          path: normalizedOriginal,
          exists: false,
          reason: "outside_allowed_roots"
        }
      ]
    };
  }

  const candidates = [];
  addUniqueCandidate(candidates, {
    path: normalizedOriginal,
    reason: "original",
    status: "found_original"
  });

  if (options.enableNewArtToPrint) {
    addUniqueCandidate(candidates, buildNewArtToPrintCandidate(normalizedOriginal));
    addUniqueCandidate(
      candidates,
      buildNikeToPrintMonthCandidate(normalizedOriginal, options.fechaEmbarque)
    );
  }

  if (options.enableGenericasFallback) {
    addUniqueCandidate(
      candidates,
      buildGenericasCandidate(normalizedOriginal, options.fileName)
    );
  }

  const resolvedCandidates = candidates.map(candidate => ({
    path: candidate.path,
    exists: validateExistingFile(candidate.path, allowedRoots),
    reason: candidate.reason
  }));
  const foundCandidate = resolvedCandidates.find(candidate => candidate.exists);
  const foundMeta = foundCandidate
    ? candidates.find(candidate => candidate.path === foundCandidate.path)
    : null;

  return {
    originalPath: originalPathText,
    resolvedPath: foundCandidate?.path || "",
    exists: Boolean(foundCandidate),
    status: foundMeta?.status || options.missingStatus || "missing",
    candidates: resolvedCandidates
  };
}

module.exports = {
  FILE_ROOT,
  NEW_ART_ROOT,
  TO_PRINT_ROOT,
  GENERICAS_ROOT,
  DEFAULT_ALLOWED_ROOTS,
  resolveRmcFilePath,
  validateExistingFile
};
