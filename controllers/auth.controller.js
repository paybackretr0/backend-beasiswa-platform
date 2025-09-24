const { hashPassword, comparePassword } = require("../utils/password");
const jwt = require("../utils/jwt");
const { User, RefreshToken, Faculty, Department } = require("../models");
const nodemailer = require("nodemailer");
const { Op } = require("sequelize");
const {
  successResponse,
  errorResponse,
  successCreatedResponse,
} = require("../utils/response");
const {
  parseNimFromEmail,
  extractKodeFakultasDepartemen,
  generateVerificationCode,
} = require("../utils/parse_nim");

const sendVerificationEmail = async (user, code) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Kode Verifikasi Email Akun Beasiswa",
    html: `
      <p>Halo ${user.full_name || user.name},</p>
      <p>Gunakan kode berikut untuk verifikasi email Anda:</p>
      <h2 style="color:#2D60FF;">${code}</h2>
      <p>Kode ini berlaku selama 10 menit.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const register = async (req, res) => {
  const { name, email, password, password_confirmation } = req.body;
  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return errorResponse(res, "User already exists", 400);
    }

    if (password !== password_confirmation) {
      return errorResponse(res, "Password confirmation does not match", 400);
    }

    // Ambil NIM dari email
    const nim = parseNimFromEmail(email);

    let faculty_id = null;
    let department_id = null;

    if (nim) {
      const { kodeFakultas, kodeDepartemen } =
        extractKodeFakultasDepartemen(nim);

      if (!kodeFakultas || !kodeDepartemen) {
        return errorResponse(res, "Invalid NIM format", 400);
      }

      // Cari fakultas berdasarkan kode
      const faculty = await Faculty.findOne({ where: { code: kodeFakultas } });
      if (faculty) {
        faculty_id = faculty.id;

        // Cari departemen di fakultas tersebut berdasarkan kode
        const department = await Department.findOne({
          where: {
            faculty_id: faculty.id,
            code: kodeDepartemen,
          },
        });
        if (department) {
          department_id = department.id;
        }
      }
    }

    const hashedPassword = await hashPassword(password);

    const verificationCode = generateVerificationCode();

    const newUser = await User.create({
      email,
      password: hashedPassword,
      full_name: name,
      role: "MAHASISWA",
      nim,
      faculty_id,
      department_id,
      emailVerificationCode: verificationCode,
      emailVerified: false,
    });

    await sendVerificationEmail(newUser, verificationCode);

    return successCreatedResponse(
      res,
      "Registration successful. Silakan cek email untuk verifikasi.",
      { user_id: newUser.id },
      201
    );
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
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

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
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
      }
    );

    return successResponse(res, "Login successful", {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "Bearer",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const sendResetEmail = async (user, code) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "Kode Reset Password Akun Beasiswa",
    html: `
      <p>Halo ${user.full_name || user.name},</p>
      <p>Gunakan kode berikut untuk reset password Anda:</p>
      <h2 style="color:#2D60FF;">${code}</h2>
      <p>Kode ini berlaku selama 10 menit.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Untuk keamanan, response tetap sukses walau email tidak ditemukan
      return successResponse(
        res,
        "Jika email terdaftar, kode reset akan dikirim",
        200
      );
    }

    const resetCode = generateVerificationCode();
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    await user.update({
      resetPasswordCode: resetCode,
      resetPasswordExpires: expirationTime,
    });

    await sendResetEmail(user, resetCode);

    return successResponse(
      res,
      "Kode reset password telah dikirim ke email Anda"
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

    return successResponse(
      res,
      "Kode reset valid, silakan lanjutkan reset password"
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

    const hashedPassword = await hashPassword(new_password);
    await user.update({
      password: hashedPassword,
      resetPasswordCode: null,
      resetPasswordExpires: null,
    });

    return successResponse(res, "Password berhasil direset, silakan login");
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const updateProfile = async (req, res) => {
  const { full_name, phone_number, gender } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    // Validasi gender jika diisi
    if (gender && !["L", "P"].includes(gender)) {
      return errorResponse(res, "Gender harus L atau P", 400);
    }

    await user.update({
      full_name: full_name ?? user.full_name,
      phone_number: phone_number ?? user.phone_number,
      gender: gender ?? user.gender,
    });

    return successResponse(res, "Profil berhasil diupdate", {
      id: user.id,
      full_name: user.full_name,
      phone_number: user.phone_number,
      gender: user.gender,
      email: user.email,
      role: user.role,
    });
  } catch (error) {
    return errorResponse(res, "Internal server error", 500, error.message);
  }
};

const updatePassword = async (req, res) => {
  const { current_password, new_password, new_password_confirmation } =
    req.body;

  try {
    if (new_password !== new_password_confirmation) {
      return errorResponse(
        res,
        "New password and confirmation do not match",
        400
      );
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const isPasswordValid = await comparePassword(
      current_password,
      user.password
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
      },
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
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "Profil berhasil diambil", user);
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
};
