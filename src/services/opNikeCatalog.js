const fs = require("fs");
const path = require("path");

const TEMPLATE_ROOT = "/Volumes/Fullsize/PATRONES ACOMODADOS PARA ROLLO/NIKE LACROSSE/RMCOp-NIKE";

const FAMILY_FIELDS = [
  "style_family",
  "liga",
  "line_name",
  "audience",
  "product_folder",
  "garment_type",
  "is_active",
  "source_notes"
];

const VARIANT_FIELDS = [
  "variant_code",
  "variant_name",
  "is_active",
  "is_official_team",
  "requires_design_code",
  "team_code",
  "team_name",
  "team_market",
  "team_mascot",
  "team_gender",
  "file_team_name",
  "design_code",
  "design_name",
  "template_name_placeholder",
  "template_number_placeholder",
  "aliases",
  "notes",
  "liga",
  "mockup_folder",
  "mockup_file_pattern",
  "mockup_source_type",
  "mockup_status",
  "opnike_enabled",
  "opnike_rule_status",
  "opnike_style_scope",
  "opnike_liga_scope",
  "opnike_variant_root_folder",
  "opnike_group_folder_pattern",
  "opnike_product_folder_pattern",
  "opnike_version_folder_pattern",
  "opnike_team_folder_pattern",
  "opnike_design_folder",
  "opnike_style_subfolder_rule",
  "opnike_template_code",
  "opnike_template_name_pattern",
  "opnike_output_name_pattern",
  "opnike_fallback_search_mode",
  "opnike_resolution_strategy",
  "opnike_requires_version_folder",
  "opnike_requires_team_folder",
  "opnike_requires_design_folder",
  "opnike_requires_style_subfolder"
];

const BOOLEAN_FIELDS = new Set([
  "is_active",
  "is_official_team",
  "requires_design_code",
  "opnike_enabled",
  "opnike_requires_version_folder",
  "opnike_requires_team_folder",
  "opnike_requires_design_folder",
  "opnike_requires_style_subfolder"
]);

const VALID_STATUSES = new Set(["draft", "shadow", "active", "inactive"]);
const TEAM_STRATEGY_RE = /team|official|standard|special|jr/i;
const SOURCE_TEMPLATE_RE = /(?:^|[\s_-])(5LM|5LG)(?:[\s_.-]|$)|ROLLO|TODAS?\s+LAS\s+TALLAS|ALL\s+SIZES/i;
const STYLE_TOKEN_RE = /A1000|Y1000|A1500|Y1500|A2000|Y2000/i;

function text(value) {
  return String(value ?? "").trim();
}

function hasValue(value) {
  return text(value) !== "";
}

function toBoolean(value, fallback = 0) {
  if (value === true || value === 1 || value === "1" || value === "true" || value === "on") {
    return 1;
  }

  if (value === false || value === 0 || value === "0" || value === "false" || value === "off") {
    return 0;
  }

  return fallback;
}

function normalizeStatus(value) {
  const status = text(value).toLowerCase() || "draft";
  return VALID_STATUSES.has(status) ? status : "draft";
}

function normalizePayload(payload, fields) {
  return fields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = BOOLEAN_FIELDS.has(field)
        ? toBoolean(payload[field])
        : text(payload[field]) || null;
    }

    return acc;
  }, {});
}

function normalizeFamilyPayload(payload) {
  const normalized = normalizePayload(payload, FAMILY_FIELDS);

  normalized.is_active = toBoolean(payload.is_active, 1);
  return normalized;
}

function normalizeVariantPayload(payload) {
  const normalized = normalizePayload(payload, VARIANT_FIELDS);

  BOOLEAN_FIELDS.forEach(field => {
    if (VARIANT_FIELDS.includes(field)) {
      normalized[field] = toBoolean(payload[field], field === "is_active" ? 1 : 0);
    }
  });

  normalized.opnike_rule_status = normalizeStatus(payload.opnike_rule_status);

  if (Number(normalized.requires_design_code) === 1 && normalized.design_code === null) {
    normalized.design_code = "";
  }

  return normalized;
}

