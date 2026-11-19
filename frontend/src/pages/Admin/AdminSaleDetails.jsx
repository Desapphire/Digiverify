import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { adminService } from '../../services/admin.service';
import { propertyService } from '../../services/property.service';
import { riskService } from '../../services/risk.service';
import RiskAnalysisWidget from '../../components/RiskAnalysisWidget';
import {
    Activity, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Wallet, ArrowRight,
    ChevronDown, ChevronUp, ShieldCheck, Clock,
    Ban, Landmark, Hash, FileCheck, BrainCircuit,
    ArrowLeft, Check, Copy, UserCheck, AlertTriangle,
    BadgeDollarSign, Sparkles, Building2, Shield, AlertCircle,
    User, ExternalLink
} from 'lucide-react';

const AdminSaleDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [sale, setSale] = useState(null);
    const [property, setProperty] = useState(null);
    const [buyerUser, setBuyerUser] = useState(null);
    const [sellerUser, setSellerUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copiedField, setCopiedField] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state for Action Reasoning
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', error: '' });
    const [actionReason, setActionReason] = useState('');

    const fetchAllDetails = async () => {
        if (!id) return;
        setLoading(true);
        setError('');

        try {
            const saleRes = await saleService.getSaleById(id);
            const s = saleRes.data?.data;
            if (!s) {
                setError('Sale transaction record not found.');
                setLoading(false);
                return;
            }
            setSale(s);

            // Fetch property, buyer, and seller profiles in parallel
            const [propRes, buyerRes, sellerRes] = await Promise.allSettled([
                s.propertyId ? propertyService.getPropertyById(s.propertyId) : Promise.reject(),
                s.buyerWallet ? adminService.lookupWallet(s.buyerWallet) : Promise.reject(),
                s.sellerWallet ? adminService.lookupWallet(s.sellerWallet) : Promise.reject()
            ]);

            if (propRes.status === 'fulfilled' && propRes.value.data?.data) {
                setProperty(propRes.value.data.data);
            }
            if (buyerRes.status === 'fulfilled' && buyerRes.value.data?.data?.user) {
                setBuyerUser(buyerRes.value.data.data.user);
            }
            if (sellerRes.status === 'fulfilled' && sellerRes.value.data?.data?.user) {
                setSellerUser(sellerRes.value.data.data.user);
            }
        } catch (err) {
            console.error('Failed to load sale transaction details:', err);
            setError(err.response?.data?.message || 'Failed to load sale details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllDetails();
    }, [id]);

    const handleCopy = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(key);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const openActionModal = (type) => {
        setActionModal({ isOpen: true, type, error: '' });
        setActionReason('');
    };

    const confirmAction = async () => {
        const { type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (!trimmedReason && type !== 'approve') {
            setActionModal(prev => ({ ...prev, error: `Please provide a reason to reject this sale.` }));
            return;
        }

        setActionLoading(true);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveSale(sale.id, trimmedReason || 'Approved by Land Authority Chief Registrar');
            } else {
                await adminService.rejectSale(sale.id, trimmedReason);
            }
            await fetchAllDetails();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed to process.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!window.confirm('Execute final title deed transfer and complete this sale on-chain?')) return;
        setActionLoading(true);
        try {
            await adminService.completeSale(sale.id);
            await fetchAllDetails();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to complete sale transaction.');
        } finally {
            setActionLoading(false);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';
    const shortenId = (uuid) => uuid ? uuid.slice(0, 8) : '—';

    const getStatusBadge = (status) => {
        switch (status) {
            case 'completed':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', textTransform: 'uppercase' }}>
                        Completed & Deed Transferred
                    </span>
                );
            case 'authority_approved':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', textTransform: 'uppercase' }}>
                        Authority Approved
                    </span>
                );
            case 'buyer_signed':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', textTransform: 'uppercase' }}>
                        Buyer Signed
                    </span>
                );
            case 'funds_blocked':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', color: '#B45309', textTransform: 'uppercase' }}>
                        Funds Blocked in Escrow
                    </span>
                );
            case 'cancelled':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', textTransform: 'uppercase' }}>
                        Cancelled
                    </span>
                );
            default:
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569', textTransform: 'uppercase' }}>
                        {status || 'Initiated'}
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: '#2563EB' }} />
                <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>Loading sale conveyance dossier...</span>
            </div>
        );
    }

    if (error || !sale) {
        return (
            <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '2rem', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <AlertCircle size={44} style={{ color: '#DC2626', margin: '0 auto 1rem auto' }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Sale Record Not Found</h2>
                <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.5rem' }}>{error || 'Unable to locate this sale transaction.'}</p>
                <button
                    onClick={() => navigate('/authority/sale')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <ArrowLeft size={16} /> Back to Property Sales Directory
                </button>
            </div>
        );
    }

    const rawPrice = Number(sale.salePrice ?? sale.sale_price ?? sale.price ?? 0);
    const formattedPrice = !isNaN(rawPrice) && rawPrice > 0 ? rawPrice.toLocaleString('en-IN') : '—';
    const stampDuty = rawPrice > 0 ? Math.round(rawPrice * 0.05) : 0;
    const regFee = rawPrice > 0 ? Math.round(rawPrice * 0.01) : 0;
    const totalStatutoryDuty = stampDuty + regFee;

    return (
        <div style={{ width: '100%', maxWidth: '1350px', margin: '0 auto', paddingBottom: '3rem' }}>
            
            {/* Top Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                    onClick={() => navigate('/authority/sale')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#64748B',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '6px 0',
                        transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#2563EB'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
                >
                    <ArrowLeft size={16} />
                    <span>Back to Property Sales Directory</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Sale Order UUID:</span>
                    <code style={{ fontSize: '0.78rem', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', color: '#0F172A', fontWeight: 700 }}>
                        {sale.id}
                    </code>
                    <button
                        onClick={() => handleCopy(sale.id, 'sale-id')}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedField === 'sale-id' ? '#059669' : '#64748B', padding: '4px' }}
                    >
                        {copiedField === 'sale-id' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            {/* Master Header Card */}
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '1.75rem 2rem',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '14px',
                        backgroundColor: '#EFF6FF',
                        border: '1px solid #BFDBFE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#1D4ED8',
                        flexShrink: 0
                    }}>
                        <FileCheck size={32} />
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <span style={{
                                fontSize: '0.88rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: '#0F172A',
                                backgroundColor: '#F1F5F9',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #E2E8F0'
                            }}>
                                SALE #{shortenId(sale.id)}
                            </span>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                padding: '4px 12px',
                                borderRadius: '8px'
                            }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1E40AF', textTransform: 'uppercase' }}>Agreed Consideration:</span>
                                <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#1E3A8A' }}>₹{formattedPrice}</span>
                            </div>
                            {getStatusBadge(sale.status)}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '0.85rem', color: '#64748B', flexWrap: 'wrap' }}>
                            <span>
                                Escrow Status:{' '}
                                <strong style={{ color: sale.fundsBlocked ? '#059669' : '#D97706' }}>
                                    {sale.fundsBlocked ? '✓ Funds Held in Escrow' : '⏳ Escrow Payment Pending'}
                                </strong>
                            </span>
                            <span>•</span>
                            <span>
                                On-Chain Sale ID: <code style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 700 }}>{sale.onChainId ? `#${sale.onChainId}` : 'Off-Chain Draft'}</code>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary Governance Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {!sale.authoritySigned && sale.status !== 'completed' && sale.status !== 'cancelled' && (
                        <>
                            <button
                                onClick={() => openActionModal('approve')}
                                disabled={actionLoading}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    backgroundColor: '#10B981',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
                                }}
                            >
                                <CheckCircle2 size={16} />
                                Approve Conveyance
                            </button>

                            <button
                                onClick={() => openActionModal('reject')}
                                disabled={actionLoading}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: '10px',
                                    fontSize: '0.85rem',
                                    fontWeight: 800,
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <XCircle size={16} />
                                Reject
                            </button>
                        </>
                    )}

                    {sale.authoritySigned && sale.status !== 'completed' && sale.status !== 'cancelled' && (
                        <button
                            onClick={handleComplete}
                            disabled={actionLoading}
                            style={{
                                padding: '10px 22px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                backgroundColor: '#1E3A8A',
                                color: '#FFFFFF',
                                border: 'none',
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 12px rgba(30, 58, 138, 0.25)'
                            }}
                        >
                            <Sparkles size={16} />
                            Execute Title Transfer On-Chain
                        </button>
                    )}
                </div>
            </div>

            {/* 2-Column Responsive Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
                gap: '1.5rem',
                alignItems: 'start'
            }}>
                
                {/* Left Column: Escrow Signatures & Property Information */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* 1. Tripartite Escrow Signatures */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '1.75rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    backgroundColor: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#2563EB'
                                }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                                        Escrow Multi-Sig Protocol
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                                        4-way cryptographic validation pipeline
                                    </span>
                                </div>
                            </div>

                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                backgroundColor: (sale.sellerSigned && sale.fundsBlocked && sale.buyerSigned && sale.authoritySigned) ? '#DCFCE7' : '#EFF6FF',
                                border: `1px solid ${(sale.sellerSigned && sale.fundsBlocked && sale.buyerSigned && sale.authoritySigned) ? '#86EFAC' : '#BFDBFE'}`,
                                color: (sale.sellerSigned && sale.fundsBlocked && sale.buyerSigned && sale.authoritySigned) ? '#15803D' : '#1D4ED8'
                            }}>
                                {(sale.sellerSigned && sale.fundsBlocked && sale.buyerSigned && sale.authoritySigned) ? 'Protocol Fully Signed' : 'In Progress'}
                            </span>
                        </div>

                        {/* Pipeline Process Flow */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                            {/* Step 1: Seller */}
                            <div style={{
                                padding: '14px 12px',
                                borderRadius: '12px',
                                backgroundColor: sale.sellerSigned ? '#F0FDF4' : '#F8FAFC',
                                border: `1px solid ${sale.sellerSigned ? '#BBF7D0' : '#E2E8F0'}`,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        color: sale.sellerSigned ? '#166534' : '#64748B',
                                        backgroundColor: sale.sellerSigned ? '#DCFCE7' : '#FFFFFF',
                                        border: `1px solid ${sale.sellerSigned ? '#86EFAC' : '#CBD5E1'}`,
                                        padding: '1px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        STEP 1
                                    </span>
                                    {sale.sellerSigned ? (
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    ) : (
                                        <Clock size={16} style={{ color: '#D97706' }} />
                                    )}
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                                        Grantor Seller
                                    </span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: sale.sellerSigned ? '#0F172A' : '#64748B' }}>
                                        {sale.sellerSigned ? 'Deed Signed' : 'Awaiting Sign'}
                                    </span>
                                </div>
                            </div>

                            {/* Step 2: Payment Hold */}
                            <div style={{
                                padding: '14px 12px',
                                borderRadius: '12px',
                                backgroundColor: sale.fundsBlocked ? '#F0FDF4' : '#F8FAFC',
                                border: `1px solid ${sale.fundsBlocked ? '#BBF7D0' : '#E2E8F0'}`,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        color: sale.fundsBlocked ? '#166534' : '#64748B',
                                        backgroundColor: sale.fundsBlocked ? '#DCFCE7' : '#FFFFFF',
                                        border: `1px solid ${sale.fundsBlocked ? '#86EFAC' : '#CBD5E1'}`,
                                        padding: '1px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        STEP 2
                                    </span>
                                    {sale.fundsBlocked ? (
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    ) : (
                                        <Clock size={16} style={{ color: '#D97706' }} />
                                    )}
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                                        Bank Escrow
                                    </span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: sale.fundsBlocked ? '#0F172A' : '#64748B' }}>
                                        {sale.fundsBlocked ? 'Funds Blocked' : 'Awaiting Hold'}
                                    </span>
                                </div>
                            </div>

                            {/* Step 3: Buyer */}
                            <div style={{
                                padding: '14px 12px',
                                borderRadius: '12px',
                                backgroundColor: sale.buyerSigned ? '#F0FDF4' : '#F8FAFC',
                                border: `1px solid ${sale.buyerSigned ? '#BBF7D0' : '#E2E8F0'}`,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        color: sale.buyerSigned ? '#166534' : '#64748B',
                                        backgroundColor: sale.buyerSigned ? '#DCFCE7' : '#FFFFFF',
                                        border: `1px solid ${sale.buyerSigned ? '#86EFAC' : '#CBD5E1'}`,
                                        padding: '1px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        STEP 3
                                    </span>
                                    {sale.buyerSigned ? (
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    ) : (
                                        <Clock size={16} style={{ color: '#D97706' }} />
                                    )}
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                                        Grantee Buyer
                                    </span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: sale.buyerSigned ? '#0F172A' : '#64748B' }}>
                                        {sale.buyerSigned ? 'Deed Signed' : 'Awaiting Sign'}
                                    </span>
                                </div>
                            </div>

                            {/* Step 4: Authority */}
                            <div style={{
                                padding: '14px 12px',
                                borderRadius: '12px',
                                backgroundColor: sale.authoritySigned ? '#F0FDF4' : '#F8FAFC',
                                border: `1px solid ${sale.authoritySigned ? '#BBF7D0' : '#E2E8F0'}`,
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        color: sale.authoritySigned ? '#166534' : '#64748B',
                                        backgroundColor: sale.authoritySigned ? '#DCFCE7' : '#FFFFFF',
                                        border: `1px solid ${sale.authoritySigned ? '#86EFAC' : '#CBD5E1'}`,
                                        padding: '1px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        STEP 4
                                    </span>
                                    {sale.authoritySigned ? (
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF' }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    ) : (
                                        <Clock size={16} style={{ color: '#D97706' }} />
                                    )}
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>
                                        Chief Registrar
                                    </span>
                                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: sale.authoritySigned ? '#0F172A' : '#64748B' }}>
                                        {sale.authoritySigned ? 'Title Approved' : 'Review Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {sale.blockchainTxHash && (
                            <div style={{ marginTop: '1.25rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>On-Chain Transaction Settlement</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <code style={{ fontSize: '0.8rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '4px 10px', borderRadius: '6px', color: '#0F172A', wordBreak: 'break-all', flex: 1 }}>
                                        {sale.blockchainTxHash}
                                    </code>
                                    <a
                                        href={`https://sepolia.etherscan.io/tx/${sale.blockchainTxHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.8rem', fontWeight: 700, color: '#2563EB', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        Etherscan <ExternalLink size={12} />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. Associated Property Title Record */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '16px',
                        padding: '1.75rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#059669'
                                }}>
                                    <Building2 size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.01em' }}>
                                        Target Land Title
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>
                                        Cadastral registry record & encumbrance check
                                    </span>
                                </div>
                            </div>

                            {property && (
                                <button
                                    onClick={() => navigate(`/authority/property/${property.id}`)}
                                    style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        color: '#2563EB',
                                        backgroundColor: '#EFF6FF',
                                        border: '1px solid #BFDBFE',
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        transition: 'all 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
                                >
                                    <span>Full Land Dossier</span>
                                    <ArrowRight size={13} />
                                </button>
                            )}
                        </div>

                        {property ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Property Code</span>
                                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0F172A', fontFamily: 'monospace' }}>
                                        {property.propertyCode || `PROP-${property.id.slice(0, 8)}`}
                                    </span>
                                </div>

                                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Survey Number</span>
                                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0F172A' }}>
                                        #{property.surveyNumber || 'N/A'}
                                    </span>
                                </div>

                                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Land Area</span>
                                    <span style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0F172A' }}>
                                        {property.areaSqft ? `${Number(property.areaSqft).toLocaleString()} sq.ft` : '—'}
                                    </span>
                                </div>

                                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>District & State</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
                                        {property.district || property.city}, {property.state}
                                    </span>
                                </div>

                                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Zoning Classification</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
                                        {property.propertyType || 'Residential Plot'}
                                    </span>
                                </div>

                                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Title Encumbrance</span>
                                    <span style={{
                                        fontSize: '0.78rem',
                                        fontWeight: 800,
                                        color: property.encumbranceStatus ? '#DC2626' : '#059669',
                                        backgroundColor: property.encumbranceStatus ? '#FEF2F2' : '#ECFDF5',
                                        border: `1px solid ${property.encumbranceStatus ? '#FECACA' : '#A7F3D0'}`,
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        display: 'inline-block'
                                    }}>
                                        {property.encumbranceStatus ? 'Locked / Lien Active' : 'Clean Title'}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                                Property ID: <code style={{ fontSize: '0.8rem' }}>{sale.propertyId}</code>
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Column: Buyer, Seller & Revenue Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* 3. Buyer & Seller Parties */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <User size={18} style={{ color: '#2563EB' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Conveyance Counterparties
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* Seller */}
                            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Seller (Grantor)</span>
                                    {sellerUser && (
                                        <button
                                            onClick={() => navigate(`/authority/kyc/${sellerUser.id}`)}
                                            style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            View KYC
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                                    {sellerUser?.name || 'Registered Seller'}
                                </span>
                                <code style={{ fontSize: '0.75rem', color: '#64748B', wordBreak: 'break-all' }}>
                                    {sale.sellerWallet}
                                </code>
                            </div>

                            {/* Buyer */}
                            <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Buyer (Grantee)</span>
                                    {buyerUser && (
                                        <button
                                            onClick={() => navigate(`/authority/kyc/${buyerUser.id}`)}
                                            style={{ background: 'transparent', border: 'none', color: '#2563EB', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            View KYC
                                        </button>
                                    )}
                                </div>
                                <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', display: 'block' }}>
                                    {buyerUser?.name || 'Registered Buyer'}
                                </span>
                                <code style={{ fontSize: '0.75rem', color: '#64748B', wordBreak: 'break-all' }}>
                                    {sale.buyerWallet}
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* 4. Statutory Duty & Revenue Assessment */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <BadgeDollarSign size={18} style={{ color: '#D97706' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Statutory Duty & Revenue Assessment
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: '#64748B' }}>Stamp Duty (5.0%):</span>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{stampDuty.toLocaleString('en-IN')}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span style={{ color: '#64748B' }}>Registration Fee (1.0%):</span>
                                <span style={{ fontWeight: 700, color: '#0F172A' }}>₹{regFee.toLocaleString('en-IN')}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
                                <span style={{ fontWeight: 800, color: '#0F172A' }}>Total Treasury Levy:</span>
                                <span style={{ fontWeight: 900, color: '#1D4ED8' }}>₹{totalStatutoryDuty.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* Action Governance Modal */}
            {actionModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1.5rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        maxWidth: '560px',
                        width: '100%',
                        padding: '1.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        border: '1px solid #E2E8F0'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                backgroundColor: actionModal.type === 'approve' ? '#ECFDF5' : '#FEF2F2',
                                color: actionModal.type === 'approve' ? '#047857' : '#DC2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {actionModal.type === 'approve' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                    {actionModal.type === 'approve' ? 'Approve Property Sale' : 'Reject Property Sale'}
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                                    Sale Order: #{shortenId(sale.id)} • Agreed ₹{formattedPrice}
                                </p>
                            </div>
                        </div>

                        {actionModal.error && (
                            <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                                {actionModal.error}
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                {actionModal.type === 'approve' ? 'Official Registrar Remarks (Optional):' : 'Reason for Rejection *:'}
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder={actionModal.type === 'approve' ? 'e.g. Cadastral records verified and stamp duty payment satisfied.' : 'e.g. Valuation significantly below circle guidance value.'}
                                rows={3}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #CBD5E1',
                                    fontSize: '0.85rem',
                                    color: '#0F172A',
                                    outline: 'none',
                                    resize: 'vertical',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={() => setActionModal({ isOpen: false, type: '', error: '' })}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    color: '#475569',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmAction}
                                disabled={actionLoading}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    backgroundColor: actionModal.type === 'approve' ? '#10B981' : '#DC2626',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                                {actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSaleDetails;
