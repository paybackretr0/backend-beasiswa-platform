const { Information, ActivityLog, Staff, User } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { getFileInfo } = require("../utils/upload");
const { generateUniqueSlug } = require("../utils/slug");
const { getOrSetCache } = require("../utils/cacheHelper");

const informationAuthorInclude = [
  {
    model: Staff,
    as: "author",
    attributes: ["id", "staff_number", "faculty_id"],
    required: false,
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "full_name", "email"],
        required: false,
      },
    ],
  },
];

const resolveAuthorStaff = async (userId) => {
  if (!userId) return null;

  return Staff.findByPk(userId, {
    attributes: ["id", "staff_number", "faculty_id"],
  });
};

const getAllNews = async (req, res) => {
  try {
    const data = await getOrSetCache("admin_news", 300, async () => {
      return await Information.findAll({
        where: { type: "NEWS" },
        include: informationAuthorInclude,
        order: [["createdAt", "DESC"]],
      });
    });

    return successResponse(res, "Berita berhasil diambil", data);
  } catch (error) {
    console.error("Error fetching news:", error);
    return errorResponse(res, "Gagal mengambil berita", 500);
  }
};

const getAllArticles = async (req, res) => {
  try {
    const data = await getOrSetCache("admin_articles", 300, async () => {
      return await Information.findAll({
        where: { type: "ARTICLE" },
        include: informationAuthorInclude,
        order: [["createdAt", "DESC"]],
      });
    });

    return successResponse(res, "Artikel berhasil diambil", data);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return errorResponse(res, "Gagal mengambil artikel", 500);
  }
};

const createInformation = async (req, res) => {
  try {
    const { type, title, content, status } = req.body;

    if (!type || !title || !content) {
      return errorResponse(res, "Type, title, dan content wajib diisi", 400);
    }

    if (!req.file) {
      return errorResponse(res, "Gambar wajib diunggah", 400);
    }

    const fileInfo = getFileInfo(req.file);
    const cover_url = fileInfo.url;

    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const slug = await generateUniqueSlug(Information, baseSlug);
    const authorStaff = await resolveAuthorStaff(req.user?.id);

    if (!authorStaff) {
      return errorResponse(
        res,
        "Akun login belum memiliki profil staff, sehingga tidak dapat menjadi author informasi",
        400,
      );
    }

    const newInformation = await Information.create({
      type,
      title,
      slug,
      content,
      cover_url,
      status,
      author_id: authorStaff.id,
      published_at: status === "PUBLISHED" ? new Date() : null,
    });

    const createdInformation = await Information.findByPk(newInformation.id, {
      include: informationAuthorInclude,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "CREATE_INFORMATION",
      entity_type: "Information",
      entity_id: newInformation.id,
      description: `Informasi "${newInformation.title}" telah dibuat oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Informasi berhasil dibuat",
      createdInformation,
      201,
    );
  } catch (error) {
    console.error("Error creating information:", error);
    return errorResponse(res, "Gagal membuat informasi", 500);
  }
};

const editInformation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status } = req.body;

    const information = await Information.findByPk(id);
    if (!information) {
      return errorResponse(res, "Informasi tidak ditemukan", 404);
    }

    const updateData = {};

    if (title !== undefined && title !== null) {
      updateData.title = title;

      if (title && title !== information.title) {
        const baseSlug = title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        updateData.slug = await generateUniqueSlug(Information, baseSlug, id);
      }
    }

    if (content !== undefined && content !== null) {
      updateData.content = content;
    }

    if (status !== undefined && status !== null) {
      updateData.status = status;
      updateData.published_at =
        status === "PUBLISHED" ? new Date() : information.published_at;
    }

    if (req.file) {
      const fileInfo = getFileInfo(req.file);
      updateData.cover_url = fileInfo.url;
    }

    await information.update(updateData);

    const updatedInformation = await Information.findByPk(information.id, {
      include: informationAuthorInclude,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "UPDATE_INFORMATION",
      entity_type: "Information",
      entity_id: information.id,
      description: `Informasi "${information.title}" telah diperbarui oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Informasi berhasil diperbarui",
      updatedInformation,
    );
  } catch (error) {
    console.error("Error editing information:", error);
    return errorResponse(res, "Gagal memperbarui informasi", 500);
  }
};

const deleteInformation = async (req, res) => {
  try {
    const { id } = req.params;

    const information = await Information.findByPk(id);
    if (!information) {
      return errorResponse(res, "Informasi tidak ditemukan", 404);
    }

    await information.destroy();

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "DELETE_INFORMATION",
      entity_type: "Information",
      entity_id: information.id,
      description: `Informasi "${information.title}" telah dihapus oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(res, "Informasi berhasil dihapus");
  } catch (error) {
    console.error("Error deleting information:", error);
    return errorResponse(res, "Gagal menghapus informasi", 500);
  }
};

const publishInformation = async (req, res) => {
  try {
    const { id } = req.params;
    const information = await Information.findByPk(id);
    if (!information) {
      return errorResponse(res, "Informasi tidak ditemukan", 404);
    }
    await information.update({
      status: "PUBLISHED",
      published_at: new Date(),
    });

    const publishedInformation = await Information.findByPk(information.id, {
      include: informationAuthorInclude,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "PUBLISH_INFORMATION",
      entity_type: "Information",
      entity_id: information.id,
      description: `Informasi "${information.title}" telah dipublish oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Informasi berhasil dipublikasikan",
      publishedInformation,
    );
  } catch (error) {
    console.error("Error publishing information:", error);
    return errorResponse(res, "Gagal mempublikasikan informasi", 500);
  }
};

