export function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(digits);
}

/** Format angka gaya Excel ID: 4,25 */
export function fmtId(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function aboveThreshold(value, threshold = 4) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Number(value) > threshold;
}

export function yesNo(value, threshold = 4) {
  const ok = aboveThreshold(value, threshold);
  if (ok === null) return "—";
  return ok ? "yes" : "no";
}

/** Konversi Likert 1–5 ke skala 1–6: score * 6/5 */
export function toScale6(scale5) {
  if (scale5 === null || scale5 === undefined || Number.isNaN(scale5)) {
    return null;
  }
  return (Number(scale5) * 6) / 5;
}

export function fmtDelta(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}`;
}

export function deltaClass(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "flat";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

export const METRIC_LABELS = {
  kemudahan: "Kemudahan",
  responsif: "Responsif",
  solusi: "Solusi",
  kepuasan: "Kepuasan keseluruhan",
  skor_keseluruhan: "Skor keseluruhan",
};

export const LINE_COLORS = {
  kemudahan: "#1898d0",
  responsif: "#003040",
  solusi: "#006098",
  kepuasan: "#3db8e0",
};

export const SEMESTERS = [
  "Genap 2024/2025",
  "Ganjil 2025/2026",
  "Genap 2025/2026",
];

export const QUESTIONS_BY_SEMESTER = {
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
  },
};
