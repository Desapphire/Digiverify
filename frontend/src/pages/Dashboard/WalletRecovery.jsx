import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recoveryService } from '../../services/recovery.service';
import { useAuth } from '../../context/AuthContext';
import {
    ShieldAlert, Key, Unlock, FileText, CheckCircle2,
    XCircle, Clock, AlertTriangle, Send, Loader2
} from 'lucide-react';

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
            setError('Please enter a valid Ethereum wallet address format.');
            return;
        }

        if (reason.length < 10) {
            setError('Please provide a detailed reason (at least 10 characters).');
            return;
        }

        try {
            setSubmitting(true);
            await recoveryService.requestRecovery({ oldWallet, reason });
            setSuccessMsg('Recovery request submitted successfully.');
            setOldWallet('');
            setReason('');
            fetchRecoveries(); // Refresh list
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
            day: '2-digit', month: 'short', year: 'numeric'
        });
    };

    // Determine if user has an active pending request
    const pendingRequest = recoveries.find(r => ['requested', 'identity_verified'].includes(r.status));

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(348,83%,47%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Requests...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem', paddingTop: '1.5rem' }}>
            {/* Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(348,83%,47%,0.15), rgba(300,80%,40%,0.1))',
                    border: '1px solid rgba(348,83%,47%,0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Unlock size={24} style={{ color: 'hsl(348,83%,47%)' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
                        Wallet <span className="text-gradient">Recovery</span>
                    </h1>
                    <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                        Report a lost or compromised wallet to regain access to your properties.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                {/* Left Column - Request Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldAlert size={20} style={{ color: 'hsl(348,83%,47%)' }} /> Report Lost Wallet
                        </h3>

                        <div style={{
                            background: 'rgba(348,83%,47%,0.05)', border: '1px solid rgba(348,83%,47%,0.15)',
                            borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                        }}>
                            <AlertTriangle size={18} style={{ color: 'hsl(348,83%,47%)', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Important Warning</p>
                                <p className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    Initiating recovery will temporarily freeze all your assets until the authority verifies your identity and a new wallet is linked.
                                </p>
                            </div>
                        </div>

                        {pendingRequest ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '12px' }}>
                                <Clock size={36} style={{ color: 'hsl(38,92%,50%)', margin: '0 auto 1rem' }} />
                                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Recovery in Progress</h4>
                                <p className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                                    You already have an active recovery request. Please wait for the authority to process it.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {error && (
                                    <div style={{
                                        background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                                        borderRadius: '8px', padding: '0.75rem', color: 'hsl(var(--color-danger))',
                                        fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <XCircle size={14} /> {error}
                                    </div>
                                )}

                                {successMsg && (
                                    <div style={{
                                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                                        borderRadius: '8px', padding: '0.75rem', color: 'hsl(142,71%,45%)',
                                        fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <CheckCircle2 size={14} /> {successMsg}
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'hsl(var(--color-text-secondary))' }}>
                                        Old Wallet Address
                                    </label>
                                    <input
                                        type="text"
                                        className="input-premium"
                                        placeholder="0x..."
                                        value={oldWallet}
                                        onChange={(e) => setOldWallet(e.target.value)}
                                        required
                                        style={{ fontFamily: 'monospace' }}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))', marginTop: '0.4rem' }}>
                                        The 42-character address of the wallet you lost access to.
                                    </p>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: 'hsl(var(--color-text-secondary))' }}>
                                        Reason & Contact Info
                                    </label>
                                    <textarea
                                        className="input-premium"
                                        placeholder="Briefly explain what happened (e.g. Lost private keys, device compromised) and provide the best way for the authority to contact you for identity verification."
                                        rows="4"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                        style={{ resize: 'vertical' }}
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={submitting}
                                    style={{
                                        padding: '0.875rem', fontSize: '0.95rem',
                                        background: 'linear-gradient(135deg, hsl(348,83%,47%), hsl(300,80%,40%))',
                                        border: 'none', boxShadow: '0 4px 14px rgba(225,29,72,0.3)'
                                    }}
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
                </div>

                {/* Right Column - Status Tracking */}
                <div>
                    <div className="glass-panel" style={{ padding: '2rem', height: '100%' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} style={{ color: 'hsl(255,85%,65%)' }} /> Request History
                        </h3>

                        {recoveries.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'hsl(220,15%,60%)' }}>
                                <Key size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'hsl(255,85%,65%)', margin: '0 auto 1rem' }} />
                                <p style={{ fontSize: '0.875rem' }}>No recovery requests found.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {recoveries.map(req => {
                                    // Map status to styles
                                    const statusMap = {
                                        requested: { color: 'hsl(38,92%,50%)', label: 'Pending Authority Review', icon: Clock },
                                        identity_verified: { color: 'hsl(280,80%,60%)', label: 'Identity Verified (Awaiting New Wallet)', icon: ShieldAlert },
                                        completed: { color: 'hsl(142,71%,45%)', label: 'Completed', icon: CheckCircle2 },
                                        rejected: { color: 'hsl(348,83%,47%)', label: 'Rejected', icon: XCircle }
                                    };

                                    const { color, label, icon: StatusIcon } = statusMap[req.status] || { color: 'gray', label: req.status, icon: Clock };

                                    return (
                                        <div key={req.id} style={{
                                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '12px', padding: '1.25rem', position: 'relative', overflow: 'hidden'
                                        }}>
                                            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: color }}></div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                <span className="badge" style={{
                                                    background: `${color}15`, color: color, border: `1px solid ${color}30`,
                                                    fontSize: '0.65rem'
                                                }}>
                                                    <StatusIcon size={10} style={{ marginRight: '0.25rem', display: 'inline' }} /> {label}
                                                </span>
                                                <span style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', fontFamily: 'monospace' }}>
                                                    {formatDate(req.createdAt)}
                                                </span>
                                            </div>

                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <p style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                                                    Old Wallet
                                                </p>
                                                <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(var(--color-text-secondary))' }}>
                                                    {req.oldWallet}
                                                </p>
                                            </div>

                                            {req.newWallet && (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                                                        New Wallet Linked
                                                    </p>
                                                    <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(142,71%,45%)' }}>
                                                        {req.newWallet}
                                                    </p>
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
