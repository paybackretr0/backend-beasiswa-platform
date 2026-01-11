const {
  Application,
  Scholarship,
  ScholarshipSchema,
  ScholarshipSchemaRequirement,
  ScholarshipSchemaDocument,
  ScholarshipSchemaStage,
  User,
  Department,
  Faculty,
  FormAnswer,
  FormField,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { status: { [Op.ne]: "DRAFT" } },
      include: [
        {
          model: ScholarshipSchema,
          as: "schema",
          attributes: ["id", "name", "is_active"],
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name", "is_active"],
            },
          ],
        },
        {
          model: User,
          as: "student",
          attributes: ["id", "full_name", "email"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    const transformedApplications = applications.map((app) => ({
      id: app.id,
      nama: app.student?.full_name || "N/A",
      email: app.student?.email || "N/A",
      beasiswa: app.schema?.scholarship?.name || "N/A",
      skema: app.schema?.name || "N/A",
      tanggalDaftar: app.submitted_at
        ? new Date(app.submitted_at).toISOString().split("T")[0]
        : null,
      status: app.status,
      notes: app.notes,
      verified_at: app.verified_at,
      validated_at: app.validated_at,
      rejected_at: app.rejected_at,
      schema_id: app.schema_id,
      scholarship_id: app.schema?.scholarship_id,
      student_id: app.student_id,
    }));

    return successResponse(
      res,
      "Applications retrieved successfully",
      transformedApplications
    );
  } catch (error) {
    console.error("Error fetching applications:", error);
    return errorResponse(res, "Failed to retrieve applications", 500);
  }
};

const getApplicationsSummary = async (req, res) => {
  try {
    const totalApplications = await Application.count({
      where: { status: { [Op.ne]: "DRAFT" } },
    });

    const menungguVerifikasi = await Application.count({
      where: { status: "MENUNGGU_VERIFIKASI" },
    });

    const menungguValidasi = await Application.count({
      where: { status: "VERIFIED" },
    });

    const ditolak = await Application.count({
      where: { status: "REJECTED" },
    });

    const revisi = await Application.count({
      where: { status: "REVISION_NEEDED" },
    });

    const lolosValidasi = await Application.count({
      where: { status: "VALIDATED" },
    });

    const summary = {
      total: totalApplications,
      menunggu_verifikasi: menungguVerifikasi,
      menunggu_validasi: menungguValidasi,
      ditolak: ditolak,
      revisi: revisi,
      lolos_validasi: lolosValidasi,
    };

    return successResponse(
      res,
      "Applications summary retrieved successfully",
      summary
    );
  } catch (error) {
    console.error("Error fetching applications summary:", error);
    return errorResponse(res, "Failed to retrieve applications summary", 500);
  }
};

const getApplicationDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const application = await Application.findByPk(id, {
      include: [
        {
          model: ScholarshipSchema,
          as: "schema",
          attributes: [
            "id",
            "name",
            "description",
            "quota",
            "gpa_minimum",
            "semester_minimum",
          ],
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: [
                "id",
                "name",
                "description",
                "organizer",
                "year",
                "scholarship_value",
                "duration_semesters",
              ],
            },
            {
              model: ScholarshipSchemaRequirement,
              as: "requirements",
              attributes: [
                "id",
                "requirement_type",
                "requirement_text",
                "requirement_file",
              ],
            },
            {
              model: ScholarshipSchemaDocument,
              as: "documents",
              attributes: ["id", "document_name"],
            },
            {
              model: ScholarshipSchemaStage,
              as: "stages",
              attributes: ["id", "stage_name", "order_no"],
            },
          ],
        },
        {
          model: User,
          as: "student",
          attributes: [
            "id",
            "full_name",
            "email",
            "nim",
            "phone_number",
            "gender",
            "birth_date",
            "birth_place",
          ],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
              include: [
                {
                  model: Faculty,
                  as: "faculty",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
        {
          model: FormAnswer,
          as: "formAnswers",
          include: [
            {
              model: FormField,
              as: "FormField",
              attributes: ["id", "label", "type"],
            },
          ],
        },
        {
          model: User,
          as: "verificator",
          attributes: ["id", "full_name", "email", "role"],
        },
        {
          model: User,
          as: "validator",
          attributes: ["id", "full_name", "email", "role"],
        },
        {
          model: User,
          as: "rejector",
          attributes: ["id", "full_name", "email", "role"],
        },
      ],
    });

    if (!application) {
      return errorResponse(res, "Application not found", 404);
    }

    const formAnswers = {};
    const documentAnswers = [];

    if (application.formAnswers) {
      application.formAnswers.forEach((answer) => {
        if (answer.FormField?.type === "FILE" && answer.file_path) {
          documentAnswers.push({
            id: answer.id,
            type: answer.FormField.label,
            fileName: answer.file_path.split(/[/\\]/).pop(),
            filePath: answer.file_path.replace(/\\/g, "/"),
            mimeType: answer.mime_type,
            uploadedAt: answer.uploaded_at || answer.createdAt,
          });
        } else if (answer.answer_text) {
          formAnswers[answer.FormField?.label || `Field ${answer.field_id}`] =
            answer.answer_text;
        }
      });
    }

    const requirementsHtml =
      application.schema?.requirements
        ?.map((req) => {
          if (req.requirement_type === "TEXT") {
            return `<p>${req.requirement_text}</p>`;
          } else if (req.requirement_type === "FILE" && req.requirement_file) {
            return `<p><a href="${process.env.BASE_URL}/${req.requirement_file}" target="_blank" class="text-blue-500 underline">📎 Download File Persyaratan</a></p>`;
          }
          return "";
        })
        .join("") || "<p>Tidak ada persyaratan khusus</p>";

    const requiredDocuments =
      application.schema?.documents
        ?.map((doc) => doc.document_name)
        .join(", ") || "Tidak ada dokumen khusus yang diperlukan";

    const detailData = {
      id: application.id,
      status: application.status,
      notes: application.notes,
      submitted_at: application.submitted_at,
      verified_at: application.verified_at,
      validated_at: application.validated_at,
      rejected_at: application.rejected_at,
      form_data: formAnswers,

      student: {
        id: application.student?.id,
        nama: application.student?.full_name || "N/A",
        email: application.student?.email || "N/A",
        nim: application.student?.nim || "N/A",
        phone_number: application.student?.phone_number || "N/A",
        gender: application.student?.gender === "L" ? "Laki-laki" : "Perempuan",
        birth_date: application.student?.birth_date,
        birth_place: application.student?.birth_place || "N/A",
        fakultas: application.student?.department?.faculty?.name || "N/A",
        departemen: application.student?.department?.name || "N/A",
      },

      verificator: application.verificator,
      validator: application.validator,
      rejector: application.rejector,

      scholarship: {
        id: application.schema?.scholarship?.id,
        name: application.schema?.scholarship?.name || "N/A",
        description: application.schema?.scholarship?.description || "N/A",
        organizer: application.schema?.scholarship?.organizer || "N/A",
        year: application.schema?.scholarship?.year,
        scholarship_value: application.schema?.scholarship?.scholarship_value,
        duration_semesters: application.schema?.scholarship?.duration_semesters,
        schema_name: application.schema?.name || "N/A",
        requirements: requirementsHtml,
        required_documents: requiredDocuments,
      },
      documents: documentAnswers,
    };

    return successResponse(
      res,
      "Application detail retrieved successfully",
      detailData
    );
  } catch (error) {
    console.error("Error fetching application detail:", error);
    return errorResponse(res, "Failed to retrieve application detail", 500);
  }
};

module.exports = {
  getAllApplications,
  getApplicationsSummary,
  getApplicationDetail,
};
