# Dashboard Tren Survey Sokrates

Web app lokal (React + Node.js + MySQL) untuk tren kepuasan BINUS Sokrates lintas 3 semester.

## Stack

- **Frontend:** React (Vite) + Recharts — `http://localhost:5174`
- **Backend:** Express API — `http://localhost:5051`
- **Database:** MySQL (`sokrates_survey`)

## Data sumber

File Excel di `data/`:

| File | Semester |
|---|---|
| `genap 2425.xlsx` | Genap 2024/2025 |
| `ganjil 2526.xlsx` | Ganjil 2025/2026 |
| `genap 2526.xlsx` | Genap 2025/2026 |

Header berbeda dinormalisasi saat seed ke MySQL.

## Setup sekali

Pastikan MySQL sudah jalan (Homebrew: `brew services start mysql`).

```bash
cd "/Users/stwnari/Documents/Statistik Survey Sokrates"

# Schema
mysql -u root < server/sql/schema.sql

# Install dependency
npm install --prefix server
npm install --prefix client

# Import Excel → MySQL
npm run seed --prefix server
```

Konfigurasi DB ada di `server/.env` (default: user `root`, tanpa password, DB `sokrates_survey`).

## Jalankan lokal

Terminal 1 — API:

```bash
npm run dev --prefix server
```

Terminal 2 — UI:

```bash
npm run dev --prefix client
```

Buka **http://localhost:5174**.

## Menu

- **Dashboard Tren** — tren skor lintas 3 semester + filter tenant
- **Analis Persemester** — sheet Excel-like per semester (tenant, COUNTA peserta, rata-rata skor, skala 5/6, >4)
- **Saran & Kritik** — feedback dipisah positif vs kritik/perbaikan, per semester

## API

- `GET /api/health`
- `GET /api/trends/tenants`
- `GET /api/trends/summary?tenants=A|B`
- `GET /api/trends/distribution?tenants=A|B`
- `GET /api/analysis/semesters`
- `GET /api/analysis/by-tenant?semester=Genap%202025/2026`
- `GET /api/feedback?semester=Genap%202025/2026`
