const { User, Faculty, Department, ActivityLog } = require("../models");
const {
  successResponse,
  errorResponse,
  successCreatedResponse,
} = require("../utils/response");
const { hashPassword } = require("../utils/password");
const {
  parseNimFromEmail,
  extractKodeFakultasDepartemen,
} = require("../utils/parse_nim");
const { getOrSetCache } = require("../utils/cacheHelper");

const getMahasiswa = async (req, res) => {
  try {
    const cacheKey = "users:mahasiswa";

    const mahasiswa = await getOrSetCache(cacheKey, 600, async () => {
      return await User.findAll({
        where: { role: "MAHASISWA" },
        attributes: [
          "id",
          "email",
          "full_name",
          "phone_number",
          "role",
          "is_active",
          "last_login_at",
          "createdAt",
        ],
      });
    });

    return successResponse(res, "Daftar mahasiswa berhasil diambil", mahasiswa);
  } catch (error) {
    console.error("Error fetching mahasiswa:", error);
    return errorResponse(res, "Gagal mengambil daftar mahasiswa");
  }
};

const getPimpinanFakultas = async (req, res) => {
  try {
    const cacheKey = "users:pimpinan_fakultas";

    const pimpinanFakultas = await getOrSetCache(cacheKey, 600, async () => {
      return await User.findAll({
        where: { role: "PIMPINAN_FAKULTAS" },
        attributes: [
          "id",
          "email",
          "full_name",
          "phone_number",
          "role",
          "faculty_id",
          "is_active",
          "last_login_at",
          "createdAt",
        ],
        include: [
          {
            model: Faculty,
            as: "faculty",
            attributes: ["id", "name", "code"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    });

    return successResponse(
      res,
      "Daftar pimpinan fakultas berhasil diambil",
      pimpinanFakultas,
    );
  } catch (error) {
    console.error("Error fetching pimpinan fakultas:", error);
    return errorResponse(res, "Gagal mengambil daftar pimpinan fakultas");
  }
};

const getPimpinanDitmawa = async (req, res) => {
  try {
    const cacheKey = "users:pimpinan_ditmawa";

    const pimpinanDitmawa = await getOrSetCache(cacheKey, 600, async () => {
      return await User.findAll({
        where: { role: "PIMPINAN_DITMAWA" },
        attributes: [
          "id",
          "email",
          "full_name",
          "phone_number",
          "role",
          "is_active",
          "last_login_at",
          "createdAt",
        ],
      });
    });

    return successResponse(
      res,
      "Daftar pimpinan ditmawa berhasil diambil",
      pimpinanDitmawa,
    );
  } catch (error) {
    console.error("Error fetching pimpinan ditmawa:", error);
    return errorResponse(res, "Gagal mengambil daftar pimpinan ditmawa");
  }
};

const getVerifikator = async (req, res) => {
  try {
    const cacheKey = "users:verifikator";

    const verifikator = await getOrSetCache(cacheKey, 600, async () => {
      return await User.findAll({
        where: {
          role: ["VERIFIKATOR_FAKULTAS", "VERIFIKATOR_DITMAWA"],
        },
        attributes: [
          "id",
          "email",
          "full_name",
          "phone_number",
          "role",
          "faculty_id",
          "is_active",
          "last_login_at",
          "createdAt",
        ],
        include: [
          {
            model: Faculty,
            as: "faculty",
            attributes: ["id", "name", "code"],
          },
        ],
        order: [["createdAt", "DESC"]],
      });
    });

    return successResponse(
      res,
      "Daftar verifikator berhasil diambil",
      verifikator,
    );
  } catch (error) {
    console.error("Error fetching verifikator:", error);
    return errorResponse(res, "Gagal mengambil daftar verifikator");
  }
};

const getValidator = async (req, res) => {
  try {
    const cacheKey = "users:validator";

    const validator = await getOrSetCache(cacheKey, 600, async () => {
      return await User.findAll({
        where: { role: "VALIDATOR_DITMAWA" },
        attributes: [
          "id",
          "email",
          "full_name",
          "phone_number",
          "role",
          "is_active",
          "last_login_at",
          "createdAt",
        ],
      });
    });

    return successResponse(res, "Daftar validator berhasil diambil", validator);
  } catch (error) {
    console.error("Error fetching validator:", error);
    return errorResponse(res, "Gagal mengambil daftar validator");
  }
};

const addUserDitmawa = async (req, res) => {
  const { email, password, full_name, role } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, "Email sudah digunakan", 400);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      full_name,
      role,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_PIMPINAN",
      entity_type: "User",
      entity_id: newUser.id,
      description: `User "${newUser.full_name}" telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successCreatedResponse(res, "User berhasil ditambahkan", newUser);
  } catch (error) {
    console.error("Error adding user:", error);
    return errorResponse(res, "Gagal menambahkan user");
  }
};

const addVerifikator = async (req, res) => {
  const { email, password, full_name, role, faculty_id } = req.body;

  try {
    if (!["VERIFIKATOR_FAKULTAS", "VERIFIKATOR_DITMAWA"].includes(role)) {
      return errorResponse(res, "Role tidak valid", 400);
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, "Email sudah digunakan", 400);
    }

    if (role === "VERIFIKATOR_FAKULTAS") {
      if (!faculty_id) {
        return errorResponse(
          res,
          "Fakultas wajib dipilih untuk Verifikator Fakultas",
          400,
        );
      }

      const faculty = await Faculty.findByPk(faculty_id);
      if (!faculty) {
        return errorResponse(res, "Fakultas tidak ditemukan", 404);
      }
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      full_name,
      role,
      faculty_id: role === "VERIFIKATOR_FAKULTAS" ? faculty_id : null,
      is_active: true,
      emailVerified: true,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_VERIFIKATOR",
      entity_type: "User",
      entity_id: newUser.id,
      description: `Verifikator "${newUser.full_name}" (${role}) telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    const verifikatorWithFaculty = await User.findByPk(newUser.id, {
      include: [
        {
          model: Faculty,
          as: "faculty",
          attributes: ["id", "name", "code"],
        },
      ],
    });

    return successCreatedResponse(
      res,
      "Verifikator berhasil ditambahkan",
      verifikatorWithFaculty,
    );
  } catch (error) {
    console.error("Error adding verifikator:", error);
    return errorResponse(res, "Gagal menambahkan verifikator");
  }
};

const updateVerifikator = async (req, res) => {
  const { id } = req.params;
  const { full_name, phone_number, faculty_id } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (user.role === "VERIFIKATOR_FAKULTAS" && faculty_id) {
      const faculty = await Faculty.findByPk(faculty_id);
      if (!faculty) {
        return errorResponse(res, "Fakultas tidak ditemukan", 404);
      }
    }

    await user.update({
      full_name,
      phone_number,
      faculty_id:
        user.role === "VERIFIKATOR_FAKULTAS" ? faculty_id : user.faculty_id,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "UPDATE_VERIFIKATOR",
      entity_type: "User",
      entity_id: user.id,
      description: `Verifikator "${user.full_name}" telah diperbarui oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    const updatedUser = await User.findByPk(id, {
      include: [
        {
          model: Faculty,
          as: "faculty",
          attributes: ["id", "name", "code"],
        },
      ],
    });

    return successResponse(res, "Verifikator berhasil diperbarui", updatedUser);
  } catch (error) {
    console.error("Error updating verifikator:", error);
    return errorResponse(res, "Gagal memperbarui verifikator");
  }
};

const addMahasiswa = async (req, res) => {
  const { email, password, full_name } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, "Email sudah digunakan", 400);
    }

    const nim = parseNimFromEmail(email);

    if (!nim) {
      return errorResponse(
        res,
        "Format email tidak valid untuk mahasiswa",
        400,
      );
    }

    const { kodeFakultas, kodeDepartemen } = extractKodeFakultasDepartemen(nim);

    if (!kodeFakultas || !kodeDepartemen) {
      return errorResponse(res, "Format NIM tidak valid", 400);
    }

    const faculty = await Faculty.findOne({ where: { code: kodeFakultas } });
    if (!faculty) {
      return errorResponse(res, "Fakultas tidak ditemukan", 404);
    }

    const department = await Department.findOne({
      where: {
        faculty_id: faculty.id,
        code: kodeDepartemen,
      },
    });
    if (!department) {
      return errorResponse(res, "Departemen tidak ditemukan", 404);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      full_name,
      role: "MAHASISWA",
      faculty_id: faculty.id,
      department_id: department.id,
      is_active: true,
      emailVerified: true,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_MAHASISWA",
      entity_type: "User",
      entity_id: newUser.id,
      description: `User "${newUser.full_name}" telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successCreatedResponse(
      res,
      "Mahasiswa berhasil ditambahkan",
      newUser,
    );
  } catch (error) {
    console.error("Error adding mahasiswa:", error);
    return errorResponse(res, "Gagal menambahkan mahasiswa");
  }
};

const addPimpinanFakultas = async (req, res) => {
  const { email, password, full_name, faculty_id } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, "Email sudah digunakan", 400);
    }

    if (!faculty_id) {
      return errorResponse(res, "Fakultas wajib dipilih", 400);
    }

    const faculty = await Faculty.findByPk(faculty_id);
    if (!faculty) {
      return errorResponse(res, "Fakultas tidak ditemukan", 404);
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      full_name,
      role: "PIMPINAN_FAKULTAS",
      faculty_id,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_PIMPINAN_FAKULTAS",
      entity_type: "User",
      entity_id: newUser.id,
      description: `User "${newUser.full_name}" telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successCreatedResponse(
      res,
      "Pimpinan Fakultas berhasil ditambahkan",
      newUser,
    );
  } catch (error) {
    console.error("Error adding pimpinan fakultas:", error);
    return errorResponse(res, "Gagal menambahkan pimpinan fakultas");
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { full_name, phone_number, faculty_id, department_id } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (faculty_id) {
      const faculty = await Faculty.findByPk(faculty_id);
      if (!faculty) {
        return errorResponse(res, "Fakultas tidak ditemukan", 404);
      }
    }

    if (department_id) {
      const department = await Department.findByPk(department_id);
      if (!department) {
        return errorResponse(res, "Departemen tidak ditemukan", 404);
      }
    }

    await user.update({ full_name, phone_number, faculty_id, department_id });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "UPDATE_USER",
      entity_type: "User",
      entity_id: user.id,
      description: `User "${user.full_name}" telah diperbarui oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "User berhasil diperbarui", user);
  } catch (error) {
    console.error("Error updating user:", error);
    return errorResponse(res, "Gagal memperbarui user");
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
