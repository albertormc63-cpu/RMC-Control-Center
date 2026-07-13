const express = require("express");
const db = require("../db");
const catalog = require("../services/opNikeCatalog");

const router = express.Router();
//Optener el PIN de administrador para el catalogo Op-Nike desde la variable de entorno, o usar un valor por defecto si no está definido.
const OP_NIKE_ADMIN_PIN = String(process.env.RMC_OPNIKE_ADMIN_PIN || "290497");

function sendError(res, error, fallbackMessage) {
  const status = error.status || 500;

  res.status(status).json({
    error: fallbackMessage,
    message: error.message,
    validation: error.validation || null
  });
}

function getRequestPin(req) {
  return String(
    req.get("X-RMC-OPNIKE-PIN") ||
    req.body?.pin ||
    ""
  ).trim();
}

function requireCatalogPin(req, res, next) {
  if (getRequestPin(req) === OP_NIKE_ADMIN_PIN) {
    next();
    return;
  }

  res.status(401).json({
    error: "PIN requerido",
    message: "PIN invalido o ausente para modificar el catalogo Op-Nike"
  });
}

router.post("/unlock", (req, res) => {
  if (getRequestPin(req) !== OP_NIKE_ADMIN_PIN) {
    res.status(401).json({
      error: "PIN invalido",
      message: "PIN invalido para Catalogo Op-Nike"
    });
    return;
  }

  res.json({ ok: true });
});

router.get("/", (req, res) => {
  try {
    res.json({
      templateRoot: catalog.TEMPLATE_ROOT,
      statuses: [...catalog.VALID_STATUSES],
      families: catalog.listFamilies(db),
      variants: catalog.listVariants(db)
    });
  } catch (error) {
    sendError(res, error, "No se pudo leer el catalogo Op-Nike");
  }
});

router.get("/families", (req, res) => {
  try {
    res.json({
      families: catalog.listFamilies(db)
    });
  } catch (error) {
    sendError(res, error, "No se pudieron leer las familias Op-Nike");
  }
});

router.post("/families", requireCatalogPin, (req, res) => {
  try {
    catalog.insertFamily(db, req.body || {});
    res.status(201).json({
      ok: true,
      family: catalog.getFamily(db, req.body.style_family)
    });
  } catch (error) {
    sendError(res, error, "No se pudo crear la familia Op-Nike");
  }
});

router.put("/families/:styleFamily", requireCatalogPin, (req, res) => {
  try {
    catalog.updateFamily(db, req.params.styleFamily, req.body || {});
    res.json({
      ok: true,
      family: catalog.getFamily(db, req.body.style_family || req.params.styleFamily)
    });
  } catch (error) {
    sendError(res, error, "No se pudo actualizar la familia Op-Nike");
  }
});

router.get("/variants", (req, res) => {
  try {
    res.json({
      variants: catalog.listVariants(db)
    });
  } catch (error) {
    sendError(res, error, "No se pudieron leer las variantes Op-Nike");
  }
});

router.post("/variants", requireCatalogPin, (req, res) => {
  try {
    const result = catalog.insertVariant(db, req.body || {});
    const variant = catalog.getVariant(db, result.lastInsertRowid);
    const validation = catalog.validateAndPreviewVariant(db, variant);

    res.status(201).json({
      ok: true,
      variant,
      ...validation
    });
  } catch (error) {
    sendError(res, error, "No se pudo crear la variante Op-Nike");
  }
});

router.put("/variants/:id", requireCatalogPin, (req, res) => {
  try {
    const id = Number(req.params.id);

    catalog.updateVariant(db, id, req.body || {});
    const variant = catalog.getVariant(db, id);
    const validation = catalog.validateAndPreviewVariant(db, variant);

    res.json({
      ok: true,
      variant,
      ...validation
    });
  } catch (error) {
    sendError(res, error, "No se pudo actualizar la variante Op-Nike");
  }
});

router.post("/variants/validate", (req, res) => {
  try {
    const row = catalog.normalizeVariantPayload(req.body || {});

    res.json(catalog.validateAndPreviewVariant(db, row, {
      enforceActive: row.opnike_rule_status === "active",
      preview: req.body.preview || {}
    }));
  } catch (error) {
    sendError(res, error, "No se pudo validar la regla Op-Nike");
  }
});

router.post("/variants/:id/validate", requireCatalogPin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const variant = catalog.getVariant(db, id);

    if (!variant) {
      res.status(404).json({ error: "Variante Op-Nike no encontrada" });
      return;
    }

    const row = {
      ...variant,
      ...catalog.normalizeVariantPayload(req.body || {})
    };
    const result = catalog.validateAndPreviewVariant(db, row, {
      enforceActive: row.opnike_rule_status === "active",
      preview: req.body.preview || {}
    });

    db.prepare(`
      UPDATE rmc_nike_style_variants
      SET
        opnike_validated_at = ?,
        opnike_validation_message = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(result.validation.validatedAt, result.validation.message, id);

    res.json(result);
  } catch (error) {
    sendError(res, error, "No se pudo validar la regla Op-Nike");
  }
});

router.post("/variants/:id/activate", requireCatalogPin, (req, res) => {
  try {
    const id = Number(req.params.id);
    const validation = catalog.activateVariant(db, id);
    const variant = catalog.getVariant(db, id);
    const preview = catalog.buildPreview(variant, catalog.listFamilies(db), req.body.preview || {});

    res.json({
      ok: true,
      variant,
      validation,
      preview
    });
  } catch (error) {
    sendError(res, error, "No se pudo activar la regla Op-Nike");
  }
});

module.exports = router;
