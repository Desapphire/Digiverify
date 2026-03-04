import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    ShieldAlert, AlertTriangle, Search, Ban, Loader2,
    Building2, MapPin, Wallet, Ruler, Hash, ChevronDown,
    ChevronUp, CheckCircle2, ScrollText, Activity, ArrowRight,
    XCircle, RefreshCcw
} from 'lucide-react';

const PropertyInvestigation = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState([]);
    const [searched, setSearched] = useState(false);
    const [expandedProp, setExpandedProp] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [walletData, setWalletData] = useState({});

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            const res = await adminService.listProperties();
            const all = res.data?.data || [];
            const q = query.toLowerCase().trim();
            const filtered = all.filter(p =>
                (p.id || '').toLowerCase().includes(q) ||
                (p.propertyCode || '').toLowerCase().includes(q) ||
                (p.surveyNumber || '').toLowerCase().includes(q) ||
                (p.district || '').toLowerCase().includes(q) ||
                (p.ownerWallet || '').toLowerCase().includes(q) ||
                (p.state || '').toLowerCase().includes(q)
            );
            setProperties(filtered);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFreeze = async (propId) => {
        if (!window.confirm('FREEZE this property? All transactions will be suspended.')) return;
        setActionLoading(propId);
        try {
            await adminService.freezeProperty(propId);
            // Refresh search
            handleSearch({ preventDefault: () => { } });
        } catch (err) {
            alert(err.response?.data?.message || 'Freeze failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSetEncumbrance = async (propId) => {
        if (!window.confirm('Mark this property as ENCUMBERED?')) return;
        setActionLoading(propId);
        try {
            await adminService.setEncumbrance(propId, true);
            handleSearch({ preventDefault: () => { } });
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to set encumbrance');
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearEncumbrance = async (propId) => {
        if (!window.confirm('Clear the encumbrance on this property?')) return;
        setActionLoading(propId);
        try {
            await adminService.setEncumbrance(propId, false);
            handleSearch({ preventDefault: () => { } });
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to clear encumbrance');
        } finally {
            setActionLoading(null);
        }
    };

    const loadOwnerData = async (wallet) => {
        if (walletData[wallet]) return;
        try {
            const res = await adminService.lookupWallet(wallet);
            setWalletData(prev => ({ ...prev, [wallet]: res.data?.data }));
        } catch (err) {
            console.error('Owner lookup failed:', err);
        }
    };

    const expandProp = (propId, ownerWallet) => {
        if (expandedProp === propId) {
            setExpandedProp(null);
        } else {
            setExpandedProp(propId);
            if (ownerWallet) loadOwnerData(ownerWallet);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const statusStyle = (status) => {
        switch (status) {
            case 'active': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' };
            case 'frozen': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' };
            case 'pending': return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: '#eab308' };
            default: return { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.5)' };
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        Property <span style={{ color: '#ef4444' }}>Investigation</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Search properties for pre-court intervention — freeze, encumber, or flag disputes.
                    </p>
                </div>
                <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>← Back</button>
            </div>

            {/* Warning */}
            <div style={{
                padding: '0.75rem 1rem', borderRadius: '0.75rem', marginBottom: '1.5rem',
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
                <ShieldAlert size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(239,68,68,0.8)' }}>
                    <strong>AUTHORITY ACTION:</strong> Investigation actions restrict on-chain property rights.
                    Disputed/frozen status suspends all associated transactions until official resolution.
                </p>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="glass-panel p-5 mb-6">
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder="Search by property code, survey number, district, owner wallet..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="input-premium"
                            style={{ paddingLeft: 40, fontSize: '0.88rem', width: '100%' }}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        padding: '0.6rem 1.5rem', borderRadius: '0.5rem', fontSize: '0.82rem', fontWeight: 700,
                        background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(127,29,29,0.12))',
                        color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)',
                        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        opacity: loading ? 0.5 : 1,
                    }}>
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Investigate
                    </button>
                </div>
            </form>

            {/* Results */}
            {loading && (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            )}

            {searched && !loading && properties.length === 0 && (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <Building2 size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No properties match the search criteria.</p>
                </div>
            )}

            {properties.length > 0 && (
                <div style={{ marginBottom: '0.75rem', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                    {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {properties.map(p => {
                    const sc = statusStyle(p.status);
                    const isExpanded = expandedProp === p.id;
                    const isActing = actionLoading === p.id;
                    const ownerInfo = walletData[p.ownerWallet];

                    return (
                        <div key={p.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden', borderColor: p.status === 'frozen' ? 'rgba(239,68,68,0.15)' : undefined }}>
                            {/* Row */}
                            <div onClick={() => expandProp(p.id, p.ownerWallet)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer' }}>
                                <div className="flex items-center gap-4">
                                    <div style={{
                                        width: 44, height: 44, borderRadius: '12px',
                                        background: sc.bg, border: `1px solid ${sc.border}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: sc.text, flexShrink: 0,
                                    }}>
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>
                                            {p.propertyCode || 'No Code'}
                                            <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: '0.78rem' }}>
                                                Survey: {p.surveyNumber || '—'}
                                            </span>
                                        </p>
                                        <div className="flex items-center gap-4" style={{ marginTop: 4 }}>
                                            <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                                                <MapPin size={11} /> {p.district || '—'}, {p.state || '—'}
                                            </span>
                                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                                                <Wallet size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{shortenWallet(p.ownerWallet)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span style={{
                                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                                        letterSpacing: '0.04em', padding: '3px 10px', borderRadius: '9999px',
                                        background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                    }}>
                                        {p.status}
                                    </span>
                                    {p.encumbranceStatus && (
                                        <span style={{
                                            fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px',
                                            background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', color: '#eab308',
                                        }}>
                                            ENCUMBERED
                                        </span>
                                    )}
                                    {isExpanded ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                </div>
                            </div>

                            {/* Expanded */}
                            {isExpanded && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '1rem 1.25rem 1.25rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
                                        {/* Property Details */}
                                        <div>
                                            <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Property Record</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                <DetailField label="Property ID" value={p.id} mono />
                                                <DetailField label="Property Code" value={p.propertyCode || '—'} />
                                                <DetailField label="Survey Number" value={p.surveyNumber || '—'} />
                                                <DetailField label="District / State" value={`${p.district || '—'}, ${p.state || '—'}`} />
                                                <DetailField label="Area" value={p.areaSqft ? `${p.areaSqft} sqft` : '—'} />
                                                <DetailField label="Owner Wallet" value={p.ownerWallet || '—'} mono />
                                                <DetailField label="NFT Token" value={p.nftTokenId || 'Not minted'} mono />
                                                <DetailField label="Doc Hash" value={p.documentHash || 'None'} mono />
                                                <DetailField label="Status" value={p.status?.toUpperCase()} />
                                                <DetailField label="Encumbrance" value={p.encumbranceStatus ? 'YES' : 'CLEAR'} />
                                                <DetailField label="Registered" value={p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'} />
                                            </div>
                                        </div>

                                        {/* Owner Info */}
                                        <div>
                                            <h4 style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.75rem' }}>Owner Identity</h4>
                                            {ownerInfo?.user ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                                    <DetailField label="Name" value={ownerInfo.user.name || '—'} />
                                                    <DetailField label="Email" value={ownerInfo.user.email || '—'} />
                                                    <DetailField label="KYC Status" value={ownerInfo.user.kycStatus || '—'} />
                                                    <DetailField label="Role" value={ownerInfo.user.role?.toUpperCase() || '—'} />
                                                    <DetailField label="User ID" value={ownerInfo.user.id} mono />
                                                    <DetailField label="Registered" value={ownerInfo.user.createdAt ? new Date(ownerInfo.user.createdAt).toLocaleString() : '—'} />
                                                </div>
                                            ) : (
                                                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)' }}>
                                                    {ownerInfo === undefined ? 'Loading owner data...' : 'No linked user found for this wallet.'}
                                                </p>
                                            )}

                                            {/* Related Sales */}
                                            {ownerInfo?.sales?.length > 0 && (
                                                <div style={{ marginTop: '1rem' }}>
                                                    <h4 style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>
                                                        Related Transactions ({ownerInfo.sales.length})
                                                    </h4>
                                                    {ownerInfo.sales.slice(0, 3).map(tx => (
                                                        <div key={tx.id} style={{
                                                            padding: '0.5rem 0.75rem', borderRadius: '0.4rem', marginBottom: '0.3rem',
                                                            background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)',
                                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        }}>
                                                            <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                                                                ₹{tx.salePrice?.toLocaleString()}
                                                            </span>
                                                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
                                                                {tx.status?.replace(/_/g, ' ')}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div style={{ borderTop: '1px solid rgba(239,68,68,0.1)', paddingTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {p.status !== 'frozen' && (
                                            <button onClick={() => handleFreeze(p.id)} disabled={isActing} style={{
                                                padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                                background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)',
                                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                            }}>
                                                {isActing ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Freeze Property
                                            </button>
                                        )}
                                        {!p.encumbranceStatus ? (
                                            <button onClick={() => handleSetEncumbrance(p.id)} disabled={isActing} style={{
                                                padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                                background: 'rgba(234,88,12,0.1)', color: '#f97316', border: '1px solid rgba(234,88,12,0.25)',
                                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                            }}>
                                                <AlertTriangle size={13} /> Set Encumbrance
                                            </button>
                                        ) : (
                                            <button onClick={() => handleClearEncumbrance(p.id)} disabled={isActing} style={{
                                                padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                                background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)',
                                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                            }}>
                                                <CheckCircle2 size={13} /> Clear Encumbrance
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 600 }}>
                <ShieldAlert size={14} style={{ color: '#ef4444' }} />
                Official intervention actions are logged to the central audit ledger.
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

export default PropertyInvestigation;
