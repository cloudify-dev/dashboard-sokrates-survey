const POSITIF = [
  "baik",
  "bagus",
  "mantap",
  "membantu",
  "terbantu",
  "puas",
  "memuaskan",
  "excellent",
  "good",
  "great",
  "helpful",
  "terima kasih",
  "thank",
  "sukses",
  "semangat",
  "keren",
  "luar biasa",
  "sangat baik",
  "sudah baik",
  "sudah sangat",
  "mudah digunakan",
  "user friendly",
  "recommended",
  "love",
  "suka",
  "senang",
  "lancar",
  "profesional",
  "sangat membantu",
  "sudah membantu",
];

const KRITIK = [
  "perbaiki",
  "perbaikan",
  "kurang",
  "lambat",
  "lemot",
  "lag",
  "bug",
  "error",
  "sulit",
  "ribet",
  "rumit",
  "masalah",
  "gagal",
  "tidak bisa",
  "gak bisa",
  "ga bisa",
  "tidak muncul",
  "belum",
  "mohon",
  "tolong",
  "harap",
  "sebaiknya",
  "seharusnya",
  "tingkatkan",
  "ditingkatkan",
  "perbanyak",
  "tambahkan",
  "tambah",
  "sederhanakan",
  "stabilkan",
  "kustomisasi",
  "custom",
  "check",
  "loading",
  "jaringan",
  "sering",
  "terlalu",
  "susah",
  "bingung",
  "confus",
  "improve",
  "improvement",
  "fix",
  "please",
  "need",
  "needs",
  "should",
  "kindly",
  "update",
  "fitur",
  "versi",
  "aplikasi smartphone",
  "buatkan",
  "dibuat",
  "diubah",
  "ubah",
  "ganti",
  "hapus",
  "kurangi",
  "optim",
  "keamanan",
];

const NETRAL_ONLY = [
  "ok",
  "oke",
  "okay",
  "yes",
  "ya",
  "sudah",
  "cukup",
  "fine",
  "nothing",
  "no comment",
  "tidak ada saran",
  "no suggestion",
];

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, words) {
  return words.some((w) => text.includes(w.trim()));
}

function classifySaran(text) {
  const t = normalize(text);
  if (!t) return "netral";
  if (NETRAL_ONLY.includes(t)) return "netral";

  const pos = hasAny(t, POSITIF);
  const kritik = hasAny(t, KRITIK);

  if (pos && kritik) {
    // Campuran: anggap kritik bila ada permintaan perbaikan yang jelas.
    return "kritik";
  }
  if (kritik) return "kritik";
  if (pos) return "positif";

  // Teks panjang tanpa kata kunci cenderung saran perbaikan.
  if (t.length >= 40) return "kritik";
  return "netral";
}

module.exports = { classifySaran };
