const { Faculty } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const getAllFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.findAll({
      attributes: ["id", "name", "code"], // Ambil hanya atribut yang diperlukan
      where: { is_active: true }, // Hanya fakultas yang aktif
    });
    return successResponse(res, "Daftar fakultas berhasil diambil", faculties);
  } catch (error) {
    console.error("Error fetching faculties:", error);
    return errorResponse(res, "Gagal mengambil daftar fakultas");
  }
};

module.exports = {
  getAllFaculties,
};
