const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const SEMESTER_ORDER = [
  "Genap 2024/2025",
  "Ganjil 2025/2026",
  "Genap 2025/2026",
];

const QUESTIONS = {
  "Genap 2024/2025": {
    kemudahan:
      "Seberapa mudah Anda menggunakan aplikasi ini untuk mendukung kegiatan mengajar?",
    responsif:
      "Apakah BINUS Sokrates responsif dalam menangani pertanyaan atau masalah Anda?",
    solusi:
      "Apakah solusi yang BINUS Sokrates berikan sudah tepat untuk setiap masalah yang terjadi?",
    kepuasan:
      "Seberapa puas Anda secara keseluruhan terhadap aplikasi dan layanannya?",
    saran:
      "Masukan atau saran untuk meningkatkan aplikasi maupun layanannya",
  },
  "Ganjil 2025/2026": {
    kemudahan:
      "Seberapa mudah Anda menggunakan aplikasi ini untuk mendukung kegiatan mengajar?",
    responsif:
      "Apakah Sokrates responsif dalam menangani pertanyaan atau masalah Anda?",
    solusi:
      "Apakah solusi yang diberikan oleh Sokrates sudah tepat untuk setiap masalah yang terjadi?",
    kepuasan:
      "Seberapa puas Anda secara keseluruhan terhadap aplikasi dan layanannya?",
    saran:
      "Masukan atau saran untuk meningkatkan aplikasi maupun layanannya",
  },
  "Genap 2025/2026": {
    kemudahan:
      "Seberapa mudah Anda menggunakan aplikasi ini untuk mendukung kegiatan mengajar?",
    responsif:
      "Apakah BINUS Sokrates responsif dalam menangani pertanyaan atau masalah Anda?",
    solusi:
      "Apakah solusi yang BINUS Sokrates berikan sudah tepat untuk setiap masalah yang terjadi?",
    kepuasan:
      "Seberapa puas Anda secara keseluruhan terhadap aplikasi dan layanannya?",
    menu: "Menu yang sering digunakan / bermanfaat bagi Anda/sekolah",
    saran:
      "Masukan atau saran untuk meningkatkan aplikasi maupun layanannya",
    school_location: "School Location",
  },
};

function scoreRow(row) {
  const kemudahan = row.kemudahan === null ? null : Number(row.kemudahan);
  const responsif = row.responsif === null ? null : Number(row.responsif);
  const solusi = row.solusi === null ? null : Number(row.solusi);
  const kepuasan = row.kepuasan === null ? null : Number(row.kepuasan);
  const scores = [kemudahan, responsif, solusi, kepuasan].filter(
    (v) => v !== null
  );
  const skor5 =
    scores.length === 0
      ? null
      : scores.reduce((a, b) => a + b, 0) / scores.length;
  const skor6 = skor5 === null ? null : (skor5 * 6) / 5;
  const questions = QUESTIONS[row.semester] || QUESTIONS["Genap 2025/2026"];

  const answers = [
    {
      key: "kemudahan",
      no: 1,
      soal: questions.kemudahan,
      tipe: "skor",
      isi: kemudahan,
    },
    {
      key: "responsif",
      no: 2,
      soal: questions.responsif,
      tipe: "skor",
      isi: responsif,
    },
    {
      key: "solusi",
      no: 3,
      soal: questions.solusi,
      tipe: "skor",
      isi: solusi,
    },
    {
      key: "kepuasan",
      no: 4,
      soal: questions.kepuasan,
      tipe: "skor",
      isi: kepuasan,
    },
  ];

  if (questions.menu) {
    answers.push({
      key: "menu",
      no: 5,
      soal: questions.menu,
      tipe: "teks",
      isi: row.menu,
    });
  }

  answers.push({
    key: "saran",
    no: questions.menu ? 6 : 5,
    soal: questions.saran,
    tipe: "teks",
    isi: row.saran,
  });

  return {
    id: Number(row.id),
    semester: row.semester,
    tenant: row.tenant,
    participant_name: row.participant_name,
    school_location: row.school_location,
    kemudahan,
    responsif,
    solusi,
    kepuasan,
    menu: row.menu,
    saran: row.saran,
    skor5,
    skor6,
    answers,
  };
}

