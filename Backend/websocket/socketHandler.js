const logger = require("../utils/logger");

const setupSocket = (io) => {
  io.on("connection", (socket) => {
    logger.info("New client connected", { socketId: socket.id });

    // Optional: you can join rooms per disaster, report type, etc.
    socket.on("join_room", (roomId) => {
      socket.join(roomId);
      logger.info(`Socket ${socket.id} joined room: ${roomId}`);
    });

    // Optional: allow sending test messages to clients
    socket.on("test_message", (msg) => {
      logger.info(`Received test message from ${socket.id}: ${msg}`);
      socket.emit("test_response", `Server received: ${msg}`);
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected", { socketId: socket.id });
    });
  });

  // Optionally expose emitters for disaster/report/resource updates
  io.emitDisasterUpdate = (action, data) => {
    io.emit("disaster_updated", { action, data });
    logger.info("Disaster update emitted", { action });
  };

  io.emitResourceUpdate = (action, data) => {
    io.emit("resources_updated", { action, data });
    logger.info("Resource update emitted", { action });
  };

  io.emitReportUpdate = (action, data) => {
    io.emit("reports_updated", { action, data });
    logger.info("Report update emitted", { action });
  };
};

module.exports = setupSocket;
