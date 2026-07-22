const MAX_MESSAGE_LENGTH = 500;
const REACTION_TYPES = Object.freeze(["like", "love", "haha", "wow", "sad", "angry"]);

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

    CREATE TABLE IF NOT EXISTS rmc_chat_reactions (
      message_id INTEGER NOT NULL,
      client_ip TEXT NOT NULL,
      reaction TEXT NOT NULL CHECK (reaction IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      PRIMARY KEY (message_id, client_ip),
      FOREIGN KEY (message_id) REFERENCES rmc_chat_messages(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_rmc_chat_reactions_message
      ON rmc_chat_reactions (message_id, reaction);
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

function normalizeMessageIds(values) {
  const source = Array.isArray(values) ? values : String(values || "").split(",");

  return [...new Set(source
    .map(value => Number(value))
    .filter(value => Number.isInteger(value) && value > 0))]
    .slice(0, 100);
}

function getReactionSummaries(db, messageIds, viewerIp) {
  const ids = normalizeMessageIds(messageIds);
  const summaries = Object.fromEntries(ids.map(id => [id, {
    counts: {},
    total: 0,
    viewer_reaction: null
  }]));

  if (!ids.length) {
    return summaries;
  }

  const placeholders = ids.map(() => "?").join(", ");
  const counts = db.prepare(`
    SELECT message_id, reaction, COUNT(*) AS total
    FROM rmc_chat_reactions
    WHERE message_id IN (${placeholders})
    GROUP BY message_id, reaction
  `).all(...ids);

  counts.forEach(row => {
    const summary = summaries[row.message_id];

    if (summary) {
      summary.counts[row.reaction] = Number(row.total) || 0;
      summary.total += Number(row.total) || 0;
    }
  });

  const normalizedViewerIp = normalizeIp(viewerIp);
  const ownReactions = db.prepare(`
    SELECT message_id, reaction
    FROM rmc_chat_reactions
    WHERE client_ip = ?
      AND message_id IN (${placeholders})
  `).all(normalizedViewerIp, ...ids);

  ownReactions.forEach(row => {
    if (summaries[row.message_id]) {
      summaries[row.message_id].viewer_reaction = row.reaction;
    }
  });

  return summaries;
}

function attachReactionSummaries(db, messages, viewerIp) {
  const summaries = getReactionSummaries(db, messages.map(message => message.id), viewerIp);

  return messages.map(message => ({
    ...message,
    reactions: summaries[message.id] || { counts: {}, total: 0, viewer_reaction: null }
  }));
}

function listMessages(db, options = {}) {
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
  const afterId = Math.max(0, Number(options.afterId) || 0);
  let messages;

  if (afterId > 0) {
    messages = db.prepare(`
      SELECT id, client_ip, message, created_at
      FROM rmc_chat_messages
      WHERE id > ?
      ORDER BY id ASC
      LIMIT ?
    `).all(afterId, limit);
  } else {
    messages = db.prepare(`
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

  return attachReactionSummaries(db, messages, options.viewerIp);
}

function createMessage(db, options = {}) {
  const clientIp = normalizeIp(options.clientIp);
  const message = validateMessage(options.message);
  const result = db.prepare(`
    INSERT INTO rmc_chat_messages (client_ip, message)
    VALUES (?, ?)
  `).run(clientIp, message);

  const row = db.prepare(`
    SELECT id, client_ip, message, created_at
    FROM rmc_chat_messages
    WHERE id = ?
  `).get(result.lastInsertRowid);

  return attachReactionSummaries(db, [row], clientIp)[0];
}

function setMessageReaction(db, options = {}) {
  const messageId = Number(options.messageId);
  const clientIp = normalizeIp(options.clientIp);
  const reaction = String(options.reaction || "").trim().toLowerCase();

  if (!Number.isInteger(messageId) || messageId <= 0) {
    const error = new Error("Mensaje invalido");
    error.status = 400;
    throw error;
  }

  if (!REACTION_TYPES.includes(reaction)) {
    const error = new Error("Reaccion no permitida");
    error.status = 400;
    throw error;
  }

  const messageExists = db.prepare(`
    SELECT 1
    FROM rmc_chat_messages
    WHERE id = ?
  `).get(messageId);

  if (!messageExists) {
    const error = new Error("Mensaje no encontrado");
    error.status = 404;
    throw error;
  }

  const existing = db.prepare(`
    SELECT reaction
    FROM rmc_chat_reactions
    WHERE message_id = ? AND client_ip = ?
  `).get(messageId, clientIp);

  if (existing?.reaction === reaction) {
    db.prepare(`
      DELETE FROM rmc_chat_reactions
      WHERE message_id = ? AND client_ip = ?
    `).run(messageId, clientIp);
  } else {
    db.prepare(`
      INSERT INTO rmc_chat_reactions (message_id, client_ip, reaction)
      VALUES (?, ?, ?)
      ON CONFLICT(message_id, client_ip) DO UPDATE SET
        reaction = excluded.reaction,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `).run(messageId, clientIp, reaction);
  }

  return getReactionSummaries(db, [messageId], clientIp)[messageId];
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  REACTION_TYPES,
  attachReactionSummaries,
  createMessage,
  ensureChatSchema,
  getReactionSummaries,
  getClientIp,
  listMessages,
  normalizeMessageIds,
  normalizeIp,
  setMessageReaction,
  validateMessage
};
