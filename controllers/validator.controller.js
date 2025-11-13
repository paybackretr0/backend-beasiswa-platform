const { Application, User, ActivityLog } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const validateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const validatorId = req.user.id;

    const application = await Application.findByPk(id, {
      include: [
        {
          model: User,
          as: "student",
          attributes: ["full_name", "email"],
        },
      ],
    });

    if (!application) {
      return errorResponse(res, "Application not found", 404);
    }

    if (
      application.status !== "MENUNGGU_VALIDASI" &&
      application.status !== "VERIFIED"
    ) {
      return errorResponse(
        res,
        "Application cannot be validated. Current status is not MENUNGGU_VALIDASI or VERIFIED",
        400
      );
    }

    await application.update({
      status: "VALIDATED",
      verified_by: validatorId,
      verified_at: new Date(),
      notes: notes || null,
    });

    await ActivityLog.create({
      user_id: validatorId,
      action: "VALIDATE_APPLICATION",
      description: `Memvalidasi pendaftaran ${application.student?.full_name}`,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
    });

    return successResponse(res, "Application validated successfully", {
      id: application.id,
      status: "VALIDATED",
      verified_at: application.verified_at,
      notes: application.notes,
    });
  } catch (error) {
    console.error("Error validating application:", error);
    return errorResponse(res, "Failed to validate application", 500);
  }
};

module.exports = {
  validateApplication,
};
