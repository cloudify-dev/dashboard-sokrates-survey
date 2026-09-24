import { useEffect, useMemo, useState } from "react";
import { fetchJson } from "../lib/api";
import { fmtId } from "../lib/format";

function DeltaBadge({ delta, compact = false }) {
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return <span className="delta-chip flat">—</span>;
  }
  if (Math.abs(delta) < 0.005) {
    return <span className="delta-chip flat">→ 0,00</span>;
  }
  const up = delta > 0;
  return (
    <span className={`delta-chip ${up ? "up" : "down"}`}>
      <span className="delta-arrow">{up ? "▲" : "▼"}</span>
      {up ? "+" : ""}
      {fmtId(delta)}
    </span>
  );
}

function Sparkline({ values, maxScale = 5 }) {
  const points = values
    .map((v, i) => {
      if (v === null || v === undefined) return null;
      const x = values.length === 1 ? 50 : (i / (values.length - 1)) * 100;
      const y = 100 - (Math.min(Math.max(v, 1), maxScale) - 1) / (maxScale - 1) * 80 - 10;
      return `${x},${y}`;
    })
    .filter(Boolean);

  if (points.length < 2) {
    return <div className="sparkline empty" />;
  }

  const nums = values.filter((v) => v !== null);
  const rising = nums[nums.length - 1] >= nums[0];

  return (
    <svg className={`sparkline ${rising ? "up" : "down"}`} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
      />
      {points.map((p) => {
        const [x, y] = p.split(",");
        return <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="currentColor" />;
      })}
    </svg>
  );
}

function scoreTone(value, scale) {
  if (value === null || value === undefined) return "empty";
  const max = scale === "6" ? 6 : 5;
  const ratio = value / max;
  if (ratio >= 0.9) return "high";
  if (ratio >= 0.75) return "mid";
  return "low";
}

