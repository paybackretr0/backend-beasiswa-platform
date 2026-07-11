const {
  FormField,
  FormFieldOption,
  Scholarship,
  ScholarshipSchema,
  ScholarshipSchemaDocument,
  Faculty,
  Department,
  StudyProgram,
  ScholarshipSchemaStudyProgram,
  Application,
  FormAnswer,
  FormAnswerOption,
  ApplicationDocument,
  ActivityLog,
  User,
  Student,
  sequelize,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const normalizeLabel = (label) =>
  String(label || "")
    .trim()
    .toLowerCase();

const normalizeDocumentName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const parseNumberAnswer = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim().replace(",", ".");
  if (normalized === "") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const isOptionFieldType = (type) =>
  type === "SELECT" || type === "MULTI_SELECT";

const normalizeSelectedOptionIds = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.filter(Boolean).map((item) => String(item)))];
  }

  if (value === undefined || value === null || value === "") {
    return [];
  }

  return [String(value)];
};

const getSchemaStudyPrograms = (schema) =>
  schema?.study_programs || schema?.studyPrograms || [];

const buildEligibilityTargetsFromSchema = (schema) => {
  const schemaStudyPrograms = getSchemaStudyPrograms(schema);
  const studyProgramIds = new Set(schemaStudyPrograms.map((sp) => sp.id));
  const departmentIds = new Set(
    schemaStudyPrograms.map((sp) => sp.department?.id).filter(Boolean),
  );
  const facultyIds = new Set(
    schemaStudyPrograms.map((sp) => sp.department?.faculty?.id).filter(Boolean),
  );

  return { facultyIds, departmentIds, studyProgramIds };
};

const isUserEligibleForSchema = (user, schema) => {
  const { facultyIds, departmentIds, studyProgramIds } =
    buildEligibilityTargetsFromSchema(schema);

  const hasRestriction =
    facultyIds.size > 0 || departmentIds.size > 0 || studyProgramIds.size > 0;
  if (!hasRestriction) return true;

  const isStudyProgramEligible =
    studyProgramIds.size > 0 && studyProgramIds.has(user.study_program_id);
  const isDepartmentEligible =
    departmentIds.size > 0 && departmentIds.has(user.department_id);
  const isFacultyEligible =
    facultyIds.size > 0 && facultyIds.has(user.faculty_id);

  return isStudyProgramEligible || isDepartmentEligible || isFacultyEligible;
};

const getStudentEligibilityProfile = async (userId) => {
  const student = await Student.findByPk(userId, {
    attributes: ["id", "nim", "study_program_id"],
    include: [
      {
        model: StudyProgram,
        as: "study_program",
        attributes: ["id", "name", "degree", "department_id"],
        required: false,
        include: [
          {
            model: Department,
            as: "department",
            attributes: ["id", "name", "faculty_id"],
            required: false,
            include: [
              {
                model: Faculty,
                as: "faculty",
                attributes: ["id", "name", "code"],
                required: false,
              },
            ],
          },
        ],
      },
    ],
  });

  if (!student) return null;

  const studyProgram = student.study_program;
  const department = studyProgram?.department;

  return {
    id: student.id,
    nim: student.nim,
    faculty_id: department?.faculty_id || null,
    department_id: studyProgram?.department_id || null,
    study_program_id: student.study_program_id || null,
  };
};

