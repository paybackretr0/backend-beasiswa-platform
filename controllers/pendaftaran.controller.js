const { Application, Scholarship, User } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { status: { [Op.ne]: "DRAFT" } },
      include: [
        {
          model: Scholarship,
          as: "scholarship",
          attributes: ["id", "name", "is_active"],
        },
        {
          model: User,
          as: "student",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    const transformedApplications = applications.map((app) => ({
      id: app.id,
      nama: app.student?.name || "N/A",
      email: app.student?.email || "N/A",
      beasiswa: app.scholarship?.name || "N/A",
      tanggalDaftar: app.submitted_at
        ? new Date(app.submitted_at).toISOString().split("T")[0]
        : null,
      status: app.status,
      notes: app.notes,
      verified_at: app.verified_at,
      scholarship_id: app.scholarship_id,
      student_id: app.student_id,
    }));

    return successResponse(
      res,
      "Applications retrieved successfully",
      transformedApplications
    );
  } catch (error) {
    console.error("Error fetching applications:", error);
    return errorResponse(res, "Failed to retrieve applications", 500);
  }
};

const getApplicationsSummary = async (req, res) => {
  try {
    const totalApplications = await Application.count({
      where: { status: { [Op.ne]: "DRAFT" } },
    });

    const menungguVerifikasi = await Application.count({
      where: { status: "MENUNGGU_VERIFIKASI" },
    });

    const menungguValidasi = await Application.count({
      where: { status: "MENUNGGU_VALIDASI" },
    });

    const dikembalikan = await Application.count({
      where: { status: "REJECTED" },
    });

    const disetujui = await Application.count({
      where: { status: "VALIDATED" },
    });

    const summary = {
      total: totalApplications,
      menunggu_verifikasi: menungguVerifikasi,
      menunggu_validasi: menungguValidasi,
      dikembalikan: dikembalikan,
      disetujui: disetujui,
    };

    return successResponse(
      res,
      "Applications summary retrieved successfully",
      summary
    );
  } catch (error) {
    console.error("Error fetching applications summary:", error);
    return errorResponse(res, "Failed to retrieve applications summary", 500);
  }
};

module.exports = {
  getAllApplications,
  getApplicationsSummary,
};
