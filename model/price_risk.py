from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import re
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_absolute_percentage_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


PRICE_COLUMNS = ("City_name", "No_of_BHK", "Size", "is_RERA_registered")

CITY_ALIASES = {
    "amdavad": "Ahmedabad",
    "ahmedabad": "Ahmedabad",
    "bengaluru": "Bangalore",
    "bangalore": "Bangalore",
    "chennai": "Chennai",
    "madras": "Chennai",
    "delhi": "Delhi",
    "new delhi": "Delhi",
    "noida": "Delhi",
    "greater noida": "Delhi",
    "gurgaon": "Delhi",
    "gurugram": "Delhi",
    "faridabad": "Delhi",
    "ghaziabad": "Delhi",
    "delhi ncr": "Delhi",
    "hyderabad": "Hyderabad",
    "secunderabad": "Hyderabad",
    "kolkata": "Kolkata",
    "calcutta": "Kolkata",
    "lucknow": "Lucknow",
    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "thane": "Mumbai",
    "navi mumbai": "Mumbai",
    "pune": "Mumbai",  # Reasonable proxy fallback if tier-1 city in Maharashtra
}


def normalize_city(value: Any) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "Unknown"
    cleaned = str(value).strip()
    lower = cleaned.lower()
    if lower in CITY_ALIASES:
        return CITY_ALIASES[lower]
    # Check partial match for Delhi/NCR or Mumbai/Bangalore variants
    for key, target in CITY_ALIASES.items():
        if key in lower:
            return target
    return cleaned.title()


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
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    s = str(value).strip()
    match = re.search(r"(\d+)\s*(?:BHK|RK)", s, re.I)
    if match:
        return float(match.group(1))
    return _number(value)


def _bool(value: Any) -> int:
    return int(str(value).strip().lower() in {"true", "1", "yes", "y"})


def _extract_text(value: Any) -> str:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return "Unknown"
    s = str(value).strip()
    return s if s else "Unknown"


