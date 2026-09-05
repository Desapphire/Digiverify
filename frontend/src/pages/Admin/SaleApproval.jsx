import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { TopNavbar } from '../../components/TopNavbar';
import {
    Activity, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, ArrowRight,
    ChevronDown, ChevronUp, ShieldCheck, Clock,
    Ban, Landmark, Hash, FileCheck, Check
} from 'lucide-react';

const SaleApproval = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSale, setExpandedSale] = useState(null);

    // Modal state for Action Reasoning
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', saleId: null, error: '' });
    const [actionReason, setActionReason] = useState('');

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await adminService.listSales();
            setSales(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch sales:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSales(); }, []);

    const openActionModal = (saleId, type) => {
        setActionModal({ isOpen: true, type, saleId, error: '' });
        setActionReason('');
    };

    const confirmAction = async () => {
        const { saleId, type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (!trimmedReason) {
            setActionModal(prev => ({ ...prev, error: `A reason is required to ${type} this sale.` }));
            return;
        }

        setActionLoading(saleId);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveSale(saleId, trimmedReason);
            } else if (type === 'reject') {
                await adminService.rejectSale(saleId, trimmedReason);
            }
            fetchSales();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleComplete = async (saleId) => {
        if (!window.confirm('Complete this sale? This will transfer ownership on-chain.')) return;
        setActionLoading(saleId);
        try {
            await adminService.completeSale(saleId);
            fetchSales();
        } catch (err) {
            alert(err.response?.data?.message || 'Completion failed');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.slice(0, 8) : '—';

    const statusStyle = (status) => {
        switch (status) {
            case 'completed': return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' };
            case 'cancelled': case 'expired': return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' };
            case 'authority_approved': return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' };
            case 'funds_blocked': return { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38BDF8' };
            default: return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' };
        }
    };

    const filteredSales = sales.filter(s => {
        if (filter === 'pending') {
            if (s.status === 'completed' || s.status === 'cancelled' || s.status === 'expired') return false;
        } else if (filter === 'completed') {
            if (s.status !== 'completed') return false;
        } else if (filter === 'rejected') {
            if (s.status !== 'cancelled') return false;
        }
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (s.id || '').toLowerCase().includes(q) ||
            (s.sellerWallet || '').toLowerCase().includes(q) ||
            (s.buyerWallet || '').toLowerCase().includes(q) ||
            (s.propertyId || '').toLowerCase().includes(q)
        );
    });

    const FILTERS = [
        { key: '', label: 'All Transactions' },
        { key: 'pending', label: 'In Escrow / Pending' },
        { key: 'completed', label: 'Completed' },
        { key: 'rejected', label: 'Cancelled' },
    ];

    const CheckItem = ({ checked, label, sub }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.85rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B' }}>
            {checked
                ? <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />
                : <Clock size={16} style={{ color: '#64748B', flexShrink: 0 }} />
            }
            <div>
                <p style={{ fontSize: '0.825rem', fontWeight: 600, color: checked ? '#F8FAFC' : '#64748B', margin: 0 }}>{label}</p>
                {sub && <p style={{ fontSize: '0.7rem', color: '#64748B', margin: 0 }}>{sub}</p>}
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            <TopNavbar 
                title="Sale Approvals" 
                subtitle="Review, approve, and seal on-chain property multi-sig settlements"
                showLogo={false}
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
                customRight={
                    <button onClick={fetchSales} className="btn-dark-pill" style={{ fontSize: '0.8rem' }}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                }
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Filters + Search */}
                <div 
                    className="digi-card p-4 mb-6" 
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}
                >
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => (
                            <button 
                                key={f.key} 
                                onClick={() => setFilter(f.key)} 
                                style={{
                                    padding: '0.45rem 1rem', 
                                    borderRadius: '8px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: 600,
                                    border: filter === f.key ? '1px solid #0284C7' : '1px solid transparent',
                                    background: filter === f.key ? 'rgba(2,132,199,0.15)' : 'transparent',
                                    color: filter === f.key ? '#38BDF8' : '#94A3B8', 
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative', minWidth: 260 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input 
                            type="text" 
                            placeholder="Search by ID, wallet, property..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium" 
                            style={{ paddingLeft: 36, fontSize: '0.85rem' }} 
                        />
                    </div>
                </div>

                {/* Count */}
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>
                    {loading ? 'Loading...' : `${filteredSales.length} transaction${filteredSales.length !== 1 ? 's' : ''} on record`}
                </div>

                {/* Sale List */}
                {loading ? (
                    <div className="digi-card p-12 flex items-center justify-center">
                        <Loader2 size={36} className="animate-spin" style={{ color: '#0284C7' }} />
                    </div>
                ) : filteredSales.length === 0 ? (
                    <div className="digi-card p-12 flex flex-col items-center justify-center text-center">
                        <FileCheck size={48} style={{ marginBottom: '1rem', color: '#64748B' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No sale transactions match the selected filter.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredSales.map(s => {
                            const sc = statusStyle(s.status);
                            const isExpanded = expandedSale === s.id;
                            const isActing = actionLoading === s.id;

                            return (
                                <div key={s.id} className="digi-card" style={{ padding: 0, overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                                    {/* Main Row */}
                                    <div
                                        onClick={() => setExpandedSale(isExpanded ? null : s.id)}
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
                                                <Activity size={20} />
                                            </div>

                                            <div>
                                                <p style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.95rem', margin: 0, fontFamily: 'JetBrains Mono' }}>
                                                    TX-{shortenId(s.id).toUpperCase()}
                                                    <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8, fontSize: '0.825rem', fontFamily: 'Inter' }}>
                                                        ₹{s.salePrice ? Number(s.salePrice).toLocaleString('en-IN') : '—'}
                                                    </span>
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                                        Seller: <code style={{ fontFamily: 'JetBrains Mono', color: '#F8FAFC' }}>{shortenWallet(s.sellerWallet)}</code>
                                                    </span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                                        Buyer: <code style={{ fontFamily: 'JetBrains Mono', color: '#F8FAFC' }}>{shortenWallet(s.buyerWallet)}</code>
                                                    </span>
                                                    {s.propertyCode && (
                                                        <span style={{ fontSize: '0.8rem', color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>
                                                            {s.propertyCode}
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
                                                {s.status?.replace('_', ' ') || 'unknown'}
                                            </span>

                                            {/* Action Buttons */}
                                            {s.status === 'funds_blocked' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => openActionModal(s.id, 'approve')}
                                                        disabled={isActing}
                                                        className="btn-cyan-glow"
                                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    >
                                                        {isActing && actionModal.type === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                        Approve Sale
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal(s.id, 'reject')}
                                                        disabled={isActing}
                                                        className="btn-cyan-outline"
                                                        style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                    >
                                                        {isActing && actionModal.type === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                                        Reject
                                                    </button>
                                                </div>
                                            )}

                                            {s.status === 'authority_approved' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleComplete(s.id); }}
                                                    disabled={isActing}
                                                    className="btn-cyan-glow"
                                                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', background: '#10B981', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                >
                                                    {isActing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                    Seal On-Chain
                                                </button>
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
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                                <DetailField label="Transaction ID" value={s.id} mono />
                                                <DetailField label="Agreed Price" value={`₹${s.salePrice ? Number(s.salePrice).toLocaleString('en-IN') : '—'}`} />
                                                <DetailField label="Property UUID" value={s.propertyId || '—'} mono />
                                                <DetailField label="Seller Address" value={s.sellerWallet || '—'} mono />
                                                <DetailField label="Buyer Address" value={s.buyerWallet || '—'} mono />
                                                <DetailField label="Escrow Bank Reference" value={s.bankReferenceId || 'Not linked'} mono />
                                                <DetailField label="Agreement Created" value={s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'} />
                                                <DetailField label="Last Updated" value={s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—'} />
                                            </div>

                                            {/* Multi-Sig Stepper Summary */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                                                <CheckItem checked={!!s.sellerSigned} label="Seller Cryptographic Signature" sub={s.sellerSignedAt ? new Date(s.sellerSignedAt).toLocaleString() : 'Pending'} />
                                                <CheckItem checked={!!s.buyerSigned} label="Buyer Cryptographic Signature" sub={s.buyerSignedAt ? new Date(s.buyerSignedAt).toLocaleString() : 'Pending'} />
                                                <CheckItem checked={!!s.fundsBlocked} label="ASBA Bank Escrow Lock" sub={s.fundsBlockedAt ? new Date(s.fundsBlockedAt).toLocaleString() : 'Pending'} />
                                                <CheckItem checked={!!s.authoritySigned} label="Registrar Multi-Sig Seal" sub={s.authoritySignedAt ? new Date(s.authoritySignedAt).toLocaleString() : 'Pending'} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Action Reasoning Modal */}
                {actionModal.isOpen && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1.5rem'
                    }}>
                        <div className="digi-card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: '#F8FAFC' }}>
                                {actionModal.type === 'approve' ? 'Approve Property Sale' : 'Reject Property Sale'}
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Please provide an official note for the land registry audit trail.
                            </p>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter administrative note..."
                                className="input-premium"
                                style={{ width: '100%', minHeight: 100, marginBottom: '1rem', resize: 'vertical', fontSize: '0.85rem' }}
                            />
                            {actionModal.error && (
                                <div style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                    {actionModal.error}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setActionModal({ isOpen: false, type: '', saleId: null, error: '' })}
                                    className="btn-cyan-outline"
                                    style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className="btn-cyan-glow"
                                    style={{
                                        padding: '0.55rem 1.25rem', fontSize: '0.85rem',
                                        background: actionModal.type === 'approve' ? '#0284C7' : '#DC2626'
                                    }}
                                    disabled={!actionReason.trim()}
                                >
                                    Confirm {actionModal.type === 'approve' ? 'Approval' : 'Rejection'}
                                </button>
                            </div>
                        </div>
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

export default SaleApproval;
