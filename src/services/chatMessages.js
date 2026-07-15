const MAX_MESSAGE_LENGTH = 500;

function ensureChatSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rmc_chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_ip TEXT NOT NULL,
      message TEXT NOT NULL CHECK (length(message) BETWEEN 1 AND ${MAX_MESSAGE_LENGTH}),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_rmc_chat_messages_created_at
      ON rmc_chat_messages (created_at, id);
  `);
}

function normalizeMessage(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n").trim();
}

function validateMessage(value) {
  const message = normalizeMessage(value);

  if (!message) {
    const error = new Error("Escribe un mensaje antes de enviar");
    error.status = 400;
    throw error;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    const error = new Error(`El mensaje no puede exceder ${MAX_MESSAGE_LENGTH} caracteres`);
    error.status = 400;
    throw error;
  }

  return message;
}

function normalizeIp(value) {
  const ip = String(value || "").trim();

  if (!ip || ip === "::1") {
    return "127.0.0.1";
  }

  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function getClientIp(req) {
  return normalizeIp(req.socket?.remoteAddress || req.ip);
}

function listMessages(db, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
  const afterId = Math.max(0, Number(options.afterId) || 0);

  if (afterId > 0) {
    return db.prepare(`
      SELECT id, client_ip, message, created_at
      FROM rmc_chat_messages
      WHERE id > ?
      ORDER BY id ASC
      LIMIT ?
    `).all(afterId, limit);
  }

  return db.prepare(`
    SELECT id, client_ip, message, created_at
    FROM (
      SELECT id, client_ip, message, created_at
      FROM rmc_chat_messages
      ORDER BY id DESC
      LIMIT ?
    )
    ORDER BY id ASC
  `).all(limit);
}

function createMessage(db, options = {}) {
  const clientIp = normalizeIp(options.clientIp);
  const message = validateMessage(options.message);
  const result = db.prepare(`
    INSERT INTO rmc_chat_messages (client_ip, message)
    VALUES (?, ?)
  `).run(clientIp, message);

  return db.prepare(`
    SELECT id, client_ip, message, created_at
    FROM rmc_chat_messages
    WHERE id = ?
  `).get(result.lastInsertRowid);
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  createMessage,
  ensureChatSchema,
  getClientIp,
  listMessages,
  normalizeIp,
  validateMessage
};
