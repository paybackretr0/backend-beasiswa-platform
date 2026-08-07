const { hashPassword, comparePassword } = require("../utils/password");
const jwt = require("../utils/jwt");
const {
  User,
  Student,
  Staff,
  RefreshToken,
  Faculty,
  Department,
  StudyProgram,
  ActivityLog,
  sequelize,
} = require("../models");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const {
  successResponse,
  errorResponse,
  successCreatedResponse,
} = require("../utils/response");
const {
  parseNimFromEmail,
  generateVerificationCode,
} = require("../utils/parse_nim");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

const sendVerificationEmail = async (user, code) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Kode Verifikasi Email Akun Beasiswa",
    html: `
      <p>Halo ${user.full_name || user.name},</p>
      <p>Gunakan kode berikut untuk verifikasi email Anda:</p>
      <h2 style="color:#2D60FF;">${code}</h2>
      <p>Kode ini berlaku selama 10 menit.</p>
    `,
  });
};

const register = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const {
      full_name,
      email,
      password,
      password_confirmation,
      birth_date,
      birth_place,
      gender,
      phone_number,
      study_program_id,
    } = req.body;

    if (!study_program_id) {
      await t.rollback();
      return errorResponse(res, "Program Studi harus dipilih", 400);
    }

    const existingUser = await User.findOne({
      where: { email },
      transaction: t,
      lock: true,
    });

    if (existingUser) {
      await t.rollback();
      return errorResponse(
        res,
        "Email sudah terdaftar. Silakan gunakan email lain.",
        409,
      );
    }

    if (password !== password_confirmation) {
      await t.rollback();
      return errorResponse(res, "Konfirmasi password tidak cocok", 400);
    }

    const nim = parseNimFromEmail(email);
    if (!nim) {
      await t.rollback();
      return errorResponse(
        res,
        "Format email tidak valid. Gunakan format: NIM_nama@student.unand.ac.id",
        400,
      );
    }

    const studyProgram = await StudyProgram.findOne({
      where: {
        id: study_program_id,
        is_active: true,
      },
      include: [
        {
          model: Department,
          as: "department",
          attributes: ["id", "faculty_id"],
          include: [
            {
              model: Faculty,
              as: "faculty",
              attributes: ["id"],
            },
          ],
        },
      ],
      transaction: t,
    });

    if (!studyProgram) {
      await t.rollback();
      return errorResponse(
        res,
        "Program Studi tidak valid atau tidak sesuai dengan departemen",
        400,
      );
    }

    const hashedPassword = await hashPassword(password);
    const verificationCode = generateVerificationCode();

    const newUser = await User.create(
      {
        full_name,
        email,
        password: hashedPassword,
        role: "MAHASISWA",
        phone_number,
        emailVerificationCode: verificationCode,
        emailVerified: false,
      },
      { transaction: t },
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
      { transaction: t },
    );

    await ActivityLog.create(
      {
        user_id: newUser.id,
        action: "REGISTER",
        entity_type: "User",
        entity_id: newUser.id,
        description: `User baru "${full_name}" berhasil mendaftar dengan email ${email}`,
        ip_address: req.ip,
        user_agent: req.headers["user-agent"],
      },
      { transaction: t },
    );

    await t.commit();

    try {
      await sendVerificationEmail(newUser, verificationCode);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }

    return successCreatedResponse(
      res,
      "Registrasi berhasil. Silakan cek email untuk verifikasi.",
      {
        user_id: newUser.id,
      },
    );
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }
    console.error("Registration error:", error);
    return errorResponse(res, "Terjadi kesalahan saat registrasi", 500);
  }
};

