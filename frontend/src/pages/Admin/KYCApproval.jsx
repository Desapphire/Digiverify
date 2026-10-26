import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    UserCheck, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Mail, Wallet, Shield, Clock,
    ChevronDown, ChevronUp, User, Copy, MapPin, ExternalLink,
    Camera, FileText, Calendar, CheckSquare, Square,
    AlertCircle, Sparkles, Building2, Phone
} from 'lucide-react';

const KYCApproval = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedUser, setExpandedUser] = useState(null);
    const [copiedId, setCopiedId] = useState('');

    const handleCopyText = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 2000);
    };

    // Modal state for Action Reasoning
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', userId: null, error: '' });
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

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await adminService.listUsers(filter || undefined);
            setUsers(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [filter]);

    const openActionModal = (userId, type) => {
        setActionModal({ isOpen: true, type, userId, error: '' });
        setActionReason('');
        setSelectedKycParts(type === 'rekyc' ? ['face'] : []);
    };

    const confirmAction = async () => {
        const { userId, type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (type === 'rekyc' && selectedKycParts.length === 0 && !trimmedReason) {
            setActionModal(prev => ({ ...prev, error: 'Please select at least one item or enter instructions for the citizen.' }));
            return;
        }

        if (type === 'reject' && !trimmedReason) {
            setActionModal(prev => ({ ...prev, error: 'Please provide a reason for rejecting this request.' }));
            return;
        }

        setActionLoading(userId);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveKyc(userId, trimmedReason);
            } else if (type === 'rekyc') {
                await adminService.requestReKyc(userId, trimmedReason, selectedKycParts);
            } else {
                await adminService.rejectKyc(userId, trimmedReason);
            }
            await fetchUsers();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed. Please try again.');
        } finally {
            setActionLoading(null);
        }
    };

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const filteredUsers = users.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (u.name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.walletAddress || '').toLowerCase().includes(q) ||
            (u.governmentId || '').toLowerCase().includes(q)
        );
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'verified':
                return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', label: 'Approved' };
            case 'rejected':
                return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', label: 'Rejected' };
            default:
                return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', label: 'Pending Review' };
        }
    };

    const FILTERS = [
        { key: 'pending', label: 'Pending Checks' },
        { key: 'verified', label: 'Approved Citizens' },
        { key: 'rejected', label: 'Rejected' },
        { key: '', label: 'All Citizens' },
    ];

    return (
        <div style={{ width: '100%' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '1.25rem',
                marginBottom: '1.5rem',
                backgroundColor: '#FFFFFF',
                padding: '1.5rem 1.75rem',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em'
                        }}>
                            <Shield size={12} />
                            Identity Verification
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Identity Checks (KYC)
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Review citizen identity details, ID documents, home address, and photo match.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/authority')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    >
                        ← Dashboard
                    </button>
                    <button
                        onClick={fetchUsers}
                        disabled={loading}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            borderRadius: '8px',
                            color: '#334155',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                    >
                        <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} style={{ color: '#2563EB' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filter Pills & Search Bar */}
            <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '1rem',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {FILTERS.map(f => {
                        const isActive = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    border: isActive ? '1px solid #0F172A' : '1px solid #E2E8F0',
                                    backgroundColor: isActive ? '#0F172A' : '#F8FAFC',
                                    color: isActive ? '#FFFFFF' : '#475569',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '260px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxSizing: 'border-box'
                }}>
                    <Search size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Search by name, email, account, or ID number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            fontSize: '0.85rem',
                            color: '#0F172A',
                            boxShadow: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Total Results Summary */}
            <div style={{
                marginBottom: '1rem',
                padding: '0 4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#64748B'
            }}>
                <span>
                    Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'citizen record' : 'citizen records'}
                </span>
                <span>
                    Filter: <strong style={{ color: '#0F172A' }}>{FILTERS.find(f => f.key === filter)?.label}</strong>
                </span>
            </div>

            {/* User List Accordion Cards */}
            {loading ? (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px'
                }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748B' }}>
                        Loading identity records...
                    </span>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '12px',
                    padding: '3.5rem 1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94A3B8',
                        marginBottom: '1rem'
                    }}>
                        <UserCheck size={24} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        No Citizen Records Found
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, maxWidth: '340px' }}>
                        No identity records match your search or filter.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredUsers.map(u => {
                        const statusBadge = getStatusBadge(u.kycStatus);
                        const isExpanded = expandedUser === u.id;
                        const isActing = actionLoading === u.id;

                        return (
                            <div
                                key={u.id}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: isExpanded ? '1px solid #94A3B8' : '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 2px rgba(0,0,0,0.03)',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Clickable Row */}
                                <div
                                    onClick={() => navigate(`/authority/kyc/${u.id}`)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1.1rem 1.25rem',
                                        cursor: 'pointer',
                                        backgroundColor: '#FFFFFF',
                                        flexWrap: 'wrap',
                                        gap: '1rem',
                                        transition: 'background-color 0.15s ease'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#FFFFFF'; }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        {/* Avatar Icon */}
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '10px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#1D4ED8',
                                            fontWeight: 800,
                                            fontSize: '1.05rem',
                                            flexShrink: 0
                                        }}>
                                            {u.name ? u.name.charAt(0).toUpperCase() : <User size={20} />}
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.98rem' }}>
                                                    {u.name || 'Unnamed Citizen'}
                                                </span>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '9999px',
                                                    backgroundColor: statusBadge.bg,
                                                    border: `1px solid ${statusBadge.border}`,
                                                    color: statusBadge.text,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em'
                                                }}>
                                                    {statusBadge.label}
                                                </span>
                                                {(u.faceVerified || u.faceIdHash) && (
                                                    <span style={{
                                                        fontSize: '0.68rem',
                                                        fontWeight: 700,
                                                        backgroundColor: '#ECFDF5',
                                                        border: '1px solid #A7F3D0',
                                                        color: '#047857',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <Camera size={11} />
                                                        Photo Matched
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.78rem', color: '#64748B' }}>
                                                {u.email && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Mail size={12} style={{ color: '#94A3B8' }} />
                                                        {u.email}
                                                    </span>
                                                )}
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                                                    <Wallet size={12} style={{ color: '#94A3B8' }} />
                                                    {shortenWallet(u.walletAddress)}
                                                </span>
                                                {u.governmentId && (
                                                    <span>• ID: <strong>{u.governmentId}</strong></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons in row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                        {u.kycStatus === 'pending' && (
                                            <button
                                                onClick={() => openActionModal(u.id, 'approve')}
                                                disabled={isActing}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    backgroundColor: '#ECFDF5',
                                                    color: '#047857',
                                                    border: '1px solid #A7F3D0',
                                                    cursor: isActing ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#D1FAE5'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ECFDF5'; }}
                                            >
                                                {isActing && actionModal.type === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                Approve
                                            </button>
                                        )}

                                        <button
                                            onClick={() => openActionModal(u.id, 'rekyc')}
                                            disabled={isActing}
                                            style={{
                                                padding: '6px 14px',
                                                borderRadius: '6px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                backgroundColor: '#EFF6FF',
                                                color: '#1D4ED8',
                                                border: '1px solid #BFDBFE',
                                                cursor: isActing ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                transition: 'all 0.15s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#DBEAFE'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#EFF6FF'; }}
                                        >
                                            {isActing && actionModal.type === 'rekyc' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
                                            Request Re-Upload
                                        </button>

                                        {u.kycStatus === 'pending' && (
                                            <button
                                                onClick={() => openActionModal(u.id, 'reject')}
                                                disabled={isActing}
                                                style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '6px',
                                                    fontSize: '0.78rem',
                                                    fontWeight: 700,
                                                    backgroundColor: '#FEF2F2',
                                                    color: '#B91C1C',
                                                    border: '1px solid #FECACA',
                                                    cursor: isActing ? 'not-allowed' : 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    transition: 'all 0.15s'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#FEE2E2'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                                            >
                                                {isActing && actionModal.type === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                                Reject
                                            </button>
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/authority/kyc/${u.id}`);
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                color: '#1E293B',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#2563EB';
                                                e.currentTarget.style.color = '#2563EB';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#CBD5E1';
                                                e.currentTarget.style.color = '#1E293B';
                                            }}
                                        >
                                            View Citizen Record
                                            <ExternalLink size={13} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Action Dialog Modal */}
            {actionModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: actionModal.type === 'rekyc' ? '560px' : '460px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '16px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        padding: '1.75rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                            {actionModal.type === 'approve' ? (
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <CheckCircle2 size={22} />
                                </div>
                            ) : actionModal.type === 'rekyc' ? (
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <RefreshCcw size={22} />
                                </div>
                            ) : (
                                <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <XCircle size={22} />
                                </div>
                            )}
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                    {actionModal.type === 'approve'
                                        ? 'Approve Citizen'
                                        : actionModal.type === 'rekyc'
                                        ? 'Request Re-Upload'
                                        : 'Reject Identity Check'}
                                </h3>
                                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                                    Record officer decision
                                </p>
                            </div>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.25rem', lineHeight: 1.4 }}>
                            {actionModal.type === 'rekyc'
                                ? 'Select the items that need to be re-uploaded by the citizen:'
                                : actionModal.type === 'reject'
                                ? 'Specify the reason for rejecting this request.'
                                : 'Confirm approval for this citizen. They will be able to buy and register properties.'}
                        </p>

                        {/* Selective Requirements Selector (Re-KYC only) */}
                        {actionModal.type === 'rekyc' && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#0F172A', fontWeight: 800, letterSpacing: '0.04em', display: 'block', marginBottom: '0.5rem' }}>
                                    Select Items to Re-Upload:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.5rem' }}>
                                    {KYC_PART_OPTIONS.map(opt => {
                                        const isSelected = selectedKycParts.includes(opt.key);

                                        return (
                                            <div
                                                key={opt.key}
                                                onClick={() => toggleKycPart(opt.key)}
                                                style={{
                                                    padding: '0.75rem 0.85rem',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                                                    backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: '10px'
                                                }}
                                            >
                                                <div style={{ marginTop: '2px', color: isSelected ? '#2563EB' : '#94A3B8' }}>
                                                    {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </div>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: isSelected ? '#1E3A8A' : '#0F172A' }}>
                                                        {opt.label}
                                                    </p>
                                                    <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748B', lineHeight: 1.3 }}>
                                                        {opt.desc}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Reason / Directive textarea */}
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#0F172A', fontWeight: 700, display: 'block', marginBottom: '0.375rem' }}>
                                {actionModal.type === 'rekyc' ? 'Instructions for Citizen (Optional):' : 'Reason for Rejection:'}
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder={actionModal.type === 'rekyc' ? 'E.g. ID document is blurry. Please upload a clear photo of your original ID card.' : 'Enter reason for rejection...'}
                                style={{
                                    width: '100%',
                                    minHeight: '85px',
                                    padding: '10px',
                                    fontSize: '0.85rem',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '8px',
                                    backgroundColor: '#FFFFFF',
                                    color: '#0F172A',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        {actionModal.error && (
                            <div style={{ color: '#B91C1C', fontSize: '0.82rem', marginBottom: '1rem', backgroundColor: '#FEF2F2', padding: '0.6rem 0.85rem', borderRadius: '6px', border: '1px solid #FECACA', fontWeight: 600 }}>
                                {actionModal.error}
                            </div>
                        )}

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setActionModal({ isOpen: false, type: '', userId: null, error: '' })}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    color: '#334155',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                disabled={actionModal.type === 'reject' && !actionReason.trim()}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    backgroundColor: actionModal.type === 'approve' ? '#047857' : actionModal.type === 'rekyc' ? '#1E3A8A' : '#DC2626',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    cursor: (actionModal.type === 'reject' && !actionReason.trim()) ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}
                            >
                                {actionModal.type === 'approve'
                                    ? 'Approve Citizen'
                                    : actionModal.type === 'rekyc'
                                    ? `Send Re-Upload Request (${selectedKycParts.length} Selected)`
                                    : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Reusable Detail Field inside card
const DetailField = ({ label, value, mono = false, copyable = false, onCopy, isCopied }) => (
    <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: 0 }}>
                {label}
            </p>
            {copyable && value && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onCopy) onCopy();
                    }}
                    style={{ background: 'transparent', border: 'none', color: isCopied ? '#047857' : '#2563EB', padding: '0 4px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                    {isCopied ? <><CheckCircle2 size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                </button>
            )}
        </div>
        <p style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#0F172A',
            fontFamily: mono ? 'var(--font-mono, monospace)' : 'inherit',
            wordBreak: 'break-all',
            margin: 0
        }}>
            {value || '—'}
        </p>
    </div>
);

export default KYCApproval;