function listFamilies(db) {
  return db.prepare(`
    SELECT *
    FROM rmc_nike_style_families
    ORDER BY style_family
  `).all();
}

function listVariants(db) {
  return db.prepare(`
    SELECT *
    FROM rmc_nike_style_variants
    ORDER BY
      CASE opnike_rule_status
        WHEN 'active' THEN 1
        WHEN 'shadow' THEN 2
        WHEN 'draft' THEN 3
        ELSE 4
      END,
      variant_code,
      COALESCE(team_market, ''),
      COALESCE(team_mascot, ''),
      COALESCE(design_code, ''),
      id
  `).all();
}

function getFamily(db, styleFamily) {
  return db.prepare(`
    SELECT *
    FROM rmc_nike_style_families
    WHERE style_family = ?
  `).get(styleFamily);
}

function getVariant(db, id) {
  return db.prepare(`
    SELECT *
    FROM rmc_nike_style_variants
    WHERE id = ?
  `).get(id);
}

function insertFamily(db, payload) {
  const row = normalizeFamilyPayload(payload);

  validateFamily(row, { requireAll: true });

  return db.prepare(`
    INSERT INTO rmc_nike_style_families (
      style_family,
      liga,
      line_name,
      audience,
      product_folder,
      garment_type,
      is_active,
      source_notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    row.style_family,
    row.liga,
    row.line_name,
    row.audience,
    row.product_folder,
    row.garment_type,
    row.is_active,
    row.source_notes || null
  );
}

function updateFamily(db, styleFamily, payload) {
  const existing = getFamily(db, styleFamily);

  if (!existing) {
    const error = new Error("Familia de style no encontrada");
    error.status = 404;
    throw error;
  }

  const row = {
    ...existing,
    ...normalizeFamilyPayload(payload)
  };

  validateFamily(row, { requireAll: true });

  return db.prepare(`
    UPDATE rmc_nike_style_families
    SET
      style_family = ?,
      liga = ?,
      line_name = ?,
      audience = ?,
      product_folder = ?,
      garment_type = ?,
      is_active = ?,
      source_notes = ?,
      updated_at = datetime('now')
    WHERE style_family = ?
  `).run(
    row.style_family,
    row.liga,
    row.line_name,
    row.audience,
    row.product_folder,
    row.garment_type,
    row.is_active,
    row.source_notes || null,
    styleFamily
  );
}

function insertVariant(db, payload) {
  const row = normalizeVariantPayload(payload);
  const validation = validateVariant(row, listFamilies(db), {
    enforceActive: row.opnike_rule_status === "active"
  });

  if (!validation.canActivate && row.opnike_rule_status === "active") {
    const error = new Error("No se puede activar una regla incompleta");
    error.status = 422;
    error.validation = validation;
    throw error;
  }

  return db.prepare(`
    INSERT INTO rmc_nike_style_variants (
      ${VARIANT_FIELDS.join(", ")}
    )
    VALUES (${VARIANT_FIELDS.map(() => "?").join(", ")})
  `).run(...VARIANT_FIELDS.map(field => row[field] ?? null));
}

function updateVariant(db, id, payload) {
  const existing = getVariant(db, id);

  if (!existing) {
    const error = new Error("Variante Op-Nike no encontrada");
    error.status = 404;
    throw error;
  }

  const row = {
    ...existing,
    ...normalizeVariantPayload(payload)
  };
  const validation = validateVariant(row, listFamilies(db), {
    enforceActive: row.opnike_rule_status === "active"
  });

  if (!validation.canActivate && row.opnike_rule_status === "active") {
    const error = new Error("No se puede activar una regla incompleta");
    error.status = 422;
    error.validation = validation;
    throw error;
  }

  return db.prepare(`
    UPDATE rmc_nike_style_variants
    SET
      ${VARIANT_FIELDS.map(field => `${field} = ?`).join(", ")},
      opnike_validated_at = ?,
      opnike_validation_message = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    ...VARIANT_FIELDS.map(field => row[field] ?? null),
    validation.validatedAt,
    validation.message,
    id
  );
}

