from __future__ import annotations

import argparse
import json
from pathlib import Path

from risk_engine import RiskEngine


PROJECT_DIR = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description="Score one property transaction")
parser.add_argument("--models", type=Path, default=PROJECT_DIR / "artifacts")
parser.add_argument("--city", default="Ahmedabad")
parser.add_argument("--bhk", default="3 BHK")
parser.add_argument("--size", type=float, default=1750)
parser.add_argument("--rera", action=argparse.BooleanOptionalAction, default=True)
parser.add_argument("--price", type=float, required=True, help="Listed property price in rupees")
parser.add_argument("--transaction-value", type=float, required=True)
parser.add_argument("--annual-income", type=float, required=True)
parser.add_argument("--transactions-90d", type=float, default=1)
parser.add_argument("--avg-transaction-value", type=float, default=6000000)
parser.add_argument("--wallet-age-days", type=float, default=1200)
parser.add_argument("--counterparties", type=float, default=8)
args = parser.parse_args()

engine = RiskEngine.load(args.models)
result = engine.score({
    "city": args.city,
    "bhk": args.bhk,
    "size_sqft": args.size,
    "rera": args.rera,
    "price": args.price,
    "transaction_value": args.transaction_value,
    "buyer_annual_income": args.annual_income,
    "transactions_90d": args.transactions_90d,
    "avg_transaction_value": args.avg_transaction_value,
    "wallet_age_days": args.wallet_age_days,
    "counterparty_count": args.counterparties,
})
print(json.dumps(result, indent=2))
