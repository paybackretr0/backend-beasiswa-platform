const express = require("express");
const dotenv = require("dotenv");
const db = require("./models");

dotenv.config();
const app = express();
app.use(express.json());

// Test route
app.get("/", (req, res) => res.send("API Beasiswa berjalan"));

// Sync database
db.sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("DB Error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
