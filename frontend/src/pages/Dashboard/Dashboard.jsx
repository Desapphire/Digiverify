import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import {
    Wallet, Activity, ShieldCheck, Building, CheckCircle2,
    Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft,
    Bell, XCircle, MapPin, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import './PropertyPages.css'; // Import the new Cyberpunk UI framework

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
                setWalletError(`Wallet mismatch! Expected this account's registered wallet.`);
            }
        } catch (err) {
            setWalletError(err.message || 'Failed to connect wallet');
        }
    };

    const handleLinkWallet = async () => {
        if (!account) return;
        setLoading(true);
        try {
            const { userService } = await import('../../services/user.service');
            const res = await userService.updateProfile({ walletAddress: account });
            if (res.data?.data) {
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

    // Notifications derived from data
    const notifications = [];
    sales.forEach(sale => {
        if (sale.status === 'completed') {
            notifications.push({ id: `${sale.id}-comp`, type: 'success', icon: CheckCircle2, text: `Sale completed for property record`, time: sale.updatedAt || sale.createdAt });
        }
        if (sale.status === 'cancelled') {
            notifications.push({ id: `${sale.id}-cancel`, type: 'danger', icon: XCircle, text: `Sale cancelled for property record`, time: sale.updatedAt || sale.createdAt });
        }
        if (sale.status === 'pending_signatures' || sale.status === 'initiated') {
            notifications.push({ id: `${sale.id}-pending`, type: 'warning', icon: Clock, text: `Sale awaiting signatures`, time: sale.createdAt });
        }
    });

    properties.forEach(prop => {
        if (prop.status === 'rejected') {
            notifications.push({ id: `${prop.id}-rejected`, type: 'danger', icon: XCircle, text: `Property registration rejected — Survey #${prop.surveyNumber}`, time: prop.updatedAt || prop.createdAt });
        }
    });

    if (user?.kycStatus === 'pending') {
        notifications.push({ id: 'kyc-pending', type: 'warning', icon: AlertTriangle, text: 'Identity verification is pending review', time: user.updatedAt });
    }
    if (user?.kycStatus === 'rejected') {
        notifications.push({ id: 'kyc-rejected', type: 'danger', icon: XCircle, text: 'Identity verification was rejected — please resubmit', time: user.updatedAt });
    }
    
    // Sort by time, most recent first
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Loading State
    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Activity style={{ width: '3rem', height: '3rem', color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.875rem', color: '#00E5FF' }}>Loading Dashboard Data...</p>
                </div>
            </div>
        );
    }

    const StatCard = ({ icon: Icon, label, value, color, onClick }) => (
        <div
            className="cyber-property-card"
            onClick={onClick}
            style={{
                '--tier-color': color, 
                '--tier-color-hover': color,
                cursor: onClick ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', 
                justifyContent: 'center', gap: '0.5rem',
                padding: '1.25rem',
                minHeight: '130px'
            }}
        >
            <div className="cyber-card-glow-orb" style={{ background: color, top: '-2rem', right: '-2rem', width: '5rem', height: '5rem', opacity: 0.15 }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 10 }}>
                <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(0,0,0,0.4)', border: `1px solid ${color}40`, boxShadow: `0 0 10px ${color}20` }}>
                    <Icon size={16} style={{ color }} />
                </div>
                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em', color: '#d1d5db' }}>{label}</span>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: 0, marginTop: '0.25rem', textShadow: `0 0 12px ${color}40`, position: 'relative', zIndex: 10 }}>{value}</p>
        </div>
    );

    return (
        <div className="dashboard-container animate-fade-in" style={{ maxWidth: '1400px' }}>

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 mt-2">
                <div>
                    <h1 className="text-4xl font-black tracking-tight mb-3 text-white">
                        Welcome, <span style={{ color: '#00E5FF', textShadow: '0 0 15px rgba(0,229,255,0.4)' }}>{user?.name || 'Citizen'}</span>
                    </h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div className="cyber-badge" style={{ 
                            '--badge-color': user?.kycStatus === 'approved' || user?.kycStatus === 'verified' ? '#00E5FF' : user?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444',
                            '--badge-bg': 'rgba(0,0,0,0.4)',
                            fontWeight: 700, padding: '0.5rem 1rem'
                        }}>
                            Identity Check: {user?.kycStatus?.toUpperCase() || 'UNKNOWN'}
                        </div>
                        
                        {/* Wallet Badge */}
                        <div className="cyber-badge" style={{ '--badge-bg': 'rgba(0,0,0,0.4)', '--badge-color': '#A855F7', '--badge-border': 'rgba(168,85,247,0.3)', padding: '0.5rem 1rem', display: 'flex', gap: '0.6rem' }}>
                            <Wallet size={16} />
                            {account ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontFamily: 'inherit', fontWeight: 600, color: (user?.walletAddress && account.toLowerCase() === user.walletAddress.toLowerCase()) ? '#00E5FF' : 'white' }}>
                                        {account.slice(0, 6)}...{account.slice(-4)}
                                        {user?.walletAddress && account.toLowerCase() !== user.walletAddress.toLowerCase() && ' (Mismatch)'}
                                        {!user?.walletAddress && ' (Unlinked)'}
                                    </span>
                                    {!user?.walletAddress && (
                                        <button onClick={handleLinkWallet} className="cyber-btn-hollow" style={{ '--btn-color': '#00E5FF', fontSize: '0.65rem', padding: '0.2rem 0.6rem' }}>
                                            Link Account
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnectWallet}
                                    disabled={isConnecting}
                                    style={{ background: 'none', border: 'none', color: '#00E5FF', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                >
                                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                </button>
                            )}
                        </div>
                    </div>
                    {walletError && (
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#EF4444', marginTop: '0.75rem' }}>{walletError}</p>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <StatCard
                    icon={ShieldCheck}
                    label="Identity Status"
                    value={user?.kycStatus === 'approved' || user?.kycStatus === 'verified' ? 'Verified' : user?.kycStatus === 'pending' ? 'Pending' : user?.kycStatus || '—'}
                    color={user?.kycStatus === 'approved' || user?.kycStatus === 'verified' ? '#00E5FF' : user?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444'}
                    onClick={() => navigate('/profile')}
                />
                <StatCard
                    icon={Building}
                    label="Properties Owned"
                    value={properties.length}
                    color="#A855F7"
                    onClick={() => navigate('/my-properties')}
                />
                <StatCard
                    icon={ArrowUpRight}
                    label="Active Sales"
                    value={activeSales.length}
                    color="#F59E0B"
                    onClick={() => navigate('/transactions')}
                />
                <StatCard
                    icon={ArrowDownLeft}
                    label="Active Purchases"
                    value={activePurchases.length}
                    color="#EC4899"
                    onClick={() => navigate('/transactions')}
                />
            </div>

            {/* Main Content: 2-column layout */}
            <div className="dashboard-main-grid">
                {/* Left Column (Properties & Notifications) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Recent Properties */}
                <div className="cyber-hud-bar" style={{ display: 'block', padding: '1.75rem' }}>
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={18} style={{ color: '#00E5FF' }} /> Recent Properties
                        </h3>
                        <button onClick={() => navigate('/my-properties')} style={{ background: 'transparent', border: 'none', color: '#00E5FF', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                            View All <ExternalLink size={14} />
                        </button>
                    </div>

                    {properties.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Building size={32} style={{ color: '#9ca3af', opacity: 0.5, margin: '0 auto 1rem' }} />
                            <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1rem' }}>No properties registered yet</p>
                            <button className="cyber-btn-hollow" onClick={() => navigate('/register-property')} style={{ '--btn-color': '#00E5FF', padding: '0.5rem 1.5rem', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                                Register Property
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {properties.slice(0, 4).map((prop) => (
                                <div
                                    key={prop.id}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
                                        border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', transition: 'all 0.2sease'
                                    }}
                                    onClick={() => navigate(`/properties/${prop.id}`)}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#00E5FF'; e.currentTarget.style.background = 'rgba(0,229,255,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; }}
                                >
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'white', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            Survey: {prop.surveyNumber}
                                            {(prop.status === 'active' || prop.status === 'verified') && <CheckCircle2 size={14} style={{ color: '#00E5FF' }} />}
                                        </p>
                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                            <MapPin size={12} /> {prop.district}{prop.state ? `, ${prop.state}` : ''}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="cyber-badge" style={{ 
                                            '--badge-color': (prop.status === 'active' || prop.status === 'verified') ? '#00E5FF' : (prop.status === 'rejected') ? '#EF4444' : '#F59E0B',
                                            '--badge-bg': 'transparent',
                                            padding: 0
                                        }}>
                                            {prop.status?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notifications */}
                <div className="cyber-hud-bar" style={{ display: 'block', padding: '1.75rem' }}>
                    <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Bell size={18} style={{ color: '#A855F7' }} /> Activity Notifications
                        </h3>
                    </div>

                    {notifications.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Bell size={32} style={{ color: '#9ca3af', opacity: 0.5, margin: '0 auto 1rem' }} />
                            <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>No recent activities</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }} className="hide-scrollbar">
                            {notifications.slice(0, 6).map((notif) => {
                                const NotifIcon = notif.icon;
                                const colorMap = { success: '#00E5FF', warning: '#F59E0B', danger: '#EF4444' };
                                const bgMap = { success: 'rgba(0,229,255,0.05)', warning: 'rgba(245,158,11,0.05)', danger: 'rgba(239,68,68,0.05)' };
                                
                                return (
                                    <div key={notif.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '1rem', background: bgMap[notif.type], border: `1px solid ${colorMap[notif.type]}40`, borderRadius: '12px' }}>
                                        <NotifIcon size={16} style={{ color: colorMap[notif.type], marginTop: '0.15rem', flexShrink: 0 }} />
                                        <div>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white', lineHeight: 1.4 }}>{notif.text}</p>
                                            <p style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                <Clock size={10} /> {notif.time ? new Date(notif.time).toLocaleDateString() : 'Just now'}
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
            <div className="cyber-hud-bar" style={{ display: 'block', padding: '1.75rem', marginBottom: '2rem' }}>
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={18} style={{ color: '#EC4899' }} /> Recent Transactions
                    </h3>
                    <button onClick={() => navigate('/transactions')} style={{ background: 'transparent', border: 'none', color: '#EC4899', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                        View All <ExternalLink size={14} />
                    </button>
                </div>

                {sales.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <Activity size={32} style={{ color: '#9ca3af', opacity: 0.5, margin: '0 auto 1rem' }} />
                        <p style={{ color: '#9ca3af', fontSize: '0.9rem' }}>No transaction history found</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
                        {sales.slice(0, 4).map((sale) => {
                            const isSeller = sale.sellerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase();
                            return (
                                <div
                                    key={sale.id}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer', transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => navigate(`/properties/${sale.propertyId}`)}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#EC4899'; e.currentTarget.style.background = 'rgba(236,72,153,0.05)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; }}
                                >
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            {isSeller
                                                ? <ArrowUpRight size={14} style={{ color: '#A855F7' }} />
                                                : <ArrowDownLeft size={14} style={{ color: '#00E5FF' }} />
                                            }
                                            <span className="cyber-badge" style={{ '--badge-bg': 'rgba(255,255,255,0.1)', '--badge-color': '#d1d5db', '--badge-border': 'transparent', padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}>
                                                {isSeller ? 'SELLING' : 'BUYING'}
                                            </span>
                                            <span className="cyber-badge" style={{ '--badge-color': sale.status === 'completed' ? '#00E5FF' : sale.status === 'cancelled' ? '#EF4444' : '#F59E0B', '--badge-bg': 'transparent', padding: '0', fontSize: '0.65rem' }}>
                                                {sale.status?.toUpperCase()}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                            Property: <span style={{ fontFamily: 'inherit', color: 'white' }}>{sale.propertyId?.slice(0, 8)}...</span>
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: 800, fontSize: '1.1rem', color: '#00E5FF', textShadow: '0 0 10px rgba(0,229,255,0.3)' }}>
                                            ₹{Number(sale.salePrice).toLocaleString('en-IN')}
                                        </p>
                                        <p style={{ fontSize: '0.7rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.3rem' }}>
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

            <div style={{
                padding: '1.25rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem'
            }}>
                <ShieldCheck style={{ color: '#00E5FF', flexShrink: 0 }} size={24} />
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.5 }}>
                    All property data is anchored on the Avalanche Network. Transaction integrity is maintained via automated smart contracts.
                </p>
            </div>
        </div >
    );
};

export default DashboardHome;
