const { Faculty, Department } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { sequelize } = require("../models");

const getAllFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.findAll({
      attributes: [
        "id",
        "name",
        "code",
        "is_active",
        [
          sequelize.fn("COUNT", sequelize.col("Departments.id")),
          "departments_count",
        ],
      ],
      include: [
        {
          model: Department,
          attributes: [],
        },
      ],
      group: ["Faculty.id"],
    });

    return successResponse(res, "Daftar fakultas berhasil diambil", faculties);
  } catch (error) {
    console.error("Error fetching faculties:", error);
    return errorResponse(res, "Gagal mengambil daftar fakultas");
  }
};

const createFaculty = async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return errorResponse(res, "Nama dan kode fakultas harus diisi", 400);
    }

    if (code.length > 2) {
      return errorResponse(
        res,
        "Kode fakultas harus terdiri dari 2 karakter",
        400
      );
    }

    const existingFaculty = await Faculty.findOne({ where: { code } });
    if (existingFaculty) {
      return errorResponse(res, "Kode fakultas sudah digunakan", 400);
    }

    const newFaculty = await Faculty.create({ name, code });
    return successResponse(res, "Fakultas berhasil dibuat", newFaculty, 201);
  } catch (error) {
    console.error("Error creating faculty:", error);
    return errorResponse(res, "Gagal membuat fakultas");
  }
};

const editFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;

    if (!name || !code) {
      return errorResponse(res, "Nama dan kode fakultas harus diisi", 400);
    }

    if (code.length > 2) {
      return errorResponse(
        res,
        "Kode fakultas harus terdiri dari 2 karakter",
        400
      );
    }

    const faculty = await Faculty.findByPk(id);
    if (!faculty) {
      return errorResponse(res, "Fakultas tidak ditemukan", 404);
    }

    const existingFaculty = await Faculty.findOne({ where: { code } });
    if (existingFaculty) {
      return errorResponse(res, "Kode fakultas sudah digunakan", 400);
    }

    await faculty.update({ name, code });

    return successResponse(res, "Fakultas berhasil diperbarui", faculty);
  } catch (error) {
    console.error("Error editing faculty:", error);
    return errorResponse(res, "Gagal memperbarui fakultas");
  }
};

const activateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findByPk(id);

    if (!faculty) {
      return errorResponse(res, "Fakultas tidak ditemukan", 404);
    }

    faculty.is_active = true;
    await faculty.save();
    return successResponse(res, "Fakultas berhasil diaktifkan", faculty);
  } catch (error) {
    console.error("Error activating faculty:", error);
    return errorResponse(res, "Gagal mengaktifkan fakultas");
  }
};

const deactivateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findByPk(id);

    if (!faculty) {
      return errorResponse(res, "Fakultas tidak ditemukan", 404);
    }
    faculty.is_active = false;
    await faculty.save();
    return successResponse(res, "Fakultas berhasil dinonaktifkan", faculty);
  } catch (error) {
    console.error("Error deactivating faculty:", error);
    return errorResponse(res, "Gagal menonaktifkan fakultas");
  }
};

module.exports = {
  getAllFaculties,
  createFaculty,
  editFaculty,
  activateFaculty,
  deactivateFaculty,
};
