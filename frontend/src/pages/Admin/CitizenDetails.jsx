import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    User, Mail, Phone, MapPin, Shield, Calendar, Wallet,
    CheckCircle2, XCircle, RefreshCcw, ArrowLeft, Copy,
    ExternalLink, Camera, FileText, AlertCircle, Loader2,
    Building2, CheckSquare, Square, ChevronRight, Lock, KeyRound
} from 'lucide-react';

const CitizenDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copiedId, setCopiedId] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    // Modal state for Action (Approve / Reject / Request Re-KYC)
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', error: '' });
    const [actionReason, setActionReason] = useState('');
    const [selectedKycParts, setSelectedKycParts] = useState([]);

    const KYC_PART_OPTIONS = [
        { key: 'face', label: 'Photo & Face Match', desc: 'Live camera photo and face check', icon: Camera },
        { key: 'id_doc', label: 'ID Document & Number', desc: 'Government ID card or number', icon: FileText },
        { key: 'birthdate', label: 'Date of Birth & Age', desc: 'Birthdate and age check', icon: Calendar },
        { key: 'address', label: 'Home Address', desc: 'House no., street, PIN code, and state', icon: MapPin },
        { key: 'land_doc', label: 'Land & Property Documents', desc: 'Property ownership papers and deeds', icon: Building2 },
        { key: 'name_contact', label: 'Full Legal Name & Phone', desc: 'Official name and mobile number check', icon: Phone }
    ];

    const toggleKycPart = (key) => {
        setSelectedKycParts(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const fetchCitizen = async () => {
        if (!id) return;
        setLoading(true);
        setError('');
        try {
            const res = await adminService.getUserById(id);
            if (res.data?.success && res.data?.data) {
                setUser(res.data.data);
            } else {
                setError('Citizen record not found.');
            }
        } catch (err) {
            console.error('Failed to load citizen record:', err);
            setError(err.response?.data?.message || 'Failed to load citizen record.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCitizen();
    }, [id]);

    const handleCopyText = (text, key) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(key);
        setTimeout(() => setCopiedId(''), 2000);
    };

    const openActionModal = (type) => {
        setActionModal({ isOpen: true, type, error: '' });
        setActionReason('');
        setSelectedKycParts(type === 'rekyc' ? ['face'] : []);
    };

    const confirmAction = async () => {
        const { type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (type === 'rekyc' && selectedKycParts.length === 0 && !trimmedReason) {
            setActionModal(prev => ({ ...prev, error: 'Please select at least one item or enter instructions for the citizen.' }));
            return;
        }

        if (type === 'reject' && !trimmedReason) {
            setActionModal(prev => ({ ...prev, error: 'Please provide a reason for rejecting this request.' }));
            return;
        }

        setActionLoading(true);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveKyc(user.id, trimmedReason);
            } else if (type === 'rekyc') {
                await adminService.requestReKyc(user.id, trimmedReason, selectedKycParts);
            } else {
                await adminService.rejectKyc(user.id, trimmedReason);
            }
            await fetchCitizen();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const getStatusBadge = (status) => {
        switch (status) {
            case 'verified':
                return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', label: 'Approved Citizen' };
            case 'rejected':
                return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'Rejected' };
            default:
                return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', label: 'Pending Review' };
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem' }}>
                <Loader2 size={36} className="animate-spin" style={{ color: '#2563EB' }} />
                <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>Loading citizen record...</span>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div style={{ maxWidth: '800px', margin: '3rem auto', padding: '2rem', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                <AlertCircle size={44} style={{ color: '#DC2626', margin: '0 auto 1rem auto' }} />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Citizen Not Found</h2>
                <p style={{ fontSize: '0.9rem', color: '#64748B', marginBottom: '1.5rem' }}>{error || 'Unable to locate this citizen record.'}</p>
                <button
                    onClick={() => navigate('/authority/kyc')}
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
                    <ArrowLeft size={16} /> Back to Identity Checks
                </button>
            </div>
        );
    }

    const badge = getStatusBadge(user.kycStatus);
    const age = user.birthdate ? Math.floor((new Date() - new Date(user.birthdate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    return (
        <div style={{ width: '100%', maxWidth: '1300px', margin: '0 auto', paddingBottom: '3rem' }}>
            
            {/* Top Navigation & Breadcrumb */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <button
                    onClick={() => navigate('/authority/kyc')}
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
                    <span>Back to Identity Checks</span>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>Citizen ID:</span>
                    <code style={{ fontSize: '0.78rem', backgroundColor: '#F1F5F9', padding: '3px 8px', borderRadius: '6px', color: '#0F172A', fontWeight: 700 }}>
                        {user.id}
                    </code>
                    <button
                        onClick={() => handleCopyText(user.id, 'top-id')}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === 'top-id' ? '#059669' : '#64748B', padding: '4px' }}
                        title="Copy Citizen ID"
                    >
                        {copiedId === 'top-id' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                </div>
            </div>

            {/* Citizen Master Dossier Header */}
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
                        fontWeight: 900,
                        fontSize: '1.6rem',
                        flexShrink: 0
                    }}>
                        {user.name ? user.name.charAt(0).toUpperCase() : <User size={30} />}
                    </div>

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: '1.65rem', fontWeight: 900, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                                {user.name || 'Unnamed Citizen'}
                            </h1>
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                backgroundColor: badge.bg,
                                border: `1px solid ${badge.border}`,
                                color: badge.text,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                            }}>
                                {badge.label}
                            </span>
                            {(user.faceVerified || user.faceIdHash) && (
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    color: '#047857',
                                    padding: '3px 10px',
                                    borderRadius: '9999px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}>
                                    <Camera size={12} />
                                    Photo Matched
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '6px', fontSize: '0.85rem', color: '#64748B', flexWrap: 'wrap' }}>
                            {user.email && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Mail size={14} style={{ color: '#94A3B8' }} />
                                    {user.email}
                                </span>
                            )}
                            {user.phone && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Phone size={14} style={{ color: '#94A3B8' }} />
                                    {user.phone}
                                </span>
                            )}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontFamily: 'monospace' }}>
                                <Wallet size={14} style={{ color: '#94A3B8' }} />
                                {shortenWallet(user.walletAddress)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary Action Governance Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {user.kycStatus === 'pending' && (
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
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <CheckCircle2 size={16} />
                            Approve Citizen
                        </button>
                    )}

                    <button
                        onClick={() => openActionModal('rekyc')}
                        disabled={actionLoading}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '10px',
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <RefreshCcw size={16} />
                        Request Re-Upload
                    </button>

                    {user.kycStatus === 'pending' && (
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
                                gap: '6px',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <XCircle size={16} />
                            Reject
                        </button>
                    )}
                </div>
            </div>

            {/* Officer Notes banner if present */}
            {user.adminComments && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1rem 1.25rem',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                }}>
                    <AlertCircle size={20} style={{ color: '#1D4ED8', marginTop: '2px', flexShrink: 0 }} />
                    <div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: '#1D4ED8', display: 'block' }}>
                            Official Officer Notes & Directives:
                        </span>
                        <p style={{ margin: '3px 0 0 0', fontSize: '0.9rem', color: '#1E293B', fontWeight: 500 }}>
                            {user.adminComments}
                        </p>
                    </div>
                </div>
            )}

            {/* 2-Column Responsive Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
                gap: '1.5rem',
                alignItems: 'start'
            }}>
                
                {/* Left Column: Personal Identity, KYC Document, Address */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* 1. Core Legal Identity */}
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
                                Personal Legal Identity
                            </h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Full Legal Name</span>
                                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{user.name || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Date of Birth & Age</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                                        {user.birthdate ? new Date(user.birthdate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                                    </span>
                                    {age !== null && (
                                        <span style={{
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            backgroundColor: age >= 18 ? '#ECFDF5' : '#FEF2F2',
                                            color: age >= 18 ? '#047857' : '#DC2626',
                                            border: `1px solid ${age >= 18 ? '#A7F3D0' : '#FECACA'}`
                                        }}>
                                            {age >= 18 ? `${age} yrs (Adult)` : `${age} yrs (Minor)`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Email Address</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{user.email || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Phone Number</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{user.phone || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Platform Role</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E40AF', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '3px 10px', borderRadius: '6px', display: 'inline-block' }}>
                                    {(user.role || 'CITIZEN').toUpperCase()}
                                </span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Registration Date</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                                    {user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Official National ID Documents */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <Shield size={18} style={{ color: '#D97706' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                National ID & Proof Documents
                            </h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Document Type</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A' }}>{user.governmentIdType || 'Aadhaar Card'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>National ID Number</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <code style={{ fontSize: '0.9rem', fontWeight: 700, backgroundColor: '#F8FAFC', padding: '3px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#0F172A' }}>
                                        {user.governmentId || 'Not Provided'}
                                    </code>
                                    {user.governmentId && (
                                        <button
                                            onClick={() => handleCopyText(user.governmentId, 'gid-num')}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === 'gid-num' ? '#059669' : '#64748B' }}
                                        >
                                            {copiedId === 'gid-num' ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {user.governmentIdHash && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Digital ID Vault Record</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <code style={{ fontSize: '0.78rem', backgroundColor: '#F8FAFC', padding: '5px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', color: '#334155', wordBreak: 'break-all', flex: 1 }}>
                                            {user.governmentIdHash}
                                        </code>
                                        <button
                                            onClick={() => handleCopyText(user.governmentIdHash, 'gid-hash')}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === 'gid-hash' ? '#059669' : '#64748B' }}
                                        >
                                            {copiedId === 'gid-hash' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {user.kycDocumentHash && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>IPFS Document CID</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <code style={{ fontSize: '0.8rem', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', padding: '4px 10px', borderRadius: '6px', color: '#1D4ED8', wordBreak: 'break-all' }}>
                                            {user.kycDocumentHash}
                                        </code>
                                        <button
                                            onClick={() => handleCopyText(user.kycDocumentHash, 'ipfs-cid')}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === 'ipfs-cid' ? '#059669' : '#64748B' }}
                                        >
                                            {copiedId === 'ipfs-cid' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                        </button>
                                        <a
                                            href={`https://gateway.pinata.cloud/ipfs/${user.kycDocumentHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: '#2563EB',
                                                textDecoration: 'none',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #BFDBFE',
                                                padding: '4px 10px',
                                                borderRadius: '6px'
                                            }}
                                        >
                                            View Original Document <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Verified Residential Address */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <MapPin size={18} style={{ color: '#059669' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Residential Address
                            </h3>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>House / Flat</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{user.houseNumber || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Locality / Area</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{user.locality || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>City / District</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{user.city || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>PIN Code</span>
                                <code style={{ fontSize: '0.9rem', fontWeight: 800, backgroundColor: '#F1F5F9', padding: '2px 8px', borderRadius: '4px', color: '#0F172A' }}>
                                    {user.pinCode || '—'}
                                </code>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>State</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{user.state || '—'}</span>
                            </div>

                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Country</span>
                                <span style={{ fontSize: '0.92rem', fontWeight: 600, color: '#0F172A' }}>{user.country || 'India'}</span>
                            </div>

                            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Combined Address Line</span>
                                <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#1E293B' }}>
                                    {[user.houseNumber, user.locality, user.city, user.pinCode ? `PIN: ${user.pinCode}` : '', user.state, user.country].filter(Boolean).join(', ') || 'Not Provided'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Photo Match Verification, Web3 Account & Owned Properties */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* 4. Photo & Face Match Seal */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Camera size={18} style={{ color: '#059669' }} />
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Photo & Face Match
                                </h3>
                            </div>
                            <span style={{
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                backgroundColor: user.faceVerified || user.faceIdHash ? '#DCFCE7' : '#FEF3C7',
                                color: user.faceVerified || user.faceIdHash ? '#15803D' : '#B45309',
                                border: `1px solid ${user.faceVerified || user.faceIdHash ? '#86EFAC' : '#FDE68A'}`
                            }}>
                                {user.faceVerified || user.faceIdHash ? 'Photo Matched' : 'Photo Pending'}
                            </span>
                        </div>

                        <div>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                                Biometric Face Hash Seal
                            </span>
                            <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>SHA-256 Hash</span>
                                    {user.faceIdHash && (
                                        <button
                                            onClick={() => handleCopyText(user.faceIdHash, 'face-hash')}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === 'face-hash' ? '#059669' : '#2563EB', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}
                                        >
                                            {copiedId === 'face-hash' ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                                        </button>
                                    )}
                                </div>
                                <code style={{ fontSize: '0.78rem', color: user.faceIdHash ? '#0F172A' : '#94A3B8', wordBreak: 'break-all', display: 'block', fontFamily: 'monospace' }}>
                                    {user.faceIdHash || 'No biometric face hash generated for this citizen yet.'}
                                </code>
                            </div>
                        </div>
                    </div>

                    {/* 5. Web3 Account & On-Chain Wallet Binding */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <Wallet size={18} style={{ color: '#7C3AED' }} />
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Web3 Wallet & On-Chain Account
                            </h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Wallet Address</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <code style={{ fontSize: '0.85rem', fontWeight: 700, backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', padding: '4px 10px', borderRadius: '6px', color: '#6B21A8', wordBreak: 'break-all', flex: 1 }}>
                                        {user.walletAddress || 'Not Connected'}
                                    </code>
                                    {user.walletAddress && (
                                        <button
                                            onClick={() => handleCopyText(user.walletAddress, 'wallet-addr')}
                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: copiedId === 'wallet-addr' ? '#059669' : '#64748B' }}
                                        >
                                            {copiedId === 'wallet-addr' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {user.authNonce && (
                                <div>
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Auth Nonce</span>
                                    <code style={{ fontSize: '0.78rem', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', padding: '3px 8px', borderRadius: '6px', color: '#64748B' }}>
                                        {user.authNonce}
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 6. Owned Properties / Land Titles */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '14px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={18} style={{ color: '#2563EB' }} />
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Registered Properties ({user.properties?.length || 0})
                                </h3>
                            </div>
                        </div>

                        {(!user.properties || user.properties.length === 0) ? (
                            <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>
                                This citizen currently holds no registered land titles.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {user.properties.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => navigate(`/authority/property/${p.id}`)}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '8px',
                                            backgroundColor: '#F8FAFC',
                                            border: '1px solid #E2E8F0',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            transition: 'all 0.15s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = '#EFF6FF';
                                            e.currentTarget.style.borderColor = '#BFDBFE';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#F8FAFC';
                                            e.currentTarget.style.borderColor = '#E2E8F0';
                                        }}
                                    >
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                                    {p.propertyCode || p.property_code || `Property #${p.id.slice(0, 8)}`}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    fontWeight: 700,
                                                    padding: '1px 6px',
                                                    borderRadius: '4px',
                                                    backgroundColor: p.status === 'verified' ? '#ECFDF5' : '#FEF3C7',
                                                    color: p.status === 'verified' ? '#047857' : '#B45309',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {p.status || 'Active'}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                                {p.city || p.district}, {p.state} • {p.areaSqft || p.area_sqft || 0} sq ft
                                            </span>
                                        </div>

                                        <ChevronRight size={16} style={{ color: '#94A3B8' }} />
                                    </div>
                                ))}
                            </div>
                        )}
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
                                backgroundColor: actionModal.type === 'approve' ? '#ECFDF5' : actionModal.type === 'rekyc' ? '#EFF6FF' : '#FEF2F2',
                                color: actionModal.type === 'approve' ? '#047857' : actionModal.type === 'rekyc' ? '#1D4ED8' : '#DC2626',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {actionModal.type === 'approve' && <CheckCircle2 size={24} />}
                                {actionModal.type === 'rekyc' && <RefreshCcw size={22} />}
                                {actionModal.type === 'reject' && <XCircle size={24} />}
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                    {actionModal.type === 'approve' ? 'Approve Citizen Identity' : actionModal.type === 'rekyc' ? 'Request Re-Upload' : 'Reject Citizen Identity'}
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                                    Citizen: <strong>{user.name}</strong> ({user.email})
                                </p>
                            </div>
                        </div>

                        {actionModal.error && (
                            <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                                {actionModal.error}
                            </div>
                        )}

                        {actionModal.type === 'rekyc' && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                                    Select items that need to be re-uploaded:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                    {KYC_PART_OPTIONS.map(opt => {
                                        const isSelected = selectedKycParts.includes(opt.key);
                                        const IconComp = opt.icon;
                                        return (
                                            <div
                                                key={opt.key}
                                                onClick={() => toggleKycPart(opt.key)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1px solid #2563EB' : '1px solid #E2E8F0',
                                                    backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {isSelected ? <CheckSquare size={16} color="#2563EB" /> : <Square size={16} color="#94A3B8" />}
                                                <IconComp size={15} color={isSelected ? '#2563EB' : '#64748B'} />
                                                <span style={{ fontSize: '0.78rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1E40AF' : '#334155' }}>
                                                    {opt.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                                {actionModal.type === 'rekyc' ? 'Instructions for Citizen (Optional):' : actionModal.type === 'reject' ? 'Reason for Rejection *:' : 'Official Officer Notes (Optional):'}
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder={actionModal.type === 'rekyc' ? 'e.g. Please re-take face photo under good lighting...' : actionModal.type === 'reject' ? 'e.g. Aadhaar document unreadable or mismatched.' : 'e.g. Verified against local revenue database.'}
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
                                    backgroundColor: actionModal.type === 'approve' ? '#10B981' : actionModal.type === 'rekyc' ? '#2563EB' : '#DC2626',
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
                                {actionModal.type === 'approve' ? 'Confirm Approval' : actionModal.type === 'rekyc' ? 'Send Re-Upload Request' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CitizenDetails;
