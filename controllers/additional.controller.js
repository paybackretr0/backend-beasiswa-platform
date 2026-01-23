const {
  ActivityLog,
  User,
  BackupHistory,
  ApplicationCommentTemplate,
} = require("../models");
const {
  applyHeaderStyle,
  applyDataRowStyle,
  applyCenterAlignment,
} = require("../utils/style");
const { successResponse, errorResponse } = require("../utils/response");
const { sequelize } = require("../models");
const { Op } = require("sequelize");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
// -- SQL Backup, Un-comment jika ingin menggunakannya -- //
// const { exec } = require("child_process");

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

// -- SQL Backup, Un-comment jika ingin menggunakannya -- //
// const createSqlBackup = async (userId) => {
//   const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
//   const fileName = `backup_database_${timestamp}.sql`;
//   const backupDir = path.join(__dirname, "../uploads/backups");
//   const filePath = path.join(backupDir, fileName);

//   if (!fs.existsSync(backupDir)) {
//     fs.mkdirSync(backupDir, { recursive: true });
//   }

//   return new Promise((resolve, reject) => {
//     const dbConfig = sequelize.config;
//     const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.username} ${dbConfig.database} > "${filePath}"`;
//     // const command = `mysqldump -h ${dbConfig.host} -u ${dbConfig.username} -p ${dbConfig.password} ${dbConfig.database} > "${filePath}"`;

//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         reject(error);
//         return;
//       }
//       resolve({
//         fileName,
//         filePath: `uploads/backups/${fileName}`,
//         size: fs.statSync(filePath).size,
//       });
//     });
//   });
// };

