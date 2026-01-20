const {
  ActivityLog,
  User,
  BackupHistory,
  ApplicationCommentTemplate,
} = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { sequelize } = require("../models");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const getAllBackups = async (req, res) => {
  try {
    const backups = await BackupHistory.findAll({
      include: [
        {
          model: User,
          attributes: ["id", "email", "full_name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    return successResponse(res, "Backup data berhasil diambil", backups);
  } catch (error) {
    console.error("Error fetching backups:", error);
    return errorResponse(res, "Gagal mengambil backup data", 500);
  }
};

const createSqlBackup = async (userId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_database_${timestamp}.sql`;
  const backupDir = path.join(__dirname, "../uploads/backups");
  const filePath = path.join(backupDir, fileName);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  return new Promise((resolve, reject) => {
    const dbConfig = sequelize.config;
    const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.username} ${dbConfig.database} > "${filePath}"`;
    // const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.username} -p ${dbConfig.password} ${dbConfig.database} > "${filePath}"`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        fileName,
        filePath: `uploads/backups/${fileName}`,
        size: fs.statSync(filePath).size,
      });
    });
  });
};

const createExcelBackup = async (userId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_database_${timestamp}.xlsx`;
  const backupDir = path.join(__dirname, "../uploads/backups");
  const filePath = path.join(backupDir, fileName);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();

  const tables = [
    "users",
    "scholarships",
    "applications",
    "informations",
    "backup_histories",
    "activity_logs",
  ];

  try {
    for (const tableName of tables) {
      const worksheet = workbook.addWorksheet(tableName);

      const [results, metadata] = await sequelize.query(
        `SELECT * FROM ${tableName}`
      );

      if (results.length > 0) {
        const columns = Object.keys(results[0]);

        worksheet.columns = columns.map((col) => ({
          header: col,
          key: col,
          width: 20,
        }));

        results.forEach((row) => {
          worksheet.addRow(row);
        });

        worksheet.getRow(1).eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };
        });
      }
    }

    await workbook.xlsx.writeFile(filePath);

    return {
      fileName,
      filePath: `uploads/backups/${fileName}`,
      size: fs.statSync(filePath).size,
    };
  } catch (error) {
    throw error;
  }
};

const createBackup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { backupType } = req.body;

    let backupResult;
    let message;

    if (backupType === "excel") {
      backupResult = await createExcelBackup(userId);
      message = "Backup Excel berhasil dibuat";
    } else {
      backupResult = await createSqlBackup(userId);
      message = "Backup SQL berhasil dibuat";
    }

    const newBackup = await BackupHistory.create({
      executed_by: userId,
      storage_target: "local",
      file_path: backupResult.filePath,
      status: "SUCCESS",
      message: `${message} - ${(backupResult.size / 1024 / 1024).toFixed(
        2
      )} MB`,
    });

    createActivityLog(
      userId,
      "Backup Database",
      "BackupHistory",
      newBackup.id,
      `Created SQL backup: ${backupResult.fileName}`,
      req.ip,
      req.headers["user-agent"]
    );

    return successResponse(res, message, newBackup);
  } catch (error) {
    console.error("Error creating backup:", error);

    try {
      await BackupHistory.create({
        executed_by: req.user?.id,
        storage_target: "local",
        file_path: null,
        status: "FAILED",
        message: error.message,
      });
    } catch (logError) {
      console.error("Error logging failed backup:", logError);
    }

    return errorResponse(res, "Gagal membuat backup", 500);
  }
};

const exportActivityLogsToExcel = async (req, res) => {
  try {
    const { startDate, endDate, userId, action } = req.query;

    const whereConditions = {};
    if (startDate && endDate) {
      whereConditions.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }
    if (userId) {
      whereConditions.user_id = userId;
    }
    if (action) {
      whereConditions.action = { [Op.like]: `%${action}%` };
    }

    const activityLogs = await ActivityLog.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          attributes: ["id", "email", "full_name", "role"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Activity Logs");

    worksheet.columns = [
      { header: "Timestamp", key: "timestamp", width: 20 },
      { header: "User Email", key: "userEmail", width: 25 },
      { header: "User Name", key: "userName", width: 25 },
      { header: "Role", key: "role", width: 20 },
      { header: "Action", key: "action", width: 20 },
      { header: "Entity Type", key: "entityType", width: 15 },
      { header: "Entity ID", key: "entityId", width: 30 },
      { header: "Description", key: "description", width: 50 },
      { header: "IP Address", key: "ipAddress", width: 15 },
      { header: "User Agent", key: "userAgent", width: 40 },
    ];

    activityLogs.forEach((log) => {
      worksheet.addRow({
        timestamp: log.createdAt.toISOString(),
        userEmail: log.User?.email || "System",
        userName: log.User?.full_name || "System",
        role: log.User?.role || "SYSTEM",
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        description: log.description,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
      });
    });

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `activity_logs_${timestamp}.xlsx`;
    const backupDir = path.join(__dirname, "../uploads/exports");
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    await createActivityLog(
      req.user.id,
      "Export Activity Logs",
      "ActivityLog",
      null,
      `Exported ${activityLogs.length} activity logs to Excel`,
      req.ip,
      req.headers["user-agent"]
    );

    return successResponse(res, "Export berhasil", {
      fileName,
      filePath: `uploads/exports/${fileName}`,
      totalRecords: activityLogs.length,
    });
  } catch (error) {
    console.error("Error exporting activity logs:", error);
    return errorResponse(res, "Gagal mengekspor log aktivitas", 500);
  }
};

const getAllActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      action,
      startDate,
      endDate,
    } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = {};
    const userWhereConditions = {};

    if (search) {
      whereConditions[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
      ];
      userWhereConditions[Op.or] = [
        { full_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role && role !== "Semua") {
      userWhereConditions.role = role;
    }

    if (action) {
      whereConditions.action = { [Op.like]: `%${action}%` };
    }

    if (startDate && endDate) {
      whereConditions.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const { count, rows: activityLogs } = await ActivityLog.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          attributes: ["id", "email", "full_name", "role"],
          where:
            Object.keys(userWhereConditions).length > 0
              ? userWhereConditions
              : undefined,
          required: search || (role && role !== "Semua") ? true : false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return successResponse(res, "Berhasil mendapatkan log aktivitas", {
      logs: activityLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error getting activity logs:", error);
    return errorResponse(res, "Gagal mendapatkan log aktivitas", 500);
  }
};

const createActivityLog = async (
  userId,
  action,
  entityType,
  entityId,
  description,
  ip_address,
  user_agent
) => {
  try {
    const newLog = await ActivityLog.create({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      description,
      ip_address,
      user_agent,
    });
    return newLog;
  } catch (error) {
    console.error("Error creating activity log:", error);
    return null;
  }
};

const getAllCommentTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, status } = req.query;
    const offset = (page - 1) * limit;

    const whereConditions = {};

    if (search) {
      whereConditions[Op.or] = [
        { template_name: { [Op.like]: `%${search}%` } },
        { comment_text: { [Op.like]: `%${search}%` } },
      ];
    }

    if (type && type !== "Semua") {
      whereConditions.template_type = type;
    }

    if (status !== undefined && status !== "Semua") {
      whereConditions.is_active = status === "Aktif";
    }

    const { count, rows: templates } =
      await ApplicationCommentTemplate.findAndCountAll({
        where: whereConditions,
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "full_name", "email"],
          },
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

    return successResponse(res, "Template berhasil diambil", {
      templates,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalRecords: count,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching comment templates:", error);
    return errorResponse(res, "Gagal mengambil template komentar", 500);
  }
};

const getCommentTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await ApplicationCommentTemplate.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "full_name", "email"],
        },
      ],
    });

    if (!template) {
      return errorResponse(res, "Template tidak ditemukan", 404);
    }

    return successResponse(res, "Template berhasil diambil", template);
  } catch (error) {
    console.error("Error fetching comment template:", error);
    return errorResponse(res, "Gagal mengambil template komentar", 500);
  }
};

const createCommentTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { template_name, comment_text, template_type, is_active } = req.body;

    if (!template_name || !comment_text || !template_type) {
      return errorResponse(res, "Semua field wajib diisi", 400);
    }

    if (!["REJECTION", "REVISION", "GENERAL"].includes(template_type)) {
      return errorResponse(res, "Tipe template tidak valid", 400);
    }

    const existingTemplate = await ApplicationCommentTemplate.findOne({
      where: { template_name },
    });

    if (existingTemplate) {
      return errorResponse(res, "Nama template sudah digunakan", 400);
    }

    const newTemplate = await ApplicationCommentTemplate.create({
      template_name,
      comment_text,
      template_type,
      is_active: is_active !== undefined ? is_active : true,
      created_by: userId,
    });

    await createActivityLog(
      userId,
      "Create Comment Template",
      "ApplicationCommentTemplate",
      newTemplate.id,
      `Created template: ${template_name}`,
      req.ip,
      req.headers["user-agent"]
    );

    return successResponse(res, "Template berhasil dibuat", newTemplate, 201);
  } catch (error) {
    console.error("Error creating comment template:", error);
    return errorResponse(res, "Gagal membuat template komentar", 500);
  }
};

const updateCommentTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { template_name, comment_text, template_type, is_active } = req.body;

    const template = await ApplicationCommentTemplate.findByPk(id);

    if (!template) {
      return errorResponse(res, "Template tidak ditemukan", 404);
    }

    if (
      template_type &&
      !["REJECTION", "REVISION", "GENERAL"].includes(template_type)
    ) {
      return errorResponse(res, "Tipe template tidak valid", 400);
    }

    if (template_name && template_name !== template.template_name) {
      const existingTemplate = await ApplicationCommentTemplate.findOne({
        where: {
          template_name,
          id: { [Op.ne]: id },
        },
      });

      if (existingTemplate) {
        return errorResponse(res, "Nama template sudah digunakan", 400);
      }
    }

    await template.update({
      template_name: template_name || template.template_name,
      comment_text: comment_text || template.comment_text,
      template_type: template_type || template.template_type,
      is_active: is_active !== undefined ? is_active : template.is_active,
    });

    await createActivityLog(
      userId,
      "Update Comment Template",
      "ApplicationCommentTemplate",
      template.id,
      `Updated template: ${template.template_name}`,
      req.ip,
      req.headers["user-agent"]
    );

    return successResponse(res, "Template berhasil diperbarui", template);
  } catch (error) {
    console.error("Error updating comment template:", error);
    return errorResponse(res, "Gagal memperbarui template komentar", 500);
  }
};

const activateCommentTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const template = await ApplicationCommentTemplate.findByPk(id);

    if (!template) {
      return errorResponse(res, "Template tidak ditemukan", 404);
    }

    if (template.is_active) {
      return errorResponse(res, "Template sudah dalam status aktif", 400);
    }

    await template.update({ is_active: true });

    await createActivityLog(
      userId,
      "Activate Comment Template",
      "ApplicationCommentTemplate",
      template.id,
      `Activated template: ${template.template_name}`,
      req.ip,
      req.headers["user-agent"]
    );

    return successResponse(res, "Template berhasil diaktifkan", template);
  } catch (error) {
    console.error("Error activating comment template:", error);
    return errorResponse(res, "Gagal mengaktifkan template komentar", 500);
  }
};

const deactivateCommentTemplate = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const template = await ApplicationCommentTemplate.findByPk(id);

    if (!template) {
      return errorResponse(res, "Template tidak ditemukan", 404);
    }

    if (!template.is_active) {
      return errorResponse(res, "Template sudah dalam status nonaktif", 400);
    }

    await template.update({ is_active: false });

    await createActivityLog(
      userId,
      "Deactivate Comment Template",
      "ApplicationCommentTemplate",
      template.id,
      `Deactivated template: ${template.template_name}`,
      req.ip,
      req.headers["user-agent"]
    );

    return successResponse(res, "Template berhasil dinonaktifkan", template);
  } catch (error) {
    console.error("Error deactivating comment template:", error);
    return errorResponse(res, "Gagal menonaktifkan template komentar", 500);
  }
};

const getActiveTemplatesByType = async (req, res) => {
  try {
    const { type } = req.params;

    if (!["REJECTION", "REVISION", "GENERAL"].includes(type)) {
      return errorResponse(res, "Tipe template tidak valid", 400);
    }

    const templates = await ApplicationCommentTemplate.findAll({
      where: {
        template_type: type,
        is_active: true,
      },
      attributes: ["id", "template_name", "comment_text"],
      order: [["template_name", "ASC"]],
    });

    return successResponse(res, "Template berhasil diambil", templates);
  } catch (error) {
    console.error("Error fetching active templates:", error);
    return errorResponse(res, "Gagal mengambil template aktif", 500);
  }
};

module.exports = {
  getAllBackups,
  createBackup,
  getAllActivityLogs,
  exportActivityLogsToExcel,
  createActivityLog,
  getAllCommentTemplates,
  getCommentTemplateById,
  createCommentTemplate,
  updateCommentTemplate,
  activateCommentTemplate,
  deactivateCommentTemplate,
  getActiveTemplatesByType,
};
