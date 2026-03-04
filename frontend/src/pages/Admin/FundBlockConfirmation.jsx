import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Landmark, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, Clock, ChevronDown,
    ChevronUp, ShieldCheck, Hash, Ban, DollarSign
} from 'lucide-react';

const FundBlockConfirmation = () => {
    const navigate = useNavigate();
    const [fundBlocks, setFundBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedBlock, setExpandedBlock] = useState(null);
    const [bankRefInput, setBankRefInput] = useState({});

    const fetchFundBlocks = async () => {
        setLoading(true);
        try {
            const res = await adminService.getPendingFundBlocks();
            setFundBlocks(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch fund blocks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFundBlocks(); }, []);

    const handleConfirm = async (blockId) => {
        const refId = bankRefInput[blockId];
        if (!refId || !refId.trim()) {
            alert('Please enter a Bank Reference ID before confirming.');
            return;
        }
        setActionLoading(blockId);
        try {
            await adminService.confirmFundBlock(blockId, refId.trim());
            fetchFundBlocks();
        } catch (err) {
            alert(err.response?.data?.message || 'Confirmation failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRelease = async (blockId) => {
        if (!window.confirm('Release these blocked funds back to the buyer?')) return;
        setActionLoading(blockId);
        try {
            await adminService.releaseFunds(blockId);
            fetchFundBlocks();
        } catch (err) {
            alert(err.response?.data?.message || 'Release failed');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.toString().slice(0, 8) : '—';

    // Normalize fields (backend may return snake_case from raw query)
    const normalize = (fb) => ({
        id: fb.id,
        transactionId: fb.transaction_id || fb.transactionId,
        bankReferenceId: fb.bank_reference_id || fb.bankReferenceId,
        buyerWallet: fb.buyer_wallet || fb.buyerWallet,
        blockAmount: parseFloat(fb.block_amount || fb.blockAmount || 0),
        currency: fb.currency || 'INR',
        blockedAt: fb.blocked_at || fb.blockedAt,
        unblockedAt: fb.unblocked_at || fb.unblockedAt,
        bankConfirmed: fb.bank_confirmed || fb.bankConfirmed,
        bankConfirmTs: fb.bank_confirm_ts || fb.bankConfirmTs,
        status: fb.status || 'pending',
        bankUserId: fb.bank_user_id || fb.bankUserId,
    });

    const statusStyle = (status) => {
        switch (status) {
            case 'blocked': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' };
            case 'released': return { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6' };
            case 'failed': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' };
            default: return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: '#eab308' };
        }
    };

    const filteredBlocks = fundBlocks.map(normalize).filter(fb => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (fb.id || '').toString().toLowerCase().includes(q) ||
            (fb.buyerWallet || '').toLowerCase().includes(q) ||
            (fb.transactionId || '').toString().toLowerCase().includes(q) ||
            (fb.bankReferenceId || '').toString().toLowerCase().includes(q)
        );
    });

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        Fund Block <span className="text-gradient">Confirmation</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Verify and confirm ASBA fund blocks against bank records.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>← Back</button>
                    <button onClick={fetchFundBlocks} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}><RefreshCcw size={14} /> Refresh</button>
                </div>
            </div>

            {/* Search */}
            <div className="glass-panel p-4 mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                    {loading ? 'Loading...' : `${filteredBlocks.length} fund block${filteredBlocks.length !== 1 ? 's' : ''}`}
                </div>
                <div style={{ position: 'relative', minWidth: 240 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input type="text" placeholder="Search by ID, wallet, bank ref..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium" style={{ paddingLeft: 34, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 34px' }} />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            ) : filteredBlocks.length === 0 ? (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <Landmark size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No pending fund blocks at this time.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredBlocks.map(fb => {
                        const sc = statusStyle(fb.status);
                        const isExpanded = expandedBlock === fb.id;
                        const isActing = actionLoading === fb.id;
                        const isPending = !fb.bankConfirmed && fb.status !== 'released' && fb.status !== 'failed';

                        return (
                            <div key={fb.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Main Row */}
                                <div onClick={() => setExpandedBlock(isExpanded ? null : fb.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer' }}>
                                    <div className="flex items-center gap-4">
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '12px',
                                            background: sc.bg, border: `1px solid ${sc.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: sc.text, flexShrink: 0,
                                        }}>
                                            <Landmark size={20} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>
                                                Fund Block #{shortenId(fb.id)}
                                                <span style={{ fontWeight: 600, color: '#a78bfa', marginLeft: 10, fontSize: '0.92rem' }}>
                                                    ₹{fb.blockAmount.toLocaleString()}
                                                </span>
                                                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.3)', marginLeft: 4, fontSize: '0.72rem' }}>
                                                    {fb.currency}
                                                </span>
                                            </p>
                                            <div className="flex items-center gap-4" style={{ marginTop: 4 }}>
                                                <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                                    <Wallet size={11} /> Buyer: {shortenWallet(fb.buyerWallet)}
                                                </span>
                                                <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                                                    <Hash size={11} /> Tx: {shortenId(fb.transactionId)}
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
                                            {fb.bankConfirmed ? 'confirmed' : fb.status}
                                        </span>

                                        {isExpanded ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                    </div>
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                            <DetailField label="Block ID" value={fb.id} mono />
                                            <DetailField label="Transaction ID" value={fb.transactionId || '—'} mono />
                                            <DetailField label="Buyer Wallet" value={fb.buyerWallet || '—'} mono />
                                            <DetailField label="Amount" value={`₹${fb.blockAmount.toLocaleString()} ${fb.currency}`} />
                                            <DetailField label="Status" value={fb.status?.toUpperCase()} />
                                            <DetailField label="Bank Confirmed" value={fb.bankConfirmed ? 'Yes' : 'No'} />
                                            <DetailField label="Bank Reference" value={fb.bankReferenceId || 'Not set'} mono />
                                            <DetailField label="Blocked At" value={fb.blockedAt ? new Date(fb.blockedAt).toLocaleString() : '—'} />
                                            {fb.bankConfirmTs && <DetailField label="Confirmed At" value={new Date(fb.bankConfirmTs).toLocaleString()} />}
                                            {fb.unblockedAt && <DetailField label="Released At" value={new Date(fb.unblockedAt).toLocaleString()} />}
                                        </div>

                                        {/* Actions */}
                                        {isPending && (
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                                    <div style={{ flex: 1, minWidth: 200 }}>
                                                        <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
                                                            Bank Reference ID
                                                        </label>
                                                        <input
                                                            type="text"
                                                            placeholder="e.g. REF-2026-XXXXX"
                                                            value={bankRefInput[fb.id] || ''}
                                                            onChange={(e) => setBankRefInput(prev => ({ ...prev, [fb.id]: e.target.value }))}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="input-premium"
                                                            style={{ fontSize: '0.82rem', fontFamily: 'monospace', width: '100%' }}
                                                        />
                                                    </div>
                                                    <button onClick={() => handleConfirm(fb.id)} disabled={isActing} style={{
                                                        padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 700,
                                                        background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)',
                                                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                                    }}>
                                                        {isActing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Confirm Block
                                                    </button>
                                                    <button onClick={() => handleRelease(fb.id)} disabled={isActing} className="btn btn-danger" style={{
                                                        padding: '0.5rem 1rem', fontSize: '0.78rem', opacity: isActing ? 0.5 : 1,
                                                    }}>
                                                        <Ban size={14} /> Release Funds
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
                Fund block confirmations are cross-verified with the central banking ledger.
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

export default FundBlockConfirmation;
