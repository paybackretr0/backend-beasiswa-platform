const { Information, ActivityLog } = require("../models");
const { successResponse, errorResponse } = require("../utils/response");
const { getFileInfo } = require("../utils/upload");
const { generateUniqueSlug } = require("../utils/slug");

const getAllNews = async (req, res) => {
  try {
    const news = await Information.findAll({
      where: { type: "NEWS" },
      order: [["createdAt", "DESC"]],
    });
    return successResponse(res, "Berita berhasil diambil", news);
  } catch (error) {
    console.error("Error fetching news:", error);
    return errorResponse(res, "Gagal mengambil berita", 500);
  }
};

const getAllArticles = async (req, res) => {
  try {
    const articles = await Information.findAll({
      where: { type: "ARTICLE" },
      order: [["createdAt", "DESC"]],
    });
    return successResponse(res, "Artikel berhasil diambil", articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    return errorResponse(res, "Gagal mengambil artikel", 500);
  }
};

const createInformation = async (req, res) => {
  try {
    const { type, title, content, status, meta } = req.body;

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

    let parsedMeta = {};
    if (meta) {
      try {
        parsedMeta = typeof meta === "string" ? JSON.parse(meta) : meta;
      } catch (error) {
        console.error("Error parsing meta:", error);
        parsedMeta = {};
      }
    }

    const newInformation = await Information.create({
      type,
      title,
      slug,
      content,
      cover_url,
      status,
      author_id: req.user ? req.user.id : null,
      meta: parsedMeta,
      published_at: status === "PUBLISHED" ? new Date() : null,
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
      newInformation,
      201
    );
  } catch (error) {
    console.error("Error creating information:", error);
    return errorResponse(res, "Gagal membuat informasi", 500);
  }
};

const editInformation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, status, meta } = req.body;

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

    if (meta !== undefined && meta !== null) {
      try {
        updateData.meta = typeof meta === "string" ? JSON.parse(meta) : meta;
      } catch (error) {
        console.error("Error parsing meta:", error);
      }
    }

    await information.update(updateData);

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

    return successResponse(res, "Informasi berhasil diperbarui", information);
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
      information
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
      archived_at: new Date(),
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

    return successResponse(res, "Informasi berhasil diarsipkan", information);
  } catch (error) {
    console.error("Error archiving information:", error);
    return errorResponse(res, "Gagal mengarsipkan informasi", 500);
  }
};

const getLatestInformation = async (req, res) => {
  try {
    const information = await Information.findAll({
      where: { status: "PUBLISHED" },
      order: [["published_at", "DESC"]],
      limit: 3,
    });
    return successResponse(
      res,
      "Informasi terbaru berhasil diambil",
      information
    );
  } catch (error) {
    console.error("Error fetching latest information:", error);
    return errorResponse(res, "Gagal mengambil informasi terbaru", 500);
  }
};

const getInformationBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    console.log("Fetching information for slug:", slug);
    const information = await Information.findOne({ where: { slug } });
    if (!information) {
      return errorResponse(res, "Informasi tidak ditemukan", 404);
    }
    return successResponse(res, "Informasi berhasil diambil", information);
  } catch (error) {
    console.error("Error fetching information by slug:", error);
    return errorResponse(res, "Gagal mengambil informasi", 500);
  }
};

const getAllInformations = async (req, res) => {
  try {
    const informations = await Information.findAll({
      order: [["createdAt", "DESC"]],
    });
    return successResponse(
      res,
      "Semua informasi berhasil diambil",
      informations
    );
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
