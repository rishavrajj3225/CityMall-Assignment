require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const http = require("http");
const socketIo = require("socket.io");
const rateLimit = require("express-rate-limit");

const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const setupSocket = require("./websocket/socketHandler");

// Route imports
const disasterRoutes = require("./routes/disasters");
const reportRoutes = require("./routes/reports");
const resourceRoutes = require("./routes/resources");
const geocodingRoutes = require("./routes/geocoding");
const verificationRoutes = require("./routes/verification");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Socket.IO setup
setupSocket(io);
app.set("socketio", io);

// Routes
app.use("/api/disasters", disasterRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/resources", resourceRoutes);
app.use("/api/geocoding", geocodingRoutes);
app.use("/api/verification", verificationRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Mock social media endpoint
app.get("/api/mock-social-media", (req, res) => {
  const mockData = [
    {
      post: "#floodrelief Need food in NYC",
      user: "citizen1",
      timestamp: new Date().toISOString(),
    },
    {
      post: "Shelter available at Central Park #disasterhelp",
      user: "volunteer2",
      timestamp: new Date().toISOString(),
    },
    {
      post: "Medical supplies needed in Brooklyn #emergency",
      user: "medic3",
      timestamp: new Date().toISOString(),
    },
  ];
  res.json(mockData);
});

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

module.exports = app;
