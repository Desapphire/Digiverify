import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Database, Loader2, RefreshCcw, Search, Filter,
    ChevronDown, ChevronUp, ShieldCheck, Hash, Clock,
    CheckCircle2, XCircle, Box, Activity, Wallet, Eye
} from 'lucide-react';

const SystemLogs = () => {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLog, setExpandedLog] = useState(null);
    const [page, setPage] = useState(0);
    const LIMIT = 50;

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

    useEffect(() => { fetchLogs(); }, [filter, page]);

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (id) => id ? id.toString().slice(0, 8) : '—';

    const actionColor = (action) => {
        if (!action) return { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.5)' };
        const a = action.toLowerCase();
        if (a.includes('approve') || a.includes('verify') || a.includes('mint')) return { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' };
        if (a.includes('reject') || a.includes('freeze') || a.includes('deny')) return { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' };
        if (a.includes('sale') || a.includes('transfer')) return { bg: 'rgba(139,92,246,0.1)', text: '#a78bfa' };
        if (a.includes('fund') || a.includes('block') || a.includes('release')) return { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6' };
        if (a.includes('recovery') || a.includes('wallet')) return { bg: 'rgba(234,179,8,0.1)', text: '#eab308' };
        return { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.5)' };
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
        { key: '', label: 'All Events' },
        { key: 'KYC_APPROVED', label: 'KYC Approved' },
        { key: 'KYC_REJECTED', label: 'KYC Rejected' },
        { key: 'PROPERTY_APPROVED', label: 'Property Approved' },
        { key: 'PROPERTY_FROZEN', label: 'Property Frozen' },
        { key: 'SALE_APPROVED', label: 'Sale Approved' },
        { key: 'NFT_MINT', label: 'NFT Mint' },
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
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        System <span className="text-gradient">Audit Logs</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Immutable, append-only record of all registry state changes and administrative actions.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>← Back</button>
                    <button onClick={fetchLogs} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}><RefreshCcw size={14} /> Refresh</button>
                </div>
            </div>

            {/* Filters + Search */}
            <div className="glass-panel p-4 mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {FILTERS.map(f => (
                        <button key={f.key} onClick={() => { setFilter(f.key); setPage(0); }} style={{
                            padding: '0.35rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.72rem', fontWeight: 700,
                            border: filter === f.key ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.05)',
                            background: filter === f.key ? 'rgba(220,38,38,0.12)' : 'rgba(0,0,0,0.2)',
                            color: filter === f.key ? '#fca5a5' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
                        }}>{f.label}</button>
                    ))}
                </div>
                <div style={{ position: 'relative', minWidth: 220 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input type="text" placeholder="Search action, wallet, tx hash..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium" style={{ paddingLeft: 34, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 34px' }} />
                </div>
            </div>

            {/* Count */}
            <div style={{ marginBottom: '0.75rem', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                {loading ? 'Loading...' : `${filteredLogs.length} log entr${filteredLogs.length !== 1 ? 'ies' : 'y'}`}
            </div>

            {/* Log List */}
            {loading ? (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <Database size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No audit log entries found.</p>
                </div>
            ) : (
                <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Table Header */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '180px 1fr 160px 160px 60px',
                        padding: '0.65rem 1.25rem', background: 'rgba(0,0,0,0.15)', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
                    }}>
                        <span>Timestamp</span>
                        <span>Event</span>
                        <span>Actor</span>
                        <span>Entity</span>
                        <span></span>
                    </div>

                    {/* Rows */}
                    {filteredLogs.map((log, i) => {
                        const ac = actionColor(log.action_type);
                        const isExpanded = expandedLog === (log.id || i);

                        return (
                            <div key={log.id || i}>
                                <div
                                    onClick={() => setExpandedLog(isExpanded ? null : (log.id || i))}
                                    style={{
                                        display: 'grid', gridTemplateColumns: '180px 1fr 160px 160px 60px',
                                        padding: '0.7rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                        cursor: 'pointer', transition: 'background 0.15s',
                                        alignItems: 'center',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Timestamp */}
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                            {formatTime(log.created_at)}
                                        </span>
                                        <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', marginLeft: 6 }}>
                                            {timeAgo(log.created_at)}
                                        </span>
                                    </div>

                                    {/* Action */}
                                    <div>
                                        <span style={{
                                            fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px',
                                            background: ac.bg, color: ac.text, fontFamily: 'monospace',
                                        }}>
                                            {log.action_type || '—'}
                                        </span>
                                    </div>

                                    {/* Actor */}
                                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                        {shortenWallet(log.actor_wallet) || shortenId(log.actor_user_id) || '—'}
                                    </span>

                                    {/* Entity */}
                                    <div>
                                        {log.entity_type && (
                                            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', marginRight: 4, textTransform: 'uppercase', fontWeight: 700 }}>
                                                {log.entity_type}:
                                            </span>
                                        )}
                                        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                                            {shortenId(log.entity_id) || '—'}
                                        </span>
                                    </div>

                                    {/* Expand */}
                                    <div style={{ textAlign: 'right' }}>
                                        {isExpanded ? <ChevronUp size={14} style={{ color: 'rgba(255,255,255,0.25)' }} /> : <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />}
                                    </div>
                                </div>

                                {/* Expanded Detail */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '0.75rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        background: 'rgba(0,0,0,0.1)',
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                                            <DetailField label="Log ID" value={log.id || '—'} mono />
                                            <DetailField label="Action Type" value={log.action_type || '—'} />
                                            <DetailField label="Actor Wallet" value={log.actor_wallet || '—'} mono />
                                            <DetailField label="Actor User ID" value={log.actor_user_id || '—'} mono />
                                            <DetailField label="IP Address" value={log.ip_address || '—'} mono />
                                            <DetailField label="Entity Type" value={log.entity_type || '—'} />
                                            <DetailField label="Entity ID" value={log.entity_id || '—'} mono />
                                            <DetailField label="Tx Hash" value={log.tx_hash || 'None'} mono />
                                            <DetailField label="Timestamp" value={formatTime(log.created_at)} />
                                            {log.metadata && (
                                                <div style={{ gridColumn: '1 / -1' }}>
                                                    <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>Metadata</p>
                                                    <pre style={{
                                                        fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace',
                                                        background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '0.4rem',
                                                        overflow: 'auto', maxHeight: 120, whiteSpace: 'pre-wrap',
                                                    }}>
                                                        {typeof log.metadata === 'string' ? log.metadata : JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && logs.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0 0.25rem' }}>
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        style={{
                            padding: '0.4rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                            background: 'rgba(0,0,0,0.2)', color: page === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.05)', cursor: page === 0 ? 'default' : 'pointer',
                        }}
                    >← Previous</button>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>
                        Page {page + 1}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={logs.length < LIMIT}
                        style={{
                            padding: '0.4rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                            background: 'rgba(0,0,0,0.2)', color: logs.length < LIMIT ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.05)', cursor: logs.length < LIMIT ? 'default' : 'pointer',
                        }}
                    >Next →</button>
                </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 600 }}>
                <ShieldCheck size={14} style={{ color: '#ef4444' }} />
                Immutable audit trail — append-only, verified via on-chain smart contract logs.
            </div>
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: '0.78rem', fontWeight: 500, color: 'rgba(255,255,255,0.7)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</p>
    </div>
);

export default SystemLogs;
