import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import {
    ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, AlertTriangle,
    Clock, Loader2, Search, Wallet, Landmark, Shield,
    ChevronRight, Ban, Activity
} from 'lucide-react';
import './PropertyPages.css';

const TABS = [
    { key: 'selling', label: 'Selling', icon: ArrowUpRight },
    { key: 'buying', label: 'Buying', icon: ArrowDownLeft },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle },
    { key: 'dispute', label: 'Disputed', icon: Shield },
];

const STATUS_CONFIG = {
    initiated: { label: 'INITIATED', bg: 'rgba(245,158,11,0.1)', icon: Clock, color: '#F59E0B' },
    buyer_signed: { label: 'BUYER SIGNED', bg: 'rgba(56,189,248,0.1)', icon: Wallet, color: '#38BDF8' },
    funds_blocked: { label: 'FUNDS BLOCKED', bg: 'rgba(168,85,247,0.1)', icon: Landmark, color: '#A855F7' },
    authority_approved: { label: 'APPROVED', bg: 'rgba(34,197,94,0.1)', icon: Shield, color: '#22C55E' },
    completed: { label: 'COMPLETED', bg: 'rgba(34,197,94,0.1)', icon: CheckCircle2, color: '#22C55E' },
    cancelled: { label: 'CANCELLED', bg: 'rgba(239,68,68,0.1)', icon: XCircle, color: '#EF4444' },
    expired: { label: 'EXPIRED', bg: 'rgba(255,255,255,0.05)', icon: Ban, color: '#9ca3af' },
    frozen: { label: 'FROZEN', bg: 'rgba(239,68,68,0.1)', icon: AlertTriangle, color: '#EF4444' },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.initiated;

const getNextAction = (sale, walletAddress) => {
    const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress.toLowerCase();
    const isBuyer = walletAddress && sale.buyerWallet?.toLowerCase() === walletAddress.toLowerCase();

    switch (sale.status) {
        case 'initiated':
            if (isBuyer) return { label: 'Review & Sign', path: `/sale/${sale.id}/review`, color: '#00E5FF' };
            if (isSeller) return { label: 'Await Buyer', path: null, color: '#9ca3af' };
            break;
        case 'buyer_signed':
            if (isBuyer) return { label: 'Block Funds', path: `/sale/${sale.id}/fund-block`, color: '#A855F7' };
            if (isSeller) return { label: 'Funds Pending', path: null, color: '#9ca3af' };
            break;
        case 'funds_blocked':
            return { label: 'Awaiting Auth', path: null, color: '#9ca3af' };
        case 'authority_approved':
            return { label: 'Process', path: `/sale/${sale.id}/review`, color: '#22C55E' };
        case 'completed':
            return { label: 'View Ledger', path: `/sale/${sale.id}/review`, color: '#9ca3af' };
        case 'cancelled':
        case 'expired':
            return { label: 'View Log', path: `/sale/${sale.id}/review`, color: '#9ca3af' };
        default:
            return { label: 'View', path: `/sale/${sale.id}/review`, color: '#9ca3af' };
    }
    return { label: 'Details', path: `/sale/${sale.id}/review`, color: '#9ca3af' };
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
            sale.propertyCode?.toLowerCase().includes(q)
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
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 800, letterSpacing: '0.1em', color: '#00E5FF', fontSize: '0.9rem' }}>SYNCING LEDGER...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-sm animate-fade-in" style={{ paddingBottom: '4rem' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: '3.5rem', height: '3.5rem', borderRadius: '12px',
                        background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(56,189,248,0.2)'
                    }}>
                        <Activity size={24} style={{ color: '#38BDF8' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white' }}>
                            Transaction Stream
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.3rem', margin: 0 }}>
                            {sales.length} total active and historic agreements
                        </p>
                    </div>
                </div>
                <button
                    className="cyber-btn-hollow"
                    onClick={() => navigate('/sale')}
                    style={{ '--btn-color': '#00E5FF', padding: '0.85rem 1.5rem', width: 'auto', textTransform: 'capitalize' }}
                >
                    <ArrowUpRight size={18} /> Initiate New Sale
                </button>
            </div>

            {/* Dashboard Filter Bar */}
            <div className="cyber-hud-bar">
                <div className="cyber-search-wrapper">
                    <Search className="cyber-search-icon" size={16} />
                    <input
                        type="text"
                        placeholder="Query transaction ID, property, or wallet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ fontFamily: 'inherit' }}
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
                                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem' }}
                            >
                                <TabIcon size={14} style={{ color: isActive ? '#00E5FF' : '#9ca3af' }} />
                                {tab.label}
                                <div style={{ 
                                    background: isActive ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.05)', 
                                    padding: '0.1rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', 
                                    minWidth: '22px', textAlign: 'center', marginLeft: '0.2rem' 
                                }}>
                                    {tabCounts[tab.key]}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Grid Layout */}
            {filtered.length === 0 ? (
                <div className="empty-state max-w-2xl mx-auto mt-12" style={{ border: '1px dashed rgba(56,189,248,0.3)', background: 'rgba(56,189,248,0.02)' }}>
                    {activeTab === 'selling' ? <ArrowUpRight size={48} style={{ opacity: 0.5, marginBottom: '1.5rem', color: '#38BDF8', display: 'inline-block' }} /> :
                     activeTab === 'buying' ? <ArrowDownLeft size={48} style={{ opacity: 0.5, marginBottom: '1.5rem', color: '#38BDF8', display: 'inline-block' }} /> :
                     <CheckCircle2 size={48} style={{ opacity: 0.5, marginBottom: '1.5rem', color: '#38BDF8', display: 'inline-block' }} />}
                    
                    <p style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'white' }}>
                        No {activeTab} transactions found
                    </p>
                    <p style={{ marginBottom: '1.5rem', color: 'hsl(220,15%,60%)' }}>
                        {searchQuery ? 'Adjust your search queries or clear the text box.' : 'There are currently no active smart contracts under this category.'}
                    </p>
                    {activeTab === 'selling' && !searchQuery && (
                        <button className="cyber-btn-hollow" onClick={() => navigate('/sale')} style={{ '--btn-color': '#00E5FF', textTransform: 'capitalize' }}>
                            <ArrowUpRight size={16} /> Mint Contract
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filtered.map((sale, idx) => {
                        const sc = getStatusConfig(sale.status);
                        const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress?.toLowerCase();
                        const action = getNextAction(sale, walletAddress);
                        const StatusIcon = sc.icon;

                        return (
                            <div
                                key={sale.id}
                                className="cyber-property-card"
                                style={{ 
                                    '--tier-color': sc.color, 
                                    '--tier-color-hover': sc.color,
                                    '--tier-glow': sc.bg,
                                    animationDelay: `${idx * 0.05}s`,
                                    display: 'grid',
                                    gridTemplateColumns: '1fr auto',
                                    gap: '1.5rem',
                                    alignItems: 'center',
                                    padding: '1.5rem'
                                }}
                                onClick={() => action.path && navigate(action.path)}
                            >
                                
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                                        <h3 className="text-xl font-bold tracking-tight text-white m-0">
                                            TX-{(sale.id).toString().slice(0, 8).toUpperCase()}
                                        </h3>
                                        <div 
                                            className="cyber-badge" 
                                            style={{ '--badge-color': sc.color, '--badge-bg': sc.bg, '--badge-border': `rgba(255,255,255,0.1)`, textTransform: 'uppercase' }}
                                        >
                                            <StatusIcon size={12} style={{ color: sc.color }} />
                                            {sc.label}
                                        </div>
                                        <span style={{ fontSize: '0.65rem', background: isSeller ? 'rgba(245,158,11,0.1)' : 'rgba(56,189,248,0.1)', color: isSeller ? '#F59E0B' : '#38BDF8', padding: '0.2rem 0.6rem', borderRadius: '4px', fontWeight: 800 }}>
                                            {isSeller ? 'SELLER' : 'BUYER'}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem', fontWeight: 700 }}>Sale Value</div>
                                            <div style={{ color: '#00E5FF', fontWeight: 700, fontSize: '1.1rem' }}>₹{sale.salePrice?.toLocaleString('en-IN') || '—'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem', fontWeight: 700 }}>Property ID</div>
                                            <div style={{ fontFamily: 'JetBrains Mono', color: 'white', wordBreak: 'break-all' }}>{sale.propertyCode || '—'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem', fontWeight: 700 }}>{isSeller ? 'Counterparty (Buyer)' : 'Counterparty (Seller)'}</div>
                                            <div style={{ fontFamily: 'JetBrains Mono', color: 'white', fontSize: '0.85rem' }}>
                                                 {isSeller ? sale.buyerWallet : sale.sellerWallet}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', gap: '1rem' }}>
                                        <span>Issued: {formatDate(sale.createdAt)} {formatTime(sale.createdAt)}</span>
                                        {sale.updatedAt && sale.updatedAt !== sale.createdAt && (
                                            <span>Update: {formatDate(sale.updatedAt)} {formatTime(sale.updatedAt)}</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '1.5rem' }}>
                                    <button
                                        className="cyber-btn-hollow"
                                        onClick={(e) => { e.stopPropagation(); if(action.path) navigate(action.path); }}
                                        style={{ '--btn-color': action.color, padding: '0.6rem 1.25rem', fontSize: '0.8rem', borderStyle: 'solid', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', width: '140px' }}
                                        disabled={!action.path}
                                    >
                                        {action.label} {action.path && <ChevronRight size={14} />}
                                    </button>
                                    
                                    {sale.status !== 'completed' && sale.status !== 'cancelled' && sale.status !== 'expired' && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (window.confirm('Terminate this smart contract? This action is irreversible.')) {
                                                    try {
                                                        await saleService.cancelSale(sale.id);
                                                        setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'cancelled' } : s));
                                                    } catch (err) {
                                                        alert(err.response?.data?.message || 'Failed to terminate');
                                                    }
                                                }
                                            }}
                                            style={{ background: 'transparent', border: 'none', color: '#EF4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.4rem 0', width: '140px', textAlign: 'center' }}
                                        >
                                            Terminate Contract
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
