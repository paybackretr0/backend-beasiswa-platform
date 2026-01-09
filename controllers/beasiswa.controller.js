const {
  Scholarship,
  ScholarshipFaculty,
  ScholarshipDepartment,
  ScholarshipStudyProgram,
  ScholarshipDocument,
  ScholarshipRequirement,
  ScholarshipBenefit,
  ScholarshipStage,
  FormField,
  ActivityLog,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { sequelize } = require("../models");

const getAllScholarships = async (req, res) => {
  try {
    const scholarships = await Scholarship.findAll({
      order: [["createdAt", "DESC"]],
    });
    successResponse(res, "Daftar Beasiswa berhasil didapatkan", scholarships);
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

    let logoPath = null;
    if (req.files && req.files.logo_file && req.files.logo_file[0]) {
      const logoFileInfo = req.filesInfo.logo_file[0];
      logoPath = logoFileInfo.url;
    }

    const scholarship = await Scholarship.create(
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
        created_by: req.user.id,
      },
      { transaction }
    );

    if (stages) {
      const parsedStages = JSON.parse(stages);

      if (Array.isArray(parsedStages) && parsedStages.length > 0) {
        const stageData = parsedStages.map((stage) => ({
          scholarship_id: scholarship.id,
          stage_name: stage.name,
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
            scholarship_id: scholarship.id,
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
          scholarship_id: scholarship.id,
          document_name: doc,
        }));
        await ScholarshipDocument.bulkCreate(documentData, { transaction });

        const formFields = parsedDocuments.map((doc, index) => ({
          scholarship_id: scholarship.id,
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
          scholarship_id: scholarship.id,
          document_name: doc,
        }));
        await ScholarshipDocument.bulkCreate(documentData, { transaction });
      }
    }

    if (benefits) {
      const parsedBenefits = JSON.parse(benefits);
      if (parsedBenefits && parsedBenefits.length > 0) {
        const benefitData = parsedBenefits.map((benefit) => ({
          scholarship_id: scholarship.id,
          benefit_text: benefit,
        }));
        await ScholarshipBenefit.bulkCreate(benefitData, { transaction });
      }
    }

    if (faculties) {
      const parsedFaculties = JSON.parse(faculties);
      if (parsedFaculties && parsedFaculties.length > 0) {
        const facultyData = parsedFaculties.map((facultyId) => ({
          scholarship_id: scholarship.id,
          faculty_id: facultyId,
        }));
        await ScholarshipFaculty.bulkCreate(facultyData, { transaction });
      }
    }

    if (departments) {
      const parsedDepartments = JSON.parse(departments);
      if (parsedDepartments && parsedDepartments.length > 0) {
        const departmentData = parsedDepartments.map((departmentId) => ({
          scholarship_id: scholarship.id,
          department_id: departmentId,
        }));
        await ScholarshipDepartment.bulkCreate(departmentData, { transaction });
      }
    }

    if (study_programs) {
      const parsedStudyPrograms = JSON.parse(study_programs);
      if (parsedStudyPrograms && parsedStudyPrograms.length > 0) {
        const studyProgramData = parsedStudyPrograms.map((studyProgramId) => ({
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
        { association: "requirements" },
        { association: "scholarshipDocuments" },
        { association: "benefits" },
        { association: "faculties" },
        { association: "study_programs" },
        { association: "departments" },
        { association: "stages" },
      ],
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa dengan nama ${scholarship.name} telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    successResponse(res, "Beasiswa berhasil dibuat", createdScholarship);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating scholarship:", error);
    errorResponse(res, "Gagal membuat beasiswa");
  }
};

const getBeasiswaById = async (req, res) => {
  try {
    const { id } = req.params;
    const scholarship = await Scholarship.findByPk(id, {
      include: [
        { association: "requirements" },
        { association: "scholarshipDocuments" },
        { association: "benefits" },
        { association: "faculties" },
        { association: "departments" },
        { association: "stages" },
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
    await scholarship.update({
      is_active: false,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "DEACTIVATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" telah dinonaktifkan oleh ${userName}.`,
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
    await scholarship.update({
      is_active: true,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "ACTIVATE_SCHOLARSHIP",
      entity_type: "Scholarship",
      entity_id: scholarship.id,
      description: `Beasiswa "${scholarship.name}" telah diaktifkan oleh ${userName}.`,
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
  getBeasiswaById,
  updateScholarship,
  deactivateScholarship,
  activateScholarship,
  getOtherScholarships,
  getActiveScholarshipsForInfo,
};
