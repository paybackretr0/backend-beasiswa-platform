const { Application, ScholarshipSchema, Scholarship } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const getApplicationByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const applications = await Application.findAll({
      where: { student_id: userId },
      include: [
        {
          model: ScholarshipSchema,
          as: "schema",
          attributes: ["id", "name", "scholarship_id"],
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name", "organizer", "is_active"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const transformedApplications = applications.map((app) => ({
      id: app.id,
      beasiswa: app.schema?.scholarship?.name || "N/A",
      skema: app.schema?.name || "N/A",
      penyelenggara: app.schema?.scholarship?.organizer || "N/A",
      tanggalDaftar: app.submitted_at
        ? new Date(app.submitted_at).toISOString().split("T")[0]
        : app.createdAt
          ? new Date(app.createdAt).toISOString().split("T")[0]
          : null,
      status: app.status,
      notes: app.notes,
      verified_at: app.verified_at,
      validated_at: app.validated_at,
      rejected_at: app.rejected_at,
      revision_requested_at: app.revision_requested_at,
      revision_deadline: app.revision_deadline,
      scholarship_id: app.schema?.scholarship_id,
      schema_id: app.schema_id,
      student_id: app.student_id,
    }));

    return successResponse(
      res,
      "User applications retrieved successfully",
      transformedApplications,
    );
  } catch (error) {
    console.error("Error fetching user applications:", error);
    return errorResponse(res, "Failed to retrieve user applications", 500);
  }
};

module.exports = {
  getApplicationByUser,
};
