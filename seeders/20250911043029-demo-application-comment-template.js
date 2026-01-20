"use strict";
const { v4: uuidv4 } = require("uuid");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const superadminId = "00000000-0000-0000-0000-000000000000";

    await queryInterface.bulkInsert(
      "application_comment_templates",
      [
        {
          id: uuidv4(),
          template_name: "Dokumen Tidak Lengkap",
          comment_text:
            "Dokumen yang Anda upload belum lengkap. Silakan lengkapi semua dokumen yang dipersyaratkan.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Foto Tidak Jelas",
          comment_text:
            "Foto dokumen yang diupload kurang jelas/blur. Mohon upload ulang dengan kualitas yang lebih baik.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "IPK Tidak Memenuhi",
          comment_text:
            "Maaf, IPK Anda tidak memenuhi syarat minimum untuk beasiswa ini.",
          template_type: "REJECTION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Sudah Menerima Beasiswa Lain",
          comment_text:
            "Berdasarkan data yang kami terima, Anda sudah menerima beasiswa dari sumber lain. Sesuai ketentuan, penerima beasiswa ini tidak boleh menerima beasiswa ganda.",
          template_type: "REJECTION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Data Tidak Sesuai",
          comment_text:
            "Data yang Anda masukkan tidak sesuai dengan dokumen pendukung. Mohon periksa kembali dan perbaiki.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Format Dokumen Salah",
          comment_text:
            "Format dokumen yang diupload tidak sesuai ketentuan. Harap upload dalam format PDF dengan ukuran maksimal 2MB.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "SKTM Tidak Valid",
          comment_text:
            "Surat Keterangan Tidak Mampu (SKTM) yang diupload tidak valid atau sudah kadaluarsa. Mohon upload SKTM yang masih berlaku.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Transkrip Nilai Tidak Lengkap",
          comment_text:
            "Transkrip nilai yang diupload belum mencakup semester yang dipersyaratkan. Mohon upload transkrip nilai terbaru.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Semester Tidak Memenuhi",
          comment_text:
            "Maaf, Anda belum memenuhi syarat semester minimum untuk mengikuti beasiswa ini.",
          template_type: "REJECTION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Tanda Tangan Tidak Ada",
          comment_text:
            "Dokumen yang diupload belum ditandatangani. Mohon upload dokumen yang sudah ditandatangani oleh pihak yang berwenang.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Stempel/Cap Tidak Ada",
          comment_text:
            "Dokumen yang diupload belum ada stempel/cap resmi. Mohon upload dokumen yang sudah distempel oleh instansi terkait.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Tidak Sesuai Prodi/Fakultas",
          comment_text:
            "Maaf, program studi/fakultas Anda tidak termasuk dalam target penerima beasiswa ini.",
          template_type: "REJECTION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Surat Rekomendasi Belum Ada",
          comment_text:
            "Mohon melengkapi surat rekomendasi dari dosen pembimbing akademik atau Ketua Jurusan.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "KTP/KK Tidak Sesuai",
          comment_text:
            "KTP/KK yang diupload tidak sesuai dengan data yang diisikan. Mohon periksa kembali.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: uuidv4(),
          template_name: "Berkas Kadaluarsa",
          comment_text:
            "Dokumen yang diupload sudah kadaluarsa atau tidak berlaku lagi. Mohon upload dokumen terbaru yang masih berlaku.",
          template_type: "REVISION",
          is_active: true,
          created_by: superadminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("application_comment_templates", null, {});
  },
};
