const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");
const {
  getAllFaculties,
  createFaculty,
  editFaculty,
  activateFaculty,
  deactivateFaculty,
} = require("../controllers/faculty.controller");

router.use(authenticate);
router.get("/", getAllFaculties);
router.post("/", createFaculty);
router.put("/:id", editFaculty);
router.put("/:id/activate", activateFaculty);
router.delete("/:id", deactivateFaculty);

module.exports = router;
