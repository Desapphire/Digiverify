import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    ShieldCheck, Clock, CheckCircle2,
    XCircle, UserCheck, Key, Landmark, Users,
    Building2, Loader2, RefreshCcw, ArrowRight,
    Search, FileCheck, AlertCircle, ChevronRight,
    Eye, Shield, ArrowUpRight
} from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('kyc');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [error, setError] = useState('');

    // Data state
    const [kycRequests, setKycRequests] = useState([]);
    const [pendingProperties, setPendingProperties] = useState([]);
    const [sales, setSales] = useState([]);
    const [fundBlocks, setFundBlocks] = useState([]);
    const [recoveries, setRecoveries] = useState([]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');
        try {
            const [kycRes, propRes, salesRes, fundRes, recoveryRes] = await Promise.allSettled([
                adminService.listUsers('pending'),
                adminService.listProperties(),
                adminService.listSales(),
                adminService.getPendingFundBlocks(),
                adminService.getPendingRecoveries(),
            ]);

            if (kycRes.status === 'fulfilled') setKycRequests(kycRes.value.data?.data || []);
            if (propRes.status === 'fulfilled') setPendingProperties(propRes.value.data?.data || []);
            if (salesRes.status === 'fulfilled') setSales(salesRes.value.data?.data || []);
            if (fundRes.status === 'fulfilled') setFundBlocks(fundRes.value.data?.data || []);
            if (recoveryRes.status === 'fulfilled') setRecoveries(recoveryRes.value.data?.data || []);
        } catch (err) {
            setError('Failed to refresh dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Filter pending sales
    const pendingSales = sales.filter(s => !s.authoritySigned && s.status !== 'completed' && s.status !== 'cancelled');

    const stats = [
        {
            label: 'Pending Identity Checks',
            value: kycRequests.length,
            icon: UserCheck,
            theme: 'amber',
            tabKey: 'kyc',
            desc: 'Identity verification requests waiting for review',
            actionText: 'Review Identities'
        },
        {
            label: 'Pending Land Approvals',
            value: pendingProperties.length,
            icon: Building2,
            theme: 'blue',
            tabKey: 'property',
            desc: 'New property registrations waiting for review',
            actionText: 'Review Properties'
        },
        {
            label: 'Pending Property Sales',
            value: pendingSales.length,
            icon: FileCheck,
            theme: 'indigo',
            tabKey: 'sale',
            desc: 'Property sales waiting for officer approval',
            actionText: 'Review Sales'
        },
        {
            label: 'Pending Account Recoveries',
            value: recoveries.length,
            icon: Key,
            theme: 'emerald',
            tabKey: 'recovery',
            desc: 'Citizen account access recovery requests',
            actionText: 'Review Recoveries'
        },
    ];

    const TABS = [
        { key: 'kyc', label: 'Identity Checks', icon: UserCheck, count: kycRequests.length },
        { key: 'property', label: 'Land & Property', icon: Building2, count: pendingProperties.length },
        { key: 'sale', label: 'Property Sales', icon: FileCheck, count: pendingSales.length },
        { key: 'fund', label: 'Payment Holds', icon: Landmark, count: fundBlocks.length },
        { key: 'recovery', label: 'Account Recovery', icon: Key, count: recoveries.length },
    ];

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const handleApproveKyc = async (userId) => {
        setActionLoading(`kyc-approve-${userId}`);
        try {
            await adminService.approveKyc(userId);
            await fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectKyc = async (userId) => {
        const reason = window.prompt('Enter reason for rejection:');
        if (!reason) return;

        setActionLoading(`kyc-reject-${userId}`);
        try {
            await adminService.rejectKyc(userId, reason);
            await fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Rejection failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveProperty = async (propertyId) => {
        if (!window.confirm('Approve this property registration?')) return;
        setActionLoading(`prop-approve-${propertyId}`);
        try {
            await adminService.approveProperty(propertyId);
            await fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Property approval failed');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading && !kycRequests.length && !pendingProperties.length) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                gap: '1rem'
            }}>
                <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB'
                }}>
                    <Loader2 size={28} className="animate-spin" />
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        Loading Dashboard
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px' }}>
                        Loading pending requests and records...
                    </p>
                </div>
            </div>
        );
    }

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
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#047857',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#047857' }}></span>
                            Government Portal
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Officer Dashboard
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Review identity checks, property approvals, property sales, and account recoveries.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={fetchDashboardData}
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

                    <button
                        onClick={() => navigate('/authority/re-kyc')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '8px',
                            color: '#1D4ED8',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(37,99,235,0.06)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <RefreshCcw size={15} />
                        Re-KYC Portal
                    </button>

                    <button
                        onClick={() => navigate('/authority/kyc')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#0F172A',
                            border: '1px solid #0F172A',
                            borderRadius: '8px',
                            color: '#FFFFFF',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1E293B'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#0F172A'; }}
                    >
                        <UserCheck size={16} />
                        View Identity Checks
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '10px',
                    padding: '0.875rem 1.25rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    fontWeight: 600
                }}>
                    <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
                    {error}
                </div>
            )}

            {/* Metric Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.25rem',
                marginBottom: '1.75rem'
            }}>
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    const isActive = activeTab === stat.tabKey;

                    const themeStyles = {
                        amber: { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', bar: '#F59E0B' },
                        blue: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', bar: '#3B82F6' },
                        indigo: { bg: '#EEF2FF', border: '#C7D2FE', text: '#4338CA', bar: '#6366F1' },
                        emerald: { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', bar: '#10B981' }
                    }[stat.theme] || { bg: '#F1F5F9', border: '#E2E8F0', text: '#334155', bar: '#64748B' };

                    return (
                        <div
                            key={idx}
                            onClick={() => setActiveTab(stat.tabKey)}
                            style={{
                                backgroundColor: '#FFFFFF',
                                border: isActive ? `2px solid ${themeStyles.bar}` : '1px solid #E2E8F0',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                boxShadow: isActive ? '0 4px 12px rgba(0, 0, 0, 0.08)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between'
                            }}
                            onMouseOver={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.borderColor = '#CBD5E1';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.transform = 'none';
                                }
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        backgroundColor: themeStyles.bg,
                                        border: `1px solid ${themeStyles.border}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: themeStyles.text
                                    }}>
                                        <Icon size={20} />
                                    </div>
                                    <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 700,
                                        color: themeStyles.text,
                                        backgroundColor: themeStyles.bg,
                                        padding: '3px 8px',
                                        borderRadius: '9999px',
                                        border: `1px solid ${themeStyles.border}`
                                    }}>
                                        Review Queue
                                    </span>
                                </div>

                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B', marginBottom: '0.25rem' }}>
                                    {stat.label}
                                </div>

                                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                                    {stat.value}
                                </div>

                                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '6px' }}>
                                    {stat.desc}
                                </div>
                            </div>

                            <div style={{
                                marginTop: '1rem',
                                paddingTop: '0.75rem',
                                borderTop: '1px solid #F1F5F9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: isActive ? themeStyles.text : '#2563EB'
                            }}>
                                <span>{stat.actionText}</span>
                                <ArrowUpRight size={14} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Central Review Queue Section */}
            <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden'
            }}>
                {/* Tabs Header */}
                <div style={{
                    padding: '0.875rem 1.25rem',
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {TABS.map(tab => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '7px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        border: isActive ? '1px solid #0F172A' : '1px solid transparent',
                                        backgroundColor: isActive ? '#0F172A' : 'transparent',
                                        color: isActive ? '#FFFFFF' : '#475569',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isActive) e.currentTarget.style.backgroundColor = '#E2E8F0';
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <TabIcon size={16} />
                                    {tab.label}
                                    <span style={{
                                        padding: '1px 6px',
                                        borderRadius: '9999px',
                                        fontSize: '0.7rem',
                                        fontWeight: 800,
                                        backgroundColor: isActive ? '#334155' : '#E2E8F0',
                                        color: isActive ? '#FFFFFF' : '#475569'
                                    }}>
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                        Viewing: <strong style={{ color: '#0F172A' }}>{TABS.find(t => t.key === activeTab)?.label} Queue</strong>
                    </div>
                </div>

                {/* Queue Content Panel */}
                <div style={{ padding: '1.5rem', minHeight: '340px' }}>
                    {/* ─── 1. KYC QUEUE TAB ─── */}
                    {activeTab === 'kyc' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Pending Identity Checks
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                                        Review citizen identity details, home address, and photo match.
                                    </p>
                                </div>
                                <button
                                    onClick={() => navigate('/authority/kyc')}
                                    style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: '#2563EB',
                                        backgroundColor: '#EFF6FF',
                                        border: '1px solid #BFDBFE',
                                        padding: '5px 12px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    View All Checks <ArrowRight size={14} />
                                </button>
                            </div>

                            {kycRequests.length === 0 ? (
                                <EmptyState
                                    icon={UserCheck}
                                    title="No Pending Identity Checks"
                                    description="All citizen identity verification requests have been reviewed."
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {kycRequests.map(u => {
                                        const isApproving = actionLoading === `kyc-approve-${u.id}`;
                                        const isRejecting = actionLoading === `kyc-reject-${u.id}`;

                                        return (
                                            <div
                                                key={u.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '1rem 1.25rem',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #E2E8F0',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                    flexWrap: 'wrap',
                                                    gap: '1rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                                                        fontWeight: 800,
                                                        fontSize: '1rem',
                                                        flexShrink: 0
                                                    }}>
                                                        {u.name ? u.name.charAt(0).toUpperCase() : <Users size={20} />}
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                                                                {u.name || 'Unnamed Citizen'}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.68rem',
                                                                fontWeight: 700,
                                                                backgroundColor: '#FEF3C7',
                                                                color: '#B45309',
                                                                border: '1px solid #FDE68A',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {u.kycStatus || 'Pending'}
                                                            </span>
                                                            {u.faceVerified && (
                                                                <span style={{
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 700,
                                                                    backgroundColor: '#ECFDF5',
                                                                    color: '#047857',
                                                                    border: '1px solid #A7F3D0',
                                                                    padding: '1px 6px',
                                                                    borderRadius: '4px'
                                                                }}>
                                                                    Photo Matched
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.75rem', color: '#64748B' }}>
                                                            <span>{u.email || 'No email provided'}</span>
                                                            <span>•</span>
                                                            <span style={{ fontFamily: 'monospace' }}>Account: {shortenWallet(u.walletAddress)}</span>
                                                            {u.governmentId && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>ID: {u.governmentId}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleApproveKyc(u.id)}
                                                        disabled={isApproving || isRejecting}
                                                        style={{
                                                            padding: '7px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            backgroundColor: '#ECFDF5',
                                                            color: '#047857',
                                                            border: '1px solid #A7F3D0',
                                                            cursor: isApproving ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#D1FAE5'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ECFDF5'; }}
                                                    >
                                                        {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Approve
                                                    </button>

                                                    <button
                                                        onClick={() => handleRejectKyc(u.id)}
                                                        disabled={isApproving || isRejecting}
                                                        style={{
                                                            padding: '7px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            backgroundColor: '#FEF2F2',
                                                            color: '#B91C1C',
                                                            border: '1px solid #FECACA',
                                                            cursor: isRejecting ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                                                    >
                                                        {isRejecting ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                                                        Reject
                                                    </button>

                                                    <button
                                                        onClick={() => navigate('/authority/kyc')}
                                                        style={{
                                                            padding: '7px 12px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 600,
                                                            backgroundColor: '#FFFFFF',
                                                            color: '#334155',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Eye size={13} />
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── 2. PROPERTIES QUEUE TAB ─── */}
                    {activeTab === 'property' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Pending Land Approvals
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                                        Verify survey numbers, land area, location, and ownership documents.
                                    </p>
                                </div>
                            </div>

                            {pendingProperties.length === 0 ? (
                                <EmptyState
                                    icon={Building2}
                                    title="No Pending Land Approvals"
                                    description="All property registration requests have been reviewed."
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {pendingProperties.map(p => {
                                        const isApproving = actionLoading === `prop-approve-${p.id}`;

                                        return (
                                            <div
                                                key={p.id}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '1rem 1.25rem',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#FFFFFF',
                                                    border: '1px solid #E2E8F0',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                    flexWrap: 'wrap',
                                                    gap: '1rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                                                                {p.propertyCode || `Property #${p.id.slice(0, 8)}`}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '0.68rem',
                                                                fontWeight: 700,
                                                                backgroundColor: '#EEF2FF',
                                                                color: '#4338CA',
                                                                border: '1px solid #C7D2FE',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                Survey No: {p.surveyNumber || 'N/A'}
                                                            </span>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.75rem', color: '#64748B' }}>
                                                            <span>District: <strong>{p.district || '—'}</strong>, {p.state || '—'}</span>
                                                            <span>•</span>
                                                            <span>Area: <strong>{p.areaSqft ? `${p.areaSqft} sq.ft` : '—'}</strong></span>
                                                            <span>•</span>
                                                            <span style={{ fontFamily: 'monospace' }}>Owner: {shortenWallet(p.ownerWallet)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleApproveProperty(p.id)}
                                                        disabled={isApproving}
                                                        style={{
                                                            padding: '7px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            backgroundColor: '#ECFDF5',
                                                            color: '#047857',
                                                            border: '1px solid #A7F3D0',
                                                            cursor: isApproving ? 'not-allowed' : 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.15s'
                                                        }}
                                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#D1FAE5'; }}
                                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ECFDF5'; }}
                                                    >
                                                        {isApproving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                                        Approve
                                                    </button>

                                                    <button
                                                        onClick={() => navigate(`/authority/property/${p.id}`)}
                                                        style={{
                                                            padding: '7px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 600,
                                                            backgroundColor: '#FFFFFF',
                                                            color: '#334155',
                                                            border: '1px solid #CBD5E1',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        View Property <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── 3. SALE TRANSACTIONS QUEUE TAB ─── */}
                    {activeTab === 'sale' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Pending Property Sales
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                                        Review and approve property sales and ownership transfers.
                                    </p>
                                </div>
                            </div>

                            {sales.length === 0 ? (
                                <EmptyState
                                    icon={FileCheck}
                                    title="No Pending Property Sales"
                                    description="All property sales have been reviewed and approved."
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {sales.map(tx => (
                                        <div
                                            key={tx.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem 1.25rem',
                                                borderRadius: '10px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #E2E8F0',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                flexWrap: 'wrap',
                                                gap: '1rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#EEF2FF',
                                                    border: '1px solid #C7D2FE',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#4338CA',
                                                    flexShrink: 0
                                                }}>
                                                    <FileCheck size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                                                            Sale #{tx.id.slice(0, 8)}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            backgroundColor: tx.status === 'completed' ? '#ECFDF5' : tx.status === 'cancelled' ? '#FEF2F2' : '#FEF3C7',
                                                            color: tx.status === 'completed' ? '#047857' : tx.status === 'cancelled' ? '#B91C1C' : '#B45309',
                                                            border: `1px solid ${tx.status === 'completed' ? '#A7F3D0' : tx.status === 'cancelled' ? '#FECACA' : '#FDE68A'}`,
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {tx.status}
                                                        </span>
                                                        {tx.authoritySigned && (
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                fontWeight: 700,
                                                                backgroundColor: '#ECFDF5',
                                                                color: '#047857',
                                                                border: '1px solid #A7F3D0',
                                                                padding: '1px 6px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                Officer Approved
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.75rem', color: '#64748B' }}>
                                                        <span style={{ fontFamily: 'monospace' }}>Seller: {shortenWallet(tx.sellerWallet)}</span>
                                                        <span>→</span>
                                                        <span style={{ fontFamily: 'monospace' }}>Buyer: {shortenWallet(tx.buyerWallet)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                                                        Sale Price
                                                    </div>
                                                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                                                        ₹{tx.salePrice?.toLocaleString()}
                                                    </div>
                                                </div>

                                                {!tx.authoritySigned && tx.status !== 'completed' && tx.status !== 'cancelled' && (
                                                    <button
                                                        onClick={() => navigate(`/authority/sale/${tx.id}`)}
                                                        style={{
                                                            padding: '7px 14px',
                                                            borderRadius: '6px',
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            backgroundColor: '#0F172A',
                                                            color: '#FFFFFF',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        Review & Approve <ArrowRight size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── 4. FUND BLOCKS QUEUE TAB ─── */}
                    {activeTab === 'fund' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Pending Payment Holds
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                                        Review security deposits and payment holds for property purchases.
                                    </p>
                                </div>
                            </div>

                            {fundBlocks.length === 0 ? (
                                <EmptyState
                                    icon={Landmark}
                                    title="No Pending Payment Holds"
                                    description="All payment deposits are settled and up to date."
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {fundBlocks.map(fb => (
                                        <div
                                            key={fb.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem 1.25rem',
                                                borderRadius: '10px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #E2E8F0',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                flexWrap: 'wrap',
                                                gap: '1rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#EFF6FF',
                                                    border: '1px solid #BFDBFE',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#2563EB',
                                                    flexShrink: 0
                                                }}>
                                                    <Landmark size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                                                            Hold #{String(fb.id || '').slice(0, 8)}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            backgroundColor: fb.status === 'blocked' ? '#ECFDF5' : '#FEF3C7',
                                                            color: fb.status === 'blocked' ? '#047857' : '#B45309',
                                                            border: `1px solid ${fb.status === 'blocked' ? '#A7F3D0' : '#FDE68A'}`,
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {fb.status || 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.75rem', color: '#64748B' }}>
                                                        <span style={{ fontFamily: 'monospace' }}>Buyer Account: {shortenWallet(fb.buyer_wallet || fb.buyerWallet)}</span>
                                                        <span>•</span>
                                                        <span>Currency: <strong>{fb.currency || 'INR'}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                                                    Hold Amount
                                                </div>
                                                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#047857' }}>
                                                    ₹{parseFloat(fb.block_amount || fb.blockAmount || 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── 5. WALLET RECOVERY QUEUE TAB ─── */}
                    {activeTab === 'recovery' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Pending Account Recoveries
                                    </h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '3px 0 0 0' }}>
                                        Review identity proof to help citizens recover account access.
                                    </p>
                                </div>
                            </div>

                            {recoveries.length === 0 ? (
                                <EmptyState
                                    icon={Key}
                                    title="No Pending Recoveries"
                                    description="There are currently no citizen account recovery requests waiting for review."
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {recoveries.map(r => (
                                        <div
                                            key={r.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '1rem 1.25rem',
                                                borderRadius: '10px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #E2E8F0',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                                flexWrap: 'wrap',
                                                gap: '1rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div style={{
                                                    width: '44px',
                                                    height: '44px',
                                                    borderRadius: '10px',
                                                    backgroundColor: '#ECFDF5',
                                                    border: '1px solid #A7F3D0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#047857',
                                                    flexShrink: 0
                                                }}>
                                                    <Key size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                                                            Recovery Request #{String(r.id || '').slice(0, 8)}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.68rem',
                                                            fontWeight: 700,
                                                            backgroundColor: r.status === 'completed' ? '#ECFDF5' : '#FEF3C7',
                                                            color: r.status === 'completed' ? '#047857' : '#B45309',
                                                            border: `1px solid ${r.status === 'completed' ? '#A7F3D0' : '#FDE68A'}`,
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {r.status || 'Pending'}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.75rem', color: '#64748B' }}>
                                                        <span style={{ fontFamily: 'monospace' }}>Target Account: {shortenWallet(r.old_wallet || r.oldWallet || r.user_id)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <button
                                                    onClick={() => navigate(`/authority/wallet-recovery/${r.id}`)}
                                                    style={{
                                                        padding: '7px 14px',
                                                        borderRadius: '6px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        backgroundColor: '#0F172A',
                                                        color: '#FFFFFF',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    Review Request <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{
                marginTop: '2rem',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.78rem',
                color: '#64748B'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} style={{ color: '#047857' }} />
                    <span>
                        <strong>DigiVerify Portal:</strong> All officer actions are recorded for security and audit compliance.
                    </span>
                </div>
                <div style={{ fontWeight: 600, color: '#0F172A' }}>
                    Secure Government Registry
                </div>
            </div>
        </div>
    );
};

// Simple Clean Empty State Component
const EmptyState = ({ icon: Icon, title, description }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#F8FAFC',
        border: '1px dashed #CBD5E1',
        borderRadius: '12px'
    }}>
        <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            marginBottom: '1rem'
        }}>
            <Icon size={24} />
        </div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0, marginBottom: '4px' }}>
            {title}
        </h4>
        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0, maxWidth: '380px' }}>
            {description}
        </p>
    </div>
);

export default AdminDashboard;
