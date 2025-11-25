const {
  Application,
  Scholarship,
  User,
  Department,
  Faculty,
  FormAnswer,
  FormField,
  ScholarshipRequirement,
  ScholarshipBenefit,
  ScholarshipDocument,
  ApplicationDocument,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");

const getAllApplications = async (req, res) => {
  try {
    const applications = await Application.findAll({
      where: { status: { [Op.ne]: "DRAFT" } },
      include: [
        {
          model: Scholarship,
          as: "scholarship",
          attributes: ["id", "name", "is_active"],
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
      beasiswa: app.scholarship?.name || "N/A",
      tanggalDaftar: app.submitted_at
        ? new Date(app.submitted_at).toISOString().split("T")[0]
        : null,
      status: app.status,
      notes: app.notes,
      verified_at: app.verified_at,
      scholarship_id: app.scholarship_id,
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

    const dikembalikan = await Application.count({
      where: { status: "REJECTED" },
    });

    const disetujui = await Application.count({
      where: { status: "VALIDATED" },
    });

    const summary = {
      total: totalApplications,
      menunggu_verifikasi: menungguVerifikasi,
      menunggu_validasi: menungguValidasi,
      dikembalikan: dikembalikan,
      disetujui: disetujui,
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
          model: Scholarship,
          as: "scholarship",
          attributes: [
            "id",
            "name",
            "description",
            "organizer",
            "year",
            "quota",
            "start_date",
            "end_date",
            "scholarship_value",
            "duration_semesters",
            "website_url",
          ],
          include: [
            {
              model: ScholarshipRequirement,
              as: "requirements",
              attributes: [
                "id",
                "requirement_type",
                "requirement_text",
                "requirement_file",
              ],
            },
            {
              model: ScholarshipBenefit,
              as: "benefits",
              attributes: ["id", "benefit_text"],
            },
            {
              model: ScholarshipDocument,
              as: "scholarshipDocuments",
              attributes: ["id", "document_name"],
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
          as: "FormAnswers",
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

    if (application.FormAnswers) {
      application.FormAnswers.forEach((answer) => {
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
      application.scholarship?.requirements
        ?.map((req) => {
          if (req.requirement_type === "TEXT") {
            return `<p>${req.requirement_text}</p>`;
          } else if (req.requirement_type === "FILE" && req.requirement_file) {
            return `<p><a href="${process.env.BASE_URL}/${req.requirement_file}" target="_blank" class="text-blue-500 underline">📎 Download File Persyaratan</a></p>`;
          }
          return "";
        })
        .join("") || "<p>Tidak ada persyaratan khusus</p>";

    const benefitsHtml =
      application.scholarship?.benefits
        ?.map((benefit) => `<p>• ${benefit.benefit_text}</p>`)
        .join("") || "<p>Informasi manfaat belum tersedia</p>";

    const requiredDocuments =
      application.scholarship?.scholarshipDocuments
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
        id: application.scholarship?.id,
        name: application.scholarship?.name || "N/A",
        description: application.scholarship?.description || "N/A",
        organizer: application.scholarship?.organizer || "N/A",
        year: application.scholarship?.year,
        quota: application.scholarship?.quota,
        start_date: application.scholarship?.start_date,
        end_date: application.scholarship?.end_date,
        scholarship_value: application.scholarship?.scholarship_value,
        duration_semesters: application.scholarship?.duration_semesters,
        website_url: application.scholarship?.website_url,
        requirements: requirementsHtml,
        benefits: benefitsHtml,
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
