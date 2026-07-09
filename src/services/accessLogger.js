const fs = require("fs");
const path = require("path");

const DISABLED_VALUES = new Set(["0", "false", "no", "off"]);
const DEFAULT_LOG_PATH = path.join(__dirname, "..", "..", "logs", "access.log");

function isEnabled(value, fallback = true) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  return !DISABLED_VALUES.has(String(value).trim().toLowerCase());
}

function resolveLogPath(value) {
  if (!value || !String(value).trim()) {
    return DEFAULT_LOG_PATH;
  }

  const configuredPath = String(value).trim();
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
}

function normalizeIp(value) {
  if (!value) {
    return "unknown";
  }

  const ip = String(value).trim();
  if (ip === "::1" || ip === "0:0:0:0:0:0:0:1") {
    return "127.0.0.1";
  }

  if (ip.startsWith("::ffff:")) {
    return ip.slice("::ffff:".length);
  }

  return ip;
}

function getClientIp(req) {
  return normalizeIp(
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip
  );
}

function isLocalIp(ip) {
  return ip === "127.0.0.1" || ip === "localhost" || ip === "::1";
}

function parseClientNames(value) {
  const clientNames = new Map();

  if (!value || !String(value).trim()) {
    return clientNames;
  }

  String(value)
    .split(/[,;\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const separatorIndex = entry.indexOf("=");
      if (separatorIndex <= 0) {
        return;
      }

      const ip = normalizeIp(entry.slice(0, separatorIndex));
      const name = entry.slice(separatorIndex + 1).trim();
      if (ip && name) {
        clientNames.set(ip, name);
      }
    });

  return clientNames;
}

function createAccessLogger(options = {}) {
  const enabled = isEnabled(options.enabled ?? process.env.RMC_ACCESS_LOG_ENABLED, true);
  const logPath = resolveLogPath(options.logPath ?? process.env.RMC_ACCESS_LOG_PATH);
  const clientNames = parseClientNames(options.clientNames ?? process.env.RMC_ACCESS_LOG_CLIENT_NAMES);
  const seenRemoteClients = new Set();
  let reportedWriteError = false;

  if (!enabled) {
    const disabledMiddleware = (req, res, next) => next();
    disabledMiddleware.enabled = false;
    disabledMiddleware.logPath = logPath;
    return disabledMiddleware;
  }

  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  } catch (error) {
    console.error(`[access-log] No se pudo preparar ${logPath}: ${error.message}`);
  }

  const middleware = (req, res, next) => {
    const startedAt = Date.now();
    const clientIp = getClientIp(req);
    const isLocal = isLocalIp(clientIp);
    const clientName = clientNames.get(clientIp) || null;

    res.on("finish", () => {
      const entry = {
        ts: new Date().toISOString(),
        client_ip: clientIp,
        client_name: clientName,
        is_local: isLocal,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        duration_ms: Date.now() - startedAt,
        user_agent: req.get("user-agent") || "",
        referer: req.get("referer") || ""
      };

      fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, (error) => {
        if (error && !reportedWriteError) {
          reportedWriteError = true;
          console.error(`[access-log] No se pudo escribir ${logPath}: ${error.message}`);
        }
      });

      if (!isLocal && !seenRemoteClients.has(clientIp)) {
        seenRemoteClients.add(clientIp);
        const clientLabel = clientName ? `${clientName} (${clientIp})` : clientIp;
        console.log(`[access-log] Cliente LAN detectado: ${clientLabel} (${req.method} ${entry.path})`);
      }
    });

    next();
  };

  middleware.enabled = true;
  middleware.logPath = logPath;
  return middleware;
}

module.exports = {
  createAccessLogger,
  normalizeIp,
  isLocalIp,
  parseClientNames
};
