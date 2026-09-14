from pathlib import Path

from risk_engine import RiskEngine


CSV = Path(__file__).with_name("Makaan_Properties_Buy.csv")


def test_end_to_end_real_csv():
    engine = RiskEngine.train(CSV, random_state=7)
    result = engine.score({
        "city": "Ahmedabad", "bhk": "3 BHK", "size_sqft": "1,750 sq ft", "rera": True,
        "price": "75,00,000", "transaction_value": 7500000, "buyer_annual_income": 3000000,
        "transactions_90d": 1, "avg_transaction_value": 6000000, "wallet_age_days": 1200, "counterparty_count": 8,
    })
    assert 0 <= result["overall_score"] <= 100
    assert result["risk_level"] in {"Low", "Medium", "High", "Critical"}
    assert abs(sum(result["weights"].values()) - 1) < 1e-9
    assert result["price_risk"]["fair_price"] > 0


def test_buyer_mismatch_increases_risk():
    engine = RiskEngine.train(CSV, random_state=7)
    base = {"transaction_value": 6000000, "buyer_annual_income": 3000000, "transactions_90d": 1, "avg_transaction_value": 6000000, "wallet_age_days": 1200, "counterparty_count": 8}
    stressed = {**base, "buyer_annual_income": 500000, "transactions_90d": 15}
    assert engine.score(stressed)["buyer_risk"]["score"] > engine.score(base)["buyer_risk"]["score"]
