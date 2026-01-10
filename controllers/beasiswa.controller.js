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
          attributes: ["id", "name", "is_active"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const transformedData = scholarships.map((scholarship) => ({
      id: scholarship.id,
      name: scholarship.name,
      organizer: scholarship.organizer,
      year: scholarship.year,
      is_external: scholarship.is_external,
      is_active: scholarship.is_active,
      end_date: scholarship.end_date,
      verification_level: scholarship.verification_level,
      schema_count: scholarship.schemas?.length || 0,
      active_schemas:
        scholarship.schemas?.filter((s) => s.is_active).length || 0,
    }));

    successResponse(
      res,
      "Daftar Beasiswa berhasil didapatkan",
      transformedData
    );
  } catch (error) {
    console.error("Error fetching scholarships:", error);
    errorResponse(res, "Gagal mendapatkan daftar Beasiswa", error);
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
          include: [
            { model: ScholarshipSchemaRequirement, as: "requirements" },
            { model: ScholarshipSchemaDocument, as: "documents" },
            {
              model: ScholarshipSchemaStage,
              as: "stages",
              order: [["order_no", "ASC"]],
            },
            { model: FormField, as: "formFields" },
          ],
        },
        { model: ScholarshipBenefit, as: "benefits" },
        {
          model: Faculty,
          as: "faculties",
          through: { attributes: [] },
        },
        {
          model: Department,
          as: "departments",
          through: { attributes: [] },
          include: [{ model: Faculty, as: "faculty" }],
        },
        {
          model: StudyProgram,
          as: "studyPrograms",
          through: { attributes: [] },
          include: [
            {
              model: Department,
              as: "department",
              include: [{ model: Faculty, as: "faculty" }],
            },
          ],
        },
      ],
    });

    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    successResponse(res, "Beasiswa berhasil didapatkan", scholarship);
  } catch (error) {
    console.error("Error fetching scholarship by ID:", error);
    errorResponse(res, "Gagal mendapatkan Beasiswa", error);
  }
};

