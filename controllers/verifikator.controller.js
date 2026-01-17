const {
  Application,
  User,
  Scholarship,
  ScholarshipSchema,
  ActivityLog,
  ApplicationComment,
  ApplicationCommentTemplate,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const verifyApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const verifikatorId = req.user.id;
    const verifikatorRole = req.user.role;

    const application = await Application.findByPk(id, {
      include: [
        {
          model: User,
          as: "student",
          attributes: ["full_name", "email", "faculty_id"],
        },
        {
          model: ScholarshipSchema,
          as: "schema",
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name", "verification_level"],
            },
          ],
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

    const verificationLevel =
      application.schema?.scholarship?.verification_level;

    if (!verificationLevel) {
      return errorResponse(
        res,
        "Verification level not found for this scholarship",
        400
      );
    }

    if (verificationLevel === "FACULTY") {
      if (verifikatorRole !== "VERIFIKATOR_FAKULTAS") {
        return errorResponse(
          res,
          "Anda tidak memiliki akses untuk memverifikasi pendaftaran ini. Hanya Verifikator Fakultas yang dapat memverifikasi beasiswa level fakultas.",
          403
        );
      }

      if (application.student.faculty_id !== req.user.faculty_id) {
        return errorResponse(
          res,
          "Anda hanya dapat memverifikasi pendaftaran dari fakultas Anda sendiri.",
          403
        );
      }
    } else if (verificationLevel === "DITMAWA") {
      if (verifikatorRole !== "VERIFIKATOR_DITMAWA") {
        return errorResponse(
          res,
          "Anda tidak memiliki akses untuk memverifikasi pendaftaran ini. Hanya Verifikator Ditmawa yang dapat memverifikasi beasiswa level ditmawa.",
          403
        );
      }
    }

    // ✅ Update application (remove notes field)
    await application.update({
      status: "VERIFIED",
      verified_by: verifikatorId,
      verified_at: new Date(),
    });

    // ✅ ADD: Create comment if notes provided
    if (notes && notes.trim() !== "") {
      await ApplicationComment.create({
        application_id: application.id,
        comment_text: notes,
        comment_type: "VERIFICATION",
        template_id: null,
        commented_by: verifikatorId,
        is_visible_to_student: true,
      });
    }

    await ActivityLog.create({
      user_id: verifikatorId,
      action: "VERIFY_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `Memverifikasi pendaftaran ${application.student?.full_name} untuk beasiswa ${application.schema?.scholarship?.name}`,
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
    const { notes, template_ids } = req.body;
    const verifikatorId = req.user.id;
    const verifikatorRole = req.user.role;

    // ✅ Validate: either notes or template_ids must be provided
    if (
      (!notes || notes.trim() === "") &&
      (!template_ids || template_ids.length === 0)
    ) {
      return errorResponse(
        res,
        "Alasan penolakan atau template harus diisi",
        400
      );
    }

    const application = await Application.findByPk(id, {
      include: [
        {
          model: User,
          as: "student",
          attributes: ["full_name", "email", "faculty_id"],
        },
        {
          model: ScholarshipSchema,
          as: "schema",
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name", "verification_level"],
            },
          ],
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

    const verificationLevel =
      application.schema?.scholarship?.verification_level;

    if (!verificationLevel) {
      return errorResponse(
        res,
        "Verification level not found for this scholarship",
        400
      );
    }

    if (verificationLevel === "FACULTY") {
      if (verifikatorRole !== "VERIFIKATOR_FAKULTAS") {
        return errorResponse(
          res,
          "Anda tidak memiliki akses untuk menolak pendaftaran ini. Hanya Verifikator Fakultas yang dapat menolak beasiswa level fakultas.",
          403
        );
      }

      if (application.student.faculty_id !== req.user.faculty_id) {
        return errorResponse(
          res,
          "Anda hanya dapat menolak pendaftaran dari fakultas Anda sendiri.",
          403
        );
      }
    } else if (verificationLevel === "DITMAWA") {
      if (verifikatorRole !== "VERIFIKATOR_DITMAWA") {
        return errorResponse(
          res,
          "Anda tidak memiliki akses untuk menolak pendaftaran ini. Hanya Verifikator Ditmawa yang dapat menolak beasiswa level ditmawa.",
          403
        );
      }
    }

    // ✅ Create comments from templates
    const createdComments = [];
    if (template_ids && template_ids.length > 0) {
      const templates = await ApplicationCommentTemplate.findAll({
        where: {
          id: template_ids,
          is_active: true,
        },
      });

      for (const template of templates) {
        const comment = await ApplicationComment.create({
          application_id: application.id,
          comment_text: template.comment_text,
          comment_type: "REJECTION",
          template_id: template.id,
          commented_by: verifikatorId,
          is_visible_to_student: true,
        });
        createdComments.push(comment);
      }
    }

    // ✅ Create custom comment if notes provided
    if (notes && notes.trim() !== "") {
      const customComment = await ApplicationComment.create({
        application_id: application.id,
        comment_text: notes,
        comment_type: "REJECTION",
        template_id: null,
        commented_by: verifikatorId,
        is_visible_to_student: true,
      });
      createdComments.push(customComment);
    }

    // ✅ Update application (NO notes field)
    await application.update({
      status: "REJECTED",
      rejected_by: verifikatorId,
      rejected_at: new Date(),
    });

    await ActivityLog.create({
      user_id: verifikatorId,
      action: "REJECT_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `Menolak pendaftaran ${application.student?.full_name} untuk beasiswa ${application.schema?.scholarship?.name} dengan ${createdComments.length} komentar`,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
    });

    return successResponse(res, "Application rejected successfully", {
      id: application.id,
      status: "REJECTED",
      rejected_at: application.rejected_at,
      comments_count: createdComments.length,
    });
  } catch (error) {
    console.error("Error rejecting application:", error);
    return errorResponse(res, "Failed to reject application", 500);
  }
};

const requestRevision = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, template_ids } = req.body;
    const verifikatorId = req.user.id;
    const verifikatorRole = req.user.role;

    if (
      (!notes || notes.trim() === "") &&
      (!template_ids || template_ids.length === 0)
    ) {
      return errorResponse(
        res,
        "Catatan revisi atau template harus diisi",
        400
      );
    }

    const application = await Application.findByPk(id, {
      include: [
        {
          model: User,
          as: "student",
          attributes: ["full_name", "email", "faculty_id"],
        },
        {
          model: ScholarshipSchema,
          as: "schema",
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name", "verification_level"],
            },
          ],
        },
      ],
    });

    if (!application) {
      return errorResponse(res, "Application not found", 404);
    }

    if (application.status !== "MENUNGGU_VERIFIKASI") {
      return errorResponse(
        res,
        "Application cannot be sent for revision. Current status is not MENUNGGU_VERIFIKASI",
        400
      );
    }

    const verificationLevel =
      application.schema?.scholarship?.verification_level;

    if (!verificationLevel) {
      return errorResponse(
        res,
        "Verification level not found for this scholarship",
        400
      );
    }

    if (verificationLevel === "FACULTY") {
      if (verifikatorRole !== "VERIFIKATOR_FAKULTAS") {
        return errorResponse(
          res,
          "Anda tidak memiliki akses untuk meminta revisi pendaftaran ini. Hanya Verifikator Fakultas yang dapat meminta revisi beasiswa level fakultas.",
          403
        );
      }

      if (application.student.faculty_id !== req.user.faculty_id) {
        return errorResponse(
          res,
          "Anda hanya dapat meminta revisi pendaftaran dari fakultas Anda sendiri.",
          403
        );
      }
    } else if (verificationLevel === "DITMAWA") {
      if (verifikatorRole !== "VERIFIKATOR_DITMAWA") {
        return errorResponse(
          res,
          "Anda tidak memiliki akses untuk meminta revisi pendaftaran ini.",
          403
        );
      }
    }

    const createdComments = [];
    if (template_ids && template_ids.length > 0) {
      const templates = await ApplicationCommentTemplate.findAll({
        where: {
          id: template_ids,
          is_active: true,
        },
      });

      for (const template of templates) {
        const comment = await ApplicationComment.create({
          application_id: application.id,
          comment_text: template.comment_text,
          comment_type: "REVISION",
          template_id: template.id,
          commented_by: verifikatorId,
          is_visible_to_student: true,
        });
        createdComments.push(comment);
      }
    }

    if (notes && notes.trim() !== "") {
      const customComment = await ApplicationComment.create({
        application_id: application.id,
        comment_text: notes,
        comment_type: "REVISION",
        template_id: null,
        commented_by: verifikatorId,
        is_visible_to_student: true,
      });
      createdComments.push(customComment);
    }

    const currentStatus = application.status;

    await application.update({
      status: "REVISION_NEEDED",
      status_before_revision: currentStatus,
      revision_requested_by: verifikatorId,
      revision_requested_at: new Date(),
    });

    await ActivityLog.create({
      user_id: verifikatorId,
      action: "REQUEST_REVISION",
      entity_type: "Application",
      entity_id: application.id,
      description: `Meminta revisi pendaftaran ${application.student?.full_name} untuk beasiswa ${application.schema?.scholarship?.name} dengan ${createdComments.length} komentar`,
      ip_address: req.ip,
      user_agent: req.get("User-Agent"),
    });

    return successResponse(res, "Revision requested successfully", {
      id: application.id,
      status: "REVISION_NEEDED",
      revision_requested_at: application.revision_requested_at,
      comments_count: createdComments.length,
    });
  } catch (error) {
    console.error("Error requesting revision:", error);
    return errorResponse(res, "Failed to request revision", 500);
  }
};

module.exports = {
  verifyApplication,
  rejectApplication,
  requestRevision,
};
