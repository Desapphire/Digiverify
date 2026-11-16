import React, { useState, useEffect } from 'react';
import { taxService } from '../../services/tax.service';
import {
    Landmark, Plus, CheckCircle2, AlertTriangle, ShieldCheck, RefreshCw,
    ExternalLink, FileText, Receipt, DollarSign, Calculator
} from 'lucide-react';
import '../Dashboard/PropertyPages.css';

const TaxVaultManagement = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [showAssessModal, setShowAssessModal] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [lastTxHash, setLastTxHash] = useState('');

    const [assessForm, setAssessForm] = useState({
        property_id: '',
        financial_year: 20252026,
        base_tax_amount: 50160,
        cess_amount: 2508,
        penalty_amount: 0,
    });

    // Auto-calculation engine states
    const [calcMode, setCalcMode] = useState('area'); // 'area' | 'value'
    const [ratePerSqft, setRatePerSqft] = useState(15); // ₹15/sq.ft default
    const [valueRatePct, setValueRatePct] = useState(0.15); // 0.15% default
    const [cessPct, setCessPct] = useState(5); // 5% default

    const recomputeTax = (propertyId, mode = calcMode, rate = ratePerSqft, valPct = valueRatePct, cessP = cessPct) => {
        const selected = properties.find(p => p.id === propertyId);
        if (!selected) return;

        const area = Number(selected.area_sqft || selected.areaSqft) || 0;
        const val = Number(selected.estimated_fair_price || selected.estimatedFairPrice) || 0;

        let base = 0;
        if (mode === 'area') {
            base = Math.round(area * Number(rate));
        } else {
            base = Math.round(val * (Number(valPct) / 100));
        }

        if (base <= 0) base = 50000;
        const cess = Math.round(base * (Number(cessP) / 100));

        setAssessForm(prev => ({
            ...prev,
            property_id: propertyId,
            base_tax_amount: base,
            cess_amount: cess,
        }));
    };

    const handlePropertyChange = (propertyId) => {
        recomputeTax(propertyId, calcMode, ratePerSqft, valueRatePct, cessPct);
    };

    const handleCalcModeChange = (newMode) => {
        setCalcMode(newMode);
        recomputeTax(assessForm.property_id, newMode, ratePerSqft, valueRatePct, cessPct);
    };

    const handleRatePerSqftChange = (newRate) => {
        setRatePerSqft(newRate);
        recomputeTax(assessForm.property_id, 'area', newRate, valueRatePct, cessPct);
    };

    const handleValueRatePctChange = (newValPct) => {
        setValueRatePct(newValPct);
        recomputeTax(assessForm.property_id, 'value', ratePerSqft, newValPct, cessPct);
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await taxService.getPropertiesWithTaxes();
            setProperties(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load tax ledger:', err);
            setError(err.response?.data?.error || 'Failed to fetch tax records');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleRecordAssessment = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLastTxHash('');

        if (!assessForm.property_id) {
            setError('Please select a property.');
            return;
        }

        try {
            setSubmitting(true);
            const res = await taxService.recordAssessment({
                property_id: assessForm.property_id,
                financial_year: Number(assessForm.financial_year),
                base_tax_amount: Number(assessForm.base_tax_amount),
                cess_amount: Number(assessForm.cess_amount) || 0,
                penalty_amount: Number(assessForm.penalty_amount) || 0,
            });

            setSuccessMsg('Annual property tax assessment recorded on-chain successfully!');
            if (res.data?.data?.txHash) {
                setLastTxHash(res.data.data.txHash);
            }
            setShowAssessModal(false);
            await loadData();
        } catch (err) {
            console.error('Failed to record assessment:', err);
            setError(err.response?.data?.error || err.message || 'Assessment recording failed');
        } finally {
            setSubmitting(false);
        }
    };

    // Aggregate statistics
    let totalAssessments = 0;
    let totalDuesAssessed = 0;
    let totalDuesCollected = 0;
    let totalActiveNocs = 0;

    properties.forEach((p) => {
        if (p.activeNoc) totalActiveNocs++;
        if (p.taxes) {
            totalAssessments += p.taxes.length;
            p.taxes.forEach((t) => {
                totalDuesAssessed += Number(t.total_due) || 0;
                totalDuesCollected += Number(t.paid_amount) || 0;
            });
        }
    });

    return (
        <div className="admin-container" style={{ maxWidth: '1300px', margin: '0 auto', padding: '1.5rem' }}>
            {/* Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563EB' }}>
                            <Landmark size={22} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                Municipal Property Tax Ledger & NOC Vault
                            </h1>
                            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                Municipal Officer Workbench • Smart Contract 7 (<code style={{ fontFamily: 'JetBrains Mono', color: '#2563EB' }}>PropertyTaxVault.sol</code>)
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={loadData}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Ledger
                    </button>
                    <button
                        onClick={() => setShowAssessModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                    >
                        <Plus size={16} /> Record Tax Assessment
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {error && (
                <div style={{ padding: '1rem', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#991B1B', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}

            {successMsg && (
                <div style={{ padding: '1rem', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', color: '#166534', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <CheckCircle2 size={20} />
                        <span style={{ fontWeight: 700 }}>{successMsg}</span>
                    </div>
                    {lastTxHash && (
                        <a
                            href={`https://sepolia.etherscan.io/tx/${lastTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#166534', textDecoration: 'underline', fontSize: '0.85rem' }}
                        >
                            View transaction on Sepolia Etherscan <ExternalLink size={14} />
                        </a>
                    )}
                </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Assessments Recorded</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: '0.25rem' }}>
                        {totalAssessments}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Across all registered parcels</span>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Dues Assessed</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', marginTop: '0.25rem' }}>
                        ₹ {totalDuesAssessed.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Municipal billing ledger</span>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Total Dues Collected</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#166534', marginTop: '0.25rem' }}>
                        ₹ {totalDuesCollected.toLocaleString('en-IN')}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#166534' }}>Settled into treasury</span>
                </div>

                <div style={{ background: '#FFFFFF', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Active 1-Year NOCs</span>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#2563EB', marginTop: '0.25rem' }}>
                        {totalActiveNocs}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Issued on blockchain</span>
                </div>
            </div>

            {/* Ledger Table */}
            <div style={{ background: '#FFFFFF', borderRadius: '12px', border: '1px solid #E2E8F0', padding: '1.5rem' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '1rem' }}>
                    Municipal Assessment & Tax Clearance Ledger
                </h2>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                        <thead>
                            <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#475569' }}>
                                <th style={{ padding: '0.6rem 0.75rem' }}>Property</th>
                                <th style={{ padding: '0.6rem 0.75rem' }}>Owner Wallet</th>
                                <th style={{ padding: '0.6rem 0.75rem' }}>Financial Year</th>
                                <th style={{ padding: '0.6rem 0.75rem' }}>Base + Cess + Penalty</th>
                                <th style={{ padding: '0.6rem 0.75rem' }}>Total Due</th>
                                <th style={{ padding: '0.6rem 0.75rem' }}>Status</th>
                                <th style={{ padding: '0.6rem 0.75rem' }}>NOC Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {properties.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                                        No property tax records found.
                                    </td>
                                </tr>
                            ) : (
                                properties.flatMap((p) =>
                                    (p.taxes && p.taxes.length > 0
                                        ? p.taxes
                                        : [{ id: `mock-${p.id}`, is_empty: true }]
                                    ).map((tax) => {
                                        if (tax.is_empty) {
                                            return (
                                                <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#0F172A' }}>
                                                        {p.propertyCode || p.property_code} (Survey #{p.surveyNumber || p.survey_number})
                                                    </td>
                                                    <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                                                        {p.ownerWallet || p.owner_wallet}
                                                    </td>
                                                    <td colSpan="5" style={{ padding: '0.6rem 0.75rem', color: '#94A3B8' }}>
                                                        No assessment recorded yet.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        const fyString = `FY ${String(tax.financial_year).slice(0, 4)}-${String(tax.financial_year).slice(6)}`;
                                        return (
                                            <tr key={tax.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: '#0F172A' }}>
                                                    <div>{p.propertyCode || p.property_code}</div>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Survey #{p.surveyNumber || p.survey_number}</span>
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>
                                                    {p.ownerWallet || p.owner_wallet}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>
                                                    {fyString}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                                    ₹{Number(tax.base_tax_amount).toLocaleString()} + ₹{Number(tax.cess_amount || 0).toLocaleString()} + ₹{Number(tax.penalty_amount || 0).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 800, color: '#0F172A' }}>
                                                    ₹{Number(tax.total_due).toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                                    {tax.is_cleared ? (
                                                        <span style={{ background: '#F0FDF4', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            Cleared
                                                        </span>
                                                    ) : (
                                                        <span style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                                            Due
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem' }}>
                                                    {p.activeNoc ? (
                                                        <span style={{ color: '#166534', fontWeight: 700, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <ShieldCheck size={14} /> Valid NOC
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>None</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Record Assessment Modal */}
            {showAssessModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        padding: '1rem',
                    }}
                    onClick={() => setShowAssessModal(false)}
                >
                    <div
                        style={{
                            background: '#FFFFFF',
                            borderRadius: '14px',
                            maxWidth: '550px',
                            width: '100%',
                            padding: '2rem',
                            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '1.25rem' }}>
                            Record Annual Property Tax Assessment
                        </h2>

                        <form onSubmit={handleRecordAssessment}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                    Select Land Parcel *
                                </label>
                                <select
                                    value={assessForm.property_id}
                                    onChange={(e) => handlePropertyChange(e.target.value)}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', background: '#FFFFFF' }}
                                    required
                                >
                                    <option value="">-- Choose Property --</option>
                                    {properties.map((p) => {
                                        const code = p.propertyCode || p.property_code || 'Parcel';
                                        const survey = p.surveyNumber || p.survey_number || 'N/A';
                                        const owner = p.ownerWallet || p.owner_wallet;
                                        return (
                                            <option key={p.id} value={p.id}>
                                                {code} - Survey #{survey} (Owner: {owner?.slice(0, 10)}...)
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {/* Cadastral & Valuation Details Card */}
                            {(() => {
                                const selectedProp = properties.find(p => p.id === assessForm.property_id);
                                if (!selectedProp) return null;
                                const area = Number(selectedProp.area_sqft || selectedProp.areaSqft || 0);
                                const val = Number(selectedProp.estimated_fair_price || selectedProp.estimatedFairPrice || 0);

                                return (
                                    <>
                                        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                                            <div>
                                                <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Cadastral Area</span>
                                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>
                                                    {area.toLocaleString('en-IN')} sq.ft
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Fair Market Value</span>
                                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>
                                                    ₹{val > 0 ? val.toLocaleString('en-IN') : '25,00,000'}
                                                </div>
                                            </div>
                                            <div>
                                                <span style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 800, textTransform: 'uppercase' }}>Municipal Zone</span>
                                                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.9rem' }}>
                                                    {selectedProp.district || 'Nashik'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Automated Tax Calculation Engine */}
                                        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                    <Calculator size={14} color="#2563EB" /> Auto-Calculate on Property Area & Value
                                                </span>
                                                <div style={{ display: 'flex', background: '#E2E8F0', borderRadius: '6px', padding: '2px' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCalcModeChange('area')}
                                                        style={{
                                                            padding: '0.2rem 0.55rem',
                                                            borderRadius: '4px',
                                                            border: 'none',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            background: calcMode === 'area' ? '#2563EB' : 'transparent',
                                                            color: calcMode === 'area' ? '#FFFFFF' : '#475569',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        By Area (sq.ft)
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCalcModeChange('value')}
                                                        style={{
                                                            padding: '0.2rem 0.55rem',
                                                            borderRadius: '4px',
                                                            border: 'none',
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            background: calcMode === 'value' ? '#2563EB' : 'transparent',
                                                            color: calcMode === 'value' ? '#FFFFFF' : '#475569',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        By Fair Value (%)
                                                    </button>
                                                </div>
                                            </div>

                                            {calcMode === 'area' ? (
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
                                                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>
                                                            Unit Area Rate: <strong style={{ color: '#2563EB' }}>₹{ratePerSqft} / sq.ft</strong>
                                                        </label>
                                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                            {[10, 15, 20, 25].map(r => (
                                                                <button
                                                                    key={r}
                                                                    type="button"
                                                                    onClick={() => handleRatePerSqftChange(r)}
                                                                    style={{
                                                                        padding: '0.15rem 0.45rem',
                                                                        fontSize: '0.7rem',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #CBD5E1',
                                                                        background: ratePerSqft === r ? '#EFF6FF' : '#FFFFFF',
                                                                        color: ratePerSqft === r ? '#2563EB' : '#334155',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    ₹{r}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="5"
                                                        max="40"
                                                        step="1"
                                                        value={ratePerSqft}
                                                        onChange={(e) => handleRatePerSqftChange(Number(e.target.value))}
                                                        style={{ width: '100%', accentColor: '#2563EB' }}
                                                    />
                                                </div>
                                            ) : (
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.35rem' }}>
                                                        <label style={{ fontSize: '0.76rem', fontWeight: 700, color: '#475569' }}>
                                                            Valuation Rate: <strong style={{ color: '#2563EB' }}>{valueRatePct}% of Fair Value</strong>
                                                        </label>
                                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                                            {[0.10, 0.15, 0.20, 0.25].map(v => (
                                                                <button
                                                                    key={v}
                                                                    type="button"
                                                                    onClick={() => handleValueRatePctChange(v)}
                                                                    style={{
                                                                        padding: '0.15rem 0.45rem',
                                                                        fontSize: '0.7rem',
                                                                        borderRadius: '4px',
                                                                        border: '1px solid #CBD5E1',
                                                                        background: valueRatePct === v ? '#EFF6FF' : '#FFFFFF',
                                                                        color: valueRatePct === v ? '#2563EB' : '#334155',
                                                                        fontWeight: 700,
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {v}%
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="0.05"
                                                        max="0.40"
                                                        step="0.01"
                                                        value={valueRatePct}
                                                        onChange={(e) => handleValueRatePctChange(Number(e.target.value))}
                                                        style={{ width: '100%', accentColor: '#2563EB' }}
                                                    />
                                                </div>
                                            )}

                                            <div style={{ marginTop: '0.65rem', fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#FFFFFF', padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                                                <Receipt size={13} color="#2563EB" />
                                                <span>
                                                    {calcMode === 'area'
                                                        ? `Formula: ${area.toLocaleString('en-IN')} sq.ft × ₹${ratePerSqft} = ₹${Number(assessForm.base_tax_amount).toLocaleString('en-IN')} Base Tax + ${cessPct}% Cess (₹${Number(assessForm.cess_amount).toLocaleString('en-IN')})`
                                                        : `Formula: ₹${val.toLocaleString('en-IN')} × ${valueRatePct}% = ₹${Number(assessForm.base_tax_amount).toLocaleString('en-IN')} Base Tax + ${cessPct}% Cess (₹${Number(assessForm.cess_amount).toLocaleString('en-IN')})`
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                        Financial Year (e.g. 20252026) *
                                    </label>
                                    <input
                                        type="number"
                                        value={assessForm.financial_year}
                                        onChange={(e) => setAssessForm({ ...assessForm, financial_year: e.target.value })}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                        Base Tax Amount (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={assessForm.base_tax_amount}
                                        onChange={(e) => {
                                            const newBase = Number(e.target.value) || 0;
                                            setAssessForm({
                                                ...assessForm,
                                                base_tax_amount: e.target.value,
                                                cess_amount: Math.round(newBase * (cessPct / 100))
                                            });
                                        }}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 700 }}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                        Municipal Cess (₹) <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600 }}>({cessPct}%)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={assessForm.cess_amount}
                                        onChange={(e) => setAssessForm({ ...assessForm, cess_amount: e.target.value })}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                        Late Penalty Arrears (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={assessForm.penalty_amount}
                                        onChange={(e) => setAssessForm({ ...assessForm, penalty_amount: e.target.value })}
                                        style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                                    />
                                </div>
                            </div>

                            {/* Total Due preview */}
                            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 700, color: '#475569' }}>Total Assessed Amount:</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0F172A' }}>
                                    ₹{(Number(assessForm.base_tax_amount) + Number(assessForm.cess_amount || 0) + Number(assessForm.penalty_amount || 0)).toLocaleString('en-IN')}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAssessModal(false)}
                                    style={{ padding: '0.65rem 1.25rem', background: '#F1F5F9', border: 'none', borderRadius: '8px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{ padding: '0.65rem 1.5rem', background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}
                                >
                                    {submitting ? 'Recording On-Chain...' : 'Record On-Chain'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxVaultManagement;
