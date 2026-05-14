"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const rows = [
      {
        id: Sequelize.literal("UUID()"),
        type: "NEWS",
        title: "Pembukaan Beasiswa Unggulan 2026",
        slug: "pembukaan-beasiswa-unggulan-2026",
        content:
          "Pendaftaran beasiswa unggulan 2026 resmi dibuka. Mahasiswa dapat mendaftar melalui portal resmi dan melengkapi dokumen yang dipersyaratkan.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "NEWS",
        title: "Jadwal Verifikasi Berkas Tahap 1",
        slug: "jadwal-verifikasi-berkas-tahap-1",
        content:
          "Verifikasi berkas tahap 1 dilaksanakan mulai 15 Mei 2026. Pastikan semua dokumen telah diunggah dan sesuai ketentuan.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "NEWS",
        title: "Pengumuman Kuota Beasiswa Fakultas",
        slug: "pengumuman-kuota-beasiswa-fakultas",
        content:
          "Kuota beasiswa per fakultas telah ditetapkan. Silakan cek detail kuota pada dashboard masing-masing fakultas.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "NEWS",
        title: "Pemeliharaan Sistem Akhir Pekan",
        slug: "pemeliharaan-sistem-akhir-pekan",
        content:
          "Sistem beasiswa akan menjalani pemeliharaan pada Sabtu 18 Mei 2026 pukul 22.00-02.00 WIB.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "NEWS",
        title: "Update Persyaratan Dokumen",
        slug: "update-persyaratan-dokumen",
        content:
          "Ada penyesuaian persyaratan dokumen untuk beberapa skema beasiswa. Mohon periksa daftar dokumen terbaru.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "ARTICLE",
        title: "Tips Menyiapkan Berkas Beasiswa",
        slug: "tips-menyiapkan-berkas-beasiswa",
        content:
          "Siapkan berkas sejak awal agar proses pendaftaran lancar. Pastikan format dokumen sesuai dan nama file jelas.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "ARTICLE",
        title: "Cara Memantau Status Pendaftaran",
        slug: "cara-memantau-status-pendaftaran",
        content:
          "Pantau status pendaftaran melalui menu riwayat. Setiap perubahan status akan tercatat lengkap.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "ARTICLE",
        title: "Mengenal Skema Beasiswa di UNAND",
        slug: "mengenal-skema-beasiswa-di-unand",
        content:
          "Setiap beasiswa memiliki skema dan persyaratan berbeda. Pelajari skema yang paling sesuai dengan profil kamu.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "ARTICLE",
        title: "Strategi Lolos Seleksi Administrasi",
        slug: "strategi-lolos-seleksi-administrasi",
        content:
          "Lengkapi seluruh dokumen dan perhatikan detail. Kesalahan kecil sering menjadi alasan gagal.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: Sequelize.literal("UUID()"),
        type: "ARTICLE",
        title: "Panduan Menulis Esai Beasiswa",
        slug: "panduan-menulis-esai-beasiswa",
        content:
          "Esai yang baik menceritakan tujuan dan rencana akademik secara jelas. Gunakan bahasa yang ringkas dan jujur.",
        cover_url: null,
        status: "PUBLISHED",
        author_id: null,
        published_at: now,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert("informations", rows, {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("informations", {
      slug: [
        "pembukaan-beasiswa-unggulan-2026",
        "jadwal-verifikasi-berkas-tahap-1",
        "pengumuman-kuota-beasiswa-fakultas",
        "pemeliharaan-sistem-akhir-pekan",
        "update-persyaratan-dokumen",
        "tips-menyiapkan-berkas-beasiswa",
        "cara-memantau-status-pendaftaran",
        "mengenal-skema-beasiswa-di-unand",
        "strategi-lolos-seleksi-administrasi",
        "panduan-menulis-esai-beasiswa",
      ],
    });
  },
};
