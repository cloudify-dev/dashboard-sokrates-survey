import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../lib/api";
import { SEMESTERS } from "../lib/format";

function FeedbackList({ items, emptyText }) {
  if (!items.length) {
    return <div className="feedback-empty">{emptyText}</div>;
  }

  return (
    <ul className="feedback-list">
      {items.map((item) => (
        <li key={item.id} className="feedback-item">
          <div className="feedback-meta">
            <strong>{item.tenant}</strong>
            {item.participant_name ? (
              <span className="feedback-name">{item.participant_name}</span>
            ) : null}
          </div>
          <p className="feedback-text">{item.saran}</p>
        </li>
      ))}
    </ul>
  );
}

export default function SaranKritik() {
  const [semester, setSemester] = useState(SEMESTERS[2]);
  const [positif, setPositif] = useState([]);
  const [kritik, setKritik] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all"); // all | positif | kritik

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchJson(`/api/feedback?semester=${encodeURIComponent(semester)}`)
      .then((res) => {
        if (cancelled) return;
        setPositif(res.positif || []);
        setKritik(res.kritik || []);
        setCounts(res.counts || null);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [semester]);

  const q = search.trim().toLowerCase();

  const filteredPositif = useMemo(() => {
    if (!q) return positif;
    return positif.filter(
      (item) =>
        item.saran.toLowerCase().includes(q) ||
        item.tenant.toLowerCase().includes(q) ||
        (item.participant_name || "").toLowerCase().includes(q)
    );
  }, [positif, q]);

  const filteredKritik = useMemo(() => {
    if (!q) return kritik;
    return kritik.filter(
      (item) =>
        item.saran.toLowerCase().includes(q) ||
        item.tenant.toLowerCase().includes(q) ||
        (item.participant_name || "").toLowerCase().includes(q)
    );
  }, [kritik, q]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Feedback</p>
          <h1>Saran & Kritik</h1>
          <p className="lede">Saran positif dan kritik per semester.</p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            type="search"
            placeholder="Cari kata / tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      <div className="sheet-tabs" role="tablist" aria-label="Semester">
        {SEMESTERS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={semester === item}
            className={`sheet-tab ${semester === item ? "active" : ""}`}
            onClick={() => setSemester(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="feedback-summary">
        <button
          type="button"
          className={`summary-chip ${tab === "all" ? "active" : ""}`}
          onClick={() => setTab("all")}
        >
          Semua terklasifikasi
          <strong>
            {((counts?.positif || 0) + (counts?.kritik || 0)).toLocaleString("id-ID")}
          </strong>
        </button>
        <button
          type="button"
          className={`summary-chip positif ${tab === "positif" ? "active" : ""}`}
          onClick={() => setTab("positif")}
        >
          Saran positif
          <strong>{(counts?.positif || 0).toLocaleString("id-ID")}</strong>
        </button>
        <button
          type="button"
          className={`summary-chip kritik ${tab === "kritik" ? "active" : ""}`}
          onClick={() => setTab("kritik")}
        >
          Kritik / perbaikan
          <strong>{(counts?.kritik || 0).toLocaleString("id-ID")}</strong>
        </button>
      </div>

      {error && <div className="state error">{error}</div>}
      {loading && !error && <div className="state">Memuat saran…</div>}

      {!loading && !error && (
        <section
          className={`feedback-grid ${tab === "all" ? "two" : "one"}`}
        >
          {(tab === "all" || tab === "positif") && (
            <div className="feedback-col positif">
              <div className="feedback-col-head">
                <h2>Saran positif</h2>
                <span>{filteredPositif.length.toLocaleString("id-ID")}</span>
              </div>
              <FeedbackList
                items={filteredPositif}
                emptyText="Tidak ada saran positif untuk filter ini."
              />
            </div>
          )}

          {(tab === "all" || tab === "kritik") && (
            <div className="feedback-col kritik">
              <div className="feedback-col-head">
                <h2>Kritik & perbaikan</h2>
                <span>{filteredKritik.length.toLocaleString("id-ID")}</span>
              </div>
              <FeedbackList
                items={filteredKritik}
                emptyText="Tidak ada kritik/perbaikan untuk filter ini."
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
