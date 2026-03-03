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
    AlertTriangle, Globe
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
                setProperty(propRes.data.data);
                setDocuments(docRes.data.data || []);
                setTransactions(txRes.data.data || []);
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

    const labelStyle = {
        fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'hsl(220,15%,60%)', marginBottom: '0.3rem',
    };

    const statusConfig = {
        active: { color: 'hsl(142,71%,45%)', badgeClass: 'badge-success' },
        verified: { color: 'hsl(142,71%,45%)', badgeClass: 'badge-success' },
        pending: { color: 'hsl(38,92%,50%)', badgeClass: 'badge-warning-glow' },
        frozen: { color: 'hsl(200,85%,55%)', badgeClass: 'badge-neutral' },
        under_dispute: { color: 'hsl(348,83%,47%)', badgeClass: 'badge-danger' },
        pending_transfer: { color: 'hsl(280,80%,60%)', badgeClass: 'badge-warning' },
    };
    const sc = statusConfig[property?.status] || statusConfig.pending;

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
            </div>
        );
    }

    if (error || !property) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
                <ShieldAlert size={56} style={{ color: 'hsl(348,83%,47%)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Asset Not Found</h2>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{error}</p>
                <button className="btn btn-secondary" onClick={() => navigate('/my-properties')}>Return to Properties</button>
            </div>
        );
    }

    return (
        <div className="property-container container-md">
            <button
                className="back-button"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                {/* Two column on larger screens */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.5rem' }}>

                    {/* ─── Asset Overview ─── */}
                    <div className="details-panel" style={{ gridColumn: 'span 1' }}>
                        <div className="details-panel-glow" style={{ background: sc.color }}></div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{
                                    width: '3.5rem', height: '3.5rem', borderRadius: '1rem',
                                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Building size={24} style={{ color: 'hsl(255,85%,65%)' }} />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>{property.surveyNumber}</h1>
                                    <p style={{ fontSize: '0.85rem', color: 'hsl(220,15%,60%)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <MapPin size={14} /> {property.district}{property.state ? `, ${property.state}` : ''}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                <span className={`badge ${sc.badgeClass}`}>{property.status?.toUpperCase()}</span>
                                {property.encumbranceStatus && property.encumbranceStatus !== 'clear' && (
                                    <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        <Shield size={10} /> ENCUMBERED
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Key Details Grid */}
                        <div className="info-grid-box">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.25rem' }}>
                                <div>
                                    <p className="info-label">Property ID</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <p className="info-value-mono" style={{ fontSize: '0.75rem', color: 'hsl(255,85%,65%)' }}>{property.id.slice(0, 12)}...</p>
                                        <button onClick={() => handleCopy(property.id, 'id')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'id' ? 'hsl(142,71%,45%)' : 'hsl(220,15%,60%)', padding: 0 }}>
                                            {copied === 'id' ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <p className="info-label">Property Code</p>
                                    <p className="info-value" style={{ color: 'hsl(255,85%,65%)' }}>{property.propertyCode || '—'}</p>
                                </div>
                                {property.nftTokenId && (
                                    <div>
                                        <p className="info-label">NFT Token ID</p>
                                        <p className="info-value-mono" style={{ color: 'hsl(280,80%,60%)' }}>#{property.nftTokenId}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="info-label">Area</p>
                                    <p className="info-value-mono">{property.areaSqft?.toLocaleString() || '—'} sq.ft</p>
                                </div>
                                {(property.geoLat || property.geoLng) && (
                                    <div>
                                        <p className="info-label"><Globe size={10} style={{ display: 'inline', marginRight: '0.2rem' }} />Coordinates</p>
                                        <p className="info-value-mono" style={{ fontSize: '0.8rem' }}>{property.geoLat}, {property.geoLng}</p>
                                    </div>
                                )}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p className="info-label">Full Address</p>
                                    <p className="info-value" style={{ fontWeight: 500, fontSize: '0.9rem' }}>{property.addressLine || '—'}</p>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <p className="info-label">Current Owner</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <code style={{
                                            fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600,
                                            color: 'hsl(255,85%,65%)', background: 'rgba(139,92,246,0.08)',
                                            padding: '0.3rem 0.5rem', borderRadius: '0.375rem',
                                            border: '1px solid rgba(139,92,246,0.2)', wordBreak: 'break-all',
                                        }}>
                                            {property.ownerWallet}
                                        </code>
                                        {isOwner && <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>YOU</span>}
                                        <button onClick={() => handleCopy(property.ownerWallet, 'owner')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'owner' ? 'hsl(142,71%,45%)' : 'hsl(220,15%,60%)', padding: 0 }}>
                                            {copied === 'owner' ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ─── Actions Panel ─── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Sale Initiation (owner only, active status) */}
                        {isOwner && (property.status === 'active' || property.status === 'verified') && (
                            <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '3px solid hsl(142,71%,45%)' }}>
                                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <DollarSign size={18} style={{ color: 'hsl(142,71%,45%)' }} /> Initiate Sale
                                </h4>
                                <p style={{ fontSize: '0.8rem', color: 'hsl(220,15%,60%)', marginBottom: '1rem', lineHeight: 1.5 }}>
                                    Deploy an ASBA transfer contract. Buyer funds will be locked until biometric verification.
                                </p>
                                <form onSubmit={handleInitiateSale} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Buyer Wallet</label>
                                        <input className="input-premium" type="text" placeholder="0x..." value={saleForm.buyerWallet} onChange={e => setSaleForm({ ...saleForm, buyerWallet: e.target.value })} required style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Sale Price (₹)</label>
                                        <input className="input-premium" type="number" placeholder="500000" value={saleForm.price} onChange={e => setSaleForm({ ...saleForm, price: e.target.value })} required min="1" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
                                    </div>
                                    <button type="submit" disabled={saleLoading} className="btn btn-primary btn-glow" style={{ width: '100%', fontSize: '0.85rem', padding: '0.75rem' }}>
                                        {saleLoading ? <><Loader2 size={16} className="animate-spin" /> Deploying...</> : 'Deploy Contract'}
                                    </button>
                                </form>
                                {saleMsg.text && (
                                    <div className="alert-message" style={{
                                        marginTop: '0.75rem',
                                        background: saleMsg.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                        border: `1px solid ${saleMsg.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                                        color: saleMsg.type === 'success' ? 'hsl(142,71%,45%)' : 'hsl(348,83%,47%)',
                                    }}>
                                        {saleMsg.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {saleMsg.text}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Active Transfer Alert */}
                        {property.status === 'pending_transfer' && (
                            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid hsl(38,92%,50%)' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'hsl(38,92%,50%)' }}>
                                    <Activity size={16} /> Active Transfer Contract
                                </h4>
                                <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>This property is locked in an active ASBA transfer. Standard operations are suspended.</p>
                            </div>
                        )}

                        {/* Read-only Alert (not owner) */}
                        {!isOwner && (
                            <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '3px solid hsl(220,15%,60%)' }}>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <ShieldAlert size={16} /> Read-Only Access
                                </h4>
                                <p style={{ fontSize: '0.8rem', color: 'hsl(220,15%,60%)', lineHeight: 1.5 }}>This asset is verified on-chain but you are not the owner.</p>
                            </div>
                        )}

                        {/* Status info */}
                        <div className="glass-panel" style={{ padding: '1.25rem' }}>
                            <p style={labelStyle}>Encumbrance</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                    width: '0.6rem', height: '0.6rem', borderRadius: '9999px',
                                    background: (!property.encumbranceStatus || property.encumbranceStatus === 'clear') ? 'hsl(142,71%,45%)' : 'hsl(348,83%,47%)',
                                    boxShadow: `0 0 6px ${(!property.encumbranceStatus || property.encumbranceStatus === 'clear') ? 'hsl(142,71%,45%)' : 'hsl(348,83%,47%)'}`,
                                }}></div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                    {(!property.encumbranceStatus || property.encumbranceStatus === 'clear') ? 'Clear — No Encumbrances' : property.encumbranceStatus?.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Document Vault ─── */}
                <div className="details-panel">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} style={{ color: 'hsl(255,85%,65%)' }} /> Document Vault
                    </h3>

                    {/* Property-level document hash */}
                    {property.documentHash && (
                        <div style={{
                            marginBottom: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.15)',
                            borderRadius: '0.75rem', border: '1px solid var(--border-subtle)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(139,92,246,0.12)' }}>
                                    <Hash size={16} style={{ color: 'hsl(255,85%,65%)' }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.15rem' }}>Title Deed Hash</p>
                                    <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'hsl(220,15%,60%)', wordBreak: 'break-all' }}>{property.documentHash}</p>
                                </div>
                            </div>
                            <button onClick={() => handleCopy(property.documentHash, 'dochash')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === 'dochash' ? 'hsl(142,71%,45%)' : 'hsl(220,15%,60%)', padding: '0.3rem' }}>
                                {copied === 'dochash' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                            </button>
                        </div>
                    )}

                    {documents.length === 0 && !property.documentHash ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(220,15%,60%)', background: 'rgba(0,0,0,0.1)', borderRadius: '0.75rem', border: '1px dashed var(--border-subtle)' }}>
                            <FileText size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.85rem' }}>No documents found for this asset</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {documents.map((doc) => (
                                <div key={doc.id || doc.document_hash} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.875rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)',
                                    borderRadius: '0.75rem', transition: 'background 0.2s',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ padding: '0.4rem', borderRadius: '0.5rem', background: 'rgba(59,130,246,0.12)' }}>
                                            <FileText size={16} style={{ color: 'hsl(200,85%,55%)' }} />
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.15rem' }}>{doc.document_type || 'Document'}</p>
                                            <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'hsl(220,15%,60%)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {doc.ipfs_hash || doc.document_hash}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="btn btn-ghost" style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }}>
                                        <ExternalLink size={13} /> IPFS
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ─── Transaction History ─── */}
                <div className="details-panel">
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity size={20} style={{ color: 'hsl(255,85%,65%)' }} /> Transaction History
                    </h3>

                    {transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'hsl(220,15%,60%)', background: 'rgba(0,0,0,0.1)', borderRadius: '0.75rem', border: '1px dashed var(--border-subtle)' }}>
                            <Activity size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.85rem' }}>No transaction history for this property</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            {transactions.map((tx) => {
                                const isSeller = tx.sellerWallet?.toLowerCase() === account?.toLowerCase();
                                const txStatusConfig = {
                                    completed: { badgeClass: 'badge-success', color: 'hsl(142,71%,45%)' },
                                    cancelled: { badgeClass: 'badge-danger', color: 'hsl(348,83%,47%)' },
                                    expired: { badgeClass: 'badge-neutral', color: 'hsl(220,15%,60%)' },
                                };
                                const tsc = txStatusConfig[tx.status] || { badgeClass: 'badge-warning-glow', color: 'hsl(38,92%,50%)' };

                                return (
                                    <div key={tx.id} className="tx-row">
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                                                {isSeller
                                                    ? <ArrowUpRight size={14} style={{ color: 'hsl(280,80%,60%)' }} />
                                                    : <ArrowDownLeft size={14} style={{ color: 'hsl(200,85%,55%)' }} />
                                                }
                                                <span className="badge badge-neutral" style={{ fontSize: '0.55rem' }}>{isSeller ? 'SOLD' : 'BOUGHT'}</span>
                                                <span className={`badge ${tsc.badgeClass}`} style={{ fontSize: '0.55rem' }}>{tx.status?.toUpperCase()}</span>
                                                {tx.txHash && (
                                                    <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: 'hsl(220,15%,60%)' }}>
                                                        TX: {tx.txHash.slice(0, 10)}...
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'hsl(220,15%,60%)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                    <Wallet size={11} /> Buyer: <span style={{ fontFamily: 'monospace' }}>{tx.buyerWallet?.slice(0, 8)}...</span>
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                    <Wallet size={11} /> Seller: <span style={{ fontFamily: 'monospace' }}>{tx.sellerWallet?.slice(0, 8)}...</span>
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.4rem', fontSize: '0.7rem', color: 'hsl(220,15%,60%)' }}>
                                                <span>Buyer: {tx.buyerSigned ? '✓ Signed' : '✗ Pending'}</span>
                                                <span>Seller: {tx.sellerSigned ? '✓ Signed' : '✗ Pending'}</span>
                                                <span>Authority: {tx.authoritySigned ? '✓ Signed' : '✗ Pending'}</span>
                                                <span>Funds: {tx.fundsBlocked ? '✓ Blocked' : '✗ Pending'}</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: 800, fontSize: '1.1rem', color: 'hsl(142,71%,45%)', textShadow: '0 0 6px rgba(34,197,94,0.2)' }}>
                                                ₹{Number(tx.salePrice).toLocaleString('en-IN')}
                                            </p>
                                            <p style={{ fontSize: '0.65rem', color: 'hsl(220,15%,60%)', display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                                <Clock size={10} /> {new Date(tx.createdAt).toLocaleDateString()}
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
