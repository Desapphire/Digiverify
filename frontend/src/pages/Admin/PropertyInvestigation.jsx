import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { TopNavbar } from '../../components/TopNavbar';
import {
    ShieldAlert, AlertTriangle, Search, Ban, Loader2,
    Building2, MapPin, Wallet, ChevronDown,
    ChevronUp, CheckCircle2, UploadCloud, FileText,
    XCircle, RefreshCcw, Clock, ArrowRight, ExternalLink
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
    const [freezeModal, setFreezeModal] = useState(null);
    const [freezeReason, setFreezeReason] = useState('');
    const [freezeHash, setFreezeHash] = useState('');
    const [freezeFile, setFreezeFile] = useState(null);
    const [freezeUploading, setFreezeUploading] = useState(false);

    // ── Encumbrance modal state ───────────────────────────
    const [encumbranceModal, setEncumbranceModal] = useState(null);
    const [encumbranceReason, setEncumbranceReason] = useState('');

    // ── Force Transfer (Reverse Sale) modal state ─────────
    const [forceTransferModal, setForceTransferModal] = useState(null);
    const [forceNewOwner, setForceNewOwner] = useState('');
    const [forceReason, setForceReason] = useState('');
    const [forceHash, setForceHash] = useState('');
    const [forceFile, setForceFile] = useState(null);
    const [forceUploading, setForceUploading] = useState(false);

    // ── Reverse-freeze modal state ────────────────────────
    const [reverseModal, setReverseModal] = useState(null);
    const [reverseHash, setReverseHash] = useState('');
    const [reverseReason, setReverseReason] = useState('');
    const [reverseFile, setReverseFile] = useState(null);
    const [reverseUploading, setReverseUploading] = useState(false);

    // ── Ledger History modal state ────────────────────────
    const [historyModal, setHistoryModal] = useState(null);
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
        e?.preventDefault();
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
            handleSearch();
        } catch (err) {
            alert(err.response?.data?.message || 'Freeze failed');
        } finally {
            setActionLoading(null);
        }
    };

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
            handleSearch();
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
            handleSearch();
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
            handleSearch();
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
            handleSearch();
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
            case 'active': return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' };
            case 'frozen': return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' };
            case 'pending': return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' };
            default: return { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', text: '#94A3B8' };
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            <TopNavbar 
                title="Property Investigation & Dispute Management" 
                subtitle="Judicial intervention tools — freeze parcels, set legal encumbrances, or execute court-ordered title reversals"
                showLogo={false}
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Warning */}
                <div style={{
                    padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.5rem',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                }}>
                    <ShieldAlert size={20} style={{ color: '#EF4444', flexShrink: 0 }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 500, color: '#FCA5A5', margin: 0 }}>
                        <strong>JUDICIAL CLEARANCE:</strong> Investigation actions directly modify on-chain smart contract transfer state. Freezing a property suspends all transfer executions until lifted.
                    </p>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="digi-card p-4 mb-6" style={{ background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, position: 'relative', minWidth: '280px' }}>
                            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                            <input
                                type="text"
                                placeholder="Search by property code, survey number, district, owner wallet..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="input-premium"
                                style={{ paddingLeft: 40, fontSize: '0.875rem', width: '100%' }}
                            />
                        </div>
                        <button type="submit" disabled={loading} className="btn-cyan-glow" style={{ padding: '0.65rem 1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#DC2626' }}>
                            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            Investigate Parcel
                        </button>
                    </div>
                </form>

                {/* Results */}
                {loading && (
                    <div className="digi-card p-12 flex items-center justify-center">
                        <Loader2 size={36} className="animate-spin" style={{ color: '#EF4444' }} />
                    </div>
                )}

                {searched && !loading && properties.length === 0 && (
                    <div className="digi-card p-12 flex flex-col items-center justify-center text-center">
                        <Building2 size={48} style={{ marginBottom: '1rem', color: '#64748B' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No properties match the search query.</p>
                    </div>
                )}

                {properties.length > 0 && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>
                        {properties.length} propert{properties.length !== 1 ? 'ies' : 'y'} found in registry
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {properties.map(p => {
                        const sc = statusStyle(p.status);
                        const isExpanded = expandedProp === p.id;
                        const isActing = actionLoading === p.id;
                        const ownerInfo = walletData[p.ownerWallet];

                        return (
                            <div key={p.id} className="digi-card" style={{ padding: 0, overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                                {/* Row */}
                                <div onClick={() => expandProp(p.id, p.ownerWallet)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', cursor: 'pointer', flexWrap: 'wrap', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '10px',
                                            background: p.status === 'frozen' ? 'rgba(239,68,68,0.12)' : 'rgba(2,132,199,0.12)',
                                            border: `1px solid ${p.status === 'frozen' ? 'rgba(239,68,68,0.3)' : 'rgba(2,132,199,0.3)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: p.status === 'frozen' ? '#EF4444' : '#38BDF8', flexShrink: 0,
                                        }}>
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.95rem', margin: 0 }}>
                                                {p.propertyCode || 'No Code'}
                                                <span style={{ fontWeight: 400, color: '#64748B', marginLeft: 8, fontSize: '0.825rem' }}>
                                                    Survey: {p.surveyNumber || '—'}
                                                </span>
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                                    <MapPin size={12} /> {p.district || '—'}, {p.state || '—'}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: 'JetBrains Mono' }}>
                                                    <Wallet size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />{shortenWallet(p.ownerWallet)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                            padding: '0.25rem 0.65rem', borderRadius: '6px',
                                            background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                        }}>
                                            {p.status}
                                        </span>
                                        {p.encumbranceStatus && (
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem',
                                                borderRadius: '6px', background: 'rgba(245,158,11,0.12)',
                                                border: '1px solid rgba(245,158,11,0.3)', color: '#F59E0B',
                                            }}>
                                                ENCUMBERED
                                            </span>
                                        )}
                                        {isExpanded ? <ChevronUp size={18} style={{ color: '#64748B' }} /> : <ChevronDown size={18} style={{ color: '#64748B' }} />}
                                    </div>
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1px solid #1E293B', padding: '1.25rem 1.5rem', background: '#0B0F19' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                            {/* Property Details */}
                                            <div>
                                                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: '0.75rem' }}>Cadastral Record</h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                                    <DetailField label="Parcel ID" value={p.id} mono />
                                                    <DetailField label="Property Code" value={p.propertyCode || '—'} />
                                                    <DetailField label="Survey Number" value={p.surveyNumber || '—'} />
                                                    <DetailField label="District / State" value={`${p.district || '—'}, ${p.state || '—'}`} />
                                                    <DetailField label="Extent" value={p.areaSqft ? `${Number(p.areaSqft).toLocaleString()} sqft` : '—'} />
                                                    <DetailField label="Owner Wallet" value={p.ownerWallet || '—'} mono />
                                                    <DetailField label="NFT Token" value={p.nftTokenId ? `#${p.nftTokenId}` : 'Not minted'} mono />
                                                    <DetailField label="Deed Hash" value={p.documentHash || 'None'} mono />
                                                    <DetailField label="Encumbrance Note" value={p.encumbranceStatus ? `YES${p.encumbranceReason ? ` (${p.encumbranceReason})` : ''}` : 'CLEAR'} />
                                                    <DetailField label="Registration Date" value={p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'} />
                                                </div>
                                            </div>

                                            {/* Owner Info */}
                                            <div>
                                                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', marginBottom: '0.75rem' }}>Registered Owner Profile</h4>
                                                {ownerInfo?.user ? (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                                        <DetailField label="Citizen Name" value={ownerInfo.user.name || '—'} />
                                                        <DetailField label="Email Address" value={ownerInfo.user.email || '—'} />
                                                        <DetailField label="KYC Status" value={ownerInfo.user.kycStatus || '—'} />
                                                        <DetailField label="Clearance" value={ownerInfo.user.role?.toUpperCase() || '—'} />
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                                                        {ownerInfo === undefined ? 'Loading owner credentials...' : 'No linked citizen profile found for this wallet.'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ borderTop: '1px solid #1E293B', paddingTop: '1.25rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            {p.status !== 'frozen' && (
                                                <button onClick={() => openFreezeModal(p.id)} disabled={isActing} className="btn-cyan-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {isActing ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Freeze Property
                                                </button>
                                            )}
                                            {p.status === 'frozen' && (
                                                <button onClick={() => openReverseModal(p.id, p.freezeOrderId || p.id)} disabled={isActing} className="btn-cyan-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    {isActing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />} Lift Freeze Order
                                                </button>
                                            )}
                                            {!p.encumbranceStatus ? (
                                                <button onClick={() => handleSetEncumbrance(p.id)} disabled={isActing} className="btn-cyan-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <AlertTriangle size={13} /> Set Encumbrance
                                                </button>
                                            ) : (
                                                <button onClick={() => handleClearEncumbrance(p.id)} disabled={isActing} className="btn-cyan-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#10B981', borderColor: 'rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <CheckCircle2 size={13} /> Clear Encumbrance
                                                </button>
                                            )}
                                            <button onClick={() => {
                                                setForceNewOwner('');
                                                setForceReason('');
                                                setForceHash('');
                                                setForceFile(null);
                                                setForceTransferModal({ propId: p.id });
                                            }} disabled={isActing} className="btn-cyan-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <RefreshCcw size={13} /> Force Transfer / Title Reversal
                                            </button>
                                            <button onClick={() => fetchPropertyHistory(p.id, p.propertyCode)} className="btn-dark-pill" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', marginLeft: 'auto' }}>
                                                <Clock size={13} /> Detailed History
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Encumbrance Reason Modal */}
                {encumbranceModal && (
                    <div onClick={() => setEncumbranceModal(null)} style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
                    }}>
                        <div onClick={e => e.stopPropagation()} className="digi-card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                                <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Set Legal Encumbrance</h3>
                            </div>
                            <textarea
                                rows={3}
                                placeholder="e.g. Bank lien registered by HDFC Bank — Loan A/C #XXXXXX"
                                value={encumbranceReason}
                                onChange={e => setEncumbranceReason(e.target.value)}
                                className="input-premium"
                                style={{ width: '100%', marginBottom: '1.25rem', fontSize: '0.85rem' }}
                            />
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => setEncumbranceModal(null)} className="btn-cyan-outline" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>Cancel</button>
                                <button onClick={submitEncumbrance} className="btn-cyan-glow" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', background: '#D97706' }}>Confirm Encumbrance</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Force Transfer Modal */}
                {forceTransferModal && (
                    <div onClick={() => setForceTransferModal(null)} style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
                    }}>
                        <div onClick={e => e.stopPropagation()} className="digi-card" style={{ width: '100%', maxWidth: '460px', padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>Judicial Force Transfer</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>New Owner Wallet (0x...)</label>
                                    <input type="text" placeholder="0x..." value={forceNewOwner} onChange={e => setForceNewOwner(e.target.value)} className="input-premium font-mono" style={{ width: '100%', fontSize: '0.85rem' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Reason</label>
                                    <textarea rows={2} placeholder="Court order rationale..." value={forceReason} onChange={e => setForceReason(e.target.value)} className="input-premium" style={{ width: '100%', fontSize: '0.85rem' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Court Order Document</label>
                                    <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) { setForceFile(f); uploadDoc(f, setForceUploading, setForceHash); } }} />
                                    {forceHash && <p style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.3rem' }}>IPFS: {forceHash}</p>}
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button onClick={() => setForceTransferModal(null)} className="btn-cyan-outline" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>Cancel</button>
                                    <button onClick={submitForceTransfer} disabled={!forceNewOwner || !forceHash || forceUploading} className="btn-cyan-glow" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', background: '#DC2626' }}>Execute Transfer</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Freeze Modal */}
                {freezeModal && (
                    <div onClick={() => setFreezeModal(null)} style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
                    }}>
                        <div onClick={e => e.stopPropagation()} className="digi-card" style={{ width: '100%', maxWidth: '460px', padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '1.25rem' }}>Freeze Property Title</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Court Order Document</label>
                                    <input type="file" onChange={e => { const f = e.target.files?.[0]; if (f) { setFreezeFile(f); uploadDoc(f, setFreezeUploading, setFreezeHash); } }} />
                                    {freezeHash && <p style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.3rem' }}>IPFS: {freezeHash}</p>}
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Reason</label>
                                    <input type="text" placeholder="Judicial order reason..." value={freezeReason} onChange={e => setFreezeReason(e.target.value)} className="input-premium" style={{ width: '100%', fontSize: '0.85rem' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button onClick={() => setFreezeModal(null)} className="btn-cyan-outline" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}>Cancel</button>
                                    <button onClick={handleFreeze} disabled={!freezeHash || freezeUploading} className="btn-cyan-glow" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', background: '#DC2626' }}>Confirm Freeze</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* History Modal */}
                {historyModal && (
                    <div onClick={() => setHistoryModal(null)} style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
                    }}>
                        <div onClick={e => e.stopPropagation()} className="digi-card" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #1E293B', paddingBottom: '0.75rem' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Parcel History ({historyModal.propertyCode})</h3>
                                <button onClick={() => setHistoryModal(null)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><XCircle size={20} /></button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {historyLoading ? (
                                    <div style={{ padding: '2rem', textAlign: 'center' }}><Loader2 size={24} className="animate-spin" style={{ color: '#0284C7' }} /></div>
                                ) : historyData.length === 0 ? (
                                    <p style={{ color: '#64748B', textAlign: 'center', padding: '2rem 0' }}>No historical events recorded for this parcel.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {historyData.map((ev) => (
                                            <div key={ev.id} style={{ padding: '0.85rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38BDF8' }}>{ev.eventType}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>{new Date(ev.timestamp).toLocaleString()}</span>
                                                </div>
                                                <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0 }}>{JSON.stringify(ev.data)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
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

export default PropertyInvestigation;
