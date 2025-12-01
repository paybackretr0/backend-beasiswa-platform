const { Department, ActivityLog, StudyProgram, Faculty } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const getAllStudyPrograms = async (req, res) => {
  try {
    const studyPrograms = await StudyProgram.findAll({
      attributes: ["id", "code", "degree", "department_id", "is_active"],
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
          include: [
            {
              model: Faculty,
              as: "faculty",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [
        ["degree", "ASC"],
        ["code", "ASC"],
      ],
    });

    return successResponse(
      res,
      "Daftar Program Studi berhasil diambil",
      studyPrograms
    );
  } catch (error) {
    console.error("Error fetching study programs:", error);
    return errorResponse(
      res,
      error.message || "Failed to fetch study programs"
    );
  }
};

const createStudyProgram = async (req, res) => {
  try {
    const { code, degree, department_id } = req.body;

    if (!code || !degree || !department_id) {
      return errorResponse(
        res,
        "Kode, jenjang, dan departemen Program Studi harus diisi",
        400
      );
    }

    const department = await Department.findByPk(department_id);
    if (!department) {
      return errorResponse(res, "Departemen tidak ditemukan", 404);
    }

    const existingStudyProgram = await StudyProgram.findOne({
      where: {
        code: code,
        department_id: department_id,
      },
    });

    if (existingStudyProgram) {
      return errorResponse(
        res,
        "Program Studi dengan kode yang sama sudah ada di departemen ini",
        409
      );
    }

    const newStudyProgram = await StudyProgram.create({
      code,
      degree,
      department_id,
    });

    const studyProgramWithDepartment = await StudyProgram.findByPk(
      newStudyProgram.id,
      {
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "name"],
          },
        ],
      }
    );

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_STUDY_PROGRAM",
      entity_type: "StudyProgram",
      entity_id: newStudyProgram.id,
      description: `Program Studi ${newStudyProgram.degree} ${department.name} dengan kode ${code} telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Program Studi berhasil dibuat",
      studyProgramWithDepartment
    );
  } catch (error) {
    console.error("Error creating study program:", error);
    return errorResponse(
      res,
      error.message || "Failed to create study program"
    );
  }
};

const editStudyProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, degree, department_id } = req.body;

    if (!code || !degree || !department_id) {
      return errorResponse(
        res,
        "Kode, jenjang, dan departemen Program Studi harus diisi",
        400
      );
    }

    const studyProgram = await StudyProgram.findByPk(id);
    if (!studyProgram) {
      return errorResponse(res, "Program Studi tidak ditemukan", 404);
    }

    const department = await Department.findByPk(department_id);
    if (!department) {
      return errorResponse(res, "Departemen tidak ditemukan", 404);
    }

    const existingStudyProgram = await StudyProgram.findOne({
      where: {
        code: code,
        department_id: department_id,
        id: { [require("sequelize").Op.ne]: id },
      },
    });

    if (existingStudyProgram) {
      return errorResponse(
        res,
        "Program Studi dengan kode yang sama sudah ada di departemen ini",
        409
      );
    }

    await studyProgram.update({ code, degree, department_id });

    const updatedStudyProgram = await StudyProgram.findByPk(id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "name"],
        },
      ],
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "EDIT_STUDY_PROGRAM",
      entity_type: "StudyProgram",
      entity_id: studyProgram.id,
      description: `Program Studi ${degree} ${department.name} dengan kode ${code} telah diperbarui oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Program Studi berhasil diperbarui",
      updatedStudyProgram
    );
  } catch (error) {
    console.error("Error updating study program:", error);
    return errorResponse(
      res,
      error.message || "Failed to update study program"
    );
  }
};

const activateStudyProgram = async (req, res) => {
  const { id } = req.params;
  try {
    const studyProgram = await StudyProgram.findByPk(id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
      ],
    });

    if (!studyProgram) {
      return errorResponse(res, "Program Studi tidak ditemukan", 404);
    }

    await studyProgram.update({ is_active: true });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "ACTIVATE_STUDY_PROGRAM",
      entity_type: "StudyProgram",
      entity_id: studyProgram.id,
      description: `Program Studi ${studyProgram.degree} ${
        studyProgram.department?.name || "Unknown"
      } telah diaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Program Studi berhasil diaktifkan",
      studyProgram
    );
  } catch (error) {
    console.error("Error activating study program:", error);
    return errorResponse(res, "Gagal mengaktifkan program studi");
  }
};

const deactivateStudyProgram = async (req, res) => {
  const { id } = req.params;
  try {
    const studyProgram = await StudyProgram.findByPk(id, {
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["name"],
        },
      ],
    });

    if (!studyProgram) {
      return errorResponse(res, "Program Studi tidak ditemukan", 404);
    }

    await studyProgram.update({ is_active: false });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "DEACTIVATE_STUDY_PROGRAM",
      entity_type: "StudyProgram",
      entity_id: studyProgram.id,
      description: `Program Studi ${studyProgram.degree} ${
        studyProgram.department?.name || "Unknown"
      } telah dinonaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Program Studi berhasil dinonaktifkan",
      studyProgram
    );
  } catch (error) {
    console.error("Error deactivating study program:", error);
    return errorResponse(res, "Gagal menonaktifkan program studi");
  }
};

module.exports = {
  getAllStudyPrograms,
  createStudyProgram,
  editStudyProgram,
  activateStudyProgram,
  deactivateStudyProgram,
};
