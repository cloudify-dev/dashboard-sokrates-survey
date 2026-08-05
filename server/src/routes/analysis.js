const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const SEMESTER_ORDER = [
  "Genap 2024/2025",
  "Ganjil 2025/2026",
  "Genap 2025/2026",
];

router.get("/semesters", (_req, res) => {
  res.json({ semesters: SEMESTER_ORDER });
});

router.get("/by-tenant", async (req, res) => {
  try {
    const semester = String(req.query.semester || "").trim();
    if (!SEMESTER_ORDER.includes(semester)) {
      return res.status(400).json({ error: "Semester tidak valid" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        tenant,
        COUNT(*) AS peserta,
        AVG(kemudahan) AS kemudahan,
        AVG(responsif) AS responsif,
        AVG(solusi) AS solusi,
        AVG(kepuasan) AS kepuasan,
        AVG((
          COALESCE(kemudahan, 0) + COALESCE(responsif, 0) +
          COALESCE(solusi, 0) + COALESCE(kepuasan, 0)
        ) / NULLIF(
          (kemudahan IS NOT NULL) + (responsif IS NOT NULL) +
          (solusi IS NOT NULL) + (kepuasan IS NOT NULL),
          0
        )) AS skor_keseluruhan
      FROM survey_responses
      WHERE semester = ?
      GROUP BY tenant
      ORDER BY peserta DESC, tenant ASC
      `,
      [semester]
    );

    const data = rows.map((row) => ({
      tenant: row.tenant,
      peserta: Number(row.peserta),
      kemudahan: row.kemudahan === null ? null : Number(row.kemudahan),
      responsif: row.responsif === null ? null : Number(row.responsif),
      solusi: row.solusi === null ? null : Number(row.solusi),
      kepuasan: row.kepuasan === null ? null : Number(row.kepuasan),
      skor_keseluruhan:
        row.skor_keseluruhan === null ? null : Number(row.skor_keseluruhan),
    }));

    const totalPeserta = data.reduce((sum, row) => sum + row.peserta, 0);
    const weighted = (key) => {
      let weightedSum = 0;
      let weight = 0;
      for (const row of data) {
        if (row[key] === null) continue;
        weightedSum += row[key] * row.peserta;
        weight += row.peserta;
      }
      return weight ? weightedSum / weight : null;
    };

    res.json({
      semester,
      rows: data,
      total: {
        tenant: "Grand Total",
        peserta: totalPeserta,
        kemudahan: weighted("kemudahan"),
        responsif: weighted("responsif"),
        solusi: weighted("solusi"),
        kepuasan: weighted("kepuasan"),
        skor_keseluruhan: weighted("skor_keseluruhan"),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat analisis per semester" });
  }
});

/**
 * Pivot: per responden, skala 6 = skor*6/5; yes jika skala6 > 4.
 * Output mirip Excel: no, yes, Grand Total, No%, Yes%, contribution.
 */
router.get("/above4-by-tenant", async (req, res) => {
  try {
    const semester = String(req.query.semester || "").trim();
    if (!SEMESTER_ORDER.includes(semester)) {
      return res.status(400).json({ error: "Semester tidak valid" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        tenant,
        COUNT(*) AS total,
        SUM(CASE WHEN skala6 > 4 THEN 1 ELSE 0 END) AS yes_count,
        SUM(CASE WHEN skala6 <= 4 THEN 1 ELSE 0 END) AS no_count
      FROM (
        SELECT
          tenant,
          (
            (
              COALESCE(kemudahan, 0) + COALESCE(responsif, 0) +
              COALESCE(solusi, 0) + COALESCE(kepuasan, 0)
            ) / NULLIF(
              (kemudahan IS NOT NULL) + (responsif IS NOT NULL) +
              (solusi IS NOT NULL) + (kepuasan IS NOT NULL),
              0
            )
          ) * 6 / 5 AS skala6
        FROM survey_responses
        WHERE semester = ?
      ) scored
      WHERE skala6 IS NOT NULL
      GROUP BY tenant
      ORDER BY tenant ASC
      `,
      [semester]
    );

    const data = rows.map((row) => ({
      tenant: row.tenant,
      no: Number(row.no_count),
      yes: Number(row.yes_count),
      total: Number(row.total),
    }));

    const grandNo = data.reduce((s, r) => s + r.no, 0);
    const grandYes = data.reduce((s, r) => s + r.yes, 0);
    const grandTotal = data.reduce((s, r) => s + r.total, 0);

    const withPct = data.map((row) => ({
      ...row,
      no_pct: row.total ? (row.no / row.total) * 100 : 0,
      yes_pct: row.total ? (row.yes / row.total) * 100 : 0,
      contribution: grandTotal ? (row.total / grandTotal) * 100 : 0,
    }));

    res.json({
      semester,
      threshold: 4,
      scale: 6,
      rows: withPct,
      total: {
        tenant: "Grand Total",
        no: grandNo,
        yes: grandYes,
        total: grandTotal,
        no_pct: grandTotal ? (grandNo / grandTotal) * 100 : 0,
        yes_pct: grandTotal ? (grandYes / grandTotal) * 100 : 0,
        contribution: grandTotal ? 100 : 0,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat distribusi >4" });
  }
});

module.exports = router;
