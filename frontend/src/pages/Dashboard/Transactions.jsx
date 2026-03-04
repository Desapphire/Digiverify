import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import {
    ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, AlertTriangle,
    Clock, Loader2, Search, Eye, Wallet, DollarSign, Shield,
    ChevronRight, Landmark, Ban
} from 'lucide-react';
import './PropertyPages.css';

const TABS = [
    { key: 'selling', label: 'Selling', icon: ArrowUpRight },
    { key: 'buying', label: 'Buying', icon: ArrowDownLeft },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle },
    { key: 'dispute', label: 'Under Dispute', icon: Shield },
];

const STATUS_CONFIG = {
    initiated: { label: 'INITIATED', badgeClass: 'badge-warning', icon: Clock, color: 'hsl(38,92%,50%)' },
    buyer_signed: { label: 'BUYER SIGNED', badgeClass: 'badge-info', icon: Wallet, color: 'hsl(217,91%,60%)' },
    funds_blocked: { label: 'FUNDS BLOCKED', badgeClass: 'badge-purple', icon: Landmark, color: 'hsl(280,80%,60%)' },
    authority_approved: { label: 'APPROVED', badgeClass: 'badge-success', icon: Shield, color: 'hsl(142,71%,45%)' },
    completed: { label: 'COMPLETED', badgeClass: 'badge-success', icon: CheckCircle2, color: 'hsl(142,71%,45%)' },
    cancelled: { label: 'CANCELLED', badgeClass: 'badge-danger', icon: XCircle, color: 'hsl(348,83%,47%)' },
    expired: { label: 'EXPIRED', badgeClass: 'badge-neutral', icon: Ban, color: 'hsl(220,15%,60%)' },
    frozen: { label: 'FROZEN', badgeClass: 'badge-danger', icon: AlertTriangle, color: 'hsl(348,83%,47%)' },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.initiated;

// Determine what action is needed
const getNextAction = (sale, walletAddress) => {
    const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress.toLowerCase();
    const isBuyer = walletAddress && sale.buyerWallet?.toLowerCase() === walletAddress.toLowerCase();

    switch (sale.status) {
        case 'initiated':
            if (isBuyer) return { label: 'Review & Sign', path: `/sale/${sale.id}/review`, variant: 'btn-primary' };
            if (isSeller) return { label: 'Awaiting Buyer', path: null, variant: 'btn-secondary' };
            break;
        case 'buyer_signed':
            if (isBuyer) return { label: 'Block Funds', path: `/sale/${sale.id}/fund-block`, variant: 'btn-primary' };
            if (isSeller) return { label: 'Funds Pending', path: null, variant: 'btn-secondary' };
            break;
        case 'funds_blocked':
            return { label: 'Awaiting Authority', path: null, variant: 'btn-secondary' };
        case 'authority_approved':
            return { label: 'Ready to Complete', path: null, variant: 'btn-primary' };
        case 'completed':
            return { label: 'View Details', path: `/sale/${sale.id}/review`, variant: 'btn-ghost' };
        case 'cancelled':
        case 'expired':
            return { label: 'View Details', path: `/sale/${sale.id}/review`, variant: 'btn-ghost' };
        default:
            return { label: 'View', path: `/sale/${sale.id}/review`, variant: 'btn-ghost' };
    }
    return { label: 'View', path: `/sale/${sale.id}/review`, variant: 'btn-ghost' };
};

const Transactions = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('selling');
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

    // Filter transactions based on tab
    const filterByTab = (tab) => {
        return sales.filter(sale => {
            const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress.toLowerCase();
            const isBuyer = walletAddress && sale.buyerWallet?.toLowerCase() === walletAddress.toLowerCase();

            switch (tab) {
                case 'selling':
                    return isSeller && !['completed', 'cancelled', 'expired', 'frozen'].includes(sale.status);
                case 'buying':
                    return isBuyer && !['completed', 'cancelled', 'expired', 'frozen'].includes(sale.status);
                case 'completed':
                    return sale.status === 'completed';
                case 'cancelled':
                    return sale.status === 'cancelled' || sale.status === 'expired';
                case 'dispute':
                    return sale.status === 'frozen';
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
            sale.propertyId?.toString().includes(q)
        );
    });

    const tabCounts = {};
    TABS.forEach(tab => {
        tabCounts[tab.key] = filterByTab(tab.key).length;
    });

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    };

    const shortenWallet = (addr) => {
        if (!addr) return '—';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Transactions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container container-lg">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                        My <span className="text-gradient">Transactions</span>
                    </h1>
                    <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                        {sales.length} total transaction{sales.length !== 1 ? 's' : ''} across all categories
                    </p>
                </div>
                <button className="btn btn-primary btn-glow" onClick={() => navigate('/sale')} style={{ fontSize: '0.9rem', padding: '0.75rem 1.5rem' }}>
                    <ArrowUpRight size={18} /> New Sale
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                {TABS.map(tab => {
                    const TabIcon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '0.6rem 1.1rem',
                                borderRadius: '9999px',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                border: `1px solid ${activeTab === tab.key ? 'rgba(139,92,246,0.4)' : 'var(--border-subtle)'}`,
                                background: activeTab === tab.key ? 'rgba(139,92,246,0.15)' : 'rgba(0,0,0,0.15)',
                                color: activeTab === tab.key ? 'hsl(255,85%,65%)' : 'hsl(220,15%,60%)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                            }}
                        >
                            <TabIcon size={14} />
                            {tab.label}
                            <span style={{
                                background: activeTab === tab.key ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)',
                                padding: '0.1rem 0.5rem',
                                borderRadius: '9999px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                minWidth: '22px',
                                textAlign: 'center',
                            }}>
                                {tabCounts[tab.key]}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1.25rem', maxWidth: '400px' }}>
                <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(220,15%,60%)' }} />
                <input
                    className="input-premium"
                    type="text"
                    placeholder="Search by ID, wallet, property..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ paddingLeft: '2.75rem' }}
                />
            </div>

            {/* Transaction List */}
            {filtered.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    {activeTab === 'selling' ? <ArrowUpRight size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'hsl(255,85%,65%)' }} /> :
                        activeTab === 'buying' ? <ArrowDownLeft size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'hsl(255,85%,65%)' }} /> :
                            <CheckCircle2 size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'hsl(255,85%,65%)' }} />}
                    <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                        No {activeTab === 'dispute' ? 'disputed' : activeTab} transactions
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                        {activeTab === 'selling' ? 'Initiate a sale to get started.' :
                            activeTab === 'buying' ? 'Transactions where you are the buyer will appear here.' :
                                `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} transactions will appear here.`}
                    </p>
                    {activeTab === 'selling' && (
                        <button className="btn btn-primary" onClick={() => navigate('/sale')} style={{ fontSize: '0.875rem' }}>
                            <ArrowUpRight size={16} /> Initiate Sale
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filtered.map(sale => {
                        const sc = getStatusConfig(sale.status);
                        const StatusIcon = sc.icon;
                        const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress.toLowerCase();
                        const action = getNextAction(sale, walletAddress);

                        return (
                            <div
                                key={sale.id}
                                className="tx-card"
                                style={{ borderLeft: `3px solid ${sc.color}` }}
                                onClick={() => action.path && navigate(action.path)}
                            >
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
                                    <div>
                                        {/* Top row: ID + Status Badge */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                                                TX #{sale.id}
                                            </h3>
                                            <span className={`badge ${sc.badgeClass}`} style={{ fontSize: '0.6rem' }}>
                                                <StatusIcon size={10} style={{ marginRight: '0.2rem' }} /> {sc.label}
                                            </span>
                                            <span className={`badge ${isSeller ? 'badge-warning' : 'badge-info'}`} style={{ fontSize: '0.55rem' }}>
                                                {isSeller ? 'SELLER' : 'BUYER'}
                                            </span>
                                        </div>

                                        {/* Details grid */}
                                        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Sale Price</p>
                                                <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>₹{sale.salePrice?.toLocaleString('en-IN')}</p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>
                                                    {isSeller ? 'Buyer' : 'Seller'}
                                                </p>
                                                <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'hsl(var(--color-text-secondary))' }}>
                                                    {isSeller ? shortenWallet(sale.buyerWallet) : shortenWallet(sale.sellerWallet)}
                                                </p>
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Property ID</p>
                                                <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'hsl(var(--color-text-secondary))' }}>
                                                    {sale.propertyId}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.7rem', color: 'hsl(var(--color-text-muted))' }}>
                                            <span>Created: {formatDate(sale.createdAt)} {formatTime(sale.createdAt)}</span>
                                            {sale.updatedAt && sale.updatedAt !== sale.createdAt && (
                                                <span>• Updated: {formatDate(sale.updatedAt)} {formatTime(sale.updatedAt)}</span>
                                            )}
                                            {sale.expiryAt && (
                                                <span>• Expires: {formatDate(sale.expiryAt)}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                        <button
                                            className={`btn ${action.variant}`}
                                            onClick={(e) => { e.stopPropagation(); if (action.path) navigate(action.path); }}
                                            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                            disabled={!action.path}
                                        >
                                            {action.label} {action.path && <ChevronRight size={14} />}
                                        </button>
                                        {sale.status !== 'completed' && sale.status !== 'cancelled' && sale.status !== 'expired' && (
                                            <button
                                                className="btn btn-danger"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm('Are you sure you want to cancel this transaction?')) {
                                                        try {
                                                            await saleService.cancelSale(sale.id);
                                                            setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'cancelled' } : s));
                                                        } catch (err) {
                                                            alert(err.response?.data?.message || 'Failed to cancel');
                                                        }
                                                    }
                                                }}
                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.7rem' }}
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
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
