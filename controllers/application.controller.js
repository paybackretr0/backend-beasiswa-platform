const {
  Application,
  ApplicationComment,
  ApplicationCommentTemplate,
  ApplicationDocument,
  Scholarship,
  ScholarshipBenefit,
  ScholarshipSchema,
  ScholarshipSchemaRequirement,
  ScholarshipSchemaDocument,
  ScholarshipSchemaStage,
  User,
  Student,
  Staff,
  StudyProgram,
  Department,
  Faculty,
  FormAnswer,
  FormField,
  FormAnswerOption,
  FormFieldOption,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");
const { getOrSetCache } = require("../utils/cacheHelper");

const getAllApplications = async (req, res) => {
  try {
    const user = req.user;

    let whereCondition = { status: { [Op.ne]: "DRAFT" } };
    let scholarshipInclude = {
      model: Scholarship,
      as: "scholarship",
      attributes: ["id", "name", "is_active", "verification_level", "end_date"],
      required: true,
    };
    let schemaEligibilityInclude = null;

    if (user.role === "VERIFIKATOR_FAKULTAS") {
      if (!user.staff?.faculty_id) {
        return errorResponse(
          res,
          "User tidak memiliki fakultas terdaftar",
          400,
        );
      }

      scholarshipInclude.where = { verification_level: "FACULTY" };
    } else if (user.role === "VERIFIKATOR_DITMAWA") {
      scholarshipInclude.where = { verification_level: "DITMAWA" };
    }

    let studentInclude = {
      model: Student,
      as: "student",
      attributes: ["id", "nim"],
      required: true,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email"],
          required: true,
        },
      ],
    };

    if (user.role === "VERIFIKATOR_FAKULTAS") {
      studentInclude.include.push({
        model: StudyProgram,
        as: "study_program",
        attributes: ["id"],
        required: true,
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "faculty_id"],
            where: { faculty_id: user.staff?.faculty_id },
            required: true,
          },
        ],
      });
    }

    const applications = await Application.findAll({
      where: whereCondition,
      include: [
        {
          model: ScholarshipSchema,
          as: "schema",
          attributes: ["id", "name", "is_active"],
          required: true,
          include: [scholarshipInclude],
        },
        studentInclude,
      ],
      order: [["submitted_at", "DESC"]],
    });

    const transformedApplications = applications.map((app) => ({
      id: app.id,
      nama: app.student?.user?.full_name || "N/A",
      email: app.student?.user?.email || "N/A",
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
      verification_level: app.schema?.scholarship?.verification_level,
      scholarship_end_date: app.schema?.scholarship?.end_date || null,
    }));

    return successResponse(
      res,
      "Applications retrieved successfully",
      transformedApplications,
    );
  } catch (error) {
    console.error("Error fetching applications:", error);
    return errorResponse(res, "Failed to retrieve applications", 500);
  }
};