const getScholarshipForm = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const { schemaId } = req.query;
    const userId = req.user.id;

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
          include: [
            {
              model: StudyProgram,
              as: "study_programs",
              through: { attributes: [] },
              attributes: ["id", "name", "degree", "department_id"],
              include: [
                {
                  model: Department,
                  as: "department",
                  attributes: ["id", "name", "faculty_id"],
                  include: [
                    {
                      model: Faculty,
                      as: "faculty",
                      attributes: ["id", "name", "code"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!scholarship) {
      return errorResponse(
        res,
        "Beasiswa tidak ditemukan atau tidak aktif",
        404,
      );
    }

    const user = await getStudentEligibilityProfile(userId);

    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
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
        },
      );
    }

    if (!scholarship.schemas || scholarship.schemas.length === 0) {
      return errorResponse(
        res,
        "Tidak ada skema aktif untuk beasiswa ini",
        404,
      );
    }

    let selectedSchema;
    if (schemaId) {
      selectedSchema = scholarship.schemas.find((s) => s.id === schemaId);
      if (!selectedSchema) {
        return errorResponse(
          res,
          "Skema tidak ditemukan atau tidak aktif",
          404,
        );
      }
    } else {
      selectedSchema = scholarship.schemas[0];
    }

    if (!isUserEligibleForSchema(user, selectedSchema)) {
      return errorResponse(
        res,
        "Anda tidak memenuhi cakupan fakultas/departemen/program studi untuk skema ini",
        403,
      );
    }

    if (scholarship.end_date) {
      const today = new Date();
      const endDate = new Date(scholarship.end_date);
      if (today > endDate) {
        return errorResponse(
          res,
          "Batas waktu pendaftaran telah berakhir",
          400,
        );
      }
    }

    const existingApplication = await Application.findOne({
      where: {
        schema_id: selectedSchema.id,
        student_id: userId,
      },
      include: [
        {
          model: FormAnswer,
          as: "formAnswers",
          include: [
            {
              model: FormField,
              as: "field",
              attributes: ["id", "type", "label"],
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
      ],
    });

    const formFields = await FormField.findAll({
      where: { schema_id: selectedSchema.id },
      order: [["order_no", "ASC"]],
      attributes: ["id", "label", "type", "is_required", "order_no"],
      include: [
        {
          model: FormFieldOption,
          as: "options",
          attributes: ["id", "value", "order_no"],
        },
      ],
    });

    if (formFields.length === 0) {
      return errorResponse(
        res,
        "Form pendaftaran belum tersedia untuk skema ini. Silakan hubungi penyelenggara.",
        404,
      );
    }

    const transformedFields = formFields.map((field) => ({
      id: field.id,
      label: field.label,
      type: field.type,
      is_required: field.is_required,
      options: (field.options || [])
        .sort((a, b) => a.order_no - b.order_no)
        .map((option) => ({
          id: option.id,
          value: option.value,
        })),
      order_no: field.order_no,
    }));

    let existingAnswers = {};
    if (existingApplication && existingApplication.formAnswers) {
      existingApplication.formAnswers.forEach((answer) => {
        const selectedOptions =
          answer.selected_options
            ?.map((selectedOption) => selectedOption.option)
            .filter(Boolean) || [];

        existingAnswers[answer.field_id] = {
          answer_text: answer.answer_text,
          file_path: answer.file_path,
          mime_type: answer.mime_type,
          selected_option_ids: selectedOptions.map((option) => option.id),
          selected_option_values: selectedOptions.map((option) => option.value),
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

const submitApplication = async (req, res) => {
  try {
    const { scholarshipId } = req.params;
    const { answers, schemaId } = req.body;
    const userId = req.user.id;
    const isDraft = req.body.isDraft === "true" || req.body.isDraft === true;

    const parsedAnswers =
      typeof answers === "string" ? JSON.parse(answers) : answers;

    if (!schemaId) {
      return errorResponse(res, "Skema beasiswa harus dipilih", 400);
    }

    const schema = await ScholarshipSchema.findOne({
      where: {
        id: schemaId,
        scholarship_id: scholarshipId,
        is_active: true,
      },
      include: [
        {
          model: StudyProgram,
          as: "study_programs",
          through: { attributes: [] },
          attributes: ["id", "name", "degree", "department_id"],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name", "faculty_id"],
              include: [
                {
                  model: Faculty,
                  as: "faculty",
                  attributes: ["id", "name", "code"],
                },
              ],
            },
          ],
        },
      ],
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
        404,
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
        },
      );
    }

    const user = await getStudentEligibilityProfile(userId);

    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (!isUserEligibleForSchema(user, schema)) {
      return errorResponse(
        res,
        "Anda tidak memenuhi cakupan fakultas/departemen/program studi untuk skema ini",
        403,
      );
    }

    if (scholarship.end_date) {
      const today = new Date();
      const endDate = new Date(scholarship.end_date);
      if (today > endDate) {
        return errorResponse(
          res,
          "Batas waktu pendaftaran telah berakhir",
          400,
        );
      }
    }

    const formFields = await FormField.findAll({
      where: { schema_id: schemaId },
    });

    const schemaDocuments = await ScholarshipSchemaDocument.findAll({
      where: { schema_id: schemaId },
      attributes: ["id", "document_name"],
    });

    const schemaDocumentMap = new Map(
      schemaDocuments.map((doc) => [
        normalizeDocumentName(doc.document_name),
        doc.id,
      ]),
    );

    if (formFields.length === 0) {
      return errorResponse(
        res,
        "Form pendaftaran belum tersedia untuk skema ini",
        404,
      );
    }

    if (!isDraft) {
      const requiredFields = formFields.filter((field) => field.is_required);

      for (const field of requiredFields) {
        const fieldAnswer = parsedAnswers[field.id];

        if (field.type === "FILE") {
          const hasExistingFile = fieldAnswer?.file_path;
          const hasNewFile = req.files?.find(
            (file) => file.fieldname === `field_${field.id}`,
          );

          if (!hasExistingFile && !hasNewFile) {
            return errorResponse(
              res,
              `Field "${field.label}" wajib diunggah`,
              400,
            );
          }
        } else if (field.type === "MULTI_SELECT") {
          const selectedOptionIds = normalizeSelectedOptionIds(
            fieldAnswer?.selected_option_ids || fieldAnswer?.answer_text,
          );

          if (selectedOptionIds.length === 0) {
            return errorResponse(
              res,
              `Field "${field.label}" wajib dipilih minimal satu opsi`,
              400,
            );
          }
        } else if (field.type === "SELECT") {
          const selectedOptionIds = normalizeSelectedOptionIds(
            fieldAnswer?.selected_option_ids || fieldAnswer?.answer_text,
          );

          if (selectedOptionIds.length === 0) {
            return errorResponse(
              res,
              `Field "${field.label}" wajib dipilih`,
              400,
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
              400,
            );
          }
        }
      }

      const gpaMinimum =
        schema.gpa_minimum !== null ? Number(schema.gpa_minimum) : null;
      if (Number.isFinite(gpaMinimum)) {
        const gpaField = formFields.find(
          (field) =>
            field.type === "NUMBER" &&
            normalizeLabel(field.label).includes("ipk"),
        );

        if (gpaField) {
          const gpaAnswerRaw = parsedAnswers[gpaField.id]?.answer_text;
          const gpaValue = parseNumberAnswer(gpaAnswerRaw);
          if (gpaValue === null) {
            return errorResponse(res, 'Field "IPK" harus berupa angka', 400);
          }
          if (gpaValue < gpaMinimum) {
            return errorResponse(
              res,
              `IPK tidak mencukupi syarat minimum (min: ${gpaMinimum})`,
              400,
            );
          }
        } else {
          console.warn(
            `Schema ${schema.id} memiliki gpa_minimum=${gpaMinimum}, tetapi field IPK tidak ditemukan di form_fields`,
          );
        }
      }

      const semesterMinimum =
        schema.semester_minimum !== null
          ? Number(schema.semester_minimum)
          : null;
      if (Number.isFinite(semesterMinimum)) {
        const semesterField = formFields.find(
          (field) =>
            field.type === "NUMBER" &&
            normalizeLabel(field.label).includes("semester"),
        );

        if (semesterField) {
          const semesterAnswerRaw =
            parsedAnswers[semesterField.id]?.answer_text;
          const semesterValue = parseNumberAnswer(semesterAnswerRaw);
          if (semesterValue === null) {
            return errorResponse(
              res,
              'Field "Semester" harus berupa angka',
              400,
            );
          }
          if (!Number.isInteger(semesterValue)) {
            return errorResponse(
              res,
              'Field "Semester" harus berupa bilangan bulat',
              400,
            );
          }
          if (semesterValue < semesterMinimum) {
            return errorResponse(
              res,
              `Semester tidak mencukupi syarat minimum (min: ${semesterMinimum})`,
              400,
            );
          }
        } else {
          console.warn(
            `Schema ${schema.id} memiliki semester_minimum=${semesterMinimum}, tetapi field Semester tidak ditemukan di form_fields`,
          );
        }
      }
    }

    let application = await Application.findOne({
      where: {
        schema_id: schemaId,
        student_id: userId,
      },
    });

    const schemaStudyProgramMapping =
      await ScholarshipSchemaStudyProgram.findOne({
        where: {
          schema_id: schemaId,
          study_program_id: user.study_program_id,
        },
        attributes: ["id"],
      });

    if (!schemaStudyProgramMapping) {
      return errorResponse(
        res,
        "Program studi Anda belum terhubung dengan skema ini",
        400,
      );
    }

    if (!application) {
      application = await Application.create({
        schema_id: schemaId,
        student_id: userId,
        schema_study_program_id: schemaStudyProgramMapping.id,
        status: isDraft ? "DRAFT" : "MENUNGGU_VERIFIKASI",
        submitted_at: isDraft ? null : new Date(),
      });
    } else {
      await application.update({
        schema_study_program_id: schemaStudyProgramMapping.id,
      });

      if (!isDraft && application.status === "DRAFT") {
        await application.update({
          status: "MENUNGGU_VERIFIKASI",
          submitted_at: new Date(),
        });
      } else if (application.status !== "DRAFT" && !isDraft) {
        return errorResponse(
          res,
          `Anda sudah mendaftar skema ini dengan status: ${application.status}`,
          400,
        );
      }
    }

    const existingAnswers = await FormAnswer.findAll({
      where: { application_id: application.id },
      attributes: ["id"],
    });

    if (existingAnswers.length > 0) {
      await FormAnswerOption.destroy({
        where: {
          answer_id: existingAnswers.map((answer) => answer.id),
        },
      });
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
        original_filename: null,
      };

      if (field.type === "FILE") {
        const uploadedFile = req.files?.find(
          (file) => file.fieldname === `field_${field.id}`,
        );
        if (uploadedFile) {
          answerData.file_path = uploadedFile.path;
          answerData.mime_type = uploadedFile.mimetype;
          answerData.uploaded_at = new Date();
          answerData.original_filename = uploadedFile.originalname;
        } else if (fieldAnswer?.file_path) {
          answerData.file_path = fieldAnswer.file_path;
          answerData.mime_type = fieldAnswer.mime_type;
          answerData.uploaded_at = new Date();
          answerData.original_filename = fieldAnswer.original_filename || null;
        }

        const previousFileId = req.body[`use_previous_file_${field.id}`];
        if (!answerData.file_path && previousFileId) {
          const prevAnswer = await FormAnswer.findByPk(previousFileId, {
            attributes: ["id", "file_path", "mime_type", "original_filename"],
          });
          if (prevAnswer?.file_path) {
            const ext = path.extname(prevAnswer.file_path) || ".pdf";
            const copyName = `prev_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
            const baseDir = path.join(
              "uploads",
              "applications",
              req.user.id,
              "documents",
            );
            const destPath = path.join(baseDir, copyName);
            try {
              const srcPath = path.resolve(prevAnswer.file_path);
              if (fs.existsSync(srcPath)) {
                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.copyFileSync(srcPath, destPath);
                answerData.file_path = destPath;
                answerData.mime_type = prevAnswer.mime_type;
                answerData.uploaded_at = new Date();
                answerData.original_filename = prevAnswer.original_filename;
              }
            } catch (copyErr) {
              console.error("Error copying previous file:", copyErr);
            }
          }
        }
      } else if (!isOptionFieldType(field.type)) {
        if (fieldAnswer?.answer_text) {
          answerData.answer_text = fieldAnswer.answer_text;
        }
      }

      const selectedOptionIds = isOptionFieldType(field.type)
        ? normalizeSelectedOptionIds(
            fieldAnswer?.selected_option_ids || fieldAnswer?.answer_text,
          )
        : [];

      if (
        answerData.answer_text ||
        answerData.file_path ||
        selectedOptionIds.length
      ) {
        const createdAnswer = await FormAnswer.create(answerData);

        if (selectedOptionIds.length > 0) {
          const validOptions = await FormFieldOption.findAll({
            where: {
              id: selectedOptionIds,
              field_id: field.id,
            },
            attributes: ["id"],
          });

          if (validOptions.length !== selectedOptionIds.length) {
            throw new Error(`Pilihan untuk field ${field.label} tidak valid`);
          }

          await FormAnswerOption.bulkCreate(
            validOptions.map((option) => ({
              answer_id: createdAnswer.id,
              option_id: option.id,
            })),
          );
        }

        return createdAnswer;
      }

      return null;
    });

    await Promise.all(answerPromises);

    await ApplicationDocument.destroy({
      where: { application_id: application.id },
    });

    const documentPromises = formFields
      .filter((field) => field.type === "FILE")
      .map(async (field) => {
        const fieldAnswer = parsedAnswers[field.id];
        const uploadedFile = req.files?.find(
          (file) => file.fieldname === `field_${field.id}`,
        );

        if (!uploadedFile && !fieldAnswer?.file_path) {
          return null;
        }

        const schemaDocumentId = schemaDocumentMap.get(
          normalizeDocumentName(field.label),
        );

        if (!schemaDocumentId) {
          throw new Error(
            `Schema document tidak ditemukan untuk field: ${field.label}`,
          );
        }

        let documentData = {
          application_id: application.id,
          schema_id: schemaId,
          schema_document_id: schemaDocumentId,
          file_path: uploadedFile ? uploadedFile.path : fieldAnswer.file_path,
          mime_type: uploadedFile
            ? uploadedFile.mimetype
            : fieldAnswer.mime_type || null,
          size_bytes: uploadedFile
            ? uploadedFile.size
            : fieldAnswer.size_bytes || null,
          original_filename: uploadedFile
            ? uploadedFile.originalname
            : fieldAnswer.original_filename || null,
        };

        return ApplicationDocument.create(documentData);
      });

    await Promise.all(documentPromises);

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

const getPreviousApplicationFiles = async (req, res) => {
  try {
    const user = req.user;
    let studentId = user.student?.id;

    if (!studentId) {
      const student = await Student.findOne({
        where: { id: user.id },
        attributes: ["id"],
      });
      if (!student) {
        return errorResponse(res, "User bukan mahasiswa", 400);
      }
      studentId = student.id;
    }

    const previousFiles = await FormAnswer.findAll({
      attributes: [
        "id",
        "application_id",
        "field_id",
        "file_path",
        "mime_type",
        "original_filename",
        "uploaded_at",
      ],
      include: [
        {
          model: Application,
          as: "application",
          attributes: ["id", "schema_id", "status", "createdAt"],
          where: { student_id: studentId },
          required: true,
          include: [
            {
              model: ScholarshipSchema,
              as: "schema",
              attributes: ["id", "name", "scholarship_id"],
              include: [
                {
                  model: Scholarship,
                  as: "scholarship",
                  attributes: ["id", "name"],
                  required: true,
                },
              ],
            },
          ],
        },
        {
          model: FormField,
          as: "field",
          attributes: ["id", "label", "type"],
          required: true,
        },
      ],
      where: {
        file_path: { [Op.ne]: null },
      },
      order: [["uploaded_at", "DESC"]],
    });

    const grouped = {};
    for (const fa of previousFiles) {
      const label = (fa.field?.label || "").trim().toLowerCase();
      if (!label) continue;
      if (!grouped[label]) {
        grouped[label] = {
          field_label: fa.field?.label || "Unknown Field",
          files: [],
        };
      }
      if (grouped[label].files.length < 5) {
        const fileName =
          fa.original_filename ||
          fa.file_path?.split("\\").pop()?.split("/").pop() ||
          "File";
        grouped[label].files.push({
          id: fa.id,
          application_id: fa.application_id,
          file_path: fa.file_path,
          mime_type: fa.mime_type,
          original_filename: fileName,
          uploaded_at: fa.uploaded_at,
          scholarship_name:
            fa.application?.schema?.scholarship?.name || "Beasiswa",
          schema_name: fa.application?.schema?.name || "",
        });
      }
    }

    return successResponse(res, "Berhasil mengambil file sebelumnya", {
      files: Object.values(grouped),
    });
  } catch (error) {
    console.error("Error getting previous application files:", error);
    return errorResponse(res, "Gagal mengambil file sebelumnya", 500);
  }
};

const submitRevision = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { applicationId } = req.params;
    const { answers } = req.body;
    const userId = req.user.id;
    const uploadedFiles = req.files || [];

    const application = await Application.findOne({
      where: {
        id: applicationId,
        student_id: userId,
        status: "REVISION_NEEDED",
      },
      include: [
        {
          model: ScholarshipSchema,
          as: "schema",
          include: [
            {
              model: Scholarship,
              as: "scholarship",
              attributes: ["id", "name", "end_date"],
            },
          ],
        },
      ],
      transaction,
    });

    if (!application) {
      await transaction.rollback();
      return errorResponse(
        res,
        "Application not found or not in revision status",
        404,
      );
    }

    if (application.revision_deadline) {
      const now = new Date();
      const deadline = new Date(application.revision_deadline);

      if (now > deadline) {
        await transaction.rollback();
        return errorResponse(
          res,
          `Deadline revisi telah lewat. Deadline: ${deadline.toLocaleDateString(
            "id-ID",
            {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          )} WIB`,
          400,
        );
      }
    }

    if (application.schema.scholarship.end_date) {
      const today = new Date();
      const endDate = new Date(application.schema.scholarship.end_date);
      if (today > endDate) {
        await transaction.rollback();
        return errorResponse(
          res,
          "Batas waktu pendaftaran beasiswa telah berakhir",
          400,
        );
      }
    }

    const parsedAnswers =
      typeof answers === "string" ? JSON.parse(answers) : answers;

    const formFields = await FormField.findAll({
      where: { schema_id: application.schema_id },
      transaction,
    });

    const schemaDocuments = await ScholarshipSchemaDocument.findAll({
      where: { schema_id: application.schema_id },
      attributes: ["id", "document_name"],
      transaction,
    });

    const schemaDocumentMap = new Map(
      schemaDocuments.map((doc) => [
        normalizeDocumentName(doc.document_name),
        doc.id,
      ]),
    );

    const requiredFields = formFields.filter((field) => field.is_required);

    for (const field of requiredFields) {
      const fieldAnswer = parsedAnswers[field.id];

      if (field.type === "FILE") {
        const hasExistingFile = fieldAnswer?.file_path;
        const hasNewFile = uploadedFiles?.find(
          (file) => file.fieldname === `field_${field.id}`,
        );

        if (!hasExistingFile && !hasNewFile) {
          await transaction.rollback();
          return errorResponse(
            res,
            `Field "${field.label}" wajib diunggah`,
            400,
          );
        }
      } else if (field.type === "MULTI_SELECT") {
        const selectedOptionIds = normalizeSelectedOptionIds(
          fieldAnswer?.selected_option_ids || fieldAnswer?.answer_text,
        );

        if (selectedOptionIds.length === 0) {
          await transaction.rollback();
          return errorResponse(
            res,
            `Field "${field.label}" wajib dipilih minimal satu opsi`,
            400,
          );
        }
      } else if (field.type === "SELECT") {
        const selectedOptionIds = normalizeSelectedOptionIds(
          fieldAnswer?.selected_option_ids || fieldAnswer?.answer_text,
        );

        if (selectedOptionIds.length === 0) {
          await transaction.rollback();
          return errorResponse(
            res,
            `Field "${field.label}" wajib dipilih`,
            400,
          );
        }
      } else {
        if (
          !fieldAnswer ||
          !fieldAnswer.answer_text ||
          fieldAnswer.answer_text.trim() === ""
        ) {
          await transaction.rollback();
          return errorResponse(res, `Field "${field.label}" wajib diisi`, 400);
        }
      }
    }

    const existingAnswers = await FormAnswer.findAll({
      where: { application_id: applicationId },
      attributes: ["id"],
      transaction,
    });

    if (existingAnswers.length > 0) {
      await FormAnswerOption.destroy({
        where: {
          answer_id: existingAnswers.map((answer) => answer.id),
        },
        transaction,
      });
    }

    await FormAnswer.destroy({
      where: { application_id: applicationId },
      transaction,
    });

    const answerPromises = formFields.map(async (field) => {
      const fieldAnswer = parsedAnswers[field.id];

      if (
        !fieldAnswer &&
        !uploadedFiles?.find((file) => file.fieldname === `field_${field.id}`)
      ) {
        return null;
      }

      let answerData = {
        application_id: applicationId,
        field_id: field.id,
        answer_text: null,
        file_path: null,
        mime_type: null,
        uploaded_at: null,
        original_filename: null,
      };

      if (field.type === "FILE") {
        const uploadedFile = uploadedFiles?.find(
          (file) => file.fieldname === `field_${field.id}`,
        );
        if (uploadedFile) {
          answerData.file_path = uploadedFile.path;
          answerData.mime_type = uploadedFile.mimetype;
          answerData.uploaded_at = new Date();
          answerData.original_filename = uploadedFile.originalname;
        } else if (fieldAnswer?.file_path) {
          answerData.file_path = fieldAnswer.file_path;
          answerData.mime_type = fieldAnswer.mime_type;
          answerData.uploaded_at = new Date();
        }
      } else if (!isOptionFieldType(field.type)) {
        if (fieldAnswer?.answer_text) {
          answerData.answer_text = fieldAnswer.answer_text;
        }
      }

      const selectedOptionIds = isOptionFieldType(field.type)
        ? normalizeSelectedOptionIds(
            fieldAnswer?.selected_option_ids || fieldAnswer?.answer_text,
          )
        : [];

      if (
        answerData.answer_text ||
        answerData.file_path ||
        selectedOptionIds.length
      ) {
        const createdAnswer = await FormAnswer.create(answerData, {
          transaction,
        });

        if (selectedOptionIds.length > 0) {
          const validOptions = await FormFieldOption.findAll({
            where: {
              id: selectedOptionIds,
              field_id: field.id,
            },
            attributes: ["id"],
            transaction,
          });

          if (validOptions.length !== selectedOptionIds.length) {
            throw new Error(`Pilihan untuk field ${field.label} tidak valid`);
          }

          await FormAnswerOption.bulkCreate(
            validOptions.map((option) => ({
              answer_id: createdAnswer.id,
              option_id: option.id,
            })),
            { transaction },
          );
        }

        return createdAnswer;
      }

      return null;
    });

    await Promise.all(answerPromises);

    await ApplicationDocument.destroy({
      where: { application_id: applicationId },
      transaction,
    });

    const documentPromises = formFields
      .filter((field) => field.type === "FILE")
      .map(async (field) => {
        const fieldAnswer = parsedAnswers[field.id];
        const uploadedFile = uploadedFiles?.find(
          (file) => file.fieldname === `field_${field.id}`,
        );

        if (!uploadedFile && !fieldAnswer?.file_path) {
          return null;
        }

        const schemaDocumentId = schemaDocumentMap.get(
          normalizeDocumentName(field.label),
        );

        if (!schemaDocumentId) {
          throw new Error(
            `Schema document tidak ditemukan untuk field: ${field.label}`,
          );
        }

        let documentData = {
          application_id: applicationId,
          schema_id: application.schema_id,
          schema_document_id: schemaDocumentId,
          file_path: uploadedFile ? uploadedFile.path : fieldAnswer.file_path,
          mime_type: uploadedFile
            ? uploadedFile.mimetype
            : fieldAnswer.mime_type || null,
          size_bytes: uploadedFile
            ? uploadedFile.size
            : fieldAnswer.size_bytes || null,
        };

        return ApplicationDocument.create(documentData, { transaction });
      });

    await Promise.all(documentPromises);

    const statusBeforeRevision =
      application.status_before_revision || "MENUNGGU_VERIFIKASI";

    await application.update(
      {
        status: statusBeforeRevision,
        status_before_revision: null,
        revision_requested_by: null,
        revision_requested_at: null,
        revision_deadline: null,
        revision_submitted_at: new Date(),
      },
      { transaction },
    );

    const userName = req.user.full_name || "User";
    await ActivityLog.create(
      {
        user_id: userId,
        action: "SUBMIT_REVISION",
        entity_type: "Application",
        entity_id: applicationId,
        description: `${userName} mengirim ulang revisi untuk beasiswa "${application.schema.scholarship.name}" - Skema: ${application.schema.name}. Status dikembalikan ke ${statusBeforeRevision}`,
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      },
      { transaction },
    );

    await transaction.commit();

    return successResponse(res, "Revisi berhasil disubmit", {
      applicationId: application.id,
      newStatus: statusBeforeRevision,
      revision_submitted_at: new Date(),
      scholarship_name: application.schema.scholarship.name,
      schema_name: application.schema.name,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error submitting revision:", error);
    return errorResponse(res, "Gagal submit revisi", 500);
  }
};

module.exports = {
  getScholarshipForm,
  getPreviousApplicationFiles,
  submitApplication,
  submitRevision,
};
