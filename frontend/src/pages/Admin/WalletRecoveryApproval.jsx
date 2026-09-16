import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    KeyRound, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, ChevronDown,
    ChevronUp, ShieldCheck, ShieldAlert, Clock,
    ArrowRight, UserCheck, AlertTriangle, Copy,
    Fingerprint, User, FileText, ExternalLink, Sparkles,
    Shield, Check
} from 'lucide-react';

const WalletRecoveryApproval = () => {
    const navigate = useNavigate();
    const [recoveries, setRecoveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [newWalletInput, setNewWalletInput] = useState({});
    const [copiedId, setCopiedId] = useState('');

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
    };

    const fetchRecoveries = async () => {
        setLoading(true);
        try {
            const res = await adminService.getPendingRecoveries();
            setRecoveries(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch recoveries:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecoveries();
    }, []);

    const handleVerifyIdentity = async (recoveryId) => {
        setActionLoading(recoveryId);
        try {
            await adminService.verifyRecovery(recoveryId);
            await fetchRecoveries();
        } catch (err) {
            alert(err.response?.data?.message || 'Identity verification failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleComplete = async (recoveryId) => {
        const newWallet = newWalletInput[recoveryId];
        if (!newWallet || !newWallet.trim()) {
            alert('Please enter the new account address before completing recovery.');
            return;
        }
        if (!window.confirm('Reassign all properties to the new account?')) return;
        setActionLoading(recoveryId);
        try {
            await adminService.completeRecovery(recoveryId, newWallet.trim());
            await fetchRecoveries();
        } catch (err) {
            alert(err.response?.data?.message || 'Recovery completion failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (recoveryId) => {
        if (!window.confirm('Reject this account recovery request?')) return;
        setActionLoading(recoveryId);
        try {
            await adminService.rejectRecovery(recoveryId);
            await fetchRecoveries();
        } catch (err) {
            alert(err.response?.data?.message || 'Rejection failed.');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.toString().slice(0, 8) : '—';

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
                        Recovered
                    </span>
                );
            case 'identity_verified':
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
                        <ShieldCheck size={12} style={{ color: '#2563EB' }} />
                        Face Verified
                    </span>
                );
            case 'rejected':
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
                        Rejected
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
                        Pending Review
                    </span>
                );
        }
    };

    const filteredRecoveries = recoveries.filter(r => {
        if (filter === 'pending') {
            if (r.status === 'completed' || r.status === 'rejected') return false;
        } else if (filter === 'verified') {
            if (r.status !== 'identity_verified') return false;
        } else if (filter === 'completed') {
            if (r.status !== 'completed') return false;
        }

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (r.id || '').toString().toLowerCase().includes(q) ||
            (r.oldWallet || '').toLowerCase().includes(q) ||
            (r.newWallet || '').toLowerCase().includes(q) ||
            (r.userId || '').toString().toLowerCase().includes(q) ||
            (r.reason || '').toLowerCase().includes(q)
        );
    });

    const pendingCount = recoveries.filter(r => r.status === 'requested' || !r.status).length;
    const verifiedCount = recoveries.filter(r => r.status === 'identity_verified').length;
    const completedCount = recoveries.filter(r => r.status === 'completed').length;

    const FILTERS = [
        { key: '', label: 'All Requests', count: recoveries.length },
        { key: 'pending', label: 'Pending', count: pendingCount },
        { key: 'verified', label: 'Face Verified', count: verifiedCount },
        { key: 'completed', label: 'Recovered', count: completedCount },
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
                            <KeyRound size={12} />
                            Account Recovery
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Account Recovery
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Verify citizen identity, review account recovery requests, and reassign property titles to new accounts.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={fetchRecoveries}
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
                        <KeyRound size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Total Requests
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {recoveries.length}
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
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1D4ED8',
                        flexShrink: 0
                    }}>
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Face Verified
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {verifiedCount}
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
                            Recovered
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {completedCount}
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
                        Showing {filteredRecoveries.length} of {recoveries.length} recovery requests
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
                        placeholder="Search by request ID, old account, new account, or citizen ID..."
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
            {loading && !recoveries.length ? (
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
                        Loading recovery requests...
                    </p>
                </div>
            ) : filteredRecoveries.length === 0 ? (
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
                        <KeyRound size={26} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        No recovery requests
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, maxWidth: '400px' }}>
                        {searchQuery
                            ? `No records match "${searchQuery}".`
                            : 'There are currently no recovery requests in this category.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredRecoveries.map(r => {
                        const isExpanded = expandedId === r.id;
                        const isActionExecuting = actionLoading === r.id;

                        return (
                            <div
                                key={r.id}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: isExpanded ? '1px solid #94A3B8' : '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    boxShadow: isExpanded ? '0 4px 14px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Card Header */}
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
                                            <KeyRound size={22} />
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: '0.85rem',
                                                    fontWeight: 800,
                                                    fontFamily: 'var(--font-mono, monospace)',
                                                    color: '#0F172A',
                                                    backgroundColor: '#F1F5F9',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #E2E8F0'
                                                }}>
                                                    REQUEST #{shortenId(r.id)}
                                                </span>
                                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                                                    Account Recovery
                                                </span>
                                                {getStatusBadge(r.status)}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                marginTop: '4px',
                                                fontSize: '0.8rem',
                                                color: '#64748B',
                                                flexWrap: 'wrap'
                                            }}>
                                                <span>
                                                    Old Account: <code style={{ fontSize: '0.75rem', color: '#DC2626' }}>{shortenWallet(r.oldWallet)}</code>
                                                </span>
                                                <span>→</span>
                                                <span>
                                                    New Account: <code style={{ fontSize: '0.75rem', color: '#059669' }}>{shortenWallet(r.newWallet || newWalletInput[r.id] || 'Not Set')}</code>
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Citizen ID: <code style={{ fontSize: '0.75rem', color: '#2563EB' }}>{shortenId(r.userId)}</code>
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons & Expand */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {/* Step 1: Verify Biometrics */}
                                        {r.status !== 'identity_verified' && r.status !== 'completed' && r.status !== 'rejected' && (
                                            <>
                                                <button
                                                    onClick={() => handleVerifyIdentity(r.id)}
                                                    disabled={isActionExecuting}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 14px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#2563EB',
                                                        color: '#FFFFFF',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Fingerprint size={14} />
                                                    Verify Face Match
                                                </button>

                                                <button
                                                    onClick={() => handleReject(r.id)}
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
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <XCircle size={14} />
                                                    Reject
                                                </button>
                                            </>
                                        )}

                                        {/* Step 2: Target Wallet & Complete */}
                                        {r.status === 'identity_verified' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="New Account (0x...)"
                                                    value={newWalletInput[r.id] || r.newWallet || ''}
                                                    onChange={(e) => setNewWalletInput({ ...newWalletInput, [r.id]: e.target.value })}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid #CBD5E1',
                                                        backgroundColor: '#FFFFFF',
                                                        color: '#0F172A',
                                                        width: '180px',
                                                        outline: 'none',
                                                        fontFamily: 'monospace'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleComplete(r.id)}
                                                    disabled={isActionExecuting}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '7px 14px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#047857',
                                                        color: '#FFFFFF',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Sparkles size={14} />
                                                    Reassign Properties
                                                </button>
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : r.id)}
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
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {isExpanded ? 'Hide Details' : 'View Details'}
                                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Detail Drawer */}
                                {isExpanded && (
                                    <div style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                            gap: '1.25rem',
                                            marginBottom: '1.5rem'
                                        }}>
                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '10px',
                                                padding: '1.25rem'
                                            }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#1E3A8A', marginBottom: '0.75rem' }}>
                                                    Request Details
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    <div><strong>Reason:</strong> {r.reason || 'Lost access to account.'}</div>
                                                    <div><strong>Requested:</strong> {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</div>
                                                    <div><strong>Citizen ID:</strong> <code style={{ fontSize: '0.75rem' }}>{r.userId}</code></div>
                                                </div>
                                            </div>

                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '10px',
                                                padding: '1.25rem'
                                            }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#1E3A8A', marginBottom: '0.75rem' }}>
                                                    Identity & Account
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    <div><strong>Old Account:</strong> <code style={{ fontSize: '0.75rem', color: '#DC2626' }}>{r.oldWallet}</code></div>
                                                    <div><strong>Face Match:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>Verified</span></div>
                                                    {r.faceIdHash && (
                                                        <div>
                                                            <strong>Verification ID:</strong>
                                                            <code style={{ fontSize: '0.72rem', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>{r.faceIdHash}</code>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

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
                                                <strong>Recovery Notice:</strong> Completing recovery transfers all owned property titles from the old account to the verified new account.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WalletRecoveryApproval;