export default function PerbandinganCsi() {
  const [rows, setRows] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [scale, setScale] = useState("5");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | naik | turun | tetap
  const [sortBy, setSortBy] = useState("delta"); // delta | latest | name
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    fetchJson("/api/analysis/csi-comparison")
      .then((res) => {
        if (cancelled) return;
        setPeriods(res.periods || []);
        setRows(res.rows || []);
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
  }, []);

  const csiKey = scale === "6" ? "csi6" : "csi5";
  const deltaKey = scale === "6" ? "delta6" : "delta5";
  const maxScale = scale === "6" ? 6 : 5;

  const prepared = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = rows.map((row) => {
      const overall =
        scale === "6" && row.overallDelta5 !== null
          ? row.overallDelta5 * 1.2
          : row.overallDelta5;
      const latest = [...row.values].reverse().find((v) => v[csiKey] !== null);
      return { ...row, overall, latest: latest?.[csiKey] ?? null };
    });

    if (q) {
      list = list.filter((row) => row.tenant.toLowerCase().includes(q));
    }

    if (filter === "naik") {
      list = list.filter((r) => r.overall !== null && r.overall > 0.005);
    } else if (filter === "turun") {
      list = list.filter((r) => r.overall !== null && r.overall < -0.005);
    } else if (filter === "tetap") {
      list = list.filter(
        (r) => r.overall !== null && Math.abs(r.overall) <= 0.005
      );
    }

    list.sort((a, b) => {
      if (sortBy === "name") return a.tenant.localeCompare(b.tenant);
      if (sortBy === "latest") return (b.latest ?? -1) - (a.latest ?? -1);
      const ad = a.overall ?? -999;
      const bd = b.overall ?? -999;
      return bd - ad;
    });

    return list;
  }, [rows, search, filter, sortBy, scale, csiKey]);

  const summary = useMemo(() => {
    const withOverall = rows.filter((r) => r.overallDelta5 !== null);
    const naik = withOverall.filter((r) => r.overallDelta5 > 0.005).length;
    const turun = withOverall.filter((r) => r.overallDelta5 < -0.005).length;
    const flat = withOverall.length - naik - turun;
    const avgDelta =
      withOverall.length === 0
        ? null
        : withOverall.reduce((s, r) => s + r.overallDelta5, 0) /
          withOverall.length;
    return { naik, turun, flat, n: withOverall.length, avgDelta };
  }, [rows]);

  return (
    <div className="page page-wide">
      <header className="page-header csi-header">
        <div>
          <p className="eyebrow">Analisis</p>
          <h1>Perbandingan CSI</h1>
          <p className="lede">
            CSI 1 → CSI 2 → CSI 3 per tenant, lengkap dengan perubahan naik/turun.
          </p>
        </div>
        <div className="page-actions">
          <div className="view-tabs">
            <button
              type="button"
              className={`view-tab ${scale === "5" ? "active" : ""}`}
              onClick={() => setScale("5")}
            >
              Skala 5
            </button>
            <button
              type="button"
              className={`view-tab ${scale === "6" ? "active" : ""}`}
              onClick={() => setScale("6")}
            >
              Skala 6
            </button>
          </div>
          <input
            className="search-input"
            type="search"
            placeholder="Cari tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {!loading && !error && (
        <section className="csi-summary">
          <article className="csi-stat">
            <span className="csi-stat-label">Tenant dibanding</span>
            <strong>{summary.n}</strong>
          </article>
          <article className="csi-stat up">
            <span className="csi-stat-label">Naik</span>
            <strong>{summary.naik}</strong>
            <small>CSI 1 → terakhir</small>
          </article>
          <article className="csi-stat down">
            <span className="csi-stat-label">Turun</span>
            <strong>{summary.turun}</strong>
          </article>
          <article className="csi-stat flat">
            <span className="csi-stat-label">Tetap</span>
            <strong>{summary.flat}</strong>
          </article>
          <article className="csi-stat accent">
            <span className="csi-stat-label">Rata-rata Δ</span>
            <strong>
              {summary.avgDelta === null
                ? "—"
                : `${summary.avgDelta > 0 ? "+" : ""}${fmtId(
                    scale === "6" ? summary.avgDelta * 1.2 : summary.avgDelta
                  )}`}
            </strong>
          </article>
        </section>
      )}

      {!loading && !error && (
        <div className="csi-toolbar">
          <div className="view-tabs">
            {[
              ["all", "Semua"],
              ["naik", "Naik"],
              ["turun", "Turun"],
              ["tetap", "Tetap"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`view-tab ${filter === id ? "active" : ""}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <select
            className="search-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="delta">Urut Δ terbesar</option>
            <option value="latest">Urut CSI terbaru</option>
            <option value="name">Urut nama</option>
          </select>
        </div>
      )}

      {error && <div className="state error">{error}</div>}
      {loading && !error && <div className="state">Memuat perbandingan CSI…</div>}

      {!loading && !error && (
        <section className="sheet pivot-sheet csi-sheet">
          <div className="sheet-table-wrap">
            <table className="sheet-table pivot-table csi-table">
              <thead>
                <tr>
                  <th className="tenant-col">Tenant</th>
                  <th className="trend-col">Tren</th>
                  {periods.map((p) => (
                    <th key={p.key} className="num">
                      <div className="csi-th-main">{p.label}</div>
                      <div className="csi-th-sub">{p.semester}</div>
                    </th>
                  ))}
                  <th className="num">Δ keseluruhan</th>
                </tr>
              </thead>
              <tbody>
                {prepared.map((row) => {
                  const series = row.values.map((v) => v[csiKey]);
                  return (
                    <tr key={row.tenant}>
                      <td className="tenant-col">
                        <div className="tenant-name">{row.tenant}</div>
                      </td>
                      <td className="trend-col">
                        <Sparkline values={series} maxScale={maxScale} />
                      </td>
                      {row.values.map((v, index) => (
                        <td
                          key={v.key}
                          className={`num csi-cell tone-${scoreTone(
                            v[csiKey],
                            scale
                          )}`}
                        >
                          <div className="csi-main">
                            <span className="csi-value">
                              {fmtId(v[csiKey])}
                            </span>
                            {index > 0 ? (
                              <DeltaBadge delta={v[deltaKey]} />
                            ) : (
                              <span className="delta-chip flat">acuan</span>
                            )}
                          </div>
                          <div className="csi-n">
                            {v.peserta !== null
                              ? `${v.peserta.toLocaleString("id-ID")} resp.`
                              : "no data"}
                          </div>
                        </td>
                      ))}
                      <td className="num csi-overall">
                        <DeltaBadge delta={row.overall} />
                      </td>
                    </tr>
                  );
                })}
                {!prepared.length && (
                  <tr>
                    <td colSpan={periods.length + 3} className="empty-cell">
                      Tidak ada tenant untuk filter ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
