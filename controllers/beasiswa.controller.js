const {
  Scholarship,
  ScholarshipSchema,
  ScholarshipSchemaRequirement,
  ScholarshipSchemaDocument,
  ScholarshipSchemaStage,
  ScholarshipSchemaStudyProgram,
  ScholarshipBenefit,
  FormField,
  Faculty,
  Department,
  StudyProgram,
  Student,
  User,
  ActivityLog,
  Application,
  ApplicationDocument,
  sequelize,
} = require("../models");
const { Op, or } = require("sequelize");
const { successResponse, errorResponse } = require("../utils/response");
const { getOrSetCache } = require("../utils/cacheHelper");
const { sendWhatsAppMessage } = require("../utils/fonnte");
const { buildNewScholarshipMessage } = require("../utils/whatsappTemplate");

const hasNonEmptyValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const normalizeWhatsAppTarget = (phoneNumber) => {
  if (!phoneNumber) return null;

  const digitsOnly = String(phoneNumber).replace(/[^0-9]/g, "");
  if (!digitsOnly) return null;

  if (digitsOnly.startsWith("62")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return `62${digitsOnly.slice(1)}`;
  return digitsOnly;
};

const isUserEligibleForSchema = (user, schema) => {
  const facultyIds = new Set(schema.faculties || []);
  const departmentIds = new Set(schema.departments || []);
  const studyProgramIds = new Set(schema.study_programs || []);

  const hasEligibilityTarget =
    facultyIds.size > 0 || departmentIds.size > 0 || studyProgramIds.size > 0;

  if (!hasEligibilityTarget) return false;

  return (
    facultyIds.has(user.faculty_id) ||
    departmentIds.has(user.department_id) ||
    studyProgramIds.has(user.study_program_id)
  );
};

const isUserEligibleForAnySchema = (user, schemas = []) => {
  return schemas.some((schema) => isUserEligibleForSchema(user, schema));
};

const notifyEligibleStudentsForNewScholarship = async (
  scholarship,
  parsedSchemas,
) => {
  if (!process.env.FONNTE_TOKEN) {
    return;
  }

  const mahasiswaUsers = await User.findAll({
    where: {
      role: "MAHASISWA",
      is_active: true,
      phone_number: { [Op.ne]: null },
    },
    attributes: ["id", "full_name", "phone_number"],
    include: [
      {
        model: Student,
        as: "student",
        attributes: ["study_program_id"],
        required: true,
        include: [
          {
            model: StudyProgram,
            as: "study_program",
            attributes: ["id", "department_id"],
            required: true,
            include: [
              {
                model: Department,
                as: "department",
                attributes: ["id", "faculty_id"],
                required: true,
              },
            ],
          },
        ],
      },
    ],
  });

  const eligibleRecipients = new Map();
  mahasiswaUsers.forEach((user) => {
    const studentStudyProgram = user.student?.study_program;
    const studentDepartment = studentStudyProgram?.department;

    const eligibilityUser = {
      faculty_id: studentDepartment?.faculty_id || null,
      department_id: studentStudyProgram?.department_id || null,
      study_program_id: user.student?.study_program_id || null,
    };

    if (!isUserEligibleForAnySchema(eligibilityUser, parsedSchemas)) return;

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
          ["is_active", "DESC"],
          [sequelize.literal("CASE WHEN end_date >= CURDATE() THEN 0 WHEN end_date IS NULL THEN 1 ELSE 2 END"), "ASC"],
          [sequelize.literal("CASE WHEN end_date >= CURDATE() THEN end_date END"), "ASC"],
          [sequelize.literal("CASE WHEN end_date < CURDATE() THEN end_date END"), "DESC"],
        ],
      });

      if (scholarships.length === 0) return [];

      const schemaIds = scholarships
        .flatMap((s) => (s.schemas || []).map((schema) => schema.id))
        .filter(Boolean);

      const schemaStudyPrograms = schemaIds.length
        ? await ScholarshipSchemaStudyProgram.findAll({
          where: { schema_id: schemaIds },
          include: [
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
          attributes: ["schema_id"],
        })
        : [];

      const addUniqueItem = (map, schemaId, item) => {
        if (!item) return;
        if (!map[schemaId]) map[schemaId] = [];
        if (!map[schemaId].some((existing) => existing.id === item.id)) {
          map[schemaId].push(item);
        }
      };

      const facultiesMap = {};
      const departmentsMap = {};
      const studyProgramsMap = {};

      schemaStudyPrograms.forEach((sp) => {
        const studyProgram = sp.study_program;
        if (studyProgram) {
          addUniqueItem(studyProgramsMap, sp.schema_id, {
            id: studyProgram.id,
            name: studyProgram.name,
            degree: studyProgram.degree,
          });
        }

        const department = studyProgram?.department;
        if (department) {
          addUniqueItem(departmentsMap, sp.schema_id, {
            id: department.id,
            name: department.name,
          });
        }

        const faculty = department?.faculty;
        if (faculty) {
          addUniqueItem(facultiesMap, sp.schema_id, {
            id: faculty.id,
            name: faculty.name,
          });
        }
      });

      return scholarships.map((scholarship) => {
        const schemas = scholarship.schemas || [];
        const schemaFaculties = [];
        const schemaDepartments = [];
        const schemaStudyPrograms = [];
        const seenFacultyIds = new Set();
        const seenDepartmentIds = new Set();
        const seenStudyProgramIds = new Set();

        return {
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
          verification_level: scholarship.verification_level,
          website_url: scholarship.website_url,
          contact_person_name: scholarship.contact_person_name,
          contact_person_email: scholarship.contact_person_email,
          contact_person_phone: scholarship.contact_person_phone,

          benefits: scholarship.benefits?.map((b) => b.benefit_text) || [],

          schemas: schemas.map((schema) => {
            const schemaFacultyList = facultiesMap[schema.id] || [];
            const schemaDepartmentList = departmentsMap[schema.id] || [];
            const schemaStudyProgramList = studyProgramsMap[schema.id] || [];

            schemaFacultyList.forEach((faculty) => {
              if (!seenFacultyIds.has(faculty.id)) {
                seenFacultyIds.add(faculty.id);
                schemaFaculties.push(faculty);
              }
            });
            schemaDepartmentList.forEach((department) => {
              if (!seenDepartmentIds.has(department.id)) {
                seenDepartmentIds.add(department.id);
                schemaDepartments.push(department);
              }
            });
            schemaStudyProgramList.forEach((studyProgram) => {
              if (!seenStudyProgramIds.has(studyProgram.id)) {
                seenStudyProgramIds.add(studyProgram.id);
                schemaStudyPrograms.push(studyProgram);
              }
            });

            return {
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
              faculties: schemaFacultyList,
              departments: schemaDepartmentList,
              study_programs: schemaStudyProgramList,
            };
          }),

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

          faculties: schemaFaculties,
          departments: schemaDepartments,
          study_programs: schemaStudyPrograms,
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
      return errorResponse(res, "Minimal satu skema harus dibuat", 400);
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

      if (!schemaName) {
        await transaction.rollback();
        return errorResponse(res, "Nama skema wajib diisi", 400);
      }

      const parsedGpaMinimum = hasNonEmptyValue(gpa_minimum)
        ? parseFloat(gpa_minimum)
        : null;
      const parsedSemesterMinimum = hasNonEmptyValue(semester_minimum)
        ? parseInt(semester_minimum)
        : null;

      const schema = await ScholarshipSchema.create(
        {
          scholarship_id: scholarship.id,
          name: schemaName,
          description: schemaDescription || null,
          quota: quota ? parseInt(quota) : null,
          gpa_minimum: parsedGpaMinimum,
          semester_minimum: parsedSemesterMinimum,
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

      if (!isExternalBeasiswa) {
        const autoEligibilityFields = [];
        let nextOrderNo = (documents?.length || 0) + 1;

        if (parsedGpaMinimum !== null) {
          autoEligibilityFields.push({
            schema_id: schema.id,
            label: "IPK",
            type: "NUMBER",
            is_required: true,
            order_no: nextOrderNo++,
          });
        }

        if (parsedSemesterMinimum !== null) {
          autoEligibilityFields.push({
            schema_id: schema.id,
            label: "Semester",
            type: "NUMBER",
            is_required: true,
            order_no: nextOrderNo++,
          });
        }

        if (autoEligibilityFields.length > 0) {
          await FormField.bulkCreate(autoEligibilityFields, { transaction });
        }
      }

      if (stages && stages.length > 0) {
        const sortedStages = [...stages].sort(
          (a, b) => (a.order_no || 0) - (b.order_no || 0),
        );
        for (let i = 1; i < sortedStages.length; i++) {
          if (
            sortedStages[i].start_date &&
            sortedStages[i - 1].start_date &&
            new Date(sortedStages[i].start_date) < new Date(sortedStages[i - 1].start_date)
          ) {
            const prevDate = new Date(sortedStages[i - 1].start_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
            const currDate = new Date(sortedStages[i].start_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
            return errorResponse(
              res,
              `"${sortedStages[i].name || "Tahapan " + (i + 1)}" dimulai ${currDate}, lebih awal dari "${sortedStages[i - 1].name || "Tahapan " + i}" yang dimulai ${prevDate}`,
              400,
            );
          }
        }

        const stageData = stages.map((stage, index) => ({
          schema_id: schema.id,
          stage_name: stage.name || stage.stage_name,
          order_no: stage.order_no || index + 1,
          start_date: stage.start_date || null,
          end_date: stage.end_date || null,
        }));
        await ScholarshipSchemaStage.bulkCreate(stageData, { transaction });
      }

      if (study_programs && study_programs.length > 0) {
        const studyProgramData = study_programs.map((studyProgramId) => ({
          schema_id: schema.id,
          study_program_id: studyProgramId,
        }));
        await ScholarshipSchemaStudyProgram.bulkCreate(studyProgramData, {
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
          attributes: ["id", "stage_name", "order_no", "start_date", "end_date"],
        },
        {
          model: FormField,
          as: "form_fields",
          attributes: ["id", "label", "type", "is_required", "order_no"],
        },
        {
          model: StudyProgram,
          as: "study_programs",
          through: { attributes: [] },
          attributes: ["id", "name", "code", "degree", "department_id"],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name", "code", "faculty_id"],
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

    const formattedSchemas = await Promise.all(
      createdSchemas.map(async (schema) => {
        const schemaJson = schema.toJSON();
        const selectedStudyPrograms = schemaJson.study_programs || [];

        const {
          eligibleFaculties,
          eligibleDepartments,
          eligibleStudyPrograms,
        } = await buildEligibilityFromStudyPrograms(selectedStudyPrograms);

        return {
          ...schemaJson,
          formFields: schemaJson.form_fields || [],
          directStudyPrograms: selectedStudyPrograms,
          studyPrograms: selectedStudyPrograms,
          faculties: eligibleFaculties,
          departments: eligibleDepartments,
          study_programs: eligibleStudyPrograms,
          eligibleFaculties,
          eligibleDepartments,
          eligibleStudyPrograms,
          effectiveFaculties: eligibleFaculties,
          effectiveDepartments: eligibleDepartments,
          effectiveStudyPrograms: eligibleStudyPrograms,
          stages: (schemaJson.stages || []).sort(
            (a, b) => a.order_no - b.order_no,
          ),
        };
      }),
    );

    const result = {
      ...createdScholarship.toJSON(),
      schemas: formattedSchemas,
    };

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" dengan ${parsedSchemas.length} skema telah dibuat oleh ${userName}.`,
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
    if (!transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error creating scholarship:", error);
    return errorResponse(res, "Gagal membuat beasiswa", 500);
  }
};

const buildEligibilityFromStudyPrograms = async (selectedStudyPrograms) => {
  const selectedStudyProgramIds = new Set(
    selectedStudyPrograms.map((sp) => sp.id),
  );

  const departmentMap = new Map();
  const facultyMap = new Map();

  selectedStudyPrograms.forEach((sp) => {
    const department = sp.department;
    const faculty = department?.faculty;

    if (department) {
      if (!departmentMap.has(department.id)) {
        departmentMap.set(department.id, {
          id: department.id,
          name: department.name,
          code: department.code,
          faculty_id: department.faculty_id,
          faculty,
          selectedStudyPrograms: [],
        });
      }

      departmentMap.get(department.id).selectedStudyPrograms.push({
        id: sp.id,
        name: sp.name,
        code: sp.code,
        degree: sp.degree,
      });
    }

    if (faculty) {
      if (!facultyMap.has(faculty.id)) {
        facultyMap.set(faculty.id, {
          id: faculty.id,
          name: faculty.name,
          code: faculty.code,
          selectedDepartments: new Map(),
        });
      }

      if (department) {
        facultyMap.get(faculty.id).selectedDepartments.set(department.id, {
          id: department.id,
          name: department.name,
          code: department.code,
        });
      }
    }
  });

  const allSelectedDepartments = Array.from(departmentMap.values());

  const eligibleDepartments = [];

  for (const department of allSelectedDepartments) {
    const allDepartmentStudyPrograms = await StudyProgram.findAll({
      where: {
        department_id: department.id,
        is_active: true,
      },
      attributes: ["id"],
    });

    const allDepartmentStudyProgramIds = allDepartmentStudyPrograms.map(
      (sp) => sp.id,
    );

    const isAllStudyProgramsSelected =
      allDepartmentStudyProgramIds.length > 0 &&
      allDepartmentStudyProgramIds.every((spId) =>
        selectedStudyProgramIds.has(spId),
      );

    if (isAllStudyProgramsSelected) {
      eligibleDepartments.push({
        id: department.id,
        name: department.name,
        code: department.code,
        faculty: department.faculty,
      });
    }
  }

  const eligibleDepartmentIds = new Set(eligibleDepartments.map((d) => d.id));
  const eligibleFaculties = [];

  const allFacultiesFromSelection = Array.from(facultyMap.values());

  for (const faculty of allFacultiesFromSelection) {
    const allFacultyDepartments = await Department.findAll({
      where: {
        faculty_id: faculty.id,
        is_active: true,
      },
      attributes: ["id", "name", "code"],
      include: [
        {
          model: StudyProgram,
          as: "study_programs",
          attributes: ["id"],
          where: {
            is_active: true,
          },
          required: false,
        },
      ],
    });

    const activeDepartmentIds = allFacultyDepartments
      .filter((department) => department.study_programs?.length > 0)
      .map((department) => department.id);

    const isAllDepartmentsEligible =
      activeDepartmentIds.length > 0 &&
      activeDepartmentIds.every((departmentId) =>
        eligibleDepartmentIds.has(departmentId),
      );

    if (isAllDepartmentsEligible) {
      eligibleFaculties.push({
        id: faculty.id,
        name: faculty.name,
        code: faculty.code,
      });
    }
  }

  return {
    eligibleFaculties,
    eligibleDepartments,
    eligibleStudyPrograms: selectedStudyPrograms.map((sp) => ({
      id: sp.id,
      name: sp.name,
      code: sp.code,
      degree: sp.degree,
      department: sp.department,
    })),
  };
};

const getBeasiswaById = async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `scholarship_detail:${id}`;

    const result = await getOrSetCache(cacheKey, 300, async () => {
      const scholarship = await Scholarship.findByPk(id, {
        include: [
          {
            model: ScholarshipBenefit,
            as: "benefits",
            attributes: ["id", "benefit_text"],
          },
        ],
      });

      if (!scholarship) {
        return null;
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
            attributes: ["id", "stage_name", "order_no", "start_date", "end_date"],
          },
          {
            model: StudyProgram,
            as: "study_programs",
            through: { attributes: [] },
            attributes: ["id", "name", "code", "degree", "department_id"],
            include: [
              {
                model: Department,
                as: "department",
                attributes: ["id", "name", "code", "faculty_id"],
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

      const schemasFormatted = await Promise.all(
        schemas.map(async (schema) => {
          const schemaJson = schema.toJSON();

          const selectedStudyPrograms = schemaJson.study_programs || [];

          const {
            eligibleFaculties,
            eligibleDepartments,
            eligibleStudyPrograms,
          } = await buildEligibilityFromStudyPrograms(selectedStudyPrograms);

          return {
            ...schemaJson,

            eligibleFaculties,
            eligibleDepartments,
            eligibleStudyPrograms,

            effectiveFaculties: eligibleFaculties,
            effectiveDepartments: eligibleDepartments,
            effectiveStudyPrograms: eligibleStudyPrograms,

            directStudyPrograms: selectedStudyPrograms,

            stages: (schemaJson.stages || []).sort(
              (a, b) => a.order_no - b.order_no,
            ),
          };
        }),
      );

      return {
        ...scholarship.toJSON(),
        schemas: schemasFormatted,
      };
    });

    if (!result) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

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
      },
      { transaction },
    );

    const parsedSchemas =
      typeof schemas === "string" ? JSON.parse(schemas) : schemas;

    if (!parsedSchemas || parsedSchemas.length === 0) {
      await transaction.rollback();
      return errorResponse(res, "Minimal satu skema harus ada", 400);
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
        requirements = [],
        documents = [],
        stages = [],
        study_programs = [],
        is_active: schemaIsActive,
      } = schemaData;

      const parsedGpaMinimum = hasNonEmptyValue(gpa_minimum)
        ? parseFloat(gpa_minimum)
        : null;

      const parsedSemesterMinimum = hasNonEmptyValue(semester_minimum)
        ? parseInt(semester_minimum)
        : null;

      let schema;

      if (schemaId && !schemaId.toString().startsWith("new-")) {
        schema = await ScholarshipSchema.findByPk(schemaId, { transaction });

        if (schema) {
          await schema.update(
            {
              name: schemaName,
              description: schemaDescription || null,
              quota: quota ? parseInt(quota) : null,
              gpa_minimum: parsedGpaMinimum,
              semester_minimum: parsedSemesterMinimum,
              is_active: schemaIsActive !== undefined ? schemaIsActive : true,
            },
            { transaction },
          );

          schemasToKeep.push(schema.id);
        }
      } else {
        schema = await ScholarshipSchema.create(
          {
            scholarship_id: scholarship.id,
            name: schemaName,
            description: schemaDescription || null,
            quota: quota ? parseInt(quota) : null,
            gpa_minimum: parsedGpaMinimum,
            semester_minimum: parsedSemesterMinimum,
            is_active: schemaIsActive !== undefined ? schemaIsActive : true,
          },
          { transaction },
        );

        schemasToKeep.push(schema.id);
      }

      if (!schema) {
        await transaction.rollback();
        return errorResponse(
          res,
          "Skema tidak ditemukan atau gagal diproses",
          404,
        );
      }

      await ScholarshipSchemaRequirement.destroy({
        where: { schema_id: schema.id },
        transaction,
      });

      await ScholarshipSchemaStage.destroy({
        where: { schema_id: schema.id },
        transaction,
      });

      await FormField.destroy({
        where: {
          schema_id: schema.id,
          type: {
            [Op.ne]: "FILE",
          },
        },
        transaction,
      });

      const existingDocuments = await ScholarshipSchemaDocument.findAll({
        where: { schema_id: schema.id },
        transaction,
      });

      const oldDocumentNames = existingDocuments
        .map((doc) => String(doc.document_name).trim())
        .filter(Boolean)
        .sort();

      const incomingDocumentNames = Array.isArray(documents)
        ? documents.map((doc) => String(doc).trim()).filter(Boolean)
        : [];

      const newDocumentNames = [...incomingDocumentNames].sort();

      const isDocumentChanged =
        JSON.stringify(oldDocumentNames) !== JSON.stringify(newDocumentNames);

      const existingDocumentNames = existingDocuments.map((doc) =>
        String(doc.document_name).trim(),
      );

      const documentsToDelete = existingDocuments.filter(
        (doc) =>
          !incomingDocumentNames.includes(String(doc.document_name).trim()),
      );

      for (const doc of documentsToDelete) {
        const usedCount = await ApplicationDocument.count({
          where: {
            schema_document_id: doc.id,
          },
          transaction,
        });

        if (usedCount > 0) {
          await transaction.rollback();
          return errorResponse(
            res,
            `Dokumen "${doc.document_name}" tidak dapat dihapus karena sudah digunakan oleh pendaftar.`,
            400,
          );
        }

        await ScholarshipSchemaDocument.destroy({
          where: { id: doc.id },
          transaction,
        });
      }

      const addedDocumentNames = incomingDocumentNames.filter(
        (docName) => !existingDocumentNames.includes(docName),
      );

      if (addedDocumentNames.length > 0) {
        const documentData = addedDocumentNames.map((docName) => ({
          schema_id: schema.id,
          document_name: docName,
        }));

        await ScholarshipSchemaDocument.bulkCreate(documentData, {
          transaction,
        });
      }

      if (!isExternalBeasiswa) {
        const existingFileFields = await FormField.findAll({
          where: {
            schema_id: schema.id,
            type: "FILE",
          },
          attributes: ["label"],
          transaction,
        });

        const existingFileLabels = existingFileFields.map((field) =>
          String(field.label).trim(),
        );

        const addedFileFields = addedDocumentNames
          .filter((docName) => !existingFileLabels.includes(docName))
          .map((docName, index) => ({
            schema_id: schema.id,
            label: docName,
            type: "FILE",
            is_required: true,
            order_no: existingFileLabels.length + index + 1,
          }));

        if (addedFileFields.length > 0) {
          await FormField.bulkCreate(addedFileFields, { transaction });
        }
      }

      if (isDocumentChanged) {
        await Application.update(
          {
            status: "REVISION_NEEDED",
            verified_by: null,
            verified_at: null,
            validated_by: null,
            validated_at: null,
          },
          {
            where: {
              schema_id: schema.id,
              status: {
                [Op.in]: ["MENUNGGU_VERIFIKASI", "VERIFIED"],
              },
            },
            transaction,
          },
        );
      }

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

      if (!isExternalBeasiswa) {
        const autoEligibilityFields = [];
        let nextOrderNo = (documents?.length || 0) + 1;

        if (parsedGpaMinimum !== null) {
          autoEligibilityFields.push({
            schema_id: schema.id,
            label: "IPK",
            type: "NUMBER",
            is_required: true,
            order_no: nextOrderNo++,
          });
        }

        if (parsedSemesterMinimum !== null) {
          autoEligibilityFields.push({
            schema_id: schema.id,
            label: "Semester",
            type: "NUMBER",
            is_required: true,
            order_no: nextOrderNo++,
          });
        }

        if (autoEligibilityFields.length > 0) {
          await FormField.bulkCreate(autoEligibilityFields, { transaction });
        }
      }

      if (stages && stages.length > 0) {
        const sortedStages = [...stages].sort(
          (a, b) => (a.order_no || 0) - (b.order_no || 0),
        );
        for (let i = 1; i < sortedStages.length; i++) {
          if (
            sortedStages[i].start_date &&
            sortedStages[i - 1].start_date &&
            new Date(sortedStages[i].start_date) < new Date(sortedStages[i - 1].start_date)
          ) {
            const prevDate = new Date(sortedStages[i - 1].start_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
            const currDate = new Date(sortedStages[i].start_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
            await transaction.rollback();
            return errorResponse(
              res,
              `"${sortedStages[i].name || "Tahapan " + (i + 1)}" dimulai ${currDate}, lebih awal dari "${sortedStages[i - 1].name || "Tahapan " + i}" yang dimulai ${prevDate}`,
              400,
            );
          }
        }

        const stageData = stages.map((stage, index) => ({
          schema_id: schema.id,
          stage_name: stage.name || stage.stage_name,
          order_no: stage.order_no || index + 1,
          start_date: stage.start_date || null,
          end_date: stage.end_date || null,
        }));
        await ScholarshipSchemaStage.bulkCreate(stageData, { transaction });
      }

      const normalizedStudyProgramIds = Array.isArray(study_programs)
        ? [...new Set(study_programs.filter(Boolean))]
        : [];

      const existingStudyProgramMappings =
        await ScholarshipSchemaStudyProgram.findAll({
          where: { schema_id: schema.id },
          include: [
            {
              model: StudyProgram,
              as: "study_program",
              attributes: ["id", "name"],
            },
          ],
          transaction,
        });

      const existingStudyProgramIdSet = new Set(
        existingStudyProgramMappings.map((item) => item.study_program_id),
      );

      const studyProgramMappingsToCreate = normalizedStudyProgramIds
        .filter(
          (studyProgramId) => !existingStudyProgramIdSet.has(studyProgramId),
        )
        .map((studyProgramId) => ({
          schema_id: schema.id,
          study_program_id: studyProgramId,
        }));

      if (studyProgramMappingsToCreate.length > 0) {
        await ScholarshipSchemaStudyProgram.bulkCreate(
          studyProgramMappingsToCreate,
          { transaction },
        );
      }

      const studyProgramMappingsToRemove = existingStudyProgramMappings.filter(
        (mapping) =>
          !normalizedStudyProgramIds.includes(mapping.study_program_id),
      );

      if (studyProgramMappingsToRemove.length > 0) {
        const usedMappingIds = studyProgramMappingsToRemove.map(
          (mapping) => mapping.id,
        );

        const usedApplications = await Application.findAll({
          where: {
            schema_study_program_id: usedMappingIds,
          },
          attributes: ["schema_study_program_id"],
          group: ["schema_study_program_id"],
          transaction,
        });

        const usedMappingIdSet = new Set(
          usedApplications.map((item) => item.schema_study_program_id),
        );

        if (usedMappingIdSet.size > 0) {
          await transaction.rollback();

          const blockedStudyProgramNames = studyProgramMappingsToRemove
            .filter((mapping) => usedMappingIdSet.has(mapping.id))
            .map(
              (mapping) =>
                mapping.study_program?.name || mapping.study_program_id,
            );

          return errorResponse(
            res,
            `Program studi ${blockedStudyProgramNames.join(", ")} tidak dapat dihapus dari skema karena sudah memiliki pendaftar.`,
            400,
          );
        }

        await ScholarshipSchemaStudyProgram.destroy({
          where: { id: usedMappingIds },
          transaction,
        });
      }
    }

    const schemasToDelete = existingSchemaIds.filter(
      (id) => !schemasToKeep.includes(id),
    );

    if (schemasToDelete.length > 0) {
      const usedSchemaCount = await Application.count({
        where: {
          schema_id: schemasToDelete,
        },
        transaction,
      });

      if (usedSchemaCount > 0) {
        await transaction.rollback();
        return errorResponse(
          res,
          "Skema tidak dapat dihapus karena sudah memiliki pendaftar.",
          400,
        );
      }

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

      await ScholarshipSchemaStudyProgram.destroy({
        where: { schema_id: schemasToDelete },
        transaction,
      });

      await ScholarshipSchema.destroy({
        where: { id: schemasToDelete },
        transaction,
      });
    }

    await ScholarshipBenefit.destroy({
      where: { scholarship_id: id },
      transaction,
    });

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
          attributes: ["id", "stage_name", "order_no", "start_date", "end_date"],
        },
        {
          model: FormField,
          as: "form_fields",
          attributes: ["id", "label", "type", "is_required", "order_no"],
          required: false,
        },
        {
          model: StudyProgram,
          as: "study_programs",
          through: { attributes: [] },
          attributes: ["id", "name", "code", "degree"],
          include: [
            {
              model: Department,
              as: "department",
              attributes: ["id", "name", "code", "faculty_id"],
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

    const result = {
      ...updatedScholarship.toJSON(),
      schemas: updatedSchemas.map((schema) => {
        const schemaJson = schema.toJSON();

        return {
          ...schemaJson,

          directStudyPrograms: schemaJson.study_programs || [],

          study_programs: schemaJson.study_programs || [],

          faculties: [
            ...new Map(
              (schemaJson.study_programs || [])
                .map((sp) => sp.department?.faculty)
                .filter(Boolean)
                .map((faculty) => [faculty.id, faculty]),
            ).values(),
          ],

          departments: [
            ...new Map(
              (schemaJson.study_programs || [])
                .map((sp) => sp.department)
                .filter(Boolean)
                .map((department) => [department.id, department]),
            ).values(),
          ],

          stages: (schemaJson.stages || []).sort(
            (a, b) => a.order_no - b.order_no,
          ),
        };
      }),
    };

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "UPDATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" dengan ${parsedSchemas.length} skema telah diperbarui oleh ${userName}.`,
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
      description: `Beasiswa "${scholarship.name}" dan semua skema-nya telah dinonaktifkan oleh ${userName}.`,
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
      description: `Beasiswa "${scholarship.name}" dan semua skema-nya telah diaktifkan oleh ${userName}.`,
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
                attributes: ["id", "stage_name", "order_no", "start_date", "end_date"],
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
      return errorResponse(res, "Skema tidak ditemukan", 404);
    }

    if (!schema.scholarship.is_active) {
      return errorResponse(
        res,
        "Tidak dapat mengaktifkan skema karena beasiswa induk tidak aktif",
        400,
      );
    }

    if (schema.is_active) {
      return errorResponse(res, "Skema sudah aktif", 400);
    }

    await schema.update({ is_active: true });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "ACTIVATE_SCHEMA",
      entity_type: "ScholarshipSchema",
      entity_id: schema.id,
      description: `Skema "${schema.name}" dari beasiswa "${schema.scholarship.name}" telah diaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Skema berhasil diaktifkan", schema);
  } catch (error) {
    console.error("Error activating skema:", error);
    errorResponse(res, "Gagal mengaktifkan skema", 500);
  }
};

const deactivateSchema = async (req, res) => {
  try {
    const { schemaId } = req.params;

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
      return errorResponse(res, "Skema tidak ditemukan", 404);
    }

    if (!schema.is_active) {
      return errorResponse(res, "Skema sudah nonaktif", 400);
    }

    await schema.update({ is_active: false });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "DEACTIVATE_SCHEMA",
      entity_type: "ScholarshipSchema",
      entity_id: schema.id,
      description: `Skema "${schema.name}" dari beasiswa "${schema.scholarship.name}" telah dinonaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Skema berhasil dinonaktifkan", schema);
  } catch (error) {
    console.error("Error deactivating skema:", error);
    errorResponse(res, "Gagal menonaktifkan skema", 500);
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
