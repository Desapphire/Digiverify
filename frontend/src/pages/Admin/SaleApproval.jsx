import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Activity, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, ArrowRight,
    ChevronDown, ChevronUp, ShieldCheck, Clock,
    Ban, Landmark, Hash, FileCheck
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
            case 'completed': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' };
            case 'cancelled': case 'expired': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' };
            case 'authority_approved': return { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6' };
            case 'funds_blocked': return { bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', text: '#a78bfa' };
            default: return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: '#eab308' };
        }
    };

    const filteredSales = sales.filter(s => {
        // Status filter
        if (filter === 'pending') {
            if (s.status === 'completed' || s.status === 'cancelled' || s.status === 'expired') return false;
        } else if (filter === 'completed') {
            if (s.status !== 'completed') return false;
        } else if (filter === 'rejected') {
            if (s.status !== 'cancelled') return false;
        }
        // Text search
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
        { key: '', label: 'All' },
        { key: 'pending', label: 'Active/Pending' },
        { key: 'completed', label: 'Completed' },
        { key: 'rejected', label: 'Cancelled' },
    ];

    const CheckItem = ({ checked, label, sub }) => (
        <div className="flex items-center gap-3" style={{ padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.04)' }}>
            {checked
                ? <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                : <Clock size={16} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
            }
            <div>
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: checked ? 'white' : 'rgba(255,255,255,0.4)' }}>{label}</p>
                {sub && <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
            </div>
        </div>
    );

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        Sale Transaction <span className="text-gradient">Approval</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Review, approve, or reject property sale transactions.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>← Back</button>
                    <button onClick={fetchSales} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}><RefreshCcw size={14} /> Refresh</button>
                </div>
            </div>

            {/* Filters + Search */}
            <div className="glass-panel p-4 mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => setFilter(f.key)} style={{
                            padding: '0.4rem 1rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 700,
                            border: filter === f.key ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.05)',
                            background: filter === f.key ? 'rgba(220,38,38,0.12)' : 'rgba(0,0,0,0.2)',
                            color: filter === f.key ? '#fca5a5' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
                        }}>{f.label}</button>
                    ))}
                </div>
                <div style={{ position: 'relative', minWidth: 220 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input type="text" placeholder="Search by ID, wallet, property..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium" style={{ paddingLeft: 34, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 34px' }} />
                </div>
            </div>

            {/* Count */}
            <div style={{ marginBottom: '1rem', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                {loading ? 'Loading...' : `${filteredSales.length} transaction${filteredSales.length !== 1 ? 's' : ''} found`}
            </div>

            {/* Sale List */}
            {loading ? (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            ) : filteredSales.length === 0 ? (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <Activity size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No sale transactions match the current filter.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredSales.map(tx => {
                        const sc = statusStyle(tx.status);
                        const isExpanded = expandedSale === tx.id;
                        const isActing = actionLoading === tx.id;
                        const canApprove = tx.fundsBlocked && !tx.authoritySigned && tx.status !== 'completed' && tx.status !== 'cancelled';
                        const canComplete = tx.authoritySigned && tx.buyerSigned && tx.sellerSigned && tx.fundsBlocked && tx.status !== 'completed' && tx.status !== 'cancelled';
                        const canReject = tx.status !== 'completed' && tx.status !== 'cancelled';

                        return (
                            <div key={tx.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Main Row */}
                                <div onClick={() => setExpandedSale(isExpanded ? null : tx.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer' }}>
                                    <div className="flex items-center gap-4">
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '12px',
                                            background: sc.bg, border: `1px solid ${sc.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: sc.text, flexShrink: 0,
                                        }}>
                                            <Activity size={20} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>
                                                Sale #{shortenId(tx.id)}
                                                <span style={{ fontWeight: 600, color: '#a78bfa', marginLeft: 10, fontSize: '0.88rem' }}>
                                                    ₹{tx.salePrice?.toLocaleString()}
                                                </span>
                                            </p>
                                            <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
                                                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                                    {shortenWallet(tx.sellerWallet)}
                                                </span>
                                                <ArrowRight size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                                    {shortenWallet(tx.buyerWallet)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {/* Signing indicators */}
                                        <div className="flex items-center gap-1">
                                            <span title="Buyer Signed" style={{ width: 8, height: 8, borderRadius: '50%', background: tx.buyerSigned ? '#22c55e' : 'rgba(255,255,255,0.1)', display: 'inline-block' }}></span>
                                            <span title="Seller Signed" style={{ width: 8, height: 8, borderRadius: '50%', background: tx.sellerSigned ? '#22c55e' : 'rgba(255,255,255,0.1)', display: 'inline-block' }}></span>
                                            <span title="Authority Signed" style={{ width: 8, height: 8, borderRadius: '50%', background: tx.authoritySigned ? '#ef4444' : 'rgba(255,255,255,0.1)', display: 'inline-block' }}></span>
                                            <span title="Funds Blocked" style={{ width: 8, height: 8, borderRadius: '50%', background: tx.fundsBlocked ? '#a78bfa' : 'rgba(255,255,255,0.1)', display: 'inline-block' }}></span>
                                        </div>

                                        {/* Status Badge */}
                                        <span style={{
                                            fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                            letterSpacing: '0.04em', padding: '3px 10px', borderRadius: '9999px',
                                            background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                        }}>
                                            {tx.status?.replace(/_/g, ' ') || 'pending'}
                                        </span>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            {canApprove && (
                                                <button onClick={() => openActionModal(tx.id, 'approve')} disabled={isActing} style={{
                                                    padding: '0.35rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 700,
                                                    background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)',
                                                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                                }}>
                                                    {isActing && actionModal.type === 'approve' ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Approve
                                                </button>
                                            )}
                                            {canComplete && (
                                                <button onClick={() => handleComplete(tx.id)} disabled={isActing} style={{
                                                    padding: '0.35rem 0.7rem', borderRadius: '0.5rem', fontSize: '0.7rem', fontWeight: 700,
                                                    background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)',
                                                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                                }}>
                                                    <FileCheck size={12} /> Complete
                                                </button>
                                            )}
                                            {canReject && (
                                                <button onClick={() => openActionModal(tx.id, 'reject')} disabled={isActing} className="btn btn-danger" style={{
                                                    padding: '0.35rem 0.7rem', fontSize: '0.7rem', opacity: isActing ? 0.5 : 1,
                                                }}>
                                                    {isActing && actionModal.type === 'reject' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Reject
                                                </button>
                                            )}
                                        </div>

                                        {isExpanded ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                    </div>
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                            {/* Details */}
                                            <div>
                                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Transaction Details</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                    <DetailField label="Transaction ID" value={tx.id} mono />
                                                    <DetailField label="Property ID" value={shortenId(tx.propertyId)} mono />
                                                    <DetailField label="Sale Price" value={`₹${tx.salePrice?.toLocaleString()}`} />
                                                    <DetailField label="Status" value={tx.status?.replace(/_/g, ' ').toUpperCase()} />
                                                    <DetailField label="Seller Wallet" value={tx.sellerWallet || '—'} mono />
                                                    <DetailField label="Buyer Wallet" value={tx.buyerWallet || '—'} mono />
                                                    {tx.txHash && <DetailField label="Tx Hash" value={tx.txHash} mono />}
                                                    <DetailField label="Created" value={tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'} />
                                                    {tx.expiryAt && <DetailField label="Expires" value={new Date(tx.expiryAt).toLocaleString()} />}
                                                </div>
                                            </div>

                                            {/* Checklist */}
                                            <div>
                                                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Completion Checklist</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                    <CheckItem checked={tx.buyerSigned} label="Buyer Signed" sub="Digital signature from buyer" />
                                                    <CheckItem checked={tx.sellerSigned} label="Seller Signed" sub="Digital signature from seller" />
                                                    <CheckItem checked={tx.fundsBlocked} label="Funds Blocked (ASBA)" sub="Bank confirmed fund reservation" />
                                                    <CheckItem checked={tx.authoritySigned} label="Authority Approved" sub="Government authority verification" />
                                                </div>
                                            </div>
                                        </div>
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
                All sale approvals are cryptographically signed and logged on-chain.
            </div>

            {/* Action Reasoning Modal */}
            {actionModal.isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'white', textTransform: 'capitalize' }}>
                            {actionModal.type} Sale
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem' }}>
                            Please provide a reason or note for this decision. This is required for auditing purposes.
                        </p>
                        <textarea
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Enter reasoning..."
                            className="input-premium"
                            style={{ width: '100%', minHeight: 100, marginBottom: '1rem', resize: 'vertical' }}
                        />
                        {actionModal.error && (
                            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                {actionModal.error}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setActionModal({ isOpen: false, type: '', saleId: null, error: '' })}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                className={actionModal.type === 'approve' ? 'btn btn-primary' : 'btn btn-danger'}
                                disabled={!actionReason.trim()}
                            >
                                Confirm Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</p>
    </div>
);

export default SaleApproval;
