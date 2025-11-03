const express = require("express");
const router = express.Router();
const {
  getAllNews,
  getAllArticles,
  createInformation,
  editInformation,
  deleteInformation,
  publishInformation,
  archiveInformation,
  getLatestInformation,
  getInformationBySlug,
  getAllInformations,
} = require("../controllers/website.controller");
const {
  authenticate,
  verifiedUser,
} = require("../middlewares/auth.middleware");
const {
  newsUpload,
  articleUpload,
} = require("../middlewares/upload.middleware");
const authorize = require("../middlewares/role.middleware");

router.get("/informations/latest", getLatestInformation);
router.get("/informations", getAllInformations);
router.get("/informations/:slug", getInformationBySlug);

router.use(authenticate, verifiedUser, authorize("SUPERADMIN"));
router.get("/news", getAllNews);
router.get("/articles", getAllArticles);

router.post(
  "/news",
  ...newsUpload.single("file"),
  (req, res, next) => {
    req.body.type = "NEWS";
    next();
  },
  createInformation
);

router.post(
  "/articles",
  ...articleUpload.single("file"),
  (req, res, next) => {
    req.body.type = "ARTICLE";
    next();
  },
  createInformation
);

router.post("/", ...newsUpload.single("file"), createInformation);

router.put("/:id", ...newsUpload.single("file"), editInformation);
router.delete("/:id", deleteInformation);

router.put("/:id/publish", publishInformation);
router.put("/:id/archive", archiveInformation);

module.exports = router;
