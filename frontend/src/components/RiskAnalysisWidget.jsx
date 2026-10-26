import React, { useState, useEffect } from 'react';
import { riskService } from '../services/risk.service';
import {
    ShieldCheck, ShieldAlert, AlertTriangle, TrendingUp,
    TrendingDown, CheckCircle2, XCircle, BrainCircuit,
    Loader2, RefreshCcw, DollarSign, Wallet, Activity
} from 'lucide-react';

const RiskAnalysisWidget = ({ saleId, propertyId, initialData = null, compact = false }) => {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(!initialData && (!!saleId || !!propertyId));
    const [error, setError] = useState('');

    const fetchRisk = async () => {
        if (!saleId && !propertyId) return;
        setLoading(true);
        setError('');
        try {
            if (saleId) {
                const res = await riskService.getSaleRisk(saleId);
                setData(res.data?.riskReport || res.data);
            } else if (propertyId) {
                const res = await riskService.getPropertyValuation(propertyId);
                setData(res.data?.fullRiskAnalysis || res.data?.priceRisk || res.data);
            }
        } catch (err) {
            console.error('Failed to load risk analysis:', err);
            setError(err.response?.data?.message || 'Could not load AI risk score');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!initialData && (saleId || propertyId)) {
            fetchRisk();
        } else if (initialData) {
            setData(initialData);
        }
    }, [saleId, propertyId, initialData]);

    if (loading) {
        return (
            <div className="glass-panel p-4 flex items-center justify-center gap-3 text-muted" style={{ minHeight: compact ? 60 : 120 }}>
                <Loader2 size={18} className="animate-spin text-purple-400" />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Calculating AI Risk & Valuation...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="glass-panel p-4 flex items-center justify-between gap-3 text-red-400" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
                <div className="flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span style={{ fontSize: '0.8rem' }}>{error}</span>
                </div>
                <button onClick={fetchRisk} className="btn btn-secondary text-xs p-1 px-2 flex items-center gap-1">
                    <RefreshCcw size={12} /> Retry
                </button>
            </div>
        );
    }

    if (!data) return null;

    const report = data.riskReport || data;
    const overallScore = report.overall_score ?? (report.score ?? 0);
    const riskLevel = report.risk_level || (overallScore >= 80 ? 'Critical' : overallScore >= 60 ? 'High' : overallScore >= 35 ? 'Medium' : 'Low');
    const action = report.action || 'Standard transaction review';

    const priceRisk = report.price_risk || (report.fair_price !== undefined ? report : null);
    const amlRisk = report.aml_risk;
    const buyerRisk = report.buyer_risk;

    const getLevelStyle = (level) => {
        switch ((level || '').toLowerCase()) {
            case 'low':
                return { color: '#047857', bg: '#ECFDF5', border: '#A7F3D0', icon: ShieldCheck };
            case 'medium':
                return { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A', icon: AlertTriangle };
            case 'high':
                return { color: '#C2410C', bg: '#FFF7ED', border: '#FED7AA', icon: ShieldAlert };
            case 'critical':
            default:
                return { color: '#B91C1C', bg: '#FEF2F2', border: '#FECACA', icon: ShieldAlert };
        }
    };

    const style = getLevelStyle(riskLevel);
    const LevelIcon = style.icon;

    if (compact) {
        return (
            <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: '8px',
                background: style.bg, border: `1px solid ${style.border}`,
                color: style.color, fontSize: '0.75rem', fontWeight: 700
            }}>
                <BrainCircuit size={13} />
                <span>AI Risk: {riskLevel} ({overallScore}%)</span>
            </div>
        );
    }

    return (
        <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '1.4rem 1.5rem',
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
            marginTop: '1.25rem',
            marginBottom: '1.25rem'
        }}>
            {/* Header Banner */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #F1F5F9',
                paddingBottom: '0.9rem',
                marginBottom: '1rem',
                flexWrap: 'wrap',
                gap: '0.75rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 38, height: 38, borderRadius: '10px',
                        background: '#EFF6FF', border: '1px solid #BFDBFE',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8'
                    }}>
                        <BrainCircuit size={20} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', margin: 0 }}>
                            AI Fraud &amp; Market Risk Assessment
                        </h4>
                        <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0, marginTop: 2 }}>
                            Random Forest Valuation + Isolation Forest AML + Buyer Income Verification
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        padding: '4px 12px', borderRadius: '9999px',
                        background: style.bg, border: `1px solid ${style.border}`,
                        color: style.color, display: 'flex', alignItems: 'center', gap: 6,
                        fontWeight: 800, fontSize: '0.75rem', letterSpacing: '0.02em', textTransform: 'uppercase'
                    }}>
                        <LevelIcon size={14} />
                        {riskLevel} Risk ({overallScore} / 100)
                    </div>
                    <button
                        onClick={fetchRisk}
                        title="Re-evaluate"
                        style={{
                            background: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            padding: '6px 8px',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <RefreshCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Action Banner */}
            <div style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: style.color
            }}>
                <strong>Recommended Action:</strong> {action}
            </div>

            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                {/* 1. Price Valuation */}
                {priceRisk && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
                                AI Fair Valuation
                            </span>
                            <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: priceRisk.score > 50 ? '#FEE2E2' : '#DCFCE7',
                                color: priceRisk.score > 50 ? '#B91C1C' : '#15803D',
                                border: `1px solid ${priceRisk.score > 50 ? '#FECACA' : '#86EFAC'}`
                            }}>
                                Score: {priceRisk.score}%
                            </span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em', margin: '4px 0' }}>
                            ₹{Number(priceRisk.fair_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                            {priceRisk.deviation !== undefined && (
                                <span style={{ color: Math.abs(priceRisk.deviation) > 0.25 ? '#C2410C' : '#15803D', fontWeight: 700 }}>
                                    {priceRisk.deviation > 0 ? `+${(priceRisk.deviation * 100).toFixed(1)}%` : `${(priceRisk.deviation * 100).toFixed(1)}%`} vs Listed
                                </span>
                            )}
                        </div>
                        {priceRisk.reasons?.[0] && (
                            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6, margin: 0, lineHeight: 1.4 }}>
                                {priceRisk.reasons[0]}
                            </p>
                        )}
                    </div>
                )}

                {/* 2. AML Anomaly Detection */}
                {amlRisk && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
                                AML Pattern Detection
                            </span>
                            <span style={{
                                fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                                background: amlRisk.is_anomaly ? '#FEE2E2' : '#DCFCE7',
                                color: amlRisk.is_anomaly ? '#B91C1C' : '#15803D',
                                border: `1px solid ${amlRisk.is_anomaly ? '#FECACA' : '#86EFAC'}`
                            }}>
                                {amlRisk.is_anomaly ? 'ANOMALY DETECTED' : 'CLEAR'}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: amlRisk.score > 50 ? '#B91C1C' : '#15803D', margin: '4px 0' }}>
                            {amlRisk.score}% Risk
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6, margin: 0, lineHeight: 1.4 }}>
                            {amlRisk.reasons?.[0] || 'Wallet volume consistent with normal behavior'}
                        </p>
                    </div>
                )}

                {/* 3. Buyer Capacity & Velocity */}
                {buyerRisk && (
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
                                Buyer Velocity &amp; Income
                            </span>
                            <span style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: buyerRisk.score > 50 ? '#FEE2E2' : '#DCFCE7',
                                color: buyerRisk.score > 50 ? '#B91C1C' : '#15803D',
                                border: `1px solid ${buyerRisk.score > 50 ? '#FECACA' : '#86EFAC'}`
                            }}>
                                Score: {buyerRisk.score}%
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, margin: '8px 0' }}>
                            <div>
                                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Mismatch:</span>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{buyerRisk.income_mismatch_score || 0}%</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Frequency:</span>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>{buyerRisk.frequency_score || 0}%</div>
                            </div>
                        </div>
                        {buyerRisk.reasons?.[1] && (
                            <p style={{ fontSize: '0.75rem', color: '#475569', marginTop: 6, margin: 0, lineHeight: 1.4 }}>
                                {buyerRisk.reasons[1]}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RiskAnalysisWidget;
