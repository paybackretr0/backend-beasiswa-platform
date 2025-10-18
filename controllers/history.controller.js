const { Application, Scholarship } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const getApplicationByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.findAll({
      where: { student_id: userId },
      include: [
        {
          model: Scholarship,
          as: "scholarship",
          attributes: ["id", "name", "organizer", "is_active"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    const transformedApplications = applications.map((app) => ({
      id: app.id,
      beasiswa: app.scholarship?.name || "N/A",
      penyelenggara: app.scholarship?.organizer || "N/A",
      tanggalDaftar: app.submitted_at
        ? new Date(app.submitted_at).toISOString().split("T")[0]
        : null,
      status: app.status,
      notes: app.notes,
      verified_at: app.verified_at,
      scholarship_id: app.scholarship_id,
    }));

    return successResponse(
      res,
      "User applications retrieved successfully",
      transformedApplications
    );
  } catch (error) {
    console.error("Error fetching user applications:", error);
    return errorResponse(res, "Failed to retrieve user applications", 500);
  }
};

module.exports = {
  getApplicationByUser,
};
