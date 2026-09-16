from __future__ import annotations

import json
from pathlib import Path
import sys

from risk_engine import RiskEngine

PROJECT_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = PROJECT_DIR / "artifacts"


def score(payload: dict) -> dict:
    if not ARTIFACTS_DIR.exists():
        return {
            "success": False,
            "error": "Model artifacts not found. Please train models first.",
        }

    engine = RiskEngine.load(ARTIFACTS_DIR)

    # Normalize inputs
    transaction = {
        "city": str(payload.get("city", payload.get("district", "Ahmedabad"))),
        "bhk": str(payload.get("bhk", "3 BHK")),
        "size_sqft": float(payload.get("size_sqft", payload.get("area_sqft", payload.get("areaSqft", 1500)))),
        "rera": bool(payload.get("rera", payload.get("is_RERA_registered", True))),
        "price": float(payload.get("price", payload.get("sale_price", payload.get("salePrice", 5000000)))),
        "transaction_value": float(payload.get("transaction_value", payload.get("transactionValue", payload.get("sale_price", payload.get("salePrice", 5000000))))),
        "buyer_annual_income": float(payload.get("buyer_annual_income", payload.get("annual_income", payload.get("annualIncome", 2500000)))),
        "transactions_90d": float(payload.get("transactions_90d", payload.get("transactions90d", 1))),
        "avg_transaction_value": float(payload.get("avg_transaction_value", payload.get("avgTransactionValue", 5000000))),
        "wallet_age_days": float(payload.get("wallet_age_days", payload.get("walletAgeDays", 365))),
        "counterparty_count": float(payload.get("counterparty_count", payload.get("counterparties", payload.get("counterpartyCount", 5)))),
    }

    result = engine.score(transaction)
    return {
        "success": True,
        "data": result,
    }


def main():
    if len(sys.argv) > 1:
        raw_input = sys.argv[1]
    else:
        raw_input = sys.stdin.read().strip()

    if not raw_input:
        payload = {}
    else:
        try:
            payload = json.loads(raw_input)
        except Exception as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON input: {e}"}))
            sys.exit(1)

    result = score(payload)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
