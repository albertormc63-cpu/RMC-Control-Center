const express = require("express");
const db = require("../db");
const {
  MAX_MESSAGE_LENGTH,
  createMessage,
  ensureChatSchema,
  getClientIp,
  listMessages
} = require("../services/chatMessages");

const router = express.Router();

ensureChatSchema(db);

router.get("/messages", (req, res) => {
  try {
    const viewerIp = getClientIp(req);
    const messages = listMessages(db, {
      afterId: req.query.after,
      limit: req.query.limit
    });

    res.json({
      channel: "general",
      viewer_ip: viewerIp,
      max_message_length: MAX_MESSAGE_LENGTH,
      messages
    });
  } catch (error) {
    res.status(500).json({
      error: "No se pudo cargar el chat grupal",
      message: error.message
    });
  }
});

router.post("/messages", (req, res) => {
  try {
    const viewerIp = getClientIp(req);
    const message = createMessage(db, {
      clientIp: viewerIp,
      message: req.body?.message
    });

    res.status(201).json({
      channel: "general",
      viewer_ip: viewerIp,
      message
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : "No se pudo enviar el mensaje",
      message: error.message
    });
  }
});

module.exports = router;
