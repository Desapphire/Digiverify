import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import RiskAnalysisWidget from '../../components/RiskAnalysisWidget';
import {
    Activity, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, ArrowRight,
    ChevronDown, ChevronUp, ShieldCheck, Clock,
    Ban, Landmark, Hash, FileCheck, BrainCircuit,
    ArrowLeft, Check, Copy, UserCheck, AlertTriangle,
    BadgeDollarSign, Sparkles, Building2, Shield, AlertCircle
} from 'lucide-react';

const SaleApproval = () => {
    const navigate = useNavigate();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSale, setExpandedSale] = useState(null);
    const [copiedField, setCopiedField] = useState(null);

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

    useEffect(() => {
        fetchSales();
    }, []);

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const openActionModal = (saleId, type) => {
        setActionModal({ isOpen: true, type, saleId, error: '' });
        setActionReason('');
    };

    const confirmAction = async () => {
        const { saleId, type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (!trimmedReason && type !== 'approve') {
            setActionModal(prev => ({ ...prev, error: `An explanation is required to ${type} this sale.` }));
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
            await fetchSales();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleComplete = async (saleId) => {
        if (!window.confirm('Transfer property title to the buyer and release payment to the seller?')) return;
        setActionLoading(saleId);
        try {
            await adminService.completeSale(saleId);
            await fetchSales();
        } catch (err) {
            alert(err.response?.data?.message || 'Sale completion failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.slice(0, 8) : '—';

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0'
                    }}>
                        <CheckCircle2 size={12} style={{ color: '#059669' }} />
                        Completed
                    </span>
                );
            case 'cancelled':
            case 'expired':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#FEF2F2',
                        color: '#991B1B',
                        border: '1px solid #FECACA'
                    }}>
                        <XCircle size={12} style={{ color: '#DC2626' }} />
                        {status === 'expired' ? 'Expired' : 'Cancelled'}
                    </span>
                );
            case 'authority_approved':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#EFF6FF',
                        color: '#1E40AF',
                        border: '1px solid #BFDBFE'
                    }}>
                        <CheckCircle2 size={12} style={{ color: '#2563EB' }} />
                        Approved
                    </span>
                );
            case 'funds_blocked':
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#FAF5FF',
                        color: '#6B21A8',
                        border: '1px solid #E9D5FF'
                    }}>
                        <Landmark size={12} style={{ color: '#9333EA' }} />
                        Payment Held
                    </span>
                );
            default:
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: '#FEF3C7',
                        color: '#92400E',
                        border: '1px solid #FDE68A'
                    }}>
                        <Clock size={12} style={{ color: '#D97706' }} />
                        {status ? status.replace(/_/g, ' ') : 'Pending Review'}
                    </span>
                );
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

    const pendingCount = sales.filter(s => s.status !== 'completed' && s.status !== 'cancelled' && s.status !== 'expired').length;
    const completedCount = sales.filter(s => s.status === 'completed').length;
    const cancelledCount = sales.filter(s => s.status === 'cancelled').length;

    const FILTERS = [
        { key: '', label: 'All Sales', count: sales.length },
        { key: 'pending', label: 'Pending', count: pendingCount },
        { key: 'completed', label: 'Completed', count: completedCount },
        { key: 'rejected', label: 'Cancelled', count: cancelledCount },
    ];

    return (
        <div style={{ width: '100%' }}>
            {/* Header section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1.25rem',
                marginBottom: '1.75rem',
                backgroundColor: '#FFFFFF',
                padding: '1.5rem 1.75rem',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}>
                            <FileCheck size={12} />
                            Sale Approvals
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Sale Approvals
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Review signatures, verify bank payments, and complete property title transfers.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={fetchSales}
                        disabled={loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                    >
                        <RefreshCcw size={15} className={loading ? 'animate-spin' : ''} style={{ color: '#2563EB' }} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.75rem'
            }}>
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563EB',
                        flexShrink: 0
                    }}>
                        <FileCheck size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Total Sales
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {sales.length}
                        </div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#D97706',
                        flexShrink: 0
                    }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Pending Review
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {pendingCount}
                        </div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#059669',
                        flexShrink: 0
                    }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Completed
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {completedCount}
                        </div>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '10px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#DC2626',
                        flexShrink: 0
                    }}>
                        <XCircle size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Cancelled
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {cancelledCount}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Pills & Search Control Card */}
            <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    marginBottom: '1rem'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {FILTERS.map(f => {
                            const isActive = filter === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => setFilter(f.key)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        border: isActive ? '1px solid #1E3A8A' : '1px solid #E2E8F0',
                                        backgroundColor: isActive ? '#0F172A' : '#F8FAFC',
                                        color: isActive ? '#FFFFFF' : '#475569',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <span>{f.label}</span>
                                    <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: '9999px',
                                        backgroundColor: isActive ? '#2563EB' : '#E2E8F0',
                                        color: isActive ? '#FFFFFF' : '#334155'
                                    }}>
                                        {f.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
                        Showing {filteredSales.length} of {sales.length} sales
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    boxSizing: 'border-box',
                    position: 'relative'
                }}>
                    <Search size={18} style={{ color: '#64748B', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Search by sale ID, buyer, seller, or property ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            fontSize: '0.875rem',
                            color: '#0F172A',
                            boxShadow: 'none'
                        }}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 600
                            }}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content List */}
            {loading && !sales.length ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 2rem',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0'
                }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#2563EB', marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                        Loading sales...
                    </p>
                </div>
            ) : filteredSales.length === 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4rem 2rem',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '12px',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748B',
                        marginBottom: '1rem'
                    }}>
                        <FileCheck size={26} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        No sales found
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, maxWidth: '400px' }}>
                        {searchQuery
                            ? `No records match "${searchQuery}". Try searching by account or sale ID.`
                            : 'There are currently no property sales in this category.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredSales.map(sale => {
                        const isExpanded = expandedSale === sale.id;
                        const isActionExecuting = actionLoading === sale.id;

                        // Calculate detailed price and statutory revenue metrics
                        const rawPrice = Number(sale.salePrice ?? sale.sale_price ?? sale.price ?? 0);
                        const hasPrice = !isNaN(rawPrice) && rawPrice > 0;
                        const formattedPrice = hasPrice ? rawPrice.toLocaleString('en-IN') : '—';
                        const fairPrice = Number(sale.estimatedFairPrice ?? sale.estimated_fair_price ?? 0);
                        const hasFairPrice = !isNaN(fairPrice) && fairPrice > 0;
                        const stampDuty = hasPrice ? Math.round(rawPrice * 0.05) : 0;
                        const regFee = hasPrice ? Math.round(rawPrice * 0.01) : 0;
                        const totalRevenue = stampDuty + regFee;

                        const formatLakhsCr = (val) => {
                            if (!val || isNaN(val)) return '';
                            if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
                            if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
                            return `₹${val.toLocaleString('en-IN')}`;
                        };

                        return (
                            <div
                                key={sale.id}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: isExpanded ? '1px solid #94A3B8' : '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    boxShadow: isExpanded ? '0 4px 14px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Card Primary Header */}
                                <div style={{
                                    padding: '1.25rem 1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    flexWrap: 'wrap',
                                    gap: '1rem',
                                    borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                                    backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '10px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#1D4ED8',
                                            flexShrink: 0
                                        }}>
                                            <FileCheck size={22} />
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: '0.82rem',
                                                    fontWeight: 800,
                                                    fontFamily: 'var(--font-mono, monospace)',
                                                    color: '#0F172A',
                                                    backgroundColor: '#F1F5F9',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #E2E8F0'
                                                }}>
                                                    SALE #{shortenId(sale.id)}
                                                </span>

                                                {/* Prominent Agreed Price Pill */}
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    backgroundColor: '#EFF6FF',
                                                    border: '1px solid #BFDBFE',
                                                    padding: '3px 10px',
                                                    borderRadius: '6px'
                                                }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Agreed Price:</span>
                                                    <span style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1E3A8A' }}>
                                                        ₹{formattedPrice}
                                                    </span>
                                                    {hasPrice && rawPrice >= 100000 && (
                                                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB' }}>
                                                            ({formatLakhsCr(rawPrice)})
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Escrow Status Tag */}
                                                {sale.fundsBlocked ? (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        backgroundColor: '#ECFDF5',
                                                        color: '#059669',
                                                        border: '1px solid #A7F3D0',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        <CheckCircle2 size={12} /> Escrow Funded
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        fontSize: '0.72rem',
                                                        fontWeight: 700,
                                                        backgroundColor: '#FFFBEB',
                                                        color: '#D97706',
                                                        border: '1px solid #FDE68A',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        <Clock size={12} /> Escrow Pending
                                                    </span>
                                                )}

                                                {getStatusBadge(sale.status)}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginTop: '6px',
                                                fontSize: '0.8rem',
                                                color: '#64748B',
                                                flexWrap: 'wrap'
                                            }}>
                                                {sale.surveyNumber && (
                                                    <span>
                                                        Survey: <strong style={{ color: '#0F172A' }}>#{sale.surveyNumber}</strong>
                                                    </span>
                                                )}
                                                {sale.district && (
                                                    <span>
                                                        Location: <strong style={{ color: '#0F172A' }}>{sale.district}, {sale.state}</strong>
                                                    </span>
                                                )}
                                                {sale.areaSqft && (
                                                    <span>
                                                        Area: <strong style={{ color: '#0F172A' }}>{sale.areaSqft.toLocaleString('en-IN')} sq.ft.</strong>
                                                    </span>
                                                )}
                                                <span>
                                                    Seller: <code style={{ fontSize: '0.75rem', color: '#0F172A' }}>{shortenWallet(sale.sellerWallet)}</code>
                                                </span>
                                                <span>→</span>
                                                <span>
                                                    Buyer: <code style={{ fontSize: '0.75rem', color: '#0F172A' }}>{shortenWallet(sale.buyerWallet)}</code>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {/* Authority Sign button */}
                                        {!sale.authoritySigned && sale.status !== 'completed' && sale.status !== 'cancelled' && (
                                            <>
                                                <button
                                                    onClick={() => openActionModal(sale.id, 'approve')}
                                                    disabled={isActionExecuting}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 14px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#047857',
                                                        color: '#FFFFFF',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        border: '1px solid #047857',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#065F46'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#047857'; }}
                                                >
                                                    <CheckCircle2 size={14} />
                                                    Approve Sale
                                                </button>

                                                <button
                                                    onClick={() => openActionModal(sale.id, 'reject')}
                                                    disabled={isActionExecuting}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 14px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#FFFFFF',
                                                        color: '#DC2626',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        border: '1px solid #FECACA',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                                                >
                                                    <XCircle size={14} />
                                                    Reject
                                                </button>
                                            </>
                                        )}

                                        {/* Final complete execution */}
                                        {sale.authoritySigned && sale.status !== 'completed' && sale.status !== 'cancelled' && (
                                            <button
                                                onClick={() => handleComplete(sale.id)}
                                                disabled={isActionExecuting}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '7px 14px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#1E3A8A',
                                                    color: '#FFFFFF',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    border: '1px solid #1E3A8A',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                }}
                                            >
                                                <Sparkles size={14} />
                                                Transfer Title
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setExpandedSale(isExpanded ? null : sale.id)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '7px 12px',
                                                borderRadius: '8px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                color: '#334155',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                                        >
                                            {isExpanded ? 'Hide Details' : 'View Details'}
                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Transfer Dossier */}
                                {isExpanded && (
                                    <div style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                            gap: '1.25rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            {/* Column 1: Multi-Sig Signature & Escrow Progress */}
                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '10px',
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.06em',
                                                        color: '#1E3A8A',
                                                        marginBottom: '1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <ShieldCheck size={14} />
                                                        Signatures & Escrow Status
                                                    </div>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                            <span style={{ color: '#475569', fontWeight: 500 }}>Seller Signature:</span>
                                                            <span style={{ fontWeight: 700, color: sale.sellerSigned ? '#059669' : '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {sale.sellerSigned ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                                                {sale.sellerSigned ? 'Signed' : 'Pending Seller'}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                            <span style={{ color: '#475569', fontWeight: 500 }}>Buyer Signature:</span>
                                                            <span style={{ fontWeight: 700, color: sale.buyerSigned ? '#059669' : '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {sale.buyerSigned ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                                                {sale.buyerSigned ? 'Signed' : 'Pending Buyer'}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                            <span style={{ color: '#475569', fontWeight: 500 }}>Bank Payment:</span>
                                                            <span style={{ fontWeight: 700, color: sale.fundsBlocked ? '#059669' : '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {sale.fundsBlocked ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                                                {sale.fundsBlocked ? 'Payment Confirmed' : 'Pending Bank'}
                                                            </span>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                                                            <span style={{ color: '#475569', fontWeight: 500 }}>Admin Approval:</span>
                                                            <span style={{ fontWeight: 700, color: sale.authoritySigned ? '#059669' : '#D97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {sale.authoritySigned ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                                                {sale.authoritySigned ? 'Approved' : 'Pending Approval'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Property Dossier */}
                                                <div style={{ marginTop: '1.25rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                                                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#1E3A8A', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                                                        <Building2 size={13} />
                                                        Cadastral & Parcel Details
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                        <span style={{ color: '#64748B' }}>Survey Number:</span>
                                                        <span style={{ fontWeight: 700, color: '#0F172A' }}>#{sale.surveyNumber || '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                        <span style={{ color: '#64748B' }}>District, State:</span>
                                                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{sale.district ? `${sale.district}, ${sale.state}` : '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                        <span style={{ color: '#64748B' }}>Parcel Area:</span>
                                                        <span style={{ fontWeight: 600, color: '#0F172A' }}>{sale.areaSqft ? `${sale.areaSqft.toLocaleString('en-IN')} sq.ft.` : '—'}</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                                        <span style={{ color: '#64748B' }}>NFT Asset ID:</span>
                                                        <span style={{ fontWeight: 700, color: sale.nftTokenId ? '#2563EB' : '#64748B' }}>
                                                            {sale.nftTokenId ? `Token #${sale.nftTokenId}` : 'Pre-Mint / Conveyance'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column 2: Comprehensive Financial Consideration & Parties */}
                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '10px',
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between'
                                            }}>
                                                <div>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.06em',
                                                        color: '#1E3A8A',
                                                        marginBottom: '1rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <Landmark size={14} />
                                                        Financial Breakdown & State Revenue
                                                    </div>

                                                    {/* Primary Consideration Card */}
                                                    <div style={{
                                                        backgroundColor: '#EFF6FF',
                                                        border: '1px solid #BFDBFE',
                                                        borderRadius: '8px',
                                                        padding: '10px 14px',
                                                        marginBottom: '0.85rem'
                                                    }}>
                                                        <div style={{ fontSize: '0.68rem', color: '#1E40AF', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                            Agreed Sale Consideration
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                                                            <span style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1E3A8A' }}>
                                                                ₹{formattedPrice}
                                                            </span>
                                                            {hasPrice && rawPrice >= 100000 && (
                                                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#2563EB' }}>
                                                                    ({formatLakhsCr(rawPrice)})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Statutory Dues Breakdown */}
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '0.45rem',
                                                        padding: '10px 12px',
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #E2E8F0',
                                                        borderRadius: '8px',
                                                        marginBottom: '0.85rem'
                                                    }}>
                                                        <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B', borderBottom: '1px solid #F1F5F9', paddingBottom: '4px' }}>
                                                            Statutory Government Dues (Estimated)
                                                        </div>
                                                        
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                                                            <span style={{ color: '#475569' }}>Stamp Duty (5%):</span>
                                                            <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{stampDuty.toLocaleString('en-IN')}</span>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                                                            <span style={{ color: '#475569' }}>Registration Fee (1%):</span>
                                                            <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{regFee.toLocaleString('en-IN')}</span>
                                                        </div>

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px dashed #E2E8F0', paddingTop: '4px' }}>
                                                            <span style={{ fontWeight: 700, color: '#1E40AF' }}>Total State Revenue:</span>
                                                            <span style={{ fontWeight: 800, color: '#1E40AF' }}>₹{totalRevenue.toLocaleString('en-IN')}</span>
                                                        </div>

                                                        {hasFairPrice && (
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '4px', color: '#64748B' }}>
                                                                <span>Guideline Valuation:</span>
                                                                <span style={{ fontWeight: 600, color: '#334155' }}>₹{fairPrice.toLocaleString('en-IN')}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Escrow Deposit Badge */}
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 12px',
                                                        borderRadius: '8px',
                                                        backgroundColor: sale.fundsBlocked ? '#ECFDF5' : '#FFFBEB',
                                                        border: sale.fundsBlocked ? '1px solid #A7F3D0' : '1px solid #FDE68A',
                                                        fontSize: '0.78rem'
                                                    }}>
                                                        <span style={{ color: sale.fundsBlocked ? '#065F46' : '#92400E', fontWeight: 600 }}>Escrow Deposit:</span>
                                                        <span style={{ fontWeight: 800, color: sale.fundsBlocked ? '#047857' : '#B45309', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            {sale.fundsBlocked ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                                                            {sale.fundsBlocked ? `₹${formattedPrice} Locked` : 'Awaiting Lock'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Parties Wallets */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Seller Account</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            <code style={{ fontSize: '0.75rem', color: '#0F172A', backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>{sale.sellerWallet}</code>
                                                            <button
                                                                onClick={() => handleCopy(sale.sellerWallet, `seller-${sale.id}`)}
                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedField === `seller-${sale.id}` ? '#059669' : '#64748B' }}
                                                            >
                                                                {copiedField === `seller-${sale.id}` ? <Check size={12} /> : <Copy size={12} />}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Buyer Account</div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            <code style={{ fontSize: '0.75rem', color: '#0F172A', backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>{sale.buyerWallet}</code>
                                                            <button
                                                                onClick={() => handleCopy(sale.buyerWallet, `buyer-${sale.id}`)}
                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedField === `buyer-${sale.id}` ? '#059669' : '#64748B' }}
                                                            >
                                                                {copiedField === `buyer-${sale.id}` ? <Check size={12} /> : <Copy size={12} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column 3: AI / Risk Analysis Widget */}
                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '10px',
                                                padding: '1.25rem'
                                            }}>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.06em',
                                                    color: '#1E3A8A',
                                                    marginBottom: '1rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <BrainCircuit size={14} />
                                                    AI Risk Assessment
                                                </div>

                                                <RiskAnalysisWidget
                                                    saleId={sale.id}
                                                    propertyId={sale.propertyId}
                                                    initialData={sale.riskReport}
                                                />
                                            </div>
                                        </div>

                                        {/* Security & Audit notice */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '10px 14px',
                                            backgroundColor: '#F1F5F9',
                                            borderRadius: '8px',
                                            border: '1px solid #E2E8F0',
                                            fontSize: '0.78rem',
                                            color: '#475569'
                                        }}>
                                            <ShieldCheck size={16} style={{ color: '#059669', flexShrink: 0 }} />
                                            <span>
                                                <strong>Transfer Notice:</strong> Completing this sale transfers the legal property title to the buyer and records it permanently.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Action Reasoning Dialog Modal */}
            {actionModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '520px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '14px',
                        padding: '1.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        border: '1px solid #CBD5E1'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                            {actionModal.type === 'approve' ? (
                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                                    <CheckCircle2 size={20} />
                                </div>
                            ) : (
                                <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                                    <XCircle size={20} />
                                </div>
                            )}

                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                    {actionModal.type === 'approve' ? 'Approve Sale' : 'Reject Sale'}
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, marginTop: '2px' }}>
                                    {actionModal.type === 'approve' ? 'Confirm buyer and seller signatures and bank payment status before approving.' : 'Provide a clear reason for rejecting this sale.'}
                                </p>
                            </div>
                        </div>

                        <div style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#334155', display: 'block', marginBottom: '6px' }}>
                                {actionModal.type === 'approve' ? 'Notes (Optional):' : 'Reason for Rejection:'}
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder={actionModal.type === 'approve' ? 'E.g., All required details and documents verified.' : 'Enter rejection reason...'}
                                style={{
                                    width: '100%',
                                    minHeight: '100px',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: '#F8FAFC',
                                    fontSize: '0.875rem',
                                    color: '#0F172A',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {actionModal.error && (
                            <div style={{
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                color: '#991B1B',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                marginBottom: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <AlertCircle size={15} />
                                {actionModal.error}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => setActionModal({ isOpen: false, type: '', saleId: null, error: '' })}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    color: '#334155',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={confirmAction}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    backgroundColor: actionModal.type === 'approve' ? '#047857' : '#DC2626',
                                    border: 'none',
                                    color: '#FFFFFF',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                            >
                                {actionModal.type === 'approve' ? 'Approve Sale' : 'Reject Sale'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaleApproval;
