const router = require("express").Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const facultyRoutes = require("./faculty.routes");
const departmentRoutes = require("./department.routes");
const websiteRoutes = require("./website.routes");
const additionalRoutes = require("./additional.routes");
const beasiswaRoutes = require("./beasiswa.routes");
const pendaftaranRoutes = require("./pendaftaran.routes");
const reportRoutes = require("./report.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/faculties", facultyRoutes);
router.use("/departments", departmentRoutes);
router.use("/websites", websiteRoutes);
router.use("/additional", additionalRoutes);
router.use("/beasiswa", beasiswaRoutes);
router.use("/pendaftaran", pendaftaranRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
