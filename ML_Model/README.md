# Makaan Property Risk Models

This project trains three separate models and combines their results:

- **Price risk:** Random Forest trained on the Makaan CSV. It estimates fair property price from city, BHK, size, and RERA status.
- **AML risk:** Isolation Forest trained on synthetic wallet behavior calibrated to the real CSV price distribution.
- **Buyer risk:** AML risk plus rules for income mismatch and transaction frequency.

The final score is:

```text
AML 35% + Buyer 35% + Price 30%
```

All default paths are resolved relative to the Python scripts, not the shell's current directory and not any developer's computer. A fresh clone only needs the CSV and source files; it creates its own model artifacts locally during training.

## Setup in PowerShell

Open PowerShell in this folder:

```powershell
cd path\to\ML_Model
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PowerShell blocks activation, run the commands through the virtual environment directly:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Train from the CSV

```powershell
python train_models.py
```

This reads `Makaan_Properties_Buy.csv` and creates:

```text
artifacts\price_model.joblib
artifacts\aml_model.joblib
```

To use a CSV in another location:

```powershell
python train_models.py --csv "C:\data\properties.csv" --output "C:\data\trained_models"
```

Retrain after cloning so the generated artifacts match the CSV on that machine.

## Manual scoring

Score a normal transaction:

```powershell
python score_transaction.py --price 7500000 --transaction-value 7500000 --annual-income 3000000
```

Score an overpriced listing:

```powershell
python score_transaction.py --price 15000000 --transaction-value 15000000 --annual-income 3000000
```

Score a suspicious buyer:

```powershell
python score_transaction.py --price 7500000 --transaction-value 7500000 --annual-income 500000 --transactions-90d 15 --avg-transaction-value 7500000 --wallet-age-days 2 --counterparties 80
```

Score an extreme AML transaction:

```powershell
python score_transaction.py --price 7500000 --transaction-value 600000000 --annual-income 100000000 --transactions-90d 1 --avg-transaction-value 6000000 --wallet-age-days 1 --counterparties 1
```

The output contains the overall score, risk level, action, fair price, AML decision, and explainable reasons.

## Test from any directory

Use absolute or relative script paths. The default CSV and model paths still resolve beside the scripts:

```powershell
python D:\path\to\ML_Model\score_transaction.py --price 7500000 --transaction-value 7500000 --annual-income 3000000
```

Training and testing also work from outside the project folder:

```powershell
python D:\path\to\ML_Model\train_models.py
python -m pytest D:\path\to\ML_Model\test_risk_engine.py -q
```

## Validation

Compile the project:

```powershell
python -m py_compile price_risk.py aml_risk.py buyer_risk.py risk_engine.py train_models.py score_transaction.py test_risk_engine.py
```

Run the included checks with pytest:

```powershell
python -m pytest test_risk_engine.py -q
```

Or run them without pytest:

```powershell
python -c "import test_risk_engine; test_risk_engine.test_end_to_end_real_csv(); test_risk_engine.test_buyer_mismatch_increases_risk(); print('focused tests passed')"
```

The supplied dataset currently produces the measured price-model metrics during training. Metrics are printed dynamically and are not hard-coded.