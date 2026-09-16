from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np

from aml_risk import AMLRiskModel


@dataclass
class BuyerRiskModel:
    aml_model: AMLRiskModel

    def score(self, transaction: dict[str, Any]) -> dict[str, Any]:
        aml = self.aml_model.score(transaction)
        value = float(transaction.get("transaction_value", 0))
        income = float(transaction.get("buyer_annual_income", 0))
        frequency = float(transaction.get("transactions_90d", 0))
        mismatch = 0.0 if income <= 0 or value <= 0 else np.clip((value / max(income, 1) - 4) * 12, 0, 70)
        frequency_risk = float(np.clip((frequency - 5) * 6, 0, 30))
        score = float(np.clip(0.45 * aml["score"] + mismatch + frequency_risk, 0, 100))
        reasons = list(aml["reasons"])
        if mismatch > 0:
            reasons.append("Transaction value is high relative to stated annual income")
        if frequency_risk > 0:
            reasons.append(f"Buyer has {int(frequency)} transactions in the last 90 days")
        return {"score": round(score, 2), "reasons": reasons, "income_mismatch_score": round(float(mismatch), 2), "frequency_score": round(frequency_risk, 2)}
