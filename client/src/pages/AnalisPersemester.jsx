import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../lib/api";
import { SEMESTERS, fmtId, toScale6 } from "../lib/format";

const THRESHOLD = 4;

function pctLabel(value) {
  return `${fmtId(value, 0)}%`;
}

function AveragePivot({ semester, search }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchJson(`/api/analysis/by-tenant?semester=${encodeURIComponent(semester)}`)
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows || []);
        setTotal(res.total || null);
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

  const enriched = useMemo(
    () =>
      rows.map((row) => {
        const skala5 = row.skor_keseluruhan;
        const skala6 = toScale6(skala5);
        return {
          ...row,
          skala5,
          skala6,
          pass: skala6 !== null && skala6 >= THRESHOLD,
        };
      }),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enriched;
    return enriched.filter((row) => row.tenant.toLowerCase().includes(q));
  }, [enriched, search]);

  const passStats = useMemo(() => {
    const valid = enriched.filter((r) => r.skala6 !== null);
    const n = valid.length;
    if (!n) return { passPct: 0, failPct: 0, pass: 0, fail: 0, n: 0 };
    const pass = valid.filter((r) => r.pass).length;
    const fail = n - pass;
    return {
      pass,
      fail,
      n,
      passPct: (pass / n) * 100,
      failPct: (fail / n) * 100,
    };
  }, [enriched]);

  const totalSkala5 = total?.skor_keseluruhan ?? null;
  const totalSkala6 = toScale6(totalSkala5);

  if (error) return <div className="state error">{error}</div>;
  if (loading) return <div className="state">Memuat sheet…</div>;

  return (
    <div className="pivot-layout">
      <section className="sheet pivot-sheet">
        <div className="sheet-toolbar">
          <div>
            <strong>{semester}</strong>
          </div>
          <span className="caption">
            {filtered.length.toLocaleString("id-ID")} tenant
            {total ? ` · ${total.peserta.toLocaleString("id-ID")} peserta` : ""}
          </span>
        </div>

        <div className="sheet-table-wrap">
          <table className="sheet-table pivot-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th className="num">COUNTA of Participant Name</th>
                <th className="num">AVERAGE of 5,00</th>
                <th className="num">AVERAGE of 6,00</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.tenant}>
                  <td>{row.tenant}</td>
                  <td className="num">
                    {row.peserta.toLocaleString("id-ID", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="num">{fmtId(row.skala5)}</td>
                  <td className="num">{fmtId(row.skala6)}</td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    Tidak ada tenant yang cocok.
                  </td>
                </tr>
              )}
            </tbody>
            {total && !search.trim() && (
              <tfoot>
                <tr>
                  <td>Grand Total</td>
                  <td className="num">
                    {total.peserta.toLocaleString("id-ID", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}
                  </td>
                  <td className="num">{fmtId(totalSkala5)}</td>
                  <td className="num">{fmtId(totalSkala6)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <aside className="pivot-summary">
        <div className="pivot-summary-card">
          <div className="pivot-summary-title">Ringkasan tenant</div>
          <div className="pivot-stat pass">
            <span className="pivot-stat-value">{fmtId(passStats.passPct)}%</span>
            <span className="pivot-stat-label">
              &gt;= {THRESHOLD}{" "}
              <small>
                ({passStats.pass}/{passStats.n} tenant)
              </small>
            </span>
          </div>
          <div className="pivot-stat fail">
            <span className="pivot-stat-value">{fmtId(passStats.failPct)}%</span>
            <span className="pivot-stat-label">
              &lt; {THRESHOLD}{" "}
              <small>
                ({passStats.fail}/{passStats.n} tenant)
              </small>
            </span>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Above4Pivot({ semester, search }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchJson(
      `/api/analysis/above4-by-tenant?semester=${encodeURIComponent(semester)}`
    )
      .then((res) => {
        if (cancelled) return;
        setRows(res.rows || []);
        setTotal(res.total || null);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.tenant.toLowerCase().includes(q));
  }, [rows, search]);

  if (error) return <div className="state error">{error}</div>;
  if (loading) return <div className="state">Memuat sheet…</div>;

  return (
    <section className="sheet pivot-sheet">
      <div className="sheet-toolbar">
        <div>
          <strong>{semester}</strong>
        </div>
        <span className="caption">
          {filtered.length.toLocaleString("id-ID")} tenant
          {total ? ` · ${total.total.toLocaleString("id-ID")} responden` : ""}
        </span>
      </div>

      <div className="sheet-table-wrap">
        <table className="sheet-table pivot-table above4-table">
          <thead>
            <tr>
              <th rowSpan={2}>Tenant</th>
              <th colSpan={2} className="group-h">
                &gt;4 · COUNT of 6,00
              </th>
              <th rowSpan={2} className="num">
                Grand Total
              </th>
              <th rowSpan={2} className="num">
                No
              </th>
              <th rowSpan={2} className="num">
                Yes
              </th>
              <th rowSpan={2} className="num">
                contribution
              </th>
            </tr>
            <tr>
              <th className="num">no</th>
              <th className="num">yes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.tenant}>
                <td>{row.tenant}</td>
                <td className="num">{row.no.toLocaleString("id-ID")}</td>
                <td className="num">{row.yes.toLocaleString("id-ID")}</td>
                <td className="num">{row.total.toLocaleString("id-ID")}</td>
                <td className="num bar-cell">
                  <div className="pct-bar-wrap">
                    <div
                      className="pct-bar no"
                      style={{ width: `${Math.min(row.no_pct, 100)}%` }}
                    />
                    <span>{pctLabel(row.no_pct)}</span>
                  </div>
                </td>
                <td className="num">{pctLabel(row.yes_pct)}</td>
                <td className="num">{fmtId(row.contribution)}%</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="empty-cell">
                  Tidak ada tenant yang cocok.
                </td>
              </tr>
            )}
          </tbody>
          {total && !search.trim() && (
            <tfoot>
              <tr>
                <td>Grand Total</td>
                <td className="num">{total.no.toLocaleString("id-ID")}</td>
                <td className="num">{total.yes.toLocaleString("id-ID")}</td>
                <td className="num">{total.total.toLocaleString("id-ID")}</td>
                <td className="num">{pctLabel(total.no_pct)}</td>
                <td className="num">{pctLabel(total.yes_pct)}</td>
                <td className="num">{fmtId(total.contribution)}%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

export default function AnalisPersemester() {
  const [semester, setSemester] = useState(SEMESTERS[0]);
  const [search, setSearch] = useState("");
  const [view, setView] = useState("above4"); // above4 | average

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Analisis</p>
          <h1>Analis Persemester</h1>
          <p className="lede">Analisis skor per semester dan tenant.</p>
        </div>
        <div className="page-actions">
          <input
            className="search-input"
            type="search"
            placeholder="Cari tenant…"
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

      <div className="view-tabs">
        <button
          type="button"
          className={`view-tab ${view === "above4" ? "active" : ""}`}
          onClick={() => setView("above4")}
        >
          Pivot &gt;4 (yes / no)
        </button>
        <button
          type="button"
          className={`view-tab ${view === "average" ? "active" : ""}`}
          onClick={() => setView("average")}
        >
          Pivot rata-rata 5 & 6
        </button>
      </div>

      {view === "above4" ? (
        <Above4Pivot semester={semester} search={search} />
      ) : (
        <AveragePivot semester={semester} search={search} />
      )}
    </div>
  );
}