const getApplicationsSummary = async (req, res) => {
  try {
    const user = req.user;

    const cacheKey = `applications_summary:${user.role}:${user.staff?.faculty_id || "all"}`;

    const summary = await getOrSetCache(cacheKey, 300, async () => {
      let includeOptions = [];

      if (user.role === "VERIFIKATOR_FAKULTAS") {
        if (!user.staff?.faculty_id) {
          throw new Error("User tidak memiliki fakultas terdaftar");
        }

        includeOptions = [
          {
            model: ScholarshipSchema,
            as: "schema",
            attributes: [],
            required: true,
            include: [
              {
                model: Scholarship,
                as: "scholarship",
                attributes: [],
                where: { verification_level: "FACULTY" },
                required: true,
              },
            ],
          },
          {
            model: Student,
            as: "student",
            attributes: [],
            required: true,
            include: [
              {
                model: StudyProgram,
                as: "study_program",
                attributes: [],
                required: true,
                include: [
                  {
                    model: Department,
                    as: "department",
                    attributes: [],
                    where: { faculty_id: user.staff?.faculty_id },
                    required: true,
                  },
                ],
              },
            ],
          },
        ];
      } else if (user.role === "VERIFIKATOR_DITMAWA") {
        includeOptions = [
          {
            model: ScholarshipSchema,
            as: "schema",
            attributes: [],
            required: true,
            include: [
              {
                model: Scholarship,
                as: "scholarship",
                attributes: [],
                where: { verification_level: "DITMAWA" },
                required: true,
              },
            ],
          },
        ];
      }

      const baseWhere = { status: { [Op.ne]: "DRAFT" } };

      const [
        total,
        menungguVerifikasi,
        menungguValidasi,
        ditolak,
        revisi,
        lolosValidasi,
      ] = await Promise.all([
        Application.count({
          where: baseWhere,
          include: includeOptions,
          distinct: true,
        }),
        Application.count({
          where: { ...baseWhere, status: "MENUNGGU_VERIFIKASI" },
          include: includeOptions,
          distinct: true,
        }),
        Application.count({
          where: { ...baseWhere, status: "VERIFIED" },
          include: includeOptions,
          distinct: true,
        }),
        Application.count({
          where: { ...baseWhere, status: "REJECTED" },
          include: includeOptions,
          distinct: true,
        }),
        Application.count({
          where: { ...baseWhere, status: "REVISION_NEEDED" },
          include: includeOptions,
          distinct: true,
        }),
        Application.count({
          where: { ...baseWhere, status: "VALIDATED" },
          include: includeOptions,
          distinct: true,
        }),
      ]);

      return {
        total,
        menunggu_verifikasi: menungguVerifikasi,
        menunggu_validasi: menungguValidasi,
        ditolak,
        revisi,
        lolos_validasi: lolosValidasi,
      };
    });

    return successResponse(
      res,
      "Applications summary retrieved successfully",
      summary,
    );
  } catch (error) {
    console.error("Error fetching applications summary:", error);

    if (error.message.includes("fakultas")) {
      return errorResponse(res, error.message, 400);
    }

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
                "end_date",
                "scholarship_value",
                "duration_semesters",
                "verification_level",
              ],
              include: [
                {
                  model: ScholarshipBenefit,
                  as: "benefits",
                  attributes: ["id", "benefit_text"],
                },
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
          model: Student,
          as: "student",
          attributes: ["id", "nim", "gender", "birth_date", "birth_place"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "email", "phone_number"],
              required: true,
            },
            {
              model: StudyProgram,
              as: "study_program",
              attributes: ["id", "name", "degree"],
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
          ],
        },
        {
          model: FormAnswer,
          as: "formAnswers",
          include: [
            {
              model: FormField,
              as: "field",
              attributes: ["id", "label", "type"],
              include: [
                {
                  model: FormFieldOption,
                  as: "options",
                  attributes: ["id", "value", "order_no"],
                },
              ],
            },
            {
              model: FormAnswerOption,
              as: "selected_options",
              attributes: ["id", "option_id"],
              include: [
                {
                  model: FormFieldOption,
                  as: "option",
                  attributes: ["id", "value", "order_no"],
                },
              ],
            },
          ],
        },
        {
          model: Staff,
          as: "verificator",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "email", "role"],
            },
          ],
        },
        {
          model: Staff,
          as: "validator",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "email", "role"],
            },
          ],
        },
        {
          model: Staff,
          as: "rejector",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "email", "role"],
            },
          ],
        },
        {
          model: Staff,
          as: "revision_requester",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "email", "role"],
            },
          ],
        },
        {
          model: ApplicationDocument,
          as: "documents",
          attributes: ["id", "file_path", "createdAt"],
          include: [
            {
              model: ScholarshipSchemaDocument,
              as: "schemaDocument",
              attributes: ["id", "document_name", "template_file"],
            },
          ],
        },
      ],
    });

    if (!application) {
      return errorResponse(res, "Application not found", 404);
    }

    const facultyScopedRoles = ["PIMPINAN_FAKULTAS", "VERIFIKATOR_FAKULTAS"];
    if (facultyScopedRoles.includes(req.user?.role)) {
      const facultyId = req.user?.staff?.faculty_id;
      if (!facultyId) {
        return errorResponse(
          res,
          "User tidak memiliki fakultas terdaftar",
          400,
        );
      }

      const applicationFacultyId =
        application.student?.study_program?.department?.faculty?.id || null;

      if (!applicationFacultyId || applicationFacultyId !== facultyId) {
        return errorResponse(
          res,
          "Akses ditolak: data bukan milik fakultas Anda",
          403,
        );
      }
    }

    const formAnswers = {};
    const documentAnswers = [];

    if (application.formAnswers) {
      application.formAnswers.forEach((answer) => {
        const field = answer.field;
        const selectedOptionValues =
          answer.selected_options
            ?.map((selectedOption) => selectedOption.option?.value)
            .filter(Boolean) || [];

        if (field?.type === "FILE" && answer.file_path) {
          documentAnswers.push({
            id: answer.id,
            type: field.label,
            fileName: answer.file_path.split(/[/\\]/).pop(),
            filePath: answer.file_path.replace(/\\/g, "/"),
            mimeType: answer.mime_type,
            uploadedAt: answer.uploaded_at || answer.createdAt,
            field_id: answer.field_id,
          });
        } else if (
          field?.type === "MULTI_SELECT" &&
          selectedOptionValues.length
        ) {
          formAnswers[field?.label || `Field ${answer.field_id}`] =
            selectedOptionValues.join(", ");
        } else if (
          field?.type === "SELECT" &&
          (selectedOptionValues[0] || answer.answer_text)
        ) {
          formAnswers[field?.label || `Field ${answer.field_id}`] =
            selectedOptionValues[0] || answer.answer_text;
        } else if (answer.answer_text) {
          formAnswers[field?.label || `Field ${answer.field_id}`] =
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

    const benefitsHtml =
      application.schema?.scholarship?.benefits
        ?.map(
          (benefit, index) => `<p>${index + 1}. ${benefit.benefit_text}</p>`,
        )
        .join("") || "<p>Tidak ada benefit yang tercantum</p>";

    const detailData = {
      id: application.id,
      status: application.status,
      notes: application.notes,
      submitted_at: application.submitted_at,
      verified_at: application.verified_at,
      validated_at: application.validated_at,
      rejected_at: application.rejected_at,
      revision_requested_at: application.revision_requested_at,
      revision_deadline: application.revision_deadline,
      revision_submitted_at: application.revision_submitted_at,
      form_data: formAnswers,
      verification_level: application.schema?.scholarship?.verification_level,

      scholarship_id: application.schema?.scholarship?.id,
      schema_id: application.schema_id,

      student: {
        id: application.student?.id,
        nama: application.student?.user?.full_name || "N/A",
        email: application.student?.user?.email || "N/A",
        nim: application.student?.nim || "N/A",
        phone_number: application.student?.user?.phone_number || "N/A",
        gender: application.student?.gender === "L" ? "Laki-laki" : "Perempuan",
        birth_date: application.student?.birth_date,
        birth_place: application.student?.birth_place || "N/A",
        fakultas:
          application.student?.study_program?.department?.faculty?.name ||
          "N/A",
        departemen:
          application.student?.study_program?.department?.name || "N/A",
      },

      verificator: application.verificator?.user || null,
      validator: application.validator?.user || null,
      rejector: application.rejector?.user || null,
      revision_requester: application.revision_requester?.user || null,

      scholarship: {
        id: application.schema?.scholarship?.id,
        name: application.schema?.scholarship?.name || "N/A",
        description: application.schema?.scholarship?.description || "N/A",
        organizer: application.schema?.scholarship?.organizer || "N/A",
        year: application.schema?.scholarship?.year,
        end_date: application.schema?.scholarship?.end_date || null,
        scholarship_value: application.schema?.scholarship?.scholarship_value,
        duration_semesters: application.schema?.scholarship?.duration_semesters,
        schema_name: application.schema?.name || "N/A",
        requirements: requirementsHtml,
        required_documents: requiredDocuments,
        benefits: benefitsHtml,
      },

      documents: documentAnswers,

      formAnswers:
        application.formAnswers?.map((answer) => ({
          field_id: answer.field_id,
          field_label: answer.field?.label || `Field ${answer.field_id}`,
          field_type: answer.field?.type || null,
          answer_text: answer.answer_text,
          file_path: answer.file_path,
          mime_type: answer.mime_type,
          uploaded_at: answer.uploaded_at,
          selected_options:
            answer.selected_options
              ?.map((selectedOption) => selectedOption.option?.value)
              .filter(Boolean) || [],
        })) || [],
    };

    return successResponse(
      res,
      "Application detail retrieved successfully",
      detailData,
    );
  } catch (error) {
    console.error("Error fetching application detail:", error);
    return errorResponse(res, "Failed to retrieve application detail", 500);
  }
};

const getApplicationComments = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const application = await Application.findByPk(id);

    if (!application) {
      return errorResponse(res, "Application not found", 404);
    }

    if (userRole === "MAHASISWA" && application.student_id !== userId) {
      return errorResponse(
        res,
        "You don't have access to view these comments",
        403,
      );
    }

    const comments = await ApplicationComment.findAll({
      where: {
        application_id: id,
        is_visible_to_student: true,
      },
      include: [
        {
          model: Staff,
          as: "commenter",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "full_name", "role"],
            },
          ],
        },
        {
          model: ApplicationCommentTemplate,
          as: "template",
          attributes: ["id", "template_name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const normalizedComments = comments.map((comment) => {
      const data = comment.toJSON();
      return {
        ...data,
        commenter: data.commenter?.user || null,
      };
    });

    return successResponse(
      res,
      "Application comments retrieved successfully",
      normalizedComments,
    );
  } catch (error) {
    console.error("Error fetching application comments:", error);
    return errorResponse(res, "Failed to fetch application comments", 500);
  }
};

