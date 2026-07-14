const fs = require("fs");
const path = require("path");

const NEW_ART_ROOT = "/Volumes/Fullsize/New Art";
const TO_PRINT_ROOT = "/Volumes/Fullsize/TO PRINT";
const NIKE_ORDERS_ROOT = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS";
const GENERICAS_ROOT = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND/Genericas";
const LISTAS_ON_DEMAND_PERSONALIZADAS_ROOT = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS ON DEMAND/Personalizadas";
const LISTAS_NIKE_GENERICAS_ROOT = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS NIKE/Genericas";
const LISTAS_NIKE_PERSONALIZADAS_ROOT = "/Volumes/Fullsize/TO PRINT/NIKE ORDERS/LISTAS NIKE/Personalizadas";
const GENERICAS_ROOTS = [
  GENERICAS_ROOT,
  LISTAS_NIKE_GENERICAS_ROOT
];
const MOCKUP_ARCHIVE_ROOTS = [
  GENERICAS_ROOT,
  LISTAS_ON_DEMAND_PERSONALIZADAS_ROOT,
  LISTAS_NIKE_GENERICAS_ROOT,
  LISTAS_NIKE_PERSONALIZADAS_ROOT
];
const FILE_ROOT = path.resolve(process.env.RMC_FILE_ROOT || "/Volumes/Fullsize");

