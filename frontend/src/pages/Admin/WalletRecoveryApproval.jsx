import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { TopNavbar } from '../../components/TopNavbar';
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
        if (!window.confirm('Complete this recovery? This will execute forceTransfer on-chain and reassign all property NFTs.')) return;
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
            case 'completed': return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981', label: 'Completed' };
            case 'identity_verified': return { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38BDF8', label: 'Identity Verified' };
            case 'rejected': return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444', label: 'Rejected' };
            default: return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B', label: 'Requested' };
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
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            <TopNavbar 
                title="Wallet Recovery Approval" 
                subtitle="Review and process citizen wallet recovery requests with multi-sig force-transfer capabilities"
                showLogo={false}
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
                customRight={
                    <button onClick={fetchRecoveries} className="btn-dark-pill" style={{ fontSize: '0.8rem' }}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                }
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Security Warning */}
                <div style={{
                    padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <ShieldAlert size={20} style={{ color: '#F59E0B', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 500, color: '#FCD34D', margin: 0 }}>
                        <strong>GOVERNMENT CLEARANCE:</strong> Recovery completion triggers an on-chain smart contract <code style={{ background: '#0F172A', padding: '2px 6px', borderRadius: '4px', fontFamily: 'JetBrains Mono', fontSize: '0.8rem' }}>forceTransfer()</code> override. Verify biometric and document credentials before proceeding.
                    </p>
                </div>

                {/* Search */}
                <div className="digi-card p-4 mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>
                        {loading ? 'Loading...' : `${filteredRecoveries.length} recovery request${filteredRecoveries.length !== 1 ? 's' : ''}`}
                    </div>
                    <div style={{ position: 'relative', minWidth: 260 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            placeholder="Search by ID, wallet, reason..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium"
                            style={{ paddingLeft: 36, fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                {/* List */}
                {loading ? (
                    <div className="digi-card p-12 flex items-center justify-center">
                        <Loader2 size={36} className="animate-spin" style={{ color: '#0284C7' }} />
                    </div>
                ) : filteredRecoveries.length === 0 ? (
                    <div className="digi-card p-12 flex flex-col items-center justify-center text-center">
                        <KeyRound size={48} style={{ marginBottom: '1rem', color: '#64748B' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No pending wallet recovery requests.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredRecoveries.map(r => {
                            const sc = statusStyle(r.status);
                            const isExpanded = expandedId === r.id;
                            const isActing = actionLoading === r.id;

                            return (
                                <div key={r.id} className="digi-card" style={{ padding: 0, overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                                    {/* Main Row */}
                                    <div
                                        onClick={() => setExpandedId(isExpanded ? null : r.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '1.25rem 1.5rem', cursor: 'pointer', flexWrap: 'wrap', gap: '1rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: '10px',
                                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#EF4444', flexShrink: 0,
                                            }}>
                                                <KeyRound size={20} />
                                            </div>

                                            <div>
                                                <p style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.95rem', margin: 0, fontFamily: 'JetBrains Mono' }}>
                                                    REC-{shortenId(r.id).toUpperCase()}
                                                    <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8, fontSize: '0.825rem', fontFamily: 'Inter' }}>
                                                        User ID: {shortenId(r.userId)}
                                                    </span>
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                                        Lost: <code style={{ fontFamily: 'JetBrains Mono', color: '#EF4444' }}>{shortenWallet(r.oldWallet)}</code>
                                                    </span>
                                                    {r.newWallet && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                                            New: <code style={{ fontFamily: 'JetBrains Mono', color: '#10B981' }}>{shortenWallet(r.newWallet)}</code>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                                padding: '0.25rem 0.65rem', borderRadius: '6px',
                                                background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                            }}>
                                                {sc.label}
                                            </span>

                                            {/* Action Buttons */}
                                            {r.status === 'requested' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => handleVerifyIdentity(r.id)}
                                                        disabled={isActing}
                                                        className="btn-cyan-glow"
                                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    >
                                                        {isActing ? <Loader2 size={13} className="animate-spin" /> : <UserCheck size={13} />}
                                                        Verify Identity
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(r.id)}
                                                        disabled={isActing}
                                                        className="btn-cyan-outline"
                                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            )}

                                            {r.status === 'identity_verified' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter New 0x Wallet..."
                                                        value={newWalletInput[r.id] || ''}
                                                        onChange={(e) => setNewWalletInput({ ...newWalletInput, [r.id]: e.target.value })}
                                                        className="input-premium font-mono"
                                                        style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', width: 180 }}
                                                    />
                                                    <button
                                                        onClick={() => handleComplete(r.id)}
                                                        disabled={isActing}
                                                        className="btn-cyan-glow"
                                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', background: '#10B981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    >
                                                        {isActing ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                                                        Execute Force Transfer
                                                    </button>
                                                </div>
                                            )}

                                            {isExpanded ? <ChevronUp size={18} style={{ color: '#64748B' }} /> : <ChevronDown size={18} style={{ color: '#64748B' }} />}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '1.25rem 1.5rem', borderTop: '1px solid #1E293B',
                                            background: '#0B0F19'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1rem' }}>
                                                <DetailField label="Recovery Request ID" value={r.id} mono />
                                                <DetailField label="Citizen User ID" value={r.userId || '—'} mono />
                                                <DetailField label="Lost / Inaccessible Wallet" value={r.oldWallet || '—'} mono />
                                                <DetailField label="New Replacement Wallet" value={r.newWallet || 'Not assigned yet'} mono />
                                                <DetailField label="Submission Timestamp" value={r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'} />
                                                <DetailField label="Current Status" value={r.status || '—'} />
                                            </div>

                                            <div style={{ padding: '0.85rem 1rem', background: '#0F172A', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.3rem' }}>Applicant Stated Reason</span>
                                                <p style={{ color: '#CBD5E1', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                                                    {r.reason || 'No explanation provided.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>
            {label}
        </span>
        <span style={{
            fontSize: '0.875rem', fontWeight: 500, color: '#CBD5E1',
            fontFamily: mono ? 'JetBrains Mono' : 'inherit',
            wordBreak: 'break-all',
        }}>
            {value}
        </span>
    </div>
);

export default WalletRecoveryApproval;
