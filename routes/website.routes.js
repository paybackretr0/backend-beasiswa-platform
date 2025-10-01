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
} = require("../controllers/website.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  newsUpload,
  articleUpload,
} = require("../middlewares/upload.middleware");

router.use(authenticate);
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
