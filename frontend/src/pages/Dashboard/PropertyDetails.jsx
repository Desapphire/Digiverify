import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import {
    MapPin, Building, FileText, Activity, ArrowLeft, Loader2,
    CheckCircle2, ShieldAlert, DollarSign, ExternalLink, Copy,
    Clock, Hash, Wallet, Shield, Lock, ArrowUpRight, ArrowDownLeft,
    AlertTriangle, Globe, Gavel, XCircle
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
                // Fetch freeze orders if property is frozen or under dispute
                if (propData?.status === 'frozen' || propData?.status === 'under_dispute') {
                    try {
                        const frozenRes = await propertyService.getFreezeOrders(id);
                        setFreezeOrders(frozenRes.data.data || []);
                    } catch (_) { /* non-critical */ }
                }
            } catch (err) {
                setError('Failed to load property details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const ownerWallet = property?.ownerWallet?.toLowerCase();
    const isOwner = ownerWallet && (
        ownerWallet === account?.toLowerCase() ||
        ownerWallet === user?.walletAddress?.toLowerCase()
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
                buyerWallet: saleForm.buyerWallet,
                salePrice: Number(saleForm.price)
            });
            setSaleMsg({ type: 'success', text: 'Sale contract deployed successfully!' });
            setSaleForm({ buyerWallet: '', price: '' });
            // Refresh
            const [propRes, txRes] = await Promise.all([
                propertyService.getPropertyById(id),
                saleService.getTransactionsByProperty(id),
            ]);
            setProperty(propRes.data.data);
            setTransactions(txRes.data.data || []);
        } catch (err) {
            setSaleMsg({ type: 'error', text: err.response?.data?.message || 'Failed to initiate sale' });
        } finally {
            setSaleLoading(false);
        }
    };

    const statusConfig = {
        active: { color: '#00E5FF', bg: 'rgba(0, 229, 255, 0.1)', badgeClass: 'badge-success' },
        verified: { color: '#00E5FF', bg: 'rgba(0, 229, 255, 0.1)', badgeClass: 'badge-success' },
        pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)', badgeClass: 'badge-warning-glow' },
        frozen: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)', badgeClass: 'badge-neutral' },
        under_dispute: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', badgeClass: 'badge-danger' },
        pending_transfer: { color: '#A855F7', bg: 'rgba(168, 85, 247, 0.1)', badgeClass: 'badge-warning' },
        rejected: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)', badgeClass: 'badge-danger' },
    };
    const sc = statusConfig[property?.status] || statusConfig.pending;

    const cyberInputStyle = {
        width: '100%', padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
        color: 'white', fontFamily: 'inherit', fontSize: '0.9rem',
        transition: 'all 0.2s ease', outline: 'none'
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.875rem', color: '#00E5FF' }}>Loading property data...</p>
                </div>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                <ShieldAlert size={56} style={{ color: '#EF4444', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>Property Not Found</h2>
                <p style={{ color: '#9ca3af', marginBottom: '1.5rem' }}>{error || 'Unable to locate this asset record on the blockchain.'}</p>
                <button className="cyber-btn-hollow" onClick={() => navigate('/my-properties')} style={{ '--btn-color': '#00E5FF', textTransform: 'capitalize' }}>
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="property-container container-md animate-fade-in">
            <button
                className="cyber-btn-hollow mb-6"
                onClick={() => navigate(-1)}
                style={{ '--btn-color': '#00E5FF', width: 'auto', border: 'none', textTransform: 'capitalize' }}
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {/* Top Section */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.5rem' }}>

                    {/* ─── Asset Overview ─── */}
                    <div className="cyber-hud-bar" style={{ display: 'block', position: 'relative', overflow: 'hidden', padding: '2rem', gridColumn: 'span 1' }}>
                        <div className="cyber-card-glow-orb" style={{ background: sc.color, top: '-5%', right: '-5%', opacity: 0.1, width: '12rem', height: '12rem' }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem', position: 'relative', zIndex: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                <div style={{
                                    width: '3.5rem', height: '3.5rem', borderRadius: '12px',
                                    background: sc.bg, border: `1px solid ${sc.color}33`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 0 20px ${sc.color}33`
                                }}>
                                    <Building size={24} style={{ color: sc.color }} />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white' }}>{property.surveyNumber}</h1>
                                    <p style={{ fontSize: '0.9rem', color: '#9ca3af', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <MapPin size={14} style={{ color: sc.color }} /> {property.district}{property.state ? `, ${property.state}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div className="cyber-badge" style={{ '--badge-color': sc.color, '--badge-bg': 'transparent', '--badge-border': `${sc.color}66` }}>
                                    <div className="cyber-badge-dot" style={{ background: sc.color, boxShadow: `0 0 5px ${sc.color}` }}></div>
                                    {property.status?.toUpperCase()}
                                </div>
                                {property.encumbranceStatus && (
                                    <div className="cyber-badge" style={{ '--badge-color': '#EF4444', '--badge-bg': 'rgba(239,68,68,0.1)', '--badge-border': 'rgba(239,68,68,0.3)' }}>
                                        <Shield size={12} style={{ marginRight: '0.2rem' }} /> ENCUMBERED
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Key Details Grid */}
                        <div className="cyber-data-grid" style={{ marginBottom: 0, position: 'relative', zIndex: 10, background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(255,255,255,0.05)' }}>
                            <div className="cyber-data-item">
                                <p className="label">Property Record ID</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <p className="value" style={{ color: '#00E5FF', wordBreak: 'break-all' }}>{property.id}</p>
                                    <button onClick={() => handleCopy(property.id, 'id')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'id' ? '#00E5FF' : '#9ca3af', padding: 0 }}>
                                        {copied === 'id' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="cyber-data-item">
                                <p className="label">Property Code</p>
                                <p className="value" style={{ color: '#00E5FF', textShadow: '0 0 10px rgba(0,229,255,0.3)' }}>{property.propertyCode || '—'}</p>
                            </div>
                            
                            {property.nftTokenId && (
                                <div className="cyber-data-item">
                                    <p className="label">Digital Title ID</p>
                                    <a 
                                        href={`https://testnet.snowtrace.io/nft/0xE94d65289Cc088f597C077938A6D7Fc0974196fe/${property.nftTokenId}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="value"
                                        style={{ color: '#A855F7', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                                    >
                                        #{property.nftTokenId} <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}
                            
                            <div className="cyber-data-item">
                                <p className="label">Area Size</p>
                                <p className="value">{property.areaSqft?.toLocaleString() || '—'} sq.ft</p>
                            </div>
                            
                            {(property.geoLat || property.geoLng) && (
                                <div className="cyber-data-item">
                                    <p className="label"><Globe size={11} style={{ display: 'inline', marginRight: '0.2rem' }} /> Geolocation</p>
                                    <p className="value" style={{ fontSize: '0.8rem' }}>{property.geoLat}, {property.geoLng}</p>
                                </div>
                            )}
                            
                            <div className="cyber-data-item" style={{ gridColumn: '1 / -1' }}>
                                <p className="label">Full Address</p>
                                <p className="value" style={{ fontFamily: 'inherit', fontSize: '0.9rem', color: 'white' }}>{property.addressLine || '—'}</p>
                            </div>
                            
                            <div className="cyber-data-item" style={{ gridColumn: '1 / -1' }}>
                                <p className="label">Current Legal Owner</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                    <code style={{
                                        fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem',
                                        color: '#A855F7', background: 'rgba(168,85,247,0.1)',
                                        padding: '0.4rem 0.6rem', borderRadius: '6px',
                                        border: '1px solid rgba(168,85,247,0.2)', wordBreak: 'break-all',
                                    }}>
                                        {property.ownerWallet}
                                    </code>
                                    {isOwner && <span className="cyber-badge" style={{ '--badge-bg': 'transparent', '--badge-color': '#00E5FF', '--badge-border': 'rgba(0,229,255,0.3)', padding: '0.2rem 0.5rem' }}>YOU</span>}
                                    <button onClick={() => handleCopy(property.ownerWallet, 'owner')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'owner' ? '#00E5FF' : '#9ca3af', padding: 0 }}>
                                        {copied === 'owner' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Actions & Alerts Panel ─── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        
                        {/* Sale Initiation (owner only, active status) */}
                        {isOwner && (property.status === 'active' || property.status === 'verified') && (
                            <div className="cyber-hud-bar" style={{ padding: '1.75rem', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ borderLeft: '4px solid #00E5FF', paddingLeft: '1rem', position: 'relative', zIndex: 10 }}>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                                        <DollarSign size={18} style={{ color: '#00E5FF' }} /> Sell Property
                                    </h4>
                                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                        Initiate a smart contract sale. Funds will be securely locked in escrow until verification.
                                    </p>
                                    <form onSubmit={handleInitiateSale} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#d1d5db', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Buyer Wallet Address</label>
                                            <input style={cyberInputStyle} type="text" placeholder="0x..." value={saleForm.buyerWallet} onChange={e => setSaleForm({ ...saleForm, buyerWallet: e.target.value })} required />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#d1d5db', marginBottom: '0.4rem', display: 'block', fontWeight: 600 }}>Sale Price (₹)</label>
                                            <input style={cyberInputStyle} type="number" placeholder="500000" value={saleForm.price} onChange={e => setSaleForm({ ...saleForm, price: e.target.value })} required min="1" />
                                        </div>
                                        <button type="submit" disabled={saleLoading} className="cyber-btn-hollow" style={{ '--btn-color': '#00E5FF', width: '100%', padding: '0.85rem', marginTop: '0.5rem', textTransform: 'capitalize' }}>
                                            {saleLoading ? <><Loader2 size={16} className="animate-spin" /> Deploying Contract...</> : 'Initiate Sale Contract'}
                                        </button>
                                    </form>
                                    {saleMsg.text && (
                                        <div className="alert-message mt-4" style={{
                                            background: saleMsg.type === 'success' ? 'rgba(0,229,255,0.1)' : 'rgba(239,68,68,0.1)',
                                            border: `1px solid ${saleMsg.type === 'success' ? 'rgba(0,229,255,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                            color: saleMsg.type === 'success' ? '#00E5FF' : '#EF4444',
                                        }}>
                                            {saleMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />} {saleMsg.text}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Active Transfer Alert */}
                        {property.status === 'pending_transfer' && (
                            <div className="cyber-hud-bar" style={{ padding: '1.25rem', borderLeft: '4px solid #F59E0B' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#F59E0B' }}>
                                    <Activity size={18} /> Active Transfer Pending
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: 1.5 }}>This property is currently locked in an active blockchain transfer. Other operations are paused.</p>
                            </div>
                        )}

                        {/* Read-only Alert (not owner) */}
                        {!isOwner && (
                            <div className="cyber-hud-bar" style={{ padding: '1.25rem', borderLeft: '4px solid #6b7280' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white' }}>
                                    <ShieldAlert size={18} style={{ color: '#9ca3af' }} /> View Only Mode
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.5 }}>This asset is registered on the blockchain, but you are not listed as the owner.</p>
                            </div>
                        )}

                        {/* ── Court Freeze / Dispute Panel ── */}
                        {(property.status === 'frozen' || property.status === 'under_dispute') && (
                            <div className="cyber-hud-bar" style={{
                                padding: '1.75rem',
                                borderLeft: `4px solid ${property.status === 'frozen' ? '#3B82F6' : '#EF4444'}`,
                                position: 'relative', overflow: 'hidden',
                            }}>
                                <div className="cyber-card-glow-orb" style={{
                                    background: property.status === 'frozen' ? '#3B82F6' : '#EF4444',
                                    opacity: 0.06, top: '-2rem', right: '-2rem', width: '10rem', height: '10rem',
                                }} />
                                <div style={{ position: 'relative', zIndex: 10 }}>
                                    <h4 style={{
                                        fontSize: '1rem', fontWeight: 800, marginBottom: '0.4rem',
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        color: property.status === 'frozen' ? '#60a5fa' : '#f87171',
                                    }}>
                                        <Gavel size={18} />
                                        {property.status === 'frozen' ? 'Court Freeze Order Active' : 'Property Under Legal Dispute'}
                                    </h4>
                                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                        {property.status === 'frozen'
                                            ? 'This property has been frozen by a judicial court order. All transfers and sales are suspended until the freeze is lifted.'
                                            : 'This property is currently under an active legal dispute. Operations may be restricted.'}
                                    </p>

                                    {freezeOrders.length === 0 ? (
                                        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                            <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>Freeze order details are being retrieved...</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {freezeOrders.map((order, i) => (
                                                <div key={order.id} style={{
                                                    padding: '1rem 1.25rem',
                                                    background: order.is_active ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
                                                    border: `1px solid ${order.is_active ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                                    borderRadius: '10px',
                                                }}>
                                                    {/* Status + Order number */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af' }}>
                                                            Order #{freezeOrders.length - i}
                                                        </span>
                                                        <span style={{
                                                            fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px',
                                                            background: order.is_active ? 'rgba(59,130,246,0.12)' : 'rgba(34,197,94,0.08)',
                                                            border: `1px solid ${order.is_active ? 'rgba(59,130,246,0.3)' : 'rgba(34,197,94,0.25)'}`,
                                                            color: order.is_active ? '#60a5fa' : '#22c55e',
                                                        }}>
                                                            {order.is_active ? 'ACTIVE' : 'REVERSED'}
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                                        {order.case_number && (
                                                            <div>
                                                                <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '0.2rem' }}>Case Number</p>
                                                                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white', fontFamily: 'JetBrains Mono, monospace' }}>{order.case_number}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '0.2rem' }}>Issued On</p>
                                                            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'white' }}>{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                                        </div>
                                                        {order.court_officer_name && (
                                                            <div style={{ gridColumn: '1 / -1' }}>
                                                                <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '0.2rem' }}>Issuing Court Officer</p>
                                                                <p style={{ fontSize: '0.82rem', color: '#d1d5db' }}>{order.court_officer_name}</p>
                                                            </div>
                                                        )}
                                                        {order.reason && (
                                                            <div style={{ gridColumn: '1 / -1' }}>
                                                                <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '0.2rem' }}>Reason</p>
                                                                <p style={{ fontSize: '0.82rem', color: '#d1d5db', lineHeight: 1.5 }}>{order.reason}</p>
                                                            </div>
                                                        )}
                                                        {order.court_order_hash && (
                                                            <div style={{ gridColumn: '1 / -1' }}>
                                                                <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6b7280', marginBottom: '0.3rem' }}>Court Order Document</p>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                    <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: '#60a5fa', wordBreak: 'break-all', flex: 1, lineHeight: 1.5 }}>
                                                                        {order.court_order_hash}
                                                                    </code>
                                                                    <a
                                                                        href={`https://gateway.pinata.cloud/ipfs/${order.court_order_hash}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#60a5fa', textDecoration: 'none', whiteSpace: 'nowrap', background: 'rgba(59,130,246,0.1)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.25)' }}
                                                                    >
                                                                        <ExternalLink size={11} /> View Order
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Legal Standing Panel */}
                        <div className="cyber-hud-bar" style={{ padding: '1.25rem' }}>
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Legal Standing</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

                                {/* Frozen */}
                                {property.status === 'frozen' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                        <Lock size={13} style={{ color: '#3B82F6', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#93c5fd' }}>Court Freeze Active — Transfers Suspended</span>
                                    </div>
                                )}

                                {/* Under Dispute */}
                                {property.status === 'under_dispute' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        <AlertTriangle size={13} style={{ color: '#EF4444', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fca5a5' }}>Under Active Legal Dispute</span>
                                    </div>
                                )}

                                {/* Encumbrance */}
                                {property.encumbranceStatus ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <Shield size={13} style={{ color: '#EF4444', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fca5a5' }}>Encumbrance Flagged</span>
                                        </div>
                                        {property.encumbranceReason && (
                                            <div style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)' }}>
                                                <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#6b7280', marginBottom: '0.2rem' }}>Reason</p>
                                                <p style={{ fontSize: '0.8rem', color: '#fca5a5', lineHeight: 1.5 }}>{property.encumbranceReason}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)' }}>
                                        <div className="cyber-badge-dot" style={{ background: '#00E5FF', boxShadow: '0 0 6px #00E5FF', flexShrink: 0 }}></div>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>No Encumbrances on Record</span>
                                    </div>
                                )}

                                {/* All clear summary */}
                                {!property.encumbranceStatus && property.status !== 'frozen' && property.status !== 'under_dispute' && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                                        <CheckCircle2 size={13} style={{ color: '#22c55e', flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#86efac' }}>Clear Record — No Legal Restrictions</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Document Vault ─── */}
                <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
                        <FileText size={22} style={{ color: '#00E5FF' }} /> Registered Documents
                    </h3>

                    {/* Property-level document hash */}
                    {property.documentHash && (
                        <div style={{
                            marginBottom: '1rem', padding: '1.25rem', background: 'rgba(0,0,0,0.4)',
                            borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(0,229,255,0.1)' }}>
                                    <Hash size={18} style={{ color: '#00E5FF' }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem', color: 'white' }}>Title Deed IPFS Hash</p>
                                    <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#9ca3af', wordBreak: 'break-all' }}>{property.documentHash}</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <a 
                                    href={`https://gateway.pinata.cloud/ipfs/${property.documentHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cyber-btn-hollow"
                                    style={{ '--btn-color': '#00E5FF', padding: '0.4rem 0.75rem', border: '1px solid rgba(0,229,255,0.3)' }}
                                >
                                    <ExternalLink size={14} /> View Document
                                </a>
                                <button onClick={() => handleCopy(property.documentHash, 'dochash')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: copied === 'dochash' ? '#00E5FF' : '#9ca3af', padding: '0.5rem', borderRadius: '8px' }}>
                                    {copied === 'dochash' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {documents.length === 0 && !property.documentHash ? (
                        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#9ca3af', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <FileText size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                            <p style={{ fontSize: '0.9rem' }}>No verification documents found for this asset.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {documents.map((doc) => (
                                <div key={doc.id || doc.document_hash} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                                    borderRadius: '12px', transition: 'background 0.2s', flexWrap: 'wrap', gap: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ padding: '0.5rem', borderRadius: '8px', background: 'rgba(168,85,247,0.1)' }}>
                                            <FileText size={18} style={{ color: '#A855F7' }} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.2rem', color: 'white' }}>{doc.document_type || 'Attached Document'}</p>
                                            <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#9ca3af', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {doc.ipfs_hash || doc.document_hash}
                                            </p>
                                        </div>
                                    </div>
                                    <a 
                                        href={`https://gateway.pinata.cloud/ipfs/${doc.ipfs_hash || doc.document_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cyber-btn-hollow" 
                                        style={{ '--btn-color': '#A855F7', padding: '0.4rem 0.75rem', border: '1px solid rgba(168,85,247,0.3)' }}
                                    >
                                        <ExternalLink size={14} /> Open File
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Transaction History ─── */}
                <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white' }}>
                        <Activity size={22} style={{ color: '#00E5FF' }} /> Transaction History
                    </h3>

                    {transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 2rem', color: '#9ca3af', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                            <Activity size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                            <p style={{ fontSize: '0.9rem' }}>No past ledger transactions recorded for this property.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {transactions.map((tx) => {
                                const isSeller = tx.sellerWallet?.toLowerCase() === account?.toLowerCase();
                                const txStatusConfig = {
                                    completed: { color: '#00E5FF', bg: 'rgba(0,229,255,0.1)' },
                                    cancelled: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
                                    expired: { color: '#9ca3af', bg: 'rgba(255,255,255,0.05)' },
                                };
                                const tsc = txStatusConfig[tx.status] || { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' };

                                return (
                                    <div key={tx.id} style={{
                                        padding: '1.5rem', background: 'rgba(0,0,0,0.3)',
                                        borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)',
                                        display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem',
                                        alignItems: 'center', transition: 'all 0.2s ease'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                                                {isSeller
                                                    ? <ArrowUpRight size={16} style={{ color: '#A855F7' }} />
                                                    : <ArrowDownLeft size={16} style={{ color: '#00E5FF' }} />
                                                }
                                                <span className="cyber-badge" style={{ '--badge-bg': 'rgba(255,255,255,0.1)', '--badge-color': '#d1d5db', '--badge-border': 'transparent', padding: '0.2rem 0.4rem', fontSize: '0.6rem' }}>
                                                    {isSeller ? 'SELLER' : 'BUYER'}
                                                </span>
                                                <span className="cyber-badge" style={{ '--badge-bg': tsc.bg, '--badge-color': tsc.color, '--badge-border': 'transparent', padding: '0.2rem 0.4rem', fontSize: '0.6rem' }}>
                                                    {tx.status?.toUpperCase()}
                                                </span>
                                                {tx.txHash && (
                                                    <a 
                                                        href={`https://testnet.snowtrace.io/tx/${tx.txHash}`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none', marginLeft: '0.5rem' }}
                                                    >
                                                        TX: {tx.txHash.slice(0, 10)}... <ExternalLink size={12} />
                                                    </a>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#d1d5db' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Wallet size={12} style={{ color: '#6b7280' }} /> Buyer: <span style={{ fontFamily: 'JetBrains Mono' }}>{tx.buyerWallet?.slice(0, 8)}...</span>
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <Wallet size={12} style={{ color: '#6b7280' }} /> Seller: <span style={{ fontFamily: 'JetBrains Mono' }}>{tx.sellerWallet?.slice(0, 8)}...</span>
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                                                <span>Buyer: {tx.buyerSigned ? <span style={{color: '#00E5FF'}}>✓ Signed</span> : '⏳ Pending'}</span>
                                                <span>Seller: {tx.sellerSigned ? <span style={{color: '#00E5FF'}}>✓ Signed</span> : '⏳ Pending'}</span>
                                                <span>Authority: {tx.authoritySigned ? <span style={{color: '#00E5FF'}}>✓ Verified</span> : '⏳ Pending'}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: 800, fontSize: '1.25rem', color: '#00E5FF', textShadow: '0 0 10px rgba(0,229,255,0.3)' }}>
                                                ₹{Number(tx.salePrice).toLocaleString('en-IN')}
                                            </p>
                                            <p style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                                                <Clock size={12} /> {new Date(tx.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyDetails;
