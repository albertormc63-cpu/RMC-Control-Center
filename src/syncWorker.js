require("dotenv").config();

const { startSyncPoller, stopSyncPoller } = require("./services/syncPoller");

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`[sync-worker] Cerrando worker de polling (${signal}).`);
  stopSyncPoller();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("uncaughtException", error => {
  console.error("[sync-worker] Error no capturado:", error);
  stopSyncPoller();
  process.exit(1);
});

process.on("unhandledRejection", error => {
  console.error("[sync-worker] Promesa rechazada no manejada:", error);
  stopSyncPoller();
  process.exit(1);
});

console.log("[sync-worker] Proceso de polling iniciado.");

const timer = startSyncPoller();

if (!timer) {
  console.log("[sync-worker] Polling sin timers activos; worker finalizado.");
  process.exit(0);
}
