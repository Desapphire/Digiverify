import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    RefreshCcw, CheckCircle2, XCircle, Loader2,
    Search, Mail, Wallet, Shield, Clock,
    ChevronDown, ChevronUp, User, Copy, MapPin, ExternalLink,
    Camera, FileText, Calendar, CheckSquare, Square,
    AlertCircle, Sparkles, Building2, Phone, AlertTriangle,
    ArrowRight, Check, ArrowUpRight
} from 'lucide-react';

const ReKycApproval = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('resubmitted'); // 'resubmitted' | 'flagged' | 'all'
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
            // Fetch all users to filter specifically for Re-KYC candidates
            const res = await adminService.listUsers();
            setUsers(res.data?.data || []);
        } catch (err) {
            console.error('Failed to fetch users for Re-KYC portal:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

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
                await adminService.approveKyc(userId, trimmedReason || 'Re-KYC approved after review.');
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

    // Filter specifically for Re-KYC users:
    // 1. Resubmitted: kycStatus === 'pending' AND adminComments mentions re-kyc/resubmission
    // 2. Flagged / Action Required: kycStatus === 'rejected' AND adminComments is present
    // 3. All Re-KYC records: Any user with adminComments or rekyc history
    const reKycUsers = users.filter(u => {
        const hasComments = Boolean(u.adminComments && u.adminComments.trim());
        const isResubmitted = u.kycStatus === 'pending' && hasComments;
        const isFlagged = u.kycStatus === 'rejected' && hasComments;

        if (filter === 'resubmitted') return isResubmitted;
        if (filter === 'flagged') return isFlagged;
        if (filter === 'all') return hasComments;
        return true;
    });

    const filteredUsers = reKycUsers.filter(u => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (u.name || '').toLowerCase().includes(q) ||
            (u.email || '').toLowerCase().includes(q) ||
            (u.walletAddress || '').toLowerCase().includes(q) ||
            (u.governmentId || '').toLowerCase().includes(q) ||
            (u.adminComments || '').toLowerCase().includes(q)
        );
    });

    // Counts
    const countResubmitted = users.filter(u => u.kycStatus === 'pending' && u.adminComments).length;
    const countFlagged = users.filter(u => u.kycStatus === 'rejected' && u.adminComments).length;
    const countAll = users.filter(u => u.adminComments).length;

    const parseDirectives = (comments) => {
        if (!comments) return { badges: [], text: '' };
        const match = comments.match(/\[REQUIRED:\s*([^\]]+)\]/i);
        if (match) {
            const raw = match[1].split(',').map(s => s.trim()).filter(Boolean);
            const text = comments.replace(match[0], '').trim();
            return { badges: raw, text };
        }
        return { badges: [], text: comments };
    };

    return (
        <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
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
                            <RefreshCcw size={12} />
                            Dedicated Review Portal
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: '1.65rem',
                        fontWeight: 800,
                        color: '#0F172A',
                        letterSpacing: '-0.02em',
                        margin: 0
                    }}>
                        Re-KYC & Resubmitted Applications
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: '#64748B', marginTop: '4px', margin: 0 }}>
                        Review citizen applications where updated documents or photos were requested and resubmitted.
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => navigate('/authority/kyc')}
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
                        All Identity Checks (KYC)
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

            {/* Quick Stat Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div
                    onClick={() => setFilter('resubmitted')}
                    style={{
                        backgroundColor: filter === 'resubmitted' ? '#EFF6FF' : '#FFFFFF',
                        border: filter === 'resubmitted' ? '2px solid #2563EB' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1D4ED8', textTransform: 'uppercase' }}>
                            Resubmitted & Pending
                        </span>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#2563EB' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A' }}>
                        {countResubmitted}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
                        Citizens who updated their details and are waiting for review
                    </p>
                </div>

                <div
                    onClick={() => setFilter('flagged')}
                    style={{
                        backgroundColor: filter === 'flagged' ? '#FFFBEB' : '#FFFFFF',
                        border: filter === 'flagged' ? '2px solid #D97706' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>
                            Awaiting Citizen Re-Upload
                        </span>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#D97706' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A' }}>
                        {countFlagged}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
                        Flagged requests pending action from the citizen
                    </p>
                </div>

                <div
                    onClick={() => setFilter('all')}
                    style={{
                        backgroundColor: filter === 'all' ? '#F8FAFC' : '#FFFFFF',
                        border: filter === 'all' ? '2px solid #475569' : '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '1.25rem',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            All Re-KYC History
                        </span>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#64748B' }} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0F172A' }}>
                        {countAll}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '4px 0 0 0' }}>
                        Total citizens involved in Re-KYC verification
                    </p>
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
                    {[
                        { key: 'resubmitted', label: `Resubmitted (${countResubmitted})` },
                        { key: 'flagged', label: `Awaiting Citizen (${countFlagged})` },
                        { key: 'all', label: `All Re-KYCs (${countAll})` },
                    ].map(f => {
                        const isActive = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: isActive ? '1px solid #1D4ED8' : '1px solid #E2E8F0',
                                    backgroundColor: isActive ? '#EFF6FF' : '#FFFFFF',
                                    color: isActive ? '#1D4ED8' : '#64748B',
                                    fontSize: '0.8rem',
                                    fontWeight: isActive ? 700 : 500,
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
                    flex: 1,
                    maxWidth: '380px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    boxSizing: 'border-box'
                }}>
                    <Search size={15} style={{ color: '#94A3B8', flexShrink: 0 }} />
                    <input
                        type="text"
                        placeholder="Search by name, email, wallet, or notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            padding: 0,
                            margin: 0,
                            fontSize: '0.82rem',
                            color: '#0F172A',
                            boxShadow: 'none'
                        }}
                    />
                </div>
            </div>

            {/* List of Re-KYC Citizens */}
            {loading ? (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '4rem 2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem'
                }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#2563EB' }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748B' }}>
                        Loading Re-KYC records...
                    </span>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '4rem 2rem',
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
                        <CheckCircle2 size={24} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                        No Re-KYC Records Found
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, maxWidth: '360px' }}>
                        There are currently no citizen applications matching the "{filter}" filter.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {filteredUsers.map(u => {
                        const isExpanded = expandedUser === u.id;
                        const isActing = actionLoading === u.id;
                        const directives = parseDirectives(u.adminComments);
                        const isPendingReview = u.kycStatus === 'pending';

                        return (
                            <div
                                key={u.id}
                                style={{
                                    backgroundColor: '#FFFFFF',
                                    border: isExpanded ? '1px solid #2563EB' : '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    boxShadow: isExpanded ? '0 4px 12px rgba(37, 99, 235, 0.08)' : '0 1px 2px rgba(0,0,0,0.03)',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Header / Summary Row */}
                                <div
                                    onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '1.15rem 1.25rem',
                                        cursor: 'pointer',
                                        backgroundColor: isExpanded ? '#F8FAFC' : '#FFFFFF',
                                        borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none',
                                        flexWrap: 'wrap',
                                        gap: '1rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '10px',
                                            backgroundColor: isPendingReview ? '#EFF6FF' : '#FEF3C7',
                                            border: `1px solid ${isPendingReview ? '#BFDBFE' : '#FDE68A'}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: isPendingReview ? '#1D4ED8' : '#B45309',
                                            fontWeight: 800,
                                            fontSize: '1.05rem',
                                            flexShrink: 0
                                        }}>
                                            {u.name ? u.name.charAt(0).toUpperCase() : <User size={20} />}
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                                                    {u.name || 'Unnamed Citizen'}
                                                </span>

                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '9999px',
                                                    backgroundColor: isPendingReview ? '#EFF6FF' : '#FEF3C7',
                                                    border: `1px solid ${isPendingReview ? '#BFDBFE' : '#FDE68A'}`,
                                                    color: isPendingReview ? '#1D4ED8' : '#B45309',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {isPendingReview ? 'Resubmitted & Pending' : 'Awaiting Citizen'}
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
                                                        <Mail size={12} style={{ color: '#94A3B8' }} /> {u.email}
                                                    </span>
                                                )}
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                                                    <Wallet size={12} style={{ color: '#94A3B8' }} /> {shortenWallet(u.walletAddress)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons in Row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => openActionModal(u.id, 'approve')}
                                            disabled={isActing}
                                            style={{
                                                padding: '7px 16px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                backgroundColor: '#ECFDF5',
                                                color: '#047857',
                                                border: '1px solid #A7F3D0',
                                                cursor: isActing ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            {isActing && actionModal.type === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                            Approve Re-KYC
                                        </button>

                                        <button
                                            onClick={() => openActionModal(u.id, 'rekyc')}
                                            disabled={isActing}
                                            style={{
                                                padding: '7px 14px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                backgroundColor: '#EFF6FF',
                                                color: '#1D4ED8',
                                                border: '1px solid #BFDBFE',
                                                cursor: isActing ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <RefreshCcw size={13} />
                                            Request Further Changes
                                        </button>

                                        <button
                                            onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                            style={{
                                                padding: '7px 12px',
                                                borderRadius: '6px',
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                color: '#475569',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {isExpanded ? <>Hide Details <ChevronUp size={14} /></> : <>Inspect Details <ChevronDown size={14} /></>}
                                        </button>
                                    </div>
                                </div>

                                {/* Officer Directives Callout Bar */}
                                {u.adminComments && (
                                    <div style={{
                                        backgroundColor: '#FFFBEB',
                                        borderTop: '1px solid #FDE68A',
                                        borderBottom: isExpanded ? '1px solid #FDE68A' : 'none',
                                        padding: '0.75rem 1.25rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <AlertTriangle size={15} style={{ color: '#D97706', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400E', textTransform: 'uppercase' }}>
                                                Officer Note / Directive:
                                            </span>
                                            <span style={{ fontSize: '0.82rem', color: '#78350F' }}>
                                                {directives.text}
                                            </span>
                                        </div>
                                        {directives.badges.length > 0 && (
                                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                {directives.badges.map((b, idx) => (
                                                    <span key={idx} style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                                                        • {b}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Expanded Detail Inspector */}
                                {isExpanded && (
                                    <div style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
                                        {/* 1. Personal Details */}
                                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.15rem', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                                                <User size={16} style={{ color: '#1E3A8A' }} />
                                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0F172A', margin: 0 }}>
                                                    1. Updated Personal Details
                                                </h4>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: '0 0 2px 0' }}>Full Name</p>
                                                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{u.name || '—'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: '0 0 2px 0' }}>Email</p>
                                                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{u.email || '—'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: '0 0 2px 0' }}>Phone</p>
                                                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{u.phone || '—'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: '0 0 2px 0' }}>Date of Birth</p>
                                                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', margin: 0 }}>{u.birthdate ? new Date(u.birthdate).toLocaleDateString() : '—'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 2. ID Document & Number */}
                                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.15rem', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                                                <FileText size={16} style={{ color: '#D97706' }} />
                                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0F172A', margin: 0 }}>
                                                    2. Government ID Document
                                                </h4>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: '0 0 2px 0' }}>Document Type</p>
                                                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{u.governmentIdType || 'Aadhaar Card'}</p>
                                                </div>
                                                <div>
                                                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: '0 0 2px 0' }}>ID Number</p>
                                                    <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', fontFamily: 'monospace', margin: 0 }}>{u.governmentId || 'Not Provided'}</p>
                                                </div>
                                                {u.kycDocumentHash && (
                                                    <div>
                                                        <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', margin: '0 0 2px 0' }}>Uploaded Document</p>
                                                        <a
                                                            href={`https://gateway.pinata.cloud/ipfs/${u.kycDocumentHash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#2563EB', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700, textDecoration: 'none' }}
                                                        >
                                                            View Uploaded File <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3. Address */}
                                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.15rem', marginBottom: '1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.85rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                                                <MapPin size={16} style={{ color: '#047857' }} />
                                                <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0F172A', margin: 0 }}>
                                                    3. Home Address
                                                </h4>
                                            </div>
                                            <div style={{ fontSize: '0.88rem', color: '#0F172A', lineHeight: 1.6 }}>
                                                <div><strong>House / Locality:</strong> {[u.houseNumber, u.locality].filter(Boolean).join(', ') || '—'}</div>
                                                <div><strong>City & State:</strong> {[u.city, u.state, u.pinCode ? `PIN: ${u.pinCode}` : '', u.country].filter(Boolean).join(', ') || '—'}</div>
                                            </div>
                                        </div>

                                        {/* 4. Facial Biometric */}
                                        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '1.15rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Camera size={16} style={{ color: '#047857' }} />
                                                    <h4 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0F172A', margin: 0 }}>
                                                        4. Face Match Verification
                                                    </h4>
                                                </div>
                                                <span style={{
                                                    fontSize: '0.72rem',
                                                    fontWeight: 700,
                                                    padding: '2px 8px',
                                                    borderRadius: '9999px',
                                                    backgroundColor: u.faceVerified || u.faceIdHash ? '#DCFCE7' : '#FEF3C7',
                                                    color: u.faceVerified || u.faceIdHash ? '#15803D' : '#B45309'
                                                }}>
                                                    {u.faceVerified || u.faceIdHash ? 'Photo Matched' : 'Photo Pending'}
                                                </span>
                                            </div>
                                            <code style={{ fontSize: '0.78rem', color: '#334155', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                                {u.faceIdHash || 'No photo match hash.'}
                                            </code>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Action Reasoning Modal */}
            {actionModal.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        maxWidth: '520px',
                        width: '100%',
                        padding: '1.75rem',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
                    }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                            {actionModal.type === 'approve' ? 'Approve Re-KYC Application' : actionModal.type === 'rekyc' ? 'Request Additional Changes' : 'Reject Application'}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
                            {actionModal.type === 'approve' ? 'Confirm approval of the resubmitted identity records.' : 'Specify instructions or feedback for the citizen.'}
                        </p>

                        {actionModal.type === 'rekyc' && (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                                    Select Items Needing Re-Upload:
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    {KYC_PART_OPTIONS.map(part => {
                                        const isSelected = selectedKycParts.includes(part.key);
                                        return (
                                            <div
                                                key={part.key}
                                                onClick={() => toggleKycPart(part.key)}
                                                style={{
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                                                    backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                {isSelected ? <CheckSquare size={16} style={{ color: '#2563EB' }} /> : <Square size={16} style={{ color: '#94A3B8' }} />}
                                                <span style={{ fontSize: '0.8rem', fontWeight: isSelected ? 700 : 500, color: '#0F172A' }}>
                                                    {part.label}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                Officer Notes (Optional for approval, required for rejection/request):
                            </label>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="e.g. Please provide a clearer copy of your address proof..."
                                rows={3}
                                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                            />
                        </div>

                        {actionModal.error && (
                            <div style={{ color: '#DC2626', fontSize: '0.82rem', marginBottom: '1rem', fontWeight: 600 }}>
                                ⚠️ {actionModal.error}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                                onClick={() => setActionModal({ isOpen: false, type: '', userId: null, error: '' })}
                                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAction}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: actionModal.type === 'approve' ? '#16A34A' : actionModal.type === 'rekyc' ? '#2563EB' : '#DC2626',
                                    color: '#FFFFFF',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Confirm Action
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReKycApproval;
