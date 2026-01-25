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
const {
  invalidateInformationCache,
} = require("../middlewares/cache.middleware");

router.get("/informations/latest", getLatestInformation);
router.get("/informations", getAllInformations);
router.get("/informations/:slug", getInformationBySlug);

router.use(authenticate, verifiedUser, authorize("SUPERADMIN"));
router.get("/news", getAllNews);
router.get("/articles", getAllArticles);

router.post(
  "/news",
  invalidateInformationCache,
  ...newsUpload.single("file"),
  (req, res, next) => {
    req.body.type = "NEWS";
    next();
  },
  createInformation,
);

router.post(
  "/articles",
  invalidateInformationCache,
  ...articleUpload.single("file"),
  (req, res, next) => {
    req.body.type = "ARTICLE";
    next();
  },
  createInformation,
);

router.post(
  "/",
  invalidateInformationCache,
  ...newsUpload.single("file"),
  createInformation,
);

router.put(
  "/:id",
  invalidateInformationCache,
  ...newsUpload.single("file"),
  editInformation,
);
router.delete("/:id", invalidateInformationCache, deleteInformation);

router.put("/:id/publish", invalidateInformationCache, publishInformation);
router.put("/:id/archive", invalidateInformationCache, archiveInformation);

module.exports = router;
