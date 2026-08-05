const express = require("express");
const { pool } = require("../db");
const { classifySaran } = require("../lib/classifySaran");

const router = express.Router();

const SEMESTER_ORDER = [
  "Genap 2024/2025",
  "Ganjil 2025/2026",
  "Genap 2025/2026",
];

router.get("/", async (req, res) => {
  try {
    const semester = String(req.query.semester || "").trim();
    if (!SEMESTER_ORDER.includes(semester)) {
      return res.status(400).json({ error: "Semester tidak valid" });
    }

    const [rows] = await pool.query(
      `
      SELECT id, tenant, participant_name, saran, kepuasan
      FROM survey_responses
      WHERE semester = ?
        AND saran IS NOT NULL
        AND TRIM(saran) <> ''
      ORDER BY tenant ASC, id ASC
      `,
      [semester]
    );

    const positif = [];
    const kritik = [];
    let netral = 0;

    for (const row of rows) {
      const kategori = classifySaran(row.saran);
      const item = {
        id: row.id,
        tenant: row.tenant,
        participant_name: row.participant_name,
        saran: row.saran,
        kepuasan: row.kepuasan === null ? null : Number(row.kepuasan),
        kategori,
      };

      if (kategori === "positif") positif.push(item);
      else if (kategori === "kritik") kritik.push(item);
      else netral += 1;
    }

    res.json({
      semester,
      counts: {
        positif: positif.length,
        kritik: kritik.length,
        netral,
        total_berisi: rows.length,
      },
      positif,
      kritik,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat saran & kritik" });
  }
});

module.exports = router;
