from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest


FEATURES = [
    "transaction_value",
    "transactions_90d",
    "avg_transaction_value",
    "wallet_age_days",
    "counterparty_count",
    "value_to_average",
    "transactions_per_counterparty",
]


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
        transactions = rng.poisson(1.4, n_samples)
        average_values = sampled * rng.lognormal(0, 0.18, n_samples)
        wallet_age = rng.lognormal(np.log(900), 0.65, n_samples)
        counterparties = np.maximum(1, rng.poisson(8, n_samples))
        normal = np.column_stack([
            sampled,
            transactions,
            average_values,
            wallet_age,
            counterparties,
            sampled / np.maximum(average_values, 1),
            transactions / counterparties,
        ])
        medians = dict(zip(FEATURES, np.median(normal, axis=0)))
        scales = dict(zip(FEATURES, np.maximum(np.median(np.abs(normal - np.median(normal, axis=0)), axis=0), 1e-9)))
        normalized = (normal - np.array([medians[f] for f in FEATURES])) / np.array([scales[f] for f in FEATURES])
        model = IsolationForest(n_estimators=160, contamination=0.02, random_state=random_state, n_jobs=-1)
        model.fit(normalized)
        return cls(
            model,
            {k: float(v) for k, v in medians.items()},
            {k: float(v) for k, v in scales.items()},
            {
                "price_median": float(np.median(prices)),
                "price_p01": float(np.quantile(prices, 0.01)),
                "price_p99": float(np.quantile(prices, 0.99)),
            },
        )

    def score(self, transaction: dict[str, Any]) -> dict[str, Any]:
        transaction_value = float(transaction.get("transaction_value", transaction.get("price", self.medians["transaction_value"])))
        transactions = float(transaction.get("transactions_90d", self.medians["transactions_90d"]))
        average_value = float(transaction.get("avg_transaction_value", self.medians["avg_transaction_value"]))
        wallet_age = float(transaction.get("wallet_age_days", self.medians["wallet_age_days"]))
        counterparties = float(transaction.get("counterparty_count", transaction.get("counterparties", self.medians["counterparty_count"])))

        values = np.array([[
            transaction_value,
            transactions,
            average_value,
            wallet_age,
            counterparties,
            transaction_value / max(average_value, 1),
            transactions / max(counterparties, 1),
        ]])
        normalized = (values - np.array([self.medians[f] for f in FEATURES])) / np.array([self.scales[f] for f in FEATURES])
        decision = float(self.model.decision_function(normalized)[0])
        is_anomaly = bool(self.model.predict(normalized)[0] == -1)
        anomaly = float(np.clip((0.15 - decision) / 0.30 * 100, 0, 100))

        reasons = []
        if wallet_age < 14:
            reasons.append(f"Brand new wallet address ({int(wallet_age)} days old)")
        if transactions > 8:
            reasons.append(f"High transaction frequency ({int(transactions)} transactions in 90 days)")
        if transaction_value > self.reference["price_p99"]:
            reasons.append(f"Transaction amount (Rs {transaction_value:,.0f}) exceeds 99th percentile of property market values")
        if (transaction_value / max(average_value, 1)) > 4.0:
            reasons.append(f"Transaction amount is {(transaction_value / max(average_value, 1)):.1f}x higher than historical wallet average")
        if counterparties > 25:
            reasons.append(f"Unusually high counterparty dispersion ({int(counterparties)} counterparties)")

        for name, value in zip(FEATURES, values[0]):
            if abs(value - self.medians[name]) > 4 * self.scales[name]:
                reason_str = f"{name.replace('_', ' ').title()} is far outside calibrated baseline"
                if reason_str not in reasons:
                    reasons.append(reason_str)

        if is_anomaly and not reasons:
            reasons.append("Multi-factor transaction anomaly detected by Isolation Forest")
        elif not reasons:
            reasons.append("Wallet behavior is within the calibrated transaction profile")

        return {
            "score": round(anomaly, 2),
            "is_anomaly": is_anomaly,
            "decision": round(decision, 5),
            "reasons": reasons,
        }

    def save(self, path: str | Path) -> None:
        joblib.dump(self, path, compress=3)

    @classmethod
    def load(cls, path: str | Path) -> "AMLRiskModel":
        return joblib.load(path)
