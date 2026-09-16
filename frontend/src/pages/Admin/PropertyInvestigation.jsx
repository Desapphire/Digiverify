import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    ShieldAlert, AlertTriangle, Search, Ban, Loader2,
    Building2, MapPin, Wallet, ChevronDown,
    ChevronUp, CheckCircle2, UploadCloud, FileText,
    XCircle, RefreshCcw, Clock, ArrowRight, BrainCircuit,
    Shield, ShieldCheck, User, Scale, FileCheck, ExternalLink, Copy,
    Users, Percent, Lock, Unlock, Gavel, Printer, Check
} from 'lucide-react';

const PropertyInvestigation = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [properties, setProperties] = useState([]);
    const [allProperties, setAllProperties] = useState([]);
    const [searched, setSearched] = useState(false);
    const [expandedProp, setExpandedProp] = useState(null);
    const [activeSubTab, setActiveSubTab] = useState('details'); // details, coOwners, legal
    const [actionLoading, setActionLoading] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [copiedId, setCopiedId] = useState('');

    // ── Modals ─────────────────────────────────────────────
    const [freezeModal, setFreezeModal] = useState(null); // { propId, propertyCode }
    const [freezeReason, setFreezeReason] = useState('');
    const [freezeHash, setFreezeHash] = useState('');
    const [freezeUploading, setFreezeUploading] = useState(false);

    const [encumbranceModal, setEncumbranceModal] = useState(null); // { propId, propertyCode }
    const [encumbranceReason, setEncumbranceReason] = useState('');

    const [forceTransferModal, setForceTransferModal] = useState(null); // { propId, propertyCode }
    const [forceNewOwner, setForceNewOwner] = useState('');
    const [forceReason, setForceReason] = useState('');
    const [forceHash, setForceHash] = useState('');
    const [forceUploading, setForceUploading] = useState(false);

    const [reverseModal, setReverseModal] = useState(null); // { propId, freezeOrderId, propertyCode }
    const [reverseHash, setReverseHash] = useState('');
    const [reverseReason, setReverseReason] = useState('');
    const [reverseUploading, setReverseUploading] = useState(false);

    const [historyModal, setHistoryModal] = useState(null); // { propId, propertyCode }
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        loadAllProperties();
    }, []);

    const loadAllProperties = async () => {
        setLoading(true);
        try {
            const res = await adminService.listProperties();
            const list = res.data?.data || [];
            setAllProperties(list);
            setProperties(list);
        } catch (err) {
            console.error('Failed to load properties', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
    };

    const handleSearch = (e, directQuery = null) => {
        if (e) e.preventDefault();
        const term = (directQuery !== null ? directQuery : query).toLowerCase().trim();
        setSearched(true);

        let filtered = allProperties;
        if (term) {
            filtered = filtered.filter(p =>
                (p.id || '').toLowerCase().includes(term) ||
                (p.propertyCode || '').toLowerCase().includes(term) ||
                (p.surveyNumber || '').toLowerCase().includes(term) ||
                (p.district || '').toLowerCase().includes(term) ||
                (p.ownerWallet || '').toLowerCase().includes(term) ||
                (p.state || '').toLowerCase().includes(term) ||
                (p.locality || '').toLowerCase().includes(term)
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => {
                if (statusFilter === 'locked') return p.encumbranceStatus === true;
                return (p.status || '').toLowerCase() === statusFilter;
            });
        }

        setProperties(filtered);
    };

    const applyStatusFilter = (st) => {
        setStatusFilter(st);
        let filtered = allProperties;
        const term = query.toLowerCase().trim();
        if (term) {
            filtered = filtered.filter(p =>
                (p.id || '').toLowerCase().includes(term) ||
                (p.propertyCode || '').toLowerCase().includes(term) ||
                (p.surveyNumber || '').toLowerCase().includes(term) ||
                (p.district || '').toLowerCase().includes(term) ||
                (p.ownerWallet || '').toLowerCase().includes(term)
            );
        }
        if (st !== 'all') {
            filtered = filtered.filter(p => {
                if (st === 'locked') return p.encumbranceStatus === true;
                return (p.status || '').toLowerCase() === st;
            });
        }
        setProperties(filtered);
    };

    // ── Upload court document to IPFS ─────────────────────
    const uploadDoc = async (file, setUploading, setHash) => {
        if (!file) return;
        setUploading(true);
        try {
            const res = await adminService.uploadCourtDocument(file);
            const hash = res.data?.data?.ipfsHash || res.data?.ipfsHash || res.data?.hash || '';
            if (!hash) throw new Error('No IPFS hash returned');
            setHash(hash);
        } catch (err) {
            alert(err.response?.data?.message || 'Document upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    // ── Action Handlers ────────────────────────────────────
    const handleFreeze = async () => {
        if (!freezeHash.trim() || freezeHash.trim().length < 10) {
            alert('A valid court stay order document is required.');
            return;
        }
        const { propId } = freezeModal;
        setFreezeModal(null);
        setActionLoading(propId);
        try {
            await adminService.freezeProperty(propId, freezeReason.trim() || 'Court Injunction', freezeHash.trim());
            await loadAllProperties();
        } catch (err) {
            alert(err.response?.data?.message || 'Property freeze failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReverseFreeze = async () => {
        if (!reverseHash.trim() || reverseHash.trim().length < 10) {
            alert('A valid court decree document is required.');
            return;
        }
        const { propId, freezeOrderId } = reverseModal;
        setReverseModal(null);
        setActionLoading(propId);
        try {
            await adminService.reverseFreezeOrder(freezeOrderId, reverseHash.trim(), reverseReason.trim() || 'Court Order Lifted');
            await loadAllProperties();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to lift court freeze');
        } finally {
            setActionLoading(null);
        }
    };

    const submitEncumbrance = async () => {
        if (!encumbranceReason.trim()) return alert('Please enter the reason for locking this property.');
        const { propId } = encumbranceModal;
        setActionLoading(propId);
        try {
            await adminService.setEncumbrance(propId, true, encumbranceReason.trim());
            setEncumbranceModal(null);
            await loadAllProperties();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to lock property');
        } finally {
            setActionLoading(null);
        }
    };

    const handleClearEncumbrance = async (propId) => {
        if (!window.confirm('Unlock this property? This will remove the officer lock status.')) return;
        setActionLoading(propId);
        try {
            await adminService.setEncumbrance(propId, false);
            await loadAllProperties();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to unlock property');
        } finally {
            setActionLoading(null);
        }
    };

    const submitForceTransfer = async () => {
        if (!forceNewOwner.trim() || !forceReason.trim() || !forceHash) {
            return alert('Please provide the new owner wallet address, reason, and uploaded court decree.');
        }
        const { propId } = forceTransferModal;
        setActionLoading(propId);
        try {
            await adminService.forceTransfer({
                propertyId: propId,
                newOwnerWallet: forceNewOwner.trim(),
                reason: forceReason.trim(),
                courtOrderHash: forceHash
            });
            setForceTransferModal(null);
            await loadAllProperties();
        } catch (err) {
            alert(err.response?.data?.message || 'Court transfer failed');
        } finally {
            setActionLoading(null);
        }
    };

    const fetchPropertyHistory = async (propId, propertyCode) => {
        setHistoryModal({ propId, propertyCode });
        setHistoryLoading(true);
        try {
            const res = await adminService.getPropertyHistory(propId);
            setHistoryData(res.data?.data || []);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to load property history');
        } finally {
            setHistoryLoading(false);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'active':
            case 'verified':
                return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', label: 'Registered & Active' };
            case 'pending':
                return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', label: 'Pending Review' };
            case 'frozen':
            case 'under_dispute':
                return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'Court Stay / Frozen' };
            case 'rejected':
                return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'Rejected' };
            default:
                return { bg: '#F1F5F9', border: '#E2E8F0', text: '#475569', label: (status || 'Unknown').toUpperCase() };
        }
    };

    return (
        <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1rem',
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
                            <Building2 size={12} />
                            Title & Land Investigation
                        </span>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            color: '#047857',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px'
                        }}>
                            Ethereum Sepolia Testnet
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Check Property & Legal Title
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Search any property, verify co-owners and boundary coordinates, apply judicial stay orders, or transfer titles.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => window.print()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    >
                        <Printer size={14} /> Print Report
                    </button>
                    <button
                        onClick={() => navigate('/authority')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    >
                        ← Dashboard
                    </button>
                </div>
            </div>

            {/* Omni Search & Filter Bar */}
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem'
            }}>
                {/* Search Form */}
                <form onSubmit={(e) => handleSearch(e)} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flex: '1 1 320px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '10px 14px',
                        boxSizing: 'border-box'
                    }}>
                        <Search size={18} style={{ color: '#64748B', flexShrink: 0 }} />
                        <input
                            type="text"
                            placeholder="Search by Survey Number, Property Code, District, State, or Owner Wallet..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{
                                width: '100%',
                                border: 'none',
                                background: 'transparent',
                                outline: 'none',
                                padding: 0,
                                margin: 0,
                                fontSize: '0.9rem',
                                color: '#0F172A',
                                boxShadow: 'none'
                            }}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        Search Properties
                    </button>
                </form>

                {/* Status Filter Pills */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {[
                            { key: 'all', label: `All Properties (${allProperties.length})` },
                            { key: 'active', label: 'Registered & Active' },
                            { key: 'pending', label: 'Pending Review' },
                            { key: 'frozen', label: 'Court Stay / Frozen' },
                            { key: 'locked', label: 'Locked / Encumbered' }
                        ].map(f => {
                            const isActive = statusFilter === f.key;
                            return (
                                <button
                                    key={f.key}
                                    onClick={() => applyStatusFilter(f.key)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        border: isActive ? '1px solid #0F172A' : '1px solid #E2E8F0',
                                        backgroundColor: isActive ? '#0F172A' : '#F8FAFC',
                                        color: isActive ? '#FFFFFF' : '#475569',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        onClick={loadAllProperties}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'none',
                            border: 'none',
                            color: '#2563EB',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCcw size={11} className={loading ? 'animate-spin' : ''} /> Refresh List
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '3.5rem 2rem',
                    textAlign: 'center'
                }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: '#2563EB', margin: '0 auto 12px auto' }} />
                    <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        Searching Land Titles & Court Registries...
                    </p>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                        Checking LandRegistry and CourtOverride smart contract states
                    </p>
                </div>
            )}

            {/* Empty State */}
            {!loading && properties.length === 0 && (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    padding: '3.5rem 2rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        backgroundColor: '#F1F5F9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 12px auto',
                        color: '#94A3B8'
                    }}>
                        <Building2 size={26} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>No Properties Found</h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>
                        No property titles matched your filter or search criteria.
                    </p>
                </div>
            )}

            {/* Properties List */}
            {!loading && properties.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {properties.map((p) => {
                        const isExpanded = expandedProp === p.id;
                        const statusBadge = getStatusStyle(p.status);
                        const isFrozen = p.status === 'frozen' || p.status === 'under_dispute';

                        return (
                            <div
                                key={p.id}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    borderRadius: '12px',
                                    border: isExpanded ? '1px solid #3B82F6' : '1px solid #E2E8F0',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    overflow: 'hidden',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {/* Main Card Summary */}
                                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                                    {p.propertyCode || 'Property Title'}
                                                </h3>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: 700,
                                                    color: '#334155',
                                                    backgroundColor: '#F1F5F9',
                                                    padding: '2px 8px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #E2E8F0'
                                                }}>
                                                    Survey #{p.surveyNumber || '—'}
                                                </span>
                                                {p.nftTokenId && (
                                                    <span style={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        color: '#4338CA',
                                                        backgroundColor: '#EEF2FF',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px',
                                                        border: '1px solid #C7D2FE'
                                                    }}>
                                                        LandNFT #{p.nftTokenId}
                                                    </span>
                                                )}
                                            </div>
                                            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={13} color="#94A3B8" /> {p.locality ? `${p.locality}, ` : ''}{p.district}, {p.state}
                                            </p>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <span style={{
                                                backgroundColor: statusBadge.bg,
                                                border: `1px solid ${statusBadge.border}`,
                                                color: statusBadge.text,
                                                fontSize: '0.72rem',
                                                fontWeight: 700,
                                                padding: '3px 10px',
                                                borderRadius: '9999px',
                                                textTransform: 'uppercase'
                                            }}>
                                                {statusBadge.label}
                                            </span>
                                            {p.encumbranceStatus && (
                                                <span style={{
                                                    backgroundColor: '#FEF3C7',
                                                    border: '1px solid #FDE68A',
                                                    color: '#92400E',
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    padding: '3px 10px',
                                                    borderRadius: '9999px',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Lock size={11} /> LOCKED
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* 4 Stat Overview Grid */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                        gap: '10px',
                                        backgroundColor: '#F8FAFC',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '0.82rem'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Area</span>
                                            <span style={{ fontWeight: 700, color: '#0F172A' }}>{p.areaSqft ? `${p.areaSqft} sq.ft` : '—'}</span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Circle Rate Valuation</span>
                                            <span style={{ fontWeight: 800, color: '#047857' }}>
                                                {p.circleRateValuation || p.estimatedFairPrice ? `₹${Number(p.circleRateValuation || p.estimatedFairPrice).toLocaleString()}` : '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Primary Owner</span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0F172A' }}>
                                                {shortenWallet(p.ownerWallet)}
                                            </span>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block' }}>Co-Owners</span>
                                            <span style={{ fontWeight: 700, color: '#334155' }}>
                                                {p.coOwners && p.coOwners.length > 0 ? `${p.coOwners.length} Registered` : 'Single Owner'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Legal Notices / Stay Orders */}
                                    {isFrozen && (
                                        <div style={{
                                            backgroundColor: '#FEF2F2',
                                            border: '1px solid #FECACA',
                                            borderRadius: '8px',
                                            padding: '10px 14px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            color: '#991B1B',
                                            fontSize: '0.82rem',
                                            fontWeight: 600
                                        }}>
                                            <AlertTriangle size={16} color="#DC2626" />
                                            <span>
                                                Active Judicial Freeze: Sales, transfers, and mortgages are frozen on-chain.
                                            </span>
                                        </div>
                                    )}

                                    {/* Action Buttons Bar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px' }}>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {/* Freeze / Lift Freeze */}
                                            {isFrozen ? (
                                                <button
                                                    onClick={() => setReverseModal({ propId: p.id, freezeOrderId: p.freezeOrderId || p.id, propertyCode: p.propertyCode })}
                                                    disabled={actionLoading === p.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 12px',
                                                        backgroundColor: '#047857',
                                                        color: '#FFFFFF',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <CheckCircle2 size={13} /> Lift Stay Order
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setFreezeModal({ propId: p.id, propertyCode: p.propertyCode })}
                                                    disabled={actionLoading === p.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 12px',
                                                        backgroundColor: '#B91C1C',
                                                        color: '#FFFFFF',
                                                        borderRadius: '6px',
                                                        border: 'none',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Ban size={13} /> Apply Court Freeze
                                                </button>
                                            )}

                                            {/* Lock / Unlock (Encumbrance) */}
                                            {p.encumbranceStatus ? (
                                                <button
                                                    onClick={() => handleClearEncumbrance(p.id)}
                                                    disabled={actionLoading === p.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 12px',
                                                        backgroundColor: '#F8FAFC',
                                                        color: '#334155',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Unlock size={13} /> Unlock Property
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => setEncumbranceModal({ propId: p.id, propertyCode: p.propertyCode })}
                                                    disabled={actionLoading === p.id}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        padding: '7px 12px',
                                                        backgroundColor: '#F8FAFC',
                                                        color: '#334155',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '6px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 600,
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Lock size={13} /> Lock (Dispute)
                                                </button>
                                            )}

                                            {/* Force Transfer */}
                                            <button
                                                onClick={() => setForceTransferModal({ propId: p.id, propertyCode: p.propertyCode })}
                                                disabled={actionLoading === p.id}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '7px 12px',
                                                    backgroundColor: '#F8FAFC',
                                                    color: '#334155',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '6px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Gavel size={13} /> Transfer Title (Court)
                                            </button>

                                            {/* History */}
                                            <button
                                                onClick={() => fetchPropertyHistory(p.id, p.propertyCode)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    padding: '7px 12px',
                                                    backgroundColor: '#F8FAFC',
                                                    color: '#334155',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '6px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Clock size={13} /> History Ledger
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => setExpandedProp(isExpanded ? null : p.id)}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '7px 14px',
                                                backgroundColor: isExpanded ? '#EFF6FF' : '#F1F5F9',
                                                border: isExpanded ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                                                borderRadius: '6px',
                                                color: isExpanded ? '#1D4ED8' : '#334155',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {isExpanded ? (
                                                <>Hide Details <ChevronUp size={14} /></>
                                            ) : (
                                                <>View Deep Inspection <ChevronDown size={14} /></>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Inspection Drawer */}
                                {isExpanded && (
                                    <div style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                        {/* Sub Tabs */}
                                        <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #E2E8F0', paddingBottom: '2px' }}>
                                            {[
                                                { key: 'details', label: 'Land Survey & Geometry', icon: MapPin },
                                                { key: 'coOwners', label: `Co-Owners (${p.coOwners?.length || 0})`, icon: Users },
                                                { key: 'legal', label: 'Legal Status & Hashes', icon: Scale }
                                            ].map(st => {
                                                const Icon = st.icon;
                                                const isActive = activeSubTab === st.key;
                                                return (
                                                    <button
                                                        key={st.key}
                                                        onClick={() => setActiveSubTab(st.key)}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            padding: '8px 14px',
                                                            borderRadius: '6px 6px 0 0',
                                                            border: isActive ? '1px solid #CBD5E1' : '1px solid transparent',
                                                            borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                                                            backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                                                            color: isActive ? '#1D4ED8' : '#64748B',
                                                            fontSize: '0.8rem',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <Icon size={13} /> {st.label}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Sub Tab 1: Details */}
                                        {activeSubTab === 'details' && (
                                            <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                                <DetailField label="Property Code" value={p.propertyCode} mono />
                                                <DetailField label="Survey Number" value={p.surveyNumber} />
                                                <DetailField label="District / Taluk" value={p.district} />
                                                <DetailField label="State" value={p.state} />
                                                <DetailField label="Area" value={p.areaSqft ? `${p.areaSqft} sq.ft` : '—'} />
                                                <DetailField label="GPS Coordinates" value={p.coordinates || 'GPS Location Verified'} mono />
                                                <DetailField label="Circle Rate Valuation" value={p.circleRateValuation || p.estimatedFairPrice ? `₹${Number(p.circleRateValuation || p.estimatedFairPrice).toLocaleString()}` : '—'} />
                                                <DetailField label="Registration Date" value={p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'} />
                                                
                                                {p.documentHash && (
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                                            Official Deed IPFS Hash
                                                        </span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#0F172A', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', flex: 1, wordBreak: 'break-all' }}>
                                                                {p.documentHash}
                                                            </span>
                                                            <a
                                                                href={`https://gateway.pinata.cloud/ipfs/${p.documentHash}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    padding: '6px 12px',
                                                                    backgroundColor: '#EFF6FF',
                                                                    color: '#1D4ED8',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #BFDBFE',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 700,
                                                                    textDecoration: 'none'
                                                                }}
                                                            >
                                                                <ExternalLink size={12} /> View Deed
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Sub Tab 2: Co-Owners */}
                                        {activeSubTab === 'coOwners' && (
                                            <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                {(!p.coOwners || p.coOwners.length === 0) ? (
                                                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>This parcel is registered under a single primary titleholder ({shortenWallet(p.ownerWallet)}).</p>
                                                ) : (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                                                        {p.coOwners.map((co, idx) => (
                                                            <div key={idx} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        {co.name || shortenWallet(co.walletAddress)}
                                                                        {co.isPrimary && (
                                                                            <span style={{ fontSize: '0.62rem', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontWeight: 800, padding: '1px 5px', borderRadius: '4px' }}>
                                                                                PRIMARY
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#64748B', display: 'block', marginTop: '2px' }}>
                                                                        {co.walletAddress}
                                                                    </span>
                                                                </div>
                                                                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#047857', backgroundColor: '#ECFDF5', padding: '4px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                                                    {co.sharePercentage ? `${co.sharePercentage}%` : `${((co.sharePercentageBps || 0) / 100).toFixed(2)}%`}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Sub Tab 3: Legal Status */}
                                        {activeSubTab === 'legal' && (
                                            <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <DetailField label="Smart Contract Status" value={p.status} />
                                                {p.encumbranceReason && (
                                                    <DetailField label="Officer Lock Reason" value={p.encumbranceReason} />
                                                )}
                                                {p.nftTokenId && (
                                                    <div>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                                                            On-Chain Token Verification
                                                        </span>
                                                        <a
                                                            href={`https://sepolia.etherscan.io/token/0xbCB28DC4eF6242572c0a65D1643595C582106249?a=${p.nftTokenId}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 700,
                                                                color: '#2563EB',
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            Verify LandNFT #{p.nftTokenId} on Ethereum Sepolia Etherscan <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modal: Freeze Property ── */}
            {freezeModal && (
                <ModalOverlay onClose={() => setFreezeModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
                                <Ban size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Apply Court Stay Order (Freeze)</h3>
                                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Property: {freezeModal.propertyCode}</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Court Order / Injunction Reason *</label>
                            <input
                                type="text"
                                placeholder="e.g. High Court Civil Stay WP-2026-9812 pending title dispute"
                                value={freezeReason}
                                onChange={(e) => setFreezeReason(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Upload Certified Court Document (PDF) *</label>
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => uploadDoc(e.target.files[0], setFreezeUploading, setFreezeHash)}
                                style={{ width: '100%', fontSize: '0.82rem' }}
                            />
                            {freezeUploading && <span style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '4px', display: 'block' }}>Uploading to IPFS...</span>}
                            {freezeHash && <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#059669', marginTop: '4px', display: 'block' }}>IPFS: {freezeHash}</span>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <button onClick={() => setFreezeModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleFreeze} disabled={freezeUploading || !freezeHash} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#B91C1C', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                                Freeze Property
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* ── Modal: Reverse Freeze (Lift Stay) ── */}
            {reverseModal && (
                <ModalOverlay onClose={() => setReverseModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
                                <CheckCircle2 size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Lift Court Stay Order</h3>
                                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Property: {reverseModal.propertyCode}</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Court Order Vacation / Dismissal Reason *</label>
                            <input
                                type="text"
                                placeholder="e.g. Injunction dismissed as per final judgment dated 16-Sep-2026"
                                value={reverseReason}
                                onChange={(e) => setReverseReason(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Upload Vacation Order / Judgment (PDF) *</label>
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => uploadDoc(e.target.files[0], setReverseUploading, setReverseHash)}
                                style={{ width: '100%', fontSize: '0.82rem' }}
                            />
                            {reverseUploading && <span style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '4px', display: 'block' }}>Uploading to IPFS...</span>}
                            {reverseHash && <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#059669', marginTop: '4px', display: 'block' }}>IPFS: {reverseHash}</span>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                            <button onClick={() => setReverseModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={handleReverseFreeze} disabled={reverseUploading || !reverseHash} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#047857', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                                Lift Freeze
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* ── Modal: Lock Property (Encumbrance) ── */}
            {encumbranceModal && (
                <ModalOverlay onClose={() => setEncumbranceModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B45309' }}>
                                <Lock size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Lock Property for Investigation</h3>
                                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Property: {encumbranceModal.propertyCode}</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Officer Lock Reason *</label>
                            <textarea
                                rows={3}
                                placeholder="e.g. Under municipal tax audit / boundary dispute review"
                                value={encumbranceReason}
                                onChange={(e) => setEncumbranceReason(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => setEncumbranceModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={submitEncumbrance} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#0F172A', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                                Lock Property
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* ── Modal: Force Title Transfer ── */}
            {forceTransferModal && (
                <ModalOverlay onClose={() => setForceTransferModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1D4ED8' }}>
                                <Gavel size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Transfer Title by Court Decree</h3>
                                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Property: {forceTransferModal.propertyCode}</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>New Owner Web3 Wallet Address *</label>
                            <input
                                type="text"
                                placeholder="0x..."
                                value={forceNewOwner}
                                onChange={(e) => setForceNewOwner(e.target.value)}
                                style={{ width: '100%', fontFamily: 'monospace', padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Judicial Decree Reason *</label>
                            <input
                                type="text"
                                placeholder="e.g. Civil Court Partition Suit Final Decree Execution"
                                value={forceReason}
                                onChange={(e) => setForceReason(e.target.value)}
                                style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>Upload Certified Court Decree (PDF) *</label>
                            <input
                                type="file"
                                accept=".pdf,image/*"
                                onChange={(e) => uploadDoc(e.target.files[0], setForceUploading, setForceHash)}
                                style={{ width: '100%', fontSize: '0.82rem' }}
                            />
                            {forceUploading && <span style={{ fontSize: '0.75rem', color: '#2563EB', marginTop: '4px', display: 'block' }}>Uploading to IPFS...</span>}
                            {forceHash && <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#059669', marginTop: '4px', display: 'block' }}>IPFS: {forceHash}</span>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => setForceTransferModal(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#FFFFFF', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button onClick={submitForceTransfer} disabled={forceUploading || !forceHash || !forceNewOwner} style={{ padding: '8px 18px', borderRadius: '6px', border: 'none', background: '#2563EB', color: '#FFFFFF', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}>
                                Transfer Title
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* ── Modal: History Ledger ── */}
            {historyModal && (
                <ModalOverlay onClose={() => setHistoryModal(null)}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
                            <div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>Title History & Blockchain Events</h3>
                                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>Property: {historyModal.propertyCode}</span>
                            </div>
                            <button onClick={() => setHistoryModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        {historyLoading ? (
                            <div style={{ padding: '2rem', textAlign: 'center' }}>
                                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: '#2563EB' }} />
                                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>Loading history ledger...</span>
                            </div>
                        ) : historyData.length === 0 ? (
                            <p style={{ fontSize: '0.82rem', color: '#94A3B8', textAlign: 'center', padding: '1.5rem 0' }}>No historical events recorded for this property.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {historyData.map((ev, i) => (
                                    <div key={i} style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px', fontSize: '0.8rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>{ev.eventType}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{new Date(ev.timestamp).toLocaleString()}</span>
                                        </div>
                                        {ev.data && (
                                            <pre style={{ margin: '6px 0 0 0', fontSize: '0.7rem', color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-all', backgroundColor: '#FFFFFF', padding: '6px', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                                                {JSON.stringify(ev.data, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ModalOverlay>
            )}

            {/* Footer */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '0.75rem',
                color: '#94A3B8',
                paddingTop: '1rem',
                borderTop: '1px solid #E2E8F0'
            }}>
                <ShieldCheck size={14} color="#2563EB" />
                <span>DigiVerify Land Registry — Cadastral Verification & Title Enforcement</span>
            </div>
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>{label}</span>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', wordBreak: 'break-all', ...(mono ? { fontFamily: 'monospace', fontSize: '0.8rem' } : {}) }}>
            {value || '—'}
        </p>
    </div>
);

const ModalOverlay = ({ children, onClose }) => (
    <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
    }}>
        <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            maxWidth: '520px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
            {children}
        </div>
    </div>
);

export default PropertyInvestigation;
