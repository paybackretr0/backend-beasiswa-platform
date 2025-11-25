const { Application, User, ActivityLog } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const verifyApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const verifikatorId = req.user.id;

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

    if (application.status !== "MENUNGGU_VERIFIKASI") {
      return errorResponse(
        res,
        "Application cannot be verified. Current status is not MENUNGGU_VERIFIKASI",
        400
      );
    }

    await application.update({
      status: "VERIFIED",
      verified_by: verifikatorId,
      verified_at: new Date(),
    });

    await ActivityLog.create({
      user_id: verifikatorId,
      action: "VERIFY_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `Memverifikasi pendaftaran ${application.student?.full_name}`,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
    });

    return successResponse(res, "Application verified successfully", {
      id: application.id,
      status: "VERIFIED",
      verified_at: application.verified_at,
    });
  } catch (error) {
    console.error("Error verifying application:", error);
    return errorResponse(res, "Failed to verify application", 500);
  }
};

const rejectApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const verifikatorId = req.user.id;

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

    if (application.status !== "MENUNGGU_VERIFIKASI") {
      return errorResponse(
        res,
        "Application cannot be rejected. Current status is not MENUNGGU_VERIFIKASI",
        400
      );
    }

    await application.update({
      status: "REJECTED",
      rejected_by: verifikatorId,
      rejected_at: new Date(),
      notes: notes,
    });

    await ActivityLog.create({
      user_id: verifikatorId,
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
  verifyApplication,
  rejectApplication,
};
