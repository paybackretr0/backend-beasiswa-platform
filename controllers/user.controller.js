const {
  User,
  Student,
  Staff,
  Faculty,
  Department,
  StudyProgram,
  ActivityLog,
  sequelize,
} = require("../models");
const { Op } = require("sequelize");
const {
  successResponse,
  errorResponse,
  successCreatedResponse,
} = require("../utils/response");
const { hashPassword } = require("../utils/password");
const { getOrSetCache } = require("../utils/cacheHelper");
const { parseNimFromEmail } = require("../utils/parse_nim");

const USER_BASE_ATTRIBUTES = [
  "id",
  "email",
  "full_name",
  "phone_number",
  "role",
  "is_active",
  "last_login_at",
  "createdAt",
];

const STAFF_ROLES = [
  "VERIFIKATOR_FAKULTAS",
  "VERIFIKATOR_DITMAWA",
  "VALIDATOR_DITMAWA",
  "PIMPINAN_DITMAWA",
  "PIMPINAN_FAKULTAS",
  "SUPERADMIN",
];

const createHttpError = (status, message) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const buildUserInclude = () => [
  {
    model: Student,
    as: "student",
    attributes: ["id", "nim", "birth_date", "birth_place", "gender"],
    required: false,
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
  },
  {
    model: Staff,
    as: "staff",
    attributes: ["id", "staff_number", "gender", "faculty_id"],
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
];

const mapUserAccount = (user) => {
  const plain =
    typeof user.get === "function" ? user.get({ plain: true }) : user;
  const student = plain.student || null;
  const staff = plain.staff || null;
  const studyProgram = student?.study_program || null;
  const department = studyProgram?.department || null;
  const faculty = staff?.faculty || department?.faculty || null;

  return {
    id: plain.id,
    email: plain.email,
    full_name: plain.full_name,
    phone_number: plain.phone_number,
    role: plain.role,
    is_active: plain.is_active,
    last_login_at: plain.last_login_at,
    createdAt: plain.createdAt,
    nim: student?.nim || null,
    birth_date: student?.birth_date || null,
    birth_place: student?.birth_place || null,
    gender: student?.gender || staff?.gender || null,
    faculty_id: staff?.faculty_id || faculty?.id || null,
    department_id: department?.id || null,
    study_program_id: studyProgram?.id || null,
    faculty,
    department,
    study_program: studyProgram,
    student,
    staff,
  };
};

const fetchUsersByRoles = async (roles, cacheKey) => {
  const records = await getOrSetCache(cacheKey, 600, async () => {
    return User.findAll({
      where: {
        role: {
          [Op.in]: Array.isArray(roles) ? roles : [roles],
        },
      },
      attributes: USER_BASE_ATTRIBUTES,
      include: buildUserInclude(),
      order: [["createdAt", "DESC"]],
    });
  });

  return records.map(mapUserAccount);
};

const fetchUserAccountById = async (id, transaction) => {
  const record = await User.findByPk(id, {
    attributes: USER_BASE_ATTRIBUTES,
    include: buildUserInclude(),
    transaction,
  });

  return record ? mapUserAccount(record) : null;
};

const validateFaculty = async (facultyId, transaction) => {
  if (!facultyId) return null;

  const faculty = await Faculty.findByPk(facultyId, { transaction });
  if (!faculty) {
    throw createHttpError(404, "Fakultas tidak ditemukan");
  }

  return faculty;
};

const validateAcademicHierarchy = async (
  facultyId,
  departmentId,
  studyProgramId,
  transaction,
) => {
  const faculty = await validateFaculty(facultyId, transaction);

  if (!departmentId) {
    throw createHttpError(400, "Departemen wajib dipilih");
  }

  const department = await Department.findByPk(departmentId, { transaction });
  if (!department) {
    throw createHttpError(404, "Departemen tidak ditemukan");
  }

  if (faculty && department.faculty_id !== faculty.id) {
    throw createHttpError(
      400,
      "Departemen tidak sesuai dengan fakultas yang dipilih",
    );
  }

  if (!studyProgramId) {
    throw createHttpError(400, "Program studi wajib dipilih");
  }

  const studyProgram = await StudyProgram.findByPk(studyProgramId, {
    transaction,
  });
  if (!studyProgram) {
    throw createHttpError(404, "Program studi tidak ditemukan");
  }

  if (studyProgram.department_id !== department.id) {
    throw createHttpError(
      400,
      "Program studi tidak sesuai dengan departemen yang dipilih",
    );
  }

  return { faculty, department, studyProgram };
};

const ensureEmailIsUnique = async (email, excludedUserId, transaction) => {
  if (!email) return;

  const existingUser = await User.findOne({
    where: { email },
    transaction,
  });

  if (existingUser && existingUser.id !== excludedUserId) {
    throw createHttpError(400, "Email sudah digunakan");
  }
};

const ensureNimIsUnique = async (nim, excludedUserId, transaction) => {
  if (!nim) return;

  const existingStudent = await Student.findOne({
    where: { nim },
    transaction,
  });

  if (existingStudent && existingStudent.id !== excludedUserId) {
    throw createHttpError(400, "NIM sudah digunakan");
  }
};

const createActivityLog = async (
  req,
  action,
  entityId,
  description,
  transaction,
) => {
  const userName = req.user.full_name || "User";

  await ActivityLog.create(
    {
      user_id: req.user.id,
      action,
      entity_type: "User",
      entity_id: entityId,
      description: description.replace("{actor}", userName),
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    },
    { transaction },
  );
};

const ensureStaffProfile = async (userId, facultyId, transaction) => {
  const existingStaff = await Staff.findByPk(userId, { transaction });

  if (existingStaff) {
    await existingStaff.update(
      { faculty_id: facultyId || null },
      { transaction },
    );
    return existingStaff;
  }

  return Staff.create(
    {
      id: userId,
      faculty_id: facultyId || null,
    },
    { transaction },
  );
};

const getMahasiswa = async (req, res) => {
  try {
    const mahasiswa = await fetchUsersByRoles("MAHASISWA", "users:mahasiswa");
    return successResponse(res, "Daftar mahasiswa berhasil diambil", mahasiswa);
  } catch (error) {
    console.error("Error fetching mahasiswa:", error);
    return errorResponse(res, "Gagal mengambil daftar mahasiswa");
  }
};

const getPimpinanFakultas = async (req, res) => {
  try {
    const data = await fetchUsersByRoles(
      "PIMPINAN_FAKULTAS",
      "users:pimpinan_fakultas",
    );
    return successResponse(
      res,
      "Daftar pimpinan fakultas berhasil diambil",
      data,
    );
  } catch (error) {
    console.error("Error fetching pimpinan fakultas:", error);
    return errorResponse(res, "Gagal mengambil daftar pimpinan fakultas");
  }
};

const getPimpinanDitmawa = async (req, res) => {
  try {
    const data = await fetchUsersByRoles(
      "PIMPINAN_DITMAWA",
      "users:pimpinan_ditmawa",
    );
    return successResponse(
      res,
      "Daftar pimpinan ditmawa berhasil diambil",
      data,
    );
  } catch (error) {
    console.error("Error fetching pimpinan ditmawa:", error);
    return errorResponse(res, "Gagal mengambil daftar pimpinan ditmawa");
  }
};

const getVerifikator = async (req, res) => {
  try {
    const data = await fetchUsersByRoles(
      ["VERIFIKATOR_FAKULTAS", "VERIFIKATOR_DITMAWA"],
      "users:verifikator",
    );
    return successResponse(res, "Daftar verifikator berhasil diambil", data);
  } catch (error) {
    console.error("Error fetching verifikator:", error);
    return errorResponse(res, "Gagal mengambil daftar verifikator");
  }
};

const getValidator = async (req, res) => {
  try {
    const data = await fetchUsersByRoles(
      "VALIDATOR_DITMAWA",
      "users:validator",
    );
    return successResponse(res, "Daftar validator berhasil diambil", data);
  } catch (error) {
    console.error("Error fetching validator:", error);
    return errorResponse(res, "Gagal mengambil daftar validator");
  }
};

const addUserDitmawa = async (req, res) => {
  const { email, password, full_name, role, phone_number } = req.body;
  const transaction = await sequelize.transaction();

  try {
    if (!["PIMPINAN_DITMAWA", "VALIDATOR_DITMAWA"].includes(role)) {
      throw createHttpError(400, "Role tidak valid");
    }

    await ensureEmailIsUnique(email, null, transaction);

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create(
      {
        email,
        password: hashedPassword,
        full_name,
        role,
        phone_number: phone_number || null,
        is_active: true,
        emailVerified: true,
      },
      { transaction },
    );

    await ensureStaffProfile(newUser.id, null, transaction);

    await createActivityLog(
      req,
      "CREATE_PIMPINAN",
      newUser.id,
      `User "${newUser.full_name}" telah dibuat oleh {actor}.`,
      transaction,
    );

    await transaction.commit();

    const createdUser = await fetchUserAccountById(newUser.id);
    return successCreatedResponse(
      res,
      "User berhasil ditambahkan",
      createdUser,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error adding user:", error);
    return errorResponse(
      res,
      error.message || "Gagal menambahkan user",
      error.status || 500,
    );
  }
};

const addVerifikator = async (req, res) => {
  const { email, password, full_name, role, faculty_id, phone_number } =
    req.body;
  const transaction = await sequelize.transaction();

  try {
    if (!["VERIFIKATOR_FAKULTAS", "VERIFIKATOR_DITMAWA"].includes(role)) {
      throw createHttpError(400, "Role tidak valid");
    }

    await ensureEmailIsUnique(email, null, transaction);

    if (role === "VERIFIKATOR_FAKULTAS") {
      if (!faculty_id) {
        throw createHttpError(
          400,
          "Fakultas wajib dipilih untuk Verifikator Fakultas",
        );
      }
      await validateFaculty(faculty_id, transaction);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create(
      {
        email,
        password: hashedPassword,
        full_name,
        phone_number: phone_number || null,
        role,
        is_active: true,
        emailVerified: true,
      },
      { transaction },
    );

    await ensureStaffProfile(
      newUser.id,
      role === "VERIFIKATOR_FAKULTAS" ? faculty_id : null,
      transaction,
    );

    await createActivityLog(
      req,
      "CREATE_VERIFIKATOR",
      newUser.id,
      `Verifikator "${newUser.full_name}" (${role}) telah dibuat oleh {actor}.`,
      transaction,
    );

    await transaction.commit();

    const createdUser = await fetchUserAccountById(newUser.id);
    return successCreatedResponse(
      res,
      "Verifikator berhasil ditambahkan",
      createdUser,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error adding verifikator:", error);
    return errorResponse(
      res,
      error.message || "Gagal menambahkan verifikator",
      error.status || 500,
    );
  }
};

const updateVerifikator = async (req, res) => {
  const { id } = req.params;
  const { full_name, phone_number, faculty_id } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(id, {
      include: buildUserInclude(),
      transaction,
    });
    if (!user) {
      throw createHttpError(404, "User tidak ditemukan");
    }

    if (!["VERIFIKATOR_FAKULTAS", "VERIFIKATOR_DITMAWA"].includes(user.role)) {
      throw createHttpError(400, "User ini bukan verifikator");
    }

    if (user.role === "VERIFIKATOR_FAKULTAS") {
      if (!faculty_id) {
        throw createHttpError(400, "Fakultas wajib dipilih");
      }
      await validateFaculty(faculty_id, transaction);
    }

    await user.update(
      {
        full_name: full_name ?? user.full_name,
        phone_number:
          phone_number !== undefined ? phone_number : user.phone_number,
      },
      { transaction },
    );

    await ensureStaffProfile(
      user.id,
      user.role === "VERIFIKATOR_FAKULTAS" ? faculty_id : null,
      transaction,
    );

    await createActivityLog(
      req,
      "UPDATE_VERIFIKATOR",
      user.id,
      `Verifikator "${user.full_name}" telah diperbarui oleh {actor}.`,
      transaction,
    );

    await transaction.commit();

    const updatedUser = await fetchUserAccountById(user.id);
    return successResponse(res, "Verifikator berhasil diperbarui", updatedUser);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error updating verifikator:", error);
    return errorResponse(
      res,
      error.message || "Gagal memperbarui verifikator",
      error.status || 500,
    );
  }
};

const addMahasiswa = async (req, res) => {
  const {
    email,
    password,
    full_name,
    birth_date,
    birth_place,
    gender,
    phone_number,
    faculty_id,
    department_id,
    study_program_id,
  } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const nim = parseNimFromEmail(email);

    if (
      !email ||
      !password ||
      !full_name ||
      !birth_date ||
      !birth_place ||
      !gender ||
      !phone_number ||
      !faculty_id ||
      !department_id ||
      !study_program_id
    ) {
      throw createHttpError(
        400,
        "Data mahasiswa belum lengkap. Pastikan semua field wajib terisi",
      );
    }

    if (!nim) {
      throw createHttpError(
        400,
        "Format email mahasiswa tidak valid. Gunakan email dengan awalan NIM, misalnya 2211523030_nama@student.unand.ac.id",
      );
    }

    await ensureEmailIsUnique(email, null, transaction);
    await ensureNimIsUnique(nim, null, transaction);
    await validateAcademicHierarchy(
      faculty_id,
      department_id,
      study_program_id,
      transaction,
    );

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create(
      {
        email,
        password: hashedPassword,
        full_name,
        role: "MAHASISWA",
        phone_number,
        is_active: true,
        emailVerified: true,
      },
      { transaction },
    );

    await Student.create(
      {
        id: newUser.id,
        nim,
        birth_date,
        birth_place,
        gender,
        study_program_id,
      },
      { transaction },
    );

    await createActivityLog(
      req,
      "CREATE_MAHASISWA",
      newUser.id,
      `User "${newUser.full_name}" telah dibuat oleh {actor}.`,
      transaction,
    );

    await transaction.commit();

    const createdUser = await fetchUserAccountById(newUser.id);
    return successCreatedResponse(
      res,
      "Mahasiswa berhasil ditambahkan",
      createdUser,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error adding mahasiswa:", error);
    return errorResponse(
      res,
      error.message || "Gagal menambahkan mahasiswa",
      error.status || 500,
    );
  }
};

const addPimpinanFakultas = async (req, res) => {
  const { email, password, full_name, faculty_id, phone_number } = req.body;
  const transaction = await sequelize.transaction();

  try {
    await ensureEmailIsUnique(email, null, transaction);

    if (!faculty_id) {
      throw createHttpError(400, "Fakultas wajib dipilih");
    }

    await validateFaculty(faculty_id, transaction);

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create(
      {
        email,
        password: hashedPassword,
        full_name,
        phone_number: phone_number || null,
        role: "PIMPINAN_FAKULTAS",
        is_active: true,
        emailVerified: true,
      },
      { transaction },
    );

    await ensureStaffProfile(newUser.id, faculty_id, transaction);

    await createActivityLog(
      req,
      "CREATE_PIMPINAN_FAKULTAS",
      newUser.id,
      `User "${newUser.full_name}" telah dibuat oleh {actor}.`,
      transaction,
    );

    await transaction.commit();

    const createdUser = await fetchUserAccountById(newUser.id);
    return successCreatedResponse(
      res,
      "Pimpinan Fakultas berhasil ditambahkan",
      createdUser,
    );
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error adding pimpinan fakultas:", error);
    return errorResponse(
      res,
      error.message || "Gagal menambahkan pimpinan fakultas",
      error.status || 500,
    );
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    email,
    full_name,
    birth_date,
    birth_place,
    gender,
    phone_number,
    faculty_id,
    department_id,
    study_program_id,
  } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const user = await User.findByPk(id, {
      include: buildUserInclude(),
      transaction,
    });
    if (!user) {
      throw createHttpError(404, "User tidak ditemukan");
    }

    await ensureEmailIsUnique(email, user.id, transaction);

    const payload = {};
    if (email !== undefined) payload.email = email;
    if (full_name !== undefined) payload.full_name = full_name;
    if (phone_number !== undefined) payload.phone_number = phone_number;

    await user.update(payload, { transaction });

    if (user.role === "MAHASISWA") {
      const currentStudent = user.student;
      const emailForNim =
        email !== undefined ? email : user.email || currentStudent?.user?.email;
      const nextNim =
        parseNimFromEmail(emailForNim) || currentStudent?.nim || null;
      const nextBirthDate =
        birth_date !== undefined
          ? birth_date
          : (currentStudent?.birth_date ?? null);
      const nextBirthPlace =
        birth_place !== undefined
          ? birth_place
          : (currentStudent?.birth_place ?? null);
      const nextGender =
        gender !== undefined ? gender : (currentStudent?.gender ?? null);

      if (!nextNim) {
        throw createHttpError(
          400,
          "Format email mahasiswa tidak valid. Gunakan email dengan awalan NIM, misalnya 2211523030_nama@student.unand.ac.id",
        );
      }

      await ensureNimIsUnique(nextNim, user.id, transaction);

      const currentStudyProgram = currentStudent?.study_program || null;
      const currentDepartment = currentStudyProgram?.department || null;
      const currentFaculty = currentDepartment?.faculty || null;

      const nextFacultyId =
        faculty_id !== undefined ? faculty_id : currentFaculty?.id || null;
      const nextDepartmentId =
        department_id !== undefined
          ? department_id
          : currentDepartment?.id || null;
      const nextStudyProgramId =
        study_program_id !== undefined
          ? study_program_id
          : currentStudyProgram?.id || null;

      await validateAcademicHierarchy(
        nextFacultyId,
        nextDepartmentId,
        nextStudyProgramId,
        transaction,
      );

      if (currentStudent) {
        await currentStudent.update(
          {
            nim: nextNim,
            birth_date: nextBirthDate,
            birth_place: nextBirthPlace,
            gender: nextGender,
            study_program_id: nextStudyProgramId,
          },
          { transaction },
        );
      } else {
        await Student.create(
          {
            id: user.id,
            nim: nextNim,
            birth_date: nextBirthDate,
            birth_place: nextBirthPlace,
            gender: nextGender,
            study_program_id: nextStudyProgramId,
          },
          { transaction },
        );
      }
    } else if (STAFF_ROLES.includes(user.role)) {
      const currentStaff = user.staff;
      const nextFacultyId =
        faculty_id !== undefined
          ? faculty_id
          : currentStaff?.faculty_id || null;
      const facultyRequired = [
        "PIMPINAN_FAKULTAS",
        "VERIFIKATOR_FAKULTAS",
      ].includes(user.role);

      if (facultyRequired && !nextFacultyId) {
        throw createHttpError(400, "Fakultas wajib dipilih");
      }

      if (nextFacultyId) {
        await validateFaculty(nextFacultyId, transaction);
      }

      await ensureStaffProfile(
        user.id,
        facultyRequired ? nextFacultyId : null,
        transaction,
      );
    }

    await createActivityLog(
      req,
      "UPDATE_USER",
      user.id,
      `User "${user.full_name}" telah diperbarui oleh {actor}.`,
      transaction,
    );

    await transaction.commit();

    const updatedUser = await fetchUserAccountById(user.id);
    return successResponse(res, "User berhasil diperbarui", updatedUser);
  } catch (error) {
    if (!transaction.finished) {
      await transaction.rollback();
    }

    console.error("Error updating user:", error);
    return errorResponse(
      res,
      error.message || "Gagal memperbarui user",
      error.status || 500,
    );
  }
};

const deactivateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    await user.update({ is_active: false });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "DEACTIVATE_USER",
      entity_type: "User",
      entity_id: user.id,
      description: `User "${user.full_name}" telah dinonaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "User berhasil dinonaktifkan", user);
  } catch (error) {
    console.error("Error deactivating user:", error);
    return errorResponse(res, "Gagal menonaktifkan user");
  }
};

const activateUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    await user.update({ is_active: true });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "ACTIVATE_USER",
      entity_type: "User",
      entity_id: user.id,
      description: `User "${user.full_name}" telah diaktifkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "User berhasil diaktifkan", user);
  } catch (error) {
    console.error("Error activating user:", error);
    return errorResponse(res, "Gagal mengaktifkan user");
  }
};

module.exports = {
  addUserDitmawa,
  addMahasiswa,
  addPimpinanFakultas,
  updateUser,
  deactivateUser,
  getMahasiswa,
  getPimpinanFakultas,
  getPimpinanDitmawa,
  getVerifikator,
  getValidator,
  activateUser,
  addVerifikator,
  updateVerifikator,
};
