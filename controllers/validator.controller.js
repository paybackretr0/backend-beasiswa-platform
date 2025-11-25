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

    if (application.status !== "VERIFIED") {
      return errorResponse(
        res,
        "Application cannot be validated. Current status is not VERIFIED",
        400
      );
    }

    await application.update({
      status: "VALIDATED",
      validated_by: validatorId,
      validated_at: new Date(),
    });

    await ActivityLog.create({
      user_id: validatorId,
      action: "VALIDATE_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `Memvalidasi pendaftaran ${application.student?.full_name}`,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
    });

    return successResponse(res, "Application validated successfully", {
      id: application.id,
      status: "VALIDATED",
      validated_at: application.validated_at,
    });
  } catch (error) {
    console.error("Error validating application:", error);
    return errorResponse(res, "Failed to validate application", 500);
  }
};

const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const validatorId = req.user.id;

    if (!notes || notes.trim() === "") {
      return errorResponse(res, "Alasan penolakan harus diisi", 400);
    }

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

    if (application.status !== "VERIFIED") {
      return errorResponse(
        res,
        "Application cannot be rejected. Current status is not VERIFIED",
        400
      );
    }

    await application.update({
      status: "REJECTED",
      rejected_by: validatorId,
      rejected_at: new Date(),
      notes: notes,
    });

    await ActivityLog.create({
      user_id: validatorId,
      action: "REJECT_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `Menolak pendaftaran ${application.student?.full_name}: ${notes}`,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
    });

    return successResponse(res, "Application rejected successfully", {
      id: application.id,
      status: "REJECTED",
      rejected_at: application.rejected_at,
      notes: application.notes,
    });
  } catch (error) {
    console.error("Error rejecting application:", error);
    return errorResponse(res, "Failed to reject application", 500);
  }
};

module.exports = {
  validateApplication,
  rejectApplication,
};
