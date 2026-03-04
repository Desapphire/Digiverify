import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import {
    Loader2, CheckCircle2, AlertTriangle, Wallet, DollarSign,
    Building, MapPin, ArrowRight, XCircle, Shield, Clock,
    FileCheck, Landmark, Send
} from 'lucide-react';
import './PropertyPages.css';

const SALE_STATUS_FLOW = ['initiated', 'buyer_signed', 'funds_blocked', 'authority_approved', 'completed'];

const PurchaseReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account, connectWallet, signMessage } = useWeb3();

    const [sale, setSale] = useState(null);
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState('');
    const [signSuccess, setSignSuccess] = useState(false);

    const walletAddress = account || user?.walletAddress;
    const isBuyer = walletAddress && sale?.buyerWallet?.toLowerCase() === walletAddress?.toLowerCase();
    const isSeller = walletAddress && sale?.sellerWallet?.toLowerCase() === walletAddress?.toLowerCase();

    useEffect(() => {
        const fetchSale = async () => {
            try {
                setLoading(true);
                const saleRes = await saleService.getSaleById(id);
                const saleData = saleRes.data?.data;
                setSale(saleData);

                if (saleData?.propertyId) {
                    try {
                        const propRes = await propertyService.getPropertyById(saleData.propertyId);
                        setProperty(propRes.data?.data);
                    } catch (e) {
                        console.error('Failed to load property', e);
                    }
                }
            } catch (err) {
                console.error('Failed to load sale', err);
                setError('Sale transaction not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchSale();
    }, [id]);

    const handleSign = async () => {
        try {
            setSigning(true);
            setError('');

            let wallet = account;
            if (!wallet) {
                wallet = await connectWallet();
            }

            const message = `I confirm and sign sale transaction #${sale.id} for property ${property?.surveyNumber || sale.propertyId} at ₹${sale.salePrice?.toLocaleString('en-IN')}`;
            const signature = await signMessage(message);

            await saleService.signSale(sale.id, signature);
            setSignSuccess(true);

            // Refresh sale data
            const updated = await saleService.getSaleById(id);
            setSale(updated.data?.data);
        } catch (err) {
            console.error('Signing failed', err);
            setError(err.response?.data?.message || err.message || 'Failed to sign transaction.');
        } finally {
            setSigning(false);
        }
    };

    const shortenWallet = (addr) => {
        if (!addr) return '—';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const currentFlowIndex = SALE_STATUS_FLOW.indexOf(sale?.status);

    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Transaction...</p>
                </div>
            </div>
        );
    }

    if (error && !sale) {
        return (
            <div className="dashboard-container container-sm">
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <XCircle size={48} style={{ color: 'hsl(var(--color-danger))', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Transaction Not Found</h2>
                    <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/transactions')}>Back to Transactions</button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container container-md">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                        Sale <span className="text-gradient">Review</span>
                    </h1>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                        TX #{sale.id}
                    </span>
                    <span className={`badge ${isBuyer ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>
                        {isBuyer ? 'BUYER' : isSeller ? 'SELLER' : 'VIEWER'}
                    </span>
                </div>
                <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                    Review the sale agreement and transaction details
                </p>
            </div>

            {/* Status Flow */}
            <div className="stepper" style={{ marginBottom: '2rem' }}>
                {SALE_STATUS_FLOW.map((status, i) => {
                    const isCompleted = i < currentFlowIndex;
                    const isActive = i === currentFlowIndex;
                    const icons = [Clock, Wallet, Landmark, Shield, CheckCircle2];
                    const labels = ['Initiated', 'Buyer Signed', 'Funds Blocked', 'Authority Approved', 'Completed'];
                    const Icon = icons[i];
                    return (
                        <div key={status} className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                            <div className="stepper-circle">
                                {isCompleted ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                            </div>
                            <span className="stepper-label">{labels[i]}</span>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Property Details */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Building size={13} /> Property Details
                        </h3>
                        {property ? (
                            <div>
                                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {property.surveyNumber}
                                    {(property.status === 'active' || property.status === 'verified') && <CheckCircle2 size={14} style={{ color: 'hsl(142,71%,45%)' }} />}
                                </h4>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                    <p className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <MapPin size={13} /> {property.district}{property.state ? `, ${property.state}` : ''}
                                    </p>
                                    {property.areaSqft && (
                                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--color-text-secondary))', fontFamily: 'monospace' }}>
                                            {property.areaSqft.toLocaleString()} sq.ft
                                        </p>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'hsl(220,15%,50%)' }}>
                                    Property Code: {property.propertyCode}
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                Property ID: {sale.propertyId}
                            </p>
                        )}
                    </div>

                    {/* Sale Agreement */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <FileCheck size={13} /> Sale Agreement
                        </h3>

                        <div className="info-box-grid" style={{ marginBottom: '1.25rem' }}>
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Sale Price</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 800 }} className="text-gradient">
                                    ₹{sale.salePrice?.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Status</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize' }}>{sale.status?.replace('_', ' ')}</p>
                            </div>
                        </div>

                        <div className="info-box-grid">
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Seller</p>
                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(var(--color-text-secondary))' }}>
                                    {sale.sellerWallet}
                                </p>
                                {isSeller && <span className="badge badge-warning" style={{ fontSize: '0.55rem', marginTop: '0.35rem' }}>YOU</span>}
                            </div>
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Buyer</p>
                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(var(--color-text-secondary))' }}>
                                    {sale.buyerWallet}
                                </p>
                                {isBuyer && <span className="badge badge-info" style={{ fontSize: '0.55rem', marginTop: '0.35rem' }}>YOU</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column — Actions & Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Sign Action (Buyer only, if initiated status) */}
                    {isBuyer && sale.status === 'initiated' && !signSuccess && (
                        <div className="glass-panel-elevated" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 1rem',
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.1))',
                                border: '2px solid rgba(139,92,246,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Send size={22} style={{ color: 'hsl(255,85%,65%)' }} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sign Transaction</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Review the agreement above. Sign with your wallet to confirm acceptance.
                            </p>

                            {error && (
                                <div style={{
                                    background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                                    borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem',
                                    fontSize: '0.8rem', color: 'hsl(var(--color-danger))',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center'
                                }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-glow w-full"
                                disabled={signing}
                                onClick={handleSign}
                                style={{ padding: '0.75rem', fontSize: '0.9rem' }}
                            >
                                {signing ? (
                                    <><Loader2 size={16} className="animate-spin" /> Signing...</>
                                ) : (
                                    <><Wallet size={16} /> Sign with Wallet</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Sign Success */}
                    {signSuccess && (
                        <div className="glass-panel-elevated" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <div className="scale-in" style={{ marginBottom: '1rem' }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto',
                                    background: 'rgba(34,197,94,0.1)', border: '2px solid hsl(142,71%,45%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <CheckCircle2 size={24} style={{ color: 'hsl(142,71%,45%)' }} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'hsl(142,71%,45%)' }}>
                                Transaction Signed!
                            </h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                Proceed to block funds for this purchase.
                            </p>
                            <button
                                className="btn btn-primary btn-glow w-full"
                                onClick={() => navigate(`/sale/${sale.id}/fund-block`)}
                                style={{ padding: '0.75rem', fontSize: '0.9rem' }}
                            >
                                <Landmark size={16} /> Proceed to Fund Blocking <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Fund Blocking CTA (buyer, buyer_signed status) */}
                    {isBuyer && sale.status === 'buyer_signed' && !signSuccess && (
                        <div className="glass-panel-elevated" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <Landmark size={28} style={{ color: 'hsl(255,85%,65%)', marginBottom: '0.75rem' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fund Blocking Required</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                You've signed. Block funds via ASBA to proceed with the sale.
                            </p>
                            <button
                                className="btn btn-primary btn-glow w-full"
                                onClick={() => navigate(`/sale/${sale.id}/fund-block`)}
                                style={{ padding: '0.75rem', fontSize: '0.9rem' }}
                            >
                                <Landmark size={16} /> Block Funds <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Signatures Status */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem' }}>
                            Signature Status
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { label: 'Seller Signed', signed: sale.sellerSigned },
                                { label: 'Buyer Signed', signed: sale.buyerSigned },
                                { label: 'Authority Approved', signed: sale.authoritySigned },
                                { label: 'Funds Blocked', signed: sale.fundsBlocked },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--color-text-secondary))' }}>{item.label}</span>
                                    {item.signed ? (
                                        <CheckCircle2 size={18} style={{ color: 'hsl(142,71%,45%)' }} />
                                    ) : (
                                        <Clock size={18} style={{ color: 'hsl(var(--color-text-muted))' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem' }}>
                            Timeline
                        </h3>
                        <div className="timeline">
                            <div className="timeline-item completed">
                                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sale Initiated</p>
                                <p className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(sale.createdAt)}</p>
                            </div>
                            {sale.updatedAt && sale.updatedAt !== sale.createdAt && (
                                <div className="timeline-item active">
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {sale.status?.replace('_', ' ')}
                                    </p>
                                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(sale.updatedAt)}</p>
                                </div>
                            )}
                            {sale.expiryAt && (
                                <div className="timeline-item">
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Expiry Date</p>
                                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(sale.expiryAt)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseReview;
