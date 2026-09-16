import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recoveryService } from '../../services/recovery.service';
import { useAuth } from '../../context/AuthContext';
import {
    ShieldAlert, Key, Unlock, FileText, CheckCircle2,
    XCircle, Clock, AlertTriangle, Send, Loader2, Activity,
    ShieldCheck, ArrowLeft
} from 'lucide-react';
import './PropertyPages.css';

const WalletRecovery = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [recoveries, setRecoveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form state
    const [oldWallet, setOldWallet] = useState('');
    const [reason, setReason] = useState('');

    const fetchRecoveries = async () => {
        try {
            setLoading(true);
            const res = await recoveryService.getMyRecoveries();
            setRecoveries(res.data?.data || []);
        } catch (err) {
            console.error('Failed to load recoveries', err);
            setError('Could not load recovery requests.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchRecoveries();
        }
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!oldWallet.startsWith('0x') || oldWallet.length !== 42) {
            setError('Wallet address must be a valid 42-character address starting with 0x.');
            return;
        }

        if (reason.length < 10) {
            setError('Please provide a brief explanation (minimum 10 characters).');
            return;
        }

        try {
            setSubmitting(true);
            await recoveryService.requestRecovery({ oldWallet: oldWallet.trim(), reason: reason.trim() });
            setSuccessMsg('Wallet recovery request submitted. The authority will review your request.');
            setOldWallet('');
            setReason('');
            fetchRecoveries();
        } catch (err) {
            console.error('Recovery request failed', err);
            setError(err.response?.data?.message || err.message || 'Failed to submit recovery request.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDate = (isoStr) => {
        if (!isoStr) return '';
        return new Date(isoStr).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const pendingRequest = recoveries.find(r => ['requested', 'identity_verified'].includes(r.status));

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={36} style={{ color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading Recovery Requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-md">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <button className="back-button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Return to Dashboard
                    </button>
                    <h1 className="page-title">Recover Account & Wallet</h1>
                    <p className="page-subtitle">
                        Request assistance if you lost access to your connected wallet.
                    </p>
                </div>
                <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF', '--badge-border': '#BFDBFE' }}>
                    <ShieldCheck size={14} /> Security Assistance
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }}>
                {/* Left Column - Request Form */}
                <div className="gov-card">
                    <div className="gov-card-header">
                        <h3 className="gov-card-title">
                            <Unlock size={20} /> Request Wallet Recovery
                        </h3>
                    </div>

                    <div style={{
                        background: '#FFFBEB',
                        border: '1px solid #FDE68A',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        gap: '0.75rem'
                    }}>
                        <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400E', margin: '0 0 0.25rem' }}>Important Notice</p>
                            <p style={{ color: '#92400E', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>
                                Submitting a recovery request will place associated properties on temporary hold while the authority verifies your identity.
                            </p>
                        </div>
                    </div>

                    {pendingRequest ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                            <Activity size={36} style={{ color: '#1E40AF', margin: '0 auto 1rem' }} />
                            <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Recovery Request Under Review</h4>
                            <p style={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                                You have an active recovery request being processed by the authority. You will be notified once reviewed.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {error && (
                                <div className="alert-message error">
                                    <XCircle size={16} /> {error}
                                </div>
                            )}

                            {successMsg && (
                                <div className="alert-message success">
                                    <CheckCircle2 size={16} /> {successMsg}
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Lost / Old Wallet Address (0x...) *</label>
                                <input
                                    type="text"
                                    className="gov-input mono"
                                    placeholder="0x..."
                                    value={oldWallet}
                                    onChange={(e) => setOldWallet(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Reason & Details *</label>
                                <textarea
                                    className="gov-input"
                                    rows="4"
                                    placeholder="Explain what happened (e.g. lost device, lost private key) and provide contact details for verification."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    style={{ resize: 'vertical' }}
                                />
                            </div>

                            <button
                                type="submit"
                                className="gov-btn gov-btn-primary"
                                disabled={submitting}
                                style={{ padding: '0.9rem', fontSize: '0.95rem' }}
                            >
                                {submitting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Submitting Request...</>
                                ) : (
                                    <><Send size={18} /> Submit Recovery Request</>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Right Column - Status Tracking */}
                <div className="gov-card">
                    <div className="gov-card-header">
                        <h3 className="gov-card-title">
                            <FileText size={20} /> Past Recovery Requests
                        </h3>
                    </div>

                    {recoveries.length === 0 ? (
                        <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                            <Key size={40} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                            <p style={{ fontSize: '0.9rem', color: '#64748B', margin: 0 }}>No previous recovery requests.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recoveries.map(req => {
                                const statusMap = {
                                    requested: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'UNDER REVIEW', icon: Clock },
                                    identity_verified: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'IDENTITY VERIFIED', icon: ShieldCheck },
                                    completed: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'RECOVERED', icon: CheckCircle2 },
                                    rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'REJECTED', icon: XCircle }
                                };

                                const { color, bg, border, label, icon: StatusIcon } = statusMap[req.status] || { color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', label: req.status.toUpperCase(), icon: Clock };

                                return (
                                    <div
                                        key={req.id}
                                        style={{
                                            background: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            borderLeft: `4px solid ${color}`,
                                            borderRadius: '10px',
                                            padding: '1.25rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            <span className="gov-badge" style={{ '--badge-bg': bg, '--badge-color': color, '--badge-border': border, fontSize: '0.7rem' }}>
                                                <StatusIcon size={12} /> {label}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{formatDate(req.createdAt)}</span>
                                        </div>

                                        <p style={{ fontSize: '0.85rem', color: '#0F172A', margin: '0 0 0.5rem' }}>
                                            Old Wallet: <strong className="mono" style={{ fontSize: '0.8rem' }}>{req.oldWallet?.slice(0, 10)}...{req.oldWallet?.slice(-8)}</strong>
                                        </p>
                                        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                                            Reason: {req.reason}
                                        </p>

                                        {req.newWallet && (
                                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #E2E8F0' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700, textTransform: 'uppercase' }}>New Wallet</span>
                                                <p className="mono" style={{ fontSize: '0.8rem', color: '#0F172A', margin: '0.15rem 0 0' }}>{req.newWallet}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WalletRecovery;
