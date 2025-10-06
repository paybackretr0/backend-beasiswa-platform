const {
  Scholarship,
  ScholarshipFaculty,
  ScholarshipDepartment,
  ScholarshipDocument,
  ScholarshipRequirement,
  ScholarshipBenefit,
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
      scholarship_status,
      scholarship_value,
      duration_semesters,
      website_url,
      faculties,
      departments,
    } = req.body;

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
      !duration_semesters
    ) {
      return errorResponse(res, "Field wajib harus diisi", 400);
    }

    let logoPath = null;
    if (req.files && req.files.logo_file && req.files.logo_file[0]) {
      const logoFileInfo = req.filesInfo.logo_file[0];
      logoPath = logoFileInfo.url;
      console.log("Logo uploaded:", logoPath);
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
        semester_minimum: parseInt(semester_minimum),
        scholarship_value: parseFloat(scholarship_value),
        duration_semesters: parseInt(duration_semesters),
        contact_person_name,
        contact_person_email,
        contact_person_phone,
        scholarship_status: scholarship_status || "AKTIF",
        website_url: website_url || null,
        logo_path: logoPath,
        created_by: req.user.id,
      },
      { transaction }
    );

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

    if (documents) {
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

    await transaction.commit();

    const createdScholarship = await Scholarship.findByPk(scholarship.id, {
      include: [
        { association: "requirements" },
        { association: "scholarshipDocuments" },
        { association: "benefits" },
        { association: "faculties" },
        { association: "departments" },
      ],
    });

    successResponse(res, "Beasiswa berhasil dibuat", createdScholarship);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating scholarship:", error);
    errorResponse(res, "Gagal membuat beasiswa");
  }
};

const getAllActiveScholarships = async (req, res) => {
  try {
    const scholarships = await Scholarship.findAll({
      where: { scholarship_status: "AKTIF" },
      order: [["createdAt", "DESC"]],
    });
    successResponse(
      res,
      "Daftar Beasiswa Aktif berhasil didapatkan",
      scholarships
    );
  } catch (error) {
    console.error("Error fetching active scholarships:", error);
    errorResponse(res, "Gagal mendapatkan daftar Beasiswa Aktif", error);
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
      scholarship_status,
      scholarship_value,
      duration_semesters,
      website_url,
      faculties,
      departments,
    } = req.body;

    const scholarship = await Scholarship.findByPk(id);
    if (!scholarship) {
      return errorResponse(res, "Beasiswa tidak ditemukan", 404);
    }

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
      !duration_semesters
    ) {
      return errorResponse(res, "Field wajib harus diisi", 400);
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
        semester_minimum: parseInt(semester_minimum),
        scholarship_value: parseFloat(scholarship_value),
        duration_semesters: parseInt(duration_semesters),
        contact_person_name,
        contact_person_email,
        contact_person_phone,
        scholarship_status: scholarship_status || "AKTIF",
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

    if (documents) {
      const parsedDocuments = JSON.parse(documents);
      if (parsedDocuments && parsedDocuments.length > 0) {
        const documentData = parsedDocuments.map((doc) => ({
          scholarship_id: id,
          document_name: doc,
        }));
        await ScholarshipDocument.bulkCreate(documentData, { transaction });
      }
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

    await transaction.commit();
    const updatedScholarship = await Scholarship.findByPk(id, {
      include: [
        { association: "requirements" },
        { association: "scholarshipDocuments" },
        { association: "benefits" },
        { association: "faculties" },
        { association: "departments" },
      ],
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
      scholarship_status: "NONAKTIF",
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
      scholarship_status: "AKTIF",
    });
    successResponse(res, "Beasiswa berhasil diaktifkan", scholarship);
  } catch (error) {
    console.error("Error activating scholarship:", error);
    errorResponse(res, "Gagal mengaktifkan beasiswa");
  }
};

module.exports = {
  getAllScholarships,
  createScholarship,
  getAllActiveScholarships,
  getBeasiswaById,
  updateScholarship,
  deactivateScholarship,
  activateScholarship,
};