const createExcelBackup = async (userId) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup_database_${timestamp}.xlsx`;
  const backupDir = path.join(__dirname, "../uploads/backups");
  const filePath = path.join(backupDir, fileName);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Sistem Beasiswa";
  workbook.created = new Date();
  workbook.modified = new Date();

  try {
    const usersSheet = workbook.addWorksheet("Users", {
      properties: { tabColor: { argb: "FF4472C4" } },
    });

    const users = await sequelize.query(
      `SELECT u.id, u.email, u.full_name, u.nim, u.role, u.phone_number, 
              u.gender, u.is_active, u.emailVerified, u.last_login_at,
              f.name as faculty_name, d.name as department_name, 
              sp.code as study_program_code,
              u.createdAt, u.updatedAt
       FROM users u
       LEFT JOIN faculties f ON u.faculty_id = f.id
       LEFT JOIN departments d ON u.department_id = d.id
       LEFT JOIN study_programs sp ON u.study_program_id = sp.id
       ORDER BY u.createdAt DESC`,
      { type: sequelize.QueryTypes.SELECT },
    );

    usersSheet.columns = [
      { header: "Email", key: "email", width: 30 },
      { header: "Nama Lengkap", key: "full_name", width: 30 },
      { header: "NIM", key: "nim", width: 15 },
      { header: "Role", key: "role", width: 25 },
      { header: "Fakultas", key: "faculty_name", width: 30 },
      { header: "Jurusan", key: "department_name", width: 30 },
      { header: "Prodi", key: "study_program_code", width: 15 },
      { header: "No. HP", key: "phone_number", width: 15 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Status", key: "is_active", width: 10 },
      { header: "Email Verified", key: "emailVerified", width: 15 },
      { header: "Last Login", key: "last_login_at", width: 20 },
      { header: "Dibuat", key: "createdAt", width: 20 },
    ];

    usersSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    usersSheet.getRow(1).height = 25;

    users.forEach((user, index) => {
      const row = usersSheet.addRow({
        ...user,
        is_active: user.is_active ? "Aktif" : "Nonaktif",
        emailVerified: user.emailVerified ? "Ya" : "Tidak",
        last_login_at: user.last_login_at
          ? new Date(user.last_login_at).toLocaleString("id-ID")
          : "-",
        createdAt: new Date(user.createdAt).toLocaleString("id-ID"),
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        cell.alignment = { vertical: "middle" };
      });
    });

    const scholarshipsSheet = workbook.addWorksheet("Scholarships", {
      properties: { tabColor: { argb: "FF70AD47" } },
    });

    const scholarships = await sequelize.query(
      `SELECT s.id, s.name, s.organizer, s.year, s.quota, s.scholarship_value,
              s.duration_semesters, s.gpa_minimum, s.semester_minimum,
              s.start_date, s.end_date, s.is_active, s.is_external,
              s.verification_level, s.contact_person_name, s.contact_person_email,
              u.full_name as creator_name,
              s.createdAt, s.updatedAt
       FROM scholarships s
       LEFT JOIN users u ON s.created_by = u.id
       ORDER BY s.year DESC, s.createdAt DESC`,
      { type: sequelize.QueryTypes.SELECT },
    );

    scholarshipsSheet.columns = [
      { header: "Nama Beasiswa", key: "name", width: 40 },
      { header: "Penyelenggara", key: "organizer", width: 30 },
      { header: "Tahun", key: "year", width: 10 },
      { header: "Kuota", key: "quota", width: 10 },
      { header: "Nilai (Rp)", key: "scholarship_value", width: 15 },
      { header: "Durasi (Semester)", key: "duration_semesters", width: 15 },
      { header: "Min. IPK", key: "gpa_minimum", width: 10 },
      { header: "Min. Semester", key: "semester_minimum", width: 15 },
      { header: "Mulai", key: "start_date", width: 15 },
      { header: "Selesai", key: "end_date", width: 15 },
      { header: "Status", key: "is_active", width: 10 },
      { header: "External", key: "is_external", width: 10 },
      { header: "Verifikasi", key: "verification_level", width: 15 },
      { header: "CP Name", key: "contact_person_name", width: 25 },
      { header: "CP Email", key: "contact_person_email", width: 25 },
      { header: "Dibuat Oleh", key: "creator_name", width: 25 },
      { header: "Dibuat", key: "createdAt", width: 20 },
    ];

    scholarshipsSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF70AD47" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    scholarshipsSheet.getRow(1).height = 25;

    scholarships.forEach((scholarship, index) => {
      const row = scholarshipsSheet.addRow({
        ...scholarship,
        scholarship_value: scholarship.scholarship_value
          ? parseFloat(scholarship.scholarship_value).toLocaleString("id-ID")
          : "-",
        is_active: scholarship.is_active ? "Aktif" : "Nonaktif",
        is_external: scholarship.is_external ? "Ya" : "Tidak",
        start_date: scholarship.start_date
          ? new Date(scholarship.start_date).toLocaleDateString("id-ID")
          : "-",
        end_date: scholarship.end_date
          ? new Date(scholarship.end_date).toLocaleDateString("id-ID")
          : "-",
        createdAt: new Date(scholarship.createdAt).toLocaleString("id-ID"),
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        cell.alignment = { vertical: "middle" };
      });
    });

    const applicationsSheet = workbook.addWorksheet("Applications", {
      properties: { tabColor: { argb: "FFFFC000" } },
    });

    const applications = await sequelize.query(
      `SELECT a.id, 
              sch.name as scholarship_name,
              \`schema\`.name as schema_name,
              u.full_name as student_name, u.nim, u.email,
              a.status, a.submitted_at, a.verified_at, a.validated_at,
              a.rejected_at, a.revision_requested_at,
              verif.full_name as verified_by_name,
              valid.full_name as validated_by_name,
              a.createdAt, a.updatedAt
       FROM applications a
       INNER JOIN scholarship_schemas \`schema\` ON a.schema_id = \`schema\`.id
       INNER JOIN scholarships sch ON \`schema\`.scholarship_id = sch.id
       INNER JOIN users u ON a.student_id = u.id
       LEFT JOIN users verif ON a.verified_by = verif.id
       LEFT JOIN users valid ON a.validated_by = valid.id
       ORDER BY a.createdAt DESC
       LIMIT 1000`,
      { type: sequelize.QueryTypes.SELECT },
    );

    applicationsSheet.columns = [
      { header: "Beasiswa", key: "scholarship_name", width: 35 },
      { header: "Schema", key: "schema_name", width: 30 },
      { header: "Nama Mahasiswa", key: "student_name", width: 30 },
      { header: "NIM", key: "nim", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Status", key: "status", width: 20 },
      { header: "Diajukan", key: "submitted_at", width: 20 },
      { header: "Diverifikasi", key: "verified_at", width: 20 },
      { header: "Divalidasi", key: "validated_at", width: 20 },
      { header: "Ditolak", key: "rejected_at", width: 20 },
      { header: "Revisi Diminta", key: "revision_requested_at", width: 20 },
      { header: "Verifikator", key: "verified_by_name", width: 25 },
      { header: "Validator", key: "validated_by_name", width: 25 },
      { header: "Dibuat", key: "createdAt", width: 20 },
    ];

    applicationsSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFC000" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    applicationsSheet.getRow(1).height = 25;

    applications.forEach((app, index) => {
      const row = applicationsSheet.addRow({
        ...app,
        submitted_at: app.submitted_at
          ? new Date(app.submitted_at).toLocaleString("id-ID")
          : "-",
        verified_at: app.verified_at
          ? new Date(app.verified_at).toLocaleString("id-ID")
          : "-",
        validated_at: app.validated_at
          ? new Date(app.validated_at).toLocaleString("id-ID")
          : "-",
        rejected_at: app.rejected_at
          ? new Date(app.rejected_at).toLocaleString("id-ID")
          : "-",
        revision_requested_at: app.revision_requested_at
          ? new Date(app.revision_requested_at).toLocaleString("id-ID")
          : "-",
        createdAt: new Date(app.createdAt).toLocaleString("id-ID"),
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        cell.alignment = { vertical: "middle" };
      });

      const statusCell = row.getCell(6);
      switch (app.status) {
        case "VALIDATED":
          statusCell.font = { color: { argb: "FF22C55E" }, bold: true };
          break;
        case "VERIFIED":
          statusCell.font = { color: { argb: "FF3B82F6" }, bold: true };
          break;
        case "REJECTED":
          statusCell.font = { color: { argb: "FFEF4444" }, bold: true };
          break;
        case "REVISION_NEEDED":
          statusCell.font = { color: { argb: "FFF59E0B" }, bold: true };
          break;
      }
    });

    const govScholarshipsSheet = workbook.addWorksheet(
      "Beasiswa Pemerintah (APBN)",
      {
        properties: { tabColor: { argb: "FFED7D31" } },
      },
    );

    const govScholarships = await sequelize.query(
      `SELECT gs.nim, gs.student_name, gs.student_batch, gs.study_program,
              gs.semester, gs.ipk, gs.academic_status, gs.fiscal_year,
              gs.period, gs.assistance_scheme, gs.imported_at,
              u.full_name as imported_by_name
       FROM government_scholarships gs
       LEFT JOIN users u ON gs.imported_by = u.id
       ORDER BY gs.fiscal_year DESC, gs.ipk DESC`,
      { type: sequelize.QueryTypes.SELECT },
    );

    govScholarshipsSheet.columns = [
      { header: "NIM", key: "nim", width: 15 },
      { header: "Nama Mahasiswa", key: "student_name", width: 30 },
      { header: "Angkatan", key: "student_batch", width: 12 },
      { header: "Program Studi", key: "study_program", width: 30 },
      { header: "Semester", key: "semester", width: 10 },
      { header: "IPK", key: "ipk", width: 10 },
      { header: "Status Akademik", key: "academic_status", width: 15 },
      { header: "Tahun Fiskal", key: "fiscal_year", width: 12 },
      { header: "Periode", key: "period", width: 12 },
      { header: "Skema Bantuan", key: "assistance_scheme", width: 30 },
      { header: "Diimport Oleh", key: "imported_by_name", width: 25 },
      { header: "Diimport Pada", key: "imported_at", width: 20 },
    ];

    govScholarshipsSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFED7D31" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    govScholarshipsSheet.getRow(1).height = 25;

    govScholarships.forEach((gs, index) => {
      const row = govScholarshipsSheet.addRow({
        ...gs,
        ipk: gs.ipk ? parseFloat(gs.ipk).toFixed(2) : "0.00",
        imported_at: new Date(gs.imported_at).toLocaleString("id-ID"),
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        cell.alignment = { vertical: "middle" };
      });

      const ipkCell = row.getCell(6);
      const ipkValue = parseFloat(gs.ipk);
      if (ipkValue >= 3.5) {
        ipkCell.font = { color: { argb: "FF22C55E" }, bold: true };
      } else if (ipkValue >= 2.75) {
        ipkCell.font = { color: { argb: "FF3B82F6" }, bold: true };
      } else {
        ipkCell.font = { color: { argb: "FFEF4444" }, bold: true };
      }

      const statusCell = row.getCell(7);
      switch (gs.academic_status) {
        case "NORMAL":
          statusCell.font = { color: { argb: "FF22C55E" } };
          break;
        case "WARNING":
          statusCell.font = { color: { argb: "FFF59E0B" }, bold: true };
          break;
        case "REVOKED":
          statusCell.font = { color: { argb: "FFEF4444" }, bold: true };
          break;
      }
    });

    const orgSheet = workbook.addWorksheet("Fakultas & Jurusan", {
      properties: { tabColor: { argb: "FF5B9BD5" } },
    });

    const faculties = await sequelize.query(
      `SELECT f.code as faculty_code, f.name as faculty_name, f.is_active as faculty_active,
              d.code as dept_code, d.name as dept_name, d.is_active as dept_active,
              sp.code as prodi_code, sp.degree as prodi_degree, sp.is_active as prodi_active
       FROM faculties f
       LEFT JOIN departments d ON f.id = d.faculty_id
       LEFT JOIN study_programs sp ON d.id = sp.department_id
       ORDER BY f.name, d.name, sp.code`,
      { type: sequelize.QueryTypes.SELECT },
    );

    orgSheet.columns = [
      { header: "Kode Fakultas", key: "faculty_code", width: 15 },
      { header: "Nama Fakultas", key: "faculty_name", width: 30 },
      { header: "Status Fakultas", key: "faculty_active", width: 15 },
      { header: "Kode Jurusan", key: "dept_code", width: 15 },
      { header: "Nama Jurusan", key: "dept_name", width: 35 },
      { header: "Status Jurusan", key: "dept_active", width: 15 },
      { header: "Kode Prodi", key: "prodi_code", width: 15 },
      { header: "Jenjang", key: "prodi_degree", width: 12 },
      { header: "Status Prodi", key: "prodi_active", width: 15 },
    ];

    orgSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF5B9BD5" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    orgSheet.getRow(1).height = 25;

    faculties.forEach((org, index) => {
      const row = orgSheet.addRow({
        ...org,
        faculty_active: org.faculty_active ? "Aktif" : "Nonaktif",
        dept_active: org.dept_active ? "Aktif" : "Nonaktif",
        prodi_active: org.prodi_active ? "Aktif" : "Nonaktif",
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        cell.alignment = { vertical: "middle" };
      });
    });

    const logsSheet = workbook.addWorksheet("Activity Logs", {
      properties: { tabColor: { argb: "FF7030A0" } },
    });

    const logs = await sequelize.query(
      `SELECT al.action, al.entity_type, al.description, al.ip_address,
              u.full_name as user_name, u.email as user_email, u.role,
              al.createdAt
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.createdAt DESC
       LIMIT 500`,
      { type: sequelize.QueryTypes.SELECT },
    );

    logsSheet.columns = [
      { header: "Waktu", key: "createdAt", width: 20 },
      { header: "User", key: "user_name", width: 25 },
      { header: "Email", key: "user_email", width: 25 },
      { header: "Role", key: "role", width: 25 },
      { header: "Action", key: "action", width: 25 },
      { header: "Entity Type", key: "entity_type", width: 20 },
      { header: "Description", key: "description", width: 50 },
      { header: "IP Address", key: "ip_address", width: 15 },
    ];

    logsSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF7030A0" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    logsSheet.getRow(1).height = 25;

    logs.forEach((log, index) => {
      const row = logsSheet.addRow({
        ...log,
        createdAt: new Date(log.createdAt).toLocaleString("id-ID"),
      });

      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8F9FA" },
          };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        cell.alignment = { vertical: "middle", wrapText: true };
      });
    });

    const summarySheet = workbook.addWorksheet("Summary", {
      properties: { tabColor: { argb: "FFC00000" } },
    });

    const stats = await sequelize.query(
      `SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'MAHASISWA') as total_mahasiswa,
        (SELECT COUNT(*) FROM users WHERE role IN ('VERIFIKATOR_FAKULTAS', 'VERIFIKATOR_DITMAWA')) as total_verifikator,
        (SELECT COUNT(*) FROM scholarships) as total_scholarships,
        (SELECT COUNT(*) FROM scholarships WHERE is_active = 1) as active_scholarships,
        (SELECT COUNT(*) FROM applications) as total_applications,
        (SELECT COUNT(*) FROM applications WHERE status = 'VALIDATED') as validated_applications,
        (SELECT COUNT(*) FROM applications WHERE status = 'REJECTED') as rejected_applications,
        (SELECT COUNT(*) FROM government_scholarships) as total_gov_scholarships,
        (SELECT COUNT(*) FROM government_scholarships WHERE academic_status = 'WARNING') as warning_students,
        (SELECT COUNT(*) FROM faculties) as total_faculties,
        (SELECT COUNT(*) FROM departments) as total_departments,
        (SELECT COUNT(*) FROM study_programs) as total_study_programs`,
      { type: sequelize.QueryTypes.SELECT },
    );

    const stat = stats[0];

    summarySheet.mergeCells("A1:C1");
    const titleCell = summarySheet.getCell("A1");
    titleCell.value = "📊 STATISTIK SISTEM BEASISWA";
    titleCell.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC00000" },
    };
    summarySheet.getRow(1).height = 30;

    summarySheet.getColumn(1).width = 35;
    summarySheet.getColumn(2).width = 15;
    summarySheet.getColumn(3).width = 40;

    const addStatRow = (label, value, color = "FF4472C4") => {
      const row = summarySheet.addRow([label, value, ""]);
      row.getCell(1).font = { bold: true };
      row.getCell(2).font = { bold: true, size: 14 };
      row.getCell(2).alignment = { horizontal: "center" };
      row.getCell(2).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: color },
      };
      row.getCell(2).font = {
        ...row.getCell(2).font,
        color: { argb: "FFFFFFFF" },
      };
      row.height = 25;
    };

    summarySheet.addRow([]);
    summarySheet.addRow(["👥 DATA PENGGUNA", "", ""]).font = {
      bold: true,
      size: 12,
    };
    addStatRow("Total Users", stat.total_users, "FF4472C4");
    addStatRow("Mahasiswa", stat.total_mahasiswa, "FF70AD47");
    addStatRow("Verifikator", stat.total_verifikator, "FF5B9BD5");

    summarySheet.addRow([]);
    summarySheet.addRow(["🎓 DATA BEASISWA", "", ""]).font = {
      bold: true,
      size: 12,
    };
    addStatRow("Total Beasiswa", stat.total_scholarships, "FFFFC000");
    addStatRow("Beasiswa Aktif", stat.active_scholarships, "FF70AD47");

    summarySheet.addRow([]);
    summarySheet.addRow(["📝 DATA APLIKASI", "", ""]).font = {
      bold: true,
      size: 12,
    };
    addStatRow("Total Aplikasi", stat.total_applications, "FF4472C4");
    addStatRow("Tervalidasi", stat.validated_applications, "FF70AD47");
    addStatRow("Ditolak", stat.rejected_applications, "FFEF4444");

    summarySheet.addRow([]);
    summarySheet.addRow(["💰 BEASISWA PEMERINTAH", "", ""]).font = {
      bold: true,
      size: 12,
    };
    addStatRow("Total Penerima", stat.total_gov_scholarships, "FFED7D31");
    addStatRow("Status Warning", stat.warning_students, "FFF59E0B");

    summarySheet.addRow([]);
    summarySheet.addRow(["🏛️ STRUKTUR ORGANISASI", "", ""]).font = {
      bold: true,
      size: 12,
    };
    addStatRow("Total Fakultas", stat.total_faculties, "FF5B9BD5");
    addStatRow("Total Jurusan", stat.total_departments, "FF7030A0");
    addStatRow("Total Prodi", stat.total_study_programs, "FFED7D31");

    summarySheet.addRow([]);
    summarySheet.addRow([]);
    summarySheet.mergeCells(
      `A${summarySheet.rowCount}:C${summarySheet.rowCount}`,
    );
    const footerCell = summarySheet.getCell(`A${summarySheet.rowCount}`);
    footerCell.value = `Generated: ${new Date().toLocaleString("id-ID")} | Sistem Beasiswa`;
    footerCell.font = { italic: true, size: 9 };
    footerCell.alignment = { horizontal: "center" };

    await workbook.xlsx.writeFile(filePath);

    return {
      fileName,
      filePath: `uploads/backups/${fileName}`,
      size: fs.statSync(filePath).size,
    };
  } catch (error) {
    console.error("Error creating Excel backup:", error);
    throw error;
  }
};

