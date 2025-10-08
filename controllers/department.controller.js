const { Department, Faculty } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      attributes: ["id", "name", "code", "degree", "faculty_id", "is_active"],
      include: [
        {
          model: Faculty,
          as: "faculty",
          attributes: ["id", "name"],
        },
      ],
    });
    return successResponse(
      res,
      "Daftar Departemen berhasil diambil",
      departments
    );
  } catch (error) {
    console.error("Error fetching departments:", error);
    return errorResponse(res, error.message || "Failed to fetch departments");
  }
};

const createDepartment = async (req, res) => {
  try {
    const { name, code, faculty_id, degree } = req.body;
    if (!name || !code || !faculty_id || !degree) {
      return errorResponse(
        res,
        "Nama, kode, fakultas, dan jenjang Departemen harus diisi",
        400
      );
    }
    const faculty = await Faculty.findByPk(faculty_id);
    if (!faculty) {
      return errorResponse(res, "Fakultas tidak ditemukan", 404);
    }
    const existingDepartment = await Department.findOne({
      where: { code: code, faculty_id: faculty_id, degree: degree },
    });
    if (existingDepartment) {
      return errorResponse(
        res,
        "Departemen dengan kode, dan jenjang yang sama sudah ada di fakultas ini",
        409
      );
    }
    const newDepartment = await Department.create({
      name,
      code,
      faculty_id,
      degree,
    });
    return successResponse(res, "Departemen berhasil dibuat", newDepartment);
  } catch (error) {
    console.error("Error creating department:", error);
    return errorResponse(res, error.message || "Failed to create department");
  }
};

const editDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, faculty_id, degree } = req.body;
    if (!name || !code || !faculty_id || !degree) {
      return errorResponse(
        res,
        "Nama, kode, fakultas, dan jenjang Departemen harus diisi",
        400
      );
    }

    const department = await Department.findByPk(id);
    if (!department) {
      return errorResponse(res, "Departemen tidak ditemukan", 404);
    }

    const faculty = await Faculty.findByPk(faculty_id);
    if (!faculty) {
      return errorResponse(res, "Fakultas tidak ditemukan", 404);
    }

    const existingDepartment = await Department.findOne({
      where: {
        code: code,
        faculty_id: faculty_id,
        degree: degree,
      },
    });
    if (existingDepartment) {
      return errorResponse(
        res,
        "Departemen dengan nama, kode, dan jenjang yang sama sudah ada di fakultas ini",
        409
      );
    }

    await department.update({ name, code, faculty_id, degree });
    return successResponse(res, "Departemen berhasil diperbarui", department);
  } catch (error) {
    console.error("Error updating department:", error);
    return errorResponse(res, error.message || "Failed to update department");
  }
};

const activateDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findByPk(id);
    if (!department) {
      return errorResponse(res, "Departemen tidak ditemukan", 404);
    }
    await department.update({ is_active: true });
    return successResponse(res, "Departemen berhasil diaktifkan", department);
  } catch (error) {
    console.error("Error activating department:", error);
    return errorResponse(res, "Gagal mengaktifkan departemen");
  }
};

const deactivateDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await Department.findByPk(id);
    if (!department) {
      return errorResponse(res, "Departemen tidak ditemukan", 404);
    }
    await department.update({ is_active: false });
    return successResponse(
      res,
      "Departemen berhasil dinonaktifkan",
      department
    );
  } catch (error) {
    console.error("Error deactivating department:", error);
    return errorResponse(res, "Gagal menonaktifkan departemen");
  }
};

module.exports = {
  getAllDepartments,
  createDepartment,
  editDepartment,
  activateDepartment,
  deactivateDepartment,
};
