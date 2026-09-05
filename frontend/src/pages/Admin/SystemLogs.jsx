import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { TopNavbar } from '../../components/TopNavbar';
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
        if (!action) return { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', text: '#94A3B8' };
        const a = action.toLowerCase();
        if (a.includes('approve') || a.includes('verify') || a.includes('mint')) return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' };
        if (a.includes('reject') || a.includes('freeze') || a.includes('deny')) return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' };
        if (a.includes('sale') || a.includes('transfer')) return { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38BDF8' };
        if (a.includes('fund') || a.includes('block') || a.includes('release')) return { bg: 'rgba(2,132,199,0.12)', border: 'rgba(2,132,199,0.3)', text: '#38BDF8' };
        if (a.includes('recovery') || a.includes('wallet')) return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' };
        return { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', text: '#94A3B8' };
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

    return (
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            <TopNavbar 
                title="System Audit Trail" 
                subtitle="Immutable, append-only cryptographic ledger of all administrative and smart contract state changes"
                showLogo={false}
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
                customRight={
                    <button onClick={fetchLogs} className="btn-dark-pill" style={{ fontSize: '0.8rem' }}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                }
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Filters + Search */}
                <div className="digi-card p-4 mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => { setFilter(f.key); setPage(0); }}
                                style={{
                                    padding: '0.45rem 0.9rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: filter === f.key ? '1px solid #0284C7' : '1px solid transparent',
                                    background: filter === f.key ? 'rgba(2,132,199,0.15)' : 'transparent',
                                    color: filter === f.key ? '#38BDF8' : '#94A3B8',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative', minWidth: 260 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            placeholder="Search action, wallet, tx hash..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium"
                            style={{ paddingLeft: 36, fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                {/* Count */}
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>
                    {loading ? 'Loading...' : `${filteredLogs.length} audit trail entr${filteredLogs.length !== 1 ? 'ies' : 'y'}`}
                </div>

                {/* Log List */}
                {loading ? (
                    <div className="digi-card p-12 flex items-center justify-center">
                        <Loader2 size={36} className="animate-spin" style={{ color: '#0284C7' }} />
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="digi-card p-12 flex flex-col items-center justify-center text-center">
                        <Database size={48} style={{ marginBottom: '1rem', color: '#64748B' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No audit logs found for the selected query.</p>
                    </div>
                ) : (
                    <div className="digi-card" style={{ padding: 0, overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                        {/* Table Header */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '180px 1fr 180px 160px 50px',
                            padding: '0.85rem 1.25rem', background: '#0B0F19', borderBottom: '1px solid #1E293B',
                            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B',
                        }}>
                            <span>Timestamp</span>
                            <span>Action / Entity</span>
                            <span>Actor Wallet</span>
                            <span>Tx Hash</span>
                            <span style={{ textAlign: 'right' }}>View</span>
                        </div>

                        {/* Rows */}
                        {filteredLogs.map(l => {
                            const ac = actionColor(l.action_type);
                            const isExpanded = expandedLog === l.id;

                            return (
                                <div key={l.id} style={{ borderBottom: '1px solid #1E293B' }}>
                                    <div
                                        onClick={() => setExpandedLog(isExpanded ? null : l.id)}
                                        style={{
                                            display: 'grid', gridTemplateColumns: '180px 1fr 180px 160px 50px',
                                            padding: '1rem 1.25rem', alignItems: 'center', cursor: 'pointer',
                                            transition: 'background 0.15s ease'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'JetBrains Mono' }}>
                                            {formatTime(l.created_at)}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span style={{
                                                fontSize: '0.7rem', fontWeight: 700,
                                                padding: '0.2rem 0.55rem', borderRadius: '6px',
                                                background: ac.bg, border: `1px solid ${ac.border}`, color: ac.text,
                                            }}>
                                                {l.action_type}
                                            </span>
                                            {l.entity_type && (
                                                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                                                    {l.entity_type} {l.entity_id ? `(#${l.entity_id.toString().slice(0, 6)})` : ''}
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', color: '#CBD5E1', fontFamily: 'JetBrains Mono' }}>
                                            {shortenWallet(l.actor_wallet)}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>
                                            {l.tx_hash ? `${l.tx_hash.slice(0, 8)}...` : 'Off-Chain'}
                                        </span>
                                        <div style={{ textAlign: 'right' }}>
                                            {isExpanded ? <ChevronUp size={16} style={{ color: '#64748B' }} /> : <ChevronDown size={16} style={{ color: '#64748B' }} />}
                                        </div>
                                    </div>

                                    {/* Expanded JSON details */}
                                    {isExpanded && (
                                        <div style={{ padding: '1rem 1.25rem', background: '#0B0F19', borderTop: '1px solid #1E293B' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                                                <DetailField label="Log ID" value={l.id} mono />
                                                <DetailField label="Entity Type" value={l.entity_type || '—'} />
                                                <DetailField label="Entity ID" value={l.entity_id || '—'} mono />
                                                <DetailField label="Actor Public Key" value={l.actor_wallet || 'System Worker'} mono />
                                                <DetailField label="Full Transaction Hash" value={l.tx_hash || 'Off-Chain'} mono />
                                            </div>
                                            {l.metadata && (
                                                <div style={{ padding: '0.75rem 1rem', background: '#0F172A', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '0.3rem' }}>METADATA PAYLOAD</span>
                                                    <pre style={{ margin: 0, fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'JetBrains Mono', whiteSpace: 'pre-wrap' }}>
                                                        {JSON.stringify(l.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>
            {label}
        </span>
        <span style={{
            fontSize: '0.875rem', fontWeight: 500, color: '#CBD5E1',
            fontFamily: mono ? 'JetBrains Mono' : 'inherit',
            wordBreak: 'break-all',
        }}>
            {value}
        </span>
    </div>
);

export default SystemLogs;
