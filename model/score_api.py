from __future__ import annotations

import json
from pathlib import Path
import sys

from risk_engine import RiskEngine

PROJECT_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = PROJECT_DIR / "artifacts"


def _parse_bool(value: object, field: str, default: bool = True) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in {0, 1}:
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "y"}:
            return True
        if normalized in {"false", "0", "no", "n"}:
            return False
    return default


def _parse_number(value: object, field: str, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        number = float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be a number") from exc
    if number < 0:
        raise ValueError(f"{field} cannot be negative")
    return number


def score(payload: dict) -> dict:
    if not ARTIFACTS_DIR.exists():
        return {
            "success": False,
            "error": "Model artifacts not found. Please train models first.",
        }

    engine = RiskEngine.load(ARTIFACTS_DIR)

    # Normalize inputs
    sale_price = _parse_number(
        payload.get("price", payload.get("sale_price", payload.get("salePrice", 5000000))),
        "price",
        5000000.0,
    )
    tx_val = _parse_number(
        payload.get("transaction_value", payload.get("transactionValue", payload.get("sale_price", payload.get("salePrice", sale_price)))),
        "transaction_value",
        sale_price,
    )

    transaction = {
        "city": str(payload.get("city", payload.get("district", payload.get("state", "Ahmedabad")))).strip(),
        "locality": str(payload.get("locality", payload.get("Locality_Name", payload.get("locality_name", payload.get("neighborhood", ""))))).strip(),
        "sub_urban": str(payload.get("sub_urban", payload.get("Sub_urban_name", payload.get("sub_urban_name", "")))).strip(),
        "address_line": str(payload.get("address_line", payload.get("addressLine", payload.get("address", payload.get("survey_details", ""))))).strip(),
        "property_type": str(payload.get("property_type", payload.get("Property_type", payload.get("propertyType", "")))).strip(),
        "bhk": str(payload.get("bhk", payload.get("survey_details", "3 BHK"))),
        "size_sqft": _parse_number(payload.get("size_sqft", payload.get("area_sqft", payload.get("areaSqft", 1500))), "size_sqft", 1500.0),
        "rera": _parse_bool(payload.get("rera", payload.get("is_RERA_registered", True)), "rera", True),
        "ready_to_move": _parse_bool(payload.get("ready_to_move", payload.get("is_ready_to_move", True)), "ready_to_move", True),
        "is_apartment": _parse_bool(payload.get("is_apartment", payload.get("is_Apartment", True)), "is_apartment", True),
        "price": sale_price,
        "transaction_value": tx_val,
        "buyer_annual_income": _parse_number(payload.get("buyer_annual_income", payload.get("annual_income", payload.get("annualIncome", tx_val * 0.4))), "buyer_annual_income", tx_val * 0.4),
        "transactions_90d": _parse_number(payload.get("transactions_90d", payload.get("transactions90d", 1)), "transactions_90d", 1.0),
        "avg_transaction_value": _parse_number(payload.get("avg_transaction_value", payload.get("avgTransactionValue", tx_val)), "avg_transaction_value", tx_val),
        "wallet_age_days": _parse_number(payload.get("wallet_age_days", payload.get("walletAgeDays", 365)), "wallet_age_days", 365.0),
        "counterparty_count": _parse_number(payload.get("counterparty_count", payload.get("counterparties", payload.get("counterpartyCount", 5))), "counterparty_count", 5.0),
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
        except (TypeError, ValueError, json.JSONDecodeError) as e:
            print(json.dumps({"success": False, "error": f"Invalid JSON input: {e}"}))
            sys.exit(1)

    try:
        result = score(payload)
    except (TypeError, ValueError, FileNotFoundError) as e:
        result = {"success": False, "error": str(e)}
    print(json.dumps(result))


if __name__ == "__main__":
    main()
