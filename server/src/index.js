const express = require("express");
const cors = require("cors");
require("dotenv").config();

const trendsRouter = require("./routes/trends");
const analysisRouter = require("./routes/analysis");
const feedbackRouter = require("./routes/feedback");
const { pool } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 5050);

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    const [rows] = await pool.query("SELECT COUNT(*) AS total FROM survey_responses");
    res.json({ ok: true, total: Number(rows[0].total) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: "Database tidak tersedia" });
  }
});

app.use("/api/trends", trendsRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/feedback", feedbackRouter);
app.use("/api/participants", require("./routes/participants"));

app.listen(PORT, () => {
  console.log(`API berjalan di http://localhost:${PORT}`);
});
