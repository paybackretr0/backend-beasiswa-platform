"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Information extends Model {
    static associate(models) {
      // Information belongs to User (author)
      Information.belongsTo(models.User, {
        foreignKey: "author_id",
        as: "author",
      });
    }
  }
  Information.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      type: {
        type: DataTypes.ENUM("NEWS", "ARTICLE"),
        allowNull: false,
        defaultValue: "NEWS",
      },
      title: {
        type: DataTypes.STRING(191),
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING(191),
        allowNull: false,
        unique: true,
      },
      content: {
        type: DataTypes.TEXT("long"),
        allowNull: false,
      },
      cover_url: {
        type: DataTypes.STRING(512),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("DRAFT", "PUBLISHED", "ARCHIVED"),
        allowNull: false,
        defaultValue: "DRAFT",
      },
      author_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Information",
      tableName: "informations",
      timestamps: true, // createdAt & updatedAt otomatis
    }
  );
  return Information;
};
