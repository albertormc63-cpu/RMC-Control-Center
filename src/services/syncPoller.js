const fs = require("fs");

const db = require("../db");
const {
  PRINT_SOURCE_TYPE,
  SUBLIMATION_OUTPUT_SOURCE_TYPE,
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
    AND source_type IN (?, ?)
    ORDER BY id ASC
  `).all(PRINT_SOURCE_TYPE, SUBLIMATION_OUTPUT_SOURCE_TYPE);
}

function getSourceById(sourceId) {
  return db.prepare(`
    SELECT *
    FROM rmc_external_sources
    WHERE id = ?
  `).get(sourceId);
}

function getSourceLabel(source) {
  if (source.source_type === PRINT_SOURCE_TYPE) {
    return "Impresores Excel";
  }

  if (source.source_type === SUBLIMATION_OUTPUT_SOURCE_TYPE) {
    return "Sublimado Excel";
  }

  return source.name || `Fuente ${source.id}`;
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

function formatSourceLastSync(source) {
  const status = source.last_status || "sin status";
  const lastSync = source.last_sync_at || "sin sync previa";

  return `ultima sync: ${lastSync}, status: ${status}`;
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

  if (
    !source ||
    !source.active ||
    ![PRINT_SOURCE_TYPE, SUBLIMATION_OUTPUT_SOURCE_TYPE].includes(source.source_type)
  ) {
    return;
  }

  const latestSnapshot = readFileSnapshot(source.file_path);

  if (!latestSnapshot.exists) {
    console.warn(
      `[sync-poller] ${getSourceLabel(source)} (ID ${source.id}) no disponible durante estabilizacion: ${source.file_path}`
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
    const summary = result.summary;

    console.log(
      `[sync-poller] ${getSourceLabel(source)} (ID ${source.id}) sincronizado: ` +
      `${summary.rows_inserted} nuevos, ` +
      `${summary.rows_updated} actualizados, ` +
      `${summary.rows_unchanged} sin cambios, ` +
      `${summary.rows_missing} faltantes, ` +
      `${summary.rows_skipped} omitidos ` +
      `(leidas ${summary.rows_read}, validas ${summary.rows_valid}).`
    );
  } catch (error) {
    console.error(
      `[sync-poller] Error sincronizando ${getSourceLabel(source)} (ID ${source.id}):`,
      error.message
    );
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
        `[sync-poller] ${getSourceLabel(source)} (ID ${source.id}) no disponible: ${source.file_path}`
      );
      continue;
    }

    if (hasSourceChanged(source, snapshot)) {
      console.log(
        `[sync-poller] ${getSourceLabel(source)} (ID ${source.id}) cambio detectado; ` +
        `esperando estabilizacion ${Math.round(config.stabilizeMs / 1000)}s.`
      );
      scheduleStableSync(source, snapshot, config);
    } else {
      console.log(
        `[sync-poller] ${getSourceLabel(source)} (ID ${source.id}) sin cambios de archivo; ` +
        `no se ejecuta sync (${formatSourceLastSync(source)}).`
      );
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
