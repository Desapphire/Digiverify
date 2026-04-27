import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Building2, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, MapPin, Ruler, Hash, Wallet,
    ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Clock,
    FileText, ExternalLink, Paperclip
} from 'lucide-react';

const PropertyVerification = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProp, setExpandedProp] = useState(null);
    const [propDocs, setPropDocs] = useState({});
    const [docsLoading, setDocsLoading] = useState({});

    // Modal state for Action Reasoning
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', propId: null, error: '' });
    const [actionReason, setActionReason] = useState('');

    const fetchProperties = async () => {
        setLoading(true);
        try {
            const res = await adminService.listProperties(filter || undefined);
            setProperties(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch properties:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async (propId) => {
        if (propDocs[propId]) return;
        setDocsLoading(prev => ({ ...prev, [propId]: true }));
        try {
            const res = await adminService.getPropertyDocuments(propId);
            setPropDocs(prev => ({ ...prev, [propId]: res.data?.data || [] }));
        } catch (err) {
            console.error('Failed to fetch docs:', err);
        } finally {
            setDocsLoading(prev => ({ ...prev, [propId]: false }));
        }
    };

    const toggleExpand = (propId) => {
        if (expandedProp === propId) {
            setExpandedProp(null);
        } else {
            setExpandedProp(propId);
            fetchDocuments(propId);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [filter]);

    const openActionModal = (propId, type) => {
        setActionModal({ isOpen: true, type, propId, error: '' });
        setActionReason('');
    };

    const confirmAction = async () => {
        const { propId, type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (!trimmedReason && type !== 'approve') {
            setActionModal(prev => ({ ...prev, error: `A reason is required to ${type} this property.` }));
            return;
        }

        setActionLoading(propId);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveProperty(propId, trimmedReason);
            } else if (type === 'reject') {
                await adminService.rejectProperty(propId, trimmedReason);
            } else if (type === 'encumber') {
                await adminService.setEncumbrance(propId, true, trimmedReason);
            }
            fetchProperties();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const filteredProps = properties.filter(p => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (p.propertyCode || '').toLowerCase().includes(q) ||
            (p.surveyNumber || '').toLowerCase().includes(q) ||
            (p.district || '').toLowerCase().includes(q) ||
            (p.state || '').toLowerCase().includes(q) ||
            (p.ownerWallet || '').toLowerCase().includes(q)
        );
    });

    const statusStyle = (status) => {
        switch (status) {
            case 'active': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' };
            case 'frozen': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' };
            case 'pending': return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: '#eab308' };
            case 'transferred': return { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', text: '#3b82f6' };
            default: return { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.5)' };
        }
    };

    const FILTERS = [
        { key: '', label: 'All' },
        { key: 'pending', label: 'Pending' },
        { key: 'active', label: 'Active' },
        { key: 'rejected', label: 'Rejected' },
        { key: 'frozen', label: 'Frozen' },
    ];

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        Property <span className="text-gradient">Verification</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Review property registrations, approve, and manage encumbrances.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
                        ← Back
                    </button>
                    <button onClick={fetchProperties} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filters + Search */}
            <div className="glass-panel p-4 mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={{
                                padding: '0.4rem 1rem', borderRadius: '0.5rem',
                                fontSize: '0.78rem', fontWeight: 700,
                                border: filter === f.key ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                background: filter === f.key ? 'rgba(220,38,38,0.12)' : 'rgba(0,0,0,0.2)',
                                color: filter === f.key ? '#fca5a5' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', transition: 'all 0.2s',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div style={{ position: 'relative', minWidth: 220 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                        type="text"
                        placeholder="Search code, survey, district..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium"
                        style={{ paddingLeft: 34, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 34px' }}
                    />
                </div>
            </div>

            {/* Count */}
            <div style={{ marginBottom: '1rem', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                {loading ? 'Loading...' : `${filteredProps.length} propert${filteredProps.length !== 1 ? 'ies' : 'y'} found`}
            </div>

            {/* Property List */}
            {loading ? (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            ) : filteredProps.length === 0 ? (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <Building2 size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No properties match the current filter.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredProps.map(p => {
                        const sc = statusStyle(p.status);
                        const isExpanded = expandedProp === p.id;
                        const isActing = actionLoading === p.id;

                        return (
                            <div key={p.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Main Row */}
                                <div
                                    onClick={() => toggleExpand(p.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem 1.25rem', cursor: 'pointer',
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Icon */}
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '12px',
                                            background: `${sc.bg}`, border: `1px solid ${sc.border}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: sc.text, flexShrink: 0,
                                        }}>
                                            <Building2 size={20} />
                                        </div>

                                        <div>
                                            <p style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>
                                                {p.propertyCode || 'No Code'}
                                                <span style={{ fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginLeft: 8, fontSize: '0.8rem' }}>
                                                    Survey: {p.surveyNumber || '—'}
                                                </span>
                                            </p>
                                            <div className="flex items-center gap-4" style={{ marginTop: 4 }}>
                                                <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                                                    <MapPin size={11} /> {p.district || '—'}, {p.state || '—'}
                                                </span>
                                                {p.areaSqft && (
                                                    <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                                                        <Ruler size={11} /> {p.areaSqft} sqft
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                                                    <Wallet size={11} /> {shortenWallet(p.ownerWallet)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Status */}
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                                            letterSpacing: '0.05em', padding: '3px 10px', borderRadius: '9999px',
                                            background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                        }}>
                                            {p.status || 'unknown'}
                                        </span>

                                        {p.encumbranceStatus && (
                                            <span style={{
                                                fontSize: '0.65rem', fontWeight: 800, padding: '3px 8px',
                                                borderRadius: '9999px', background: 'rgba(239,68,68,0.1)',
                                                border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444',
                                            }}>
                                                <AlertTriangle size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                                                ENCUMBERED
                                            </span>
                                        )}

                                        {/* Actions */}
                                        {p.status === 'pending' && (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => openActionModal(p.id, 'approve')}
                                                    disabled={isActing}
                                                    style={{
                                                        padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
                                                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                                        background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                                                        border: '1px solid rgba(34,197,94,0.2)',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        opacity: isActing ? 0.5 : 1,
                                                    }}
                                                >
                                                    {isActing && actionModal.type === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                    Approve & Mint
                                                </button>
                                                <button
                                                    onClick={() => openActionModal(p.id, 'reject')}
                                                    disabled={isActing}
                                                    style={{
                                                        padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
                                                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                                        background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                                                        border: '1px solid rgba(239,68,68,0.2)',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        opacity: isActing ? 0.5 : 1,
                                                    }}
                                                >
                                                    {isActing && actionModal.type === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                                    Reject
                                                </button>
                                            </div>
                                        )}

                                        {p.status === 'active' && !p.encumbranceStatus && (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => openActionModal(p.id, 'encumber')}
                                                    disabled={isActing}
                                                    style={{
                                                        padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
                                                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                                        background: 'rgba(234,179,8,0.1)', color: '#eab308',
                                                        border: '1px solid rgba(234,179,8,0.2)',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        opacity: isActing ? 0.5 : 1,
                                                    }}
                                                >
                                                    {isActing && actionModal.type === 'encumber' ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />} Encumber
                                                </button>
                                            </div>
                                        )}

                                        {isExpanded ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)',
                                        paddingTop: '1rem',
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <DetailField label="Property ID" value={p.id} mono />
                                            <DetailField label="Property Code" value={p.propertyCode || '—'} />
                                            <DetailField label="Survey Number" value={p.surveyNumber || '—'} />
                                            <DetailField label="Address" value={p.addressLine || '—'} />
                                            <DetailField label="District" value={p.district || '—'} />
                                            <DetailField label="State" value={p.state || '—'} />
                                            <DetailField label="Area (Sqft)" value={p.areaSqft || '—'} />
                                            <DetailField label="Owner Wallet" value={p.ownerWallet || '—'} mono />
                                            <DetailField label="NFT Token ID" value={p.nftTokenId || 'Not minted'} mono />
                                            <DetailField label="Document Hash" value={p.documentHash || 'None'} mono />
                                            <DetailField label="Encumbrance" value={p.encumbranceStatus ? 'Yes' : 'Clear'} />
                                            <DetailField label="Status" value={p.status || '—'} />
                                            {p.geoLat && <DetailField label="Coordinates" value={`${p.geoLat}, ${p.geoLng}`} />}
                                            <DetailField label="Registered" value={p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'} />
                                            <DetailField label="Last Updated" value={p.updatedAt ? new Date(p.updatedAt).toLocaleString() : '—'} />
                                        </div>

                                        {/* Documents Section */}
                                        <div style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem' }}>
                                            <p style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#fca5a5', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Paperclip size={12} /> Supporting Documents
                                            </p>
                                            
                                            {docsLoading[p.id] ? (
                                                <div className="flex items-center gap-2 text-muted py-2" style={{ fontSize: '0.8rem' }}>
                                                    <Loader2 size={14} className="animate-spin" /> Loading documents...
                                                </div>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                                                    {/* Primary Title Deed fallback */}
                                                    {p.documentHash && (
                                                        <a 
                                                            href={`https://ipfs.io/ipfs/${p.documentHash}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="glass-panel"
                                                            style={{ 
                                                                padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                                textDecoration: 'none', transition: 'all 0.2s', border: '1px solid rgba(139,92,246,0.15)',
                                                                background: 'rgba(139,92,246,0.03)'
                                                            }}
                                                        >
                                                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(255,85%,65%)' }}>
                                                                <FileText size={16} />
                                                            </div>
                                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', margin: 0 }}>Primary Title Deed</p>
                                                                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: 'monospace' }}>{p.documentHash.slice(0, 8)}...{p.documentHash.slice(-8)}</p>
                                                            </div>
                                                            <ExternalLink size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                                        </a>
                                                    )}

                                                    {/* Additional Documents from property_documents table */}
                                                    {propDocs[p.id]?.map(doc => (
                                                        <a 
                                                            key={doc.id} 
                                                            href={`https://ipfs.io/ipfs/${doc.ipfs_hash}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="glass-panel"
                                                            style={{ 
                                                                padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                                textDecoration: 'none', transition: 'all 0.2s', border: '1px solid rgba(255,255,255,0.03)',
                                                                background: 'rgba(255,255,255,0.02)'
                                                            }}
                                                        >
                                                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                                                <FileText size={16} />
                                                            </div>
                                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                                <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'white', margin: 0 }}>{doc.document_type || 'Supporting Document'}</p>
                                                                <p style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', margin: 0, fontFamily: 'monospace' }}>{doc.ipfs_hash.slice(0, 8)}...{doc.ipfs_hash.slice(-8)}</p>
                                                            </div>
                                                            <ExternalLink size={14} style={{ color: 'rgba(255,255,255,0.2)' }} />
                                                        </a>
                                                    ))}

                                                    {!p.documentHash && (!propDocs[p.id] || propDocs[p.id].length === 0) && (
                                                        <div className="p-4 rounded-lg bg-black/20 border border-white/5 text-center col-span-full w-full">
                                                            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>No additional documents uploaded.</p>
                                                        </div>
                                                    )}
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

            {/* Footer */}
            <div className="mt-8 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 600, padding: '0 0.5rem' }}>
                <ShieldCheck size={14} style={{ color: '#ef4444' }} />
                Property verification confirmed via on-chain survey registry.
            </div>

            {/* Action Reasoning Modal */}
            {actionModal.isOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem', color: 'white', textTransform: 'capitalize' }}>
                            {actionModal.type} Property
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.25rem' }}>
                            Please provide a reason or note for this decision. {actionModal.type !== 'approve' && 'This is required.'}
                        </p>
                        <textarea
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Enter reasoning..."
                            className="input-premium"
                            style={{ width: '100%', minHeight: 100, marginBottom: '1rem', resize: 'vertical' }}
                        />
                        {actionModal.error && (
                            <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                {actionModal.error}
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setActionModal({ isOpen: false, type: '', propId: null, error: '' })}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                className={actionModal.type === 'approve' ? 'btn btn-primary' : 'btn btn-danger'}
                                disabled={actionModal.type !== 'approve' && !actionReason.trim()}
                            >
                                Confirm Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
            {label}
        </p>
        <p style={{
            fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)',
            fontFamily: mono ? 'monospace' : 'inherit',
            wordBreak: 'break-all',
        }}>
            {value}
        </p>
    </div>
);

export default PropertyVerification;
