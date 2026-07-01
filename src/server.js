require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

const dashboardRoutes = require("./routes/dashboard.routes");
const mockupRoutes = require("./routes/mockup.routes");
const nikeRoutes = require("./routes/nike.routes");
const reportsRoutes = require("./routes/reports.routes");
const filesRoutes = require("./routes/files.routes");
const syncRoutes = require("./routes/sync.routes");
const gitCommitsRoutes = require("./routes/gitCommits.routes");
const { startSyncPoller } = require("./services/syncPoller");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares base: JSON para APIs, CORS para LAN y archivos estaticos del frontend.
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
  startSyncPoller();
});
