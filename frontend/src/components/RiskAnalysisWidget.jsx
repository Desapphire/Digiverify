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
                return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', icon: ShieldCheck };
            case 'medium':
                return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', icon: AlertTriangle };
            case 'high':
                return { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.25)', icon: ShieldAlert };
            case 'critical':
            default:
                return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', icon: ShieldAlert };
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
            background: 'linear-gradient(135deg, rgba(20,20,30,0.85) 0%, rgba(15,15,22,0.95) 100%)',
            border: `1px solid ${style.border}`,
            borderRadius: '16px',
            padding: '1.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            marginTop: '1rem',
            marginBottom: '1rem'
        }}>
            {/* Header Banner */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: '10px',
                        background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc'
                    }}>
                        <BrainCircuit size={20} />
                    </div>
                    <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f3f4f6', letterSpacing: '-0.01em', margin: 0 }}>
                            AI Fraud & Market Risk Assessment
                        </h4>
                        <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: 0, marginTop: 2 }}>
                            Random Forest Valuation + Isolation Forest AML + Buyer Income Verification
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                        padding: '5px 12px', borderRadius: '9999px',
                        background: style.bg, border: `1px solid ${style.border}`,
                        color: style.color, display: 'flex', alignItems: 'center', gap: 6,
                        fontWeight: 800, fontSize: '0.8rem', letterSpacing: '0.02em', textTransform: 'uppercase'
                    }}>
                        <LevelIcon size={14} />
                        {riskLevel} Risk ({overallScore} / 100)
                    </div>
                    <button onClick={fetchRisk} title="Re-evaluate" style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', padding: '6px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer'
                    }}>
                        <RefreshCcw size={13} />
                    </button>
                </div>
            </div>

            {/* Action Banner */}
            <div style={{
                background: style.bg,
                border: `1px solid ${style.border}`,
                borderRadius: '10px',
                padding: '0.65rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.78rem',
                fontWeight: 600,
                color: style.color
            }}>
                <strong>Recommended Action:</strong> {action}
            </div>

            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
                {/* 1. Price Valuation */}
                {priceRisk && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                AI Fair Valuation
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: priceRisk.score > 50 ? '#ef4444' : '#22c55e' }}>
                                Score: {priceRisk.score}%
                            </span>
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#a78bfa' }}>
                            ₹{Number(priceRisk.fair_price || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                            {priceRisk.deviation !== undefined && (
                                <span style={{ color: Math.abs(priceRisk.deviation) > 0.25 ? '#f97316' : '#22c55e', fontWeight: 600 }}>
                                    {priceRisk.deviation > 0 ? `+${(priceRisk.deviation * 100).toFixed(1)}%` : `${(priceRisk.deviation * 100).toFixed(1)}%`} vs Listed
                                </span>
                            )}
                        </div>
                        {priceRisk.reasons?.[0] && (
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 6, margin: 0, fontStyle: 'italic' }}>
                                {priceRisk.reasons[0]}
                            </p>
                        )}
                    </div>
                )}

                {/* 2. AML Anomaly Detection */}
                {amlRisk && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                AML Pattern Detection
                            </span>
                            <span style={{
                                fontSize: '0.68rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                                background: amlRisk.is_anomaly ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)',
                                color: amlRisk.is_anomaly ? '#ef4444' : '#22c55e'
                            }}>
                                {amlRisk.is_anomaly ? 'ANOMALY DETECTED' : 'CLEAR'}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: amlRisk.score > 50 ? '#ef4444' : '#22c55e' }}>
                            {amlRisk.score}% Risk
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 6, margin: 0 }}>
                            {amlRisk.reasons?.[0] || 'Wallet volume consistent with normal behavior'}
                        </p>
                    </div>
                )}

                {/* 3. Buyer Capacity & Velocity */}
                {buyerRisk && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>
                                Buyer Velocity & Income
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: buyerRisk.score > 50 ? '#ef4444' : '#22c55e' }}>
                                Score: {buyerRisk.score}%
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                            <div>
                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>Mismatch:</span>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f3f4f6' }}>{buyerRisk.income_mismatch_score || 0}%</div>
                            </div>
                            <div>
                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>Frequency:</span>
                                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f3f4f6' }}>{buyerRisk.frequency_score || 0}%</div>
                            </div>
                        </div>
                        {buyerRisk.reasons?.[1] && (
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: 6, margin: 0 }}>
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
