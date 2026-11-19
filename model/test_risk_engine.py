from pathlib import Path

import pytest

from risk_engine import RiskEngine


CSV = Path(__file__).with_name("Makaan_Properties_Buy.csv")


def _dataset_available() -> bool:
    if not CSV.exists():
        return False
    prefix = CSV.read_text(encoding="utf-8", errors="ignore")[:200]
    return "git-lfs.github.com/spec" not in prefix


def test_end_to_end_real_csv():
    if not _dataset_available():
        pytest.skip("Makaan dataset is unavailable; run `git lfs pull` first")
    engine = RiskEngine.train(CSV, random_state=7)
    result = engine.score({
        "city": "Ahmedabad",
        "locality": "Bopal",
        "bhk": "3 BHK",
        "size_sqft": "1,750 sq ft",
        "rera": True,
        "price": "75,00,000",
        "transaction_value": 7500000,
        "buyer_annual_income": 3000000,
        "transactions_90d": 1,
        "avg_transaction_value": 6000000,
        "wallet_age_days": 1200,
        "counterparty_count": 8,
    })
    assert 0 <= result["overall_score"] <= 100
    assert result["risk_level"] in {"Low", "Medium", "High", "Critical"}
    assert abs(sum(result["weights"].values()) - 1.0) < 1e-9
    # Fair price for 1,750 sq ft 3 BHK in Ahmedabad should be realistic (Rs 50 Lakh to Rs 1.2 Crore)
    fair_price = result["price_risk"]["fair_price"]
    assert 5000000 <= fair_price <= 12000000
    assert result["price_risk"]["score"] < 25.0
    assert result["risk_level"] == "Low"


def test_buyer_mismatch_increases_risk():
    if not _dataset_available():
        pytest.skip("Makaan dataset is unavailable; run `git lfs pull` first")
    engine = RiskEngine.train(CSV, random_state=7)
    base = {
        "city": "Ahmedabad", "price": 6000000,
        "transaction_value": 6000000, "buyer_annual_income": 3000000,
        "transactions_90d": 1, "avg_transaction_value": 6000000,
        "wallet_age_days": 1200, "counterparty_count": 8,
    }
    stressed = {**base, "buyer_annual_income": 400000, "transactions_90d": 15}
    assert engine.score(stressed)["buyer_risk"]["score"] > engine.score(base)["buyer_risk"]["score"]


def test_overpriced_property_flags_price_risk():
    if not _dataset_available():
        pytest.skip("Makaan dataset is unavailable; run `git lfs pull` first")
    engine = RiskEngine.train(CSV, random_state=7)
    normal = {
        "city": "Ahmedabad", "bhk": "3 BHK", "size_sqft": 1750, "price": 7500000,
        "transaction_value": 7500000, "buyer_annual_income": 3000000,
    }
    overpriced = {**normal, "price": 30000000, "transaction_value": 30000000}
    res_normal = engine.score(normal)
    res_overpriced = engine.score(overpriced)
    assert res_overpriced["price_risk"]["score"] > res_normal["price_risk"]["score"]
    assert res_overpriced["overall_score"] > res_normal["overall_score"]
    assert any("above" in r.lower() for r in res_overpriced["price_risk"]["reasons"])


def test_extreme_aml_anomaly_triggers_alert():
    if not _dataset_available():
        pytest.skip("Makaan dataset is unavailable; run `git lfs pull` first")
    engine = RiskEngine.train(CSV, random_state=7)
    suspicious = {
        "city": "Mumbai", "price": 500000000, "transaction_value": 500000000,
        "buyer_annual_income": 50000000, "transactions_90d": 25,
        "avg_transaction_value": 2000000, "wallet_age_days": 2, "counterparty_count": 90,
    }
    res = engine.score(suspicious)
    assert res["aml_risk"]["score"] > 60
    assert res["risk_level"] in {"High", "Critical"}