router.get("/", async (req, res) => {
  try {
    const semester = String(req.query.semester || "").trim();
    const tenant = String(req.query.tenant || "").trim();
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const where = ["1=1"];
    const params = [];

    if (semester) {
      if (!SEMESTER_ORDER.includes(semester)) {
        return res.status(400).json({ error: "Semester tidak valid" });
      }
      where.push("semester = ?");
      params.push(semester);
    }

    if (tenant) {
      where.push("tenant = ?");
      params.push(tenant);
    }

    if (q) {
      where.push(
        "(participant_name LIKE ? OR saran LIKE ? OR tenant LIKE ? OR menu LIKE ? OR school_location LIKE ?)"
      );
      const like = `%${q}%`;
      params.push(like, like, like, like, like);
    }

    const whereSql = where.join(" AND ");

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM survey_responses WHERE ${whereSql}`,
      params
    );
    const total = Number(countRows[0].total);

    const [summaryRows] = await pool.query(
      `
      SELECT
        COUNT(*) AS responden,
        AVG(kemudahan) AS avg_kemudahan,
        AVG(responsif) AS avg_responsif,
        AVG(solusi) AS avg_solusi,
        AVG(kepuasan) AS avg_kepuasan,
        AVG(skor5) AS avg_skala5,
        AVG(skor5 * 6 / 5) AS avg_skala6,
        SUM(skor5) AS total_nilai,
        SUM(CASE WHEN skor5 * 6 / 5 > 4 THEN 1 ELSE 0 END) AS yes_count,
        SUM(CASE WHEN skor5 IS NOT NULL AND skor5 * 6 / 5 <= 4 THEN 1 ELSE 0 END) AS no_count
      FROM (
        SELECT
          kemudahan,
          responsif,
          solusi,
          kepuasan,
          (
            COALESCE(kemudahan, 0) + COALESCE(responsif, 0) +
            COALESCE(solusi, 0) + COALESCE(kepuasan, 0)
          ) / NULLIF(
            (kemudahan IS NOT NULL) + (responsif IS NOT NULL) +
            (solusi IS NOT NULL) + (kepuasan IS NOT NULL),
            0
          ) AS skor5
        FROM survey_responses
        WHERE ${whereSql}
      ) scored
      `,
      params
    );

    const s = summaryRows[0] || {};
    const yesCount = Number(s.yes_count || 0);
    const noCount = Number(s.no_count || 0);
    const scored = yesCount + noCount;

    const [rows] = await pool.query(
      `
      SELECT id, semester, tenant, participant_name, school_location,
             kemudahan, responsif, solusi, kepuasan, menu, saran
      FROM survey_responses
      WHERE ${whereSql}
      ORDER BY tenant ASC, participant_name ASC, id ASC
      LIMIT ? OFFSET ?
      `,
      [...params, limit, offset]
    );

    res.json({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      summary: {
        responden: Number(s.responden || 0),
        avg_kemudahan: s.avg_kemudahan === null ? null : Number(s.avg_kemudahan),
        avg_responsif: s.avg_responsif === null ? null : Number(s.avg_responsif),
        avg_solusi: s.avg_solusi === null ? null : Number(s.avg_solusi),
        avg_kepuasan: s.avg_kepuasan === null ? null : Number(s.avg_kepuasan),
        avg_skala5: s.avg_skala5 === null ? null : Number(s.avg_skala5),
        avg_skala6: s.avg_skala6 === null ? null : Number(s.avg_skala6),
        total_nilai: s.total_nilai === null ? null : Number(s.total_nilai),
        yes_pct: scored ? (yesCount / scored) * 100 : 0,
        no_pct: scored ? (noCount / scored) * 100 : 0,
        yes_count: yesCount,
        no_count: noCount,
      },
      rows: rows.map(scoreRow),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat daftar responden" });
  }
});

router.get("/tenants", async (req, res) => {
  try {
    const semester = String(req.query.semester || "").trim();
    const params = [];
    let sql = `SELECT DISTINCT tenant FROM survey_responses`;
    if (semester) {
      if (!SEMESTER_ORDER.includes(semester)) {
        return res.status(400).json({ error: "Semester tidak valid" });
      }
      sql += ` WHERE semester = ?`;
      params.push(semester);
    }
    sql += ` ORDER BY tenant`;
    const [rows] = await pool.query(sql, params);
    res.json(rows.map((r) => r.tenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat tenant" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID tidak valid" });
    }

    const [rows] = await pool.query(
      `
      SELECT id, semester, tenant, participant_name, school_location,
             kemudahan, responsif, solusi, kepuasan, menu, saran
      FROM survey_responses
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Responden tidak ditemukan" });
    }

    res.json(scoreRow(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat detail responden" });
  }
});

module.exports = router;
