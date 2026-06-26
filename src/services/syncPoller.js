const fs = require("fs");

const db = require("../db");
const {
  syncPrintSublimationSource
} = require("./printSublimationSync");

const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_STABILIZE_MS = 10 * 1000;
const MIN_POLL_INTERVAL_MS = 30 * 1000;
const MIN_STABILIZE_MS = 2 * 1000;

const pendingSyncs = new Map();
const runningSyncs = new Set();

let pollTimer = null;

function parseDuration(value, fallback, minimum) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.max(Math.round(parsed), minimum);
}

function isPollingEnabled() {
  const raw = String(process.env.RMC_SYNC_POLL_ENABLED || "true").trim().toLowerCase();
  return !["0", "false", "no", "off"].includes(raw);
}

function getPollConfig() {
  return {
    enabled: isPollingEnabled(),
    intervalMs: parseDuration(
      process.env.RMC_SYNC_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS,
      MIN_POLL_INTERVAL_MS
    ),
    stabilizeMs: parseDuration(
      process.env.RMC_SYNC_POLL_STABILIZE_MS,
      DEFAULT_STABILIZE_MS,
      MIN_STABILIZE_MS
    )
  };
}

function getActivePrintSources() {
  return db.prepare(`
    SELECT *
    FROM rmc_external_sources
    WHERE active = 1
    AND source_type = 'print_sublimation_excel'
    ORDER BY id ASC
  `).all();
}

function getSourceById(sourceId) {
  return db.prepare(`
    SELECT *
    FROM rmc_external_sources
    WHERE id = ?
  `).get(sourceId);
}

function readFileSnapshot(filePath) {
  try {
    const stat = fs.statSync(filePath);

    return {
      exists: true,
      mtime_ms: Math.round(stat.mtimeMs),
      size_bytes: stat.size
    };
  } catch (error) {
    return {
      exists: false,
      error
    };
  }
}

function hasSourceChanged(source, snapshot) {
  if (!snapshot.exists) {
    return false;
  }

  return (
    Number(source.last_mtime_ms || 0) !== snapshot.mtime_ms ||
    Number(source.last_size_bytes || 0) !== snapshot.size_bytes
  );
}

function sameSnapshot(left, right) {
  return (
    left?.exists &&
    right?.exists &&
    left.mtime_ms === right.mtime_ms &&
    left.size_bytes === right.size_bytes
  );
}

function scheduleStableSync(source, initialSnapshot, config) {
  if (pendingSyncs.has(source.id) || runningSyncs.has(source.id)) {
    return;
  }

  const timer = setTimeout(() => {
    pendingSyncs.delete(source.id);
    runStableSync(source.id, initialSnapshot, config);
  }, config.stabilizeMs);

  pendingSyncs.set(source.id, timer);
}

function runStableSync(sourceId, initialSnapshot, config) {
  const source = getSourceById(sourceId);

  if (!source || !source.active || source.source_type !== "print_sublimation_excel") {
    return;
  }

  const latestSnapshot = readFileSnapshot(source.file_path);

  if (!latestSnapshot.exists) {
    console.warn(
      `[sync-poller] Fuente ${source.id} no disponible durante estabilizacion: ${source.file_path}`
    );
    return;
  }

  if (!sameSnapshot(initialSnapshot, latestSnapshot)) {
    scheduleStableSync(source, latestSnapshot, config);
    return;
  }

  if (!hasSourceChanged(source, latestSnapshot)) {
    return;
  }

  runningSyncs.add(source.id);

  try {
    const result = syncPrintSublimationSource(source.id);
    console.log(
      `[sync-poller] Fuente ${source.id} sincronizada: ` +
      `${result.summary.rows_inserted} nuevas, ` +
      `${result.summary.rows_updated} actualizadas, ` +
      `${result.summary.rows_unchanged} sin cambios.`
    );
  } catch (error) {
    console.error(`[sync-poller] Error sincronizando fuente ${source.id}:`, error.message);
  } finally {
    runningSyncs.delete(source.id);
  }
}

function runPollCycle(config = getPollConfig()) {
  const sources = getActivePrintSources();

  for (const source of sources) {
    const snapshot = readFileSnapshot(source.file_path);

    if (!snapshot.exists) {
      console.warn(
        `[sync-poller] Fuente ${source.id} no disponible: ${source.file_path}`
      );
      continue;
    }

    if (hasSourceChanged(source, snapshot)) {
      scheduleStableSync(source, snapshot, config);
    }
  }
}

function startSyncPoller() {
  const config = getPollConfig();

  if (!config.enabled) {
    console.log("[sync-poller] Polling automatico desactivado.");
    return null;
  }

  if (pollTimer) {
    return pollTimer;
  }

  console.log(
    `[sync-poller] Polling activo cada ${Math.round(config.intervalMs / 1000)}s; ` +
    `estabilizacion ${Math.round(config.stabilizeMs / 1000)}s.`
  );

  setTimeout(() => runPollCycle(config), Math.min(config.stabilizeMs, 10 * 1000));
  pollTimer = setInterval(() => runPollCycle(config), config.intervalMs);

  return pollTimer;
}

module.exports = {
  runPollCycle,
  startSyncPoller
};
