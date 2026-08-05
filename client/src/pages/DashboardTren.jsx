import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchJson, tenantQuery } from "../lib/api";
import {
  LINE_COLORS,
  METRIC_LABELS,
  deltaClass,
  fmt,
  fmtDelta,
} from "../lib/format";

export default function DashboardTren() {
  const [tenants, setTenants] = useState([]);
  const [selected, setSelected] = useState([]);
  const [summary, setSummary] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const query = useMemo(() => tenantQuery(selected), [selected]);

  useEffect(() => {
    fetchJson("/api/trends/tenants")
      .then(setTenants)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    Promise.all([
      fetchJson(`/api/trends/summary${query}`),
      fetchJson(`/api/trends/distribution${query}`),
    ])
      .then(([summaryRes, distRes]) => {
        if (cancelled) return;
        setSummary(summaryRes.summary || []);
        setDistribution(distRes.distribution || []);
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
  }, [query]);

  const lineData = useMemo(
    () =>
      summary.map((row) => ({
        semester: row.semester,
        kemudahan: row.kemudahan,
        responsif: row.responsif,
        solusi: row.solusi,
        kepuasan: row.kepuasan,
      })),
    [summary]
  );

  const totalRows = summary.reduce((acc, row) => acc + (row.responden || 0), 0);

  function toggleTenant(tenant) {
    setSelected((prev) =>
      prev.includes(tenant)
        ? prev.filter((t) => t !== tenant)
        : [...prev, tenant]
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard Tren Survey</h1>
          <p className="lede">
            Perbandingan kepuasan layanan BINUS Sokrates lintas 3 semester.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setFilterOpen((v) => !v)}
          >
            Filter tenant{selected.length ? ` (${selected.length})` : ""}
          </button>
          {selected.length > 0 && (
            <button type="button" className="btn ghost" onClick={() => setSelected([])}>
              Reset
            </button>
          )}
        </div>
      </header>

      {filterOpen && (
        <section className="filter-panel">
          <div className="filter-top">
            <strong>Pilih tenant</strong>
            <div className="page-actions">
              <button type="button" className="btn ghost" onClick={() => setSelected(tenants)}>
                Semua
              </button>
              <button type="button" className="btn ghost" onClick={() => setSelected([])}>
                Kosongkan
              </button>
            </div>
          </div>
          <div className="tenant-grid">
            {tenants.map((tenant) => (
              <label key={tenant} className="tenant-chip">
                <input
                  type="checkbox"
                  checked={selected.includes(tenant)}
                  onChange={() => toggleTenant(tenant)}
                />
                <span>{tenant}</span>
              </label>
            ))}
          </div>
          <p className="caption">
            {selected.length
              ? `${selected.length} tenant dipilih · ${totalRows.toLocaleString("id-ID")} responden`
              : `Semua tenant · ${totalRows.toLocaleString("id-ID")} responden`}
          </p>
        </section>
      )}

      {error && <div className="state error">{error}</div>}
      {loading && !error && <div className="state">Memuat tren…</div>}
      {!loading && !error && summary.length === 0 && (
        <div className="state">Tidak ada data untuk filter ini.</div>
      )}

      {!loading && !error && summary.length > 0 && (
        <>
          <section>
            <h2 className="section-title">Ringkasan per semester</h2>
            <div className="kpi-row">
              {summary.map((row) => {
                const delta = row.delta_skor_keseluruhan;
                return (
                  <article className="kpi" key={row.semester}>
                    <div className="label">{row.semester}</div>
                    <div className="value">{fmt(row.skor_keseluruhan)}</div>
                    <div className={`delta ${deltaClass(delta)}`}>
                      {fmtDelta(delta) || "—"}
                    </div>
                    <div className="count">
                      {row.responden.toLocaleString("id-ID")} responden
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Tren rata-rata skor per metrik</h2>
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={lineData}>
                <CartesianGrid stroke="#d5dde5" strokeDasharray="3 3" />
                <XAxis dataKey="semester" tick={{ fontSize: 12 }} />
                <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value, name) => [
                    fmt(value),
                    METRIC_LABELS[name] || name,
                  ]}
                />
                <Legend formatter={(value) => METRIC_LABELS[value] || value} />
                {Object.keys(METRIC_LABELS)
                  .filter((k) => k !== "skor_keseluruhan")
                  .map((key) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={LINE_COLORS[key]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="panel-grid">
            <div className="panel">
              <h2 className="section-title">Skor keseluruhan</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={summary}>
                  <CartesianGrid stroke="#d5dde5" strokeDasharray="3 3" />
                  <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => fmt(value)} />
                  <Bar
                    dataKey="skor_keseluruhan"
                    fill="#1898d0"
                    name="Skor keseluruhan"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <h2 className="section-title">Distribusi skor</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={distribution}>
                  <CartesianGrid stroke="#d5dde5" strokeDasharray="3 3" />
                  <XAxis dataKey="semester" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                  <Legend />
                  <Bar dataKey="tinggi_4_5" stackId="a" fill="#1898d0" name="Tinggi (4–5)" />
                  <Bar dataKey="netral_3" stackId="a" fill="#006098" name="Netral (3)" />
                  <Bar dataKey="rendah_1_2" stackId="a" fill="#9b3d3d" name="Rendah (1–2)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="panel">
            <h2 className="section-title">Tabel tren & delta</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Semester</th>
                    <th>Responden</th>
                    <th>Kemudahan</th>
                    <th>Δ</th>
                    <th>Responsif</th>
                    <th>Δ</th>
                    <th>Solusi</th>
                    <th>Δ</th>
                    <th>Kepuasan</th>
                    <th>Δ</th>
                    <th>Skor keseluruhan</th>
                    <th>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.semester}>
                      <td>{row.semester}</td>
                      <td>{row.responden.toLocaleString("id-ID")}</td>
                      <td>{fmt(row.kemudahan)}</td>
                      <td className={`delta-cell ${deltaClass(row.delta_kemudahan)}`}>
                        {fmtDelta(row.delta_kemudahan) || "—"}
                      </td>
                      <td>{fmt(row.responsif)}</td>
                      <td className={`delta-cell ${deltaClass(row.delta_responsif)}`}>
                        {fmtDelta(row.delta_responsif) || "—"}
                      </td>
                      <td>{fmt(row.solusi)}</td>
                      <td className={`delta-cell ${deltaClass(row.delta_solusi)}`}>
                        {fmtDelta(row.delta_solusi) || "—"}
                      </td>
                      <td>{fmt(row.kepuasan)}</td>
                      <td className={`delta-cell ${deltaClass(row.delta_kepuasan)}`}>
                        {fmtDelta(row.delta_kepuasan) || "—"}
                      </td>
                      <td>{fmt(row.skor_keseluruhan)}</td>
                      <td className={`delta-cell ${deltaClass(row.delta_skor_keseluruhan)}`}>
                        {fmtDelta(row.delta_skor_keseluruhan) || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
