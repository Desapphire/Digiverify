import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { TopNavbar } from '../../components/TopNavbar';
import {
    MapPin, CheckCircle2, Shield, AlertTriangle, ShieldAlert,
    Lock, Eye, ArrowUpRight, PlusCircle, Search, Loader2,
    ExternalLink, FileText, Upload, DollarSign, XCircle, Check,
    Compass, RefreshCcw, Landmark, Layers
} from 'lucide-react';
import './PropertyPages.css';
import { CONTRACT_ADDRESSES } from '../../config/contracts';

const MyProperties = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account } = useWeb3();

    const [properties, setProperties] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal state for Uploading Supporting Document to IPFS
    const [uploadModal, setUploadModal] = useState({ isOpen: false, property: null });
    const [uploadDocType, setUploadDocType] = useState('Survey Report');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploadError, setUploadError] = useState('');

    // Modal state for Quick Initiate Sale
    const [saleModal, setSaleModal] = useState({ isOpen: false, property: null });
    const [saleForm, setSaleForm] = useState({ buyerWallet: '', price: '' });
    const [saleLoading, setSaleLoading] = useState(false);
    const [saleMsg, setSaleMsg] = useState({ type: '', text: '' });

    const fetchPropertiesAndSales = async () => {
        try {
            setLoading(true);
            const [propsRes, salesRes] = await Promise.allSettled([
                propertyService.getMyProperties(),
                saleService.getMySales()
            ]);
            if (propsRes.status === 'fulfilled' && propsRes.value.data?.data) {
                setProperties(propsRes.value.data.data);
            }
            if (salesRes.status === 'fulfilled' && salesRes.value.data?.data) {
                setSales(salesRes.value.data.data);
            }
        } catch (error) {
            console.error('Failed to load properties', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchPropertiesAndSales();
    }, [user]);

    const statusConfig = {
        active: { label: 'VERIFIED ON-CHAIN', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', icon: CheckCircle2 },
        verified: { label: 'VERIFIED ON-CHAIN', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', icon: CheckCircle2 },
        pending: { label: 'PENDING SURVEYOR REVIEW', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', icon: AlertTriangle },
        frozen: { label: 'COURT FREEZE ACTIVE', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', icon: Lock },
        under_dispute: { label: 'UNDER LEGAL DISPUTE', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', icon: AlertTriangle },
        pending_transfer: { label: 'TRANSFER IN ESCROW', color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', icon: ArrowUpRight },
        rejected: { label: 'REJECTED BY REGISTRAR', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', icon: ShieldAlert },
    };

    const getStatusConfig = (status) => statusConfig[status] || statusConfig.pending;

    // Filter and search
    const filtered = properties.filter(p => {
        if (filter !== 'all' && p.status !== filter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (
                p.surveyNumber?.toLowerCase().includes(q) ||
                p.propertyCode?.toLowerCase().includes(q) ||
                p.district?.toLowerCase().includes(q) ||
                p.state?.toLowerCase().includes(q) ||
                p.addressLine?.toLowerCase().includes(q) ||
                p.documentHash?.toLowerCase().includes(q) ||
                p.id?.toString().includes(q)
            );
        }
        return true;
    });

    const statusCounts = {
        all: properties.length,
        active: properties.filter(p => p.status === 'active' || p.status === 'verified').length,
        pending: properties.filter(p => p.status === 'pending').length,
        frozen: properties.filter(p => p.status === 'frozen').length,
        under_dispute: properties.filter(p => p.status === 'under_dispute').length,
    };

    // Document upload handler
    const handleUploadDocument = async (e) => {
        e.preventDefault();
        if (!selectedFile || !uploadModal.property) return;
        setUploadLoading(true);
        setUploadError('');
        setUploadSuccess('');
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('documentType', uploadDocType);
            const ipfsRes = await propertyService.uploadToIPFS(formData);
            const ipfsHash = ipfsRes.data?.data?.ipfsHash || ipfsRes.data?.ipfsHash;

            if (ipfsHash) {
                await propertyService.uploadDocument(uploadModal.property.id, ipfsHash);
            }
            setUploadSuccess('Document successfully pinned to IPFS and linked on-chain!');
            setTimeout(() => {
                setUploadModal({ isOpen: false, property: null });
                setSelectedFile(null);
                fetchPropertiesAndSales();
            }, 1400);
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Failed to upload document to IPFS.');
        } finally {
            setUploadLoading(false);
        }
    };

    // Quick initiate sale handler
    const handleInitiateSale = async (e) => {
        e.preventDefault();
        if (!saleModal.property) return;
        setSaleLoading(true);
        setSaleMsg({ type: '', text: '' });
        try {
            await saleService.initiateSale({
                propertyId: saleModal.property.id,
                buyerWallet: saleForm.buyerWallet,
                salePrice: Number(saleForm.price)
            });
            setSaleMsg({ type: 'success', text: 'Multi-sig sale agreement deployed on-chain!' });
            setSaleForm({ buyerWallet: '', price: '' });
            setTimeout(() => {
                setSaleModal({ isOpen: false, property: null });
                navigate('/sale');
            }, 1200);
        } catch (err) {
            setSaleMsg({ type: 'error', text: err.response?.data?.message || 'Failed to initiate sale' });
        } finally {
            setSaleLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#94A3B8', fontSize: '0.88rem' }}>Loading Cadastral Portfolio...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            {/* Standard Top Navbar */}
            <TopNavbar 
                title="My Properties" 
                subtitle={`Portfolio of ${properties.length} registered on-chain cadastral land parcels`}
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
                customRight={
                    <button 
                        onClick={() => navigate('/register-property')}
                        className="btn-cyan-glow"
                        style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }}
                    >
                        <PlusCircle size={16} /> Register New Property
                    </button>
                }
            />

            <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
                
                {/* ─── Search & Status Filters Bar ─── */}
                <div 
                    style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        gap: '1rem', 
                        flexWrap: 'wrap', 
                        marginBottom: '2rem',
                        background: '#0F172A',
                        border: '1px solid #1E293B',
                        padding: '1rem 1.25rem',
                        borderRadius: '12px'
                    }}
                >
                    {/* Search Input */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '280px', maxWidth: '420px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            placeholder="Search by Survey #, Code, District, or CID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium"
                            style={{ paddingLeft: '2.5rem', fontSize: '0.85rem', width: '100%' }}
                        />
                    </div>

                    {/* Filter Pills */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {Object.entries(statusCounts).map(([key, count]) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                style={{
                                    padding: '0.45rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.78rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    background: filter === key ? '#0284C7' : '#1E293B',
                                    border: filter === key ? '1px solid #0284C7' : '1px solid #334155',
                                    color: filter === key ? '#FFFFFF' : '#94A3B8'
                                }}
                            >
                                {key === 'all' ? 'All Parcels' : key.replace('_', ' ').toUpperCase()} ({count})
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Properties Grid ─── */}
                {filtered.length === 0 ? (
                    <div 
                        className="digi-card p-12 text-center" 
                        style={{ 
                            background: '#0F172A',
                            border: '1px dashed #334155',
                            borderRadius: '12px',
                            padding: '4rem 2rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}
                    >
                        <Search size={44} style={{ color: '#64748B', marginBottom: '1.25rem' }} />
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                            {properties.length === 0 ? 'No Land Parcels Registered Yet' : 'No properties matched your search'}
                        </h3>
                        <p style={{ color: '#94A3B8', fontSize: '0.88rem', maxWidth: '460px', marginBottom: '1.75rem' }}>
                            {properties.length === 0 
                                ? 'Register your property to mint a cryptographic LandNFT deed on Avalanche Fuji and enable instant multi-sig transfers.'
                                : 'Try searching by a different survey number, district, or IPFS hash.'}
                        </p>
                        {properties.length === 0 && (
                            <button 
                                onClick={() => navigate('/register-property')}
                                className="btn-cyan-glow"
                                style={{ padding: '0.65rem 1.5rem', fontSize: '0.88rem' }}
                            >
                                <PlusCircle size={16} /> Register First Property
                            </button>
                        )}
                    </div>
                ) : (
                    <div 
                        style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', 
                            gap: '1.5rem' 
                        }}
                    >
                        {filtered.map((prop) => {
                            const sc = getStatusConfig(prop.status);
                            const StatusIcon = sc.icon;

                            // Check if this property is actively in a sale
                            const activeSale = sales.find(s => s.propertyId === prop.id && s.status !== 'completed' && s.status !== 'cancelled');
                            const acreage = prop.areaSqft ? `${(prop.areaSqft / 43560).toFixed(3)} acres` : null;

                            return (
                                <div
                                    key={prop.id}
                                    className="digi-card"
                                    style={{
                                        background: '#0F172A',
                                        border: '1px solid #1E293B',
                                        borderRadius: '12px',
                                        padding: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        transition: 'border-color 0.15s ease',
                                        position: 'relative'
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = '#38BDF8';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = '#1E293B';
                                    }}
                                >
                                    <div>
                                        {/* ── Top Header: Survey # & Status ── */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                            <div>
                                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                                    {prop.surveyNumber ? `Survey #${prop.surveyNumber}` : `Parcel #${prop.id.slice(0, 8)}`}
                                                </h3>
                                                <p style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', margin: 0, marginTop: '2px', fontWeight: 600 }}>
                                                    {prop.propertyCode || `DV-PARCEL-${prop.id.slice(0, 6)}`}
                                                </p>
                                            </div>

                                            {/* Status Badge */}
                                            <div 
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.35rem',
                                                    padding: '0.3rem 0.65rem',
                                                    borderRadius: '6px',
                                                    fontSize: '0.68rem',
                                                    fontWeight: 700,
                                                    background: sc.bg,
                                                    border: `1px solid ${sc.border}`,
                                                    color: sc.color
                                                }}
                                            >
                                                <StatusIcon size={12} />
                                                <span>{sc.label}</span>
                                            </div>
                                        </div>

                                        {/* ── Active Sale Callout (if listed) ── */}
                                        {activeSale && (
                                            <div 
                                                style={{
                                                    marginBottom: '1rem',
                                                    padding: '0.6rem 0.85rem',
                                                    background: 'rgba(245, 158, 11, 0.1)',
                                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#FCD34D', fontSize: '0.75rem', fontWeight: 600 }}>
                                                    <DollarSign size={14} /> Multi-Sig Sale in Progress
                                                </div>
                                                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F8FAFC' }}>
                                                    ₹{Number(activeSale.salePrice).toLocaleString('en-IN')}
                                                </span>
                                            </div>
                                        )}

                                        {/* ── Street Address & Location ── */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '1rem', color: '#94A3B8', fontSize: '0.82rem' }}>
                                            <MapPin size={15} style={{ color: '#0284C7', flexShrink: 0, marginTop: '2px' }} />
                                            <span>
                                                {prop.addressLine ? `${prop.addressLine}, ` : ''}
                                                <strong style={{ color: '#F8FAFC' }}>{prop.district}</strong>{prop.state ? `, ${prop.state}` : ''}
                                            </span>
                                        </div>

                                        {/* ── Grid Data: Area, Coordinates, Encumbrance, NFT ── */}
                                        <div 
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr',
                                                gap: '0.75rem',
                                                padding: '0.85rem',
                                                background: '#0B0F19',
                                                border: '1px solid #1E293B',
                                                borderRadius: '8px',
                                                marginBottom: '1rem'
                                            }}
                                        >
                                            <div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Parcel Area</span>
                                                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F8FAFC' }}>
                                                    {prop.areaSqft ? `${prop.areaSqft.toLocaleString()} sqft` : 'N/A'}
                                                </span>
                                                {acreage && (
                                                    <span style={{ fontSize: '0.68rem', color: '#94A3B8', display: 'block' }}>({acreage})</span>
                                                )}
                                            </div>

                                            <div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Encumbrance</span>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: !prop.encumbranceStatus ? '#10B981' : '#EF4444' }}>
                                                    {!prop.encumbranceStatus ? 'Clear Title' : 'Disputed'}
                                                </span>
                                            </div>

                                            <div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>GPS Coordinates</span>
                                                <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8' }}>
                                                    {prop.geoLat ? `${Number(prop.geoLat).toFixed(3)}°N, ${Number(prop.geoLng).toFixed(3)}°E` : '12.971°N, 77.594°E'}
                                                </span>
                                            </div>

                                            <div>
                                                <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>On-Chain NFT</span>
                                                <a 
                                                    href={`https://testnet.snowtrace.io/nft/${CONTRACT_ADDRESSES.LAND_NFT}/${prop.nftTokenId || '1'}`}
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#38BDF8', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontWeight: 600 }}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    Token #{prop.nftTokenId || '1'} <ExternalLink size={10} />
                                                </a>
                                            </div>
                                        </div>

                                        {/* ── Primary Title Deed IPFS Link ── */}
                                        {prop.documentHash && (
                                            <div style={{ marginBottom: '1.25rem' }}>
                                                <a 
                                                    href={`https://gateway.pinata.cloud/ipfs/${prop.documentHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '0.5rem 0.75rem',
                                                        background: '#0B0F19',
                                                        border: '1px solid #1E293B',
                                                        borderRadius: '6px',
                                                        color: '#38BDF8',
                                                        fontSize: '0.75rem',
                                                        textDecoration: 'none',
                                                        fontFamily: 'JetBrains Mono'
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                        <FileText size={13} /> IPFS: {prop.documentHash.slice(0, 18)}...
                                                    </span>
                                                    <ExternalLink size={12} />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Actions Row ── */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid #1E293B', paddingTop: '1rem' }}>
                                        <button
                                            onClick={() => navigate(`/properties/${prop.id}`)}
                                            className="btn-dark-pill"
                                            style={{ flex: 1, padding: '0.5rem', fontSize: '0.78rem', justifyContent: 'center' }}
                                        >
                                            <Eye size={14} /> Cadastral View
                                        </button>

                                        <button
                                            onClick={() => setUploadModal({ isOpen: true, property: prop })}
                                            className="btn-dark-pill"
                                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.78rem', justifyContent: 'center' }}
                                            title="Attach IPFS Document"
                                        >
                                            <Upload size={14} /> Attach Doc
                                        </button>

                                        {(prop.status === 'active' || prop.status === 'verified') && (
                                            <button
                                                onClick={() => setSaleModal({ isOpen: true, property: prop })}
                                                className="btn-cyan-glow"
                                                style={{ padding: '0.5rem 0.9rem', fontSize: '0.78rem', borderRadius: '8px' }}
                                            >
                                                <DollarSign size={14} /> Sell
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ════════ IPFS Document Upload Modal ════════ */}
            {uploadModal.isOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '1rem'
                    }}
                >
                    <div className="digi-card p-6" style={{ maxWidth: '440px', width: '100%', background: '#0F172A', border: '1px solid #1E293B' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Attach Supporting IPFS Doc</h3>
                                <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0, marginTop: '2px' }}>
                                    Survey #{uploadModal.property?.surveyNumber}
                                </p>
                            </div>
                            <button onClick={() => setUploadModal({ isOpen: false, property: null })} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Document Type</label>
                                <select 
                                    className="input-premium"
                                    value={uploadDocType}
                                    onChange={e => setUploadDocType(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="Survey Report">Survey Report / Cadastral Map</option>
                                    <option value="Encumbrance Certificate">Encumbrance Certificate (EC)</option>
                                    <option value="Tax Receipt">Latest Property Tax Receipt</option>
                                    <option value="Court Order">Court Clearance / NOC</option>
                                    <option value="Title Deed">Secondary Title Deed / Khata</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Select PDF or Image File</label>
                                <input 
                                    type="file" 
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    onChange={e => setSelectedFile(e.target.files[0])}
                                    required
                                    style={{ fontSize: '0.8rem', color: '#94A3B8' }}
                                />
                            </div>

                            {uploadError && <p style={{ fontSize: '0.8rem', color: '#EF4444', margin: 0 }}>{uploadError}</p>}
                            {uploadSuccess && <p style={{ fontSize: '0.8rem', color: '#10B981', margin: 0 }}>{uploadSuccess}</p>}

                            <button 
                                type="submit" 
                                disabled={uploadLoading || !selectedFile} 
                                className="btn-cyan-glow"
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            >
                                {uploadLoading ? <Loader2 size={16} className="animate-spin" /> : 'Pin to IPFS & Link to Property'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════ Quick Initiate Sale Modal ════════ */}
            {saleModal.isOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100,
                        padding: '1rem'
                    }}
                >
                    <div className="digi-card p-6" style={{ maxWidth: '440px', width: '100%', background: '#0F172A', border: '1px solid #1E293B' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Initiate Multi-Sig Sale</h3>
                                <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0, marginTop: '2px' }}>
                                    Survey #{saleModal.property?.surveyNumber} • {saleModal.property?.areaSqft?.toLocaleString()} sqft
                                </p>
                            </div>
                            <button onClick={() => setSaleModal({ isOpen: false, property: null })} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                <XCircle size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleInitiateSale} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Buyer Wallet Address</label>
                                <input 
                                    className="input-premium"
                                    type="text" 
                                    placeholder="0x..." 
                                    value={saleForm.buyerWallet} 
                                    onChange={e => setSaleForm({ ...saleForm, buyerWallet: e.target.value })} 
                                    required 
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Agreed Sale Price (₹)</label>
                                <input 
                                    className="input-premium"
                                    type="number" 
                                    placeholder="1500000" 
                                    value={saleForm.price} 
                                    onChange={e => setSaleForm({ ...saleForm, price: e.target.value })} 
                                    required 
                                />
                            </div>
                            {saleMsg.text && (
                                <p style={{ fontSize: '0.8rem', color: saleMsg.type === 'success' ? '#10B981' : '#EF4444', margin: 0 }}>
                                    {saleMsg.text}
                                </p>
                            )}
                            <button 
                                type="submit" 
                                disabled={saleLoading} 
                                className="btn-cyan-glow"
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            >
                                {saleLoading ? <Loader2 size={16} className="animate-spin" /> : 'Deploy Multi-Sig Sale Contract'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
export default MyProperties;
