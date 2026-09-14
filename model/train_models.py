from __future__ import annotations

import argparse
from pathlib import Path

from risk_engine import RiskEngine


PROJECT_DIR = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description="Train the Makaan risk models")
parser.add_argument("--csv", type=Path, default=PROJECT_DIR / "Makaan_Properties_Buy.csv")
parser.add_argument("--output", type=Path, default=PROJECT_DIR / "artifacts")
parser.add_argument("--random-state", type=int, default=42)
args = parser.parse_args()

engine = RiskEngine.train(args.csv, random_state=args.random_state)
engine.save(args.output)
print(f"Saved models to {args.output}")
print(f"Price model R2: {engine.price_model.metrics['r2']:.3f}")
print(f"Price model MAPE: {engine.price_model.metrics['mape']:.1%}")
print(f"AML calibration median: Rs {engine.aml_model.reference['price_median']:,.0f}")
