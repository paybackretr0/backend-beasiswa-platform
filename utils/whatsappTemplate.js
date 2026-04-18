const formatRupiah = (amount) => {
  if (!amount && amount !== 0) return "-";

  const numericValue = Number(amount);
  if (Number.isNaN(numericValue)) return String(amount);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Belum ditentukan";

  return new Date(dateValue).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const buildScholarshipDetailUrl = (scholarshipId) => {
  const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendBase.replace(/\/$/, "")}/scholarship/${scholarshipId}`;
};

const buildNewScholarshipMessage = ({
  scholarship,
  totalSchemas = 0,
  recipientName,
}) => {
  const safeName = recipientName || "Mahasiswa";

  const lines = [
    "🎓 *INFO BEASISWA BARU UNAND* 🎓",
    "",
    `Halo, *${safeName}* 👋`,
    "Ada *beasiswa baru* yang mungkin cocok buat kamu!",
    "",
    `📌 *${scholarship.name}*`,
    `🏢 Penyelenggara: ${scholarship.organizer || "-"}`,
    `📅 Tahun: ${scholarship.year || "-"}`,
    "",
    "💰 *Detail Beasiswa:*",
    `- Nilai: *${formatRupiah(scholarship.scholarship_value)}*`,
    `- Durasi: ${scholarship.duration_semesters || "-"} semester`,
    `- Jumlah skema: ${totalSchemas}`,
    "",
    "⏰ *Jadwal Pendaftaran:*",
    `- Dibuka: ${formatDate(scholarship.start_date)}`,
    `- Ditutup: ${formatDate(scholarship.end_date)}`,
    "",
  ];

  if (scholarship.is_external && scholarship.website_url) {
    lines.push("");
    lines.push("🌐 *Daftar langsung di sini:*");
    lines.push(`${scholarship.website_url}`);
  } else {
    lines.push("");
    lines.push("🔗 *Cek detail & daftar di sini:*");
    lines.push(buildScholarshipDetailUrl(scholarship.id));
  }

  if (scholarship.contact_person_name || scholarship.contact_person_phone) {
    lines.push("");
    lines.push("📞 *Kontak:*");
    lines.push(
      `${scholarship.contact_person_name || "-"} (${scholarship.contact_person_phone || "-"})`,
    );
  }

  lines.push("");
  lines.push("⚡ *Jangan sampai ketinggalan!*");
  lines.push("Segera daftar sebelum kuota penuh 🚀");

  return lines.join("\n");
};

module.exports = {
  buildNewScholarshipMessage,
  buildApplicationProcessMessage,
};

function formatDateTimeWIB(dateValue) {
  if (!dateValue) return "-";

  return new Date(dateValue).toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  });
}

function getStatusMeta(statusKey) {
  const statusMap = {
    VERIFIED: {
      title: "✅ *PENDAFTARAN DIVERIFIKASI*",
      label: "Diverifikasi",
      intro: "Pendaftaran beasiswa kamu sudah diverifikasi.",
    },
    REVISION_NEEDED: {
      title: "🔄 *PERMINTAAN REVISI PENDAFTARAN*",
      label: "Perlu Revisi",
      intro: "Pendaftaran beasiswa kamu membutuhkan revisi.",
    },
    REJECTED: {
      title: "❌ *PENDAFTARAN DITOLAK*",
      label: "Ditolak",
      intro: "Pendaftaran beasiswa kamu belum dapat dilanjutkan.",
    },
    VALIDATED: {
      title: "🎉 *PENDAFTARAN DIVALIDASI*",
      label: "Divalidasi",
      intro: "Selamat, pendaftaran beasiswa kamu sudah divalidasi.",
    },
  };

  return statusMap[statusKey] || statusMap.VERIFIED;
}

function buildApplicationProcessMessage({
  recipientName,
  statusKey,
  scholarshipName,
  schemaName,
  revisionDeadline,
  comments = [],
}) {
  const safeName = recipientName || "Mahasiswa";
  const statusMeta = getStatusMeta(statusKey);
  const normalizedComments = comments.filter(
    (item) => item && item.trim() !== "",
  );

  const lines = [
    statusMeta.title,
    "",
    `Halo, *${safeName}* 👋`,
    statusMeta.intro,
    "",
    "📄 *Detail Pendaftaran:*",
    `- Beasiswa: ${scholarshipName || "-"}`,
    `- Skema: ${schemaName || "-"}`,
    `- Status: *${statusMeta.label}*`,
  ];

  if (statusKey === "REVISION_NEEDED" && revisionDeadline) {
    lines.push(
      `- Deadline revisi: *${formatDateTimeWIB(revisionDeadline)} WIB*`,
    );
  }

  if (normalizedComments.length > 0) {
    lines.push("");
    lines.push("📝 *Catatan:* ");

    normalizedComments.slice(0, 5).forEach((comment) => {
      lines.push(`- ${comment}`);
    });

    if (normalizedComments.length > 5) {
      lines.push(`- (+${normalizedComments.length - 5} catatan lainnya)`);
    }
  }

  lines.push("");
  if (statusKey === "REVISION_NEEDED") {
    lines.push(
      "⚡ Segera perbaiki pendaftaran kamu sebelum deadline berakhir.",
    );
  } else if (statusKey === "REJECTED") {
    lines.push("Tetap semangat, kamu bisa mencoba peluang beasiswa lainnya.");
  } else {
    lines.push("Terima kasih sudah mengikuti proses pendaftaran beasiswa.");
  }

  return lines.join("\n");
}
