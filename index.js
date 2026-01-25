const express = require("express");
const dotenv = require("dotenv");
const db = require("./models");
const cors = require("cors");
const path = require("path");
const redis = require("./config/redis");

dotenv.config();
const app = express();

const routes = require("./routes");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", routes);

app.get("/", (req, res) => res.send("API Beasiswa berjalan"));

// app.get("/health", async (req, res) => {
//   try {
//     await db.sequelize.authenticate();

//     res.status(200).json({
//       success: true,
//       message: "Backend is healthy",
//       timestamp: new Date().toISOString(),
//       database: "connected",
//     });
//   } catch (error) {
//     res.status(503).json({
//       success: false,
//       message: "Backend unhealthy",
//       timestamp: new Date().toISOString(),
//       database: "disconnected",
//       error: error.message,
//     });
//   }
// });

// app.get("/redis-test", async (req, res) => {
//   try {
//     await redis.set("ping", "pong");
//     const value = await redis.get("ping");

//     res.json({
//       success: true,
//       redis: value,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

db.sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("DB Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
