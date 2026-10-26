import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import RiskAnalysisWidget from '../../components/RiskAnalysisWidget';
import {
    MapPin, Building, FileText, Activity, ArrowLeft, Loader2,
    CheckCircle2, ShieldAlert, DollarSign, ExternalLink, Copy,
    Clock, Hash, Wallet, Shield, Lock, ArrowUpRight, ArrowDownLeft,
    AlertTriangle, Globe, Gavel, XCircle, Award, Check,
    Users, Percent, ShieldCheck, User, RotateCcw
} from 'lucide-react';
import './PropertyPages.css';

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account } = useWeb3();

    const [property, setProperty] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [freezeOrders, setFreezeOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saleForm, setSaleForm] = useState({ buyerWallet: '', price: '' });
    const [saleLoading, setSaleLoading] = useState(false);
    const [saleMsg, setSaleMsg] = useState({ type: '', text: '' });
    const [copied, setCopied] = useState('');
    const [showCertModal, setShowCertModal] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const [propRes, docRes, txRes] = await Promise.all([
                    propertyService.getPropertyById(id),
                    propertyService.getDocuments(id),
                    saleService.getTransactionsByProperty(id),
                ]);
                const propData = propRes.data.data;
                setProperty(propData);
                setDocuments(docRes.data.data || []);
                setTransactions(txRes.data.data || []);
                
                if (propData?.status === 'frozen' || propData?.status === 'under_dispute') {
                    try {
                        const frozenRes = await propertyService.getFreezeOrders(id);
                        setFreezeOrders(frozenRes.data.data || []);
                    } catch (_) { /* non-critical */ }
                }
            } catch (err) {
                setError('Failed to load property details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const ownerWallet = property?.ownerWallet?.toLowerCase();
    const isOwner = property && (
        (account && ownerWallet === account.toLowerCase()) ||
        (user?.walletAddress && ownerWallet === user.walletAddress.toLowerCase()) ||
        (property.coOwners && property.coOwners.some(co => 
            (account && co.ownerWallet?.toLowerCase() === account.toLowerCase()) ||
            (user?.walletAddress && co.ownerWallet?.toLowerCase() === user.walletAddress.toLowerCase())
        ))
    );

    const handleCopy = (text, key) => {
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
                buyerWallet: saleForm.buyerWallet.trim(),
                salePrice: Number(saleForm.price)
            });
            setSaleMsg({ type: 'success', text: 'Sale agreement created and sent to buyer for review!' });
            setSaleForm({ buyerWallet: '', price: '' });
            
            // Refresh
            const [propRes, txRes] = await Promise.all([
                propertyService.getPropertyById(id),
                saleService.getTransactionsByProperty(id),
            ]);
            setProperty(propRes.data.data);
            setTransactions(txRes.data.data || []);
        } catch (err) {
            setSaleMsg({ type: 'error', text: err.response?.data?.message || 'Failed to initiate sale process.' });
        } finally {
            setSaleLoading(false);
        }
    };

    const statusConfig = {
        active: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Verified' },
        verified: { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Verified' },
        pending: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Under Review' },
        frozen: { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Frozen by Court' },
        under_dispute: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Under Legal Dispute' },
        pending_transfer: { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', label: 'Being Sold/Transferred' },
        rejected: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Rejected' },
    };
    const sc = statusConfig[property?.status] || statusConfig.pending;

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 style={{ width: '3rem', height: '3rem', color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading property details...</p>
                </div>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="property-container container-sm" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <ShieldAlert size={56} style={{ color: '#DC2626', margin: '0 auto 1.5rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0F172A' }}>Property Not Found</h2>
                <p style={{ color: '#64748B', marginBottom: '2rem' }}>{error || 'Unable to locate this property in the registry.'}</p>
                <button className="gov-btn gov-btn-primary" onClick={() => navigate('/my-properties')}>
                    Return to My Properties
                </button>
            </div>
        );
    }

    return (
        <div className="property-container container-lg">
            {/* Top Navigation */}
            <button className="back-button" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} /> Return to Properties
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {/* ── Official Rejection Notice (if rejected) ── */}
                {property.status === 'rejected' && (
                    <div style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderLeft: '5px solid #DC2626',
                        borderRadius: '14px',
                        padding: '1.25rem 1.5rem',
                        boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    backgroundColor: '#FEE2E2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#DC2626',
                                    flexShrink: 0
                                }}>
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                                        Property Registration Rejected
                                    </h3>
                                    <p style={{ fontSize: '0.78rem', color: '#B91C1C', margin: 0 }}>
                                        Application was rejected by the Land Registry Authority
                                    </p>
                                </div>
                            </div>

                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                color: '#991B1B',
                                backgroundColor: '#FEE2E2',
                                border: '1px solid #FCA5A5',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                textTransform: 'uppercase'
                            }}>
                                Rejected Application
                            </span>
                        </div>

                        <div style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #FECACA',
                            borderRadius: '10px',
                            padding: '1rem',
                            marginTop: '0.75rem'
                        }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '4px' }}>
                                Official Authority Remarks / Rejection Reason:
                            </span>
                            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.5 }}>
                                {property.adminComments || 'Document verification failed or cadastral boundary discrepancy with state land survey records.'}
                            </p>
                        </div>

                        <div style={{ marginTop: '1.25rem', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                className="gov-btn gov-btn-primary"
                                onClick={() => navigate(`/reapply-property/${property.id}`)}
                                style={{ fontSize: '0.82rem', padding: '0.5rem 1.1rem', backgroundColor: '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                            >
                                <RotateCcw size={14} /> Reapply for this Property
                            </button>
                            <button
                                className="gov-btn gov-btn-secondary"
                                onClick={() => navigate('/register-property')}
                                style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                            >
                                Register New Property
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Official Digital Certificate of Ownership ── */}
                <div className="certificate-container">
                    <div className="certificate-watermark">VERIFIED PROPERTY</div>

                    {/* Certificate Header */}
                    <div className="certificate-header">
                        <div className="certificate-emblem">
                            <div className="certificate-seal-badge" style={{ padding: 0, overflow: 'hidden' }}>
                                <img src="/logo.png" alt="DigiVerify Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <div className="certificate-title-text">
                                <h2>Property Details & Certificate</h2>
                                <p>DigiVerify Verified Title Deed</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div className="gov-badge" style={{ '--badge-color': sc.color, '--badge-bg': sc.bg, '--badge-border': sc.border }}>
                                <span className="gov-badge-dot"></span>
                                {sc.label}
                            </div>
                            {property.encumbranceStatus && (
                                <div className="gov-badge" style={{ '--badge-color': '#DC2626', '--badge-bg': '#FEF2F2', '--badge-border': '#FECACA' }}>
                                    <Shield size={12} /> LEGAL DISPUTE
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Survey Title & Sector */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Survey Number
                            </span>
                            <h1 style={{ fontSize: '2.25rem', fontWeight: 900, color: '#0F172A', margin: '0.2rem 0' }}>
                                {property.surveyNumber}
                            </h1>
                            <p style={{ color: '#475569', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                                <MapPin size={15} style={{ color: '#1E40AF' }} />
                                {property.addressLine ? `${property.addressLine}, ` : ''}{property.district}{property.state ? `, ${property.state}` : ''}
                            </p>
                        </div>

                        {property.nftTokenId && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setShowCertModal(true)}
                                    className="gov-btn"
                                    style={{
                                        borderColor: '#059669',
                                        color: '#059669',
                                        background: '#ECFDF5',
                                        fontWeight: 700,
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    <Award size={15} /> View Deed Certificate
                                </button>
                                <a
                                    href={`https://sepolia.etherscan.io/token/0xbCB28DC4eF6242572c0a65D1643595C582106249?a=${property.nftTokenId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gov-btn"
                                    style={{
                                        borderColor: '#7C3AED',
                                        color: '#7C3AED',
                                        background: '#F5F3FF',
                                        fontFamily: 'JetBrains Mono',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    <Globe size={14} /> LandNFT #{property.nftTokenId} <ExternalLink size={12} />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Metadata Grid */}
                    <div className="gov-data-grid">
                        <div className="gov-data-item">
                            <span className="label">Property ID</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span className="value mono" style={{ color: '#1E40AF', fontSize: '0.82rem' }}>{property.id}</span>
                                <button onClick={() => handleCopy(property.id, 'id')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'id' ? '#059669' : '#94A3B8', padding: 0 }}>
                                    {copied === 'id' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>

                        <div className="gov-data-item">
                            <span className="label">Property Reference Code</span>
                            <span className="value mono" style={{ fontWeight: 700, color: '#0F172A' }}>{property.propertyCode || '—'}</span>
                        </div>

                        <div className="gov-data-item">
                            <span className="label">Total Area</span>
                            <span className="value" style={{ fontWeight: 700 }}>{property.areaSqft?.toLocaleString() || '—'} Sq.Ft.</span>
                        </div>

                        {(property.geoLat || property.geoLng) && (
                            <div className="gov-data-item">
                                <span className="label">Map Coordinates</span>
                                <span className="value mono" style={{ fontSize: '0.85rem' }}>{property.geoLat}, {property.geoLng}</span>
                            </div>
                        )}

                        {/* Registered Co-Owners & Shares Grid */}
                        <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <span className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                                    <Users size={14} style={{ color: '#2563EB' }} />
                                    Registered Title Holders ({property.coOwners && property.coOwners.length > 0 ? property.coOwners.length : 1} {property.coOwners && property.coOwners.length > 1 ? 'Joint Co-Owners' : 'Owner'})
                                </span>
                                <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0', fontSize: '0.72rem' }}>
                                    100.00% Title Allocated
                                </span>
                            </div>

                            {property.coOwners && property.coOwners.length > 0 ? (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                    gap: '0.75rem',
                                    marginTop: '0.5rem',
                                    width: '100%'
                                }}>
                                    {property.coOwners.map((co, idx) => {
                                        const isCurrentUser = (account && co.ownerWallet?.toLowerCase() === account.toLowerCase()) ||
                                                              (user?.walletAddress && co.ownerWallet?.toLowerCase() === user.walletAddress.toLowerCase());
                                        return (
                                            <div key={idx} style={{
                                                backgroundColor: '#F8FAFC',
                                                border: isCurrentUser ? '1px solid #93C5FD' : '1px solid #E2E8F0',
                                                borderRadius: '8px',
                                                padding: '0.85rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                                                            {co.name || `Co-Owner #${idx + 1}`}
                                                        </span>
                                                        {co.isPrimary && (
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#1D4ED8', backgroundColor: '#EFF6FF', padding: '1px 5px', borderRadius: '4px', border: '1px solid #BFDBFE' }}>
                                                                PRIMARY
                                                            </span>
                                                        )}
                                                        {isCurrentUser && (
                                                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#047857', backgroundColor: '#ECFDF5', padding: '1px 5px', borderRadius: '4px', border: '1px solid #A7F3D0' }}>
                                                                YOU
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 800,
                                                        color: '#047857',
                                                        backgroundColor: '#ECFDF5',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        border: '1px solid #A7F3D0'
                                                    }}>
                                                        {co.sharePercentage ? (co.sharePercentage.endsWith('%') ? co.sharePercentage : `${co.sharePercentage}%`) : '100%'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <code style={{ fontSize: '0.75rem', color: '#334155', backgroundColor: '#FFFFFF', padding: '3px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', wordBreak: 'break-all', flex: 1 }}>
                                                        {co.ownerWallet}
                                                    </code>
                                                    <button onClick={() => handleCopy(co.ownerWallet, `co-${idx}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === `co-${idx}` ? '#059669' : '#94A3B8', padding: 0 }}>
                                                        {copied === `co-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                                                    <span style={{ textTransform: 'capitalize' }}>
                                                        {co.ownershipType?.replace('_', ' ')}
                                                    </span>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: co.kycStatus === 'verified' ? '#059669' : '#D97706', fontWeight: 600 }}>
                                                        <ShieldCheck size={12} />
                                                        {co.kycStatus === 'verified' ? 'Identity Verified' : 'KYC Pending'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <span className="value mono" style={{
                                        background: '#F1F5F9',
                                        padding: '0.35rem 0.65rem',
                                        borderRadius: '6px',
                                        border: '1px solid #E2E8F0',
                                        fontSize: '0.85rem',
                                        color: '#0F172A'
                                    }}>
                                        {property.ownerWallet}
                                    </span>
                                    {isOwner && (
                                        <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0' }}>
                                            YOU (OWNER)
                                        </span>
                                    )}
                                    <button onClick={() => handleCopy(property.ownerWallet, 'owner')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'owner' ? '#059669' : '#94A3B8', padding: 0 }}>
                                        {copied === 'owner' ? <Check size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Property Risk & Valuation */}
                    <div style={{ marginTop: '1.5rem' }}>
                        <RiskAnalysisWidget propertyId={id} />
                    </div>
                </div>

                {/* ── Active Transfer / Restrictions / Sale Initiation Panels ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
                    {/* Sale Initiation (Owner only, Active status) */}
                    {isOwner && (property.status === 'active' || property.status === 'verified') && (
                        <div id="transfer" className="gov-card">
                            <div className="gov-card-header">
                                <h3 className="gov-card-title">
                                    <DollarSign size={20} /> Sell / Transfer Property
                                </h3>
                                <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF' }}>Direct Transfer</span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Initiate a secure transfer to a buyer. Payment is held securely until the ownership transfer is approved.
                            </p>
                            <form onSubmit={handleInitiateSale} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Buyer's Account / Wallet Address (0x...)</label>
                                    <input
                                        type="text"
                                        className="gov-input mono"
                                        placeholder="0x71C...392A"
                                        value={saleForm.buyerWallet}
                                        onChange={e => setSaleForm({ ...saleForm, buyerWallet: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Agreed Sale Price (INR ₹)</label>
                                    <input
                                        type="number"
                                        className="gov-input"
                                        placeholder="e.g. 5000000"
                                        value={saleForm.price}
                                        onChange={e => setSaleForm({ ...saleForm, price: e.target.value })}
                                        required
                                        min="1"
                                    />
                                </div>
                                <button type="submit" disabled={saleLoading} className="gov-btn gov-btn-primary" style={{ padding: '0.85rem' }}>
                                    {saleLoading ? <><Loader2 size={16} className="animate-spin" /> Creating Sale Agreement...</> : 'Start Sale Process'}
                                </button>
                            </form>
                            {saleMsg.text && (
                                <div className={`alert-message ${saleMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>
                                    {saleMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {saleMsg.text}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Active Transfer Notice */}
                    {property.status === 'pending_transfer' && (
                        <div className="gov-card" style={{ borderLeft: '4px solid #D97706' }}>
                            <h3 className="gov-card-title" style={{ color: '#D97706', marginBottom: '0.5rem' }}>
                                <Activity size={20} /> Sale & Transfer in Progress
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                                This property is currently in an active sale agreement. Other transfers are temporarily paused.
                            </p>
                        </div>
                    )}

                    {/* Court Freeze / Dispute Notice */}
                    {(property.status === 'frozen' || property.status === 'under_dispute') && (
                        <div className="gov-card" style={{ borderLeft: `4px solid ${property.status === 'frozen' ? '#2563EB' : '#DC2626'}` }}>
                            <div className="gov-card-header">
                                <h3 className="gov-card-title" style={{ color: property.status === 'frozen' ? '#2563EB' : '#DC2626' }}>
                                    <Gavel size={20} />
                                    {property.status === 'frozen' ? 'Property Frozen by Court Order' : 'Property Under Legal Dispute'}
                                </h3>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1rem', lineHeight: 1.5 }}>
                                {property.status === 'frozen'
                                    ? 'A court order is active on this property. Ownership transfers and sales are temporarily suspended.'
                                    : 'A formal legal dispute has been filed regarding this property.'}
                            </p>

                            {freezeOrders.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {freezeOrders.map((order, i) => (
                                        <div key={order.id || i} style={{ padding: '0.85rem 1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A' }}>Case #{order.case_number || 'N/A'}</span>
                                                <span className="gov-badge" style={{ '--badge-bg': order.is_active ? '#EFF6FF' : '#ECFDF5', '--badge-color': order.is_active ? '#2563EB' : '#059669', fontSize: '0.65rem' }}>
                                                    {order.is_active ? 'ACTIVE ORDER' : 'RESOLVED'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>Reason: {order.reason || 'Court order issued.'}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Legal Standing Overview */}
                    <div className="gov-card">
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <Shield size={18} /> Ownership & Legal Status
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {!property.encumbranceStatus && property.status !== 'frozen' && property.status !== 'under_dispute' ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                                    <CheckCircle2 size={18} style={{ color: '#059669', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', margin: 0 }}>Clean & Clear Title</p>
                                        <p style={{ fontSize: '0.75rem', color: '#065F46', margin: 0 }}>No disputes, liens, or court restrictions found.</p>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1rem', background: '#FEF2F2', borderRadius: '8px', border: '1px solid #FECACA' }}>
                                    <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626', margin: 0 }}>Legal Restrictions Active</p>
                                        <p style={{ fontSize: '0.75rem', color: '#991B1B', margin: 0 }}>{property.encumbranceReason || 'Please review active legal notices.'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Official Document Vault ── */}
                <div className="gov-card">
                    <div className="gov-card-header">
                        <h3 className="gov-card-title">
                            <FileText size={20} /> Official Documents
                        </h3>
                        <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF' }}>
                            Secure Storage
                        </span>
                    </div>

                    {property.documentHash && (
                        <div style={{
                            padding: '1.25rem',
                            background: '#F8FAFC',
                            borderRadius: '12px',
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '1rem',
                            marginBottom: '1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.6rem', borderRadius: '8px', background: '#EFF6FF', color: '#1E40AF' }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', margin: 0 }}>Registered Sale Deed</p>
                                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#64748B', margin: '0.2rem 0 0', wordBreak: 'break-all' }}>
                                        Document Ref: {property.documentHash}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <a
                                    href={`https://gateway.pinata.cloud/ipfs/${property.documentHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gov-btn"
                                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                                >
                                    <ExternalLink size={14} /> View Document
                                </a>
                                <button
                                    onClick={() => handleCopy(property.documentHash, 'dochash')}
                                    style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '0.45rem', cursor: 'pointer', color: copied === 'dochash' ? '#059669' : '#64748B' }}
                                >
                                    {copied === 'dochash' ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {documents.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {documents.map((doc, idx) => (
                                <div key={doc.id || idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '1rem',
                                    background: '#FFFFFF',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    flexWrap: 'wrap',
                                    gap: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ padding: '0.5rem', borderRadius: '6px', background: '#F1F5F9', color: '#475569' }}>
                                            <FileText size={18} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', margin: 0 }}>{doc.document_type || 'Attached Document'}</p>
                                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#64748B', margin: '0.15rem 0 0' }}>{doc.ipfs_hash || doc.document_hash}</p>
                                        </div>
                                    </div>
                                    <a
                                        href={`https://gateway.pinata.cloud/ipfs/${doc.ipfs_hash || doc.document_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="gov-btn"
                                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                                    >
                                        <ExternalLink size={12} /> View
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Transaction Conveyance History ── */}
                <div className="gov-card">
                    <div className="gov-card-header">
                        <h3 className="gov-card-title">
                            <Activity size={20} /> Ownership History
                        </h3>
                        <span className="gov-badge" style={{ '--badge-bg': '#F1F5F9', '--badge-color': '#334155' }}>
                            {transactions.length} Event{transactions.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    {transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#64748B' }}>
                            <Activity size={32} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>No past sale or transfer history found for this property.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {transactions.map((tx) => {
                                const isSeller = tx.sellerWallet?.toLowerCase() === account?.toLowerCase();
                                const isCompleted = tx.status === 'completed';

                                return (
                                    <div key={tx.id} style={{
                                        padding: '1.25rem',
                                        background: '#F8FAFC',
                                        borderRadius: '12px',
                                        border: '1px solid #E2E8F0',
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto',
                                        gap: '1rem',
                                        alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                                {isSeller ? <ArrowUpRight size={16} style={{ color: '#1E40AF' }} /> : <ArrowDownLeft size={16} style={{ color: '#059669' }} />}
                                                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A' }}>
                                                    Sale Transaction #{tx.id?.slice(0, 8)?.toUpperCase()}
                                                </span>
                                                <span className="gov-badge" style={{
                                                    '--badge-bg': isCompleted ? '#ECFDF5' : '#FFFBEB',
                                                    '--badge-color': isCompleted ? '#059669' : '#D97706',
                                                    fontSize: '0.65rem'
                                                }}>
                                                    {tx.status?.toUpperCase()}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                                                Sale Price: <strong style={{ color: '#0F172A' }}>₹{tx.salePrice?.toLocaleString('en-IN')}</strong> | Other Party: <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem' }}>{isSeller ? tx.buyerWallet : tx.sellerWallet}</span>
                                            </p>
                                        </div>
                                        <button
                                            className="gov-btn"
                                            onClick={() => navigate(`/sale/${tx.id}/review`)}
                                            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                                        >
                                            View Sale Details
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Digital Land Deed Certificate Modal ─── */}
            {showCertModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1.5rem'
                }}>
                    <div style={{
                        background: '#0F172A',
                        borderRadius: '20px',
                        border: '1px solid #334155',
                        maxWidth: '900px',
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '1.25rem 1.75rem',
                            borderBottom: '1px solid #1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#090D16'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Award size={22} style={{ color: '#F59E0B' }} />
                                <div>
                                    <h3 style={{ margin: 0, color: '#F8FAFC', fontSize: '1.1rem', fontWeight: 800 }}>
                                        Digital Land Title Deed &amp; Certificate
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'JetBrains Mono' }}>
                                        NFT Token #{property.nftTokenId} • {property.propertyCode}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCertModal(false)}
                                style={{
                                    background: '#1E293B',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    color: '#94A3B8',
                                    cursor: 'pointer'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Certificate Image Frame */}
                        <div style={{ padding: '1.5rem', overflowY: 'auto', textAlign: 'center', flex: 1 }}>
                            <img
                                src={`http://localhost:5000/api/properties/${property.id}/certificate.svg`}
                                alt="Land Deed Certificate"
                                onError={(e) => {
                                    // Fallback if direct backend port fails
                                    if (!e.target.src.includes(`/${property.propertyCode}_certificate.svg`)) {
                                        e.target.src = `/${property.propertyCode}_certificate.svg`;
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    maxWidth: '820px',
                                    borderRadius: '12px',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                    display: 'block',
                                    margin: '0 auto'
                                }}
                            />
                        </div>

                        {/* Modal Footer Actions */}
                        <div style={{
                            padding: '1rem 1.75rem',
                            borderTop: '1px solid #1E293B',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#090D16',
                            flexWrap: 'wrap',
                            gap: '0.75rem'
                        }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                On-Chain Autonomous Deed anchored on DigiVerify Decentralized Registry
                            </span>
                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                                <a
                                    href={`http://localhost:5000/api/properties/${property.id}/certificate.svg`}
                                    download={`Deed_Certificate_${property.propertyCode || property.surveyNumber}.svg`}
                                    className="gov-btn"
                                    style={{
                                        background: '#1E293B',
                                        color: '#F8FAFC',
                                        borderColor: '#334155',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    Download SVG
                                </a>
                                <a
                                    href={`https://sepolia.etherscan.io/token/0xbCB28DC4eF6242572c0a65D1643595C582106249?a=${property.nftTokenId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="gov-btn"
                                    style={{
                                        background: '#7C3AED',
                                        color: '#FFFFFF',
                                        borderColor: '#7C3AED',
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    View on Etherscan <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetails;
