import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { TopNavbar } from '../../components/TopNavbar';
import {
    Landmark, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, Clock, ChevronDown,
    ChevronUp, ShieldCheck, Hash, Ban, DollarSign, Check
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
            case 'blocked': return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' };
            case 'released': return { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38BDF8' };
            case 'failed': return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' };
            default: return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' };
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
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            <TopNavbar 
                title="ASBA Fund Lock Confirmation" 
                subtitle="Verify and confirm banking escrow locks against core banking system records"
                showLogo={false}
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
                customRight={
                    <button onClick={fetchFundBlocks} className="btn-dark-pill" style={{ fontSize: '0.8rem' }}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                }
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Search */}
                <div className="digi-card p-4 mb-6" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>
                        {loading ? 'Loading...' : `${filteredBlocks.length} escrow block${filteredBlocks.length !== 1 ? 's' : ''}`}
                    </div>
                    <div style={{ position: 'relative', minWidth: 260 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            placeholder="Search by ID, wallet, bank ref..."
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
                ) : filteredBlocks.length === 0 ? (
                    <div className="digi-card p-12 flex flex-col items-center justify-center text-center">
                        <Landmark size={48} style={{ marginBottom: '1rem', color: '#64748B' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No pending ASBA fund block requests at this time.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredBlocks.map(fb => {
                            const sc = statusStyle(fb.status);
                            const isExpanded = expandedBlock === fb.id;
                            const isActing = actionLoading === fb.id;
                            const isPending = !fb.bankConfirmed && fb.status !== 'released' && fb.status !== 'failed';

                            return (
                                <div key={fb.id} className="digi-card" style={{ padding: 0, overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                                    {/* Main Row */}
                                    <div
                                        onClick={() => setExpandedBlock(isExpanded ? null : fb.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '1.25rem 1.5rem', cursor: 'pointer', flexWrap: 'wrap', gap: '1rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: 44, height: 44, borderRadius: '10px',
                                                background: 'rgba(2,132,199,0.12)', border: '1px solid rgba(2,132,199,0.3)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#38BDF8', flexShrink: 0,
                                            }}>
                                                <Landmark size={20} />
                                            </div>

                                            <div>
                                                <p style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.95rem', margin: 0 }}>
                                                    ₹{fb.blockAmount ? fb.blockAmount.toLocaleString('en-IN') : '0'}
                                                    <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8, fontSize: '0.825rem', fontFamily: 'JetBrains Mono' }}>
                                                        Ref: {fb.bankReferenceId || 'Pending Input'}
                                                    </span>
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                                        Buyer: <code style={{ fontFamily: 'JetBrains Mono', color: '#F8FAFC' }}>{shortenWallet(fb.buyerWallet)}</code>
                                                    </span>
                                                    <span style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'JetBrains Mono' }}>
                                                        Sale ID: {shortenId(fb.transactionId)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                                padding: '0.25rem 0.65rem', borderRadius: '6px',
                                                background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                            }}>
                                                {fb.bankConfirmed ? 'Bank Confirmed' : fb.status}
                                            </span>

                                            {isPending && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="text"
                                                        placeholder="Enter Bank Ref ID..."
                                                        value={bankRefInput[fb.id] || ''}
                                                        onChange={(e) => setBankRefInput({ ...bankRefInput, [fb.id]: e.target.value })}
                                                        className="input-premium"
                                                        style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', width: 160 }}
                                                    />
                                                    <button
                                                        onClick={() => handleConfirm(fb.id)}
                                                        disabled={isActing}
                                                        className="btn-cyan-glow"
                                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    >
                                                        {isActing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                        Confirm Lock
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                                <DetailField label="Escrow Block ID" value={fb.id} mono />
                                                <DetailField label="Sale Agreement ID" value={fb.transactionId || '—'} mono />
                                                <DetailField label="Blocked Amount" value={`₹${fb.blockAmount ? fb.blockAmount.toLocaleString('en-IN') : '0'}`} />
                                                <DetailField label="Currency" value={fb.currency} />
                                                <DetailField label="Buyer Wallet Address" value={fb.buyerWallet || '—'} mono />
                                                <DetailField label="Bank Reference Code" value={fb.bankReferenceId || 'Not linked'} mono />
                                                <DetailField label="Bank Officer ID" value={fb.bankUserId || 'Automated Gateway'} />
                                                <DetailField label="Request Timestamp" value={fb.blockedAt ? new Date(fb.blockedAt).toLocaleString() : '—'} />
                                            </div>

                                            {fb.bankConfirmed && (
                                                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button
                                                        onClick={() => handleRelease(fb.id)}
                                                        disabled={isActing}
                                                        className="btn-cyan-outline"
                                                        style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
                                                    >
                                                        Release Funds to Buyer
                                                    </button>
                                                </div>
                                            )}
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

export default FundBlockConfirmation;
