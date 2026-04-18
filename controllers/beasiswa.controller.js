const {
  Scholarship,
  ScholarshipSchema,
  ScholarshipSchemaRequirement,
  ScholarshipSchemaDocument,
  ScholarshipSchemaStage,
  ScholarshipFaculty,
  ScholarshipDepartment,
  ScholarshipStudyProgram,
  ScholarshipBenefit,
  FormField,
  Faculty,
  Department,
  StudyProgram,
  User,
  ActivityLog,
  sequelize,
} = require("../models");
const { Op, or } = require("sequelize");
const { successResponse, errorResponse } = require("../utils/response");
const { getOrSetCache } = require("../utils/cacheHelper");
const { sendWhatsAppMessage } = require("../utils/fonnte");
const { buildNewScholarshipMessage } = require("../utils/whatsappTemplate");

const normalizeWhatsAppTarget = (phoneNumber) => {
  if (!phoneNumber) return null;

  const digitsOnly = String(phoneNumber).replace(/[^0-9]/g, "");
  if (!digitsOnly) return null;

  if (digitsOnly.startsWith("62")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return `62${digitsOnly.slice(1)}`;
  return digitsOnly;
};

const isUserEligibleForScholarship = (user, eligibilitySets) => {
  const { facultyIds, departmentIds, studyProgramIds } = eligibilitySets;

  if (facultyIds.size > 0 && !facultyIds.has(user.faculty_id)) return false;
  if (departmentIds.size > 0 && !departmentIds.has(user.department_id))
    return false;
  if (studyProgramIds.size > 0 && !studyProgramIds.has(user.study_program_id))
    return false;

  return true;
};

const notifyEligibleStudentsForNewScholarship = async (
  scholarship,
  parsedSchemas,
) => {
  if (!process.env.FONNTE_TOKEN) {
    return;
  }

  const eligibilitySets = {
    facultyIds: new Set(),
    departmentIds: new Set(),
    studyProgramIds: new Set(),
  };

  parsedSchemas.forEach((schema) => {
    (schema.faculties || []).forEach((id) =>
      eligibilitySets.facultyIds.add(id),
    );
    (schema.departments || []).forEach((id) =>
      eligibilitySets.departmentIds.add(id),
    );
    (schema.study_programs || []).forEach((id) =>
      eligibilitySets.studyProgramIds.add(id),
    );
  });

  const mahasiswaUsers = await User.findAll({
    where: {
      role: "MAHASISWA",
      is_active: true,
      phone_number: { [Op.ne]: null },
    },
    attributes: [
      "id",
      "full_name",
      "phone_number",
      "faculty_id",
      "department_id",
      "study_program_id",
    ],
  });

  const eligibleRecipients = new Map();
  mahasiswaUsers.forEach((user) => {
    if (!isUserEligibleForScholarship(user, eligibilitySets)) return;

    const normalizedTarget = normalizeWhatsAppTarget(user.phone_number);
    if (!normalizedTarget) return;

    if (!eligibleRecipients.has(normalizedTarget)) {
      eligibleRecipients.set(normalizedTarget, user.full_name);
    }
  });

  if (eligibleRecipients.size === 0) {
    console.log(
      `Tidak ada mahasiswa eligible untuk notifikasi beasiswa ${scholarship.id}`,
    );
    return;
  }

  for (const [target, recipientName] of eligibleRecipients.entries()) {
    const message = buildNewScholarshipMessage({
      scholarship,
      totalSchemas: parsedSchemas.length,
      recipientName,
    });
    await sendWhatsAppMessage(target, message);
  }
};

const getAllScholarships = async (req, res) => {
  try {
    const cacheKey = "all_scholarships";

    const transformedData = await getOrSetCache(cacheKey, 600, async () => {
      const scholarships = await Scholarship.findAll({
        attributes: [
          "id",
          "name",
          "organizer",
          "year",
          "description",
          "logo_path",
          "scholarship_value",
          "duration_semesters",
          "start_date",
          "end_date",
          "is_active",
          "is_external",
          "verification_level",
          "website_url",
          "contact_person_name",
          "contact_person_email",
          "contact_person_phone",
          "createdAt",
        ],
        include: [
          {
            model: ScholarshipSchema,
            as: "schemas",
            required: false,
            attributes: [
              "id",
              "name",
              "quota",
              "gpa_minimum",
              "semester_minimum",
              "is_active",
              [
                sequelize.literal(`(
                  SELECT COUNT(*) FROM scholarship_schema_requirements
                  WHERE scholarship_schema_requirements.schema_id = \`schemas\`.\`id\`
                )`),
                "requirements_count",
              ],
              [
                sequelize.literal(`(
                  SELECT COUNT(*) FROM scholarship_schema_documents
                  WHERE scholarship_schema_documents.schema_id = \`schemas\`.\`id\`
                )`),
                "documents_count",
              ],
              [
                sequelize.literal(`(
                  SELECT COUNT(*) FROM scholarship_schema_stages
                  WHERE scholarship_schema_stages.schema_id = \`schemas\`.\`id\`
                )`),
                "stages_count",
              ],
            ],
          },
          {
            model: ScholarshipBenefit,
            as: "benefits",
            attributes: ["benefit_text"],
          },
        ],
        order: [
          ["end_date", "DESC"],
          ["createdAt", "ASC"],
        ],
      });

      if (scholarships.length === 0) return [];

      const scholarshipIds = scholarships.map((s) => s.id);

      const [faculties, departments, studyPrograms] = await Promise.all([
        ScholarshipFaculty.findAll({
          where: { scholarship_id: scholarshipIds },
          include: [
            { model: Faculty, as: "faculty", attributes: ["id", "name"] },
          ],
          attributes: ["scholarship_id"],
        }),
        ScholarshipDepartment.findAll({
          where: { scholarship_id: scholarshipIds },
          include: [
            { model: Department, as: "department", attributes: ["id", "name"] },
          ],
          attributes: ["scholarship_id"],
        }),
        ScholarshipStudyProgram.findAll({
          where: { scholarship_id: scholarshipIds },
          include: [
            {
              model: StudyProgram,
              as: "study_program",
              attributes: ["id", "name", "degree"],
            },
          ],
          attributes: ["scholarship_id"],
        }),
      ]);

      const facultiesMap = {};
      faculties.forEach((f) => {
        if (!facultiesMap[f.scholarship_id])
          facultiesMap[f.scholarship_id] = [];
        if (f.faculty)
          facultiesMap[f.scholarship_id].push({
            id: f.faculty.id,
            name: f.faculty.name,
          });
      });

      const departmentsMap = {};
      departments.forEach((d) => {
        if (!departmentsMap[d.scholarship_id])
          departmentsMap[d.scholarship_id] = [];
        if (d.department)
          departmentsMap[d.scholarship_id].push({
            id: d.department.id,
            name: d.department.name,
          });
      });

      const studyProgramsMap = {};
      studyPrograms.forEach((sp) => {
        if (!studyProgramsMap[sp.scholarship_id])
          studyProgramsMap[sp.scholarship_id] = [];
        if (sp.studyProgram)
          studyProgramsMap[sp.scholarship_id].push({
            id: sp.studyProgram.id,
            name: sp.studyProgram.name,
            degree: sp.studyProgram.degree,
          });
      });

      return scholarships.map((scholarship) => {
        const schemas = scholarship.schemas || [];
        const sid = scholarship.id;

        return {
          id: sid,
          name: scholarship.name,
          organizer: scholarship.organizer,
          year: scholarship.year,
          description: scholarship.description,
          logo_path: scholarship.logo_path,
          scholarship_value: scholarship.scholarship_value,
          duration_semesters: scholarship.duration_semesters,
          start_date: scholarship.start_date,
          end_date: scholarship.end_date,
          is_active: scholarship.is_active,
          is_external: scholarship.is_external,
          verification_level: scholarship.verification_level,
          website_url: scholarship.website_url,
          contact_person_name: scholarship.contact_person_name,
          contact_person_email: scholarship.contact_person_email,
          contact_person_phone: scholarship.contact_person_phone,

          benefits: scholarship.benefits?.map((b) => b.benefit_text) || [],

          schemas: schemas.map((schema) => ({
            id: schema.id,
            name: schema.name,
            quota: schema.quota,
            gpa_minimum: schema.gpa_minimum,
            semester_minimum: schema.semester_minimum,
            is_active: schema.is_active,
            requirements_count:
              parseInt(schema.dataValues.requirements_count) || 0,
            documents_count: parseInt(schema.dataValues.documents_count) || 0,
            stages_count: parseInt(schema.dataValues.stages_count) || 0,
          })),

          total_schemas: schemas.length,
          active_schemas: schemas.filter((s) => s.is_active).length,
          min_gpa: schemas.reduce(
            (min, s) =>
              s.gpa_minimum && (!min || s.gpa_minimum < min)
                ? s.gpa_minimum
                : min,
            null,
          ),
          min_semester: schemas.reduce(
            (min, s) =>
              s.semester_minimum && (!min || s.semester_minimum < min)
                ? s.semester_minimum
                : min,
            null,
          ),
          total_quota: schemas.reduce((sum, s) => sum + (s.quota || 0), 0),

          faculties: facultiesMap[sid] || [],
          departments: departmentsMap[sid] || [],
          study_programs: studyProgramsMap[sid] || [],
        };
      });
    });

    return successResponse(
      res,
      "Daftar beasiswa berhasil didapatkan",
      transformedData,
    );
  } catch (error) {
    console.error("Error fetching all scholarships:", error);
    return errorResponse(res, "Gagal mendapatkan daftar beasiswa", 500);
  }
};

const createScholarship = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      name,
      organizer,
      year,
      description,
      is_external,
      verification_level,
      start_date,
      end_date,
      contact_person_name,
      contact_person_email,
      contact_person_phone,
      website_url,
      scholarship_value,
      duration_semesters,
      is_active,
      schemas,
      benefits,
    } = req.body;

    const isExternalBeasiswa = is_external === true || is_external === "true";

    if (
      !name ||
      !organizer ||
      !year ||
      !description ||
      !contact_person_name ||
      !contact_person_email ||
      !contact_person_phone ||
      !scholarship_value ||
      !duration_semesters ||
      !verification_level
    ) {
      return errorResponse(res, "Field wajib harus diisi", 400);
    }

    if (isExternalBeasiswa && !website_url) {
      return errorResponse(
        res,
        "Website URL wajib untuk beasiswa eksternal",
        400,
      );
    }

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return errorResponse(
        res,
        "Tanggal selesai pendaftaran tidak boleh kurang dari tanggal mulai",
        400,
      );
    }

    let logoPath = null;
    if (req.files && req.files.logo_file && req.files.logo_file[0]) {
      const logoFileInfo = req.filesInfo.logo_file[0];
      logoPath = logoFileInfo.url;
    }

    let requirementFileUrl = null;
    if (
      req.files &&
      req.files.requirement_file &&
      req.files.requirement_file[0]
    ) {
      const requirementFileInfo = req.filesInfo.requirement_file[0];
      requirementFileUrl = requirementFileInfo.url;
    }

    const scholarship = await Scholarship.create(
      {
        name,
        organizer,
        year: parseInt(year),
        description,
        is_external: isExternalBeasiswa,
        verification_level,
        start_date,
        end_date,
        contact_person_name,
        contact_person_email,
        contact_person_phone,
        scholarship_value: parseFloat(scholarship_value),
        duration_semesters: parseInt(duration_semesters),
        website_url: website_url || null,
        is_active: is_active !== undefined ? is_active : true,
        logo_path: logoPath,
        created_by: req.user.id,
        semester_minimum: null,
        gpa_minimum: null,
        quota: null,
      },
      { transaction },
    );

    if (benefits && benefits.length > 0) {
      const parsedBenefits =
        typeof benefits === "string" ? JSON.parse(benefits) : benefits;
      const benefitData = parsedBenefits.map((benefit) => ({
        scholarship_id: scholarship.id,
        benefit_text: benefit,
      }));
      await ScholarshipBenefit.bulkCreate(benefitData, { transaction });
    }

    const parsedSchemas =
      typeof schemas === "string" ? JSON.parse(schemas) : schemas;

    if (!parsedSchemas || parsedSchemas.length === 0) {
      await transaction.rollback();
      return errorResponse(res, "Minimal satu schema harus dibuat", 400);
    }

    for (const schemaData of parsedSchemas) {
      const {
        name: schemaName,
        description: schemaDescription,
        quota,
        gpa_minimum,
        semester_minimum,
        requirements,
        documents,
        stages,
        faculties,
        departments,
        study_programs,
      } = schemaData;

      if (!schemaName || !semester_minimum) {
        await transaction.rollback();
        return errorResponse(
          res,
          "Nama schema dan semester minimum wajib diisi",
          400,
        );
      }

      const schema = await ScholarshipSchema.create(
        {
          scholarship_id: scholarship.id,
          name: schemaName,
          description: schemaDescription || null,
          quota: quota ? parseInt(quota) : null,
          gpa_minimum: gpa_minimum ? parseFloat(gpa_minimum) : null,
          semester_minimum: semester_minimum
            ? parseInt(semester_minimum)
            : null,
          is_active: true,
        },
        { transaction },
      );

      if (requirements && requirements.length > 0) {
        const requirementData = requirements.map((req) => {
          let requirementEntry = {
            schema_id: schema.id,
            requirement_type: req.type,
          };

          if (req.type === "TEXT") {
            requirementEntry.requirement_text = req.text;
            requirementEntry.requirement_file = null;
          } else if (req.type === "FILE") {
            if (requirementFileUrl) {
              requirementEntry.requirement_file = requirementFileUrl;
              requirementEntry.requirement_text = null;
            } else {
              console.error("No file uploaded for FILE requirement");
              requirementEntry.requirement_file = null;
              requirementEntry.requirement_text = null;
            }
          }

          return requirementEntry;
        });

        await ScholarshipSchemaRequirement.bulkCreate(requirementData, {
          transaction,
        });
      }

      if (documents && documents.length > 0) {
        const documentData = documents.map((doc) => ({
          schema_id: schema.id,
          document_name: doc,
        }));
        await ScholarshipSchemaDocument.bulkCreate(documentData, {
          transaction,
        });

        if (!isExternalBeasiswa) {
          const formFields = documents.map((doc, index) => ({
            schema_id: schema.id,
            label: doc,
            type: "FILE",
            is_required: true,
            order_no: index + 1,
          }));
          await FormField.bulkCreate(formFields, { transaction });
        }
      }

      if (stages && stages.length > 0) {
        const stageData = stages.map((stage, index) => ({
          schema_id: schema.id,
          stage_name: stage.name || stage.stage_name,
          order_no: stage.order_no || index + 1,
        }));
        await ScholarshipSchemaStage.bulkCreate(stageData, { transaction });
      }

      if (faculties && faculties.length > 0) {
        const facultyData = faculties.map((facultyId) => ({
          scholarship_id: scholarship.id,
          faculty_id: facultyId,
        }));
        await ScholarshipFaculty.bulkCreate(facultyData, { transaction });
      }

      if (departments && departments.length > 0) {
        const departmentData = departments.map((departmentId) => ({
          scholarship_id: scholarship.id,
          department_id: departmentId,
        }));
        await ScholarshipDepartment.bulkCreate(departmentData, { transaction });
      }

      if (study_programs && study_programs.length > 0) {
        const studyProgramData = study_programs.map((studyProgramId) => ({
          scholarship_id: scholarship.id,
          study_program_id: studyProgramId,
        }));
        await ScholarshipStudyProgram.bulkCreate(studyProgramData, {
          transaction,
        });
      }
    }

    await transaction.commit();

    const createdScholarship = await Scholarship.findByPk(scholarship.id, {
      include: [
        {
          model: ScholarshipBenefit,
          as: "benefits",
          attributes: ["id", "benefit_text"],
        },
        {
          model: Faculty,
          as: "faculties",
          through: { attributes: [] },
          attributes: ["id", "name"],
        },
        {
          model: Department,
          as: "departments",
          through: { attributes: [] },
          attributes: ["id", "name"],
          include: [
            {
              model: Faculty,
              as: "faculty",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: StudyProgram,
          as: "studyPrograms",
          through: { attributes: [] },
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
    });

    const createdSchemas = await ScholarshipSchema.findAll({
      where: { scholarship_id: scholarship.id },
      attributes: [
        "id",
        "name",
        "description",
        "quota",
        "gpa_minimum",
        "semester_minimum",
        "is_active",
      ],
      include: [
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
          attributes: ["id", "document_name", "template_file"],
        },
        {
          model: ScholarshipSchemaStage,
          as: "stages",
          attributes: ["id", "stage_name", "order_no"],
        },
        {
          model: FormField,
          as: "formFields",
          attributes: ["id", "label", "type", "is_required", "order_no"],
        },
      ],
    });

    const result = {
      ...createdScholarship.toJSON(),
      schemas: createdSchemas.map((s) => ({
        ...s.toJSON(),
        stages: (s.stages || []).sort((a, b) => a.order_no - b.order_no),
      })),
    };

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" dengan ${parsedSchemas.length} schema telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    try {
      await notifyEligibleStudentsForNewScholarship(scholarship, parsedSchemas);
    } catch (waError) {
      console.error(
        "Gagal mengirim notifikasi WhatsApp beasiswa:",
        waError.response?.data || waError.message,
      );
    }

    return successResponse(res, "Beasiswa berhasil dibuat", result);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating scholarship:", error);
    return errorResponse(res, "Gagal membuat beasiswa", 500);
  }
};

