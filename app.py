"""Dashboard tren survey kepuasan BINUS Sokrates — 3 semester."""

from __future__ import annotations

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

from lib.load import METRIC_COLS, load_all_batches
from lib.metrics import (
    METRIC_LABELS,
    SEMESTER_ORDER,
    filter_tenants,
    semester_distribution,
    semester_summary,
    trend_table_with_delta,
)

st.set_page_config(
    page_title="Tren Survey Sokrates",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="expanded",
)

PLOTLY_LAYOUT = dict(
    margin=dict(l=40, r=20, t=48, b=40),
    paper_bgcolor="rgba(0,0,0,0)",
    plot_bgcolor="rgba(0,0,0,0)",
    font=dict(size=13),
    legend=dict(orientation="h", yanchor="bottom", y=1.02, x=0),
)


@st.cache_data(show_spinner="Memuat data survey…")
def get_data() -> pd.DataFrame:
    return load_all_batches()


def fmt_score(value: float | None) -> str:
    if value is None or pd.isna(value):
        return "—"
    return f"{value:.2f}"


def fmt_delta(value: float | None) -> str | None:
    if value is None or pd.isna(value):
        return None
    sign = "+" if value >= 0 else ""
    return f"{sign}{value:.2f} vs semester lalu"


def main() -> None:
    st.title("Dashboard Tren Survey Sokrates")
    st.caption(
        "Kepuasan sekolah terhadap layanan dan fitur aplikasi BINUS Sokrates "
        "— Genap 2024/2025 · Ganjil 2025/2026 · Genap 2025/2026"
    )

    df = get_data()

    with st.sidebar:
        st.header("Filter")
        tenants = sorted(df["tenant"].dropna().unique().tolist())
        selected = st.multiselect(
            "Tenant / sekolah",
            options=tenants,
            default=[],
            help="Kosongkan untuk menampilkan semua tenant.",
        )
        st.divider()
        st.markdown(
            f"**Data termuat:** {len(df):,} baris  \n"
            f"**Tenant unik:** {df['tenant'].nunique()}"
        )

    filtered = filter_tenants(df, selected or None)
    summary = semester_summary(filtered)
    dist = semester_distribution(filtered)
    table = trend_table_with_delta(summary)

    if summary.empty:
        st.warning("Tidak ada data untuk filter yang dipilih.")
        return

    # --- KPI ---
    st.subheader("Ringkasan per semester")
    cols = st.columns(len(summary))
    for col, (_, row) in zip(cols, summary.iterrows()):
        with col:
            delta_col = "delta_skor_keseluruhan"
            delta = None
            if delta_col in table.columns:
                match = table.loc[table["semester"] == row["semester"], delta_col]
                if not match.empty:
                    delta = match.iloc[0]
            st.metric(
                label=str(row["semester"]),
                value=fmt_score(row["skor_keseluruhan"]),
                delta=fmt_delta(delta),
                help=f"Rata-rata skor keseluruhan · {int(row['responden']):,} responden",
            )
            st.caption(f"{int(row['responden']):,} responden")

    # --- Line chart: 4 metrics ---
    st.subheader("Tren rata-rata skor per metrik")
    long = summary.melt(
        id_vars=["semester"],
        value_vars=METRIC_COLS,
        var_name="metrik",
        value_name="rata_rata",
    )
    long["metrik"] = long["metrik"].map(METRIC_LABELS)
    long["semester"] = pd.Categorical(
        long["semester"], categories=SEMESTER_ORDER, ordered=True
    )

    fig_line = px.line(
        long,
        x="semester",
        y="rata_rata",
        color="metrik",
        markers=True,
        labels={
            "semester": "Semester",
            "rata_rata": "Rata-rata skor (1–5)",
            "metrik": "Metrik",
        },
        title="Rata-rata skor Likert per semester",
    )
    fig_line.update_yaxes(range=[1, 5], dtick=0.5)
    fig_line.update_layout(**PLOTLY_LAYOUT)
    st.plotly_chart(fig_line, use_container_width=True)
    st.caption("Sumber: data/ · skor Likert 1–5 · rata-rata per pertanyaan")

    left, right = st.columns(2)

    with left:
        st.subheader("Skor keseluruhan")
        fig_bar = go.Figure(
            data=[
                go.Bar(
                    x=summary["semester"].astype(str),
                    y=summary["skor_keseluruhan"],
                    text=[fmt_score(v) for v in summary["skor_keseluruhan"]],
                    textposition="outside",
                    name="Skor keseluruhan",
                )
            ]
        )
        fig_bar.update_layout(
            **PLOTLY_LAYOUT,
            title="Mean gabungan Q1–Q4 per semester",
            xaxis_title="Semester",
            yaxis_title="Rata-rata skor (1–5)",
            yaxis=dict(range=[1, 5.2]),
            showlegend=False,
        )
        st.plotly_chart(fig_bar, use_container_width=True)
        st.caption("Sumber: data/ · mean dari rata-rata baris Q1–Q4")

    with right:
        st.subheader("Distribusi skor")
        if dist.empty:
            st.info("Distribusi tidak tersedia untuk filter ini.")
        else:
            fig_stack = go.Figure()
            for col, label in [
                ("tinggi_4_5", "Tinggi (4–5)"),
                ("netral_3", "Netral (3)"),
                ("rendah_1_2", "Rendah (1–2)"),
            ]:
                fig_stack.add_trace(
                    go.Bar(
                        name=label,
                        x=dist["semester"].astype(str),
                        y=dist[col],
                        text=[f"{v:.1f}%" for v in dist[col]],
                        textposition="inside",
                    )
                )
            fig_stack.update_layout(
                **PLOTLY_LAYOUT,
                barmode="stack",
                title="Persentase jawaban tinggi / netral / rendah",
                xaxis_title="Semester",
                yaxis_title="Persentase (%)",
                yaxis=dict(range=[0, 100]),
            )
            st.plotly_chart(fig_stack, use_container_width=True)
            st.caption(
                "Sumber: data/ · semua jawaban Q1–Q4 digabung · % dari total jawaban valid"
            )

    # --- Table ---
    st.subheader("Tabel tren & delta")
    display = table.copy()
    rename = {
        "semester": "Semester",
        "responden": "Responden",
        **{c: METRIC_LABELS[c] for c in METRIC_COLS},
        "skor_keseluruhan": METRIC_LABELS["skor_keseluruhan"],
    }
    for c in METRIC_COLS + ["skor_keseluruhan"]:
        rename[f"delta_{c}"] = f"Δ {METRIC_LABELS[c]}"

    display = display.rename(columns=rename)
    score_cols = [c for c in display.columns if c not in ("Semester", "Responden")]
    st.dataframe(
        display.style.format(
            {c: "{:.2f}" for c in score_cols},
            na_rep="—",
        ),
        use_container_width=True,
        hide_index=True,
    )
    st.caption("Delta = perubahan rata-rata dibanding semester sebelumnya")


if __name__ == "__main__":
    main()