const DEFAULT_ALLOWED_ROOTS = [
  FILE_ROOT,
  NEW_ART_ROOT,
  TO_PRINT_ROOT
].map(root => path.resolve(root));
const MONTH_NAME_RE = /ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|SETIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE|ENE|FEB|MAR|ABR|JUN|JUL|AGO|SEP|OCT|NOV|DIC/i;
const MONTH_ALIASES = [
  ["ENERO", "ENE"],
  ["FEBRERO", "FEB"],
  ["MARZO", "MAR"],
  ["ABRIL", "ABR"],
  ["JUNIO", "JUN"],
  ["JULIO", "JUL"],
  ["AGOSTO", "AGO"],
  ["SEPTIEMBRE", "SEP"],
  ["SETIEMBRE", "SEP"],
  ["OCTUBRE", "OCT"],
  ["NOVIEMBRE", "NOV"],
  ["DICIEMBRE", "DIC"]
];
const archiveDirectoryCache = new Map();
const archiveFileCache = new Map();

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
const PLAIN_MONTH_FOLDER_BY_NUMBER = {
  1: "ENERO",
  2: "FEBRERO",
  3: "MARZO",
  4: "ABRIL",
  5: "MAYO",
  6: "JUNIO",
  7: "JULIO",
  8: "AGOSTO",
  9: "SEPTIEMBRE",
  10: "OCTUBRE",
  11: "NOVIEMBRE",
  12: "DICIEMBRE"
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

function shouldSkipArchiveEntry(entryName) {
  return entryName.startsWith(".") || entryName.startsWith("~$");
}

function isMovableArchiveFolderName(value) {
  const text = String(value || "").trim();

  if (!text || text === "." || text === "..") {
    return false;
  }

  return /NIKE/i.test(text) && MONTH_NAME_RE.test(text);
}

function getMovableFolderSearchNames(value) {
  const text = String(value || "").trim();
  const names = new Set([text]);

  MONTH_ALIASES.forEach(([longName, shortName]) => {
    const longRe = new RegExp(`\\b${longName}\\b`, "i");
    const shortRe = new RegExp(`\\b${shortName}\\b`, "i");

    if (longRe.test(text)) {
      names.add(text.replace(longRe, shortName));
    }

    if (shortRe.test(text)) {
      names.add(text.replace(shortRe, longName));
    }
  });

  return [...names];
}

function findDirectoriesByName(rootPath, targetName, options = {}) {
  const root = path.resolve(rootPath || "");
  const normalizedTarget = normalizePathPart(targetName);
  const maxDepth = Number(options.maxDepth || 4);
  const maxMatches = Number(options.maxMatches || 20);
  const cacheKey = `${root}|${normalizedTarget}|${maxDepth}|${maxMatches}`;

  if (!normalizedTarget || !fs.existsSync(root)) {
    return [];
  }

  if (archiveDirectoryCache.has(cacheKey)) {
    return archiveDirectoryCache.get(cacheKey);
  }

  const matches = [];
  const stack = [{ dir: root, depth: 0 }];
  let visited = 0;
  const maxVisited = Number(options.maxVisited || 1500);

  while (stack.length && matches.length < maxMatches && visited < maxVisited) {
    const current = stack.pop();
    visited += 1;

    let entries = [];

    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    entries
      .filter(entry => entry.isDirectory() && !shouldSkipArchiveEntry(entry.name))
      .forEach(entry => {
        const entryPath = path.join(current.dir, entry.name);

        if (normalizePathPart(entry.name) === normalizedTarget) {
          matches.push(entryPath);
        }

        if (current.depth < maxDepth) {
          stack.push({ dir: entryPath, depth: current.depth + 1 });
        }
      });
  }

  archiveDirectoryCache.set(cacheKey, matches);
  return matches;
}

function findFilesByBasename(rootPath, fileName, options = {}) {
  const root = path.resolve(rootPath || "");
  const safeFileName = path.basename(fileName || "");
  const normalizedFileName = normalizePathPart(safeFileName);
  const maxDepth = Number(options.maxDepth || 7);
  const maxMatches = Number(options.maxMatches || 12);
  const cacheKey = `${root}|${normalizedFileName}|${maxDepth}|${maxMatches}`;

  if (!safeFileName || safeFileName === "." || safeFileName.includes("..") || !fs.existsSync(root)) {
    return [];
  }

  if (archiveFileCache.has(cacheKey)) {
    return archiveFileCache.get(cacheKey);
  }

  const matches = [];
  const stack = [{ dir: root, depth: 0 }];
  let visited = 0;
  const maxVisited = Number(options.maxVisited || 3500);

  while (stack.length && matches.length < maxMatches && visited < maxVisited) {
    const current = stack.pop();
    visited += 1;

    let entries = [];

    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch (error) {
      continue;
    }

    entries.forEach(entry => {
      if (shouldSkipArchiveEntry(entry.name)) {
        return;
      }

      const entryPath = path.join(current.dir, entry.name);

      if (entry.isFile() && normalizePathPart(entry.name) === normalizedFileName) {
        matches.push(entryPath);
        return;
      }

      if (entry.isDirectory() && current.depth < maxDepth) {
        stack.push({ dir: entryPath, depth: current.depth + 1 });
      }
    });
  }

  archiveFileCache.set(cacheKey, matches);
  return matches;
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
  const normalizedToPrintNikeOrders = path.resolve(TO_PRINT_ROOT, "NIKE ORDERS");
  let relativePath = "";

  if (isInsideRoot(normalizedOriginal, normalizedNewArt)) {
    relativePath = path.relative(normalizedNewArt, normalizedOriginal);
  } else if (isInsideRoot(normalizedOriginal, normalizedToPrintNikeOrders)) {
    relativePath = path.relative(normalizedToPrintNikeOrders, normalizedOriginal);
  } else {
    return null;
  }

  const relativeParts = relativePath.split(path.sep);
  const monthFolder = MONTH_FOLDER_BY_NUMBER[monthNumber];

  if (normalizePathPart(relativeParts[0]) === normalizePathPart(monthFolder)) {
    return null;
  }

  const trimmedRelativeParts = normalizePathPart(relativeParts[0]) === "nike orders"
    ? relativeParts.slice(1)
    : relativeParts;
  const safeRelativePath = trimmedRelativeParts.length
    ? path.join(...trimmedRelativeParts)
    : relativePath;

  return {
    path: path.join(TO_PRINT_ROOT, "NIKE ORDERS", monthFolder, safeRelativePath),
    reason: "to_print_nike_month",
    status: "found_moved_to_to_print"
  };
}

function buildNikeOrdersDirectArchiveCandidates(originalPath, options = {}) {
  const normalizedOriginal = path.resolve(originalPath);
  const normalizedNikeOrdersRoot = path.resolve(NIKE_ORDERS_ROOT);

  if (!isInsideRoot(normalizedOriginal, normalizedNikeOrdersRoot)) {
    return [];
  }

  const relativePath = path.relative(normalizedNikeOrdersRoot, normalizedOriginal);
  const monthNumber = parseMonthNumber(options.fechaEmbarque)
    || parseMonthNumber(relativePath);
  const plainMonthFolder = PLAIN_MONTH_FOLDER_BY_NUMBER[monthNumber];

  if (!plainMonthFolder) {
    return [];
  }

  const archiveYear = Number(options.archiveYear) || new Date().getFullYear();
  const archivePrefixes = [
    plainMonthFolder,
    `NIKE ${plainMonthFolder}`,
    path.join(`NIKE ${archiveYear}`, plainMonthFolder),
    path.join(String(archiveYear), plainMonthFolder)
  ];

  return archivePrefixes.map(prefix => ({
    path: path.join(NIKE_ORDERS_ROOT, prefix, relativePath),
    reason: "nike_orders_direct_archive",
    status: "found_relocated_archive"
  }));
}

function buildArchiveRelocationCandidates(originalPath, roots, options = {}) {
  const normalizedOriginal = path.resolve(originalPath);
  const candidates = [];
  const sourceRoot = roots
    .map(root => path.resolve(root))
    .find(root => isInsideRoot(normalizedOriginal, root));

  if (!sourceRoot) {
    return candidates;
  }

  const relativeParts = path.relative(sourceRoot, normalizedOriginal).split(path.sep);

  relativeParts.slice(0, -1).forEach((part, index) => {
    if (!isMovableArchiveFolderName(part)) {
      return;
    }

    roots.forEach(root => {
      const normalizedRoot = path.resolve(root);
      getMovableFolderSearchNames(part).forEach(searchName => {
        findDirectoriesByName(normalizedRoot, searchName, {
          maxDepth: options.directoryDepth || 4,
          maxMatches: options.maxDirectoryMatches || 20
        }).forEach(foundDir => {
          const tailParts = relativeParts.slice(index + 1);
          const relocatedPath = tailParts.length ? path.join(foundDir, ...tailParts) : foundDir;

          candidates.push({
            path: relocatedPath,
            reason: options.reason || "archive_relocation",
            status: options.status || "found_relocated_archive"
          });
        });
      });
    });
  });

  return candidates;
}

function buildArchiveFileSearchCandidates(originalPath, roots, options = {}) {
  const safeFileName = path.basename(options.fileName || originalPath || "");

  if (!safeFileName || safeFileName === "." || safeFileName.includes("..")) {
    return [];
  }

  return roots.flatMap(root => {
    return findFilesByBasename(root, safeFileName, {
      maxDepth: options.fileDepth || 7,
      maxMatches: options.maxFileMatches || 12
    }).map(foundPath => ({
      path: foundPath,
      reason: options.reason || "archive_file_search",
      status: options.status || "found_relocated_archive"
    }));
  });
}

function buildGenericasCandidate(originalPath, fileName) {
  const safeFileName = path.basename(fileName || originalPath || "");

  if (!safeFileName || safeFileName === "." || safeFileName.includes("..")) {
    return null;
  }

  return GENERICAS_ROOTS.map(root => ({
    path: path.join(root, safeFileName),
    reason: "genericas",
    status: "found_genericas"
  }));
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
    buildGenericasCandidate(normalizedOriginal, options.fileName)
      ?.forEach(candidate => addUniqueCandidate(candidates, candidate));
  }

  if (options.enableNikeOrdersArchiveFallback) {
    buildNikeOrdersDirectArchiveCandidates(normalizedOriginal, {
      fechaEmbarque: options.fechaEmbarque,
      archiveYear: options.archiveYear
    }).forEach(candidate => addUniqueCandidate(candidates, candidate));

    if (options.enableDeepArchiveDirectorySearch) {
      buildArchiveRelocationCandidates(normalizedOriginal, [NIKE_ORDERS_ROOT], {
        reason: "nike_orders_archive_relocation",
        status: "found_relocated_archive",
        directoryDepth: 4
      }).forEach(candidate => addUniqueCandidate(candidates, candidate));
    }

    if (options.enableArchiveFileSearch) {
      buildArchiveFileSearchCandidates(normalizedOriginal, [NIKE_ORDERS_ROOT], {
        fileName: options.fileName || normalizedOriginal,
        reason: "nike_orders_archive_file_search",
        status: "found_relocated_archive",
        fileDepth: 7
      }).forEach(candidate => addUniqueCandidate(candidates, candidate));
    }
  }

  if (options.enableMockupArchiveFallback) {
    buildArchiveRelocationCandidates(normalizedOriginal, MOCKUP_ARCHIVE_ROOTS, {
      reason: "mockup_archive_relocation",
      status: "found_relocated_archive",
      directoryDepth: 4
    }).forEach(candidate => addUniqueCandidate(candidates, candidate));

    if (options.enableArchiveFileSearch) {
      buildArchiveFileSearchCandidates(normalizedOriginal, MOCKUP_ARCHIVE_ROOTS, {
        fileName: options.fileName || normalizedOriginal,
        reason: "mockup_archive_file_search",
        status: "found_relocated_archive",
        fileDepth: 7
      }).forEach(candidate => addUniqueCandidate(candidates, candidate));
    }
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
  NIKE_ORDERS_ROOT,
  GENERICAS_ROOT,
  LISTAS_ON_DEMAND_PERSONALIZADAS_ROOT,
  LISTAS_NIKE_GENERICAS_ROOT,
  LISTAS_NIKE_PERSONALIZADAS_ROOT,
  GENERICAS_ROOTS,
  MOCKUP_ARCHIVE_ROOTS,
  DEFAULT_ALLOWED_ROOTS,
  resolveRmcFilePath,
  validateExistingFile
};
