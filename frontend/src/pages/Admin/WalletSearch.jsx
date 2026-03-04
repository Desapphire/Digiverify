import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Search, Loader2, Wallet, Building2, Activity,
    ShieldCheck, User, Mail, Clock, Hash,
    ArrowRight, MapPin, Ruler, ScrollText, AlertCircle
} from 'lucide-react';

const WalletSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);
        setSearched(true);
        try {
            const res = await adminService.lookupWallet(query.trim());
            setResult(res.data?.data || null);
        } catch (err) {
            setError(err.response?.data?.message || 'Wallet lookup failed.');
        } finally {
            setLoading(false);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const statusBadge = (status, type = 'default') => {
        const colors = {
            verified: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' },
            active: { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' },
            pending: { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: '#eab308' },
            frozen: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' },
            completed: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6' },
            cancelled: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' },
        };
        const c = colors[status] || { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.5)' };
        return (
            <span style={{
                fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '9999px',
                background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            }}>
                {status}
            </span>
        );
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        Wallet <span className="text-gradient">Explorer</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Deep lookup any wallet — view user identity, owned properties, transactions, and audit trail.
                    </p>
                </div>
                <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>← Back</button>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="glass-panel p-5 mb-6">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Enter wallet address (0x...) or user email..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="input-premium"
                            style={{ paddingLeft: 40, fontSize: '0.88rem', fontFamily: 'monospace', width: '100%' }}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: 700,
                        background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(127,29,29,0.15))',
                        color: '#fca5a5', border: '1px solid rgba(220,38,38,0.3)',
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        opacity: loading ? 0.5 : 1,
                    }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Audit Wallet
                    </button>
                </div>
            </form>

            {/* Error */}
            {error && (
                <div style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} style={{ color: '#ef4444' }} />
                    <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f87171' }}>{error}</p>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            )}

            {/* No Result */}
            {searched && !loading && !error && result && !result.user && result.properties?.length === 0 && result.sales?.length === 0 && (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <Wallet size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No records found for this wallet address.</p>
                </div>
            )}

            {/* Results */}
            {result && (result.user || result.properties?.length > 0 || result.sales?.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* User Card */}
                    {result.user && (
                        <div className="glass-panel p-5">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <User size={16} style={{ color: '#a78bfa' }} />
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Linked Identity</h3>
                                {statusBadge(result.user.kycStatus)}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                <DetailField label="Full Name" value={result.user.name || '—'} />
                                <DetailField label="Email" value={result.user.email || '—'} />
                                <DetailField label="Wallet" value={result.user.walletAddress} mono />
                                <DetailField label="Role" value={result.user.role?.toUpperCase() || '—'} />
                                <DetailField label="KYC Status" value={result.user.kycStatus || '—'} />
                                <DetailField label="Face ID" value={result.user.faceIdHash ? 'Bound' : 'Not bound'} />
                                <DetailField label="User ID" value={result.user.id} mono />
                                <DetailField label="Registered" value={result.user.createdAt ? new Date(result.user.createdAt).toLocaleString() : '—'} />
                            </div>
                        </div>
                    )}

                    {/* Properties */}
                    {result.properties?.length > 0 && (
                        <div className="glass-panel p-5">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <Building2 size={16} style={{ color: '#22c55e' }} />
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Owned Properties</h3>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                                    {result.properties.length}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {result.properties.map(p => (
                                    <div key={p.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.75rem 1rem', borderRadius: '0.5rem',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>
                                                {p.propertyCode || 'No Code'}
                                                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: '0.75rem' }}>
                                                    Survey: {p.surveyNumber || '—'}
                                                </span>
                                            </p>
                                            <div className="flex items-center gap-3" style={{ marginTop: 3 }}>
                                                <span className="flex items-center gap-1" style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>
                                                    <MapPin size={10} /> {p.district || '—'}, {p.state || '—'}
                                                </span>
                                                {p.areaSqft && <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)' }}>{p.areaSqft} sqft</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {statusBadge(p.status)}
                                            {p.encumbranceStatus && statusBadge('encumbered')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sale Transactions */}
                    {result.sales?.length > 0 && (
                        <div className="glass-panel p-5">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <Activity size={16} style={{ color: '#eab308' }} />
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Sale Transactions</h3>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                                    {result.sales.length}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {result.sales.map(tx => (
                                    <div key={tx.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.75rem 1rem', borderRadius: '0.5rem',
                                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)',
                                    }}>
                                        <div>
                                            <p style={{ fontWeight: 700, color: 'white', fontSize: '0.85rem' }}>
                                                Sale #{tx.id?.slice(0, 8)}
                                                <span style={{ fontWeight: 600, color: '#a78bfa', marginLeft: 10 }}>₹{tx.salePrice?.toLocaleString()}</span>
                                            </p>
                                            <div className="flex items-center gap-2" style={{ marginTop: 3 }}>
                                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{shortenWallet(tx.sellerWallet)}</span>
                                                <ArrowRight size={10} style={{ color: 'rgba(255,255,255,0.15)' }} />
                                                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{shortenWallet(tx.buyerWallet)}</span>
                                            </div>
                                        </div>
                                        {statusBadge(tx.status)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Audit Logs */}
                    {result.auditLogs?.length > 0 && (
                        <div className="glass-panel p-5">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <ScrollText size={16} style={{ color: '#ef4444' }} />
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>Recent Activity Log</h3>
                                <span style={{ fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                                    {result.auditLogs.length}
                                </span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {result.auditLogs.map((log, i) => (
                                    <div key={log.id || i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '0.6rem 0.75rem', borderRadius: '0.4rem',
                                        background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)',
                                    }}>
                                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                                            {log.action_type || log.actionType}
                                        </span>
                                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                                            {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 600 }}>
                <ShieldCheck size={14} style={{ color: '#ef4444' }} />
                Wallet Explorer — Cross-referencing identity, property, and transaction registries.
            </div>
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</p>
    </div>
);

export default WalletSearch;
