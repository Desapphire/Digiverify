from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd

from aml_risk import AMLRiskModel
from buyer_risk import BuyerRiskModel
from price_risk import PriceRiskModel, _read_csv, parse_price


@dataclass
class RiskEngine:
    price_model: PriceRiskModel
    aml_model: AMLRiskModel
    buyer_model: BuyerRiskModel

    @classmethod
    def train(cls, csv_path: str | Path, random_state: int = 42) -> "RiskEngine":
        price_model = PriceRiskModel.train(csv_path, random_state=random_state)
        frame = _read_csv(csv_path)[["Price"]]
        prices = frame["Price"].map(parse_price).dropna().to_numpy()
        aml_model = AMLRiskModel.train(prices, random_state=random_state)
        return cls(price_model, aml_model, BuyerRiskModel(aml_model))

    def score(self, transaction: dict[str, Any]) -> dict[str, Any]:
        price = self.price_model.score(transaction)
        aml = self.aml_model.score(transaction)
        buyer = self.buyer_model.score(transaction)
        overall = round(0.35 * aml["score"] + 0.35 * buyer["score"] + 0.30 * price["score"], 2)
        if overall >= 80:
            level, action = "Critical", "Hold transaction and perform enhanced due diligence"
        elif overall >= 60:
            level, action = "High", "Review manually before approval"
        elif overall >= 35:
            level, action = "Medium", "Request supporting documents and monitor"
        else:
            level, action = "Low", "Allow with standard monitoring"
        return {
            "overall_score": overall,
            "risk_level": level,
            "action": action,
            "weights": {"aml": 0.35, "buyer": 0.35, "price": 0.30},
            "price_risk": price,
            "aml_risk": aml,
            "buyer_risk": buyer,
        }

    def save(self, directory: str | Path) -> None:
        directory = Path(directory)
        directory.mkdir(parents=True, exist_ok=True)
        self.price_model.save(directory / "price_model.joblib")
        self.aml_model.save(directory / "aml_model.joblib")

    @classmethod
    def load(cls, directory: str | Path) -> "RiskEngine":
        directory = Path(directory)
        aml = AMLRiskModel.load(directory / "aml_model.joblib")
        return cls(PriceRiskModel.load(directory / "price_model.joblib"), aml, BuyerRiskModel(aml))
