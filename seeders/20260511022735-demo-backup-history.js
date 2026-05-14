"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const rows = Array.from({ length: 10 }, (_, index) => {
      const createdAt = new Date(now.getTime() - index * 60 * 60 * 1000);
      const isSuccess = index % 3 !== 0;
      const seq = String(index + 1).padStart(2, "0");

      return {
        id: Sequelize.literal("UUID()"),
        executed_by: null,
        storage_target: index % 2 === 0 ? "LOCAL" : "S3",
        file_path: `/backups/demo/backup_${seq}.sql.gz`,
        status: isSuccess ? "SUCCESS" : "FAILED",
        message: isSuccess
          ? "Backup completed successfully"
          : "Backup failed: storage connection timeout",
        createdAt,
      };
    });

    await queryInterface.bulkInsert("backup_histories", rows, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("backup_histories", {
      file_path: [
        "/backups/demo/backup_01.sql.gz",
        "/backups/demo/backup_02.sql.gz",
        "/backups/demo/backup_03.sql.gz",
        "/backups/demo/backup_04.sql.gz",
        "/backups/demo/backup_05.sql.gz",
        "/backups/demo/backup_06.sql.gz",
        "/backups/demo/backup_07.sql.gz",
        "/backups/demo/backup_08.sql.gz",
        "/backups/demo/backup_09.sql.gz",
        "/backups/demo/backup_10.sql.gz",
      ],
    });
  },
};
