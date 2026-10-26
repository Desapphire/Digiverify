import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import {
    Wallet, Activity, ShieldCheck, Building, CheckCircle2,
    Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft,
    Bell, XCircle, MapPin, ExternalLink, Copy, Search,
    FileText, KeyRound, ChevronRight, Sparkles, Layers,
    ShieldAlert, Lock, RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import './PropertyPages.css';

const Dashboard = () => {
    const { user } = useAuth();
    const { account, connectWallet, isConnecting } = useWeb3();
    const navigate = useNavigate();

    const [properties, setProperties] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [walletError, setWalletError] = useState('');
    const [copiedWallet, setCopiedWallet] = useState(false);

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

    const handleCopyWallet = (address) => {
        if (!address) return;
        navigator.clipboard.writeText(address);
        setCopiedWallet(true);
        setTimeout(() => setCopiedWallet(false), 2000);
    };

    // Derived stats
    const activeSales = sales.filter(s => s.sellerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled');
    const activePurchases = sales.filter(s => s.buyerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled');
    const verifiedCount = properties.filter(p => p.status === 'active' || p.status === 'verified').length;
    const rejectedProperties = properties.filter(p => p.status === 'rejected');

    // Notifications derived from data
    const notifications = [];
    sales.forEach(sale => {
        if (sale.status === 'completed') {
            notifications.push({ id: `${sale.id}-comp`, type: 'success', icon: CheckCircle2, text: `Property sale completed successfully`, time: sale.updatedAt || sale.createdAt });
        }
        if (sale.status === 'cancelled') {
            notifications.push({ id: `${sale.id}-cancel`, type: 'danger', icon: XCircle, text: `Property transfer was cancelled`, time: sale.updatedAt || sale.createdAt });
        }
        if (sale.status === 'pending_signatures' || sale.status === 'initiated') {
            notifications.push({ id: `${sale.id}-pending`, type: 'warning', icon: Clock, text: `Transfer waiting for signatures`, time: sale.createdAt });
        }
    });

    properties.forEach(prop => {
        if (prop.status === 'rejected') {
            notifications.push({ id: `${prop.id}-rejected`, type: 'danger', icon: XCircle, text: `Property registration rejected — Survey #${prop.surveyNumber}`, time: prop.updatedAt || prop.createdAt });
        }
        if (prop.status === 'frozen') {
            notifications.push({ id: `${prop.id}-frozen`, type: 'danger', icon: Lock, text: `${prop.propertyCode || 'Property'} (Survey #${prop.surveyNumber}) is temporarily frozen by court order.`, time: prop.updatedAt || prop.createdAt });
        }
        if (prop.status === 'under_dispute') {
            notifications.push({ id: `${prop.id}-dispute`, type: 'warning', icon: AlertTriangle, text: `${prop.propertyCode || 'Property'} (Survey #${prop.surveyNumber}) is currently under dispute.`, time: prop.updatedAt || prop.createdAt });
        }
    });

    if (user?.kycStatus === 'approved' || user?.kycStatus === 'verified') {
        notifications.push({ id: 'kyc-approved', type: 'success', icon: CheckCircle2, text: 'Identity verified successfully on blockchain', time: user.updatedAt || user.createdAt });
    } else if (user?.kycStatus === 'pending') {
        notifications.push({ id: 'kyc-pending', type: 'warning', icon: Clock, text: 'Identity verification is under review', time: user.updatedAt || user.createdAt });
    } else if (user?.kycStatus === 'rejected') {
        notifications.push({ id: 'kyc-rejected', type: 'danger', icon: AlertTriangle, text: 'Identity verification needs action or re-submission', time: user.updatedAt || user.createdAt });
    }

    // Sort by time, most recent first
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Loading State
    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Activity style={{ width: '2.5rem', height: '2.5rem', color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', fontSize: '0.875rem', color: '#1E40AF' }}>Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    const isVerified = user?.kycStatus === 'approved' || user?.kycStatus === 'verified';
    const isPending = user?.kycStatus === 'pending';
    const displayedWallet = account || user?.walletAddress || '';

    return (
        <div className="dashboard-container">

            {/* ─── Hero Banner ─── */}
            <div className="dashboard-hero">
                <div className="dashboard-hero-content">
                    <div className="hero-left">
                        <div className="hero-pretitle">
                            <ShieldCheck size={16} className="text-blue-600" />
                            <span>LAND REGISTRY PORTAL</span>
                        </div>
                        <h1 className="dashboard-hero-title">
                            Welcome back, <span className="hero-name">{user?.name || 'User'}</span>
                        </h1>
                        <p className="dashboard-hero-subtitle">
                            Manage your properties, check verification status, and buy or sell land safely.
                        </p>

                        <div className="hero-pills-row">
                            {/* Identity Status Pill */}
                            <div className={`gov-identity-pill ${isVerified ? 'verified' : isPending ? 'pending' : 'action-required'}`}>
                                {isVerified ? (
                                    <>
                                        <CheckCircle2 size={14} />
                                        <span>Verified Citizen</span>
                                    </>
                                ) : isPending ? (
                                    <>
                                        <Clock size={14} />
                                        <span>Verification Pending</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle size={14} />
                                        <span>Action Required: Re-KYC</span>
                                    </>
                                )}
                            </div>

                            {/* Citizen ID Badge */}
                            <div className="gov-meta-pill">
                                <span className="pill-label">ID:</span>
                                <span className="pill-val font-mono">{user?.id ? user.id.slice(0, 8) + '...' : 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Web3 Wallet Card */}
                    <div className="hero-wallet-card">
                        <div className="wallet-card-header">
                            <div className="wallet-icon-box">
                                <Wallet size={18} />
                            </div>
                            <div>
                                <div className="wallet-card-label">Connected Wallet</div>
                                <div className="wallet-network-tag">Ethereum Network</div>
                            </div>
                        </div>

                        {displayedWallet ? (
                            <div className="wallet-info-row">
                                <div className="wallet-address-chip" title={displayedWallet}>
                                    <span className="address-text">
                                        {displayedWallet.slice(0, 6)}...{displayedWallet.slice(-4)}
                                    </span>
                                    <button
                                        className="wallet-copy-btn"
                                        onClick={() => handleCopyWallet(displayedWallet)}
                                        title="Copy wallet address"
                                    >
                                        {copiedWallet ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                    </button>
                                </div>

                                {!user?.walletAddress && account && (
                                    <button onClick={handleLinkWallet} className="wallet-action-btn link-btn">
                                        Link to ID
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="wallet-connect-wrapper">
                                <button
                                    onClick={handleConnectWallet}
                                    disabled={isConnecting}
                                    className="wallet-action-btn connect-btn"
                                >
                                    <Wallet size={14} />
                                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                </button>
                            </div>
                        )}

                        {walletError && (
                            <div className="wallet-error-text">
                                <AlertTriangle size={12} /> {walletError}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Action Required Banner if Property Application Rejected */}
            {rejectedProperties.length > 0 && (
                <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderLeft: '5px solid #DC2626',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#FEE2E2',
                            border: '1px solid #FCA5A5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#DC2626',
                            flexShrink: 0
                        }}>
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                                Property Registration Rejected ({rejectedProperties.length} Application{rejectedProperties.length > 1 ? 's' : ''})
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: '#B91C1C', margin: '2px 0 0 0' }}>
                                The Land Authority officer has provided feedback on <strong>{rejectedProperties[0].propertyCode || 'your application'}</strong>: "{rejectedProperties[0].adminComments || 'Document verification failed'}". You can correct the details and reapply.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => navigate(`/reapply-property/${rejectedProperties[0].id}`)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '9px 18px',
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                            }}
                        >
                            <RotateCcw size={14} /> Review & Reapply
                        </button>
                    </div>
                </div>
            )}

            {/* Action Required Banner if Re-KYC requested */}
            {!isVerified && !isPending && (
                <div style={{
                    backgroundColor: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '12px',
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    boxShadow: '0 1px 3px rgba(217, 119, 6, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#FEF3C7',
                            border: '1px solid #FCD34D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#D97706',
                            flexShrink: 0
                        }}>
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                                Identity Verification Needs Attention (Action Required)
                            </h4>
                            <p style={{ fontSize: '0.82rem', color: '#78350F', margin: '2px 0 0 0' }}>
                                The Land Authority has requested updated details or re-upload for your identity check.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/reapply-kyc')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 18px',
                            backgroundColor: '#2563EB',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        Reapply KYC <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* ─── 4 Clean Stat Cards ─── */}
            <div className="stats-grid">
                <div className="gov-stat-card" onClick={() => navigate('/profile')}>
                    <div className="gov-stat-top">
                        <div className="gov-stat-icon" style={{ background: isVerified ? '#ECFDF5' : '#FEF3C7', color: isVerified ? '#059669' : '#D97706' }}>
                            <ShieldCheck size={20} />
                        </div>
                        <span className="gov-stat-badge" style={{ background: isVerified ? '#ECFDF5' : '#FEF3C7', color: isVerified ? '#065F46' : '#92400E', borderColor: isVerified ? '#A7F3D0' : '#FDE68A' }}>
                            {isVerified ? 'VERIFIED' : 'PENDING'}
                        </span>
                    </div>
                    <div className="gov-stat-body">
                        <div className="gov-stat-label">KYC Verification</div>
                        <div className="gov-stat-number">{isVerified ? 'Verified' : 'Action Required'}</div>
                    </div>
                    <div className="gov-stat-footer">
                        <span>View Verification</span>
                        <ChevronRight size={14} />
                    </div>
                </div>

                <div className="gov-stat-card" onClick={() => navigate('/my-properties')}>
                    <div className="gov-stat-top">
                        <div className="gov-stat-icon" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
                            <Building size={20} />
                        </div>
                        <span className="gov-stat-badge" style={{ background: '#EFF6FF', color: '#1E40AF', borderColor: '#BFDBFE' }}>
                            {verifiedCount} ACTIVE
                        </span>
                    </div>
                    <div className="gov-stat-body">
                        <div className="gov-stat-label">My Properties</div>
                        <div className="gov-stat-number">{properties.length}</div>
                    </div>
                    <div className="gov-stat-footer">
                        <span>View Properties</span>
                        <ChevronRight size={14} />
                    </div>
                </div>

                <div className="gov-stat-card" onClick={() => navigate('/transactions')}>
                    <div className="gov-stat-top">
                        <div className="gov-stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}>
                            <ArrowUpRight size={20} />
                        </div>
                        <span className="gov-stat-badge" style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' }}>
                            SELLING
                        </span>
                    </div>
                    <div className="gov-stat-body">
                        <div className="gov-stat-label">Selling</div>
                        <div className="gov-stat-number">{activeSales.length}</div>
                    </div>
                    <div className="gov-stat-footer">
                        <span>View Sales</span>
                        <ChevronRight size={14} />
                    </div>
                </div>

                <div className="gov-stat-card" onClick={() => navigate('/transactions')}>
                    <div className="gov-stat-top">
                        <div className="gov-stat-icon" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                            <ArrowDownLeft size={20} />
                        </div>
                        <span className="gov-stat-badge" style={{ background: '#F0FDF4', color: '#166534', borderColor: '#BBF7D0' }}>
                            BUYING
                        </span>
                    </div>
                    <div className="gov-stat-body">
                        <div className="gov-stat-label">Buying</div>
                        <div className="gov-stat-number">{activePurchases.length}</div>
                    </div>
                    <div className="gov-stat-footer">
                        <span>View Purchases</span>
                        <ChevronRight size={14} />
                    </div>
                </div>
            </div>

            {/* ─── Quick Service Action Grid ─── */}
            <div className="services-section">
                <div className="section-header-row">
                    <h2 className="section-title">
                        <Layers size={18} className="text-blue-600" />
                        Quick Actions
                    </h2>
                    <span className="section-subtitle">Common property services</span>
                </div>

                <div className="quick-action-grid">
                    <div className="quick-action-card" onClick={() => navigate('/register-property')}>
                        <div className="action-card-icon" style={{ background: '#EFF6FF', color: '#1E40AF', borderColor: '#DBEAFE' }}>
                            <Building size={22} />
                        </div>
                        <div className="action-card-content">
                            <h3 className="action-card-title">Add Property</h3>
                            <p className="action-card-desc">Register a new property to verify ownership on the blockchain</p>
                        </div>
                        <ChevronRight size={18} className="action-arrow" />
                    </div>

                    <div className="quick-action-card" onClick={() => navigate('/search-property')}>
                        <div className="action-card-icon" style={{ background: '#F0FDF4', color: '#16A34A', borderColor: '#DCFCE7' }}>
                            <Search size={22} />
                        </div>
                        <div className="action-card-content">
                            <h3 className="action-card-title">Search Records</h3>
                            <p className="action-card-desc">Search and verify properties, survey numbers, and ownership history</p>
                        </div>
                        <ChevronRight size={18} className="action-arrow" />
                    </div>

                    <div className="quick-action-card" onClick={() => navigate('/sale')}>
                        <div className="action-card-icon" style={{ background: '#FEF3C7', color: '#D97706', borderColor: '#FDE68A' }}>
                            <ArrowUpRight size={22} />
                        </div>
                        <div className="action-card-content">
                            <h3 className="action-card-title">Sell Property</h3>
                            <p className="action-card-desc">Create a sale agreement and transfer ownership securely</p>
                        </div>
                        <ChevronRight size={18} className="action-arrow" />
                    </div>

                    <div className="quick-action-card" onClick={() => navigate('/wallet-recovery')}>
                        <div className="action-card-icon" style={{ background: '#EFF6FF', color: '#2563EB', borderColor: '#DBEAFE' }}>
                            <KeyRound size={22} />
                        </div>
                        <div className="action-card-content">
                            <h3 className="action-card-title">Locked Payments</h3>
                            <p className="action-card-desc">Recover wallet access, claim locked funds, or resolve payment holds</p>
                        </div>
                        <ChevronRight size={18} className="action-arrow" />
                    </div>
                </div>
            </div>

            {/* ─── 2-Column Content: Recent Properties & Activity Feed ─── */}
            <div className="dashboard-main-grid">

                {/* Left Column: Recent Properties Table / Grid */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div className="panel-title-box">
                            <Building size={18} className="text-blue-700" />
                            <h3 className="panel-title">Recent Properties</h3>
                        </div>
                        <button onClick={() => navigate('/my-properties')} className="panel-action-link">
                            View All ({properties.length}) <ChevronRight size={14} />
                        </button>
                    </div>

                    {properties.length === 0 ? (
                        <div className="empty-panel-state">
                            <Building size={36} className="empty-icon" />
                            <h4>No Properties Registered</h4>
                            <p>Add your first property to get started with verification and secure sales.</p>
                            <button className="gov-primary-btn" onClick={() => navigate('/register-property')}>
                                Add Property
                            </button>
                        </div>
                    ) : (
                        <div className="property-rows-list">
                            {properties.slice(0, 4).map((prop) => {
                                const isPropVerified = prop.status === 'active' || prop.status === 'verified';
                                return (
                                    <div
                                        key={prop.id}
                                        className="gov-parcel-row"
                                        onClick={() => navigate(`/properties/${prop.id}`)}
                                    >
                                        <div className="parcel-main-info">
                                            <div className="parcel-survey-header">
                                                <span className="survey-badge">SURVEY #{prop.surveyNumber}</span>
                                                {prop.propertyCode && (
                                                    <span className="code-badge">{prop.propertyCode}</span>
                                                )}
                                                {isPropVerified && (
                                                    <span className="verified-stamp">
                                                        <CheckCircle2 size={12} /> Verified
                                                    </span>
                                                )}
                                            </div>
                                            <div className="parcel-location">
                                                <MapPin size={13} className="text-slate-400" />
                                                <span>{prop.district}{prop.state ? `, ${prop.state}` : ''}</span>
                                                <span className="dot-sep">&bull;</span>
                                                <span>{prop.areaSqft ? `${Number(prop.areaSqft).toLocaleString()} sq.ft` : 'Area Unspecified'}</span>
                                            </div>
                                        </div>

                                        <div className="parcel-right-actions">
                                            <span className={`gov-status-tag ${prop.status}`}>
                                                {prop.status?.replace('_', ' ').toUpperCase()}
                                            </span>
                                            <button
                                                className="view-record-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/properties/${prop.id}`);
                                                }}
                                            >
                                                View Details <ChevronRight size={13} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Real-time Activity Feed */}
                <div className="dashboard-panel">
                    <div className="panel-header">
                        <div className="panel-title-box">
                            <Activity size={18} className="text-blue-700" />
                            <h3 className="panel-title">Recent Activity</h3>
                        </div>
                        <button onClick={() => navigate('/notifications')} className="panel-action-link">
                            All Events <ChevronRight size={14} />
                        </button>
                    </div>

                    {notifications.length === 0 ? (
                        <div className="empty-panel-state">
                            <Bell size={36} className="empty-icon" />
                            <h4>No Recent Activities</h4>
                            <p>Updates on your properties and transactions will appear here.</p>
                        </div>
                    ) : (
                        <div className="activity-feed-list">
                            {notifications.slice(0, 5).map((notif) => {
                                const NotifIcon = notif.icon;
                                return (
                                    <div key={notif.id} className={`activity-feed-item ${notif.type}`}>
                                        <div className="activity-icon-col">
                                            <div className="activity-icon-bubble">
                                                <NotifIcon size={14} />
                                            </div>
                                        </div>
                                        <div className="activity-content-col">
                                            <div className="activity-text">{notif.text}</div>
                                            <div className="activity-timestamp">
                                                <Clock size={11} />
                                                <span>{notif.time ? new Date(notif.time).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Synchronized'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Recent Transactions Ledger Card ─── */}
            <div className="dashboard-panel mt-6">
                <div className="panel-header">
                    <div className="panel-title-box">
                        <FileText size={18} className="text-blue-700" />
                        <h3 className="panel-title">Recent Transactions</h3>
                    </div>
                    <button onClick={() => navigate('/transactions')} className="panel-action-link">
                        View All <ChevronRight size={14} />
                    </button>
                </div>

                {sales.length === 0 ? (
                    <div className="empty-panel-state">
                        <Activity size={36} className="empty-icon" />
                        <h4>No Transactions Yet</h4>
                        <p>Your buying and selling activity will show up here.</p>
                    </div>
                ) : (
                    <div className="tx-grid-responsive">
                        {sales.slice(0, 4).map((sale) => {
                            const isSeller = sale.sellerWallet?.toLowerCase() === user?.walletAddress?.toLowerCase();
                            return (
                                <div
                                    key={sale.id}
                                    className="tx-ledger-card"
                                    onClick={() => navigate(`/properties/${sale.propertyId}`)}
                                >
                                    <div className="tx-card-top">
                                        <div className="tx-direction-tag">
                                            {isSeller ? (
                                                <span className="tx-type-badge sell">
                                                    <ArrowUpRight size={13} /> SELLING
                                                </span>
                                            ) : (
                                                <span className="tx-type-badge buy">
                                                    <ArrowDownLeft size={13} /> BUYING
                                                </span>
                                            )}
                                        </div>
                                        <span className={`tx-status-badge ${sale.status}`}>
                                            {sale.status?.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="tx-card-middle">
                                        <div className="tx-amount">
                                            ₹{Number(sale.salePrice).toLocaleString('en-IN')}
                                        </div>
                                        <div className="tx-prop-id font-mono">
                                            Property #{sale.propertyId?.slice(0, 8)}...
                                        </div>
                                    </div>

                                    <div className="tx-card-bottom">
                                        <div className="tx-date">
                                            <Clock size={11} />
                                            <span>{new Date(sale.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        <span className="tx-link-text">
                                            View Details <ExternalLink size={12} />
                                        </span>
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

export default Dashboard;
