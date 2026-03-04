import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    KeyRound, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, ChevronDown,
    ChevronUp, ShieldCheck, ShieldAlert, Clock,
    ArrowRight, UserCheck, AlertTriangle
} from 'lucide-react';

const WalletRecoveryApproval = () => {
    const navigate = useNavigate();
    const [recoveries, setRecoveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [newWalletInput, setNewWalletInput] = useState({});

    const fetchRecoveries = async () => {
        setLoading(true);
        try {
            const res = await adminService.getPendingRecoveries();
            setRecoveries(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch recoveries:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRecoveries(); }, []);

    const handleVerifyIdentity = async (recoveryId) => {
        setActionLoading(recoveryId);
        try {
            await adminService.verifyRecovery(recoveryId);
            fetchRecoveries();
        } catch (err) {
            alert(err.response?.data?.message || 'Verification failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleComplete = async (recoveryId) => {
        const newWallet = newWalletInput[recoveryId];
        if (!newWallet || !newWallet.trim()) {
            alert('Please enter the new wallet address before completing recovery.');
            return;
        }
        if (!window.confirm('Complete this recovery? This will execute forceTransfer and reassign all property NFTs.')) return;
        setActionLoading(recoveryId);
        try {
            await adminService.completeRecovery(recoveryId, newWallet.trim());
            fetchRecoveries();
        } catch (err) {
            alert(err.response?.data?.message || 'Recovery completion failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (recoveryId) => {
        if (!window.confirm('Reject this wallet recovery request?')) return;
        setActionLoading(recoveryId);
        try {
            await adminService.rejectRecovery(recoveryId);
            fetchRecoveries();
        } catch (err) {
            alert(err.response?.data?.message || 'Rejection failed');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.toString().slice(0, 8) : '—';

    const statusStyle = (status) => {
        switch (status) {
            case 'completed': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e', label: 'Completed' };
            case 'identity_verified': return { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6', label: 'Verified' };
            case 'rejected': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444', label: 'Rejected' };
            default: return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: '#eab308', label: 'Requested' };
        }
    };

    const filteredRecoveries = recoveries.filter(r => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (r.id || '').toString().toLowerCase().includes(q) ||
            (r.oldWallet || '').toLowerCase().includes(q) ||
            (r.newWallet || '').toLowerCase().includes(q) ||
            (r.userId || '').toString().toLowerCase().includes(q) ||
            (r.reason || '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        Wallet Recovery <span className="text-gradient">Approval</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Review and process wallet recovery requests with force-transfer capability.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>← Back</button>
                    <button onClick={fetchRecoveries} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}><RefreshCcw size={14} /> Refresh</button>
                </div>
            </div>

            {/* Security Warning */}
            <div style={{
                padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
                background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
                <ShieldAlert size={18} style={{ color: '#eab308', flexShrink: 0 }} />
                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(234,179,8,0.8)' }}>
                    <strong>SECURITY:</strong> Recovery completion executes <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4, fontSize: '0.72rem' }}>forceTransfer()</code> on-chain.
                    Verify identity thoroughly before approving.
                </p>
            </div>

            {/* Search */}
            <div className="glass-panel p-4 mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                    {loading ? 'Loading...' : `${filteredRecoveries.length} recovery request${filteredRecoveries.length !== 1 ? 's' : ''}`}
                </div>
                <div style={{ position: 'relative', minWidth: 240 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input type="text" placeholder="Search by ID, wallet, reason..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium" style={{ paddingLeft: 34, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 34px' }} />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            ) : filteredRecoveries.length === 0 ? (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <KeyRound size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No pending wallet recovery requests at this time.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredRecoveries.map(r => {
                        const sc = statusStyle(r.status);
                        const isExpanded = expandedId === r.id;
                        const isActing = actionLoading === r.id;
                        const isRequested = r.status === 'requested';
                        const isVerified = r.status === 'identity_verified';

                        return (
                            <div key={r.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Main Row */}
                                <div onClick={() => setExpandedId(isExpanded ? null : r.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer' }}>
                                    <div className="flex items-center gap-4">
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '12px',
                                            background: sc.bg, border: `1px solid ${sc.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: sc.text, flexShrink: 0,
                                        }}>
                                            <KeyRound size={20} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>
                                                Recovery #{shortenId(r.id)}
                                            </p>
                                            <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                                                <span style={{ fontSize: '0.72rem', color: 'rgba(239,68,68,0.7)', fontFamily: 'monospace' }}>
                                                    {shortenWallet(r.oldWallet)}
                                                </span>
                                                <ArrowRight size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                                <span style={{ fontSize: '0.72rem', color: r.newWallet ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                                                    {r.newWallet ? shortenWallet(r.newWallet) : 'pending...'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span style={{
                                            fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                            letterSpacing: '0.04em', padding: '3px 10px', borderRadius: '9999px',
                                            background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                        }}>
                                            {sc.label}
                                        </span>

                                        {/* Quick actions */}
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            {isRequested && (
                                                <button onClick={() => handleVerifyIdentity(r.id)} disabled={isActing} style={{
                                                    padding: '0.35rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 700,
                                                    background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)',
                                                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                                }}>
                                                    {isActing ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />} Verify ID
                                                </button>
                                            )}
                                            {(isRequested || isVerified) && (
                                                <button onClick={() => handleReject(r.id)} disabled={isActing} className="btn btn-danger" style={{
                                                    padding: '0.35rem 0.7rem', fontSize: '0.7rem', opacity: isActing ? 0.5 : 1,
                                                }}>
                                                    <XCircle size={12} /> Reject
                                                </button>
                                            )}
                                        </div>

                                        {isExpanded ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                    </div>
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                            <DetailField label="Recovery ID" value={r.id} mono />
                                            <DetailField label="User ID" value={r.userId || '—'} mono />
                                            <DetailField label="Old Wallet (Lost)" value={r.oldWallet || '—'} mono />
                                            <DetailField label="New Wallet (Target)" value={r.newWallet || 'Not assigned yet'} mono />
                                            <DetailField label="Status" value={r.status?.replace(/_/g, ' ').toUpperCase() || '—'} />
                                            <DetailField label="Verified By" value={r.verifiedBy || 'Not yet verified'} mono />
                                            <DetailField label="Reason" value={r.reason || '—'} />
                                            {r.nftTransferTx && <DetailField label="NFT Transfer Tx" value={r.nftTransferTx} mono />}
                                            <DetailField label="Requested" value={r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'} />
                                            <DetailField label="Last Updated" value={r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'} />
                                        </div>

                                        {/* Recovery Completion (only for verified requests) */}
                                        {isVerified && (
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                                <div style={{
                                                    padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '1rem',
                                                    background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)',
                                                }}>
                                                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(239,68,68,0.7)' }}>
                                                        <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                                        This action will execute <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 4px', borderRadius: 3 }}>forceTransfer()</code> and reassign all property NFTs from the old wallet to the new one.
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: 280 }}>
                                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                                                            New Wallet Address
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="0x..."
                                                            value={newWalletInput[r.id] || ''}
                                                            onChange={(e) => setNewWalletInput(prev => ({ ...prev, [r.id]: e.target.value }))}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="input-premium"
                                                            style={{ fontSize: '0.82rem', fontFamily: 'monospace', width: '100%' }}
                                                        />
                                                    </div>
                                                    <button onClick={() => handleComplete(r.id)} disabled={isActing} style={{
                                                        padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 700,
                                                        background: 'rgba(234,88,12,0.15)', color: '#f97316', border: '1px solid rgba(234,88,12,0.3)',
                                                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                                    }}>
                                                        {isActing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Execute Recovery
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 600 }}>
                <ShieldCheck size={14} style={{ color: '#ef4444' }} />
                Force Transfer Protocol — All recovery actions are cryptographically logged.
            </div>
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</p>
    </div>
);

export default WalletRecoveryApproval;
