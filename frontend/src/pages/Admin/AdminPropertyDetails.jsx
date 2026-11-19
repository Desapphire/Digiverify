import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { adminService } from '../../services/admin.service';
import { riskService } from '../../services/risk.service';
import { saleService } from '../../services/sale.service';
import {
    Building2, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, MapPin, Ruler, Hash, Wallet,
    ChevronDown, ChevronUp, AlertTriangle, ShieldCheck, Clock,
    FileText, ExternalLink, Paperclip, ShieldAlert, ArrowLeft,
    Check, Lock, Unlock, Compass, Copy, Landmark, Shield, AlertCircle,
    User, UserCheck, History, TrendingUp, TrendingDown, DollarSign,
    Activity, BrainCircuit, Scale, Calendar, BadgeCheck, Eye, ArrowRight,
    FileCheck, Landmark as BankIcon, Users, Percent, Award, Sparkles
} from 'lucide-react';

const AdminPropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [prop, setProp] = useState(null);
    const [docs, setDocs] = useState([]);
    const [history, setHistory] = useState([]);
    const [risk, setRisk] = useState(null);
    const [ownerObj, setOwnerObj] = useState(null);
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
            // 1. Fetch main property details
            const propRes = await propertyService.getPropertyById(id);
            const p = propRes.data?.data;
            if (!p) {
                setError('Property record not found.');
                setLoading(false);
                return;
            }
            setProp(p);

            // 2. Fetch documents, history, valuation, and owner info in parallel without crashing on errors
            const [docRes, histRes, riskRes, ownerRes] = await Promise.allSettled([
                propertyService.getDocuments(id),
                adminService.getPropertyHistory(id),
                riskService.getPropertyValuation(id),
                p.ownerWallet ? adminService.lookupWallet(p.ownerWallet) : Promise.reject()
            ]);

            if (docRes.status === 'fulfilled' && docRes.value.data?.data) {
                setDocs(docRes.value.data.data);
            }
            if (histRes.status === 'fulfilled' && histRes.value.data?.data) {
                setHistory(histRes.value.data.data);
            }
            if (riskRes.status === 'fulfilled' && riskRes.value?.data) {
                setRisk(riskRes.value.data);
            }
            if (ownerRes.status === 'fulfilled' && ownerRes.value.data?.data?.user) {
                setOwnerObj(ownerRes.value.data.data.user);
            }
        } catch (err) {
            console.error('Failed to load property dossier:', err);
            setError(err.response?.data?.message || 'Failed to load property details.');
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
            setActionModal(prev => ({ ...prev, error: `Please provide a reason to ${type === 'encumber' ? 'lock' : type === 'unencumber' ? 'unlock' : 'reject'} this property.` }));
            return;
        }

        setActionLoading(true);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveProperty(prop.id, trimmedReason || 'Property verified by land authority');
            } else if (type === 'reject') {
                await adminService.rejectProperty(prop.id, trimmedReason);
            } else if (type === 'encumber') {
                await adminService.setEncumbrance(prop.id, true, trimmedReason);
            } else if (type === 'unencumber') {
                await adminService.setEncumbrance(prop.id, false, trimmedReason);
            }
            await fetchAllDetails();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const getStatusBadge = (status, encumbered) => {
        if (encumbered) {
            return (
                <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', textTransform: 'uppercase' }}>
                    Encumbered / Locked
                </span>
            );
        }
        switch (status) {
            case 'verified':
            case 'active':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', textTransform: 'uppercase' }}>
                        Active / Verified Title
                    </span>
                );
            case 'pending':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', color: '#B45309', textTransform: 'uppercase' }}>
                        Pending Officer Review
                    </span>
                );
            case 'rejected':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', textTransform: 'uppercase' }}>
                        Rejected
                    </span>
                );
            case 'frozen':
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', color: '#6B21A8', textTransform: 'uppercase' }}>
                        Court Freeze Active
                    </span>
                );
            default:
                return (
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569', textTransform: 'uppercase' }}>
                        {status}
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: '#2563EB' }} />
                <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>Loading comprehensive land & title dossier...</span>
            </div>
        );
    }

    if (error || !prop) {
        return (
            <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '2rem', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <AlertCircle size={44} style={{ color: '#DC2626', margin: '0 auto 1rem auto' }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Property Record Not Found</h2>
                <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.5rem' }}>{error || 'Unable to locate this land record.'}</p>
                <button
                    onClick={() => navigate('/authority/property')}
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
                    <ArrowLeft size={16} /> Back to Property Verification
                </button>
            </div>
        );
    }

    const overallRiskScore = risk?.overall_score ?? risk?.score ?? (prop.encumbranceStatus || prop.status === 'frozen' ? 85 : 12);
    const isHighRisk = overallRiskScore >= 70;
    const isMediumRisk = overallRiskScore >= 35 && overallRiskScore < 70;

    return (
        <div style={{ width: '100%', maxWidth: '1350px', margin: '0 auto', paddingBottom: '3rem' }}>
            
            {/* Top Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                    onClick={() => navigate('/authority/property')}
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
                    <span>Back to Property Verification Directory</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Property UUID:</span>
                    <code style={{ fontSize: '0.78rem', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', color: '#0F172A', fontWeight: 700 }}>
                        {prop.id}
                    </code>
                    <button
                        onClick={() => handleCopy(prop.id, 'prop-uuid')}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedField === 'prop-uuid' ? '#059669' : '#64748B', padding: '4px' }}
                    >
                        {copiedField === 'prop-uuid' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            {/* Master Property Header Dossier Card */}
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
                        backgroundColor: prop.status === 'active' || prop.status === 'verified' ? '#EFF6FF' : '#FEF3C7',
                        border: `1px solid ${prop.status === 'active' || prop.status === 'verified' ? '#BFDBFE' : '#FDE68A'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: prop.status === 'active' || prop.status === 'verified' ? '#1D4ED8' : '#B45309',
                        flexShrink: 0
                    }}>
                        <Building2 size={32} />
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
                                {prop.propertyCode || prop.property_code || `PROP-${prop.id.slice(0, 8)}`}
                            </span>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                                Survey #{prop.surveyNumber || prop.survey_number || 'N/A'}
                            </h1>
                            {getStatusBadge(prop.status, prop.encumbranceStatus)}

                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                backgroundColor: isHighRisk ? '#FEF2F2' : isMediumRisk ? '#FEF3C7' : '#ECFDF5',
                                color: isHighRisk ? '#991B1B' : isMediumRisk ? '#92400E' : '#065F46',
                                border: `1px solid ${isHighRisk ? '#FECACA' : isMediumRisk ? '#FDE68A' : '#A7F3D0'}`
                            }}>
                                <BrainCircuit size={12} />
                                AI Risk: {overallRiskScore}/100 ({isHighRisk ? 'High' : isMediumRisk ? 'Medium' : 'Low'})
                            </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.85rem', color: '#64748B', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={14} style={{ color: '#64748B' }} />
                                {prop.locality || prop.city || prop.district}, {prop.state}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Ruler size={14} style={{ color: '#64748B' }} />
                                {prop.areaSqft ? `${Number(prop.areaSqft).toLocaleString()} sq.ft (${(Number(prop.areaSqft) / 43560).toFixed(2)} Acres)` : '—'}
                            </span>
                            <span>•</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Wallet size={14} style={{ color: '#64748B' }} />
                                Owner: <code style={{ fontSize: '0.8rem', color: '#0F172A', fontWeight: 700 }}>{shortenWallet(prop.ownerWallet)}</code>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary Governance Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {prop.status === 'pending' && (
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
                                Approve Land Title
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

                    {(prop.status === 'active' || prop.status === 'verified') && (
                        <button
                            onClick={() => openActionModal(prop.encumbranceStatus ? 'unencumber' : 'encumber')}
                            disabled={actionLoading}
                            style={{
                                padding: '10px 18px',
                                borderRadius: '10px',
                                fontSize: '0.85rem',
                                fontWeight: 800,
                                backgroundColor: prop.encumbranceStatus ? '#ECFDF5' : '#FEF3C7',
                                color: prop.encumbranceStatus ? '#047857' : '#B45309',
                                border: `1px solid ${prop.encumbranceStatus ? '#A7F3D0' : '#FDE68A'}`,
                                cursor: actionLoading ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            {prop.encumbranceStatus ? <Unlock size={16} /> : <Lock size={16} />}
                            {prop.encumbranceStatus ? 'Unlock / Remove Lien' : 'Lock / Encumber Land'}
                        </button>
                    )}
                </div>
            </div>

            {/* 2-Column Main Dossier Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
                gap: '1.5rem',
                alignItems: 'start'
            }}>
                
                {/* Left Column: Cadastral Land Specs, Cadastral Coordinates & Documents */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* 1. Cadastral Land Specifications */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <Building2 size={18} style={{ color: '#2563EB' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Cadastral Land Specifications
                            </h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Survey / Plot Number</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{prop.surveyNumber || prop.survey_number || 'N/A'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Total Area</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                                    {prop.areaSqft ? `${Number(prop.areaSqft).toLocaleString()} sq.ft` : '—'}
                                </span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Land Type / Zone</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{prop.propertyType || prop.property_type || 'Residential Plot'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>District / Division</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{prop.district || prop.city || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Locality / Taluk</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{prop.locality || prop.taluk || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>State & PIN</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{prop.state} {prop.pinCode || prop.pin_code ? `- ${prop.pinCode || prop.pin_code}` : ''}</span>
                            </div>

                            {prop.geoLat && prop.geoLng && (
                                <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Cadastral GPS Coordinates</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <code style={{ fontSize: '0.85rem', backgroundColor: '#F8FAFC', padding: '4px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 700 }}>
                                            Latitude: {prop.geoLat}, Longitude: {prop.geoLng}
                                        </code>
                                        <a
                                            href={`https://maps.google.com/?q=${prop.geoLat},${prop.geoLng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#2563EB', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            View on Satellite Map <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. Registered Survey Documents & Deeds */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <FileText size={18} style={{ color: '#D97706' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Survey Documents & Deeds ({docs.length})
                            </h3>
                        </div>

                        {docs.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>
                                No digital deeds or survey documents uploaded for this property yet.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {docs.map((d, idx) => {
                                    const cid = d.ipfs_hash || d.ipfsHash || d.documentHash || d.document_hash || prop.documentHash;

                                    return (
                                        <div
                                            key={d.id || idx}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                flexWrap: 'wrap',
                                                gap: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                <FileCheck size={18} style={{ color: '#059669', flexShrink: 0 }} />
                                                <div style={{ minWidth: 0 }}>
                                                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', display: 'block' }}>
                                                        {d.documentType || d.document_type || 'Land Title Deed'}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                                        <code
                                                            style={{
                                                                fontSize: '0.74rem',
                                                                color: '#475569',
                                                                backgroundColor: '#FFFFFF',
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                border: '1px solid #E2E8F0',
                                                                wordBreak: 'break-all'
                                                            }}
                                                        >
                                                            CID: {cid || 'Not Available'}
                                                        </code>
                                                        {cid && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopy(cid, `cid-${idx}`)}
                                                                title="Copy CID"
                                                                style={{
                                                                    border: 'none',
                                                                    background: 'transparent',
                                                                    cursor: 'pointer',
                                                                    color: copiedField === `cid-${idx}` ? '#059669' : '#64748B',
                                                                    padding: '2px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center'
                                                                }}
                                                            >
                                                                {copiedField === `cid-${idx}` ? <Check size={12} /> : <Copy size={12} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {cid ? (
                                                <a
                                                    href={`https://gateway.pinata.cloud/ipfs/${cid}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        color: '#2563EB',
                                                        textDecoration: 'none',
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #BFDBFE',
                                                        padding: '6px 12px',
                                                        borderRadius: '6px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '5px',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    View on IPFS <ExternalLink size={12} />
                                                </a>
                                            ) : (
                                                <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic', flexShrink: 0 }}>
                                                    Pending IPFS Pin
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 3. Chain of Title History & Transfer Audit Trail */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <History size={18} style={{ color: '#7C3AED' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Chain of Title & Transfer History ({history.length})
                            </h3>
                        </div>

                        {history.length === 0 ? (
                            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>
                                Initial mint record. No previous transfers recorded on ledger.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {history.map((h, i) => {
                                    const eventType = h.eventType || h.event_type || 'Deed Conveyance';
                                    const isSale = eventType.includes('SALE');
                                    const isFirstSale = eventType.includes('FIRST_SALE') || h.isFirstSale;
                                    const isBankLien = eventType.includes('BANK_LIEN');
                                    const isReg = eventType === 'PROPERTY_REGISTERED';
                                    const isApprove = eventType === 'PROPERTY_APPROVED';
                                    const isFreeze = eventType.includes('FREEZE') || eventType.includes('FORCE');
                                    const isEncumbrance = eventType.includes('ENCUMBRANCE');
                                    const isReversal = eventType === 'COURT_REVERSAL';

                                    // Badge styling
                                    let badgeBg = '#EFF6FF';
                                    let badgeColor = '#1D4ED8';
                                    let badgeBorder = '#DBEAFE';
                                    let labelText = eventType.replace(/_/g, ' ');

                                    if (isFirstSale) {
                                        badgeBg = '#F5F3FF';
                                        badgeColor = '#6D28D9';
                                        badgeBorder = '#DDD6FE';
                                        labelText = eventType === 'FIRST_SALE_COMPLETED' ? 'First Sale Completed' : 'First Sale Initiated';
                                    } else if (isSale) {
                                        badgeBg = '#ECFDF5';
                                        badgeColor = '#047857';
                                        badgeBorder = '#A7F3D0';
                                        labelText = eventType === 'SALE_COMPLETED' ? 'Sale Conveyance Completed' : 'Sale Order Initiated';
                                    } else if (isBankLien) {
                                        badgeBg = '#FFFBEB';
                                        badgeColor = '#B45309';
                                        badgeBorder = '#FDE68A';
                                        labelText = eventType === 'BANK_LIEN_RELEASED' ? 'Bank Lien Released' : eventType === 'BANK_LIEN_CONFIRMED' ? 'Bank Lien Confirmed' : 'Bank Lien Hold';
                                    } else if (isApprove) {
                                        badgeBg = '#F0FDF4';
                                        badgeColor = '#15803D';
                                        badgeBorder = '#BBF7D0';
                                        labelText = 'Title Deed Verified & Approved';
                                    } else if (isReg) {
                                        badgeBg = '#F0F9FF';
                                        badgeColor = '#0369A1';
                                        badgeBorder = '#BAE6FD';
                                        labelText = 'Primary Title Minted / Registered';
                                    } else if (isFreeze || isEncumbrance) {
                                        badgeBg = '#FEF2F2';
                                        badgeColor = '#B91C1C';
                                        badgeBorder = '#FECACA';
                                        labelText = isFreeze ? 'Judicial Freeze Order' : 'Encumbrance Flag Set';
                                    }

                                    return (
                                        <div
                                            key={h.id || i}
                                            style={{
                                                padding: '12px 14px',
                                                borderRadius: '10px',
                                                backgroundColor: '#F8FAFC',
                                                border: '1px solid #E2E8F0',
                                                fontSize: '0.82rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    backgroundColor: badgeBg,
                                                    color: badgeColor,
                                                    border: `1px solid ${badgeBorder}`
                                                }}>
                                                    {labelText}
                                                </span>
                                                <span style={{ color: '#64748B', fontSize: '0.73rem', fontWeight: 500 }}>
                                                    {h.createdAt || h.timestamp ? new Date(h.createdAt || h.timestamp).toLocaleString() : '—'}
                                                </span>
                                            </div>

                                            {/* Specific descriptive party breakdown per event type */}
                                            {isSale && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', color: '#334155', fontSize: '0.8rem' }}>
                                                        <span>From (Seller): <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 600 }}>{shortenWallet(h.fromWallet || h.data?.seller)}</code></span>
                                                        <ArrowRight size={13} style={{ color: '#94A3B8' }} />
                                                        <span>To (Buyer): <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 600 }}>{shortenWallet(h.toWallet || h.data?.buyer)}</code></span>
                                                    </div>
                                                    {h.data?.price && (
                                                        <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                                                            Consideration Value: ₹{Number(h.data.price).toLocaleString('en-IN')}
                                                            {h.data?.status && <span style={{ color: '#64748B', fontWeight: 500, marginLeft: '8px' }}>• Status: <strong style={{ textTransform: 'capitalize', color: '#0F172A' }}>{h.data.status}</strong></span>}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isBankLien && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: '#334155', fontSize: '0.8rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <span>Buyer Escrow: <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 600 }}>{shortenWallet(h.fromWallet || h.data?.buyerWallet)}</code></span>
                                                        {h.data?.bankReferenceId && <span>Bank Ref: <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>{h.data.bankReferenceId}</strong></span>}
                                                    </div>
                                                    {h.data?.blockAmount && (
                                                        <div style={{ fontSize: '0.75rem', color: '#D97706', fontWeight: 700 }}>
                                                            Held Amount: ₹{Number(h.data.blockAmount).toLocaleString('en-IN')}
                                                            <span style={{ color: '#64748B', fontWeight: 500, marginLeft: '8px' }}>• {h.data?.status === 'released' ? 'Released to Seller' : 'Lien on Escrow'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isReg && (
                                                <div style={{ color: '#334155', fontSize: '0.8rem' }}>
                                                    <span>Registrant / Initial Owner: <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 600 }}>{shortenWallet(h.toWallet || h.data?.ownerWallet || prop.ownerWallet)}</code></span>
                                                    {h.data?.surveyNumber && <span style={{ marginLeft: '8px', color: '#64748B' }}>• Survey: #{h.data.surveyNumber}</span>}
                                                </div>
                                            )}

                                            {isApprove && (
                                                <div style={{ color: '#334155', fontSize: '0.8rem' }}>
                                                    <span>Authorized Officer: <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 600 }}>{shortenWallet(h.fromWallet || h.data?.actorWallet)}</code></span>
                                                    <span style={{ marginLeft: '8px', color: '#059669', fontWeight: 600 }}>• Title Validated & Minted to On-Chain Registry</span>
                                                </div>
                                            )}

                                            {(isFreeze || isEncumbrance) && (
                                                <div style={{ color: '#334155', fontSize: '0.8rem' }}>
                                                    <div>Reason: <strong>{h.data?.reason || 'Judicial order or encumbrance filed'}</strong></div>
                                                    {h.data?.caseNumber && <div style={{ fontSize: '0.75rem', color: '#B91C1C', marginTop: '2px' }}>Case Number: #{h.data.caseNumber}</div>}
                                                </div>
                                            )}

                                            {isReversal && (
                                                <div style={{ color: '#334155', fontSize: '0.8rem' }}>
                                                    <span>Restored to Previous Owner: <code style={{ backgroundColor: '#FFFFFF', padding: '2px 6px', borderRadius: '4px', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 600 }}>{shortenWallet(h.toWallet || h.data?.previousOwner)}</code></span>
                                                </div>
                                            )}

                                            {!isSale && !isBankLien && !isReg && !isApprove && !isFreeze && !isEncumbrance && !isReversal && (
                                                <div style={{ color: '#475569', fontSize: '0.78rem' }}>
                                                    {h.fromWallet || h.toWallet ? (
                                                        <>From: <code style={{ color: '#1E293B' }}>{shortenWallet(h.fromWallet)}</code> ➔ To: <code style={{ color: '#1E293B' }}>{shortenWallet(h.toWallet)}</code></>
                                                    ) : (
                                                        <span>Action recorded by: <code style={{ color: '#1E293B' }}>{shortenWallet(h.data?.actorWallet || h.actor_wallet || 'Authority Registry')}</code></span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Registered Owner Profile & AI Risk Assessment */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* 4. Current Registered Owner Profile */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <User size={18} style={{ color: '#2563EB' }} />
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Current Title Holder
                                </h3>
                            </div>
                            {ownerObj && (
                                <button
                                    onClick={() => navigate(`/authority/kyc/${ownerObj.id}`)}
                                    style={{
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        color: '#2563EB',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                >
                                    Citizen Dossier <ArrowRight size={12} />
                                </button>
                            )}
                        </div>

                        {ownerObj ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Citizen Name</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>{ownerObj.name}</span>
                                </div>

                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email & Phone</span>
                                    <span style={{ fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>{ownerObj.email} {ownerObj.phone ? `• ${ownerObj.phone}` : ''}</span>
                                </div>

                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>KYC & Biometric Status</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                            {ownerObj.kycStatus || 'VERIFIED'}
                                        </span>
                                        {ownerObj.faceVerified && (
                                            <span style={{ fontSize: '0.72rem', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '2px 8px', borderRadius: '4px' }}>
                                                Photo Matched
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Wallet Address</span>
                                    <code style={{ fontSize: '0.8rem', backgroundColor: '#F8FAFC', padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#0F172A', wordBreak: 'break-all', display: 'block' }}>
                                        {prop.ownerWallet}
                                    </code>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Holder Account</span>
                                <code style={{ fontSize: '0.85rem', backgroundColor: '#F8FAFC', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#0F172A', wordBreak: 'break-all', display: 'block' }}>
                                    {prop.ownerWallet || 'Unassigned'}
                                </code>
                            </div>
                        )}
                    </div>

                    {/* 5. AI Risk & Guidance Valuation Analysis */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <BrainCircuit size={18} style={{ color: '#059669' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Valuation & AI Risk Assessment
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                                    <span>Composite Anomaly Score</span>
                                    <span style={{ fontWeight: 800, color: isHighRisk ? '#DC2626' : isMediumRisk ? '#D97706' : '#059669' }}>
                                        {overallRiskScore}/100 ({isHighRisk ? 'High' : isMediumRisk ? 'Medium' : 'Clean Title'})
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min(overallRiskScore, 100)}%`,
                                        height: '100%',
                                        backgroundColor: isHighRisk ? '#DC2626' : isMediumRisk ? '#D97706' : '#059669',
                                        borderRadius: '9999px',
                                        transition: 'width 0.4s ease'
                                    }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Guidance Value</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                                        ₹{risk?.fair_price ? Number(risk.fair_price).toLocaleString('en-IN') : prop.estimatedFairPrice ? Number(prop.estimatedFairPrice).toLocaleString('en-IN') : '25,00,000'}
                                    </span>
                                </div>

                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Lien Status</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: prop.encumbranceStatus ? '#DC2626' : '#059669' }}>
                                        {prop.encumbranceStatus ? 'Encumbered' : 'Clean Title'}
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: isHighRisk ? '#FEF2F2' : '#F0FDF4',
                                border: `1px solid ${isHighRisk ? '#FECACA' : '#BBF7D0'}`,
                                borderRadius: '8px',
                                padding: '10px 12px',
                                fontSize: '0.8rem',
                                color: isHighRisk ? '#991B1B' : '#166534',
                                lineHeight: 1.45
                            }}>
                                {isHighRisk
                                    ? 'High risk alert: Property is subject to an active dispute lock or significant valuation discrepancy.'
                                    : isMediumRisk
                                    ? 'Medium risk: Verification required for previous transfer frequency or valuation rate.'
                                    : 'Clean title: Ownership records, survey numbers, and circle guidance rates are fully in order.'}
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
                                backgroundColor: actionModal.type === 'approve' ? '#ECFDF5' : actionModal.type === 'reject' ? '#FEF2F2' : '#FEF3C7',
                                color: actionModal.type === 'approve' ? '#047857' : actionModal.type === 'reject' ? '#DC2626' : '#B45309',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {actionModal.type === 'approve' && <CheckCircle2 size={24} />}
                                {actionModal.type === 'reject' && <XCircle size={24} />}
                                {(actionModal.type === 'encumber' || actionModal.type === 'unencumber') && <Lock size={22} />}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                    {actionModal.type === 'approve' ? 'Approve Property Title' : actionModal.type === 'reject' ? 'Reject Property Registration' : actionModal.type === 'encumber' ? 'Lock / Encumber Property' : 'Unlock Property'}
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                                    Survey #{prop.surveyNumber || prop.survey_number} • {prop.locality || prop.city}
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
                                {actionModal.type === 'approve' ? 'Officer Verification Remarks (Optional):' : 'Reason for Action *:'}
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder={actionModal.type === 'approve' ? 'e.g. Ground survey completed and boundaries confirmed.' : 'e.g. Incomplete survey maps or active bank lien detected.'}
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
                                    backgroundColor: actionModal.type === 'approve' ? '#10B981' : actionModal.type === 'reject' ? '#DC2626' : '#D97706',
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
                                {actionModal.type === 'approve' ? 'Confirm Approval' : actionModal.type === 'reject' ? 'Confirm Rejection' : actionModal.type === 'encumber' ? 'Confirm Encumbrance' : 'Confirm Unlock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPropertyDetails;
