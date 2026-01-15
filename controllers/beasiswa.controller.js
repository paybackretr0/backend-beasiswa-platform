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
  ActivityLog,
  sequelize,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");

const getAllScholarships = async (req, res) => {
  try {
    const scholarships = await Scholarship.findAll({
      include: [
        {
          model: ScholarshipSchema,
          as: "schemas",
          required: false,
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
              attributes: ["id", "requirement_type", "requirement_text"],
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
              order: [["order_no", "ASC"]],
            },
          ],
        },
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
        },
        {
          model: StudyProgram,
          as: "studyPrograms",
          through: { attributes: [] },
          attributes: ["id", "degree"],
        },
      ],
      order: [
        ["end_date", "DESC"],
        ["createdAt", "ASC"],
      ],
    });

    const transformedData = scholarships.map((scholarship) => ({
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

      schemas:
        scholarship.schemas?.map((schema) => ({
          id: schema.id,
          name: schema.name,
          description: schema.description,
          quota: schema.quota,
          gpa_minimum: schema.gpa_minimum,
          semester_minimum: schema.semester_minimum,
          is_active: schema.is_active,
          requirements_count: schema.requirements?.length || 0,
          documents_count: schema.documents?.length || 0,
          stages_count: schema.stages?.length || 0,
        })) || [],

      total_schemas: scholarship.schemas?.length || 0,
      active_schemas:
        scholarship.schemas?.filter((s) => s.is_active).length || 0,
      min_gpa: scholarship.schemas?.reduce(
        (min, s) =>
          s.gpa_minimum && (!min || s.gpa_minimum < min) ? s.gpa_minimum : min,
        null
      ),
      min_semester: scholarship.schemas?.reduce(
        (min, s) =>
          s.semester_minimum && (!min || s.semester_minimum < min)
            ? s.semester_minimum
            : min,
        null
      ),
      total_quota: scholarship.schemas?.reduce(
        (sum, s) => sum + (s.quota || 0),
        0
      ),

      faculties:
        scholarship.faculties?.map((f) => ({ id: f.id, name: f.name })) || [],
      departments:
        scholarship.departments?.map((d) => ({ id: d.id, name: d.name })) || [],
      study_programs:
        scholarship.studyPrograms?.map((sp) => ({
          id: sp.id,
          name: sp.name,
        })) || [],
    }));

    successResponse(
      res,
      "Daftar beasiswa aktif berhasil didapatkan",
      transformedData
    );
  } catch (error) {
    console.error("Error fetching active scholarships for user:", error);
    errorResponse(res, "Gagal mendapatkan daftar beasiswa aktif", 500);
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
        400
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
      { transaction }
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
          400
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
        { transaction }
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
          model: ScholarshipSchema,
          as: "schemas",
          include: [
            { model: ScholarshipSchemaRequirement, as: "requirements" },
            { model: ScholarshipSchemaDocument, as: "documents" },
            { model: ScholarshipSchemaStage, as: "stages" },
            { model: FormField, as: "formFields" },
          ],
        },
        { model: ScholarshipBenefit, as: "benefits" },
        { model: Faculty, as: "faculties" },
        { model: Department, as: "departments" },
        { model: StudyProgram, as: "studyPrograms" },
      ],
    });

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

    successResponse(res, "Beasiswa berhasil dibuat", createdScholarship);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating scholarship:", error);
    errorResponse(res, "Gagal membuat beasiswa", 500);
  }
};

const getBeasiswaById = async (req, res) => {
  try {
    const { id } = req.params;

    const scholarship = await Scholarship.findByPk(id, {
      include: [
        {
          model: ScholarshipSchema,
          as: "schemas",
          required: false,
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
          ],
          order: [
            [
              { model: ScholarshipSchemaStage, as: "stages" },
              "order_no",
              "ASC",
            ],
          ],
        },
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
          attributes: ["id", "degree"],
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

    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    if (!scholarship.is_active) {
      return errorResponse(res, "Beasiswa tidak aktif", 403);
    }

    successResponse(res, "Detail beasiswa berhasil didapatkan", scholarship);
  } catch (error) {
    console.error("Error fetching scholarship by ID for user:", error);
    errorResponse(res, "Gagal mendapatkan detail beasiswa", 500);
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
        400
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
      { transaction }
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
          400
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
            { transaction }
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
          { transaction }
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
      (id) => !schemasToKeep.includes(id)
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
        })
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
          model: ScholarshipSchema,
          as: "schemas",
          include: [
            { model: ScholarshipSchemaRequirement, as: "requirements" },
            { model: ScholarshipSchemaDocument, as: "documents" },
            { model: ScholarshipSchemaStage, as: "stages" },
            { model: FormField, as: "formFields" },
          ],
        },
        { model: ScholarshipBenefit, as: "benefits" },
        { model: Faculty, as: "faculties" },
        { model: Department, as: "departments" },
        { model: StudyProgram, as: "studyPrograms" },
      ],
    });

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

    successResponse(res, "Beasiswa berhasil diperbarui", updatedScholarship);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating scholarship:", error);
    errorResponse(res, "Gagal memperbarui beasiswa", 500);
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
      { where: { scholarship_id: id } }
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
      { where: { scholarship_id: id } }
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
      otherScholarships
    );
  } catch (error) {
    console.error("Error fetching other scholarships:", error);
    errorResponse(res, "Gagal mendapatkan beasiswa lainnya", error);
  }
};

const getActiveScholarshipsForInfo = async (req, res) => {
  try {
    const currentDate = new Date();

    const scholarships = await Scholarship.findAll({
      where: {
        is_active: true,
        end_date: {
          [require("sequelize").Op.gte]: currentDate,
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

    // ✅ Transform data to include schema information
    const transformedData = scholarships.map((scholarship) => ({
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

      // ✅ Schema information
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

      // ✅ Aggregate data from all schemas
      total_schemas: scholarship.schemas?.length || 0,
      active_schemas:
        scholarship.schemas?.filter((s) => s.is_active).length || 0,
      total_quota: scholarship.schemas?.reduce(
        (sum, s) => sum + (s.quota || 0),
        0
      ),
      min_gpa: scholarship.schemas?.reduce(
        (min, s) =>
          s.gpa_minimum && (!min || s.gpa_minimum < min) ? s.gpa_minimum : min,
        null
      ),
      min_semester: scholarship.schemas?.reduce(
        (min, s) =>
          s.semester_minimum && (!min || s.semester_minimum < min)
            ? s.semester_minimum
            : min,
        null
      ),

      benefits:
        scholarship.benefits?.map((b) => ({ benefit_text: b.benefit_text })) ||
        [],
    }));

    successResponse(
      res,
      "Daftar beasiswa aktif berhasil didapatkan",
      transformedData
    );
  } catch (error) {
    console.error("Error fetching active scholarships for info:", error);
    errorResponse(res, "Gagal mendapatkan daftar beasiswa aktif", 500);
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
        400
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
