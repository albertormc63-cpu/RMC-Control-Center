require("dotenv").config();

const express = require("express");
const path = require("path");
const { fork } = require("child_process");
const cors = require("cors");

const dashboardRoutes = require("./routes/dashboard.routes");
const mockupRoutes = require("./routes/mockup.routes");
const nikeRoutes = require("./routes/nike.routes");
const reportsRoutes = require("./routes/reports.routes");
const filesRoutes = require("./routes/files.routes");
const syncRoutes = require("./routes/sync.routes");
const gitCommitsRoutes = require("./routes/gitCommits.routes");
const nikeCatalogRoutes = require("./routes/nikeCatalog.routes");
const { createAccessLogger } = require("./services/accessLogger");

const app = express();
const PORT = process.env.PORT || 3000;
const accessLogger = createAccessLogger();
let syncWorker = null;
let shuttingDown = false;

function isEnabled(value, fallback = true) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  return !["0", "false", "no", "off"].includes(String(value).trim().toLowerCase());
}

function startSyncWorker() {
  if (!isEnabled(process.env.RMC_SYNC_WORKER_ENABLED, true)) {
    console.log("[sync-worker] Worker automatico desactivado.");
    return null;
  }

  if (syncWorker) {
    return syncWorker;
  }

  const workerPath = path.join(__dirname, "syncWorker.js");

  syncWorker = fork(workerPath, [], {
    stdio: ["ignore", "inherit", "inherit", "ipc"],
    env: {
      ...process.env,
      RMC_SYNC_WORKER: "1"
    }
  });

  console.log(`[sync-worker] Worker de polling levantado (pid ${syncWorker.pid}).`);

  syncWorker.on("exit", (code, signal) => {
    const suffix = signal ? `signal ${signal}` : `code ${code}`;
    console.log(`[sync-worker] Worker de polling finalizo (${suffix}).`);
    syncWorker = null;
  });

  return syncWorker;
}

function stopSyncWorker() {
  if (!syncWorker || syncWorker.killed) {
    return;
  }

  syncWorker.kill("SIGTERM");
}

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  stopSyncWorker();
  process.exit(signal === "SIGINT" ? 0 : 0);
}

// Middlewares base: JSON para APIs, CORS para LAN y archivos estaticos del frontend.
app.use(accessLogger);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/assets", express.static(path.join(__dirname, "..", "assets")));

// Healthcheck rapido para saber si el server esta vivo sin tocar la BD.
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "RMC Control Center" });
});

// Agrupacion de APIs por modulo/herramienta.
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/nike/catalog", nikeCatalogRoutes);
app.use("/api/mockup", mockupRoutes);
app.use("/api/nike", nikeRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/git-commits", gitCommitsRoutes);

// Manejador final para errores no capturados por rutas especificas.
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    error: error.status ? error.message : "Error interno del servidor",
    message: error.message
  });
});

// Escucha en 0.0.0.0 para que el Control Center sea visible en LAN.
app.listen(PORT, "0.0.0.0", () => {
  const lanHost = process.env.RMC_LAN_HOST || "IP-DE-LA-MAC";
  console.log("RMC LAN Reporter activo");
  console.log(`Local: http://localhost:${PORT}`);
  console.log(`LAN: http://${lanHost}:${PORT}`);
  if (accessLogger.enabled) {
    console.log(`[access-log] Guardando accesos en ${accessLogger.logPath}`);
  } else {
    console.log("[access-log] Registro de accesos desactivado.");
  }
  startSyncWorker();
});

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("exit", stopSyncWorker);
