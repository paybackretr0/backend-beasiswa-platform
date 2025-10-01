const router = require("express").Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const facultyRoutes = require("./faculty.routes");
const departmentRoutes = require("./department.routes");
const websiteRoutes = require("./website.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/faculties", facultyRoutes);
router.use("/departments", departmentRoutes);
router.use("/websites", websiteRoutes);

module.exports = router;
