import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    ShieldAlert, AlertTriangle, Search, Ban, Loader2,
    Building2, MapPin, Wallet, ChevronDown,
    ChevronUp, CheckCircle2, UploadCloud, FileText,
    XCircle, RefreshCcw, Clock, ArrowRight
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

    // ── Freeze modal state ────────────────────────────────
    const [freezeModal, setFreezeModal] = useState(null); // { propId }
    const [freezeReason, setFreezeReason] = useState('');
    const [freezeHash, setFreezeHash] = useState('');
    const [freezeFile, setFreezeFile] = useState(null);
    const [freezeUploading, setFreezeUploading] = useState(false);

    // ── Encumbrance modal state ───────────────────────────
    const [encumbranceModal, setEncumbranceModal] = useState(null); // { propId }
    const [encumbranceReason, setEncumbranceReason] = useState('');

    // ── Force Transfer (Reverse Sale) modal state ─────────
    const [forceTransferModal, setForceTransferModal] = useState(null); // { propId }
    const [forceNewOwner, setForceNewOwner] = useState('');
    const [forceReason, setForceReason] = useState('');
    const [forceHash, setForceHash] = useState('');
    const [forceFile, setForceFile] = useState(null);
    const [forceUploading, setForceUploading] = useState(false);

    // ── Reverse-freeze modal state ────────────────────────
    const [reverseModal, setReverseModal] = useState(null); // { propId, freezeOrderId }
    const [reverseHash, setReverseHash] = useState('');
    const [reverseReason, setReverseReason] = useState('');
    const [reverseFile, setReverseFile] = useState(null);
    const [reverseUploading, setReverseUploading] = useState(false);

    // ── Ledger History modal state ────────────────────────
    const [historyModal, setHistoryModal] = useState(null); // { propId, propertyCode }
    const [historyData, setHistoryData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // ── Upload court document to IPFS ─────────────────────
    const uploadDoc = async (file, setUploading, setHash) => {
        if (!file) return;
        setUploading(true);
        try {
            const res = await adminService.uploadCourtDocument(file);
            const hash = res.data?.data?.ipfsHash || res.data?.ipfsHash || res.data?.hash || '';
            if (!hash) throw new Error('No hash returned from IPFS upload');
            setHash(hash);
        } catch (err) {
            alert(err.response?.data?.message || 'Document upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

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

    // Bug 1 fix: open modal — court uploads PDF, hash auto-filled
    const openFreezeModal = (propId) => {
        setFreezeReason('');
        setFreezeHash('');
        setFreezeFile(null);
        setFreezeModal({ propId });
    };

    const handleFreeze = async () => {
        if (!freezeHash.trim() || freezeHash.trim().length < 10) {
            alert('Court Order Hash must be at least 10 characters (IPFS hash).');
            return;
        }
        const { propId } = freezeModal;
        setFreezeModal(null);
        setActionLoading(propId);
        try {
            await adminService.freezeProperty(propId, freezeReason.trim() || undefined, freezeHash.trim());
            handleSearch({ preventDefault: () => { } });
        } catch (err) {
            alert(err.response?.data?.message || 'Freeze failed');
        } finally {
            setActionLoading(null);
        }
    };

    // Bug 2 fix: open modal — court uploads PDF, hash auto-filled
    const openReverseModal = (propId, freezeOrderId) => {
        setReverseHash('');
        setReverseReason('');
        setReverseFile(null);
        setReverseModal({ propId, freezeOrderId });
    };

    const handleReverseFreeze = async () => {
        if (!reverseHash.trim() || reverseHash.trim().length < 10) {
            alert('Court Order Hash must be at least 10 characters (IPFS hash).');
            return;
        }
        const { propId, freezeOrderId } = reverseModal;
        setReverseModal(null);
        setActionLoading(propId);
        try {
            await adminService.reverseFreezeOrder(freezeOrderId, reverseHash.trim(), reverseReason.trim() || undefined);
            handleSearch({ preventDefault: () => { } });
        } catch (err) {
            alert(err.response?.data?.message || 'Reverse freeze failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleSetEncumbrance = (propId) => {
        setEncumbranceReason('');
        setEncumbranceModal({ propId });
    };

    const submitEncumbrance = async () => {
        if (!encumbranceReason.trim()) return alert('Please provide a reason for the encumbrance.');
        const { propId } = encumbranceModal;
        setActionLoading(propId);
        try {
            await adminService.setEncumbrance(propId, true, encumbranceReason.trim());
            setEncumbranceModal(null);
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

    const submitForceTransfer = async () => {
        if (!forceNewOwner.trim() || !forceReason.trim() || !forceHash) {
            return alert('Please fill in all fields and upload the court order.');
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
            handleSearch({ preventDefault: () => { } });
        } catch (err) {
            alert(err.response?.data?.message || 'Force transfer failed');
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
                                                <DetailField label="NFT Token" value={p.nftTokenId || 'Not minted'} mono isLink={!!p.nftTokenId} linkHref={p.nftTokenId ? `https://testnet.snowtrace.io/nft/0xE94d65289Cc088f597C077938A6D7Fc0974196fe/${p.nftTokenId}` : ''} />
                                                <DetailField label="Doc Hash" value={p.documentHash || 'None'} mono isLink={!!p.documentHash} linkHref={p.documentHash ? `https://ipfs.io/ipfs/${p.documentHash}` : ''} />
                                                <DetailField label="Status" value={p.status?.toUpperCase()} />
                                                <DetailField label="Encumbrance" value={p.encumbranceStatus ? `YES${p.encumbranceReason ? ` (${p.encumbranceReason})` : ''}` : 'CLEAR'} />
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
                                            <button onClick={() => openFreezeModal(p.id)} disabled={isActing} style={{
                                                padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                                background: 'rgba(59,130,246,0.1)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)',
                                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                            }}>
                                                {isActing ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Freeze Property
                                            </button>
                                        )}
                                        {p.status === 'frozen' && (
                                            <button onClick={() => openReverseModal(p.id, p.freezeOrderId || p.id)} disabled={isActing} style={{
                                                padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                                background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)',
                                                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                            }}>
                                                {isActing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />} Reverse Freeze
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
                                        {/* Force Transfer / Reverse Sale */}
                                        <button onClick={() => {
                                            setForceNewOwner('');
                                            setForceReason('');
                                            setForceHash('');
                                            setForceFile(null);
                                            setForceTransferModal({ propId: p.id });
                                        }} disabled={isActing} style={{
                                            padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                            background: 'rgba(168,85,247,0.1)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.25)',
                                            display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', opacity: isActing ? 0.5 : 1,
                                        }}>
                                            <RefreshCcw size={13} /> Reverse / Force Transfer
                                        </button>
                                        {/* View Detailed History  */}
                                        <button onClick={() => fetchPropertyHistory(p.id, p.propertyCode)} style={{
                                            padding: '0.45rem 1rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 700,
                                            background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                                            display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginLeft: 'auto',
                                        }}>
                                            <Clock size={13} /> Detailed History
                                        </button>
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

            {/* ── Encumbrance Reason Modal ── */}
            {encumbranceModal && (
                <div onClick={() => setEncumbranceModal(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        width: '100%', maxWidth: '440px',
                        background: 'rgba(15,10,25,0.97)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderTop: '3px solid #ef4444',
                        borderRadius: '16px', padding: '2rem', position: 'relative',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                    }}>
                        <button onClick={() => setEncumbranceModal(null)} style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', width: '30px', height: '30px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#9ca3af',
                        }}><XCircle size={14} /></button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShieldAlert size={18} style={{ color: '#ef4444' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>Set Encumbrance</h3>
                                <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0 }}>Document the legal basis for flagging this property</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                                    Reason <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="e.g. Bank lien registered by HDFC Bank — Loan A/C #XXXXXX"
                                    value={encumbranceReason}
                                    onChange={e => setEncumbranceReason(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.85rem', background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px',
                                        color: 'white', fontFamily: 'inherit', fontSize: '0.88rem',
                                        resize: 'vertical', outline: 'none', lineHeight: 1.5,
                                    }}
                                />
                            </div>

                            <button
                                onClick={submitEncumbrance}
                                disabled={!encumbranceReason.trim() || actionLoading === encumbranceModal?.propId}
                                style={{
                                    padding: '0.85rem', borderRadius: '10px',
                                    background: encumbranceReason.trim() ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
                                    color: encumbranceReason.trim() ? '#f87171' : '#6b7280',
                                    fontWeight: 700, fontSize: '0.88rem', cursor: encumbranceReason.trim() ? 'pointer' : 'not-allowed',
                                    border: `1px solid ${encumbranceReason.trim() ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {actionLoading === encumbranceModal?.propId
                                    ? <><Loader2 size={16} className="animate-spin" /> Setting Encumbrance...</>
                                    : <><ShieldAlert size={16} /> Confirm Encumbrance</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Force Transfer (Reverse Sale) Modal ── */}
            {forceTransferModal && (
                <div onClick={() => setForceTransferModal(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        width: '100%', maxWidth: '460px',
                        background: 'rgba(15,10,25,0.97)',
                        border: '1px solid rgba(168,85,247,0.3)',
                        borderTop: '3px solid #a855f7',
                        borderRadius: '16px', padding: '2rem', position: 'relative',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                    }}>
                        <button onClick={() => setForceTransferModal(null)} style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', width: '30px', height: '30px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#9ca3af',
                        }}><XCircle size={14} /></button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCcw size={18} style={{ color: '#c084fc' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>Reverse Transfer</h3>
                                <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0 }}>Forcefully transfer property ownership</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                                    New Owner Wallet <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="0x..."
                                    value={forceNewOwner}
                                    onChange={e => setForceNewOwner(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.85rem', background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(168,85,247,0.25)', borderRadius: '8px',
                                        color: 'white', fontFamily: 'monospace', fontSize: '0.88rem',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                                    Reason <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="e.g. Fraudulent transaction reversal per High Court Order"
                                    value={forceReason}
                                    onChange={e => setForceReason(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.85rem', background: 'rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(168,85,247,0.25)', borderRadius: '8px',
                                        color: 'white', fontFamily: 'inherit', fontSize: '0.88rem',
                                        resize: 'vertical', outline: 'none', lineHeight: 1.5,
                                    }}
                                />
                            </div>

                            {/* ── File Upload Zone ── */}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                                    Court Order Document <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <label htmlFor="force-doc-upload" style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.5rem', padding: '1.25rem',
                                    border: `2px dashed ${forceHash ? 'rgba(34,197,94,0.5)' : 'rgba(168,85,247,0.3)'}`,
                                    borderRadius: '10px', cursor: forceUploading ? 'wait' : 'pointer',
                                    background: forceHash ? 'rgba(34,197,94,0.04)' : 'rgba(168,85,247,0.04)',
                                    transition: 'all 0.2s',
                                }}>
                                    {forceUploading ? (
                                        <><Loader2 size={22} style={{ color: '#c084fc' }} className="animate-spin" />
                                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Uploading to IPFS...</span></>
                                    ) : forceHash ? (
                                        <><CheckCircle2 size={22} style={{ color: '#22c55e' }} />
                                        <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>Document uploaded </span>
                                        <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{forceFile?.name}</span></>
                                    ) : (
                                        <><UploadCloud size={22} style={{ color: '#c084fc' }} />
                                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Click to upload court order</span>
                                        <span style={{ fontSize: '0.65rem', color: '#4b5563' }}>PDF or JPG · max 10 MB</span></>
                                    )}
                                </label>
                                <input
                                    id="force-doc-upload"
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/jpg"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            setForceFile(f);
                                            uploadDoc(f, setForceUploading, setForceHash);
                                        }
                                    }}
                                />
                            </div>

                            <button
                                onClick={submitForceTransfer}
                                disabled={!forceNewOwner.trim() || !forceReason.trim() || !forceHash || actionLoading === forceTransferModal?.propId}
                                style={{
                                    padding: '0.85rem', borderRadius: '10px',
                                    background: (forceNewOwner.trim() && forceReason.trim() && forceHash) ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                                    color: (forceNewOwner.trim() && forceReason.trim() && forceHash) ? '#d8b4fe' : '#6b7280',
                                    fontWeight: 700, fontSize: '0.88rem', cursor: (forceNewOwner.trim() && forceReason.trim() && forceHash) ? 'pointer' : 'not-allowed',
                                    border: `1px solid ${(forceNewOwner.trim() && forceReason.trim() && forceHash) ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.05)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    transition: 'all 0.2s',
                                    marginTop: '0.5rem'
                                }}
                            >
                                {actionLoading === forceTransferModal?.propId
                                    ? <><Loader2 size={16} className="animate-spin" /> Processing Transfer...</>
                                    : <><RefreshCcw size={16} /> Execute Force Transfer</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Property History (Ledger) Modal ── */}
            {historyModal && (
                <div onClick={() => setHistoryModal(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        width: '100%', maxWidth: '650px', maxHeight: '85vh',
                        background: 'rgba(15,10,25,0.95)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px', display: 'flex', flexDirection: 'column', position: 'relative',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Clock size={18} style={{ color: '#fff' }} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Ledger History</h3>
                                    <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: 0 }}>Property {historyModal.propertyCode}</p>
                                </div>
                            </div>
                            <button onClick={() => setHistoryModal(null)} style={{
                                background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b7280'
                            }}><XCircle size={24} /></button>
                        </div>

                        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                            {historyLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', color: '#6b7280' }}>
                                    <Loader2 size={32} className="animate-spin" style={{ marginBottom: '1rem', color: '#60a5fa' }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Loading timeline...</span>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280', fontSize: '0.85rem' }}>
                                    No historical events found for this property.
                                </div>
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    {/* Timeline line */}
                                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '20px', width: '2px', background: 'rgba(255,255,255,0.05)' }}></div>
                                    
                                    {historyData.map((event, idx) => {
                                        // Colors based on event type
                                        let color = '#3b82f6';
                                        let bg = 'rgba(59,130,246,0.1)';
                                        let border = 'rgba(59,130,246,0.2)';
                                        let Icon = FileText;
                                        let title = "Unknown Event";

                                        if (event.eventType === 'SALE_COMPLETED') {
                                            color = '#22c55e'; bg = 'rgba(34,197,94,0.1)'; border = 'rgba(34,197,94,0.2)';
                                            Icon = CheckCircle2; title = "Property Transferred (Sale)";
                                        } else if (event.eventType === 'SALE_INITIATED') {
                                            color = '#3b82f6'; bg = 'rgba(59,130,246,0.1)'; border = 'rgba(59,130,246,0.2)';
                                            Icon = FileText; title = "Sale Initiated";
                                        } else if (event.eventType === 'COURT_FREEZE') {
                                            color = '#ef4444'; bg = 'rgba(239,68,68,0.1)'; border = 'rgba(239,68,68,0.3)';
                                            Icon = Ban; title = "Court Freeze Order Applied";
                                        } else if (event.eventType === 'COURT_REVERSAL') {
                                            color = '#eab308'; bg = 'rgba(234,179,8,0.1)'; border = 'rgba(234,179,8,0.3)';
                                            Icon = RefreshCcw; title = "Court Freeze Reversed";
                                        } else if (event.eventType === 'COURT_FORCE_TRANSFER') {
                                            color = '#a855f7'; bg = 'rgba(168,85,247,0.1)'; border = 'rgba(168,85,247,0.3)';
                                            Icon = ShieldAlert; title = "Judicial Force Transfer";
                                        }

                                        return (
                                            <div key={event.id} style={{ display: 'flex', gap: '1.5rem', marginBottom: idx === historyData.length - 1 ? 0 : '1.5rem', position: 'relative', zIndex: 1 }}>
                                                {/* Node */}
                                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#0a0a0a', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Icon size={18} style={{ color }} />
                                                </div>

                                                {/* Content Card */}
                                                <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: `1px solid ${border}`, padding: '1.25rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{title}</h4>
                                                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{new Date(event.timestamp).toLocaleString()}</span>
                                                    </div>

                                                    {/* Event Details */}
                                                    {event.eventType === 'SALE_COMPLETED' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Amount:</span>
                                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#22c55e' }}>₹{event.data.price?.toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px' }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>From</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: 'monospace' }}>{event.data.seller.substring(0,10)}...{event.data.seller.substring(event.data.seller.length-4)}</span>
                                                                </div>
                                                                <ArrowRight size={14} style={{ color: '#6b7280', margin: '0 0.5rem' }} />
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>To</span>
                                                                    <span style={{ fontSize: '0.75rem', color: '#e5e7eb', fontFamily: 'monospace' }}>{event.data.buyer.substring(0,10)}...{event.data.buyer.substring(event.data.buyer.length-4)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(event.eventType === 'COURT_FREEZE' || event.eventType === 'COURT_FORCE_TRANSFER') && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Status:</span>
                                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: event.data.isActive ? '#ef4444' : '#6b7280' }}>
                                                                    {event.data.isActive ? 'ACTIVE' : 'LIFTED'}
                                                                </span>
                                                            </div>
                                                            <div style={{ background: 'rgba(239,68,68,0.05)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
                                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.5 }}>
                                                                    <strong style={{ color: 'white' }}>Reason:</strong> {event.data.reason}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {event.eventType === 'COURT_REVERSAL' && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#d1d5db', lineHeight: 1.5 }}>
                                                                    <strong style={{ color: 'white' }}>Reason:</strong> {event.data.reason || 'No specific reason provided'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Freeze Modal ── */}
            {freezeModal && (
                <div onClick={() => setFreezeModal(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        width: '100%', maxWidth: '460px',
                        background: 'rgba(15,10,25,0.97)',
                        border: '1px solid rgba(59,130,246,0.3)',
                        borderTop: '3px solid #3b82f6',
                        borderRadius: '16px', padding: '2rem', position: 'relative',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                    }}>
                        <button onClick={() => setFreezeModal(null)} style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', width: '30px', height: '30px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#9ca3af',
                        }}><XCircle size={14} /></button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Ban size={18} style={{ color: '#60a5fa' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>Freeze Property</h3>
                                <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0 }}>Upload the court order PDF to generate the IPFS hash</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* ── File Upload Zone ── */}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                                    Court Order Document <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <label htmlFor="freeze-doc-upload" style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.5rem', padding: '1.25rem',
                                    border: `2px dashed ${freezeHash ? 'rgba(34,197,94,0.5)' : 'rgba(59,130,246,0.3)'}`,
                                    borderRadius: '10px', cursor: freezeUploading ? 'wait' : 'pointer',
                                    background: freezeHash ? 'rgba(34,197,94,0.04)' : 'rgba(59,130,246,0.04)',
                                    transition: 'all 0.2s',
                                }}>
                                    {freezeUploading ? (
                                        <><Loader2 size={22} style={{ color: '#60a5fa' }} className="animate-spin" />
                                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Uploading to IPFS...</span></>
                                    ) : freezeHash ? (
                                        <><CheckCircle2 size={22} style={{ color: '#22c55e' }} />
                                        <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>Document uploaded </span>
                                        <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{freezeFile?.name}</span></>
                                    ) : (
                                        <><UploadCloud size={22} style={{ color: '#60a5fa' }} />
                                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Click to upload court order</span>
                                        <span style={{ fontSize: '0.65rem', color: '#4b5563' }}>PDF or JPG · max 10 MB</span></>
                                    )}
                                </label>
                                <input
                                    id="freeze-doc-upload"
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/jpg"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setFreezeFile(f); setFreezeHash(''); uploadDoc(f, setFreezeUploading, setFreezeHash); }
                                    }}
                                />
                            </div>

                            {/* ── IPFS Hash (read-only, auto-filled) ── */}
                            {freezeHash && (
                                <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22c55e', marginBottom: '0.3rem' }}>IPFS Hash (auto-generated)</p>
                                    <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#86efac', wordBreak: 'break-all', margin: 0 }}>{freezeHash}</p>
                                </div>
                            )}

                            {/* ── Reason ── */}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.4rem' }}>
                                    Reason <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Judicial reason for freeze"
                                    value={freezeReason}
                                    onChange={e => setFreezeReason(e.target.value)}
                                    className="input-premium"
                                    style={{ width: '100%', fontSize: '0.82rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setFreezeModal(null)} style={{
                                padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 600,
                                background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                            }}>Cancel</button>
                            <button onClick={handleFreeze} disabled={!freezeHash || freezeUploading} style={{
                                padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 700,
                                background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(37,99,235,0.15))',
                                color: '#60a5fa', border: '1px solid rgba(59,130,246,0.35)', cursor: (!freezeHash || freezeUploading) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 5,
                                opacity: (!freezeHash || freezeUploading) ? 0.45 : 1,
                            }}><Ban size={13} /> Confirm Freeze</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reverse Freeze Modal ── */}
            {reverseModal && (
                <div onClick={() => setReverseModal(null)} style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
                }}>
                    <div onClick={e => e.stopPropagation()} style={{
                        width: '100%', maxWidth: '460px',
                        background: 'rgba(15,10,25,0.97)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderTop: '3px solid #22c55e',
                        borderRadius: '16px', padding: '2rem', position: 'relative',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
                    }}>
                        <button onClick={() => setReverseModal(null)} style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', width: '30px', height: '30px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', color: '#9ca3af',
                        }}><XCircle size={14} /></button>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCcw size={18} style={{ color: '#22c55e' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', margin: 0 }}>Reverse Court Freeze</h3>
                                <p style={{ fontSize: '0.72rem', color: '#6b7280', margin: 0 }}>Upload the reversal court order PDF to generate the IPFS hash</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* ── File Upload Zone ── */}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.5rem' }}>
                                    Reversal Court Order Document <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <label htmlFor="reverse-doc-upload" style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    gap: '0.5rem', padding: '1.25rem',
                                    border: `2px dashed ${reverseHash ? 'rgba(34,197,94,0.5)' : 'rgba(34,197,94,0.25)'}`,
                                    borderRadius: '10px', cursor: reverseUploading ? 'wait' : 'pointer',
                                    background: reverseHash ? 'rgba(34,197,94,0.06)' : 'rgba(34,197,94,0.03)',
                                    transition: 'all 0.2s',
                                }}>
                                    {reverseUploading ? (
                                        <><Loader2 size={22} style={{ color: '#22c55e' }} className="animate-spin" />
                                        <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>Uploading to IPFS...</span></>
                                    ) : reverseHash ? (
                                        <><CheckCircle2 size={22} style={{ color: '#22c55e' }} />
                                        <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>Document uploaded </span>
                                        <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>{reverseFile?.name}</span></>
                                    ) : (
                                        <><UploadCloud size={22} style={{ color: '#22c55e' }} />
                                        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Click to upload reversal court order</span>
                                        <span style={{ fontSize: '0.65rem', color: '#4b5563' }}>PDF or JPG · max 10 MB</span></>
                                    )}
                                </label>
                                <input
                                    id="reverse-doc-upload"
                                    type="file"
                                    accept="application/pdf,image/jpeg,image/jpg"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const f = e.target.files?.[0];
                                        if (f) { setReverseFile(f); setReverseHash(''); uploadDoc(f, setReverseUploading, setReverseHash); }
                                    }}
                                />
                            </div>

                            {/* ── IPFS Hash (read-only, auto-filled) ── */}
                            {reverseHash && (
                                <div style={{ padding: '0.65rem 0.85rem', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22c55e', marginBottom: '0.3rem' }}>IPFS Hash (auto-generated)</p>
                                    <p style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#86efac', wordBreak: 'break-all', margin: 0 }}>{reverseHash}</p>
                                </div>
                            )}

                            {/* ── Reason ── */}
                            <div>
                                <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', display: 'block', marginBottom: '0.4rem' }}>
                                    Reason <span style={{ color: '#6b7280', fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="Reason for lifting the freeze"
                                    value={reverseReason}
                                    onChange={e => setReverseReason(e.target.value)}
                                    className="input-premium"
                                    style={{ width: '100%', fontSize: '0.82rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setReverseModal(null)} style={{
                                padding: '0.5rem 1rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 600,
                                background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                            }}>Cancel</button>
                            <button onClick={handleReverseFreeze} disabled={!reverseHash || reverseUploading} style={{
                                padding: '0.5rem 1.25rem', borderRadius: '0.5rem', fontSize: '0.78rem', fontWeight: 700,
                                background: 'linear-gradient(135deg,rgba(34,197,94,0.15),rgba(21,128,61,0.12))',
                                color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)',
                                cursor: (!reverseHash || reverseUploading) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 5,
                                opacity: (!reverseHash || reverseUploading) ? 0.45 : 1,
                            }}><RefreshCcw size={13} /> Confirm Reversal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DetailField = ({ label, value, mono = false, isLink = false, linkHref = '' }) => (
    <div>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 3 }}>{label}</p>
        {isLink && value !== 'None' && value !== 'Not minted' ? (
            <a href={linkHref} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', fontWeight: 500, color: '#60a5fa', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all', textDecoration: 'underline' }}>{value}</a>
        ) : (
            <p style={{ fontSize: '0.8rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</p>
        )}
    </div>
);

export default PropertyInvestigation;
