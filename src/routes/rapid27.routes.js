const express = require("express");
const db = require("../db");
const {
  getAvailability,
  getSummary,
  getShipments,
  getShipmentDetail,
  getOrders,
  getOrderDetail
} = require("../services/rapid27Tracking");

const router = express.Router();

function sendError(res, error, label) {
  res.status(error.status || 500).json({
    error: label,
    message: error.message
  });
}

router.get("/availability", (req, res) => {
  res.json(getAvailability(db));
});

router.get("/summary", (req, res) => {
  try {
    res.json(getSummary(db));
  } catch (error) {
    sendError(res, error, "No se pudo leer el resumen 27/Rapid");
  }
});

router.get("/orders", (req, res) => {
  try {
    const orders = getOrders(db);
    res.json({ total: orders.length, orders });
  } catch (error) {
    sendError(res, error, "No se pudieron leer los pedidos 27/Rapid");
  }
});

router.get("/shipments", (req, res) => {
  try {
    const shipments = getShipments(db);
    res.json({ total: shipments.length, shipments });
  } catch (error) {
    sendError(res, error, "No se pudieron leer los embarques 27/Rapid");
  }
});

router.get("/shipments/:shipmentKey", (req, res) => {
  try {
    res.json(getShipmentDetail(db, req.params.shipmentKey));
  } catch (error) {
    sendError(res, error, "No se pudo leer el embarque 27/Rapid");
  }
});

router.get("/orders/:id", (req, res) => {
  try {
    res.json(getOrderDetail(db, req.params.id, {
      shipmentKey: req.query.shipment_key
    }));
  } catch (error) {
    sendError(res, error, "No se pudo leer el detalle 27/Rapid");
  }
});

module.exports = router;
