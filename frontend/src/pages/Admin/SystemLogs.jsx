import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Database, Loader2, RefreshCcw, Search, Filter,
    ChevronDown, ChevronUp, ShieldCheck, Hash, Clock,
    CheckCircle2, XCircle, Box, Activity, Wallet, Eye,
    Copy, ExternalLink, Shield, Code, Server, User,
    FileCheck, Check, Building2, Landmark, ChevronLeft, ChevronRight
} from 'lucide-react';

const SystemLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLog, setExpandedLog] = useState(null);
    const [page, setPage] = useState(0);
    const [copiedId, setCopiedId] = useState('');
    const LIMIT = 50;

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
    };

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = { limit: LIMIT, offset: page * LIMIT };
            if (filter) params.actionType = filter;
            const res = await adminService.getAuditLogs(params);
            setLogs(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [filter, page]);

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.toString().slice(0, 8) : '—';

    const getActionBadge = (action) => {
        if (!action) {
            return (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    border: '1px solid #E2E8F0'
                }}>
                    ACTIVITY
                </span>
            );
        }
        const a = action.toLowerCase();
        let bg = '#F1F5F9';
        let color = '#475569';
        let border = '#E2E8F0';

        if (a.includes('approve') || a.includes('verify') || a.includes('mint')) {
            bg = '#ECFDF5';
            color = '#065F46';
            border = '#A7F3D0';
        } else if (a.includes('reject') || a.includes('freeze') || a.includes('deny')) {
            bg = '#FEF2F2';
            color = '#991B1B';
            border = '#FECACA';
        } else if (a.includes('sale') || a.includes('transfer')) {
            bg = '#FAF5FF';
            color = '#6B21A8';
            border = '#E9D5FF';
        } else if (a.includes('fund') || a.includes('block') || a.includes('release')) {
            bg = '#EFF6FF';
            color = '#1E40AF';
            border = '#BFDBFE';
        } else if (a.includes('recovery') || a.includes('wallet')) {
            bg = '#FEF3C7';
            color = '#92400E';
            border = '#FDE68A';
        }

        return (
            <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                backgroundColor: bg,
                color: color,
                border: `1px solid ${border}`
            }}>
                {action}
            </span>
        );
    };

    const filteredLogs = logs.filter(l => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (l.action_type || '').toLowerCase().includes(q) ||
            (l.actor_wallet || '').toLowerCase().includes(q) ||
            (l.entity_id || '').toString().toLowerCase().includes(q) ||
            (l.tx_hash || '').toLowerCase().includes(q) ||
            (l.entity_type || '').toLowerCase().includes(q)
        );
    });

    const FILTERS = [
        { key: '', label: 'All Activities' },
        { key: 'KYC_APPROVED', label: 'Identity Approved' },
        { key: 'KYC_REJECTED', label: 'Identity Rejected' },
        { key: 'PROPERTY_APPROVED', label: 'Property Approved' },
        { key: 'PROPERTY_FROZEN', label: 'Property Locked' },
        { key: 'SALE_APPROVED', label: 'Sale Completed' },
        { key: 'NFT_MINT', label: 'Property Token Created' },
    ];

    const formatTime = (ts) => {
        if (!ts) return '—';
        const d = new Date(ts);
        return d.toLocaleString();
    };

    const timeAgo = (ts) => {
        if (!ts) return '';
        const diff = Date.now() - new Date(ts).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
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
                            <Database size={12} />
                            Activity Logs
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Activity Logs
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Review administrator approvals, citizen verifications, property titles, and system events.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={fetchLogs}
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
                        <Database size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Total Activities
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {logs.length}
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
                            Identity Checks
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {logs.filter(l => (l.action_type || '').includes('KYC') || (l.action_type || '').includes('VERIF')).length}
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
                        backgroundColor: '#FAF5FF',
                        border: '1px solid #E9D5FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9333EA',
                        flexShrink: 0
                    }}>
                        <Building2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Property Approvals
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {logs.filter(l => (l.action_type || '').includes('PROPERTY') || (l.action_type || '').includes('MINT')).length}
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
                        <Landmark size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Sales & Payments
                        </div>
                        <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                            {logs.filter(l => (l.action_type || '').includes('SALE') || (l.action_type || '').includes('FUND')).length}
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
                                    onClick={() => { setFilter(f.key); setPage(0); }}
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
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>

                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B' }}>
                        Page {page + 1} ({filteredLogs.length} activities)
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
                        placeholder="Search by activity, account address, transaction hash, or ID..."
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

            {/* Audit Log Table */}
            {loading && !logs.length ? (
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
                        Loading activity logs...
                    </p>
                </div>
            ) : filteredLogs.length === 0 ? (
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
                        <Database size={26} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        No activities found
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, maxWidth: '400px' }}>
                        {searchQuery
                            ? `No records matched your search query "${searchQuery}".`
                            : 'No activity records found for the selected filter.'}
                    </p>
                </div>
            ) : (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    overflow: 'hidden'
                }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Time</th>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Activity</th>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Type & ID</th>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Admin / Citizen Account</th>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Transaction Hash</th>
                                    <th style={{ padding: '12px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => {
                                    const isExpanded = expandedLog === log.id;
                                    return (
                                        <React.Fragment key={log.id}>
                                            <tr
                                                style={{
                                                    borderBottom: '1px solid #F1F5F9',
                                                    backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                                                    transition: 'background 0.15s'
                                                }}
                                            >
                                                <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#0F172A', whiteSpace: 'nowrap' }}>
                                                    <div style={{ fontWeight: 600 }}>{timeAgo(log.created_at || log.timestamp)}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#64748B' }}>{formatTime(log.created_at || log.timestamp)}</div>
                                                </td>

                                                <td style={{ padding: '12px 16px' }}>
                                                    {getActionBadge(log.action_type)}
                                                </td>

                                                <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#0F172A' }}>
                                                    <div style={{ fontWeight: 600 }}>{log.entity_type || 'SYSTEM'}</div>
                                                    <code style={{ fontSize: '0.75rem', color: '#2563EB' }}>{shortenId(log.entity_id)}</code>
                                                </td>

                                                <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <code style={{ fontSize: '0.75rem', color: '#0F172A' }}>{shortenWallet(log.actor_wallet)}</code>
                                                        {log.actor_wallet && (
                                                             <button
                                                                onClick={() => handleCopy(log.actor_wallet, `actor-${log.id}`)}
                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === `actor-${log.id}` ? '#059669' : '#94A3B8' }}
                                                            >
                                                                {copiedId === `actor-${log.id}` ? <Check size={11} /> : <Copy size={11} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>

                                                <td style={{ padding: '12px 16px', fontSize: '0.8rem' }}>
                                                    {log.tx_hash ? (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <code style={{ fontSize: '0.75rem', color: '#2563EB' }}>{shortenWallet(log.tx_hash)}</code>
                                                            <button
                                                                onClick={() => handleCopy(log.tx_hash, `tx-${log.id}`)}
                                                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === `tx-${log.id}` ? '#059669' : '#94A3B8' }}
                                                            >
                                                                {copiedId === `tx-${log.id}` ? <Check size={11} /> : <Copy size={11} />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>System Record</span>
                                                    )}
                                                </td>

                                                <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #CBD5E1',
                                                            backgroundColor: '#FFFFFF',
                                                            color: '#334155',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isExpanded ? 'Hide' : 'View Details'}
                                                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                    </button>
                                                </td>
                                            </tr>

                                            {/* Expandable JSON details drawer */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={6} style={{ padding: '1rem 1.5rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E3A8A', textTransform: 'uppercase' }}>
                                                                Event Details
                                                            </span>
                                                            <button
                                                                onClick={() => handleCopy(JSON.stringify(log.metadata || log, null, 2), `json-${log.id}`)}
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '2px 6px',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #CBD5E1',
                                                                    backgroundColor: '#FFFFFF',
                                                                    color: copiedId === `json-${log.id}` ? '#059669' : '#334155',
                                                                    fontSize: '0.7rem',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                {copiedId === `json-${log.id}` ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy Details</>}
                                                            </button>
                                                        </div>
                                                        <pre style={{
                                                            backgroundColor: '#0F172A',
                                                            color: '#38BDF8',
                                                            padding: '12px 14px',
                                                            borderRadius: '8px',
                                                            fontSize: '0.75rem',
                                                            fontFamily: 'monospace',
                                                            overflowX: 'auto',
                                                            margin: 0
                                                        }}>
                                                            {JSON.stringify(log.metadata || log, null, 2)}
                                                        </pre>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderTop: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        fontSize: '0.8rem',
                        color: '#64748B'
                    }}>
                        <div>
                            Showing {filteredLogs.length} entries
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button
                                onClick={() => setPage(Math.max(0, page - 1))}
                                disabled={page === 0}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: page === 0 ? '#F1F5F9' : '#FFFFFF',
                                    color: page === 0 ? '#94A3B8' : '#334155',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: page === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                <ChevronLeft size={14} /> Previous
                            </button>

                            <button
                                onClick={() => setPage(page + 1)}
                                disabled={logs.length < LIMIT}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: logs.length < LIMIT ? '#F1F5F9' : '#FFFFFF',
                                    color: logs.length < LIMIT ? '#94A3B8' : '#334155',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: logs.length < LIMIT ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Next <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SystemLogs;
