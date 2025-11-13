const router = require("express").Router();

const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const facultyRoutes = require("./faculty.routes");
const departmentRoutes = require("./department.routes");
const websiteRoutes = require("./website.routes");
const additionalRoutes = require("./additional.routes");
const beasiswaRoutes = require("./beasiswa.routes");
const applicationRoutes = require("./application.routes");
const analyticsRoutes = require("./analytics.routes");
const formRoutes = require("./form.routes");
const pendaftaranRoutes = require("./pendaftaran.routes");
const historyRoutes = require("./history.routes");
const verifikatorRoutes = require("./verifikator.routes");
const validatorRoutes = require("./validator.routes");

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/faculties", facultyRoutes);
router.use("/departments", departmentRoutes);
router.use("/websites", websiteRoutes);
router.use("/additional", additionalRoutes);
router.use("/beasiswa", beasiswaRoutes);
router.use("/applications", applicationRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/forms", formRoutes);
router.use("/pendaftaran", pendaftaranRoutes);
router.use("/history", historyRoutes);
router.use("/verifikator", verifikatorRoutes);
router.use("/validator", validatorRoutes);

module.exports = router;
