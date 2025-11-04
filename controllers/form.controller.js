const { FormField, ActivityLog, Scholarship } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const checkScholarshipForm = async (req, res) => {
  try {
    const { scholarshipId } = req.params;

    const formExists = await FormField.count({
      where: { scholarship_id: scholarshipId },
    });

    const hasForm = formExists > 0;

    return successResponse(res, "Form status retrieved successfully", {
      hasForm,
    });
  } catch (error) {
    console.error("Error checking scholarship form:", error);
    return errorResponse(res, "Failed to check scholarship form", 500);
  }
};

const createScholarshipForm = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const { fields } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return errorResponse(res, "Fields tidak valid", 400);
    }

    await FormField.destroy({ where: { scholarship_id: scholarshipId } });

    const formFields = fields.map((field, index) => ({
      scholarship_id: scholarshipId,
      label: field.label,
      type: field.type,
      is_required: field.is_required,
      options_json: field.type === "SELECT" ? field.options : null,
      order_no: index + 1,
    }));

    await FormField.bulkCreate(formFields);

    const scholarship = await Scholarship.findByPk(scholarshipId);

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_FORM",
      entity_type: "Form_Field",
      entity_id: scholarshipId,
      description: `Form untuk beasiswa "${scholarship.name}" telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "Form berhasil dibuat", null);
  } catch (error) {
    console.error("Error creating scholarship form:", error);
    return errorResponse(res, "Gagal membuat form", 500);
  }
};

const getScholarshipForm = async (req, res) => {
  try {
    const { scholarshipId } = req.params;

    const formFields = await FormField.findAll({
      where: { scholarship_id: scholarshipId },
      order: [["order_no", "ASC"]],
      attributes: [
        "id",
        "label",
        "type",
        "is_required",
        "options_json",
        "order_no",
      ],
    });

    return successResponse(
      res,
      "Form fields retrieved successfully",
      formFields
    );
  } catch (error) {
    console.error("Error fetching scholarship form:", error);
    return errorResponse(res, "Failed to fetch scholarship form", 500);
  }
};

const updateScholarshipForm = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const { fields } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return errorResponse(res, "Fields tidak valid", 400);
    }

    await FormField.destroy({ where: { scholarship_id: scholarshipId } });

    const formFields = fields.map((field, index) => ({
      scholarship_id: scholarshipId,
      label: field.label,
      type: field.type,
      is_required: field.is_required,
      options_json: field.type === "SELECT" ? field.options : null,
      order_no: index + 1,
    }));

    await FormField.bulkCreate(formFields);

    const scholarship = await Scholarship.findByPk(scholarshipId);

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "UPDATE_FORM",
      entity_type: "Form_Field",
      entity_id: scholarshipId,
      description: `Form untuk beasiswa "${scholarship.name}" telah diubah oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "Form berhasil diupdate", null);
  } catch (error) {
    console.error("Error updating scholarship form:", error);
    return errorResponse(res, "Gagal mengupdate form", 500);
  }
};

module.exports = {
  checkScholarshipForm,
  createScholarshipForm,
  getScholarshipForm,
  updateScholarshipForm,
};
