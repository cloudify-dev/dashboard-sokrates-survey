import { useEffect, useState } from "react";
import { fetchJson } from "../lib/api";
import { SEMESTERS, QUESTIONS_BY_SEMESTER, fmtId } from "../lib/format";

function cellText(value, max = 80) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

export default function DetailResponden() {
  const [semester, setSemester] = useState(SEMESTERS[2]);
  const [tenants, setTenants] = useState([]);
  const [tenant, setTenant] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({
    rows: [],
    total: 0,
    totalPages: 1,
    summary: null,
  });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const questions =
    QUESTIONS_BY_SEMESTER[semester] || QUESTIONS_BY_SEMESTER[SEMESTERS[2]];
  const hasMenu = Boolean(questions.menu);
  const summary = data.summary;

  useEffect(() => {
    setTenant("");
    setPage(1);
    fetchJson(
      `/api/participants/tenants?semester=${encodeURIComponent(semester)}`
    )
      .then(setTenants)
      .catch(() => setTenants([]));
  }, [semester]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({
      semester,
      page: String(page),
      limit: "50",
    });
    if (tenant) params.set("tenant", tenant);
    if (search) params.set("q", search);

    fetchJson(`/api/participants?${params}`)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        if (res.rows?.length) {
          setSelected((prev) => {
            if (prev && res.rows.some((r) => r.id === prev.id)) {
              return res.rows.find((r) => r.id === prev.id) || res.rows[0];
            }
            return res.rows[0];
          });
        } else {
          setSelected(null);
        }
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
  }, [semester, tenant, search, page]);

  const colSpan = hasMenu ? 11 : 10;

  return (
    <div className="page page-wide">
      <header className="page-header">
        <div>
          <p className="eyebrow">Responden</p>
          <h1>Detail Responden</h1>
          <p className="lede">Soal survey dan isi jawaban per responden.</p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            type="search"
            placeholder="Cari nama / saran…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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

      <div className="page-actions respondent-filters">
        <select
          className="search-input"
          value={tenant}
          onChange={(e) => {
            setTenant(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua tenant</option>
          {tenants.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="caption">
          {data.total.toLocaleString("id-ID")} responden
        </span>
      </div>

      {summary && !loading && !error ? (
        <section className="respondent-kpi">
          <article className="kpi">
            <div className="label">Total responden</div>
            <div className="value">
              {summary.responden.toLocaleString("id-ID")}
            </div>
          </article>
          <article className="kpi">
            <div className="label">Total nilai (Σ skala 5)</div>
            <div className="value">{fmtId(summary.total_nilai, 0)}</div>
          </article>
          <article className="kpi">
            <div className="label">Average skala 5</div>
            <div className="value">{fmtId(summary.avg_skala5)}</div>
          </article>
          <article className="kpi">
            <div className="label">Average skala 6</div>
            <div className="value">{fmtId(summary.avg_skala6)}</div>
          </article>
          <article className="kpi">
            <div className="label">% skor &gt;4</div>
            <div className="value">{fmtId(summary.yes_pct, 1)}%</div>
            <div className="count">
              yes {summary.yes_count.toLocaleString("id-ID")} · no{" "}
              {summary.no_count.toLocaleString("id-ID")}
            </div>
          </article>
        </section>
      ) : null}

      {summary && !loading && !error ? (
        <section className="respondent-kpi metric-kpi">
          <article className="kpi">
            <div className="label">Avg kemudahan</div>
            <div className="value">{fmtId(summary.avg_kemudahan)}</div>
          </article>
          <article className="kpi">
            <div className="label">Avg responsif</div>
            <div className="value">{fmtId(summary.avg_responsif)}</div>
          </article>
          <article className="kpi">
            <div className="label">Avg solusi</div>
            <div className="value">{fmtId(summary.avg_solusi)}</div>
          </article>
          <article className="kpi">
            <div className="label">Avg kepuasan</div>
            <div className="value">{fmtId(summary.avg_kepuasan)}</div>
          </article>
        </section>
      ) : null}

      {error && <div className="state error">{error}</div>}
      {loading && !error && <div className="state">Memuat responden…</div>}

      {!loading && !error && (
        <div className="respondent-stack">
          <section className="sheet pivot-sheet">
            <div className="sheet-table-wrap">
              <table className="sheet-table pivot-table respondent-table">
                <thead>
                  <tr>
                    <th>Participant Name</th>
                    <th>Tenant</th>
                    <th className="q-head">{questions.kemudahan}</th>
                    <th className="q-head">{questions.responsif}</th>
                    <th className="q-head">{questions.solusi}</th>
                    <th className="q-head">{questions.kepuasan}</th>
                    {hasMenu ? (
                      <th className="q-head">{questions.menu}</th>
                    ) : null}
                    <th className="q-head">{questions.saran}</th>
                    <th className="num">Skala 5</th>
                    <th className="num">Skala 6</th>
                    <th className="num">&gt;4</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => {
                    const pass = row.skor6 !== null && row.skor6 > 4;
                    return (
                      <tr
                        key={row.id}
                        className={selected?.id === row.id ? "row-active" : ""}
                        onClick={() => setSelected(row)}
                      >
                        <td>{row.participant_name || "—"}</td>
                        <td>{row.tenant}</td>
                        <td className="num">{fmtId(row.kemudahan, 0)}</td>
                        <td className="num">{fmtId(row.responsif, 0)}</td>
                        <td className="num">{fmtId(row.solusi, 0)}</td>
                        <td className="num">{fmtId(row.kepuasan, 0)}</td>
                        {hasMenu ? (
                          <td className="text-cell">{cellText(row.menu, 40)}</td>
                        ) : null}
                        <td className="text-cell">{cellText(row.saran, 50)}</td>
                        <td className="num">{fmtId(row.skor5)}</td>
                        <td className="num">{fmtId(row.skor6)}</td>
                        <td className={`flag-cell ${pass ? "yes" : "no"}`}>
                          {pass ? "yes" : "no"}
                        </td>
                      </tr>
                    );
                  })}
                  {!data.rows.length && (
                    <tr>
                      <td colSpan={colSpan} className="empty-cell">
                        Tidak ada responden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="pager">
              <button
                type="button"
                className="btn ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Sebelumnya
              </button>
              <span className="caption">
                Halaman {page} / {data.totalPages}
              </span>
              <button
                type="button"
                className="btn ghost"
                disabled={page >= data.totalPages}
                onClick={() =>
                  setPage((p) => Math.min(data.totalPages, p + 1))
                }
              >
                Berikutnya
              </button>
            </div>
          </section>

          <aside className="detail-card detail-card-wide">
            {selected ? (
              <>
                <div className="detail-card-head">
                  <div className="eyebrow">Detail soal & isi</div>
                  <h2>{selected.participant_name || "Tanpa nama"}</h2>
                  <p className="lede">{selected.tenant}</p>
                  <p className="caption">{selected.semester}</p>
                  {selected.school_location ? (
                    <p className="caption">
                      Lokasi: {selected.school_location}
                    </p>
                  ) : null}
                </div>

                <div className="detail-summary">
                  <div>
                    <span>Skala 5</span>
                    <strong>{fmtId(selected.skor5)}</strong>
                  </div>
                  <div>
                    <span>Skala 6</span>
                    <strong>{fmtId(selected.skor6)}</strong>
                  </div>
                  <div>
                    <span>&gt;4</span>
                    <strong
                      className={
                        selected.skor6 !== null && selected.skor6 > 4
                          ? "yes"
                          : "no"
                      }
                    >
                      {selected.skor6 !== null && selected.skor6 > 4
                        ? "yes"
                        : "no"}
                    </strong>
                  </div>
                </div>

                <ol className="qa-list qa-list-grid">
                  {(selected.answers || []).map((item) => (
                    <li key={item.key} className="qa-item">
                      <div className="qa-soal">
                        <span className="qa-no">Soal {item.no}</span>
                        <p>{item.soal}</p>
                      </div>
                      <div className="qa-isi">
                        <span className="qa-isi-label">Isi jawaban</span>
                        {item.tipe === "skor" ? (
                          <strong className="qa-score">
                            {item.isi === null || item.isi === undefined
                              ? "—"
                              : fmtId(item.isi, 0)}
                            <small>/5</small>
                          </strong>
                        ) : (
                          <p className="qa-text">{item.isi || "—"}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="state">Pilih responden di tabel.</div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