const createBackup = async (req, res) => {
  try {
    const userId = req.user.id;

    const backupResult = await createExcelBackup(userId);
    const message = "Backup Excel berhasil dibuat";

    const newBackup = await BackupHistory.create({
      executed_by: userId,
      storage_target: "local",
      file_path: backupResult.filePath,
      status: "SUCCESS",
      message: `${message} - ${(backupResult.size / 1024 / 1024).toFixed(2)} MB`,
    });

    const { createActivityLog } = require("./additional.controller");
    await createActivityLog(
      userId,
      "Backup Database",
      "BackupHistory",
      newBackup.id,
      `Created Excel backup: ${backupResult.fileName}`,
      req.ip,
      req.headers["user-agent"],
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
      limit: 10000,
    });

    if (activityLogs.length === 0) {
      return errorResponse(res, "Tidak ada data untuk diexport", 404);
    }

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "Sistem Beasiswa";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("Activity Logs", {
      properties: { tabColor: { argb: "FF7030A0" } },
      views: [{ state: "frozen", xSplit: 0, ySplit: 4 }],
    });

    worksheet.mergeCells("A1:J1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "LAPORAN LOG AKTIVITAS SISTEM";
    titleCell.font = {
      bold: true,
      size: 16,
      color: { argb: "FFFFFFFF" },
    };
    titleCell.alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7030A0" },
    };
    worksheet.getRow(1).height = 35;

    worksheet.mergeCells("A2:J2");
    const infoCell = worksheet.getCell("A2");
    const filterInfo = [];
    if (startDate && endDate) {
      filterInfo.push(
        `Periode: ${new Date(startDate).toLocaleDateString("id-ID")} - ${new Date(endDate).toLocaleDateString("id-ID")}`,
      );
    }
    if (userId) {
      filterInfo.push(`User ID: ${userId}`);
    }
    if (action) {
      filterInfo.push(`Action: ${action}`);
    }

    infoCell.value =
      filterInfo.length > 0
        ? `Filter: ${filterInfo.join(" | ")}`
        : "Semua Data";
    infoCell.font = { italic: true, size: 10 };
    infoCell.alignment = { horizontal: "center" };
    infoCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    worksheet.getRow(2).height = 20;

    worksheet.mergeCells("A3:J3");
    const summaryCell = worksheet.getCell("A3");
    summaryCell.value = `Total Records: ${activityLogs.length} | Generated: ${new Date().toLocaleString("id-ID")}`;
    summaryCell.font = { bold: true, size: 11 };
    summaryCell.alignment = { horizontal: "center" };
    summaryCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE5E7EB" },
    };
    worksheet.getRow(3).height = 22;

    worksheet.getColumn(1).width = 6;
    worksheet.getColumn(2).width = 20;
    worksheet.getColumn(3).width = 25;
    worksheet.getColumn(4).width = 28;
    worksheet.getColumn(5).width = 22;
    worksheet.getColumn(6).width = 25;
    worksheet.getColumn(7).width = 18;
    worksheet.getColumn(8).width = 30;
    worksheet.getColumn(9).width = 50;
    worksheet.getColumn(10).width = 16;

    const headerRow = worksheet.getRow(4);
    headerRow.values = [
      "No",
      "Waktu",
      "Nama Pengguna",
      "Email",
      "Role",
      "Aksi",
      "Tipe Entitas",
      "ID Entitas",
      "Deskripsi",
      "Alamat IP",
    ];

    applyHeaderStyle(headerRow);
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7030A0" },
    };

    activityLogs.forEach((log, index) => {
      const rowData = [
        index + 1,
        new Date(log.createdAt).toLocaleString("id-ID", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        log.User?.full_name || "System",
        log.User?.email || "system@auto",
        log.User?.role || "SYSTEM",
        log.action,
        log.entity_type || "-",
        log.entity_id || "-",
        log.description || "-",
        log.ip_address || "-",
      ];

      const row = worksheet.addRow(rowData);

      applyDataRowStyle(row, index);

      row.getCell(9).alignment = {
        vertical: "middle",
        wrapText: true,
      };

      const roleCell = row.getCell(5);
      switch (log.User?.role) {
        case "SUPERADMIN":
          roleCell.font = { bold: true, color: { argb: "FFDC2626" } };
          break;
        case "PIMPINAN_DITMAWA":
          roleCell.font = { bold: true, color: { argb: "FFB45309" } };
          break;
        case "PIMPINAN_FAKULTAS":
          roleCell.font = { bold: true, color: { argb: "FF7C3AED" } };
          break;
        case "VALIDATOR_DITMAWA":
          roleCell.font = { color: { argb: "FF2563EB" } };
          break;
        case "VERIFIKATOR_DITMAWA":
          roleCell.font = { color: { argb: "FFDB2777" } };
          break;
        case "VERIFIKATOR_FAKULTAS":
          roleCell.font = { color: { argb: "FF059669" } };
          break;
        case "MAHASISWA":
          roleCell.font = { color: { argb: "FF6B7280" } };
          break;
        default:
          roleCell.font = { color: { argb: "FF374151" }, italic: true };
      }

      const actionCell = row.getCell(6);
      const actionText = log.action.toLowerCase();

      if (actionText.includes("delete") || actionText.includes("reject")) {
        actionCell.font = { bold: true, color: { argb: "FFEF4444" } };
      } else if (actionText.includes("create") || actionText.includes("add")) {
        actionCell.font = { bold: true, color: { argb: "FF10B981" } };
      } else if (actionText.includes("update") || actionText.includes("edit")) {
        actionCell.font = { color: { argb: "FF3B82F6" } };
      } else if (
        actionText.includes("approve") ||
        actionText.includes("validate")
      ) {
        actionCell.font = { bold: true, color: { argb: "FF8B5CF6" } };
      } else if (
        actionText.includes("export") ||
        actionText.includes("backup")
      ) {
        actionCell.font = { color: { argb: "FFF59E0B" } };
      } else if (
        actionText.includes("login") ||
        actionText.includes("logout")
      ) {
        actionCell.font = { color: { argb: "FF6366F1" } };
      }

      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
      row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };
    });

    const footerRowIndex = worksheet.rowCount + 1;
    worksheet.mergeCells(`A${footerRowIndex}:J${footerRowIndex}`);
    const footerCell = worksheet.getCell(`A${footerRowIndex}`);
    footerCell.value = `© ${new Date().getFullYear()} Sistem Beasiswa | Dicetak oleh: ${req.user?.full_name || "Administrator"}`;
    footerCell.font = {
      italic: true,
      size: 9,
      color: { argb: "FF6B7280" },
    };
    footerCell.alignment = { horizontal: "center", vertical: "middle" };
    footerCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF3F4F6" },
    };
    worksheet.getRow(footerRowIndex).height = 22;

    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4, column: 10 },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `activity_logs_${timestamp}.xlsx`;
    const backupDir = path.join(__dirname, "../uploads/exports");
    const filePath = path.join(backupDir, fileName);

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    await workbook.xlsx.writeFile(filePath);

    const fileSize = fs.statSync(filePath).size;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);

    await createActivityLog(
      req.user.id,
      "Export Activity Logs",
      "ActivityLog",
      null,
      `Exported ${activityLogs.length} activity logs to Excel (${fileSizeMB} MB)`,
      req.ip,
      req.headers["user-agent"],
    );

    return successResponse(res, "Export berhasil", {
      fileName,
      filePath: `uploads/exports/${fileName}`,
      totalRecords: activityLogs.length,
      fileSize: fileSizeMB + " MB",
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
  user_agent,
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
      req.headers["user-agent"],
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
      req.headers["user-agent"],
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
      req.headers["user-agent"],
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
      req.headers["user-agent"],
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
