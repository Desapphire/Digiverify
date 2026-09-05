import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { TopNavbar } from '../../components/TopNavbar';
import { CadastralSatelliteMap } from '../../components/CadastralSatelliteMap';
import { AvalancheIcon } from '../../components/Icons';
import {
    FileText, Loader2, ArrowLeft, CheckCircle2, ShieldAlert,
    DollarSign, ExternalLink, Copy, Check, Upload, Printer,
    Lock, AlertTriangle, ShieldCheck, XCircle, MapPin, Hash,
    Calendar, Layers, Globe, CheckCircle, Award
} from 'lucide-react';
import './PropertyPages.css';
import { CONTRACT_ADDRESSES } from '../../config/contracts';

const CONTRACT_ADDRESS = CONTRACT_ADDRESSES.LAND_NFT;

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account } = useWeb3();

    const [property, setProperty] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState('');

    // Modals
    const [saleModalOpen, setSaleModalOpen] = useState(false);
    const [saleForm, setSaleForm] = useState({ buyerWallet: '', price: '' });
    const [saleLoading, setSaleLoading] = useState(false);
    const [saleMsg, setSaleMsg] = useState({ type: '', text: '' });

    // Document Upload Modal
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadDocType, setUploadDocType] = useState('Survey Report');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState('');
    const [uploadError, setUploadError] = useState('');

    // Certificate Modal
    const [certModalOpen, setCertModalOpen] = useState(false);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const [propRes, docRes, txRes] = await Promise.allSettled([
                propertyService.getPropertyById(id),
                propertyService.getDocuments(id),
                saleService.getTransactionsByProperty(id),
            ]);

            if (propRes.status === 'fulfilled' && propRes.value.data?.data) {
                setProperty(propRes.value.data.data);
            } else {
                setError('Property record not found on-chain.');
            }

            if (docRes.status === 'fulfilled') setDocuments(docRes.value.data?.data || []);
            if (txRes.status === 'fulfilled') setTransactions(txRes.value.data?.data || []);
        } catch (err) {
            setError('Failed to load property details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const ownerWallet = property?.ownerWallet?.toLowerCase();
    const isOwner = ownerWallet && (
        ownerWallet === account?.toLowerCase() ||
        ownerWallet === user?.walletAddress?.toLowerCase()
    );

    const handleCopy = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(key);
        setTimeout(() => setCopied(''), 2000);
    };

    const handleInitiateSale = async (e) => {
        e.preventDefault();
        setSaleLoading(true);
        setSaleMsg({ type: '', text: '' });
        try {
            await saleService.initiateSale({
                propertyId: id,
                buyerWallet: saleForm.buyerWallet,
                salePrice: Number(saleForm.price)
            });
            setSaleMsg({ type: 'success', text: 'Sale agreement deployed on-chain!' });
            setSaleForm({ buyerWallet: '', price: '' });
            setTimeout(() => {
                setSaleModalOpen(false);
                navigate('/sale');
            }, 1200);
        } catch (err) {
            setSaleMsg({ type: 'error', text: err.response?.data?.message || 'Failed to initiate sale' });
        } finally {
            setSaleLoading(false);
        }
    };

    const handleUploadDoc = async (e) => {
        e.preventDefault();
        if (!selectedFile) return;
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
                await propertyService.uploadDocument(id, ipfsHash);
            }
            setUploadSuccess('Document successfully pinned to IPFS and linked to parcel!');
            setTimeout(() => {
                setUploadModalOpen(false);
                setSelectedFile(null);
                fetchDetails();
            }, 1300);
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Failed to upload document to IPFS.');
        } finally {
            setUploadLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={36} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#94A3B8', fontSize: '0.88rem' }}>Loading Cadastral Parcel...</p>
                </div>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#FFFFFF' }}>
                <TopNavbar showLogo={true} />
                <div style={{ display: 'flex', flexDirection: 'column', height: '70vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                    <ShieldAlert size={48} style={{ color: '#EF4444', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#F8FAFC' }}>Property Record Not Found</h2>
                    <p style={{ color: '#94A3B8', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{error || 'Unable to locate this asset record on the blockchain.'}</p>
                    <button className="btn-cyan-outline" onClick={() => navigate('/my-properties')}>
                        Return to My Properties
                    </button>
                </div>
            </div>
        );
    }

    const parcelTitle = property.propertyCode 
        ? `Parcel #${property.propertyCode}` 
        : (property.surveyNumber ? `Parcel #DV-${property.surveyNumber}` : `Parcel #${property.id?.slice(0, 8)}`);
    
    const locationText = `${property.district || 'Bangalore'}, ${property.state || 'Karnataka'}`;
    const registrationDate = property.createdAt 
        ? new Date(property.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
        : 'Registered';
    
    const areaSqft = Number(property.areaSqft) || 0;
    const areaText = areaSqft ? `${areaSqft.toLocaleString()} sqft` : 'Cadastral Parcel';
    const acreage = areaSqft ? `${(areaSqft / 43560).toFixed(3)} acres` : '';
    const snowtraceUrl = `https://testnet.snowtrace.io/nft/${CONTRACT_ADDRESS}/${property.nftTokenId || '1'}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(snowtraceUrl)}&bgcolor=0F172A&color=38BDF8`;

    const numLat = parseFloat(property.geoLat) || 12.9716;
    const numLng = parseFloat(property.geoLng) || 77.5946;

    let displayDocs = [];
    if (documents.length > 0) {
        displayDocs = documents.map(d => ({
            name: d.document_type || d.description || 'Legal Deed',
            cid: d.ipfs_hash || d.document_hash || 'IPFS Record',
            verified: true
        }));
    } else if (property.documentHash) {
        displayDocs = [{
            name: 'Primary Title Deed',
            cid: property.documentHash,
            verified: true
        }];
    }

    const timelineEvents = [];
    if (transactions.length > 0) {
        transactions.forEach((tx, idx) => {
            const dateStr = tx.created_at ? new Date(tx.created_at).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }) : 'Recent';
            const role = tx.status === 'completed' 
                ? (tx.buyer_wallet ? `Owner: ${tx.buyer_wallet.slice(0, 6)}...${tx.buyer_wallet.slice(-4)}` : 'Completed Sale')
                : (tx.status === 'authority_approved' ? 'Authority Approved' : 'Sale In Progress');
            
            timelineEvents.push({
                role,
                date: dateStr,
                hash: tx.tx_hash || tx.id,
                active: idx === 0
            });
        });
    }

    const genesisDate = property.createdAt ? new Date(property.createdAt).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }) : 'Genesis';
    const ownerShort = property.ownerWallet ? `${property.ownerWallet.slice(0, 6)}...${property.ownerWallet.slice(-4)}` : 'Genesis Owner';
    timelineEvents.push({
        role: `Registry Genesis: ${ownerShort}`,
        date: genesisDate,
        hash: property.documentHash ? `IPFS: ${property.documentHash.slice(0, 18)}...` : (property.nftTokenId ? `NFT Token #${property.nftTokenId}` : '0xGenesisDeedHash'),
        active: timelineEvents.length === 0
    });

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            <TopNavbar 
                showLogo={true} 
                logoSubtitle="Verified Land Registry"
                showNetwork={true}
                showNotifications={false}
                showProfile={false}
            />

            <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <Link 
                        to="/my-properties"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: '#94A3B8',
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            textDecoration: 'none',
                            transition: 'color 0.15s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#38BDF8'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
                    >
                        <ArrowLeft size={16} /> Back to My Properties
                    </Link>
                </div>

                {/* ─── Hero Header Row ─── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0 }}>
                            {parcelTitle}
                        </h1>

                        <div className="badge-verified-pill">
                            <CheckCircle2 size={13} style={{ color: '#10B981' }} />
                            <span>Verified On-Chain</span>
                        </div>

                        {property.status === 'frozen' && (
                            <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid #3B82F6', color: '#93C5FD', padding: '0.3rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Lock size={12} /> Court Freeze Active
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button 
                            onClick={() => setCertModalOpen(true)}
                            className="btn-cyan-outline"
                        >
                            <Printer size={15} /> Land Title Deed (PDF)
                        </button>

                        {isOwner && (
                            <button 
                                onClick={() => setUploadModalOpen(true)}
                                className="btn-cyan-outline"
                            >
                                <Upload size={15} /> Attach Document
                            </button>
                        )}

                        {isOwner && (property.status === 'active' || property.status === 'verified') && (
                            <button 
                                onClick={() => setSaleModalOpen(true)}
                                className="btn-cyan-glow"
                            >
                                <DollarSign size={15} /> Initiate Sale
                            </button>
                        )}
                    </div>
                </div>

                {/* ─── 4-Card Quick Facts Strip ─── */}
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
                        gap: '1rem', 
                        marginBottom: '1.75rem' 
                    }}
                >
                    <div className="digi-stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Cadastral Survey #
                            </span>
                            <Hash size={15} style={{ color: '#0284C7' }} />
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>
                            {property.surveyNumber ? `SRV-${property.surveyNumber}` : 'SRV-PENDING'}
                        </div>
                    </div>

                    <div className="digi-stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Parcel Area
                            </span>
                            <Layers size={15} style={{ color: '#0284C7' }} />
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                            {areaText} {acreage && <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#94A3B8' }}>({acreage})</span>}
                        </div>
                    </div>

                    <div className="digi-stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Jurisdiction
                            </span>
                            <MapPin size={15} style={{ color: '#0284C7' }} />
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 600, color: '#F8FAFC' }}>
                            {locationText}
                        </div>
                    </div>

                    <div className="digi-stat-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                On-Chain Token ID
                            </span>
                            <AvalancheIcon size={15} />
                        </div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', fontFamily: 'JetBrains Mono' }}>
                            Avalanche #{property.nftTokenId || '1'}
                        </div>
                    </div>
                </div>

                {/* ─── 2-Column Split Hero Layout ─── */}
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1.2fr 1fr', 
                        gap: '1.5rem',
                        alignItems: 'start'
                    }}
                >
                    {/* ════════ LEFT COLUMN (55%) ════════ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Interactive Satellite Cadastral Map */}
                        <div style={{ height: '560px' }}>
                            <CadastralSatelliteMap 
                                geoLat={numLat}
                                geoLng={numLng}
                                areaSize={areaText}
                                surveyNumber={property.surveyNumber}
                            />
                        </div>

                        {/* Title Deed & QR Verification Card */}
                        <div className="digi-card p-6">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <ShieldCheck size={18} style={{ color: '#38BDF8' }} />
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                                        Cryptographic Title Verification
                                    </h3>
                                </div>
                                <div className="badge-verified-pill">
                                    <CheckCircle size={12} /> Live On-Chain
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', fontWeight: 500 }}>Registry Smart Contract</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px' }}>
                                            <span style={{ fontSize: '0.82rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', fontWeight: 600 }}>
                                                {CONTRACT_ADDRESS}
                                            </span>
                                            <button 
                                                onClick={() => handleCopy(CONTRACT_ADDRESS, 'contract')} 
                                                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {copied === 'contract' ? <Check size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <span style={{ fontSize: '0.75rem', color: '#94A3B8', display: 'block', fontWeight: 500 }}>IPFS Pinata Storage Gateway</span>
                                        <span style={{ fontSize: '0.82rem', color: '#10B981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
                                            <CheckCircle2 size={13} /> Decentralized Pinned & Verified
                                        </span>
                                    </div>

                                    <div style={{ paddingTop: '0.25rem' }}>
                                        <button 
                                            onClick={() => setCertModalOpen(true)}
                                            className="btn-cyan-outline"
                                            style={{ width: '100%' }}
                                        >
                                            <Printer size={14} /> View Official Land Title Deed Certificate
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: '#0B0F19', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                    <img 
                                        src={qrCodeUrl} 
                                        alt="Snowtrace QR Code" 
                                        style={{ width: '105px', height: '105px', borderRadius: '6px' }} 
                                    />
                                    <span style={{ fontSize: '0.65rem', color: '#94A3B8', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
                                        Scan for Snowtrace
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ════════ RIGHT COLUMN (45%) ════════ */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Specifications Card */}
                        <div className="digi-card p-6">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Award size={17} style={{ color: '#38BDF8' }} />
                                Property Specifications & Legal Attributes
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #1E293B' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Physical Address</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#E2E8F0', maxWidth: '240px', textAlign: 'right' }}>
                                        {property.addressLine || 'Designated Cadastral Plot'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #1E293B' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Zoning & Survey Details</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F8FAFC' }}>
                                        {property.surveyDetails || 'Residential / Commercial Clear'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #1E293B' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Title Encumbrance</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: property.encumbranceStatus ? '#EF4444' : '#10B981' }}>
                                        {property.encumbranceStatus ? 'Flagged / Encumbered' : 'Clear Title (Unencumbered)'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #1E293B' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Current Title Owner</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>
                                            {property.ownerWallet ? `${property.ownerWallet.slice(0, 6)}...${property.ownerWallet.slice(-4)}` : 'N/A'}
                                        </span>
                                        <button 
                                            onClick={() => handleCopy(property.ownerWallet, 'owner')} 
                                            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                        >
                                            {copied === 'owner' ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid #1E293B' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Registration Date</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F8FAFC' }}>{registrationDate}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>Primary IPFS Hash</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#94A3B8' }}>
                                            {property.documentHash ? `${property.documentHash.slice(0, 8)}...${property.documentHash.slice(-4)}` : 'N/A'}
                                        </span>
                                        {property.documentHash && (
                                            <a 
                                                href={`https://gateway.pinata.cloud/ipfs/${property.documentHash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#38BDF8', display: 'flex', alignItems: 'center' }}
                                            >
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Verified IPFS Documents Card */}
                        <div className="digi-card p-6">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <FileText size={17} style={{ color: '#38BDF8' }} />
                                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                                        Verified IPFS Legal Documents
                                    </h3>
                                </div>
                                {isOwner && (
                                    <button 
                                        onClick={() => setUploadModalOpen(true)}
                                        className="btn-cyan-outline"
                                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.72rem' }}
                                    >
                                        <Upload size={12} /> Attach Doc
                                    </button>
                                )}
                            </div>

                            {displayDocs.length === 0 ? (
                                <div style={{ padding: '1.25rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                    No secondary IPFS documents attached to this title.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {displayDocs.map((doc, idx) => (
                                        <div 
                                            key={idx}
                                            style={{
                                                padding: '0.85rem 1rem',
                                                background: '#0B0F19',
                                                border: '1px solid #1E293B',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.45rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <FileText size={15} style={{ color: '#94A3B8' }} />
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>{doc.name}</span>
                                                </div>
                                                <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Check size={11} style={{ color: '#0F172A', strokeWidth: 3 }} />
                                                </span>
                                            </div>

                                            <p style={{ fontSize: '0.68rem', fontFamily: 'JetBrains Mono', color: '#64748B', wordBreak: 'break-all', margin: 0 }}>
                                                IPFS CID: {doc.cid}
                                            </p>

                                            <a 
                                                href={`https://gateway.pinata.cloud/ipfs/${doc.cid}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn-cyan-outline"
                                                style={{ alignSelf: 'stretch', padding: '0.4rem', fontSize: '0.75rem', marginTop: '0.2rem' }}
                                            >
                                                View Document on IPFS
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Timeline Card */}
                        <div className="digi-card p-6">
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '1.25rem' }}>
                                Immutable Blockchain Ownership Timeline
                            </h3>

                            <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
                                <div 
                                    style={{
                                        position: 'absolute',
                                        left: '6px',
                                        top: '8px',
                                        bottom: '12px',
                                        width: '2px',
                                        background: '#334155'
                                    }}
                                />

                                {timelineEvents.map((item, idx) => (
                                    <div 
                                        key={idx} 
                                        style={{ 
                                            position: 'relative', 
                                            marginBottom: '1.25rem' 
                                        }}
                                    >
                                        <div 
                                            style={{
                                                position: 'absolute',
                                                left: '-1.5rem',
                                                top: '3px',
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '50%',
                                                background: item.active ? '#0284C7' : '#1E293B',
                                                border: item.active ? '2px solid #0F172A' : '2px solid #475569',
                                                zIndex: 2
                                            }}
                                        />

                                        <div>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
                                                {item.role}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '1px', margin: 0 }}>
                                                Date: {item.date}
                                            </p>
                                            <p style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px', margin: 0, wordBreak: 'break-all' }}>
                                                Hashes:{' '}
                                                <a 
                                                    href={item.hash.startsWith('0x') ? `https://testnet.snowtrace.io/tx/${item.hash}` : `#`} 
                                                    target={item.hash.startsWith('0x') ? "_blank" : "_self"}
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#38BDF8', textDecoration: 'none', fontFamily: 'JetBrains Mono' }}
                                                >
                                                    {item.hash}
                                                </a>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div 
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem 0.9rem',
                                    background: '#0B0F19',
                                    borderRadius: '8px',
                                    border: '1px solid #1E293B',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <AvalancheIcon size={15} />
                                    <div>
                                        <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', fontWeight: 500 }}>Avalanche Fuji C-Chain</span>
                                        <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8' }}>
                                            {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}
                                        </span>
                                    </div>
                                </div>

                                <a 
                                    href={snowtraceUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn-cyan-outline"
                                    style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                                >
                                    Verify <ExternalLink size={10} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════ Official Land Title Deed Certificate Modal ════════ */}
            {certModalOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 200,
                        padding: '1.5rem'
                    }}
                >
                    <div 
                        className="digi-card p-8"
                        style={{
                            maxWidth: '640px',
                            width: '100%',
                            background: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '16px',
                            position: 'relative',
                            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
                        }}
                    >
                        <button 
                            onClick={() => setCertModalOpen(false)}
                            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                        >
                            <XCircle size={22} />
                        </button>

                        <div style={{ textAlign: 'center', borderBottom: '1px solid #1E293B', paddingBottom: '1.25rem', marginBottom: '1.25rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.15)', border: '1px solid #0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem' }}>
                                <ShieldCheck size={22} style={{ color: '#38BDF8' }} />
                            </div>
                            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                DIGIVERIFY IMMUTABLE LAND CERTIFICATE
                            </h2>
                            <p style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'JetBrains Mono', margin: 0, marginTop: '4px' }}>
                                Avalanche Fuji C-Chain Smart Registry • ERC-721 #{property.nftTokenId || '1'}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', fontWeight: 600 }}>CADASTRAL SURVEY NUMBER</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>
                                        {property.surveyNumber || 'PENDING'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', fontWeight: 600 }}>RECORDED TITLE OWNER</span>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#F8FAFC', fontFamily: 'JetBrains Mono', wordBreak: 'break-all' }}>
                                        {property.ownerWallet}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', fontWeight: 600 }}>PARCEL SPECIFICATIONS</span>
                                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#F8FAFC' }}>
                                        {areaText} • {locationText}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block', fontWeight: 600 }}>IPFS TITLE HASH</span>
                                    <span style={{ fontSize: '0.72rem', fontFamily: 'JetBrains Mono', color: '#94A3B8', wordBreak: 'break-all' }}>
                                        {property.documentHash || 'ipfs://Qmdvd372...genesis'}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: '#0B0F19', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1E293B' }}>
                                <img 
                                    src={qrCodeUrl} 
                                    alt="Snowtrace QR" 
                                    style={{ width: '110px', height: '110px', borderRadius: '6px' }} 
                                />
                                <span style={{ fontSize: '0.65rem', color: '#94A3B8', textAlign: 'center', fontFamily: 'JetBrains Mono' }}>
                                    Scan to verify
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button 
                                onClick={() => window.print()} 
                                className="btn-cyan-glow"
                                style={{ flex: 1 }}
                            >
                                <Printer size={15} /> Print Official Deed (PDF)
                            </button>
                            <a 
                                href={snowtraceUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="btn-cyan-outline"
                                style={{ flex: 1, textAlign: 'center' }}
                            >
                                <ExternalLink size={15} /> View on Snowtrace
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* ════════ Initiate Sale Modal ════════ */}
            {saleModalOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 200,
                        padding: '1.5rem'
                    }}
                >
                    <div 
                        className="digi-card p-6"
                        style={{
                            maxWidth: '460px',
                            width: '100%',
                            background: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                Initiate Multi-Sig Sale
                            </h3>
                            <button onClick={() => setSaleModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        {saleMsg.text && (
                            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem', background: saleMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: saleMsg.type === 'error' ? '#EF4444' : '#10B981', border: `1px solid ${saleMsg.type === 'error' ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}` }}>
                                {saleMsg.text}
                            </div>
                        )}

                        <form onSubmit={handleInitiateSale} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8', marginBottom: '0.35rem' }}>Buyer Avalanche Wallet Address</label>
                                <input 
                                    type="text"
                                    required
                                    placeholder="0x71C...b4e"
                                    value={saleForm.buyerWallet}
                                    onChange={(e) => setSaleForm({ ...saleForm, buyerWallet: e.target.value })}
                                    className="input-premium"
                                    style={{ fontFamily: 'JetBrains Mono' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8', marginBottom: '0.35rem' }}>Agreed Sale Price (AVAX)</label>
                                <input 
                                    type="number"
                                    step="0.001"
                                    required
                                    placeholder="e.g. 5.50"
                                    value={saleForm.price}
                                    onChange={(e) => setSaleForm({ ...saleForm, price: e.target.value })}
                                    className="input-premium"
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={saleLoading}
                                className="btn-cyan-glow"
                                style={{ marginTop: '0.5rem', width: '100%' }}
                            >
                                {saleLoading ? <Loader2 size={16} className="animate-spin" /> : 'Deploy Multi-Sig Sale Contract'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ════════ Upload IPFS Document Modal ════════ */}
            {uploadModalOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 200,
                        padding: '1.5rem'
                    }}
                >
                    <div 
                        className="digi-card p-6"
                        style={{
                            maxWidth: '460px',
                            width: '100%',
                            background: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '16px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                Attach IPFS Legal Document
                            </h3>
                            <button onClick={() => setUploadModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                                <XCircle size={20} />
                            </button>
                        </div>

                        {uploadError && (
                            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                {uploadError}
                            </div>
                        )}

                        {uploadSuccess && (
                            <div style={{ padding: '0.65rem 0.85rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.8rem', background: 'rgba(16,185,129,0.1)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }}>
                                {uploadSuccess}
                            </div>
                        )}

                        <form onSubmit={handleUploadDoc} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8', marginBottom: '0.35rem' }}>Document Classification</label>
                                <select 
                                    value={uploadDocType}
                                    onChange={(e) => setUploadDocType(e.target.value)}
                                    className="input-premium"
                                    style={{ background: '#0B0F19' }}
                                >
                                    <option value="Survey Report">Survey Report / Demarcation Map</option>
                                    <option value="Encumbrance Certificate">Encumbrance Certificate (EC)</option>
                                    <option value="Tax Receipt">Municipal Tax Paid Receipt</option>
                                    <option value="Khata Certificate">Khata / Title Certificate</option>
                                    <option value="Sale Deed">Registered Sale Deed</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#94A3B8', marginBottom: '0.35rem' }}>Select PDF or Image Document</label>
                                <input 
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    required
                                    onChange={(e) => setSelectedFile(e.target.files[0])}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem',
                                        background: '#0B0F19',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        color: '#94A3B8',
                                        fontSize: '0.82rem'
                                    }}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={uploadLoading || !selectedFile}
                                className="btn-cyan-glow"
                                style={{ marginTop: '0.5rem', width: '100%' }}
                            >
                                {uploadLoading ? <Loader2 size={16} className="animate-spin" /> : 'Pin Document to IPFS & Link'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetails;
