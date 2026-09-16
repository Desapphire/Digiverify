from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_percentage_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


PRICE_COLUMNS = ("City_name", "No_of_BHK", "Size", "is_RERA_registered")


def _number(value: Any) -> float:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    match = re.search(r"[-+]?\d[\d,]*(?:\.\d+)?", str(value))
    return float(match.group(0).replace(",", "")) if match else np.nan


def parse_price(value: Any) -> float:
    return _number(value)


def parse_size(value: Any) -> float:
    return _number(value)


def parse_bhk(value: Any) -> float:
    return _number(value)


def _bool(value: Any) -> int:
    return int(str(value).strip().lower() in {"true", "1", "yes", "y"})


@dataclass
class PriceRiskModel:
    model: Pipeline
    metrics: dict[str, float]
    price_quantiles: dict[str, float]

    @classmethod
    def train(cls, csv_path: str | Path, random_state: int = 42) -> "PriceRiskModel":
        frame = _read_csv(csv_path)
        required = {"City_name", "No_of_BHK", "Size", "Price", "is_RERA_registered"}
        missing = required - set(frame.columns)
        if missing:
            raise ValueError(f"CSV is missing required columns: {sorted(missing)}")

        data = pd.DataFrame({
            "city": frame["City_name"].fillna("Unknown").astype(str),
            "bhk": frame["No_of_BHK"].map(parse_bhk),
            "size_sqft": frame["Size"].map(parse_size),
            "rera": frame["is_RERA_registered"].map(_bool),
            "price": frame["Price"].map(parse_price),
        }).dropna()
        data = data[data.price > 0]
        if len(data) < 100:
            raise ValueError("Not enough valid priced properties to train the price model")

        features = ["city", "bhk", "size_sqft", "rera"]
        x_train, x_test, y_train, y_test = train_test_split(
            data[features], data.price, test_size=0.2, random_state=random_state
        )
        transformer = ColumnTransformer([
            ("city", OneHotEncoder(handle_unknown="ignore"), ["city"]),
            ("numeric", "passthrough", ["bhk", "size_sqft", "rera"]),
        ])
        pipeline = Pipeline([
            ("features", transformer),
            ("regressor", RandomForestRegressor(
                n_estimators=120, min_samples_leaf=2, n_jobs=-1, random_state=random_state
            )),
        ])
        pipeline.fit(x_train, y_train)
        prediction = pipeline.predict(x_test)
        metrics = {
            "r2": float(r2_score(y_test, prediction)),
            "mape": float(mean_absolute_percentage_error(y_test, prediction)),
            "rows": float(len(data)),
        }
        quantiles = data.price.quantile([0.01, 0.5, 0.99]).to_dict()
        return cls(pipeline, metrics, {str(k): float(v) for k, v in quantiles.items()})

    def _features(self, transaction: dict[str, Any]) -> pd.DataFrame:
        return pd.DataFrame([{
            "city": str(transaction.get("city", transaction.get("City_name", "Unknown"))),
            "bhk": parse_bhk(transaction.get("bhk", transaction.get("No_of_BHK", 0))),
            "size_sqft": parse_size(transaction.get("size_sqft", transaction.get("Size", 0))),
            "rera": _bool(transaction.get("rera", transaction.get("is_RERA_registered", False))),
        }]).fillna(0)

    def predict_fair_price(self, transaction: dict[str, Any]) -> float:
        return float(max(0, self.model.predict(self._features(transaction))[0]))

    def score(self, transaction: dict[str, Any]) -> dict[str, Any]:
        actual = parse_price(transaction.get("price", transaction.get("Price", 0)))
        fair = self.predict_fair_price(transaction)
        if actual <= 0 or fair <= 0:
            return {"score": 50.0, "fair_price": fair, "price": actual, "reasons": ["Missing or invalid property price"]}
        deviation = (actual - fair) / fair
        score = float(np.clip(abs(deviation) * 100, 0, 100))
        reasons = []
        if deviation > 0.25:
            reasons.append(f"Listing is {deviation:.0%} above model-estimated fair price")
        elif deviation < -0.25:
            reasons.append(f"Listing is {abs(deviation):.0%} below model-estimated fair price")
        else:
            reasons.append("Listing price is broadly consistent with comparable properties")
        return {"score": round(score, 2), "fair_price": round(fair, 2), "price": actual, "deviation": round(deviation, 4), "reasons": reasons}

    def save(self, path: str | Path) -> None:
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: str | Path) -> "PriceRiskModel":
        return joblib.load(path)


def _read_csv(csv_path: str | Path) -> pd.DataFrame:
    for encoding in ("utf-8", "cp1252", "latin-1"):
        try:
            return pd.read_csv(csv_path, encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Could not decode CSV file: {csv_path}")