@dataclass
class PriceRiskModel:
    model: Pipeline  # Primary/hierarchical locality pipeline
    city_model: Pipeline  # Standalone city pipeline for city-only inputs
    city_stats: dict[str, dict[str, float]]
    sub_stats: dict[str, dict[str, float]]
    loc_stats: dict[str, dict[str, float]]
    global_median: float
    metrics: dict[str, float]
    price_quantiles: dict[str, float]

    @classmethod
    def train(cls, csv_path: str | Path, random_state: int = 42) -> "PriceRiskModel":
        frame = _read_csv(csv_path)
        required = {"City_name", "No_of_BHK", "Size", "Price", "is_RERA_registered"}
        missing = required - set(frame.columns)
        if missing:
            raise ValueError(f"CSV is missing required columns: {sorted(missing)}")

        # Clean base features
        raw_price = frame["Price"].map(parse_price)
        raw_size = frame["Size"].map(parse_size)
        raw_bhk = frame["No_of_BHK"].map(parse_bhk).fillna(0)

        # Valid property rates (eliminate data entry errors like Rs 100/sqft or token Rs 1000 prices)
        rate = raw_price / raw_size
        valid_mask = (
            (raw_price >= 150000)
            & (raw_size >= 80)
            & (raw_size <= 40000)
            & (rate >= 350)
            & (rate <= 150000)
        )
        clean_frame = frame[valid_mask].copy()

        if len(clean_frame) < 100:
            raise ValueError("Not enough valid priced properties to train the price model")

        cities = clean_frame["City_name"].map(normalize_city)
        sub_urbans = clean_frame["Sub_urban_name"].fillna("Unknown").astype(str).str.strip() if "Sub_urban_name" in clean_frame else pd.Series(["Unknown"] * len(clean_frame))
        localities = clean_frame["Locality_Name"].fillna("Unknown").astype(str).str.strip() if "Locality_Name" in clean_frame else pd.Series(["Unknown"] * len(clean_frame))
        ptypes = clean_frame["Property_type"].fillna("Apartment").astype(str).str.strip() if "Property_type" in clean_frame else pd.Series(["Apartment"] * len(clean_frame))
        ready_to_move = clean_frame["is_ready_to_move"].map(_bool) if "is_ready_to_move" in clean_frame else pd.Series([1] * len(clean_frame))
        is_apartment = clean_frame["is_Apartment"].map(_bool) if "is_Apartment" in clean_frame else pd.Series([1] * len(clean_frame))

        data = pd.DataFrame({
            "city": cities,
            "sub_urban": sub_urbans,
            "locality": localities,
            "ptype": ptypes,
            "bhk": raw_bhk[valid_mask],
            "size_sqft": raw_size[valid_mask],
            "rera": clean_frame["is_RERA_registered"].map(_bool),
            "ready": ready_to_move,
            "apartment": is_apartment,
            "price": raw_price[valid_mask],
        }).reset_index(drop=True)

        data["rate"] = data["price"] / data["size_sqft"]
        data["log_size"] = np.log1p(data["size_sqft"])
        data["size_per_bhk"] = data["size_sqft"] / np.maximum(data["bhk"], 1)

        # Train/test split
        train_df, test_df = train_test_split(data, test_size=0.2, random_state=random_state)

        # Compute empirical bayes priors for location rates
        global_median = float(train_df["rate"].median())

        city_stats: dict[str, dict[str, float]] = {
            k: {"median": float(v["median"]), "count": float(v["count"])}
            for k, v in train_df.groupby("city")["rate"].agg(["median", "count"]).to_dict(orient="index").items()
        }
        sub_stats: dict[str, dict[str, float]] = {
            f"{c}|||{s}": {"median": float(v["median"]), "count": float(v["count"])}
            for (c, s), v in train_df.groupby(["city", "sub_urban"])["rate"].agg(["median", "count"]).to_dict(orient="index").items()
        }
        loc_stats: dict[str, dict[str, float]] = {
            f"{c}|||{l}": {"median": float(v["median"]), "count": float(v["count"])}
            for (c, l), v in train_df.groupby(["city", "locality"])["rate"].agg(["median", "count"]).to_dict(orient="index").items()
        }

        def compute_prior_series(subset: pd.DataFrame, m_sub: float = 10.0, m_loc: float = 5.0) -> np.ndarray:
            priors = []
            for c, s, l in zip(subset["city"], subset["sub_urban"], subset["locality"]):
                c_med = city_stats.get(c, {}).get("median", global_median)
                s_key = f"{c}|||{s}"
                if s and s != "Unknown" and s_key in sub_stats:
                    s_data = sub_stats[s_key]
                    s_med = (s_data["count"] * s_data["median"] + m_sub * c_med) / (s_data["count"] + m_sub)
                else:
                    s_med = c_med
                l_key = f"{c}|||{l}"
                if l and l != "Unknown" and l_key in loc_stats:
                    l_data = loc_stats[l_key]
                    l_med = (l_data["count"] * l_data["median"] + m_loc * s_med) / (l_data["count"] + m_loc)
                else:
                    l_med = s_med
                priors.append(l_med)
            return np.array(priors)

        train_prior = compute_prior_series(train_df)
        test_prior = compute_prior_series(test_df)

        train_df = train_df.copy()
        test_df = test_df.copy()
        train_df["log_prior"] = np.log(train_prior)
        test_df["log_prior"] = np.log(test_prior)

        # 1. Locality pipeline (hierarchical model)
        loc_features = ["city", "ptype", "bhk", "size_sqft", "log_size", "size_per_bhk", "log_prior", "rera", "ready", "apartment"]
        loc_cat = ["city", "ptype"]
        loc_num = ["bhk", "size_sqft", "log_size", "size_per_bhk", "log_prior", "rera", "ready", "apartment"]

        loc_prep = ColumnTransformer([
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), loc_cat),
            ("num", "passthrough", loc_num),
        ])

        loc_pipeline = Pipeline([
            ("prep", loc_prep),
            ("model", HistGradientBoostingRegressor(
                max_iter=450,
                learning_rate=0.08,
                max_leaf_nodes=127,
                min_samples_leaf=20,
                l2_regularization=0.05,
                random_state=random_state,
            )),
        ])
        loc_pipeline.fit(train_df[loc_features], np.log(train_df["rate"]))

        # 2. City pipeline (standalone model when locality/suburban is unknown)
        city_features = ["city", "ptype", "bhk", "size_sqft", "log_size", "size_per_bhk", "rera", "ready", "apartment"]
        city_cat = ["city", "ptype"]
        city_num = ["bhk", "size_sqft", "log_size", "size_per_bhk", "rera", "ready", "apartment"]

        city_prep = ColumnTransformer([
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), city_cat),
            ("num", "passthrough", city_num),
        ])

        city_pipeline = Pipeline([
            ("prep", city_prep),
            ("model", HistGradientBoostingRegressor(
                max_iter=350,
                learning_rate=0.08,
                max_leaf_nodes=63,
                min_samples_leaf=20,
                l2_regularization=0.05,
                random_state=random_state,
            )),
        ])
        city_pipeline.fit(train_df[city_features], np.log(train_df["rate"]))

        # Evaluate performance on holdout test set
        pred_rate_loc = np.exp(loc_pipeline.predict(test_df[loc_features]))
        pred_price = pred_rate_loc * test_df["size_sqft"].to_numpy()
        y_test_price = test_df["price"].to_numpy()

        r2 = float(r2_score(y_test_price, pred_price))
        mape = float(mean_absolute_percentage_error(y_test_price, pred_price))
        mae = float(mean_absolute_error(y_test_price, pred_price))
        within_20 = float(np.mean(np.abs(y_test_price - pred_price) / y_test_price <= 0.20))
        within_15 = float(np.mean(np.abs(y_test_price - pred_price) / y_test_price <= 0.15))
        within_25 = float(np.mean(np.abs(y_test_price - pred_price) / y_test_price <= 0.25))

        metrics = {
            "r2": r2,
            "mape": mape,
            "mae": mae,
            "within_15_percent": within_15,
            "within_20_percent": within_20,
            "within_25_percent": within_25,
            "rows": float(len(data)),
        }
        quantiles = data["price"].quantile([0.01, 0.5, 0.99]).to_dict()

        return cls(
            model=loc_pipeline,
            city_model=city_pipeline,
            city_stats=city_stats,
            sub_stats=sub_stats,
            loc_stats=loc_stats,
            global_median=global_median,
            metrics=metrics,
            price_quantiles={str(k): float(v) for k, v in quantiles.items()},
        )

    def _extract_inputs(self, transaction: dict[str, Any]) -> dict[str, Any]:
        city = normalize_city(transaction.get("city", transaction.get("district", transaction.get("City_name", "Ahmedabad"))))
        size = parse_size(transaction.get("size_sqft", transaction.get("Size", transaction.get("area_sqft", 1500))))
        if np.isnan(size) or size <= 0:
            size = 1500.0

        bhk = parse_bhk(transaction.get("bhk", transaction.get("No_of_BHK", 3)))
        if np.isnan(bhk) or bhk < 0:
            bhk = 3.0 if size >= 1200 else (2.0 if size >= 700 else 1.0)

        ptype = str(transaction.get("property_type", transaction.get("Property_type", ""))).strip()
        if not ptype:
            ptype = "Apartment" if bhk > 0 else "Residential Plot"

        rera = _bool(transaction.get("rera", transaction.get("is_RERA_registered", True)))
        ready = _bool(transaction.get("ready_to_move", transaction.get("is_ready_to_move", True)))
        apartment = _bool(transaction.get("is_apartment", transaction.get("is_Apartment", ptype == "Apartment")))

        # Check locality / suburban in fields or address
        locality = _extract_text(transaction.get("locality", transaction.get("Locality_Name", transaction.get("neighborhood", ""))))
        sub_urban = _extract_text(transaction.get("sub_urban", transaction.get("Sub_urban_name", "")))

        # Also search address_line or survey_details if locality is Unknown
        if locality == "Unknown":
            address = str(transaction.get("address_line", transaction.get("address", transaction.get("survey_details", ""))))
            for key in self.loc_stats:
                c, l = key.split("|||")
                if c == city and len(l) > 3 and l.lower() in address.lower():
                    locality = l
                    break

        return {
            "city": city,
            "locality": locality,
            "sub_urban": sub_urban,
            "ptype": ptype,
            "bhk": float(bhk),
            "size_sqft": float(size),
            "log_size": float(np.log1p(size)),
            "size_per_bhk": float(size / max(bhk, 1.0)),
            "rera": int(rera),
            "ready": int(ready),
            "apartment": int(apartment),
        }

    def predict_fair_price(self, transaction: dict[str, Any]) -> float:
        inputs = self._extract_inputs(transaction)
        city = inputs["city"]
        locality = inputs["locality"]
        sub_urban = inputs["sub_urban"]
        size = inputs["size_sqft"]

        # Check if locality or suburban matches known dataset clusters
        l_key = f"{city}|||{locality}"
        s_key = f"{city}|||{sub_urban}"
        has_local_info = (locality != "Unknown" and l_key in self.loc_stats) or (sub_urban != "Unknown" and s_key in self.sub_stats)

        if has_local_info:
            c_med = self.city_stats.get(city, {}).get("median", self.global_median)
            if s_key in self.sub_stats:
                s_data = self.sub_stats[s_key]
                s_med = (s_data["count"] * s_data["median"] + 10.0 * c_med) / (s_data["count"] + 10.0)
            else:
                s_med = c_med
            if l_key in self.loc_stats:
                l_data = self.loc_stats[l_key]
                l_med = (l_data["count"] * l_data["median"] + 5.0 * s_med) / (l_data["count"] + 5.0)
            else:
                l_med = s_med

            row = pd.DataFrame([{
                "city": city,
                "ptype": inputs["ptype"],
                "bhk": inputs["bhk"],
                "size_sqft": size,
                "log_size": inputs["log_size"],
                "size_per_bhk": inputs["size_per_bhk"],
                "log_prior": float(np.log(l_med)),
                "rera": inputs["rera"],
                "ready": inputs["ready"],
                "apartment": inputs["apartment"],
            }])
            pred_rate = float(np.exp(self.model.predict(row)[0]))
        else:
            row = pd.DataFrame([{
                "city": city,
                "ptype": inputs["ptype"],
                "bhk": inputs["bhk"],
                "size_sqft": size,
                "log_size": inputs["log_size"],
                "size_per_bhk": inputs["size_per_bhk"],
                "rera": inputs["rera"],
                "ready": inputs["ready"],
                "apartment": inputs["apartment"],
            }])
            pred_rate = float(np.exp(self.city_model.predict(row)[0]))

        # Safeguard realistic minimum rate (Rs 400/sqft)
        pred_rate = max(400.0, pred_rate)
        fair_price = pred_rate * size
        return float(round(max(100000.0, fair_price), 2))

    def score(self, transaction: dict[str, Any]) -> dict[str, Any]:
        actual = parse_price(transaction.get("price", transaction.get("Price", transaction.get("sale_price", 0))))
        fair = self.predict_fair_price(transaction)
        if actual <= 0 or fair <= 0:
            return {"score": 50.0, "fair_price": fair, "price": actual, "reasons": ["Missing or invalid property price"]}

        deviation = (actual - fair) / fair
        score = float(np.clip(abs(deviation) * 100, 0, 100))
        reasons = []

        if deviation > 0.25:
            reasons.append(f"Listing price (Rs {actual:,.0f}) is {deviation:.0%} above model-estimated fair market price (Rs {fair:,.0f})")
        elif deviation < -0.25:
            reasons.append(f"Listing price (Rs {actual:,.0f}) is {abs(deviation):.0%} below model-estimated fair market price (Rs {fair:,.0f}) — potential undervaluation for tax avoidance")
        else:
            reasons.append(f"Listing price is broadly consistent with comparable properties (within {abs(deviation):.0%} of fair value Rs {fair:,.0f})")

        return {
            "score": round(score, 2),
            "fair_price": round(fair, 2),
            "price": actual,
            "deviation": round(deviation, 4),
            "reasons": reasons,
        }

    def save(self, path: str | Path) -> None:
        joblib.dump(self, path, compress=3)

    @classmethod
    def load(cls, path: str | Path) -> "PriceRiskModel":
        return joblib.load(path)


def _read_csv(csv_path: str | Path) -> pd.DataFrame:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Property dataset not found: {path}")
    if path.stat().st_size < 1024:
        prefix = path.read_text(encoding="utf-8", errors="ignore")[:200]
        if "git-lfs.github.com/spec" in prefix:
            raise ValueError(
                f"Property dataset is a Git LFS pointer, not the actual CSV: {path}. "
                "Install Git LFS and run `git lfs pull` before training."
            )
    for encoding in ("utf-8", "cp1252", "latin-1"):
        try:
            return pd.read_csv(csv_path, encoding=encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Could not decode CSV file: {csv_path}")
