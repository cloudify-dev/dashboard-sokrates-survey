import { useState } from "react";
import "./App.css";
import AnalisPersemester from "./pages/AnalisPersemester";
import DashboardTren from "./pages/DashboardTren";
import SaranKritik from "./pages/SaranKritik";

const MENUS = [
  {
    id: "tren",
    label: "Dashboard Tren",
    desc: "Tren 3 semester",
  },
  {
    id: "analis",
    label: "Analis Persemester",
    desc: "Sheet per semester",
  },
  {
    id: "saran",
    label: "Saran & Kritik",
    desc: "Positif vs perbaikan",
  },
];

export default function App() {
  const [page, setPage] = useState("tren");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img
            className="brand-logo"
            src="/sokrates-logo.png"
            alt="Sokrates"
            width={48}
            height={48}
          />
          <div>
            <div className="brand-name">Sokrates</div>
            <div className="brand-sub">Survey Analytics</div>
          </div>
        </div>

        <div className="sidebar-section-label">Menu</div>

        <nav className="sidebar-nav" aria-label="Menu utama">
          {MENUS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-label">{item.label}</span>
              <span className="nav-desc">{item.desc}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-foot-title">BINUS Sokrates</div>
        </div>
      </aside>

      <div className="content">
        {page === "tren" && <DashboardTren />}
        {page === "analis" && <AnalisPersemester />}
        {page === "saran" && <SaranKritik />}
      </div>
    </div>
  );
}