const getBeasiswaById = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarship.findByPk(id, {
      include: [
        {
          model: ScholarshipBenefit,
          as: "benefits",
          attributes: ["id", "benefit_text"],
        },
        {
          model: Faculty,
          as: "faculties",
          through: { attributes: [] },
          attributes: ["id", "name"],
          order: [["name", "ASC"]],
        },
        {
          model: Department,
          as: "departments",
          through: { attributes: [] },
          attributes: ["id", "name"],
          order: [["name", "ASC"]],
          include: [
            {
              model: Faculty,
              as: "faculty",
              attributes: ["id", "name"],
              order: [["name", "ASC"]],
            },
          ],
        },
        {
          model: StudyProgram,
          as: "studyPrograms",
          through: { attributes: [] },
          attributes: ["id", "name", "degree"],
          order: [["name", "ASC"]],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name"],
              order: [["name", "ASC"]],
              include: [
                {
                  model: Faculty,
                  as: "faculty",
                  attributes: ["id", "name"],
                  order: [["name", "ASC"]],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }
    if (!scholarship.is_active) {
      return errorResponse(res, "Beasiswa tidak aktif", 403);
    }

    const schemas = await ScholarshipSchema.findAll({
      where: { scholarship_id: id },
      attributes: [
        "id",
        "name",
        "description",
        "quota",
        "gpa_minimum",
        "semester_minimum",
        "is_active",
      ],
      include: [
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
          attributes: ["id", "document_name", "template_file"],
        },
        {
          model: ScholarshipSchemaStage,
          as: "stages",
          attributes: ["id", "stage_name", "order_no"],
          order: [["order_no", "ASC"]],
        },
      ],
    });

    const schemasFormatted = schemas.map((schema) => ({
      ...schema.toJSON(),
      stages: (schema.stages || []).sort((a, b) => a.order_no - b.order_no),
    }));

    const result = {
      ...scholarship.toJSON(),
      schemas: schemasFormatted,
    };

    return successResponse(res, "Detail beasiswa berhasil didapatkan", result);
  } catch (error) {
    console.error("Error fetching scholarship by ID for user:", error);
    return errorResponse(res, "Gagal mendapatkan detail beasiswa", 500);
  }
};

const updateScholarship = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const {
      name,
      organizer,
      year,
      description,
      is_external,
      verification_level,
      start_date,
      end_date,
      contact_person_name,
      contact_person_email,
      contact_person_phone,
      website_url,
      scholarship_value,
      duration_semesters,
      is_active,
      schemas,
      benefits,
    } = req.body;

    const scholarship = await Scholarship.findByPk(id);
    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    const isExternalBeasiswa = is_external === true || is_external === "true";

    if (
      !name ||
      !organizer ||
      !year ||
      !description ||
      !contact_person_name ||
      !contact_person_email ||
      !contact_person_phone ||
      !scholarship_value ||
      !duration_semesters ||
      !verification_level
    ) {
      return errorResponse(res, "Field wajib harus diisi", 400);
    }

    if (isExternalBeasiswa && !website_url) {
      return errorResponse(
        res,
        "Website URL wajib untuk beasiswa eksternal",
        400,
      );
    }

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return errorResponse(
        res,
        "Tanggal selesai pendaftaran tidak boleh kurang dari tanggal mulai",
        400,
      );
    }

    let logoPath = scholarship.logo_path;
    if (req.files && req.files.logo_file && req.files.logo_file[0]) {
      const logoFileInfo = req.filesInfo.logo_file[0];
      logoPath = logoFileInfo.url;
    }

    let requirementFileUrl = null;
    if (
      req.files &&
      req.files.requirement_file &&
      req.files.requirement_file[0]
    ) {
      const requirementFileInfo = req.filesInfo.requirement_file[0];
      requirementFileUrl = requirementFileInfo.url;
    }

    await scholarship.update(
      {
        name,
        organizer,
        year: parseInt(year),
        description,
        is_external: isExternalBeasiswa,
        verification_level,
        start_date,
        end_date,
        contact_person_name,
        contact_person_email,
        contact_person_phone,
        scholarship_value: parseFloat(scholarship_value),
        duration_semesters: parseInt(duration_semesters),
        website_url: website_url || null,
        is_active: is_active !== undefined ? is_active : true,
        logo_path: logoPath,
        semester_minimum: null,
        gpa_minimum: null,
        quota: null,
      },
      { transaction },
    );

    const parsedSchemas =
      typeof schemas === "string" ? JSON.parse(schemas) : schemas;

    if (!parsedSchemas || parsedSchemas.length === 0) {
      await transaction.rollback();
      return errorResponse(res, "Minimal satu schema harus ada", 400);
    }

    const existingSchemas = await ScholarshipSchema.findAll({
      where: { scholarship_id: id },
      attributes: ["id"],
    });
    const existingSchemaIds = existingSchemas.map((s) => s.id);

    const schemasToKeep = [];

    for (const schemaData of parsedSchemas) {
      const {
        id: schemaId,
        name: schemaName,
        description: schemaDescription,
        quota,
        gpa_minimum,
        semester_minimum,
        requirements,
        documents,
        stages,
        is_active: schemaIsActive,
      } = schemaData;

      if (!schemaName || !semester_minimum) {
        await transaction.rollback();
        return errorResponse(
          res,
          "Nama schema dan semester minimum wajib diisi",
          400,
        );
      }

      let schema;

      if (schemaId && !schemaId.toString().startsWith("new-")) {
        schema = await ScholarshipSchema.findByPk(schemaId);
        if (schema) {
          await schema.update(
            {
              name: schemaName,
              description: schemaDescription || null,
              quota: quota ? parseInt(quota) : null,
              gpa_minimum: gpa_minimum ? parseFloat(gpa_minimum) : null,
              semester_minimum: parseInt(semester_minimum),
              is_active: schemaIsActive !== undefined ? schemaIsActive : true,
            },
            { transaction },
          );
          schemasToKeep.push(schemaId);
        }
      } else {
        schema = await ScholarshipSchema.create(
          {
            scholarship_id: scholarship.id,
            name: schemaName,
            description: schemaDescription || null,
            quota: quota ? parseInt(quota) : null,
            gpa_minimum: gpa_minimum ? parseFloat(gpa_minimum) : null,
            semester_minimum: parseInt(semester_minimum),
            is_active: schemaIsActive !== undefined ? schemaIsActive : true,
          },
          { transaction },
        );
        schemasToKeep.push(schema.id);
      }

      await ScholarshipSchemaRequirement.destroy({
        where: { schema_id: schema.id },
        transaction,
      });
      await ScholarshipSchemaDocument.destroy({
        where: { schema_id: schema.id },
        transaction,
      });
      await ScholarshipSchemaStage.destroy({
        where: { schema_id: schema.id },
        transaction,
      });
      await FormField.destroy({
        where: { schema_id: schema.id },
        transaction,
      });

      if (requirements && requirements.length > 0) {
        const requirementData = requirements.map((req) => {
          let requirementEntry = {
            schema_id: schema.id,
            requirement_type: req.type,
          };

          if (req.type === "TEXT") {
            requirementEntry.requirement_text = req.text;
            requirementEntry.requirement_file = null;
          } else if (req.type === "FILE") {
            if (requirementFileUrl) {
              requirementEntry.requirement_file = requirementFileUrl;
            } else if (req.existingFile) {
              requirementEntry.requirement_file = req.existingFile;
            } else {
              requirementEntry.requirement_file = null;
            }
            requirementEntry.requirement_text = null;
          }

          return requirementEntry;
        });

        await ScholarshipSchemaRequirement.bulkCreate(requirementData, {
          transaction,
        });
      }

      if (documents && documents.length > 0) {
        const documentData = documents.map((doc) => ({
          schema_id: schema.id,
          document_name: doc,
        }));
        await ScholarshipSchemaDocument.bulkCreate(documentData, {
          transaction,
        });

        if (!isExternalBeasiswa) {
          const formFields = documents.map((doc, index) => ({
            schema_id: schema.id,
            label: doc,
            type: "FILE",
            is_required: true,
            order_no: index + 1,
          }));
          await FormField.bulkCreate(formFields, { transaction });
        }
      }

      if (stages && stages.length > 0) {
        const stageData = stages.map((stage, index) => ({
          schema_id: schema.id,
          stage_name: stage.name || stage.stage_name,
          order_no: stage.order_no || index + 1,
        }));
        await ScholarshipSchemaStage.bulkCreate(stageData, { transaction });
      }
    }

    const schemasToDelete = existingSchemaIds.filter(
      (id) => !schemasToKeep.includes(id),
    );
    if (schemasToDelete.length > 0) {
      await ScholarshipSchemaRequirement.destroy({
        where: { schema_id: schemasToDelete },
        transaction,
      });
      await ScholarshipSchemaDocument.destroy({
        where: { schema_id: schemasToDelete },
        transaction,
      });
      await ScholarshipSchemaStage.destroy({
        where: { schema_id: schemasToDelete },
        transaction,
      });
      await FormField.destroy({
        where: { schema_id: schemasToDelete },
        transaction,
      });

      await ScholarshipSchema.destroy({
        where: { id: schemasToDelete },
        transaction,
      });
    }

    await ScholarshipFaculty.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipDepartment.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipStudyProgram.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipBenefit.destroy({
      where: { scholarship_id: id },
      transaction,
    });

    const allFaculties = new Set();
    const allDepartments = new Set();
    const allStudyPrograms = new Set();

    parsedSchemas.forEach((schema) => {
      (schema.faculties || []).forEach((id) => allFaculties.add(id));
      (schema.departments || []).forEach((id) => allDepartments.add(id));
      (schema.study_programs || []).forEach((id) => allStudyPrograms.add(id));
    });

    if (allFaculties.size > 0) {
      const facultyData = Array.from(allFaculties).map((facultyId) => ({
        scholarship_id: id,
        faculty_id: facultyId,
      }));
      await ScholarshipFaculty.bulkCreate(facultyData, { transaction });
    }

    if (allDepartments.size > 0) {
      const departmentData = Array.from(allDepartments).map((departmentId) => ({
        scholarship_id: id,
        department_id: departmentId,
      }));
      await ScholarshipDepartment.bulkCreate(departmentData, { transaction });
    }

    if (allStudyPrograms.size > 0) {
      const studyProgramData = Array.from(allStudyPrograms).map(
        (studyProgramId) => ({
          scholarship_id: id,
          study_program_id: studyProgramId,
        }),
      );
      await ScholarshipStudyProgram.bulkCreate(studyProgramData, {
        transaction,
      });
    }

    if (benefits) {
      const parsedBenefits =
        typeof benefits === "string" ? JSON.parse(benefits) : benefits;
      if (parsedBenefits && parsedBenefits.length > 0) {
        const benefitData = parsedBenefits.map((benefit) => ({
          scholarship_id: id,
          benefit_text: benefit,
        }));
        await ScholarshipBenefit.bulkCreate(benefitData, { transaction });
      }
    }

    await transaction.commit();

    const updatedScholarship = await Scholarship.findByPk(id, {
      include: [
        {
          model: ScholarshipBenefit,
          as: "benefits",
          attributes: ["id", "benefit_text"],
        },
        {
          model: Faculty,
          as: "faculties",
          through: { attributes: [] },
          attributes: ["id", "name"],
        },
        {
          model: Department,
          as: "departments",
          through: { attributes: [] },
          attributes: ["id", "name"],
          include: [
            {
              model: Faculty,
              as: "faculty",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: StudyProgram,
          as: "studyPrograms",
          through: { attributes: [] },
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
    });

    const updatedSchemas = await ScholarshipSchema.findAll({
      where: { scholarship_id: id },
      attributes: [
        "id",
        "name",
        "description",
        "quota",
        "gpa_minimum",
        "semester_minimum",
        "is_active",
      ],
      include: [
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
          attributes: ["id", "document_name", "template_file"],
        },
        {
          model: ScholarshipSchemaStage,
          as: "stages",
          attributes: ["id", "stage_name", "order_no"],
        },
        {
          model: FormField,
          as: "formFields",
          attributes: ["id", "label", "type", "is_required", "order_no"],
        },
      ],
    });

    const result = {
      ...updatedScholarship.toJSON(),
      schemas: updatedSchemas.map((s) => ({
        ...s.toJSON(),
        stages: (s.stages || []).sort((a, b) => a.order_no - b.order_no),
      })),
    };

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "UPDATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" dengan ${parsedSchemas.length} schema telah diperbarui oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "Beasiswa berhasil diperbarui", result);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating scholarship:", error);
    return errorResponse(res, "Gagal memperbarui beasiswa", 500);
  }
};

const deactivateScholarship = async (req, res) => {
  try {
    const { id } = req.params;
    const scholarship = await Scholarship.findByPk(id);

    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    await scholarship.update({ is_active: false });

    await ScholarshipSchema.update(
      { is_active: false },
      { where: { scholarship_id: id } },
    );

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "DEACTIVATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" dan semua schema-nya telah dinonaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Beasiswa berhasil dinonaktifkan", scholarship);
  } catch (error) {
    console.error("Error deactivating scholarship:", error);
    errorResponse(res, "Gagal menonaktifkan beasiswa");
  }
};

const activateScholarship = async (req, res) => {
  try {
    const { id } = req.params;
    const scholarship = await Scholarship.findByPk(id);

    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    await scholarship.update({ is_active: true });

    await ScholarshipSchema.update(
      { is_active: true },
      { where: { scholarship_id: id } },
    );

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "ACTIVATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" dan semua schema-nya telah diaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Beasiswa berhasil diaktifkan", scholarship);
  } catch (error) {
    console.error("Error activating scholarship:", error);
    errorResponse(res, "Gagal mengaktifkan beasiswa");
  }
};

const getOtherScholarships = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 5 } = req.query;

    const otherScholarships = await Scholarship.findAll({
      where: {
        id: { [require("sequelize").Op.ne]: id },
      },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      attributes: [
        "id",
        "name",
        "organizer",
        "year",
        "logo_path",
        "scholarship_value",
        "end_date",
        "createdAt",
      ],
    });

    successResponse(
      res,
      "Beasiswa lainnya berhasil didapatkan",
      otherScholarships,
    );
  } catch (error) {
    console.error("Error fetching other scholarships:", error);
    errorResponse(res, "Gagal mendapatkan beasiswa lainnya", error);
  }
};

