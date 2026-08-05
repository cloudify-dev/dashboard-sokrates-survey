"""Aggregations for cross-semester survey trends."""

from __future__ import annotations

import pandas as pd

from .load import METRIC_COLS

SEMESTER_ORDER = [
    "Genap 2024/2025",
    "Ganjil 2025/2026",
    "Genap 2025/2026",
]

METRIC_LABELS = {
    "kemudahan": "Kemudahan",
    "responsif": "Responsif",
    "solusi": "Solusi",
    "kepuasan": "Kepuasan keseluruhan",
    "skor_keseluruhan": "Skor keseluruhan",
}


def filter_tenants(df: pd.DataFrame, tenants: list[str] | None) -> pd.DataFrame:
    if not tenants:
        return df
    return df[df["tenant"].isin(tenants)].copy()


def semester_summary(df: pd.DataFrame) -> pd.DataFrame:
    """Mean score per metric and overall, plus respondent count, per semester."""
    rows = []
    for semester in SEMESTER_ORDER:
        part = df[df["semester"] == semester]
        if part.empty:
            continue
        row = {"semester": semester, "responden": int(len(part))}
        for col in METRIC_COLS:
            row[col] = part[col].mean(skipna=True)
        row["skor_keseluruhan"] = part[METRIC_COLS].mean(axis=1, skipna=True).mean()
        rows.append(row)

    summary = pd.DataFrame(rows)
    if not summary.empty:
        summary["semester"] = pd.Categorical(
            summary["semester"], categories=SEMESTER_ORDER, ordered=True
        )
        summary = summary.sort_values("semester").reset_index(drop=True)
    return summary


def trend_table_with_delta(summary: pd.DataFrame) -> pd.DataFrame:
    """Wide table of metric means with delta vs previous semester."""
    if summary.empty:
        return summary

    metric_cols = METRIC_COLS + ["skor_keseluruhan"]
    table = summary[["semester", "responden", *metric_cols]].copy()

    for col in metric_cols:
        prev = table[col].shift(1)
        table[f"delta_{col}"] = table[col] - prev

    return table


def semester_distribution(df: pd.DataFrame) -> pd.DataFrame:
    """Share of high (4–5) and low (1–2) scores across all metric answers."""
    rows = []
    for semester in SEMESTER_ORDER:
        part = df[df["semester"] == semester]
        if part.empty:
            continue
        values = part[METRIC_COLS].stack(future_stack=True).dropna()
        total = len(values)
        if total == 0:
            continue
        high = int(((values >= 4) & (values <= 5)).sum())
        mid = int((values == 3).sum())
        low = int(((values >= 1) & (values <= 2)).sum())
        rows.append(
            {
                "semester": semester,
                "tinggi_4_5": high / total * 100,
                "netral_3": mid / total * 100,
                "rendah_1_2": low / total * 100,
                "n_jawaban": total,
            }
        )

    dist = pd.DataFrame(rows)
    if not dist.empty:
        dist["semester"] = pd.Categorical(
            dist["semester"], categories=SEMESTER_ORDER, ordered=True
        )
        dist = dist.sort_values("semester").reset_index(drop=True)
    return dist
