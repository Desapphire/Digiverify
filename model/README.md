# Digiverify Property & AML Risk Models

This package provides the Machine Learning risk assessment and property valuation engine for **Digiverify**.

It trains and combines three risk assessment models:

1. **Price Risk Model (Refined Dual-Pipeline)**:
   - **Hierarchical Locality Pipeline**: Uses empirical Bayes shrinkage priors across City, Sub-urban, and Locality clusters with `HistGradientBoostingRegressor` to predict unit square-foot rates and fair property values.
   - **City-Level Baseline Pipeline**: Automatically activates when specific locality information is not available, evaluating the property based on city tier, BHK, size, RERA status, and dwelling type.
   - Replaced bloated Random Forest (307 MB) with optimized gradient boosting (3.8 MB), reducing inference latency from ~3s to <50ms.
2. **AML Risk Model**:
   - `IsolationForest` calibrated to real Indian real estate transaction distributions, detecting multi-dimensional wallet anomalies (anomalous transaction amounts, wallet velocity, burner wallet age, counterparty dispersion).
3. **Buyer Affordability & Mismatch Model**:
   - Evaluates debt/income strain, transaction-to-income mismatch ratios, and short-term transaction velocity.

The overall risk score is calculated as:

```text
Overall Risk Score = (0.35 × AML Risk) + (0.35 × Buyer Risk) + (0.30 × Price Risk)
```

---

## Performance Metrics

| Metric | Previous Baseline | Refined Model |
| :--- | :--- | :--- |
| **Price Model $R^2$** | `0.632` | **`0.893`** |
| **Price Model MAPE** | `41.2%` | **`22.3%`** |
| **Mean Absolute Error (MAE)** | `Rs 6,096,794` | **`Rs 3,118,040`** (cut in half) |
| **Predictions Within 20%** | `40.7%` | **`64.4%`** |
| **Artifact File Size** | `307 MB` | **`3.8 MB`** (98.8% reduction) |
| **Inference Startup Latency** | `~3.2s` | **`<0.1s`** |

---

## Setup & Installation

From this directory:

```bash
# Activate your Python virtual environment
source ../.venv/bin/activate    # On macOS / Linux
# or .\.venv\Scripts\Activate.ps1 on Windows

# Install requirements
pip install -r requirements.txt
```

---

## Training Models

To train the models from the dataset:

```bash
python train_models.py
```

This reads `Makaan_Properties_Buy.csv` and produces:
- `artifacts/price_model.joblib`
- `artifacts/aml_model.joblib`

---

## Manual CLI Scoring

### 1. Normal Compliant Property
```bash
python score_transaction.py --city Ahmedabad --locality Bopal --bhk "3 BHK" --size 1750 --price 7500000 --transaction-value 7500000 --annual-income 3000000
```
*Expected Result*: Low risk, fair price estimated close to ~Rs 80 Lakhs, deviation ~6%.

### 2. Overpriced Property (Inflated Valuation)
```bash
python score_transaction.py --city Ahmedabad --price 25000000 --transaction-value 25000000 --annual-income 3000000 --size 1750
```
*Expected Result*: High price deviation (+213%), flagged for review.

### 3. Underpriced Property (Potential Stamp Duty Undervaluation)
```bash
python score_transaction.py --city Ahmedabad --price 2500000 --transaction-value 2500000 --annual-income 1200000 --size 1750
```
*Expected Result*: Flagged as 69% below fair market value (tax/duty avoidance alert).

### 4. High-End Luxury Property (Ambli, Ahmedabad)
```bash
python score_transaction.py --city Ahmedabad --locality Ambli --bhk "4 BHK" --size 3384 --price 23688000 --transaction-value 23688000 --annual-income 8000000
```
*Expected Result*: Fair price estimated ~Rs 2.45 Crore (within 3% of actual).

### 5. Suspicious Buyer / AML Anomaly
```bash
python score_transaction.py --city Mumbai --price 50000000 --transaction-value 50000000 --annual-income 500000 --transactions-90d 18 --wallet-age-days 3 --counterparties 45
```
*Expected Result*: High/Critical risk, flagged for wallet age, frequency, and 100x income mismatch.

---

## Backend Integration (`score_api.py`)

The Express / Node.js backend invokes `score_api.py` via `stdin` or command-line JSON argument:

```bash
echo '{"city":"Ahmedabad","locality":"Bopal","bhk":"3 BHK","size_sqft":1750,"price":7500000,"transaction_value":7500000,"buyer_annual_income":3000000}' | python score_api.py
```

Response JSON format:
```json
{
  "success": true,
  "data": {
    "overall_score": 1.86,
    "risk_level": "Low",
    "action": "Allow with standard monitoring",
    "weights": { "aml": 0.35, "buyer": 0.35, "price": 0.3 },
    "price_risk": {
      "score": 6.19,
      "fair_price": 7994728.71,
      "price": 7500000.0,
      "deviation": -0.0619,
      "reasons": ["Listing price is broadly consistent with comparable properties (within 6% of fair value Rs 7,994,729)"]
    },
    "aml_risk": {
      "score": 0.0,
      "is_anomaly": false,
      "decision": 0.22027,
      "reasons": ["Wallet behavior is within the calibrated transaction profile"]
    },
    "buyer_risk": {
      "score": 0.0,
      "reasons": ["Buyer profile and income metrics are consistent with transaction"],
      "income_mismatch_score": 0.0,
      "frequency_score": 0.0
    }
  }
}
```

---

## Running Automated Tests

```bash
python -m pytest test_risk_engine.py -v
```