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
          model: "students",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Mahasiswa yang melakukan pendaftaran",
      },

      schema_study_program_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "scholarship_schema_study_programs",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
        comment: "Kombinasi skema dan program studi yang diizinkan",
      },

      status: {
        type: Sequelize.ENUM(
          "DRAFT",
          "MENUNGGU_VERIFIKASI",
          "VERIFIED",
          "REJECTED",
          "REVISION_NEEDED",
          "VALIDATED",
          "AWARDEE",
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
          model: "staffs",
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
          model: "staffs",
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
          model: "staffs",
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
          model: "staffs",
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

      revision_submitted_at: {
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
      name: "uq_applications_schema_student",
    });

    await queryInterface.addIndex("applications", ["id", "schema_id"], {
      unique: true,
      name: "uq_applications_id_schema",
    });

    await queryInterface.addIndex("applications", ["schema_id"], {
      name: "idx_applications_schema_id",
    });

    await queryInterface.addIndex("applications", ["student_id"], {
      name: "idx_applications_student_id",
    });

    await queryInterface.addIndex("applications", ["schema_study_program_id"], {
      name: "idx_applications_schema_study_program_id",
    });

    await queryInterface.addIndex("applications", ["status"], {
      name: "idx_applications_status",
    });

    await queryInterface.addIndex("applications", ["verified_by"], {
      name: "idx_applications_verified_by",
    });

    await queryInterface.addIndex("applications", ["validated_by"], {
      name: "idx_applications_validated_by",
    });

    await queryInterface.addIndex("applications", ["rejected_by"], {
      name: "idx_applications_rejected_by",
    });

    await queryInterface.addIndex("applications", ["revision_requested_by"], {
      name: "idx_applications_revision_requested_by",
    });

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_applications_check_before_insert
      BEFORE INSERT ON applications
      FOR EACH ROW
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM students s
          JOIN scholarship_schema_study_programs sssp
            ON sssp.study_program_id = s.study_program_id
          WHERE s.id = NEW.student_id
            AND sssp.id = NEW.schema_study_program_id
            AND sssp.schema_id = NEW.schema_id
        ) THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Mahasiswa tidak sesuai dengan skema dan program studi yang diizinkan';
        END IF;
      END;
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER trg_applications_check_before_update
      BEFORE UPDATE ON applications
      FOR EACH ROW
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM students s
          JOIN scholarship_schema_study_programs sssp
            ON sssp.study_program_id = s.study_program_id
          WHERE s.id = NEW.student_id
            AND sssp.id = NEW.schema_study_program_id
            AND sssp.schema_id = NEW.schema_id
        ) THEN
          SIGNAL SQLSTATE '45000'
          SET MESSAGE_TEXT = 'Mahasiswa tidak sesuai dengan skema dan program studi yang diizinkan';
        END IF;
      END;
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_applications_check_before_update;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_applications_check_before_insert;
    `);

    await queryInterface.dropTable("applications");
  },
};
