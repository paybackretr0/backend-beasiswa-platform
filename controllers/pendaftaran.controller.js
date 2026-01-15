const {
  FormField,
  Scholarship,
  ScholarshipSchema,
  Application,
  FormAnswer,
  ApplicationDocument,
  ActivityLog,
  User,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");

// ✅ FIX: Get scholarship form by schema
const getScholarshipForm = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const { schemaId } = req.query;
    const userId = req.user.id;

    // Get scholarship with active schemas
    const scholarship = await Scholarship.findOne({
      where: { id: scholarshipId, is_active: true },
      attributes: [
        "id",
        "name",
        "organizer",
        "end_date",
        "is_active",
        "is_external",
        "website_url",
      ],
      include: [
        {
          model: ScholarshipSchema,
          as: "schemas",
          where: { is_active: true },
          required: false,
          attributes: [
            "id",
            "name",
            "description",
            "quota",
            "gpa_minimum",
            "semester_minimum",
          ],
        },
      ],
    });

    if (!scholarship) {
      return errorResponse(
        res,
        "Beasiswa tidak ditemukan atau tidak aktif",
        404
      );
    }

    if (scholarship.is_external) {
      return errorResponse(
        res,
        "Beasiswa ini merupakan beasiswa eksternal. Silakan mendaftar melalui website penyelenggara.",
        400,
        {
          is_external: true,
          external_url: scholarship.website_url,
          message: `Pendaftaran beasiswa ini dilakukan di website ${scholarship.organizer}. Klik link berikut: ${scholarship.website_url}`,
        }
      );
    }

    if (!scholarship.schemas || scholarship.schemas.length === 0) {
      return errorResponse(
        res,
        "Tidak ada skema aktif untuk beasiswa ini",
        404
      );
    }

    // ✅ Validate schema selection
    let selectedSchema;
    if (schemaId) {
      selectedSchema = scholarship.schemas.find((s) => s.id === schemaId);
      if (!selectedSchema) {
        return errorResponse(
          res,
          "Skema tidak ditemukan atau tidak aktif",
          404
        );
      }
    } else {
      selectedSchema = scholarship.schemas[0];
    }

    // ✅ Check registration deadline
    if (scholarship.end_date) {
      const today = new Date();
      const endDate = new Date(scholarship.end_date);
      if (today > endDate) {
        return errorResponse(
          res,
          "Batas waktu pendaftaran telah berakhir",
          400
        );
      }
    }

    // ✅ FIX: Check for existing application - REMOVE scholarship_id
    const existingApplication = await Application.findOne({
      where: {
        // ❌ REMOVED: scholarship_id: scholarshipId,
        schema_id: selectedSchema.id, // ✅ Only use schema_id
        student_id: userId,
      },
      include: [
        {
          model: FormAnswer,
          as: "formAnswers",
          include: [
            {
              model: FormField,
              as: "FormField",
              attributes: ["id", "type", "label"],
            },
          ],
        },
      ],
    });

    // ✅ Get form fields for selected schema
    const formFields = await FormField.findAll({
      where: { schema_id: selectedSchema.id },
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

    if (formFields.length === 0) {
      return errorResponse(
        res,
        "Form pendaftaran belum tersedia untuk skema ini. Silakan hubungi penyelenggara.",
        404
      );
    }

    // ✅ Transform form fields
    const transformedFields = formFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      is_required: field.is_required,
      options: field.options_json || [],
      order_no: field.order_no,
    }));

    // ✅ Get existing answers if any
    let existingAnswers = {};
    if (existingApplication && existingApplication.formAnswers) {
      existingApplication.formAnswers.forEach((answer) => {
        existingAnswers[answer.field_id] = {
          answer_text: answer.answer_text,
          file_path: answer.file_path,
          mime_type: answer.mime_type,
        };
      });
    }

    // ✅ Get user data for eligibility check
    const user = await User.findByPk(userId, {
      attributes: [
        "id",
        "nim",
        "faculty_id",
        "department_id",
        "study_program_id",
      ],
    });

    const responseData = {
      scholarship: {
        id: scholarship.id,
        name: scholarship.name,
        organizer: scholarship.organizer,
        end_date: scholarship.end_date,
      },
      selected_schema: {
        id: selectedSchema.id,
        name: selectedSchema.name,
        description: selectedSchema.description,
        quota: selectedSchema.quota,
        gpa_minimum: selectedSchema.gpa_minimum,
        semester_minimum: selectedSchema.semester_minimum,
      },
      available_schemas: scholarship.schemas.map((s) => ({
        id: s.id,
        name: s.name,
        quota: s.quota,
      })),
      form_fields: transformedFields,
      has_existing_application: !!existingApplication,
      existing_application_status: existingApplication?.status || null,
      existing_answers: existingAnswers,
      user_eligibility: {
        nim: user.nim,
        faculty_id: user.faculty_id,
        department_id: user.department_id,
        study_program_id: user.study_program_id,
      },
    };

    return successResponse(res, "Form berhasil dimuat", responseData);
  } catch (error) {
    console.error("Error fetching scholarship form:", error);
    return errorResponse(res, "Gagal memuat form pendaftaran", 500);
  }
};