const assignApplicationsAsAwardeeBulk = async (req, res) => {
  try {
    const user = req.user;

    if (!user || String(user.role).toUpperCase() !== "SUPERADMIN") {
      console.log("[assign-awardee] forbidden", { role: user?.role });
      return errorResponse(res, "Anda tidak memiliki akses", 403);
    }

    const applicationIds = Array.isArray(req.body?.application_ids)
      ? req.body.application_ids
      : [];

    const normalizedIds = applicationIds
      .map((id) => String(id || "").trim())
      .filter(Boolean);

    if (normalizedIds.length === 0) {
      return errorResponse(res, "application_ids wajib diisi", 400);
    }

    const applications = await Application.findAll({
      where: {
        id: { [Op.in]: normalizedIds },
      },
      attributes: ["id", "status", "schema_id"],
      include: [
        {
          model: ScholarshipSchema,
          as: "schema",
          attributes: ["id"],
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "is_active", "end_date", "year"],
            },
          ],
        },
      ],
    });

    const foundById = new Map(applications.map((app) => [app.id, app]));
    const notFoundIds = normalizedIds.filter((id) => !foundById.has(id));

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const validIds = [];
    const skipped = [];

    for (const app of applications) {
      const scholarship = app.schema?.scholarship;

      if (app.status !== "VALIDATED") {
        skipped.push({
          id: app.id,
          status: app.status,
          reason: "NOT_VALIDATED",
        });
        continue;
      }

      if (!scholarship || !scholarship.is_active) {
        skipped.push({
          id: app.id,
          status: app.status,
          reason: "SCHOLARSHIP_NOT_ACTIVE",
          detail: "Beasiswa sudah tidak aktif",
        });
        continue;
      }

      if (scholarship.end_date && new Date(scholarship.end_date) < sixMonthsAgo) {
        skipped.push({
          id: app.id,
          status: app.status,
          reason: "SCHOLARSHIP_EXPIRED",
          detail: `Batas pendaftaran sudah lewat lebih dari 6 bulan (${new Date(scholarship.end_date).toLocaleDateString("id-ID")})`,
        });
        continue;
      }

      validIds.push(app.id);
    }

    const transaction = await Application.sequelize.transaction();
    try {
      let updatedCount = 0;
      if (validIds.length > 0) {
        const [affected] = await Application.update(
          { status: "AWARDEE" },
          {
            where: {
              id: { [Op.in]: validIds },
              status: "VALIDATED",
            },
            transaction,
          },
        );
        updatedCount = affected;
      }

      const updatedApps = await Application.findAll({
        where: { id: { [Op.in]: validIds } },
        attributes: ["id", "status"],
        transaction,
      });
      const updatedIds = updatedApps
        .filter((a) => a.status === "AWARDEE")
        .map((a) => a.id);

      await Application.sequelize.models.ActivityLog?.create?.(
        {
          user_id: user.id,
          action: "ASSIGN_AWARDEE_BULK",
          entity_type: "Application",
          entity_id: null,
          description: `Assign AWARDEE bulk: ${updatedCount} pendaftaran diubah menjadi Penerima Beasiswa`,
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        },
        { transaction },
      );

      await transaction.commit();

      return successResponse(res, "Berhasil assign awardee", {
        requested_count: normalizedIds.length,
        updated_count: updatedCount,
        updated_ids: updatedIds,
        final_statuses: updatedApps.map((a) => ({
          id: a.id,
          status: a.status,
        })),
        skipped,
        not_found_ids: notFoundIds,
      });
    } catch (innerError) {
      await transaction.rollback();
      throw innerError;
    }
  } catch (error) {
    console.error("Error bulk assign awardee:", error);
    return errorResponse(res, "Gagal assign awardee", 500);
  }
};

module.exports = {
  getAllApplications,
  getApplicationsSummary,
  getApplicationDetail,
  getApplicationComments,
  assignApplicationsAsAwardeeBulk,
};
