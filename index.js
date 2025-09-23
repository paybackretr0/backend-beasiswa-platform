const express = require("express");
const dotenv = require("dotenv");
const db = require("./models");
const cors = require("cors");
const path = require("path");

dotenv.config();
const app = express();

const routes = require("./routes");
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test route
app.use("/api", routes);

app.get("/", (req, res) => res.send("API Beasiswa berjalan"));

// Sync database
db.sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("DB Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
