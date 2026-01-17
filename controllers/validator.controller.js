const {
  Application,
  User,
  ActivityLog,
  ScholarshipSchema,
  Scholarship,
  ApplicationComment,
  ApplicationCommentTemplate,
} = require("../models");
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
        {
          model: ScholarshipSchema,
          as: "schema",
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name"],
            },
          ],
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

    if (notes && notes.trim() !== "") {
      await ApplicationComment.create({
        application_id: application.id,
        comment_text: notes,
        comment_type: "VALIDATION",
        template_id: null,
        commented_by: validatorId,
        is_visible_to_student: true,
      });
    }

    await ActivityLog.create({
      user_id: validatorId,
      action: "VALIDATE_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `Memvalidasi pendaftaran ${application.student?.full_name} untuk beasiswa ${application.schema?.scholarship?.name}`,
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
    const { notes, template_ids } = req.body;
    const validatorId = req.user.id;

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
          attributes: ["full_name", "email"],
        },
        {
          model: ScholarshipSchema,
          as: "schema",
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name"],
            },
          ],
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
          commented_by: validatorId,
          is_visible_to_student: true,
        });
        createdComments.push(comment);
      }
    }

    if (notes && notes.trim() !== "") {
      const customComment = await ApplicationComment.create({
        application_id: application.id,
        comment_text: notes,
        comment_type: "REJECTION",
        template_id: null,
        commented_by: validatorId,
        is_visible_to_student: true,
      });
      createdComments.push(customComment);
    }

    await application.update({
      status: "REJECTED",
      rejected_by: validatorId,
      rejected_at: new Date(),
    });

    await ActivityLog.create({
      user_id: validatorId,
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
    const validatorId = req.user.id;

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
          attributes: ["full_name", "email"],
        },
        {
          model: ScholarshipSchema,
          as: "schema",
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });

    if (!application) {
      return errorResponse(res, "Application not found", 404);
    }

    if (application.status !== "VERIFIED") {
      return errorResponse(
        res,
        "Application cannot be sent for revision. Current status is not VERIFIED",
        400
      );
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
          commented_by: validatorId,
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
        commented_by: validatorId,
        is_visible_to_student: true,
      });
      createdComments.push(customComment);
    }

    const currentStatus = application.status;

    await application.update({
      status: "REVISION_NEEDED",
      status_before_revision: currentStatus,
      revision_requested_by: validatorId,
      revision_requested_at: new Date(),
    });

    await ActivityLog.create({
      user_id: validatorId,
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
  validateApplication,
  rejectApplication,
  requestRevision,
};
