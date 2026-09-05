import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { TopNavbar } from '../../components/TopNavbar';
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

    const statusBadge = (status) => {
        const colors = {
            verified: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' },
            active: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' },
            pending: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' },
            frozen: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' },
            completed: { bg: 'rgba(56,189,248,0.12)', border: 'rgba(56,189,248,0.3)', text: '#38BDF8' },
            cancelled: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' },
        };
        const c = colors[status] || { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', text: '#94A3B8' };
        return (
            <span style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                padding: '0.2rem 0.6rem', borderRadius: '6px',
                background: c.bg, border: `1px solid ${c.border}`, color: c.text,
            }}>
                {status}
            </span>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            <TopNavbar 
                title="Wallet & Identity Explorer" 
                subtitle="Deep lookup on any Web3 wallet address — cross-correlating citizen identity, registered parcels, and escrow ledger"
                showLogo={false}
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="digi-card p-4 mb-6" style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, position: 'relative', minWidth: '280px' }}>
                            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                            <input
                                type="text"
                                placeholder="Enter Ethereum / Avalanche address (0x...) or registered email..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="input-premium"
                                style={{ paddingLeft: 40, fontSize: '0.875rem', fontFamily: 'JetBrains Mono', width: '100%' }}
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn-cyan-glow" style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            Audit Wallet
                        </button>
                    </div>
                </form>

                {/* Error */}
                {error && (
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1.5rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle size={16} style={{ color: '#EF4444' }} />
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#EF4444', margin: 0 }}>{error}</p>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="digi-card p-12 flex items-center justify-center">
                        <Loader2 size={36} className="animate-spin" style={{ color: '#0284C7' }} />
                    </div>
                )}

                {/* No Result */}
                {searched && !loading && !error && result && !result.user && result.properties?.length === 0 && result.sales?.length === 0 && (
                    <div className="digi-card p-12 flex flex-col items-center justify-center text-center">
                        <Wallet size={48} style={{ marginBottom: '1rem', color: '#64748B' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No records found for this wallet address.</p>
                    </div>
                )}

                {/* Results */}
                {result && (result.user || result.properties?.length > 0 || result.sales?.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                        {/* User Card */}
                        {result.user && (
                            <div className="digi-card p-6" style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #1E293B' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(2,132,199,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                                            <User size={16} />
                                        </div>
                                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>Linked Citizen Identity</h3>
                                    </div>
                                    {statusBadge(result.user.kycStatus)}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                    <DetailField label="Citizen Name" value={result.user.name || '—'} />
                                    <DetailField label="Registered Email" value={result.user.email || '—'} />
                                    <DetailField label="Wallet Public Key" value={result.user.walletAddress} mono />
                                    <DetailField label="Role Clearance" value={result.user.role?.toUpperCase() || '—'} />
                                    <DetailField label="Biometric Status" value={result.user.faceIdHash ? 'Bound & Signed' : 'Not bound'} />
                                    <DetailField label="System ID" value={result.user.id} mono />
                                    <DetailField label="Registration Timestamp" value={result.user.createdAt ? new Date(result.user.createdAt).toLocaleString() : '—'} />
                                </div>
                            </div>
                        )}

                        {/* Properties */}
                        {result.properties?.length > 0 && (
                            <div className="digi-card p-6" style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #1E293B' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                                        <Building2 size={16} />
                                    </div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>Registered Property Titles ({result.properties.length})</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                    {result.properties.map(p => (
                                        <div key={p.id} style={{ padding: '1rem', background: '#0B0F19', border: '1px solid #1E293B', borderRadius: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, fontSize: '0.9rem', color: '#F8FAFC' }}>{p.propertyCode || '—'}</span>
                                                {statusBadge(p.status)}
                                            </div>
                                            <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Survey: {p.surveyNumber || '—'} • {p.district || '—'}</p>
                                            <p style={{ color: '#64748B', fontSize: '0.75rem', fontFamily: 'JetBrains Mono', margin: 0 }}>Token ID: #{p.nftTokenId || 'Unminted'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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

export default WalletSearch;
