const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const { pool } = require("../db");

const DATA_DIR = path.resolve(__dirname, "../../../data");

const BATCHES = [
  {
    file: "genap 2425.xlsx",
    semester: "Genap 2024/2025",
    name: 0,
    tenant: 1,
    location: null,
    metrics: [2, 3, 4, 5],
    menu: null,
    saran: 6,
  },
  {
    file: "ganjil 2526.xlsx",
    semester: "Ganjil 2025/2026",
    name: 0,
    tenant: 1,
    location: null,
    metrics: [2, 3, 4, 5],
    menu: null,
    saran: 7,
  },
  {
    file: "genap 2526.xlsx",
    semester: "Genap 2025/2026",
    name: 0,
    tenant: 1,
    location: 2,
    metrics: [3, 4, 5, 6],
    menu: 7,
    saran: 8,
  },
];

function toScore(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return Math.round(n);
}

function cleanText(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  const empty = new Set([
    "-",
    "—",
    ".",
    "..",
    "...",
    "none",
    "nan",
    "null",
    "n/a",
    "na",
    "tidak ada",
    "tdk ada",
    "ga ada",
    "gak ada",
    "no",
    "nil",
  ]);
  if (empty.has(lower)) return null;
  return text;
}

function readBatch(config) {
  const filePath = path.join(DATA_DIR, config.file);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File tidak ditemukan: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const dataRows = rows.slice(1);
  const out = [];

  for (const row of dataRows) {
    const tenant = String(row[config.tenant] ?? "").trim();
    if (!tenant || tenant === "nan" || tenant === "None") continue;

    const kemudahan = toScore(row[config.metrics[0]]);
    const responsif = toScore(row[config.metrics[1]]);
    const solusi = toScore(row[config.metrics[2]]);
    const kepuasan = toScore(row[config.metrics[3]]);
    const saran = cleanText(row[config.saran]);
    const menu =
      config.menu === null ? null : cleanText(row[config.menu]);
    const schoolLocation =
      config.location === null ? null : cleanText(row[config.location]);
    const participantName = cleanText(row[config.name]);

    if (
      kemudahan === null &&
      responsif === null &&
      solusi === null &&
      kepuasan === null &&
      saran === null &&
      menu === null
    ) {
      continue;
    }

    out.push([
      config.semester,
      tenant,
      participantName,
      schoolLocation,
      kemudahan,
      responsif,
      solusi,
      kepuasan,
      menu,
      saran,
    ]);
  }

  return out;
}

async function seed() {
  const allRows = [];
  for (const batch of BATCHES) {
    const rows = readBatch(batch);
    const withSaran = rows.filter((r) => r[9]).length;
    console.log(`${batch.semester}: ${rows.length} baris (${withSaran} ada saran)`);
    allRows.push(...rows);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        semester VARCHAR(32) NOT NULL,
        tenant VARCHAR(255) NOT NULL,
        participant_name VARCHAR(255) NULL,
        school_location VARCHAR(255) NULL,
        kemudahan TINYINT UNSIGNED NULL,
        responsif TINYINT UNSIGNED NULL,
        solusi TINYINT UNSIGNED NULL,
        kepuasan TINYINT UNSIGNED NULL,
        menu TEXT NULL,
        saran TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_semester (semester),
        INDEX idx_tenant (tenant),
        INDEX idx_semester_tenant (semester, tenant)
      ) ENGINE=InnoDB
    `);

    const [cols] = await conn.query(`SHOW COLUMNS FROM survey_responses`);
    const names = new Set(cols.map((c) => c.Field));
    if (!names.has("school_location")) {
      await conn.query(
        `ALTER TABLE survey_responses ADD COLUMN school_location VARCHAR(255) NULL AFTER participant_name`
      );
    }
    if (!names.has("menu")) {
      await conn.query(
        `ALTER TABLE survey_responses ADD COLUMN menu TEXT NULL AFTER kepuasan`
      );
    }

    await conn.query("DELETE FROM survey_responses");

    const chunkSize = 500;
    for (let i = 0; i < allRows.length; i += chunkSize) {
      const chunk = allRows.slice(i, i + chunkSize);
      await conn.query(
        `INSERT INTO survey_responses
          (semester, tenant, participant_name, school_location, kemudahan, responsif, solusi, kepuasan, menu, saran)
         VALUES ?`,
        [chunk]
      );
    }

    await conn.commit();
    console.log(`Seed selesai: ${allRows.length} baris ke MySQL`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