const archiveInformation = async (req, res) => {
  try {
    const { id } = req.params;
    const information = await Information.findByPk(id);
    if (!information) {
      return errorResponse(res, "Informasi tidak ditemukan", 404);
    }
    await information.update({
      status: "ARCHIVED",
    });

    const archivedInformation = await Information.findByPk(information.id, {
      include: informationAuthorInclude,
    });

    const userName = req.user.full_name || "User";
    await ActivityLog.create({
      user_id: req.user.id,
      action: "ARCHIVE_INFORMATION",
      entity_type: "Information",
      entity_id: information.id,
      description: `Informasi "${information.title}" telah diarsipkan oleh ${userName}.`,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
    });

    return successResponse(
      res,
      "Informasi berhasil diarsipkan",
      archivedInformation,
    );
  } catch (error) {
    console.error("Error archiving information:", error);
    return errorResponse(res, "Gagal mengarsipkan informasi", 500);
  }
};

const getLatestInformation = async (req, res) => {
  try {
    const data = await getOrSetCache("latest_informations", 300, async () => {
      return await Information.findAll({
        where: { status: "PUBLISHED" },
        include: informationAuthorInclude,
        order: [["published_at", "DESC"]],
        limit: 3,
      });
    });

    return successResponse(res, "Informasi terbaru berhasil diambil", data);
  } catch (error) {
    console.error("Error fetching latest information:", error);
    return errorResponse(res, "Gagal mengambil informasi terbaru", 500);
  }
};

const getInformationBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const data = await getOrSetCache(
      `information_slug:${slug}`,
      600,
      async () => {
        return await Information.findOne({
          where: { slug },
          include: informationAuthorInclude,
        });
      },
    );

    if (!data) {
      return errorResponse(res, "Informasi tidak ditemukan", 404);
    }

    return successResponse(res, "Informasi berhasil diambil", data);
  } catch (error) {
    console.error("Error fetching information by slug:", error);
    return errorResponse(res, "Gagal mengambil informasi", 500);
  }
};

const getAllInformations = async (req, res) => {
  try {
    const data = await getOrSetCache("public_informations", 300, async () => {
      return await Information.findAll({
        where: { status: "PUBLISHED" },
        include: informationAuthorInclude,
        order: [["createdAt", "DESC"]],
      });
    });

    return successResponse(res, "Semua informasi berhasil diambil", data);
  } catch (error) {
    console.error("Error fetching all informations:", error);
    return errorResponse(res, "Gagal mengambil informasi", 500);
  }
};

module.exports = {
  getAllNews,
  getAllArticles,
  createInformation,
  editInformation,
  deleteInformation,
  publishInformation,
  archiveInformation,
  getLatestInformation,
  getInformationBySlug,
  getAllInformations,
};