const getActiveScholarshipsForInfo = async (req, res) => {
  try {
    const cacheKey = "active_scholarships_info";
    const currentDate = new Date();

    const transformedData = await getOrSetCache(cacheKey, 300, async () => {
      const scholarships = await Scholarship.findAll({
        where: {
          is_active: true,
          end_date: {
            [Op.gte]: currentDate,
          },
        },
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
                attributes: ["id", "document_name", "template_file"],
              },
              {
                model: ScholarshipSchemaStage,
                as: "stages",
                attributes: ["id", "stage_name", "order_no"],
                order: [["order_no", "ASC"]],
              },
            ],
          },
          {
            model: ScholarshipBenefit,
            as: "benefits",
            attributes: ["id", "benefit_text"],
          },
        ],
        order: [
          ["end_date", "ASC"],
          ["createdAt", "DESC"],
        ],
      });

      return scholarships.map((scholarship) => ({
        id: scholarship.id,
        name: scholarship.name,
        organizer: scholarship.organizer,
        year: scholarship.year,
        description: scholarship.description,
        logo_path: scholarship.logo_path,
        scholarship_value: scholarship.scholarship_value,
        duration_semesters: scholarship.duration_semesters,
        start_date: scholarship.start_date,
        end_date: scholarship.end_date,
        is_active: scholarship.is_active,
        is_external: scholarship.is_external,
        website_url: scholarship.website_url,
        contact_person_name: scholarship.contact_person_name,
        contact_person_email: scholarship.contact_person_email,
        contact_person_phone: scholarship.contact_person_phone,

        schemas:
          scholarship.schemas?.map((schema) => ({
            id: schema.id,
            name: schema.name,
            description: schema.description,
            quota: schema.quota,
            gpa_minimum: schema.gpa_minimum,
            semester_minimum: schema.semester_minimum,
            requirements: schema.requirements || [],
            documents: schema.documents || [],
            stages: schema.stages || [],
          })) || [],

        total_schemas: scholarship.schemas?.length || 0,
        active_schemas:
          scholarship.schemas?.filter((s) => s.is_active).length || 0,

        total_quota: scholarship.schemas?.reduce(
          (sum, s) => sum + (s.quota || 0),
          0,
        ),

        min_gpa: scholarship.schemas?.reduce(
          (min, s) =>
            s.gpa_minimum && (!min || s.gpa_minimum < min)
              ? s.gpa_minimum
              : min,
          null,
        ),

        min_semester: scholarship.schemas?.reduce(
          (min, s) =>
            s.semester_minimum && (!min || s.semester_minimum < min)
              ? s.semester_minimum
              : min,
          null,
        ),

        benefits:
          scholarship.benefits?.map((b) => ({
            benefit_text: b.benefit_text,
          })) || [],
      }));
    });

    return successResponse(
      res,
      "Daftar beasiswa aktif berhasil didapatkan",
      transformedData,
    );
  } catch (error) {
    console.error("Error fetching active scholarships for info:", error);
    return errorResponse(res, "Gagal mendapatkan daftar beasiswa aktif", 500);
  }
};

