const CANCELLATION_TABLE = "rmc_nike_item_cancellations";
const MAX_CANCELLATION_REASON_LENGTH = 240;

function ensureNikeCancellationSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${CANCELLATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      run_id TEXT NOT NULL DEFAULT '',
      reason TEXT NOT NULL DEFAULT '',
      cancelled_by TEXT NOT NULL DEFAULT '',
      cancelled_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      is_active INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      UNIQUE(item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_rmc_nike_item_cancellations_active
      ON ${CANCELLATION_TABLE} (is_active, item_id);
  `);
}

function activeNikeItemWhere(itemAlias = "i") {
  return `NOT EXISTS (
    SELECT 1
    FROM ${CANCELLATION_TABLE} nic
    WHERE nic.item_id = ${itemAlias}.id
      AND nic.is_active = 1
  )`;
}

function normalizeCancellationReason(value) {
  return String(value || "").replace(/\r\n?/g, "\n").trim().slice(0, MAX_CANCELLATION_REASON_LENGTH);
}

function cancelNikeItem(db, options = {}) {
  ensureNikeCancellationSchema(db);

  const itemId = Number(options.itemId);
  const reason = normalizeCancellationReason(options.reason);
  const cancelledBy = String(options.cancelledBy || "").trim();

  if (!Number.isInteger(itemId) || itemId < 1) {
    const error = new Error("ID de item Nike invalido");
    error.status = 400;
    throw error;
  }

  const item = db.prepare(`
    SELECT id, run_id, wo, ship_order, style, equipo, nombre, numero
    FROM rmcop_nike_items
    WHERE id = ?
  `).get(itemId);

  if (!item) {
    const error = new Error("Item Nike no encontrado");
    error.status = 404;
    throw error;
  }

  db.prepare(`
    INSERT INTO ${CANCELLATION_TABLE}
      (item_id, run_id, reason, cancelled_by, cancelled_at, is_active, updated_at)
    VALUES
      (?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    ON CONFLICT(item_id) DO UPDATE SET
      run_id = excluded.run_id,
      reason = excluded.reason,
      cancelled_by = excluded.cancelled_by,
      cancelled_at = excluded.cancelled_at,
      is_active = 1,
      updated_at = excluded.updated_at
  `).run(itemId, item.run_id || "", reason, cancelledBy);

  const cancellation = db.prepare(`
    SELECT id, item_id, run_id, reason, cancelled_by, cancelled_at, is_active
    FROM ${CANCELLATION_TABLE}
    WHERE item_id = ?
  `).get(itemId);

  return {
    ok: true,
    item,
    cancellation
  };
}

module.exports = {
  CANCELLATION_TABLE,
  activeNikeItemWhere,
  cancelNikeItem,
  ensureNikeCancellationSchema
};
