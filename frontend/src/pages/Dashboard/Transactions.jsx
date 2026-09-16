import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import {
    ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, AlertTriangle,
    Clock, Loader2, Search, Wallet, Landmark, Shield,
    ChevronRight, Ban, Activity, Filter, FileText
} from 'lucide-react';
import './PropertyPages.css';

const TABS = [
    { key: 'all', label: 'All', icon: FileText },
    { key: 'selling', label: 'Selling', icon: ArrowUpRight },
    { key: 'buying', label: 'Buying', icon: ArrowDownLeft },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

const STATUS_CONFIG = {
    initiated: { label: 'AWAITING BUYER', bg: '#FFFBEB', border: '#FDE68A', icon: Clock, color: '#D97706' },
    buyer_signed: { label: 'BUYER SIGNED', bg: '#EFF6FF', border: '#BFDBFE', icon: Wallet, color: '#2563EB' },
    funds_blocked: { label: 'PAYMENT LOCKED', bg: '#F5F3FF', border: '#DDD6FE', icon: Landmark, color: '#7C3AED' },
    authority_approved: { label: 'APPROVED', bg: '#ECFDF5', border: '#A7F3D0', icon: Shield, color: '#059669' },
    completed: { label: 'COMPLETED', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2, color: '#059669' },
    cancelled: { label: 'CANCELLED', bg: '#FEF2F2', border: '#FECACA', icon: XCircle, color: '#DC2626' },
    expired: { label: 'EXPIRED', bg: '#F1F5F9', border: '#E2E8F0', icon: Ban, color: '#64748B' },
    frozen: { label: 'ON HOLD', bg: '#FEF2F2', border: '#FECACA', icon: AlertTriangle, color: '#DC2626' },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.initiated;

const getNextAction = (sale, walletAddress) => {
    const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress.toLowerCase();
    const isBuyer = walletAddress && sale.buyerWallet?.toLowerCase() === walletAddress.toLowerCase();

    switch (sale.status) {
        case 'initiated':
            if (isBuyer) return { label: 'Review & Sign', path: `/sale/${sale.id}/review`, primary: true };
            if (isSeller) return { label: 'Waiting for Buyer', path: `/sale/${sale.id}/review`, primary: false };
            break;
        case 'buyer_signed':
            if (isBuyer) return { label: 'Lock Payment', path: `/sale/${sale.id}/fund-block`, primary: true };
            if (isSeller) return { label: 'Payment Pending', path: `/sale/${sale.id}/review`, primary: false };
            break;
        case 'funds_blocked':
            return { label: 'Awaiting Approval', path: `/sale/${sale.id}/review`, primary: false };
        case 'authority_approved':
            return { label: isBuyer ? 'Complete Purchase' : 'View Approval', path: `/sale/${sale.id}/review`, primary: isBuyer };
        case 'completed':
            return { label: 'View Details', path: `/sale/${sale.id}/review`, primary: false };
        case 'cancelled':
        case 'expired':
            return { label: 'View Details', path: `/sale/${sale.id}/review`, primary: false };
        default:
            return { label: 'View Details', path: `/sale/${sale.id}/review`, primary: false };
    }
    return { label: 'View Details', path: `/sale/${sale.id}/review`, primary: false };
};

const Transactions = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    const walletAddress = user?.walletAddress;

    useEffect(() => {
        const fetchSales = async () => {
            try {
                setLoading(true);
                const res = await saleService.getMySales();
                setSales(res.data?.data || []);
            } catch (err) {
                console.error('Failed to load transactions', err);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchSales();
    }, [user]);

    const filterByTab = (tab) => {
        return sales.filter(sale => {
            const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress.toLowerCase();
            const isBuyer = walletAddress && sale.buyerWallet?.toLowerCase() === walletAddress.toLowerCase();

            switch (tab) {
                case 'all':
                    return true;
                case 'selling':
                    return isSeller && !['completed', 'cancelled', 'expired', 'frozen'].includes(sale.status);
                case 'buying':
                    return isBuyer && !['completed', 'cancelled', 'expired', 'frozen'].includes(sale.status);
                case 'completed':
                    return sale.status === 'completed';
                case 'cancelled':
                    return sale.status === 'cancelled' || sale.status === 'expired';
                default:
                    return true;
            }
        });
    };

    const filtered = filterByTab(activeTab).filter(sale => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            sale.id?.toString().includes(q) ||
            sale.buyerWallet?.toLowerCase().includes(q) ||
            sale.sellerWallet?.toLowerCase().includes(q) ||
            sale.propertyCode?.toLowerCase().includes(q)
        );
    });

    const tabCounts = {};
    TABS.forEach(tab => {
        tabCounts[tab.key] = filterByTab(tab.key).length;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={36} style={{ color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading Your Transactions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-lg">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <h1 className="page-title">My Transactions</h1>
                    <p className="page-subtitle">
                        Track all your property buying and selling transactions in one place.
                    </p>
                </div>
                <button
                    className="gov-btn gov-btn-primary"
                    onClick={() => navigate('/sale')}
                >
                    <ArrowUpRight size={16} /> Sell a Property
                </button>
            </div>

            {/* Filter / Search Controls */}
            <div className="gov-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div className="cyber-search-wrapper" style={{ maxWidth: '420px', width: '100%' }}>
                        <Search className="cyber-search-icon" size={16} />
                        <input
                            type="text"
                            placeholder="Search by Transaction ID, Property, or Wallet..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="cyber-filter-container">
                        {TABS.map(tab => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    className={`cyber-filter-btn ${isActive ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.key)}
                                >
                                    <TabIcon size={14} />
                                    {tab.label}
                                    <span style={{
                                        background: isActive ? '#1E40AF' : '#E2E8F0',
                                        color: isActive ? '#FFFFFF' : '#475569',
                                        padding: '0.1rem 0.45rem',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        marginLeft: '0.2rem'
                                    }}>
                                        {tabCounts[tab.key]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Transactions Grid */}
            {filtered.length === 0 ? (
                <div className="empty-state">
                    <Activity size={44} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                        No {activeTab === 'all' ? '' : activeTab} Transactions Found
                    </h3>
                    <p style={{ color: '#64748B', maxWidth: '380px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                        {searchQuery ? 'Adjust your search query.' : activeTab === 'all' ? 'You have no transactions yet.' : `There are currently no transactions under ${activeTab}.`}
                    </p>
                    {activeTab === 'selling' && !searchQuery && (
                        <button className="gov-btn gov-btn-primary" onClick={() => navigate('/sale')}>
                            Sell a Property
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map((sale) => {
                        const sc = getStatusConfig(sale.status);
                        const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress?.toLowerCase();
                        const action = getNextAction(sale, walletAddress);
                        const StatusIcon = sc.icon;

                        return (
                            <div
                                key={sale.id}
                                className="gov-card"
                                style={{
                                    borderLeft: `4px solid ${sc.color}`,
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: '1.5rem',
                                    alignItems: 'center',
                                    padding: '1.5rem'
                                }}
                            >
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                            TX #{sale.id?.slice(0, 8)?.toUpperCase()}
                                        </h3>
                                        <span className="gov-badge" style={{ '--badge-bg': sc.bg, '--badge-color': sc.color, '--badge-border': sc.border }}>
                                            <StatusIcon size={12} />
                                            {sc.label}
                                        </span>
                                        <span className="gov-badge" style={{
                                            '--badge-bg': isSeller ? '#FFFBEB' : '#EFF6FF',
                                            '--badge-color': isSeller ? '#D97706' : '#2563EB',
                                            '--badge-border': isSeller ? '#FDE68A' : '#BFDBFE',
                                            fontSize: '0.65rem'
                                        }}>
                                            {isSeller ? 'YOU ARE SELLER' : 'YOU ARE BUYER'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>
                                                Sale Price
                                            </span>
                                            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E40AF' }}>
                                                ₹ {sale.salePrice?.toLocaleString('en-IN') || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>
                                                Property Code
                                            </span>
                                            <span className="mono" style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600 }}>
                                                {sale.propertyCode || '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>
                                                {isSeller ? 'Buyer Wallet' : 'Seller Wallet'}
                                            </span>
                                            <span className="mono" style={{ fontSize: '0.8rem', color: '#475569' }}>
                                                {isSeller ? sale.buyerWallet : sale.sellerWallet}
                                            </span>
                                        </div>
                                    </div>

                                    <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                        Created on {new Date(sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <button
                                        className={`gov-btn ${action.primary ? 'gov-btn-primary' : ''}`}
                                        onClick={() => action.path && navigate(action.path)}
                                        style={{ fontSize: '0.82rem', padding: '0.5rem 1rem', width: '150px' }}
                                    >
                                        {action.label} <ChevronRight size={14} />
                                    </button>

                                    {sale.status !== 'completed' && sale.status !== 'cancelled' && sale.status !== 'expired' && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Cancel this active transaction?')) {
                                                    try {
                                                        await saleService.cancelSale(sale.id);
                                                        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'cancelled' } : s));
                                                    } catch (err) {
                                                        alert(err.response?.data?.message || 'Failed to cancel');
                                                    }
                                                }
                                            }}
                                            style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                                        >
                                            Cancel Transaction
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Transactions;