const activateSchema = async (req, res) => {
  try {
    const { schemaId } = req.params;

    const schema = await ScholarshipSchema.findByPk(schemaId, {
      include: [
        {
          model: Scholarship,
          as: "scholarship",
          attributes: ["id", "name", "is_active"],
        },
      ],
    });

    if (!schema) {
      return errorResponse(res, "Schema tidak ditemukan", 404);
    }

    if (!schema.scholarship.is_active) {
      return errorResponse(
        res,
        "Tidak dapat mengaktifkan schema karena beasiswa induk tidak aktif",
        400,
      );
    }

    if (schema.is_active) {
      return errorResponse(res, "Schema sudah aktif", 400);
    }

    await schema.update({ is_active: true });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "ACTIVATE_SCHEMA",
      entity_type: "ScholarshipSchema",
      entity_id: schema.id,
      description: `Schema "${schema.name}" dari beasiswa "${schema.scholarship.name}" telah diaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Schema berhasil diaktifkan", schema);
  } catch (error) {
    console.error("Error activating schema:", error);
    errorResponse(res, "Gagal mengaktifkan schema", 500);
  }
};

const deactivateSchema = async (req, res) => {
  try {
    const { schemaId } = req.params;
    console.log("Deactivating schema with ID:", schemaId);

    const schema = await ScholarshipSchema.findByPk(schemaId, {
      include: [
        {
          model: Scholarship,
          as: "scholarship",
          attributes: ["id", "name"],
        },
      ],
    });

    if (!schema) {
      return errorResponse(res, "Schema tidak ditemukan", 404);
    }

    if (!schema.is_active) {
      return errorResponse(res, "Schema sudah nonaktif", 400);
    }

    await schema.update({ is_active: false });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "DEACTIVATE_SCHEMA",
      entity_type: "ScholarshipSchema",
      entity_id: schema.id,
      description: `Schema "${schema.name}" dari beasiswa "${schema.scholarship.name}" telah dinonaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Schema berhasil dinonaktifkan", schema);
  } catch (error) {
    console.error("Error deactivating schema:", error);
    errorResponse(res, "Gagal menonaktifkan schema", 500);
  }
};

module.exports = {
  getAllScholarships,
  createScholarship,
  getBeasiswaById,
  updateScholarship,
  deactivateScholarship,
  activateScholarship,
  getOtherScholarships,
  getActiveScholarshipsForInfo,
  activateSchema,
  deactivateSchema,
};
