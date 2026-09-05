import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recoveryService } from '../../services/recovery.service';
import { useAuth } from '../../context/AuthContext';
import { TopNavbar } from '../../components/TopNavbar';
import {
    ShieldAlert, Key, Unlock, FileText, CheckCircle2,
    XCircle, Clock, AlertTriangle, Send, Loader2, RefreshCw
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
            setError('Please enter a valid 42-character Ethereum/Avalanche wallet address starting with 0x.');
            return;
        }

        if (reason.length < 10) {
            setError('Please provide a detailed explanation (at least 10 characters).');
            return;
        }

        try {
            setSubmitting(true);
            await recoveryService.requestRecovery({ oldWallet, reason });
            setSuccessMsg('Wallet recovery request submitted successfully. A government registrar will verify your credentials.');
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
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={32} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, color: '#94A3B8', fontSize: '0.9rem' }}>Loading recovery requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            <TopNavbar 
                title="Account & Key Recovery" 
                subtitle="Submit requests to recover lost or compromised Web3 wallets through authorized identity verification"
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#F8FAFC', letterSpacing: '-0.02em' }}>
                            Recovery Protocol
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginTop: '0.25rem', margin: 0 }}>
                            Government-backed key restoration protocol with biometric KYC verification.
                        </p>
                    </div>
                    <button
                        className="btn-cyan-outline"
                        onClick={fetchRecoveries}
                        style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                    >
                        <RefreshCw size={14} /> Refresh History
                    </button>
                </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

                {/* Left Column - Request Form */}
                <div className="digi-card" style={{ padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.85rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>
                            <ShieldAlert size={16} />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                            Initiate Key Recovery
                        </h3>
                    </div>

                    <div style={{
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: '10px',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'flex-start'
                    }}>
                        <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#EF4444', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Security Notice</p>
                            <p style={{ color: '#94A3B8', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                                Submitting a recovery request initiates multi-party verification. Your linked property assets may be temporarily frozen while land registrar authorities review identity credentials.
                            </p>
                        </div>
                    </div>

                    {pendingRequest ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#0B0F19', borderRadius: '10px', border: '1px solid #1E293B' }}>
                            <Clock size={36} style={{ color: '#F59E0B', margin: '0 auto 1rem' }} />
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.4rem' }}>Recovery Request Active</h4>
                            <p style={{ color: '#64748B', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
                                You have a pending recovery request in review. Multiple concurrent requests are disabled for account security.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {error && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '8px', padding: '0.85rem 1rem', color: '#EF4444',
                                    fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <XCircle size={16} /> {error}
                                </div>
                            )}

                            {successMsg && (
                                <div style={{
                                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                                    borderRadius: '8px', padding: '0.85rem 1rem', color: '#10B981',
                                    fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <CheckCircle2 size={16} /> {successMsg}
                                </div>
                            )}

                            <div>
                                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                    Lost / Compromised Wallet Address
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={oldWallet}
                                    onChange={(e) => setOldWallet(e.target.value)}
                                    required
                                    className="input-premium"
                                    style={{ width: '100%', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem', margin: 0 }}>
                                    Enter the 42-character public address of the inaccessible wallet.
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#CBD5E1', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                    Reason & Verification Context
                                </label>
                                <textarea
                                    placeholder="Describe how access was lost (e.g., lost hardware key, compromised seed phrase, device theft)..."
                                    rows="4"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    required
                                    className="input-premium"
                                    style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn-cyan-glow"
                                disabled={submitting}
                                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#DC2626' }}
                            >
                                {submitting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Submitting Request...</>
                                ) : (
                                    <><Send size={16} /> Submit Recovery Request</>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* Right Column - Status Tracking */}
                <div className="digi-card" style={{ padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.85rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2,132,199,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                            <FileText size={16} />
                        </div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                            Recovery Request History
                        </h3>
                    </div>

                    {recoveries.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: '#0B0F19', borderRadius: '10px', border: '1px dashed #1E293B' }}>
                            <Key size={36} style={{ opacity: 0.3, marginBottom: '0.75rem', color: '#64748B', margin: '0 auto 0.75rem' }} />
                            <p style={{ fontSize: '0.875rem', color: '#94A3B8', margin: 0 }}>No recovery requests submitted.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {recoveries.map(req => {
                                const statusMap = {
                                    requested: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', label: 'Awaiting Registrar Review', icon: Clock },
                                    identity_verified: { color: '#38BDF8', bg: 'rgba(56,189,248,0.12)', label: 'Identity Verified (Pending Link)', icon: ShieldAlert },
                                    completed: { color: '#10B981', bg: 'rgba(16,185,129,0.12)', label: 'Resolved & Linked', icon: CheckCircle2 },
                                    rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.12)', label: 'Request Rejected', icon: XCircle }
                                };

                                const { color, bg, label, icon: StatusIcon } = statusMap[req.status] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', label: req.status.toUpperCase(), icon: Clock };

                                return (
                                    <div key={req.id} style={{
                                        background: '#0B0F19', border: '1px solid #1E293B',
                                        borderRadius: '10px', padding: '1.25rem', borderLeft: `3px solid ${color}`
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                            <span style={{
                                                background: bg, color: color, border: `1px solid ${color}30`,
                                                fontSize: '0.75rem', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 600,
                                                display: 'flex', alignItems: 'center', gap: '0.35rem'
                                            }}>
                                                <StatusIcon size={12} /> {label}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'JetBrains Mono' }}>
                                                {formatDate(req.createdAt)}
                                            </span>
                                        </div>

                                        <div style={{ marginBottom: '0.5rem' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                                                Target Address
                                            </span>
                                            <span style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: '#CBD5E1', wordBreak: 'break-all' }}>
                                                {req.oldWallet}
                                            </span>
                                        </div>

                                        {req.newWallet && (
                                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #1E293B' }}>
                                                <span style={{ fontSize: '0.7rem', color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                                                    New Linked Wallet
                                                </span>
                                                <span style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: '#F8FAFC', wordBreak: 'break-all' }}>
                                                    {req.newWallet}
                                                </span>
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
        </div>
    );
};

export default WalletRecovery;
