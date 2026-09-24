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

/**
 * Perbandingan CSI per tenant lintas max 3 semester.
 * CSI = rata-rata skor keseluruhan (skala 5), plus konversi skala 6.
 */
router.get("/csi-comparison", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `
      SELECT
        semester,
        tenant,
        COUNT(*) AS peserta,
        AVG((
          COALESCE(kemudahan, 0) + COALESCE(responsif, 0) +
          COALESCE(solusi, 0) + COALESCE(kepuasan, 0)
        ) / NULLIF(
          (kemudahan IS NOT NULL) + (responsif IS NOT NULL) +
          (solusi IS NOT NULL) + (kepuasan IS NOT NULL),
          0
        )) AS csi5
      FROM survey_responses
      GROUP BY semester, tenant
      `
    );

    const byTenant = new Map();
    for (const row of rows) {
      if (!byTenant.has(row.tenant)) {
        byTenant.set(row.tenant, {
          tenant: row.tenant,
          periods: {},
        });
      }
      const csi5 = row.csi5 === null ? null : Number(row.csi5);
      byTenant.get(row.tenant).periods[row.semester] = {
        peserta: Number(row.peserta),
        csi5,
        csi6: csi5 === null ? null : (csi5 * 6) / 5,
      };
    }

    const periods = SEMESTER_ORDER.map((semester, index) => ({
      key: `csi${index + 1}`,
      label: `CSI ${index + 1}`,
      semester,
    }));

    const data = [...byTenant.values()]
      .map((item) => {
        const values = periods.map((p) => {
          const period = item.periods[p.semester] || null;
          return {
            key: p.key,
            label: p.label,
            semester: p.semester,
            peserta: period?.peserta ?? null,
            csi5: period?.csi5 ?? null,
            csi6: period?.csi6 ?? null,
          };
        });

        const withDelta = values.map((curr, index) => {
          if (index === 0) {
            return { ...curr, delta5: null, delta6: null };
          }
          const prev = values[index - 1];
          const delta5 =
            curr.csi5 === null || prev.csi5 === null
              ? null
              : curr.csi5 - prev.csi5;
          const delta6 =
            curr.csi6 === null || prev.csi6 === null
              ? null
              : curr.csi6 - prev.csi6;
          return { ...curr, delta5, delta6 };
        });

        const latest = [...withDelta].reverse().find((v) => v.csi5 !== null);
        const first = withDelta.find((v) => v.csi5 !== null);
        const overallDelta =
          latest && first && latest.key !== first.key
            ? latest.csi5 - first.csi5
            : null;

        return {
          tenant: item.tenant,
          values: withDelta,
          overallDelta5: overallDelta,
          sortKey: latest?.csi5 ?? -1,
        };
      })
      .sort((a, b) => b.sortKey - a.sortKey);

    res.json({ periods, rows: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat perbandingan CSI" });
  }
});

module.exports = router;
