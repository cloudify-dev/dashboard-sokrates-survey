const express = require("express");
const { pool } = require("../db");

const router = express.Router();

const SEMESTER_ORDER = [
  "Genap 2024/2025",
  "Ganjil 2025/2026",
  "Genap 2025/2026",
];

const METRICS = ["kemudahan", "responsif", "solusi", "kepuasan"];

function parseTenants(queryValue) {
  if (!queryValue) return [];
  return String(queryValue)
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
}

function tenantClause(tenants, params) {
  if (!tenants.length) return "";
  const placeholders = tenants.map(() => "?").join(", ");
  params.push(...tenants);
  return ` AND tenant IN (${placeholders})`;
}

function sortBySemester(rows) {
  const order = new Map(SEMESTER_ORDER.map((s, i) => [s, i]));
  return [...rows].sort(
    (a, b) => (order.get(a.semester) ?? 99) - (order.get(b.semester) ?? 99)
  );
}

router.get("/tenants", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT tenant FROM survey_responses ORDER BY tenant`
    );
    res.json(rows.map((r) => r.tenant));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat tenant" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const tenants = parseTenants(req.query.tenants);
    const params = [];
    const where = `WHERE 1=1${tenantClause(tenants, params)}`;

    const [rows] = await pool.query(
      `
      SELECT
        semester,
        COUNT(*) AS responden,
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
      ${where}
      GROUP BY semester
      `,
      params
    );

    const summary = sortBySemester(rows).map((row) => ({
      semester: row.semester,
      responden: Number(row.responden),
      kemudahan: row.kemudahan === null ? null : Number(row.kemudahan),
      responsif: row.responsif === null ? null : Number(row.responsif),
      solusi: row.solusi === null ? null : Number(row.solusi),
      kepuasan: row.kepuasan === null ? null : Number(row.kepuasan),
      skor_keseluruhan:
        row.skor_keseluruhan === null ? null : Number(row.skor_keseluruhan),
    }));

    const withDelta = summary.map((row, index) => {
      if (index === 0) {
        return {
          ...row,
          delta_kemudahan: null,
          delta_responsif: null,
          delta_solusi: null,
          delta_kepuasan: null,
          delta_skor_keseluruhan: null,
        };
      }
      const prev = summary[index - 1];
      const delta = (curr, before) =>
        curr === null || before === null ? null : curr - before;
      return {
        ...row,
        delta_kemudahan: delta(row.kemudahan, prev.kemudahan),
        delta_responsif: delta(row.responsif, prev.responsif),
        delta_solusi: delta(row.solusi, prev.solusi),
        delta_kepuasan: delta(row.kepuasan, prev.kepuasan),
        delta_skor_keseluruhan: delta(
          row.skor_keseluruhan,
          prev.skor_keseluruhan
        ),
      };
    });

    res.json({
      semesterOrder: SEMESTER_ORDER,
      metrics: METRICS,
      summary: withDelta,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat ringkasan tren" });
  }
});

router.get("/distribution", async (req, res) => {
  try {
    const tenants = parseTenants(req.query.tenants);
    const params = [];
    const where = `WHERE 1=1${tenantClause(tenants, params)}`;

    const [rows] = await pool.query(
      `
      SELECT semester, score FROM (
        SELECT semester, kemudahan AS score FROM survey_responses ${where}
        UNION ALL
        SELECT semester, responsif AS score FROM survey_responses ${where}
        UNION ALL
        SELECT semester, solusi AS score FROM survey_responses ${where}
        UNION ALL
        SELECT semester, kepuasan AS score FROM survey_responses ${where}
      ) AS scores
      WHERE score IS NOT NULL
      `,
      [...params, ...params, ...params, ...params]
    );

    const buckets = new Map();
    for (const row of rows) {
      if (!buckets.has(row.semester)) {
        buckets.set(row.semester, { high: 0, mid: 0, low: 0, total: 0 });
      }
      const b = buckets.get(row.semester);
      const score = Number(row.score);
      b.total += 1;
      if (score >= 4) b.high += 1;
      else if (score === 3) b.mid += 1;
      else if (score <= 2) b.low += 1;
    }

    const distribution = SEMESTER_ORDER.filter((s) => buckets.has(s)).map(
      (semester) => {
        const b = buckets.get(semester);
        return {
          semester,
          tinggi_4_5: (b.high / b.total) * 100,
          netral_3: (b.mid / b.total) * 100,
          rendah_1_2: (b.low / b.total) * 100,
          n_jawaban: b.total,
        };
      }
    );

    res.json({ distribution });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat distribusi skor" });
  }
});

module.exports = router;