function activateVariant(db, id) {
  const existing = getVariant(db, id);

  if (!existing) {
    const error = new Error("Variante Op-Nike no encontrada");
    error.status = 404;
    throw error;
  }

  const row = {
    ...existing,
    opnike_enabled: 1,
    opnike_rule_status: "active"
  };
  const validation = validateVariant(row, listFamilies(db), { enforceActive: true });

  if (!validation.canActivate) {
    const error = new Error("No se puede activar una regla incompleta");
    error.status = 422;
    error.validation = validation;
    throw error;
  }

  db.prepare(`
    UPDATE rmc_nike_style_variants
    SET
      opnike_enabled = 1,
      opnike_rule_status = 'active',
      opnike_validated_at = ?,
      opnike_validation_message = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(validation.validatedAt, validation.message, id);

  return validation;
}

function requireFields(row, fields, missing) {
  fields.forEach(field => {
    if (!hasValue(row[field])) {
      missing.push(field);
    }
  });
}

function patternUses(row, token) {
  const needle = `{${token}}`;
  return [
    row.opnike_group_folder_pattern,
    row.opnike_product_folder_pattern,
    row.opnike_version_folder_pattern,
    row.opnike_team_folder_pattern,
    row.opnike_design_folder,
    row.opnike_style_subfolder_rule,
    row.opnike_template_name_pattern,
    row.opnike_output_name_pattern
  ].some(value => text(value).includes(needle));
}

function validateFamily(row, options = {}) {
  const missingFields = [];

  requireFields(row, [
    "style_family",
    "liga",
    "line_name",
    "audience",
    "product_folder",
    "garment_type"
  ], missingFields);

  if (row.is_active === undefined || row.is_active === null || row.is_active === "") {
    missingFields.push("is_active");
  }

  if (missingFields.length && options.requireAll) {
    const error = new Error(`Familia incompleta: ${missingFields.join(", ")}`);
    error.status = 422;
    error.validation = {
      canSave: false,
      missingFields
    };
    throw error;
  }

  return {
    canSave: missingFields.length === 0,
    missingFields
  };
}

function validateVariant(row, families, options = {}) {
  const missingFields = [];
  const warnings = [];
  const status = normalizeStatus(row.opnike_rule_status);
  const familyByCode = new Map(families.map(family => [family.style_family, family]));

  requireFields(row, [
    "variant_code",
    "variant_name",
    "opnike_rule_status",
    "opnike_style_scope",
    "opnike_variant_root_folder",
    "opnike_group_folder_pattern",
    "opnike_product_folder_pattern",
    "opnike_template_name_pattern",
    "opnike_output_name_pattern",
    "opnike_fallback_search_mode",
    "opnike_resolution_strategy"
  ], missingFields);

  if (row.opnike_enabled === undefined || row.opnike_enabled === null || row.opnike_enabled === "") {
    missingFields.push("opnike_enabled");
  }

  if (!VALID_STATUSES.has(status)) {
    missingFields.push("opnike_rule_status");
  }

  if (options.enforceActive && Number(row.opnike_enabled) !== 1) {
    missingFields.push("opnike_enabled");
  }

  if (Number(row.requires_design_code) === 1) {
    requireFields(row, ["design_code", "design_name", "aliases"], missingFields);
  }

  if (Number(row.requires_design_code) === 1 && Number(row.opnike_requires_design_folder) === 1) {
    requireFields(row, ["opnike_design_folder"], missingFields);
  }

  if (patternUses(row, "templateCode") || patternUses(row, "template_code")) {
    requireFields(row, ["opnike_template_code"], missingFields);
  }

  const needsTeam = Number(row.is_official_team) === 1 || TEAM_STRATEGY_RE.test(text(row.opnike_resolution_strategy));

  if (needsTeam && !hasValue(row.team_market) && !hasValue(row.aliases)) {
    missingFields.push("team_market/aliases");
  }

  if (needsTeam && patternUses(row, "nickname")) {
    requireFields(row, ["team_mascot"], missingFields);
  }

  if (needsTeam && patternUses(row, "file_team_name")) {
    requireFields(row, ["file_team_name"], missingFields);
  }

  if (Number(row.opnike_requires_version_folder) === 1) {
    requireFields(row, ["opnike_version_folder_pattern"], missingFields);
  }

  if (Number(row.opnike_requires_team_folder) === 1) {
    requireFields(row, ["opnike_team_folder_pattern"], missingFields);
  }

  if (Number(row.opnike_requires_style_subfolder) === 1) {
    requireFields(row, ["opnike_style_subfolder_rule"], missingFields);
  }

  getStyleScopeFamilies(row).forEach(styleFamily => {
    if (!familyByCode.has(styleFamily)) {
      warnings.push(`Style family sin ficha: ${styleFamily}`);
    }
  });

  const uniqueMissing = [...new Set(missingFields)];
  const canActivate = uniqueMissing.length === 0;
  const validatedAt = new Date().toISOString();
  const message = canActivate
    ? "Regla completa para activar"
    : `Faltan campos: ${uniqueMissing.join(", ")}`;

  return {
    canActivate,
    status,
    missingFields: uniqueMissing,
    warnings,
    validatedAt,
    message
  };
}

function getStyleScopeFamilies(row) {
  return text(row.opnike_style_scope)
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function getPreviewFamily(row, families, requestedFamily) {
  const familyByCode = new Map(families.map(family => [family.style_family, family]));
  const scopedFamilies = getStyleScopeFamilies(row);
  const requested = text(requestedFamily);

  return familyByCode.get(requested)
    || familyByCode.get(scopedFamilies[0])
    || families[0]
    || {};
}

function buildPreviewTokens(row, family, options = {}) {
  const styleFamily = family.style_family || getStyleScopeFamilies(row)[0] || "A1000";
  const variantCode = text(row.variant_code) || "H";
  const style = `${styleFamily}${variantCode}`;
  const teamMarket = text(row.team_market) || "TEAM";
  const teamMascot = text(row.team_mascot) || "";
  const fileTeamName = text(row.file_team_name) || [teamMarket, teamMascot].filter(Boolean).join(" ");
  const variantCodeName = [variantCode, row.variant_name].map(text).filter(Boolean).join(" ");

  return {
    liga: text(row.liga) || text(row.opnike_liga_scope) || text(family.liga) || "PLL",
    variant_code: variantCode,
    variantCode,
    variant_name: text(row.variant_name),
    variantName: text(row.variant_name),
    variant_code_name: variantCodeName,
    variantCodeName,
    style_family: styleFamily,
    styleFamily,
    style,
    family: styleFamily,
    size: text(options.size) || "L",
    orderId: text(options.orderId) || "WO-PREVIEW",
    identifier: text(options.identifier) || "00",
    team_market: teamMarket,
    teamMarket,
    team_market_upper: teamMarket.toUpperCase(),
    teamMarketUpper: teamMarket.toUpperCase(),
    team_mascot: teamMascot,
    teamMascot,
    nickname: teamMascot,
    file_team_name: fileTeamName,
    fileTeamName,
    design_code: text(row.design_code),
    designCode: text(row.design_code),
    design_name: text(row.design_name),
    designName: text(row.design_name),
    template_code: text(row.opnike_template_code),
    templateCode: text(row.opnike_template_code),
    gender_group: text(row.team_gender) || text(family.audience),
    product_folder: text(family.product_folder),
    garment_type: text(family.garment_type),
    "style.product_folder": text(family.product_folder),
    "style.garment_type": text(family.garment_type)
  };
}

function renderPattern(pattern, tokens) {
  return text(pattern).replace(/\{([^}]+)\}/g, (match, token) => {
    if (Object.prototype.hasOwnProperty.call(tokens, token)) {
      return text(tokens[token]);
    }

    return match;
  });
}

function isFinalTemplateCandidate(fileName) {
  const baseName = path.basename(fileName);

  return /\.pdf$/i.test(baseName)
    && !SOURCE_TEMPLATE_RE.test(baseName)
    && STYLE_TOKEN_RE.test(baseName);
}

function findTemplateCandidate(expectedPath, styleFamily) {
  const expectedBase = path.basename(expectedPath);

  if (fs.existsSync(expectedPath)) {
    return {
      exists: isFinalTemplateCandidate(expectedBase),
      path: expectedPath,
      status: isFinalTemplateCandidate(expectedBase) ? "found_expected" : "source_or_roll_file_rejected"
    };
  }

  const directory = path.dirname(expectedPath);

  try {
    const files = fs.readdirSync(directory, { withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => entry.name)
      .filter(fileName => isFinalTemplateCandidate(fileName))
      .filter(fileName => fileName.toUpperCase().includes(text(styleFamily).toUpperCase()))
      .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));

    if (files.length) {
      return {
        exists: true,
        path: path.join(directory, files[0]),
        status: "found_candidate"
      };
    }
  } catch (error) {
    return {
      exists: false,
      path: expectedPath,
      status: "folder_not_found"
    };
  }

  return {
    exists: false,
    path: expectedPath,
    status: "missing"
  };
}

function buildPreview(row, families, options = {}) {
  const family = getPreviewFamily(row, families, options.styleFamily);
  const tokens = buildPreviewTokens(row, family, options);
  const folders = [
    TEMPLATE_ROOT,
    renderPattern(row.opnike_variant_root_folder, tokens),
    renderPattern(row.opnike_group_folder_pattern, tokens),
    renderPattern(row.opnike_product_folder_pattern, tokens)
  ];

  if (Number(row.opnike_requires_version_folder) === 1 || hasValue(row.opnike_version_folder_pattern)) {
    folders.push(renderPattern(row.opnike_version_folder_pattern, tokens));
  }

  if (Number(row.opnike_requires_team_folder) === 1 || hasValue(row.opnike_team_folder_pattern)) {
    folders.push(renderPattern(row.opnike_team_folder_pattern, tokens));
  }

  if (Number(row.opnike_requires_design_folder) === 1 || hasValue(row.opnike_design_folder)) {
    folders.push(renderPattern(row.opnike_design_folder, tokens));
  }

  if (Number(row.opnike_requires_style_subfolder) === 1 || hasValue(row.opnike_style_subfolder_rule)) {
    folders.push(renderPattern(row.opnike_style_subfolder_rule, tokens));
  }

  const templateName = renderPattern(row.opnike_template_name_pattern, tokens);
  const outputName = renderPattern(row.opnike_output_name_pattern, tokens);
  const expectedTemplatePath = path.join(...folders.filter(hasValue), templateName);
  const file = findTemplateCandidate(expectedTemplatePath, family.style_family || tokens.style_family);

  return {
    templateRoot: TEMPLATE_ROOT,
    styleFamily: family.style_family || tokens.style_family,
    expectedTemplatePath,
    outputName,
    tokens,
    file
  };
}

function validateAndPreviewVariant(db, row, options = {}) {
  const families = listFamilies(db);
  const validation = validateVariant(row, families, options);
  const preview = buildPreview(row, families, options.preview || {});

  return {
    validation,
    preview
  };
}

module.exports = {
  TEMPLATE_ROOT,
  VALID_STATUSES,
  VARIANT_FIELDS,
  listFamilies,
  listVariants,
  getFamily,
  getVariant,
  insertFamily,
  updateFamily,
  insertVariant,
  updateVariant,
  activateVariant,
  validateFamily,
  validateVariant,
  buildPreview,
  validateAndPreviewVariant,
  normalizeVariantPayload
};