const verifyEmail = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }
    if (user.emailVerified) {
      return errorResponse(res, "Email sudah diverifikasi", 400);
    }
    if (user.emailVerificationCode !== code) {
      return errorResponse(res, "Kode verifikasi salah", 400);
    }
    await user.update({
      emailVerified: true,
      emailVerificationCode: null,
    });
    return successResponse(res, "Email berhasil diverifikasi");
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (user.emailVerified) {
      return errorResponse(res, "Email sudah diverifikasi", 400);
    }

    const verificationCode = generateVerificationCode();

    await user.update({
      emailVerificationCode: verificationCode,
    });

    await sendVerificationEmail(user, verificationCode);

    return successResponse(res, "Kode verifikasi baru telah dikirim");
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Student,
          as: "student",
          include: [
            {
              model: StudyProgram,
              as: "study_program",
              attributes: ["id", "code", "degree", "name"],
              include: [
                {
                  model: Department,
                  as: "department",
                  attributes: ["id", "code", "name"],
                  include: [
                    {
                      model: Faculty,
                      as: "faculty",
                      attributes: ["id", "code", "name"],
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
          include: [
            {
              model: Faculty,
              as: "faculty",
              attributes: ["id", "code", "name"],
            },
          ],
        },
      ],
    });

    if (!user) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    const accessToken = jwt.generateAccessToken(user);
    const refreshToken = jwt.generateRefreshToken(user);

    const userAgent = req.headers["user-agent"];

    await RefreshToken.create({
      token: refreshToken,
      user_id: user.id,
      deviceInfo: userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await User.update(
      { last_login_at: new Date() },
      {
        where: { id: user.id },
      },
    );

    return successResponse(res, "Login successful", {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        phone_number: user.phone_number,
        emailVerified: user.emailVerified,
        student: user.student
          ? {
              id: user.student.id,
              nim: user.student.nim,
              gender: user.student.gender,
              birth_date: user.student.birth_date,
              birth_place: user.student.birth_place,
              study_program_id: user.student.study_program_id,
              study_program: user.student.study_program
                ? {
                    id: user.student.study_program.id,
                    code: user.student.study_program.code,
                    name: user.student.study_program.name,
                    degree: user.student.study_program.degree,
                  }
                : null,
              department: user.student.study_program?.department
                ? {
                    id: user.student.study_program.department.id,
                    code: user.student.study_program.department.code,
                    name: user.student.study_program.department.name,
                  }
                : null,
              faculty: user.student.study_program?.department?.faculty
                ? {
                    id: user.student.study_program.department.faculty.id,
                    code: user.student.study_program.department.faculty.code,
                    name: user.student.study_program.department.faculty.name,
                  }
                : null,
            }
          : null,
        staff: user.staff
          ? {
              id: user.staff.id,
              gender: user.staff.gender,
              staff_number: user.staff.staff_number,
              faculty_id: user.staff.faculty_id,
              faculty: user.staff.faculty
                ? {
                    id: user.staff.faculty.id,
                    code: user.staff.faculty.code,
                    name: user.staff.faculty.name,
                  }
                : null,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const sendResetEmail = async (user, code) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Kode Reset Password Akun Beasiswa",
    html: `
      <p>Halo ${user.full_name || user.name},</p>
      <p>Gunakan kode berikut untuk reset password Anda:</p>
      <h2 style="color:#2D60FF;">${code}</h2>
      <p>Kode ini berlaku selama 10 menit.</p>
    `,
  });
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return successResponse(
        res,
        "Jika email terdaftar, kode reset akan dikirim",
        200,
      );
    }

    if (!user.emailVerified) {
      return errorResponse(res, "Email belum diverifikasi", 400);
    }

    const resetCode = generateVerificationCode();
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000);

    await user.update({
      resetPasswordCode: resetCode,
      resetPasswordExpires: expirationTime,
    });

    await sendResetEmail(user, resetCode);

    return successResponse(
      res,
      "Kode reset password telah dikirim ke email Anda",
    );
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const verifyResetCode = async (req, res) => {
  const { email, code } = req.body;
  try {
    const user = await User.findOne({
      where: {
        email,
        resetPasswordCode: code,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return errorResponse(res, "Kode reset salah atau sudah kadaluarsa", 400);
    }

    if (!user.emailVerified) {
      return errorResponse(res, "Email belum diverifikasi", 400);
    }

    return successResponse(
      res,
      "Kode reset valid, silakan lanjutkan reset password",
    );
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const resetPassword = async (req, res) => {
  const { email, code, new_password } = req.body;
  try {
    const user = await User.findOne({
      where: {
        email,
        resetPasswordCode: code,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) {
      return errorResponse(res, "Kode reset salah atau sudah kadaluarsa", 400);
    }

    if (!user.emailVerified) {
      return errorResponse(res, "Email belum diverifikasi", 400);
    }

    const hashedPassword = await hashPassword(new_password);
    await user.update({
      password: hashedPassword,
      resetPasswordCode: null,
      resetPasswordExpires: null,
    });

    await ActivityLog.create({
      user_id: user.id,
      action: "RESET_PASSWORD",
      entity_type: "User",
      entity_id: user.id,
      description: `Pengguna dengan email ${user.email} melakukan reset password.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "Password berhasil direset, silakan login");
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const updateProfile = async (req, res) => {
  const { phone_number, gender, birth_date, birth_place } = req.body;

  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Student,
          as: "student",
        },
        {
          model: Staff,
          as: "staff",
        },
      ],
    });
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (gender && !["L", "P"].includes(gender)) {
      return errorResponse(res, "Gender harus L atau P", 400);
    }

    await user.update({
      phone_number: phone_number ?? user.phone_number,
    });

    if (user.role === "MAHASISWA" && user.student) {
      await user.student.update({
        gender: gender ?? user.student.gender,
        birth_date: birth_date ?? user.student.birth_date,
        birth_place: birth_place ?? user.student.birth_place,
      });
    } else if (user.staff) {
      await user.staff.update({
        gender: gender ?? user.staff.gender,
      });
    }

    await ActivityLog.create({
      user_id: user.id,
      action: "UPDATE_PROFILE",
      entity_type: "User",
      entity_id: user.id,
      description: `Pengguna dengan email ${user.email} memperbarui profilnya.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "Profil berhasil diupdate", {
      id: user.id,
      full_name: user.full_name,
      phone_number: user.phone_number,
      gender:
        user.role === "MAHASISWA" ? user.student?.gender : user.staff?.gender,
      birth_date:
        user.role === "MAHASISWA" ? user.student?.birth_date : undefined,
      birth_place:
        user.role === "MAHASISWA" ? user.student?.birth_place : undefined,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const updatePassword = async (req, res) => {
  const {
    current_password,
    new_password,
    new_password_confirmation,
    refresh_token,
  } = req.body;

  try {
    if (new_password !== new_password_confirmation) {
      return errorResponse(
        res,
        "New password and confirmation do not match",
        400,
      );
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const isPasswordValid = await comparePassword(
      current_password,
      user.password,
    );
    if (!isPasswordValid) {
      return errorResponse(res, "Current password is incorrect", 401);
    }

    const hashedPassword = await hashPassword(new_password);

    await user.update({
      password: hashedPassword,
    });

    await RefreshToken.destroy({
      where: {
        user_id: user.id,
        token: { [Op.ne]: refresh_token },
      },
    });

    await ActivityLog.create({
      user_id: user.id,
      action: "UPDATE_PASSWORD",
      entity_type: "User",
      entity_id: user.id,
      description: `Pengguna dengan email ${user.email} memperbarui passwordnya.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "Password updated successfully");
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const logout = async (req, res) => {
  const refreshToken = req.body.refresh_token;

  try {
    await RefreshToken.destroy({
      where: {
        token: refreshToken,
      },
    });

    return successResponse(res, "Logout successful");
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Student,
          as: "student",
          include: [
            {
              model: StudyProgram,
              as: "study_program",
              attributes: ["code", "name", "degree"],
              include: [
                {
                  model: Department,
                  as: "department",
                  attributes: ["name"],
                  include: [
                    {
                      model: Faculty,
                      as: "faculty",
                      attributes: ["name"],
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
          include: [
            {
              model: Faculty,
              as: "faculty",
              attributes: ["name"],
            },
          ],
        },
      ],
      attributes: {
        exclude: ["password", "emailVerificationCode", "resetPasswordCode"],
      },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "Profil berhasil diambil", user);
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const getBasicProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "email", "full_name", "emailVerified", "role"],
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "Basic profil berhasil diambil", user);
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const getToken = async (req, res) => {
  const { refresh_token } = req.body;

  try {
    const existingToken = await RefreshToken.findOne({
      where: {
        token: refresh_token,
      },
    });

    if (!existingToken) {
      return errorResponse(res, "Invalid refresh token", 401);
    }

    const user = await User.findByPk(existingToken.user_id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const newAccessToken = jwt.generateAccessToken(user);

    return successResponse(res, "Token refreshed successfully", {
      access_token: newAccessToken,
      token_type: "Bearer",
    });
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  updateProfile,
  updatePassword,
  logout,
  getProfile,
  getToken,
  sendVerificationEmail,
  sendResetEmail,
  getBasicProfile,
};
