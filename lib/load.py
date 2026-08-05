"""Load and normalize survey Excel files with differing headers."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

METRIC_COLS = ["kemudahan", "responsif", "solusi", "kepuasan"]

# Column index mapping (0-based) per batch file.
BATCH_CONFIG = [
    {
        "file": "genap 2425.xlsx",
        "semester": "Genap 2024/2025",
        "tenant": 1,
        "metrics": [2, 3, 4, 5],
    },
    {
        "file": "ganjil 2526.xlsx",
        "semester": "Ganjil 2025/2026",
        "tenant": 1,
        "metrics": [2, 3, 4, 5],
    },
    {
        "file": "genap 2526.xlsx",
        "semester": "Genap 2025/2026",
        "tenant": 1,
        "metrics": [3, 4, 5, 6],
    },
]


def _to_score(series: pd.Series) -> pd.Series:
    scores = pd.to_numeric(series, errors="coerce")
    return scores.where(scores.between(1, 5))


def _normalize_batch(path: Path, config: dict) -> pd.DataFrame:
    raw = pd.read_excel(path, engine="openpyxl")
    out = pd.DataFrame(
        {
            "semester": config["semester"],
            "tenant": raw.iloc[:, config["tenant"]].astype(str).str.strip(),
        }
    )
    for col_name, idx in zip(METRIC_COLS, config["metrics"]):
        out[col_name] = _to_score(raw.iloc[:, idx])

    out["tenant"] = out["tenant"].replace({"": pd.NA, "nan": pd.NA, "None": pd.NA})
    out = out.dropna(subset=["tenant"])
    # Keep rows that have at least one valid metric score.
    out = out.dropna(subset=METRIC_COLS, how="all")
    return out.reset_index(drop=True)


def load_all_batches(data_dir: Path | None = None) -> pd.DataFrame:
    """Read all batch Excel files into one normalized dataframe."""
    root = Path(data_dir) if data_dir is not None else DATA_DIR
    frames: list[pd.DataFrame] = []

    for config in BATCH_CONFIG:
        path = root / config["file"]
        if not path.exists():
            raise FileNotFoundError(f"File data tidak ditemukan: {path}")
        frames.append(_normalize_batch(path, config))

    return pd.concat(frames, ignore_index=True)
