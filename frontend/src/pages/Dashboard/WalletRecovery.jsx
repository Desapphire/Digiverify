import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { recoveryService } from '../../services/recovery.service';
import { useAuth } from '../../context/AuthContext';
import {
    ShieldAlert, Key, Unlock, FileText, CheckCircle2,
    XCircle, Clock, AlertTriangle, Send, Loader2, Activity
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
            setError('Hexadecimal address requires 42-character 0x-prefixed payload format.');
            return;
        }

        if (reason.length < 10) {
            setError('Context node insufficient. Explain the breach (min 10 chars).');
            return;
        }

        try {
            setSubmitting(true);
            await recoveryService.requestRecovery({ oldWallet, reason });
            setSuccessMsg('Recovery sequence initiated. Network parameters frozen.');
            setOldWallet('');
            setReason('');
            fetchRecoveries(); // Refresh list
        } catch (err) {
            console.error('Recovery request failed', err);
            setError(err.response?.data?.message || err.message || 'System error: Protocol submission failed.');
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

    // Determine if user has an active pending request
    const pendingRequest = recoveries.find(r => ['requested', 'identity_verified'].includes(r.status));

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#FF007F' }} className="animate-spin" />
                    <p style={{ fontWeight: 800, letterSpacing: '0.1em', color: '#FF007F', fontSize: '0.9rem' }}>ACCESSING ARCHIVES...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-md animate-fade-in" style={{ paddingBottom: '6rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: '3.5rem', height: '3.5rem', borderRadius: '12px',
                        background: 'rgba(255,0,127,0.1)', border: '1px solid rgba(255,0,127,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(255,0,127,0.2)'
                    }}>
                        <ShieldAlert size={24} style={{ color: '#FF007F' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, color: 'white', letterSpacing: '-0.02em' }}>
                            Breach <span style={{ color: '#FF007F' }}>Recovery</span>
                        </h2>
                        <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.3rem', margin: 0 }}>
                            Report compromised nodes to initiate secure access protocol overrides
                        </p>
                    </div>
                </div>
                <div className="cyber-badge" style={{ '--badge-color': '#EF4444', '--badge-bg': 'rgba(239,68,68,0.1)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    HIGH SECURITY CLEARANCE
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                {/* Left Column - Request Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="cyber-hud-bar" style={{ display: 'block', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
                        <div className="cyber-card-glow-orb" style={{ background: '#FF007F', top: '-10%', right: '-10%', width: '15rem', height: '15rem', opacity: 0.1 }}></div>
                        
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Unlock size={20} style={{ color: '#FF007F' }} /> Override Payload
                        </h3>

                        <div style={{
                            background: 'rgba(255,0,127,0.05)', border: '1px solid rgba(255,0,127,0.2)',
                            borderRadius: '12px', padding: '1rem', marginBottom: '2rem',
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                        }}>
                            <AlertTriangle size={18} style={{ color: '#FF007F', flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#FF007F', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Emergency Lock Down</p>
                                <p style={{ color: '#9ca3af', fontSize: '0.75rem', lineHeight: 1.6, margin: 0 }}>
                                    Initiating this recovery script will immediately freeze the targeted ledger assets. The government-grade clearance team must physically verify your liveness before issuing a replacement linkage parameter.
                                </p>
                            </div>
                        </div>

                        {pendingRequest ? (
                            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Activity size={40} style={{ color: '#00E5FF', margin: '0 auto 1.5rem' }} className="animate-pulse" />
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>Override Processing</h4>
                                <p style={{ color: '#9ca3af', fontSize: '0.85rem', lineHeight: 1.6 }}>
                                    A recovery protocol request is already active in the central memory bank. You cannot dispatch multiple override attempts.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {error && (
                                    <div style={{
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: '8px', padding: '1rem', color: '#EF4444',
                                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <XCircle size={16} /> {error}
                                    </div>
                                )}

                                {successMsg && (
                                    <div style={{
                                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                                        borderRadius: '8px', padding: '1rem', color: '#22C55E',
                                        fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                    }}>
                                        <CheckCircle2 size={16} /> {successMsg}
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', color: '#FF007F', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                        Compromised Node (Wallet Address)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="0x..."
                                        value={oldWallet}
                                        onChange={(e) => setOldWallet(e.target.value)}
                                        required
                                        style={{
                                            width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,0,127,0.3)', borderRadius: '8px',
                                            color: 'white', fontSize: '0.9rem', padding: '1rem', outline: 'none', transition: 'box-shadow 0.2s', fontFamily: 'JetBrains Mono'
                                        }}
                                        onFocus={(e) => e.target.style.boxShadow = '0 0 15px rgba(255,0,127,0.2)'}
                                        onBlur={(e) => e.target.style.boxShadow = 'none'}
                                    />
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: 'JetBrains Mono' }}>
                                        Provide exactly 42-character hex payload of the lost origin node.
                                    </p>
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: '#FF007F', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                        Execution Context / Contact Parameters
                                    </label>
                                    <textarea
                                        placeholder="Detail the breach (e.g., Keys exposed to network, terminal seized) and provide communication relay coordinates."
                                        rows="4"
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        required
                                        style={{
                                            width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,0,127,0.3)', borderRadius: '8px',
                                            color: 'white', fontSize: '0.9rem', padding: '1rem', outline: 'none', transition: 'box-shadow 0.2s', fontFamily: 'Inter', resize: 'vertical'
                                        }}
                                        onFocus={(e) => e.target.style.boxShadow = '0 0 15px rgba(255,0,127,0.2)'}
                                        onBlur={(e) => e.target.style.boxShadow = 'none'}
                                    ></textarea>
                                </div>

                                <button
                                    type="submit"
                                    className="cyber-btn-hollow"
                                    disabled={submitting}
                                    style={{
                                        '--btn-color': '#FF007F',
                                        width: '100%', justifyContent: 'center', padding: '1.25rem', marginTop: '1rem'
                                    }}
                                >
                                    {submitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Transmitting...</>
                                    ) : (
                                        <><Send size={18} /> Initialize Freeze Protocol</>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Right Column - Status Tracking */}
                <div>
                    <div className="cyber-hud-bar" style={{ display: 'block', padding: '2.5rem', height: '100%' }}>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'white', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={20} style={{ color: '#00E5FF' }} /> Dispatch Ledger
                        </h3>

                        {recoveries.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Key size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: '#00E5FF', margin: '0 auto 1rem' }} />
                                <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>No recovery trace arrays detected.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {recoveries.map(req => {
                                    // Map status to Cyber HUD styles
                                    const statusMap = {
                                        requested: { color: '#F59E0B', label: 'AWAITING GOV OVERRIDE', icon: Clock },
                                        identity_verified: { color: '#00E5FF', label: 'IDENTITY APPROVED (PENDING WALLET LINK)', icon: ShieldAlert },
                                        completed: { color: '#22C55E', label: 'PROTOCOL RESOLVED', icon: CheckCircle2 },
                                        rejected: { color: '#FF007F', label: 'OVERRIDE DENIED', icon: XCircle }
                                    };

                                    const { color, label, icon: StatusIcon } = statusMap[req.status] || { color: '#9ca3af', label: req.status.toUpperCase(), icon: Clock };

                                    return (
                                        <div key={req.id} style={{
                                            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '12px', padding: '1.5rem', position: 'relative', overflow: 'hidden'
                                        }}>
                                            {/* Glowing border accent */}
                                            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: color, boxShadow: `0 0 10px ${color}` }}></div>

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                                <span style={{
                                                    background: 'rgba(0,0,0,0.5)', color: color, border: `1px solid ${color}40`,
                                                    fontSize: '0.65rem', padding: '0.3rem 0.6rem', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                                    display: 'flex', alignItems: 'center', gap: '0.35rem'
                                                }}>
                                                    <StatusIcon size={12} /> {label}
                                                </span>
                                            </div>

                                            <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
                                                        Target Node
                                                    </p>
                                                    <p style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: '#9ca3af' }}>
                                                        {req.oldWallet.slice(0, 10)}...{req.oldWallet.slice(-8)}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
                                                        Timestamp
                                                    </p>
                                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'JetBrains Mono' }}>
                                                        {formatDate(req.createdAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            {req.newWallet && (
                                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '0.65rem', color: '#22C55E', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>
                                                        New Escrow Linkage
                                                    </p>
                                                    <p style={{ fontSize: '0.85rem', fontFamily: 'JetBrains Mono', color: 'white' }}>
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