// ✅ FIX: Submit application with schema
const submitApplication = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const { answers, schemaId } = req.body;
    const userId = req.user.id;
    const isDraft = req.body.isDraft === "true" || req.body.isDraft === true;

    const parsedAnswers =
      typeof answers === "string" ? JSON.parse(answers) : answers;

    // ✅ Validate schema
    if (!schemaId) {
      return errorResponse(res, "Skema beasiswa harus dipilih", 400);
    }

    const schema = await ScholarshipSchema.findOne({
      where: {
        id: schemaId,
        scholarship_id: scholarshipId,
        is_active: true,
      },
    });

    if (!schema) {
      return errorResponse(res, "Skema tidak ditemukan atau tidak aktif", 404);
    }

    const scholarship = await Scholarship.findOne({
      where: { id: scholarshipId, is_active: true },
    });

    if (!scholarship) {
      return errorResponse(
        res,
        "Beasiswa tidak ditemukan atau tidak aktif",
        404
      );
    }

    if (scholarship.is_external) {
      return errorResponse(
        res,
        "Tidak dapat mendaftar melalui platform ini. Pendaftaran beasiswa ini dilakukan di website penyelenggara.",
        400,
        {
          is_external: true,
          external_url: scholarship.website_url,
        }
      );
    }

    if (scholarship.end_date) {
      const today = new Date();
      const endDate = new Date(scholarship.end_date);
      if (today > endDate) {
        return errorResponse(
          res,
          "Batas waktu pendaftaran telah berakhir",
          400
        );
      }
    }

    // ✅ Get form fields for this schema
    const formFields = await FormField.findAll({
      where: { schema_id: schemaId },
    });

    if (formFields.length === 0) {
      return errorResponse(
        res,
        "Form pendaftaran belum tersedia untuk skema ini",
        404
      );
    }

    // ✅ Validate required fields (only if not draft)
    if (!isDraft) {
      const requiredFields = formFields.filter((field) => field.is_required);

      for (const field of requiredFields) {
        const fieldAnswer = parsedAnswers[field.id];

        if (field.type === "FILE") {
          const hasExistingFile = fieldAnswer?.file_path;
          const hasNewFile = req.files?.find(
            (file) => file.fieldname === `field_${field.id}`
          );

          if (!hasExistingFile && !hasNewFile) {
            return errorResponse(
              res,
              `Field "${field.label}" wajib diunggah`,
              400
            );
          }
        } else {
          if (
            !fieldAnswer ||
            !fieldAnswer.answer_text ||
            fieldAnswer.answer_text.trim() === ""
          ) {
            return errorResponse(
              res,
              `Field "${field.label}" wajib diisi`,
              400
            );
          }
        }
      }
    }

    // ✅ FIX: Check for existing application - REMOVE scholarship_id
    let application = await Application.findOne({
      where: {
        // ❌ REMOVED: scholarship_id: scholarshipId,
        schema_id: schemaId, // ✅ Only use schema_id
        student_id: userId,
      },
    });

    if (!application) {
      // ✅ FIX: Create new application - REMOVE scholarship_id
      application = await Application.create({
        // ❌ REMOVED: scholarship_id: scholarshipId,
        schema_id: schemaId, // ✅ Only schema_id
        student_id: userId,
        status: isDraft ? "DRAFT" : "MENUNGGU_VERIFIKASI",
        submitted_at: isDraft ? null : new Date(),
      });
    } else {
      // ✅ Update existing application
      if (!isDraft && application.status === "DRAFT") {
        await application.update({
          status: "MENUNGGU_VERIFIKASI",
          submitted_at: new Date(),
        });
      } else if (application.status !== "DRAFT" && !isDraft) {
        return errorResponse(
          res,
          `Anda sudah mendaftar skema ini dengan status: ${application.status}`,
          400
        );
      }
    }

    // ✅ Delete old answers
    await FormAnswer.destroy({
      where: { application_id: application.id },
    });

    // ✅ Create new answers
    const answerPromises = formFields.map(async (field) => {
      const fieldAnswer = parsedAnswers[field.id];

      if (
        !fieldAnswer &&
        !req.files?.find((file) => file.fieldname === `field_${field.id}`)
      ) {
        return null;
      }

      let answerData = {
        application_id: application.id,
        field_id: field.id,
        answer_text: null,
        file_path: null,
        mime_type: null,
        uploaded_at: null,
      };

      if (field.type === "FILE") {
        const uploadedFile = req.files?.find(
          (file) => file.fieldname === `field_${field.id}`
        );
        if (uploadedFile) {
          answerData.file_path = uploadedFile.path;
          answerData.mime_type = uploadedFile.mimetype;
          answerData.uploaded_at = new Date();
        } else if (fieldAnswer?.file_path) {
          answerData.file_path = fieldAnswer.file_path;
          answerData.mime_type = fieldAnswer.mime_type;
          answerData.uploaded_at = new Date();
        }
      } else {
        if (fieldAnswer?.answer_text) {
          answerData.answer_text = fieldAnswer.answer_text;
        }
      }

      if (answerData.answer_text || answerData.file_path) {
        return FormAnswer.create(answerData);
      }

      return null;
    });

    await Promise.all(answerPromises);

    // ✅ Create/update application documents
    await ApplicationDocument.destroy({
      where: { application_id: application.id },
    });

    const documentPromises = formFields
      .filter((field) => field.type === "FILE")
      .map(async (field) => {
        const fieldAnswer = parsedAnswers[field.id];
        const uploadedFile = req.files?.find(
          (file) => file.fieldname === `field_${field.id}`
        );

        if (!uploadedFile && !fieldAnswer?.file_path) {
          return null;
        }

        let documentData = {
          application_id: application.id,
          document_type: field.label,
          file_path: uploadedFile ? uploadedFile.path : fieldAnswer.file_path,
          mime_type: uploadedFile
            ? uploadedFile.mimetype
            : fieldAnswer.mime_type || null,
          size_bytes: uploadedFile
            ? uploadedFile.size
            : fieldAnswer.size_bytes || null,
          is_valid: false,
          checked_by: null,
          checked_at: null,
        };

        return ApplicationDocument.create(documentData);
      });

    await Promise.all(documentPromises);

    // ✅ Log activity
    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: isDraft ? "SAVE_DRAFT_APPLICATION" : "SUBMIT_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `${userName} ${
        isDraft ? "menyimpan draft" : "mendaftar"
      } beasiswa "${scholarship.name}" - Skema: ${schema.name}`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    const message = isDraft
      ? "Draft berhasil disimpan"
      : "Aplikasi berhasil disubmit";

    return successResponse(res, message, {
      application_id: application.id,
      schema_id: schema.id,
      schema_name: schema.name,
      status: application.status,
    });
  } catch (error) {
    console.error("Error submitting application:", error);
    return errorResponse(res, "Gagal menyimpan aplikasi", 500);
  }
};

module.exports = {
  getScholarshipForm,
  submitApplication,
};
