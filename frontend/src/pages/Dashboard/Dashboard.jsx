import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import {
    Wallet, Activity, ShieldCheck, Building, CheckCircle2,
    Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft,
    Bell, XCircle, TrendingUp, MapPin, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const DashboardHome = () => {
    const { user } = useAuth();
    const { account, connectWallet, isConnecting } = useWeb3();
    const navigate = useNavigate();

    const [properties, setProperties] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [walletError, setWalletError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [propsRes, salesRes] = await Promise.all([
                    propertyService.getMyProperties(),
                    saleService.getMySales()
                ]);
                if (propsRes.data?.data) setProperties(propsRes.data.data);
                if (salesRes.data?.data) setSales(salesRes.data.data);
            } catch (error) {
                console.error('Failed to load dashboard data', error);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchDashboardData();
    }, [user]);

    const handleConnectWallet = async () => {
        setWalletError('');
        try {
            const connectedAccount = await connectWallet();
            if (user?.walletAddress && connectedAccount.toLowerCase() !== user.walletAddress.toLowerCase()) {
                setWalletError(`Wallet mismatch! Expected: ${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`);
            }
        } catch (err) {
            setWalletError(err.message || 'Failed to connect wallet');
        }
    };

    const handleLinkWallet = async () => {
        if (!account) return;
        setLoading(true); // Reuse loading state for simplicity or add a specific one
        try {
            const { userService } = await import('../../services/user.service');
            const res = await userService.updateProfile({ walletAddress: account });
            if (res.data?.data) {
                // We'd ideally need a way to refresh the 'user' in AuthContext
                // But since AuthContext usually polls or can be manually refreshed
                // For now, let's just show a success alert or refresh page
                window.location.reload();
            }
        } catch (err) {
            setWalletError(err.response?.data?.message || 'Failed to link wallet.');
        } finally {
            setLoading(false);
        }
    };


    // Derived stats
    const activeSales = sales.filter(s => s.sellerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled');
    const activePurchases = sales.filter(s => s.buyerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled');
    const completedSales = sales.filter(s => s.status === 'completed');

    // Notifications derived from data
    const notifications = [];
    sales.forEach(sale => {
        if (sale.status === 'completed') {
            notifications.push({ id: `${sale.id}-comp`, type: 'success', icon: CheckCircle2, text: `Sale completed for property ${sale.propertyId?.slice(0, 8)}...`, time: sale.updatedAt || sale.createdAt });
        }
        if (sale.status === 'cancelled') {
            notifications.push({ id: `${sale.id}-cancel`, type: 'danger', icon: XCircle, text: `Sale cancelled for property ${sale.propertyId?.slice(0, 8)}...`, time: sale.updatedAt || sale.createdAt });
        }
        if (sale.status === 'pending_signatures' || sale.status === 'initiated') {
            notifications.push({ id: `${sale.id}-pending`, type: 'warning', icon: Clock, text: `Sale awaiting signatures — ${sale.propertyId?.slice(0, 8)}...`, time: sale.createdAt });
        }
    });
    if (user?.kycStatus === 'pending') {
        notifications.push({ id: 'kyc-pending', type: 'warning', icon: AlertTriangle, text: 'KYC verification is pending review', time: user.updatedAt });
    }
    if (user?.kycStatus === 'rejected') {
        notifications.push({ id: 'kyc-rejected', type: 'danger', icon: XCircle, text: 'KYC was rejected — please resubmit', time: user.updatedAt });
    }
    // Sort by time, most recent first
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <div style={{ width: '4rem', height: '4rem', borderRadius: '9999px', border: '4px solid rgba(139,92,246,0.3)', borderTopColor: 'hsl(255,85%,65%)' }} className="animate-spin"></div>
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
        <div
            className="glass-panel"
            onClick={onClick}
            style={{
                padding: '1.5rem',
                cursor: onClick ? 'pointer' : 'default',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <div className="stat-card-glow" style={{ background: color }}></div>
            <div className="stat-card-header">
                <div className="stat-card-icon-wrapper" style={{ border: `1px solid ${color}30` }}>
                    <Icon size={20} style={{ color }} />
                </div>
                <span className="stat-card-label">{label}</span>
            </div>
            <p className="stat-card-value">{value}</p>
        </div>
    );

    return (
        <div className="dashboard-container">

            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">
                        Welcome, <span className="text-gradient">{user?.name || 'Citizen'}</span>
                    </h1>
                    <div className="dashboard-badges-container">
                        <span className={`badge ${user?.kycStatus === 'approved' || user?.kycStatus === 'verified' ? 'badge-success' : user?.kycStatus === 'pending' ? 'badge-warning-glow' : 'badge-danger'}`}>
                            KYC: {user?.kycStatus?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        {/* Wallet pill */}
                        <span className="wallet-pill">
                            <Wallet size={14} style={{ color: 'hsl(255,85%,65%)' }} />
                            {account ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{
                                        fontWeight: 600, letterSpacing: '0.02em',
                                        color: (user?.walletAddress && account.toLowerCase() === user.walletAddress.toLowerCase())
                                            ? 'hsl(142,71%,45%)' : user?.walletAddress ? 'hsl(348,83%,47%)' : 'hsl(255,85%,65%)',
                                    }}>
                                        {account.slice(0, 6)}...{account.slice(-4)}
                                        {user?.walletAddress && account.toLowerCase() !== user.walletAddress.toLowerCase() && ' (Mismatch)'}
                                        {!user?.walletAddress && ' (Unlinked)'}
                                    </span>
                                    {!user?.walletAddress && (
                                        <button onClick={handleLinkWallet} className="btn-success" style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>
                                            LINK
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectWallet}
                                    disabled={isConnecting}
                                    className="wallet-connect-btn"
                                >
                                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                </button>
                            )}
                        </span>

                    </div>
                    {walletError && (
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'hsl(348,83%,47%)', marginTop: '0.5rem' }}>{walletError}</p>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    icon={ShieldCheck}
                    label="Profile Status"
                    value={user?.kycStatus === 'approved' || user?.kycStatus === 'verified' ? 'Verified' : user?.kycStatus === 'pending' ? 'Pending' : user?.kycStatus || '—'}
                    color={user?.kycStatus === 'approved' || user?.kycStatus === 'verified' ? 'hsl(142,71%,45%)' : user?.kycStatus === 'pending' ? 'hsl(38,92%,50%)' : 'hsl(348,83%,47%)'}
                    onClick={() => navigate('/profile')}
                />
                <StatCard
                    icon={Building}
                    label="Properties Owned"
                    value={properties.length}
                    color="hsl(255,85%,65%)"
                    onClick={() => navigate('/dashboard?tab=properties')}
                />
                <StatCard
                    icon={ArrowUpRight}
                    label="Active Sales"
                    value={activeSales.length}
                    color="hsl(280,80%,60%)"
                    onClick={() => navigate('/dashboard?tab=sales')}
                />
                <StatCard
                    icon={ArrowDownLeft}
                    label="Active Purchases"
                    value={activePurchases.length}
                    color="hsl(200,85%,55%)"
                    onClick={() => navigate('/dashboard?tab=sales')}
                />
            </div>

            {/* Main Content: 2-column layout */}
            <div className="dashboard-main-grid">
                {/* Two columns on md+ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

                    {/* Recent Properties */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div className="panel-header">
                            <h3 className="panel-title">
                                <Building size={18} style={{ color: 'hsl(255,85%,65%)' }} /> Recent Properties
                            </h3>
                            <button className="view-all-btn" onClick={() => navigate('/dashboard?tab=properties')}>
                                View All <ExternalLink size={12} />
                            </button>
                        </div>

                        {properties.length === 0 ? (
                            <div className="empty-state">
                                <Building size={36} className="empty-state-icon" />
                                <p style={{ fontSize: '0.875rem' }}>No registered properties yet</p>
                                <button className="btn btn-secondary" onClick={() => navigate('/register-property')} style={{ marginTop: '1rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}>
                                    Register Property
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {properties.slice(0, 4).map((prop) => (
                                    <div
                                        key={prop.id}
                                        className="list-item"
                                        onClick={() => navigate(`/properties/${prop.id}`)}
                                    >
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                Survey: {prop.surveyNumber}
                                                {(prop.status === 'active' || prop.status === 'verified') && <CheckCircle2 size={14} style={{ color: 'hsl(142,71%,45%)' }} />}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: 'hsl(220,15%,60%)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <MapPin size={12} /> {prop.district}{prop.state ? `, ${prop.state}` : ''}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <span className={`badge ${(prop.status === 'active' || prop.status === 'verified') ? 'badge-success' : 'badge-warning-glow'}`} style={{ fontSize: '0.65rem' }}>
                                                {prop.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Notifications */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <div className="panel-header">
                            <h3 className="panel-title">
                                <Bell size={18} style={{ color: 'hsl(255,85%,65%)' }} /> Notifications
                                {notifications.length > 0 && (
                                    <span className="notification-badge-count">{notifications.length}</span>
                                )}
                            </h3>
                        </div>

                        {notifications.length === 0 ? (
                            <div className="empty-state">
                                <Bell size={36} className="empty-state-icon" />
                                <p style={{ fontSize: '0.875rem' }}>No new notifications</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '320px', overflowY: 'auto' }} className="hide-scrollbar">
                                {notifications.slice(0, 8).map((notif) => {
                                    const NotifIcon = notif.icon;
                                    const colorMap = { success: 'hsl(142,71%,45%)', warning: 'hsl(38,92%,50%)', danger: 'hsl(348,83%,47%)' };
                                    const bgMap = { success: 'rgba(34,197,94,0.06)', warning: 'rgba(245,158,11,0.06)', danger: 'rgba(239,68,68,0.06)' };
                                    const borderMap = { success: 'rgba(34,197,94,0.15)', warning: 'rgba(245,158,11,0.15)', danger: 'rgba(239,68,68,0.15)' };
                                    return (
                                        <div key={notif.id} className="notification-item" style={{
                                            background: bgMap[notif.type], border: `1px solid ${borderMap[notif.type]}`,
                                        }}>
                                            <NotifIcon size={16} style={{ color: colorMap[notif.type], flexShrink: 0, marginTop: '0.15rem' }} />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: '0.85rem', fontWeight: 600, lineHeight: 1.4, color: 'hsl(210, 40%, 98%)' }}>{notif.text}</p>
                                                <p style={{ fontSize: '0.65rem', color: 'hsl(220,15%,60%)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Clock size={10} /> {notif.time ? new Date(notif.time).toLocaleDateString() : ''}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <div className="panel-header">
                        <h3 className="panel-title">
                            <Activity size={18} style={{ color: 'hsl(255,85%,65%)' }} /> Recent Transactions
                        </h3>
                        <button className="view-all-btn" onClick={() => navigate('/dashboard?tab=sales')}>
                            View All <ExternalLink size={12} />
                        </button>
                    </div>

                    {sales.length === 0 ? (
                        <div className="empty-state">
                            <Activity size={36} className="empty-state-icon" />
                            <p style={{ fontSize: '0.875rem' }}>No transactions yet</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.75rem' }}>
                            {sales.slice(0, 6).map((sale) => {
                                const isSeller = sale.sellerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase();
                                return (
                                    <div
                                        key={sale.id}
                                        className="list-item"
                                        onClick={() => navigate(`/properties/${sale.propertyId}`)}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                                {isSeller
                                                    ? <ArrowUpRight size={14} style={{ color: 'hsl(280,80%,60%)' }} />
                                                    : <ArrowDownLeft size={14} style={{ color: 'hsl(200,85%,55%)' }} />
                                                }
                                                <span className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>
                                                    {isSeller ? 'SELLING' : 'BUYING'}
                                                </span>
                                                <span className={`badge ${sale.status === 'completed' ? 'badge-success' : sale.status === 'cancelled' ? 'badge-danger' : 'badge-warning-glow'}`} style={{ fontSize: '0.6rem' }}>
                                                    {sale.status}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: 'hsl(220,15%,60%)' }}>
                                                Property: <span style={{ fontFamily: 'monospace', background: 'rgba(0,0,0,0.2)', padding: '0.1rem 0.3rem', borderRadius: '0.25rem' }}>{sale.propertyId?.slice(0, 8)}...</span>
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{
                                                fontWeight: 800, fontSize: '1.1rem',
                                                color: 'hsl(142,71%,45%)',
                                                textShadow: '0 0 8px rgba(34,197,94,0.3)',
                                            }}>
                                                ₹{Number(sale.salePrice).toLocaleString('en-IN')}
                                            </p>
                                            <p style={{ fontSize: '0.65rem', color: 'hsl(220,15%,60%)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                                <Clock size={10} /> {new Date(sale.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer info */}
            <div className="dashboard-footer">
                <ShieldCheck style={{ flexShrink: 0, color: 'hsl(255,85%,65%)', width: '1.2rem', height: '1.2rem' }} />
                <p style={{ fontSize: '0.75rem', color: 'hsl(220,15%,70%)', lineHeight: 1.6, fontWeight: 500 }}>
                    All property data is anchored on-chain. Transaction integrity is maintained via multi-signature smart contracts.
                </p>
            </div>
        </div >
    );
};

export default DashboardHome;
