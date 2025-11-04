const {
  FormField,
  Scholarship,
  Application,
  FormAnswer,
  ApplicationDocument,
  ActivityLog,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const getScholarshipForm = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const userId = req.user.id;

    const scholarship = await Scholarship.findOne({
      where: { id: scholarshipId, is_active: true },
      attributes: ["id", "name", "organizer", "end_date", "is_active"],
    });

    if (!scholarship) {
      return errorResponse(
        res,
        "Beasiswa tidak ditemukan atau tidak aktif",
        404
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

    const existingApplication = await Application.findOne({
      where: {
        scholarship_id: scholarshipId,
        student_id: userId,
      },
      include: [
        {
          model: FormAnswer,
          include: [
            {
              model: FormField,
              attributes: ["id", "type", "label"],
            },
          ],
        },
      ],
    });

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

    if (formFields.length === 0) {
      return errorResponse(
        res,
        "Form pendaftaran belum tersedia untuk beasiswa ini",
        404
      );
    }

    const transformedFields = formFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      is_required: field.is_required,
      options: field.options_json || [],
      order_no: field.order_no,
    }));

    let existingAnswers = {};
    if (existingApplication && existingApplication.FormAnswers) {
      existingApplication.FormAnswers.forEach((answer) => {
        existingAnswers[answer.field_id] = {
          answer_text: answer.answer_text,
          file_path: answer.file_path,
          mime_type: answer.mime_type,
        };
      });
    }

    const responseData = {
      scholarship: {
        id: scholarship.id,
        name: scholarship.name,
        organizer: scholarship.organizer,
        end_date: scholarship.end_date,
      },
      form_fields: transformedFields,
      has_existing_application: !!existingApplication,
      existing_application_status: existingApplication?.status || null,
      existing_answers: existingAnswers,
    };

    return successResponse(res, "Form berhasil dimuat", responseData);
  } catch (error) {
    console.error("Error fetching scholarship form:", error);
    return errorResponse(res, "Gagal memuat form pendaftaran", 500);
  }
};

const submitApplication = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    const isDraft = req.body.isDraft === "true" || req.body.isDraft === true;

    const parsedAnswers =
      typeof answers === "string" ? JSON.parse(answers) : answers;

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

    const formFields = await FormField.findAll({
      where: { scholarship_id: scholarshipId },
    });

    if (!isDraft) {
      const requiredFields = formFields.filter((field) => field.is_required);

      for (const field of requiredFields) {
        const fieldAnswer = parsedAnswers[field.id];

        if (
          !fieldAnswer ||
          (field.type !== "FILE" &&
            (!fieldAnswer.answer_text || fieldAnswer.answer_text.trim() === ""))
        ) {
          return errorResponse(res, `Field "${field.label}" wajib diisi`, 400);
        }

        if (
          field.type === "FILE" &&
          !fieldAnswer?.file_path &&
          !req.files?.find((file) => file.fieldname === `field_${field.id}`)
        ) {
          return errorResponse(
            res,
            `Field "${field.label}" wajib diunggah`,
            400
          );
        }
      }
    }

    let application = await Application.findOne({
      where: {
        scholarship_id: scholarshipId,
        student_id: userId,
      },
    });

    if (!application) {
      application = await Application.create({
        scholarship_id: scholarshipId,
        student_id: userId,
        status: isDraft ? "DRAFT" : "MENUNGGU_VERIFIKASI",
        submitted_at: isDraft ? null : new Date(),
      });
    } else {
      if (!isDraft && application.status === "DRAFT") {
        await application.update({
          status: "MENUNGGU_VERIFIKASI",
          submitted_at: new Date(),
        });
      }
    }

    await FormAnswer.destroy({
      where: { application_id: application.id },
    });

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

    const documentPromises = formFields
      .filter((field) => field.type === "FILE")
      .map(async (field) => {
        const fieldAnswer = parsedAnswers[field.id];

        if (
          !fieldAnswer &&
          !req.files?.find((file) => file.fieldname === `field_${field.id}`)
        ) {
          return null;
        }

        let documentData = {
          application_id: application.id,
          document_type: field.label,
          file_path: null,
          mime_type: null,
          size_bytes: null,
          is_valid: false,
          checked_by: null,
          checked_at: null,
        };

        if (req.files) {
          const uploadedFile = req.files.find(
            (file) => file.fieldname === `field_${field.id}`
          );
          if (uploadedFile) {
            documentData.file_path = uploadedFile.path;
            documentData.mime_type = uploadedFile.mimetype;
            documentData.size_bytes = uploadedFile.size;
          }
        }

        if (fieldAnswer?.file_path) {
          documentData.file_path = fieldAnswer.file_path;
          documentData.mime_type = fieldAnswer.mime_type || null;
          documentData.size_bytes = fieldAnswer.size_bytes || null;
        }

        if (documentData.file_path) {
          return ApplicationDocument.create(documentData);
        }

        return null;
      });

    await Promise.all(documentPromises);

    const message = isDraft
      ? "Draft berhasil disimpan"
      : "Aplikasi berhasil disubmit";

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "SUBMIT_APPLICATION",
      entity_type: "Application",
      entity_id: application.id,
      description: `${userName} mendaftar ke beasiswa "${scholarship.name}"`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, message, {
      application_id: application.id,
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
