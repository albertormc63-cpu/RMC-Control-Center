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

function findMockupPath(db, nikeItem) {
  if (!nikeItem.wo || !nikeItem.style) {
    return "";
  }

  // WO, ship order y style identifican el pedido; la talla resuelve casos duplicados.
  const candidates = db.prepare(`
    SELECT id, talla, path
    FROM rmc_mockuptool_items
    WHERE TRIM(wo) = TRIM(?)
      AND TRIM(style) = TRIM(?)
      AND (
        TRIM(COALESCE(?, '')) = ''
        OR TRIM(COALESCE(ship_order, '')) = TRIM(?)
      )
      AND COALESCE(path, '') <> ''
    ORDER BY id DESC
  `).all(nikeItem.wo, nikeItem.style, nikeItem.ship_order, nikeItem.ship_order);

  const expectedSize = MOCKUP_SIZE_BY_NIKE_SIZE[normalize(nikeItem.talla)] || normalize(nikeItem.talla);
  const matchingSizes = candidates.filter(candidate =>
    normalize(candidate.talla).split("-").includes(expectedSize)
  );

  // Prefiere una maqueta de talla individual; despues usa una maqueta combinada.
  const exactSize = matchingSizes.find(candidate => normalize(candidate.talla) === expectedSize);
  return exactSize?.path || matchingSizes[0]?.path || "";
}

function attachNikeFilePaths(db, nikeItem) {
  return {
    ...nikeItem,
    maqueta_path: findMockupPath(db, nikeItem),
    plantilla_path: nikeItem.path || "",
    roster_path: nikeItem.roster || ""
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
  getNikeItemWithFilePaths
};
