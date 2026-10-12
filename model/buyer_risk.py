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
        value = float(transaction.get("transaction_value", transaction.get("price", 0)))
        income = float(transaction.get("buyer_annual_income", 0))
        frequency = float(transaction.get("transactions_90d", 0))

        # Income mismatch: standard home purchase is 3-5x annual income.
        # Ratios > 5x indicate increasing leverage/affordability risk or undeclared funds.
        if income > 0 and value > 0:
            ratio = value / income
            mismatch = float(np.clip((ratio - 4.0) * 12.0, 0.0, 70.0))
        else:
            mismatch = 0.0

        frequency_risk = float(np.clip((frequency - 5.0) * 6.0, 0.0, 30.0))
        score = float(np.clip(0.45 * aml["score"] + mismatch + frequency_risk, 0.0, 100.0))

        reasons = [r for r in aml["reasons"] if "within the calibrated" not in r.lower()]
        if mismatch > 0 and income > 0:
            reasons.append(f"Transaction value (Rs {value:,.0f}) is {value / income:.1f}x higher than stated annual income (Rs {income:,.0f})")
        if frequency_risk > 0:
            reasons.append(f"Buyer has recorded {int(frequency)} transactions in the last 90 days")

        if not reasons:
            reasons.append("Buyer profile and income metrics are consistent with transaction")

        return {
            "score": round(score, 2),
            "reasons": reasons,
            "income_mismatch_score": round(float(mismatch), 2),
            "frequency_score": round(frequency_risk, 2),
        }
