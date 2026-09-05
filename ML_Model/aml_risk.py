from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest


FEATURES = ["transaction_value", "transactions_90d", "avg_transaction_value", "wallet_age_days", "counterparty_count"]


@dataclass
class AMLRiskModel:
    model: IsolationForest
    medians: dict[str, float]
    scales: dict[str, float]
    reference: dict[str, float]

    @classmethod
    def train(cls, price_values: np.ndarray, random_state: int = 42, n_samples: int = 10000) -> "AMLRiskModel":
        prices = np.asarray(price_values, dtype=float)
        prices = prices[np.isfinite(prices) & (prices > 0)]
        if len(prices) < 20:
            raise ValueError("At least 20 valid property prices are needed for AML calibration")
        rng = np.random.default_rng(random_state)
        sampled = rng.choice(prices, size=n_samples, replace=True)
        normal = np.column_stack([
            sampled,
            rng.poisson(1.4, n_samples),
            sampled * rng.lognormal(0, 0.18, n_samples),
            rng.lognormal(np.log(900), 0.65, n_samples),
            np.maximum(1, rng.poisson(8, n_samples)),
        ])
        medians = dict(zip(FEATURES, np.median(normal, axis=0)))
        scales = dict(zip(FEATURES, np.maximum(np.median(np.abs(normal - np.median(normal, axis=0)), axis=0), 1e-9)))
        normalized = (normal - np.array(list(medians.values()))) / np.array(list(scales.values()))
        model = IsolationForest(n_estimators=160, contamination=0.02, random_state=random_state, n_jobs=-1)
        model.fit(normalized)
        return cls(model, {k: float(v) for k, v in medians.items()}, {k: float(v) for k, v in scales.items()}, {
            "price_median": float(np.median(prices)), "price_p01": float(np.quantile(prices, .01)), "price_p99": float(np.quantile(prices, .99))
        })

    def score(self, transaction: dict[str, Any]) -> dict[str, Any]:
        values = np.array([[float(transaction.get(name, self.medians[name])) for name in FEATURES]])
        normalized = (values - np.array(list(self.medians.values()))) / np.array(list(self.scales.values()))
        decision = float(self.model.decision_function(normalized)[0])
        anomaly = float(np.clip((0.15 - decision) / 0.30 * 100, 0, 100))
        reasons = []
        for name, value in zip(FEATURES, values[0]):
            if abs(value - self.medians[name]) > 4 * self.scales[name]:
                reasons.append(f"{name.replace('_', ' ')} is far outside calibrated behavior")
        if not reasons:
            reasons.append("Wallet behavior is within the calibrated transaction profile")
        return {"score": round(anomaly, 2), "is_anomaly": bool(self.model.predict(normalized)[0] == -1), "decision": round(decision, 5), "reasons": reasons}

    def save(self, path: str | Path) -> None:
        joblib.dump(self, path)

    @classmethod
    def load(cls, path: str | Path) -> "AMLRiskModel":
        return joblib.load(path)
