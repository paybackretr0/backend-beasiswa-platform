const { ActivityLog, User, BackupHistory } = require("../models");
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

module.exports = {
  getAllBackups,
  createBackup,
  getAllActivityLogs,
  exportActivityLogsToExcel,
  createActivityLog,
};
