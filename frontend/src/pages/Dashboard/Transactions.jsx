import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { TopNavbar } from '../../components/TopNavbar';
import {
    ArrowUpRight, ArrowDownLeft, CheckCircle2, XCircle, AlertTriangle,
    Clock, Loader2, Search, Wallet, Landmark, Shield,
    ChevronRight, Ban, Activity, RefreshCw, Copy, Check, FileText
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
    initiated: { label: 'INITIATED', bg: 'rgba(245,158,11,0.12)', icon: Clock, color: '#F59E0B', step: 1 },
    buyer_signed: { label: 'BUYER SIGNED', bg: 'rgba(56,189,248,0.12)', icon: Wallet, color: '#38BDF8', step: 2 },
    funds_blocked: { label: 'FUNDS BLOCKED', bg: 'rgba(168,85,247,0.12)', icon: Landmark, color: '#A855F7', step: 3 },
    authority_approved: { label: 'APPROVED', bg: 'rgba(16,185,129,0.12)', icon: Shield, color: '#10B981', step: 4 },
    completed: { label: 'COMPLETED', bg: 'rgba(16,185,129,0.15)', icon: CheckCircle2, color: '#10B981', step: 5 },
    cancelled: { label: 'CANCELLED', bg: 'rgba(239,68,68,0.12)', icon: XCircle, color: '#EF4444', step: 0 },
    expired: { label: 'EXPIRED', bg: 'rgba(148,163,184,0.12)', icon: Ban, color: '#94A3B8', step: 0 },
    frozen: { label: 'FROZEN', bg: 'rgba(239,68,68,0.15)', icon: AlertTriangle, color: '#EF4444', step: 0 },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.initiated;

const getNextAction = (sale, walletAddress) => {
    const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress.toLowerCase();
    const isBuyer = walletAddress && sale.buyerWallet?.toLowerCase() === walletAddress.toLowerCase();

    switch (sale.status) {
        case 'initiated':
            if (isBuyer) return { label: 'Review & Sign', path: `/sale/${sale.id}/review`, color: '#0284C7', primary: true };
            if (isSeller) return { label: 'Await Buyer', path: null, color: '#64748B', primary: false };
            break;
        case 'buyer_signed':
            if (isBuyer) return { label: 'Block Funds', path: `/sale/${sale.id}/fund-block`, color: '#0284C7', primary: true };
            if (isSeller) return { label: 'Funds Pending', path: null, color: '#64748B', primary: false };
            break;
        case 'funds_blocked':
            return { label: 'Awaiting Auth', path: null, color: '#64748B', primary: false };
        case 'authority_approved':
            return { label: 'Process', path: `/sale/${sale.id}/review`, color: '#10B981', primary: true };
        case 'completed':
            return { label: 'View Ledger', path: `/sale/${sale.id}/review`, color: '#64748B', primary: false };
        case 'cancelled':
        case 'expired':
        case 'frozen':
            return { label: 'View Log', path: `/sale/${sale.id}/review`, color: '#64748B', primary: false };
        default:
            return { label: 'View', path: `/sale/${sale.id}/review`, color: '#64748B', primary: false };
    }
    return { label: 'Details', path: `/sale/${sale.id}/review`, color: '#64748B', primary: false };
};

const STEPS_PROGRESS = [
    { num: 1, name: 'Agreement' },
    { num: 2, name: 'Buyer Sign' },
    { num: 3, name: 'Fund Lock' },
    { num: 4, name: 'Registrar' },
    { num: 5, name: 'Settlement' }
];

const Transactions = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('selling');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState(null);

    const walletAddress = user?.walletAddress;

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

    useEffect(() => {
        if (user) fetchSales();
    }, [user]);

    const handleCopy = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

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
            sale.id?.toString().toLowerCase().includes(q) ||
            sale.buyerWallet?.toLowerCase().includes(q) ||
            sale.sellerWallet?.toLowerCase().includes(q) ||
            sale.propertyCode?.toLowerCase().includes(q) ||
            sale.surveyNumber?.toString().toLowerCase().includes(q) ||
            sale.district?.toLowerCase().includes(q)
        );
    });

    const tabCounts = {};
    TABS.forEach(tab => {
        tabCounts[tab.key] = filterByTab(tab.key).length;
    });

    // KPI Metrics calculation
    const activeSellingCount = filterByTab('selling').length;
    const activeBuyingCount = filterByTab('buying').length;
    const completedSales = sales.filter(s => s.status === 'completed');
    const totalSettledValue = completedSales.reduce((acc, curr) => acc + (parseFloat(curr.salePrice) || 0), 0);
    
    const pendingActionsCount = sales.filter(s => {
        const action = getNextAction(s, walletAddress);
        return action.primary;
    }).length;

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

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Activity style={{ width: '2.5rem', height: '2.5rem', color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', fontSize: '0.9rem', color: '#94A3B8' }}>Loading Multi-Sig Ledger...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            {/* Top Navbar */}
            <TopNavbar 
                title="Transactions & Escrow" 
                subtitle={`Monitor multi-sig deed transfers and settlement states across ${sales.length} total agreements`}
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
                
                {/* ─── 4 Stat Cards ─── */}
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                        gap: '1.25rem',
                        marginBottom: '1.75rem' 
                    }}
                >
                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>Active Escrow Agreements</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
                                {activeSellingCount + activeBuyingCount}
                            </p>
                            <span style={{ fontSize: '0.8rem', color: '#38BDF8', fontWeight: 600 }}>
                                {activeSellingCount} sell · {activeBuyingCount} buy
                            </span>
                        </div>
                    </div>

                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>Total Settled Volume</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10B981', letterSpacing: '-0.02em', margin: 0 }}>
                                ₹{totalSettledValue >= 10000000 ? `${(totalSettledValue / 10000000).toFixed(2)} Cr` : totalSettledValue.toLocaleString('en-IN')}
                            </p>
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>
                                {completedSales.length} closed
                            </span>
                        </div>
                    </div>

                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>Action Required</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '2.2rem', fontWeight: 800, color: pendingActionsCount > 0 ? '#F59E0B' : '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
                                {pendingActionsCount}
                            </p>
                            <span style={{ fontSize: '0.8rem', color: pendingActionsCount > 0 ? '#F59E0B' : '#64748B', fontWeight: 600 }}>
                                {pendingActionsCount > 0 ? 'Pending your step' : 'All up to date'}
                            </span>
                        </div>
                    </div>

                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>Disputed / Frozen</span>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginTop: '0.5rem' }}>
                            <p style={{ fontSize: '2.2rem', fontWeight: 800, color: tabCounts['dispute'] > 0 ? '#EF4444' : '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
                                {tabCounts['dispute']}
                            </p>
                            <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                                {tabCounts['cancelled']} cancelled
                            </span>
                        </div>
                    </div>
                </div>

                {/* ─── Filter Tabs & Actions Toolbar ─── */}
                <div 
                    style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        gap: '1rem',
                        marginBottom: '1.5rem',
                        background: '#0F172A',
                        border: '1px solid #1E293B',
                        borderRadius: '14px',
                        padding: '0.75rem 1rem'
                    }}
                >
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {TABS.map(tab => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem 1rem',
                                        borderRadius: '10px',
                                        border: isActive ? '1px solid #0284C7' : '1px solid transparent',
                                        background: isActive ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                                        color: isActive ? '#38BDF8' : '#94A3B8',
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <TabIcon size={15} style={{ color: isActive ? '#38BDF8' : '#64748B' }} />
                                    {tab.label}
                                    <span style={{
                                        background: isActive ? 'rgba(2, 132, 199, 0.3)' : '#1E293B',
                                        color: isActive ? '#38BDF8' : '#94A3B8',
                                        padding: '0.15rem 0.5rem',
                                        borderRadius: '9999px',
                                        fontSize: '0.72rem',
                                        fontWeight: 700
                                    }}>
                                        {tabCounts[tab.key]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                            className="btn-dark-pill"
                            onClick={fetchSales}
                            title="Refresh transaction data"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}
                        >
                            <RefreshCw size={14} /> Refresh
                        </button>
                        <button
                            className="btn-cyan-glow"
                            onClick={() => navigate('/sale')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.1rem', fontSize: '0.85rem' }}
                        >
                            <ArrowUpRight size={16} /> Initiate New Sale
                        </button>
                    </div>
                </div>

                {/* ─── Search Bar ─── */}
                <div style={{ position: 'relative', marginBottom: '1.75rem' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                    <input
                        type="text"
                        placeholder="Search by Transaction ID, Property Code, Survey #, or Wallet Address..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium"
                        style={{ width: '100%', paddingLeft: '2.8rem', paddingRight: '1rem', fontSize: '0.9rem', borderRadius: '12px' }}
                    />
                </div>

                {/* ─── Transactions List ─── */}
                {filtered.length === 0 ? (
                    <div 
                        className="digi-card" 
                        style={{ 
                            padding: '4.5rem 2rem', 
                            textAlign: 'center',
                            background: '#0F172A',
                            border: '1px solid #1E293B',
                            borderRadius: '16px'
                        }}
                    >
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '16px',
                            background: 'rgba(2, 132, 199, 0.1)',
                            border: '1px solid rgba(2, 132, 199, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            color: '#38BDF8'
                        }}>
                            {activeTab === 'selling' ? <ArrowUpRight size={32} /> :
                             activeTab === 'buying' ? <ArrowDownLeft size={32} /> :
                             activeTab === 'completed' ? <CheckCircle2 size={32} /> :
                             activeTab === 'dispute' ? <Shield size={32} /> :
                             <Ban size={32} />}
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                            No {activeTab} transactions found
                        </h3>
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', maxWidth: '460px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
                            {searchQuery 
                                ? 'No transactions match your current search query. Try clearing the filter.' 
                                : activeTab === 'selling'
                                    ? 'You have not initiated any land sale agreements yet. Choose one of your registered properties to start an escrow transfer.'
                                    : activeTab === 'buying'
                                        ? 'No active purchase agreements are currently awaiting your signature or fund block.'
                                        : 'There are currently no recorded transactions in this archive category.'
                            }
                        </p>
                        {activeTab === 'selling' && !searchQuery && (
                            <button 
                                className="btn-cyan-glow" 
                                onClick={() => navigate('/sale')} 
                                style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <ArrowUpRight size={16} /> Initiate Sale Agreement
                            </button>
                        )}
                        {activeTab === 'buying' && !searchQuery && (
                            <button 
                                className="btn-cyan-outline" 
                                onClick={() => navigate('/search-property')} 
                                style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Search size={16} /> Search Verified Land Parcels
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {filtered.map((sale) => {
                            const sc = getStatusConfig(sale.status);
                            const isSeller = walletAddress && sale.sellerWallet?.toLowerCase() === walletAddress?.toLowerCase();
                            const isBuyer = walletAddress && sale.buyerWallet?.toLowerCase() === walletAddress?.toLowerCase();
                            const action = getNextAction(sale, walletAddress);
                            const StatusIcon = sc.icon;
                            const isDisputedOrDead = ['cancelled', 'expired', 'frozen'].includes(sale.status);

                            return (
                                <div
                                    key={sale.id}
                                    className="digi-card"
                                    style={{
                                        padding: '1.75rem',
                                        background: '#0F172A',
                                        border: '1px solid #1E293B',
                                        borderRadius: '16px',
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {/* Card Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '1.1rem', color: '#F8FAFC', letterSpacing: '0.02em' }}>
                                                    TX-{(sale.id).toString().slice(0, 8).toUpperCase()}
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    padding: '0.3rem 0.75rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    background: sc.bg,
                                                    color: sc.color,
                                                    border: `1px solid ${sc.color}40`
                                                }}>
                                                    <StatusIcon size={13} />
                                                    {sc.label}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    background: isSeller ? 'rgba(245,158,11,0.12)' : 'rgba(2,132,199,0.12)',
                                                    color: isSeller ? '#F59E0B' : '#38BDF8',
                                                    border: `1px solid ${isSeller ? 'rgba(245,158,11,0.3)' : 'rgba(2,132,199,0.3)'}`,
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '6px',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em'
                                                }}>
                                                    {isSeller ? 'SELLER' : isBuyer ? 'BUYER' : 'PARTICIPANT'}
                                                </span>
                                            </div>
                                            <p style={{ color: '#94A3B8', fontSize: '0.82rem', marginTop: '0.35rem', margin: 0 }}>
                                                Initiated on {formatDate(sale.createdAt)} at {formatTime(sale.createdAt)}
                                            </p>
                                        </div>

                                        {/* Agreed Price */}
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
                                                Agreed Escrow Amount
                                            </span>
                                            <span style={{ color: '#10B981', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
                                                ₹{sale.salePrice ? Number(sale.salePrice).toLocaleString('en-IN') : '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 5-Step Linear Progress Bar (if not cancelled/frozen) */}
                                    {!isDisputedOrDead && (
                                        <div style={{ marginBottom: '1.5rem', background: '#0B0F19', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #1E293B' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                                                {STEPS_PROGRESS.map((st, idx) => {
                                                    const isDone = sc.step >= st.num;
                                                    const isCurrent = sc.step === st.num;
                                                    return (
                                                        <div key={st.num} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, flex: 1 }}>
                                                            <div style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '50%',
                                                                background: isDone ? '#10B981' : isCurrent ? '#0284C7' : '#1E293B',
                                                                color: isDone || isCurrent ? '#FFFFFF' : '#64748B',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '0.7rem',
                                                                fontWeight: 700,
                                                                marginBottom: '0.35rem',
                                                                border: isCurrent ? '2px solid #38BDF8' : 'none'
                                                            }}>
                                                                {isDone ? <Check size={13} /> : st.num}
                                                            </div>
                                                            <span style={{
                                                                fontSize: '0.72rem',
                                                                fontWeight: isCurrent ? 700 : 500,
                                                                color: isDone ? '#10B981' : isCurrent ? '#38BDF8' : '#64748B',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {st.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Property & Counterparty Grid */}
                                    <div 
                                        style={{ 
                                            display: 'grid', 
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                            gap: '1.25rem',
                                            padding: '1.25rem',
                                            background: '#0B0F19',
                                            borderRadius: '12px',
                                            border: '1px solid #1E293B',
                                            marginBottom: '1.25rem'
                                        }}
                                    >
                                        <div>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                                                Property Identifier
                                            </span>
                                            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.95rem' }}>
                                                {sale.surveyNumber ? `Survey #${sale.surveyNumber}` : sale.propertyCode || `Parcel #${sale.propertyId?.slice(0, 8)}`}
                                            </div>
                                            <span style={{ color: '#94A3B8', fontSize: '0.78rem' }}>
                                                {sale.district || 'District N/A'}{sale.state ? `, ${sale.state}` : ''}
                                            </span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                                                Counterparty Wallet
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontFamily: 'JetBrains Mono', color: '#38BDF8', fontSize: '0.85rem' }}>
                                                    {isSeller 
                                                        ? (sale.buyerWallet ? `${sale.buyerWallet.slice(0, 8)}...${sale.buyerWallet.slice(-6)}` : 'Awaiting Buyer') 
                                                        : (sale.sellerWallet ? `${sale.sellerWallet.slice(0, 8)}...${sale.sellerWallet.slice(-6)}` : 'Awaiting Seller')
                                                    }
                                                </span>
                                                {(sale.buyerWallet || sale.sellerWallet) && (
                                                    <button 
                                                        onClick={() => handleCopy(isSeller ? sale.buyerWallet : sale.sellerWallet, `cp-${sale.id}`)}
                                                        style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                                        title="Copy Counterparty Address"
                                                    >
                                                        {copiedId === `cp-${sale.id}` ? <Check size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
                                                    </button>
                                                )}
                                            </div>
                                            <span style={{ color: '#64748B', fontSize: '0.75rem' }}>
                                                {isSeller ? 'Role: Buyer' : 'Role: Seller'}
                                            </span>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>
                                                Settlement Rail
                                            </span>
                                            <div style={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <Landmark size={14} style={{ color: '#0284C7' }} />
                                                INR ASBA (Bank Escrow)
                                            </div>
                                            <span style={{ color: '#64748B', fontSize: '0.75rem' }}>
                                                Avalanche Fuji C-Chain
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.5rem' }}>
                                        <button
                                            className="btn-dark-pill"
                                            onClick={() => navigate(`/properties/${sale.propertyId}`)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', padding: '0.55rem 0.9rem' }}
                                        >
                                            <FileText size={14} /> View Title Deed
                                        </button>

                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            {sale.status !== 'completed' && sale.status !== 'cancelled' && sale.status !== 'expired' && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm('Cancel this multi-sig sale agreement? This operation cannot be reversed.')) {
                                                            try {
                                                                await saleService.cancelSale(sale.id);
                                                                setSales(prev => prev.map(s => s.id === sale.id ? { ...s, status: 'cancelled' } : s));
                                                            } catch (err) {
                                                                alert(err.response?.data?.message || 'Failed to cancel');
                                                            }
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'transparent',
                                                        border: 'none',
                                                        color: '#EF4444',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer',
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: '6px',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    Cancel Agreement
                                                </button>
                                            )}

                                            {action.path ? (
                                                <button
                                                    className={action.primary ? 'btn-cyan-glow' : 'btn-cyan-outline'}
                                                    onClick={() => navigate(action.path)}
                                                    style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                                                >
                                                    {action.label} <ChevronRight size={15} />
                                                </button>
                                            ) : (
                                                <span style={{
                                                    padding: '0.6rem 1.25rem',
                                                    fontSize: '0.85rem',
                                                    color: '#64748B',
                                                    background: '#1E293B',
                                                    borderRadius: '8px',
                                                    fontWeight: 600,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                }}>
                                                    {action.label}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Transactions;
