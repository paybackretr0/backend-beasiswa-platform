"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("applications", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      schema_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schemas",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Skema beasiswa yang dipilih mahasiswa",
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      status: {
        type: Sequelize.ENUM(
          "DRAFT",
          "MENUNGGU_VERIFIKASI",
          "VERIFIED",
          "REJECTED",
          "REVISION_NEEDED",
          "VALIDATED",
        ),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      status_before_revision: {
        type: Sequelize.ENUM("MENUNGGU_VERIFIKASI", "VERIFIED"),
        allowNull: true,
        comment:
          "Menyimpan status pendaftaran sebelum permintaan revisi diajukan",
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verified_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      validated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      validated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      rejected_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      rejected_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revision_requested_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      revision_requested_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      revision_deadline: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addConstraint("applications", {
      fields: ["schema_id", "student_id"],
      type: "unique",
      name: "applications_unique_schema_student",
    });

    await queryInterface.addIndex("applications", ["schema_id"], {
      name: "applications_idx_schema",
    });

    await queryInterface.addIndex("applications", ["student_id"], {
      name: "applications_idx_student",
    });

    await queryInterface.addIndex("applications", ["status"], {
      name: "applications_idx_status",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("applications");
  },
};