const createSchema = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { scholarship_id } = req.params;
    const {
      name,
      description,
      quota,
      gpa_minimum,
      semester_minimum,
      requirements,
      documents,
      stages,
      faculties,
      departments,
      study_programs,
    } = req.body;

    const scholarship = await Scholarship.findByPk(scholarship_id);
    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

    const schema = await ScholarshipSchema.create(
      {
        scholarship_id,
        name,
        description,
        quota: quota ? parseInt(quota) : null,
        gpa_minimum: gpa_minimum ? parseFloat(gpa_minimum) : null,
        semester_minimum: semester_minimum ? parseInt(semester_minimum) : null,
        is_active: true,
      },
      { transaction }
    );

    if (requirements && requirements.length > 0) {
      const requirementData = requirements.map((req) => ({
        schema_id: schema.id,
        requirement_type: req.type,
        requirement_text: req.type === "TEXT" ? req.text : null,
        requirement_file: req.type === "FILE" ? req.file : null,
      }));
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

    if (benefits && benefits.length > 0) {
      const benefitData = benefits.map((benefit) => ({
        scholarship_id: scholarship.id,
        benefit_text: benefit,
      }));
      await ScholarshipBenefit.bulkCreate(benefitData, { transaction });
    }

    await transaction.commit();

    const createdSchema = await ScholarshipSchema.findByPk(schema.id, {
      include: [
        { model: ScholarshipSchemaRequirement, as: "requirements" },
        { model: ScholarshipSchemaDocument, as: "documents" },
        { model: ScholarshipSchemaStage, as: "stages" },
      ],
    });

    successResponse(res, "Schema berhasil dibuat", createdSchema);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating schema:", error);
    errorResponse(res, "Gagal membuat schema");
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
      requirements,

      start_date,
      end_date,
      quota,
      gpa_minimum,
      semester_minimum,
      documents,
      benefits,

      contact_person_name,
      contact_person_email,
      contact_person_phone,
      is_active,
      is_external,
      scholarship_value,
      duration_semesters,
      website_url,
      faculties,
      departments,
      study_programs,
      stages,
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
      !semester_minimum ||
      !contact_person_name ||
      !contact_person_email ||
      !contact_person_phone ||
      !scholarship_value ||
      !duration_semesters ||
      !stages
    ) {
      return errorResponse(res, "Field wajib harus diisi", 400);
    }

    if (isExternalBeasiswa) {
      if (!website_url) {
        return errorResponse(
          res,
          "Website URL wajib untuk beasiswa eksternal",
          400
        );
      }
    }

    let logoPath = scholarship.logo_path;
    if (req.files && req.files.logo_file && req.files.logo_file[0]) {
      const logoFileInfo = req.filesInfo.logo_file[0];
      logoPath = logoFileInfo.url;
      console.log("New logo uploaded:", logoPath);
    }

    await scholarship.update(
      {
        name,
        organizer,
        year: parseInt(year),
        description,
        start_date,
        end_date,
        quota: quota ? parseInt(quota) : null,
        gpa_minimum: gpa_minimum ? parseFloat(gpa_minimum) : null,
        is_external: isExternalBeasiswa,
        semester_minimum: parseInt(semester_minimum),
        scholarship_value: parseFloat(scholarship_value),
        duration_semesters: parseInt(duration_semesters),
        contact_person_name,
        contact_person_email,
        contact_person_phone,
        is_active: is_active || true,
        website_url: website_url || null,
        logo_path: logoPath,
      },
      { transaction }
    );

    await ScholarshipRequirement.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipDocument.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipBenefit.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipFaculty.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipDepartment.destroy({
      where: { scholarship_id: id },
      transaction,
    });
    await ScholarshipStage.destroy({
      where: { scholarship_id: id },
      transaction,
    });

    if (isExternalBeasiswa) {
      await FormField.destroy({
        where: { scholarship_id: id },
        transaction,
      });
    }

    if (stages) {
      const parsedStages = JSON.parse(stages);

      if (Array.isArray(parsedStages) && parsedStages.length > 0) {
        const stageData = parsedStages.map((stage) => ({
          scholarship_id: scholarship.id,
          stage_name: stage.stage_name,
          order_no: stage.order_no,
        }));
        await ScholarshipStage.bulkCreate(stageData, { transaction });
      } else {
        throw new Error("Tahapan seleksi harus berupa array yang valid");
      }
    }

    if (requirements) {
      const parsedRequirements = JSON.parse(requirements);
      if (parsedRequirements && parsedRequirements.length > 0) {
        const requirementData = [];

        for (let i = 0; i < parsedRequirements.length; i++) {
          const reqItem = parsedRequirements[i];

          let requirementEntry = {
            scholarship_id: id,
            requirement_type: reqItem.type,
          };

          if (reqItem.type === "TEXT") {
            requirementEntry.requirement_text = reqItem.text;
          } else if (
            reqItem.type === "FILE" &&
            req.files &&
            req.files.requirement_file &&
            req.files.requirement_file[0]
          ) {
            const requirementFileInfo = req.filesInfo.requirement_file[0];
            requirementEntry.requirement_file = requirementFileInfo.url;
            requirementEntry.requirement_text = null;
          } else if (reqItem.type === "FILE" && reqItem.existingFile) {
            requirementEntry.requirement_file = reqItem.existingFile;
            requirementEntry.requirement_text = null;
          }

          requirementData.push(requirementEntry);
        }

        await ScholarshipRequirement.bulkCreate(requirementData, {
          transaction,
        });
      }
    }

    if (!isExternalBeasiswa && documents) {
      const parsedDocuments = JSON.parse(documents);
      if (parsedDocuments && parsedDocuments.length > 0) {
        const documentData = parsedDocuments.map((doc) => ({
          scholarship_id: id,
          document_name: doc,
        }));
        await ScholarshipDocument.bulkCreate(documentData, { transaction });

        const formFields = parsedDocuments.map((doc, index) => ({
          scholarship_id: id,
          label: doc,
          type: "FILE",
          is_required: true,
          order_no: index + 1,
        }));
        await FormField.bulkCreate(formFields, { transaction });
      }
    } else if (isExternalBeasiswa) {
      const parsedDocuments = JSON.parse(documents);
      if (parsedDocuments && parsedDocuments.length > 0) {
        const documentData = parsedDocuments.map((doc) => ({
          scholarship_id: id,
          document_name: doc,
        }));
        await ScholarshipDocument.bulkCreate(documentData, { transaction });
      }
      await FormField.destroy({
        where: { scholarship_id: id },
        transaction,
      });
    }

    if (benefits) {
      const parsedBenefits = JSON.parse(benefits);
      if (parsedBenefits && parsedBenefits.length > 0) {
        const benefitData = parsedBenefits.map((benefit) => ({
          scholarship_id: id,
          benefit_text: benefit,
        }));
        await ScholarshipBenefit.bulkCreate(benefitData, { transaction });
      }
    }

    if (faculties) {
      const parsedFaculties = JSON.parse(faculties);
      if (parsedFaculties && parsedFaculties.length > 0) {
        const facultyData = parsedFaculties.map((facultyId) => ({
          scholarship_id: id,
          faculty_id: facultyId,
        }));
        await ScholarshipFaculty.bulkCreate(facultyData, { transaction });
      }
    }

    if (departments) {
      const parsedDepartments = JSON.parse(departments);
      if (parsedDepartments && parsedDepartments.length > 0) {
        const departmentData = parsedDepartments.map((departmentId) => ({
          scholarship_id: id,
          department_id: departmentId,
        }));
        await ScholarshipDepartment.bulkCreate(departmentData, { transaction });
      }
    }

    if (study_programs) {
      const parsedStudyPrograms = JSON.parse(study_programs);
      if (parsedStudyPrograms && parsedStudyPrograms.length > 0) {
        const studyProgramData = parsedStudyPrograms.map((studyProgramId) => ({
          scholarship_id: id,
          study_program_id: studyProgramId,
        }));
        await ScholarshipStudyProgram.bulkCreate(studyProgramData, {
          transaction,
        });
      }
    }

    await transaction.commit();
    const updatedScholarship = await Scholarship.findByPk(id, {
      include: [
        { association: "requirements" },
        { association: "scholarshipDocuments" },
        { association: "benefits" },
        { association: "faculties" },
        { association: "departments" },
        { association: "study_programs" },
        { association: "stages" },
      ],
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "UPDATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa dengan nama ${scholarship.name} telah diperbarui oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Beasiswa berhasil diperbarui", updatedScholarship);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating scholarship:", error);
    errorResponse(res, "Gagal memperbarui beasiswa");
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
          association: "requirements",
          attributes: [
            "requirement_type",
            "requirement_text",
            "requirement_file",
          ],
        },
        {
          association: "scholarshipDocuments",
          attributes: ["document_name"],
        },
        {
          association: "benefits",
          attributes: ["benefit_text"],
        },
        {
          association: "stages",
          attributes: ["stage_name", "order_no"],
          order: [["order_no", "ASC"]],
        },
      ],
      order: [
        ["end_date", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    successResponse(
      res,
      "Daftar beasiswa aktif berhasil didapatkan",
      scholarships
    );
  } catch (error) {
    console.error("Error fetching active scholarships for info:", error);
    errorResponse(res, "Gagal mendapatkan daftar beasiswa aktif", error);
  }
};

module.exports = {
  getAllScholarships,
  createScholarship,
  createSchema,
  getBeasiswaById,
  updateScholarship,
  deactivateScholarship,
  activateScholarship,
  getOtherScholarships,
  getActiveScholarshipsForInfo,
};
