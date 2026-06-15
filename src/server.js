const express = require("express");
const path = require("path");
const cors = require("cors");

const dashboardRoutes = require("./routes/dashboard.routes");
const nikeRoutes = require("./routes/nike.routes");
const reportsRoutes = require("./routes/reports.routes");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/api/dashboard", dashboardRoutes);
app.use("/api/nike", nikeRoutes);
app.use("/api/reports", reportsRoutes);

app.listen(PORT, "0.0.0.0", () => {
  console.log("RMC LAN Reporter activo");
  console.log(`Local: http://localhost:${PORT}`);
});