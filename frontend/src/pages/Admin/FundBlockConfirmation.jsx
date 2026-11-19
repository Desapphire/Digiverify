import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Landmark, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, Clock, ChevronDown,
    ChevronUp, ShieldCheck, Hash, Ban, DollarSign,
    ArrowLeft, Check, Copy, AlertTriangle, ShieldAlert,
    Building2, BadgePercent, Lock, ArrowUpRight, CheckCheck, Shield
} from 'lucide-react';

const FundBlockConfirmation = () => {
    const navigate = useNavigate();
    const [fundBlocks, setFundBlocks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState('');
    const [expandedBlock, setExpandedBlock] = useState(null);
    const [bankRefInput, setBankRefInput] = useState({});
    const [copiedField, setCopiedField] = useState(null);

    const fetchFundBlocks = async () => {
        setLoading(true);
        try {
            const res = await adminService.getPendingFundBlocks();
            setFundBlocks(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch fund blocks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFundBlocks();
    }, []);

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(id);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleConfirm = async (blockId) => {
        const refId = bankRefInput[blockId];
        if (!refId || !refId.trim()) {
            alert('Please enter a valid Bank Reference Number before confirming.');
            return;
        }
        setActionLoading(blockId);
        try {
            await adminService.confirmFundBlock(blockId, refId.trim());
            await fetchFundBlocks();
        } catch (err) {
            alert(err.response?.data?.message || 'Bank confirmation failed to process.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRelease = async (blockId) => {
        if (!window.confirm('Release this payment hold? This will unfreeze the funds back to the buyer.')) return;
        setActionLoading(blockId);
        try {
            await adminService.releaseFunds(blockId);
            await fetchFundBlocks();
        } catch (err) {
            alert(err.response?.data?.message || 'Payment release failed to process.');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.toString().slice(0, 8) : '—';

    // Normalize fields
    const normalize = (fb) => ({
        id: fb.id,
        transactionId: fb.transaction_id || fb.transactionId,
        bankReferenceId: fb.bank_reference_id || fb.bankReferenceId,
        buyerWallet: fb.buyer_wallet || fb.buyerWallet,
        blockAmount: parseFloat(fb.block_amount || fb.blockAmount || 0),
        currency: fb.currency || 'INR',
        blockedAt: fb.blocked_at || fb.blockedAt,
        unblockedAt: fb.unblocked_at || fb.unblockedAt,
        bankConfirmed: fb.bank_confirmed || fb.bankConfirmed,
        bankConfirmTs: fb.bank_confirm_ts || fb.bankConfirmTs,
        status: fb.status || 'pending',
        bankUserId: fb.bank_user_id || fb.bankUserId,
    });

    const normalizedBlocks = fundBlocks.map(normalize);

    const filteredBlocks = normalizedBlocks.filter(fb => {
        if (filter === 'pending') {
            if (fb.bankConfirmed || fb.status === 'released' || fb.status === 'failed') return false;
        } else if (filter === 'confirmed') {
            if (!fb.bankConfirmed || fb.status === 'released') return false;
        } else if (filter === 'released') {
            if (fb.status !== 'released') return false;
        }

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (fb.id || '').toString().toLowerCase().includes(q) ||
            (fb.buyerWallet || '').toLowerCase().includes(q) ||
            (fb.transactionId || '').toString().toLowerCase().includes(q) ||
            (fb.bankReferenceId || '').toString().toLowerCase().includes(q)
        );
    });

    const totalBlockedSum = normalizedBlocks
        .filter(b => b.status === 'blocked' && b.status !== 'released')
        .reduce((sum, b) => sum + b.blockAmount, 0);

    const pendingConfirmationCount = normalizedBlocks.filter(b => !b.bankConfirmed && b.status !== 'released').length;
    const confirmedCount = normalizedBlocks.filter(b => b.bankConfirmed && b.status !== 'released').length;
    const releasedCount = normalizedBlocks.filter(b => b.status === 'released').length;

    const FILTERS = [
        { key: '', label: 'All Payments', count: normalizedBlocks.length },
        { key: 'pending', label: 'Pending Confirmation', count: pendingConfirmationCount },
        { key: 'confirmed', label: 'Confirmed', count: confirmedCount },
        { key: 'released', label: 'Released', count: releasedCount },
    ];

    const getStatusBadge = (fb) => {
        if (fb.status === 'released') {
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
                    Released
                </span>
            );
        }
        if (fb.bankConfirmed) {
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
                    Confirmed
                </span>
            );
        }
        if (fb.status === 'failed') {
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
                    Failed
                </span>
            );
        }
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
                Pending Confirmation
            </span>
        );
    };

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
                            <Landmark size={12} />
                            Bank Payments
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Bank Payments
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Verify held buyer payments, record bank reference numbers, and manage payment releases.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={fetchFundBlocks}
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
                        <Landmark size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Total Held
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            ₹{totalBlockedSum.toLocaleString()}
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
                            Pending Confirmation
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {pendingConfirmationCount}
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
                            Confirmed
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {confirmedCount}
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
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#475569',
                        flexShrink: 0
                    }}>
                        <CheckCheck size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Released
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {releasedCount}
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
                        Showing {filteredBlocks.length} of {normalizedBlocks.length} payments
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
                        placeholder="Search by hold ID, buyer, sale ID, or bank reference..."
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
            {loading && !fundBlocks.length ? (
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
                        Loading payments...
                    </p>
                </div>
            ) : filteredBlocks.length === 0 ? (
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
                        <Landmark size={26} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        No payments found
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, maxWidth: '400px' }}>
                        {searchQuery
                            ? `No records match "${searchQuery}".`
                            : 'There are currently no bank payments in this category.'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredBlocks.map(fb => {
                        const isExpanded = expandedBlock === fb.id;
                        const isActionExecuting = actionLoading === fb.id;
                        const blockAmountFormatted = Number(fb.blockAmount).toLocaleString();

                        return (
                            <div
                                key={fb.id}
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
                                            <Landmark size={22} />
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
                                                    HOLD #{shortenId(fb.id)}
                                                </span>
                                                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A' }}>
                                                    ₹{blockAmountFormatted}
                                                </span>
                                                {getStatusBadge(fb)}
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
                                                    Buyer: <code style={{ fontSize: '0.75rem', color: '#0F172A' }}>{shortenWallet(fb.buyerWallet)}</code>
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Sale ID: <code style={{ fontSize: '0.75rem', color: '#2563EB' }}>{shortenId(fb.transactionId)}</code>
                                                </span>
                                                {fb.bankReferenceId && (
                                                    <>
                                                        <span>•</span>
                                                        <span>
                                                            Bank Ref: <code style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>{fb.bankReferenceId}</code>
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons & Expand */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        {!fb.bankConfirmed && fb.status !== 'released' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <input
                                                    type="text"
                                                    placeholder="Bank Ref Number"
                                                    value={bankRefInput[fb.id] || ''}
                                                    onChange={(e) => setBankRefInput({ ...bankRefInput, [fb.id]: e.target.value })}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '0.8rem',
                                                        borderRadius: '6px',
                                                        border: '1px solid #CBD5E1',
                                                        backgroundColor: '#FFFFFF',
                                                        color: '#0F172A',
                                                        width: '160px',
                                                        outline: 'none'
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleConfirm(fb.id)}
                                                    disabled={isActionExecuting}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '7px 12px',
                                                        borderRadius: '8px',
                                                        backgroundColor: '#047857',
                                                        color: '#FFFFFF',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 700,
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <CheckCircle2 size={13} />
                                                    Confirm Payment
                                                </button>
                                            </div>
                                        )}

                                        {fb.bankConfirmed && fb.status !== 'released' && (
                                            <button
                                                onClick={() => handleRelease(fb.id)}
                                                disabled={isActionExecuting}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '7px 12px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#FFFFFF',
                                                    color: '#D97706',
                                                    border: '1px solid #FDE68A',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Lock size={13} />
                                                Release Payment
                                            </button>
                                        )}

                                        <button
                                            onClick={() => setExpandedBlock(isExpanded ? null : fb.id)}
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
                                                    Payment Details
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    <div><strong>Amount:</strong> ₹{blockAmountFormatted} {fb.currency}</div>
                                                    <div><strong>Time:</strong> {fb.blockedAt ? new Date(fb.blockedAt).toLocaleString() : '—'}</div>
                                                    <div><strong>Status:</strong> {fb.bankConfirmed ? 'Confirmed' : 'Pending Confirmation'}</div>
                                                </div>
                                            </div>

                                            <div style={{
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: '10px',
                                                padding: '1.25rem'
                                            }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#1E3A8A', marginBottom: '0.75rem' }}>
                                                    Account & Reference
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                                                    <div><strong>Buyer Account:</strong> <code style={{ fontSize: '0.75rem' }}>{fb.buyerWallet}</code></div>
                                                    <div><strong>Sale ID:</strong> <code style={{ fontSize: '0.75rem' }}>{fb.transactionId}</code></div>
                                                    <div><strong>Bank Reference:</strong> <code style={{ fontSize: '0.75rem', color: '#059669' }}>{fb.bankReferenceId || 'Not Assigned'}</code></div>
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
                                                <strong>Payment Security:</strong> Funds remain held in the buyer's account until the property transfer is officially approved.
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

export default FundBlockConfirmation;
