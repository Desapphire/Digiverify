import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { TopNavbar } from '../../components/TopNavbar';
import {
    UserCheck, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Mail, Wallet, Shield, Clock,
    ChevronDown, ChevronUp, User, ArrowLeft
} from 'lucide-react';

const KYCApproval = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedUser, setExpandedUser] = useState(null);

    // Modal state for Action Reasoning
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', userId: null, error: '' });
    const [actionReason, setActionReason] = useState('');

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
    };

    const confirmAction = async () => {
        const { userId, type } = actionModal;
        const trimmedReason = actionReason.trim();

        if (!trimmedReason && type === 'reject') {
            setActionModal(prev => ({ ...prev, error: 'A reason is required to reject KYC.' }));
            return;
        }

        setActionLoading(userId);
        setActionModal(prev => ({ ...prev, isOpen: false }));

        try {
            if (type === 'approve') {
                await adminService.approveKyc(userId, trimmedReason);
            } else {
                await adminService.rejectKyc(userId, trimmedReason);
            }
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
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
            (u.walletAddress || '').toLowerCase().includes(q)
        );
    });

    const statusColor = (status) => {
        switch (status) {
            case 'verified':
            case 'approved':
                return { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', text: '#10B981' };
            case 'rejected':
                return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', text: '#EF4444' };
            default:
                return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', text: '#F59E0B' };
        }
    };

    const FILTERS = [
        { key: 'pending', label: 'Pending' },
        { key: 'verified', label: 'Verified' },
        { key: 'rejected', label: 'Rejected' },
        { key: '', label: 'All Users' },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            <TopNavbar
                title="KYC Approvals"
                subtitle="Review and certify citizen identities and biometric liveness packages"
                showLogo={false}
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
                customRight={
                    <button onClick={fetchUsers} className="btn-dark-pill" style={{ fontSize: '0.8rem' }}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                }
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {/* Filters + Search */}
                <div
                    className="digi-card p-4 mb-6"
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}
                >
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {FILTERS.map(f => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                style={{
                                    padding: '0.45rem 1rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: filter === f.key ? '1px solid #0284C7' : '1px solid transparent',
                                    background: filter === f.key ? 'rgba(2,132,199,0.15)' : 'transparent',
                                    color: filter === f.key ? '#38BDF8' : '#94A3B8',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: 'relative', minWidth: 260 }}>
                        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                        <input
                            type="text"
                            placeholder="Search by name, email, wallet..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-premium"
                            style={{ paddingLeft: 36, fontSize: '0.85rem' }}
                        />
                    </div>
                </div>

                {/* Count */}
                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#94A3B8' }}>
                    {loading ? 'Loading...' : `${filteredUsers.length} identity application${filteredUsers.length !== 1 ? 's' : ''}`}
                </div>

                {/* User List */}
                {loading ? (
                    <div className="digi-card p-12 flex items-center justify-center">
                        <Loader2 size={36} className="animate-spin" style={{ color: '#0284C7' }} />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="digi-card p-12 flex flex-col items-center justify-center text-center">
                        <UserCheck size={48} style={{ marginBottom: '1rem', color: '#64748B' }} />
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: 0 }}>No identity records match the selected filter.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {filteredUsers.map(u => {
                            const sc = statusColor(u.kycStatus);
                            const isExpanded = expandedUser === u.id;
                            const isActing = actionLoading === u.id;

                            return (
                                <div key={u.id} className="digi-card" style={{ padding: 0, overflow: 'hidden', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '12px' }}>
                                    {/* Main Row */}
                                    <div
                                        onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '1.25rem 1.5rem', cursor: 'pointer', flexWrap: 'wrap', gap: '1rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: 44, height: 44, borderRadius: '10px',
                                                background: 'rgba(2,132,199,0.12)',
                                                border: '1px solid rgba(2,132,199,0.3)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#38BDF8', fontWeight: 700, fontSize: '1.1rem',
                                                flexShrink: 0,
                                            }}>
                                                {u.name ? u.name.charAt(0).toUpperCase() : <User size={20} />}
                                            </div>

                                            <div>
                                                <p style={{ fontWeight: 600, color: '#F8FAFC', fontSize: '0.95rem', margin: 0 }}>
                                                    {u.name || 'Unnamed Citizen'}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                                                    {u.email && (
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#94A3B8' }}>
                                                            <Mail size={12} /> {u.email}
                                                        </span>
                                                    )}
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#64748B', fontFamily: 'JetBrains Mono' }}>
                                                        <Wallet size={12} /> {shortenWallet(u.walletAddress)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            {/* Status Badge */}
                                            <span style={{
                                                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                                                padding: '0.25rem 0.65rem', borderRadius: '6px',
                                                background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                            }}>
                                                {u.kycStatus || 'pending'}
                                            </span>

                                            {/* Actions */}
                                            {u.kycStatus === 'pending' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => openActionModal(u.id, 'approve')}
                                                        disabled={isActing}
                                                        className="btn-cyan-glow"
                                                        style={{
                                                            padding: '0.45rem 0.9rem', fontSize: '0.8rem',
                                                            display: 'flex', alignItems: 'center', gap: '0.35rem'
                                                        }}
                                                    >
                                                        {isActing && actionModal.type === 'approve' ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => openActionModal(u.id, 'reject')}
                                                        disabled={isActing}
                                                        className="btn-cyan-outline"
                                                        style={{
                                                            padding: '0.45rem 0.9rem', fontSize: '0.8rem',
                                                            color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)',
                                                            display: 'flex', alignItems: 'center', gap: '0.35rem'
                                                        }}
                                                    >
                                                        {isActing && actionModal.type === 'reject' ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                                                        Reject
                                                    </button>
                                                </div>
                                            )}

                                            {/* Expand */}
                                            {isExpanded ? <ChevronUp size={18} style={{ color: '#64748B' }} /> : <ChevronDown size={18} style={{ color: '#64748B' }} />}
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '1.25rem 1.5rem', borderTop: '1px solid #1E293B',
                                            background: '#0B0F19'
                                        }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
                                                <DetailField label="Citizen ID" value={u.id} mono />
                                                <DetailField label="Full Legal Name" value={u.name || '—'} />
                                                <DetailField label="Email Address" value={u.email || '—'} />
                                                <DetailField label="Role Clearance" value={u.role?.toUpperCase() || '—'} />
                                                <DetailField label="Wallet Public Key" value={u.walletAddress || '—'} mono />
                                                <DetailField label="KYC Document Hash" value={u.kycDocumentHash || 'Not submitted'} mono />
                                                <DetailField label="Biometric Face ID" value={u.faceIdHash ? 'Bound & Cryptographically Signed' : 'Not bound'} />
                                                <DetailField label="Registration Timestamp" value={u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'} />
                                            </div>

                                            {/* Biometric Evidence Section */}
                                            {u.faceIdHash && (
                                                <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#0F172A', borderRadius: '10px', border: '1px solid #1E293B' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                                        <Shield size={16} style={{ color: '#38BDF8' }} />
                                                        <h4 style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94A3B8', margin: 0 }}>
                                                            Biometric Verification Verification Data
                                                        </h4>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                                                        <div style={{ padding: '0.85rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B', textAlign: 'center' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38BDF8', display: 'block', marginBottom: '0.2rem' }}>Center Liveness</span>
                                                            <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>VERIFIED</span>
                                                        </div>
                                                        <div style={{ padding: '0.85rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B', textAlign: 'center' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38BDF8', display: 'block', marginBottom: '0.2rem' }}>Left Yaw Movement</span>
                                                            <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>VERIFIED</span>
                                                        </div>
                                                        <div style={{ padding: '0.85rem', background: '#0B0F19', borderRadius: '8px', border: '1px solid #1E293B', textAlign: 'center' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38BDF8', display: 'block', marginBottom: '0.2rem' }}>Right Yaw Movement</span>
                                                            <span style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>VERIFIED</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
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
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1.5rem'
                    }}>
                        <div className="digi-card" style={{ width: '100%', maxWidth: '440px', padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem', color: '#F8FAFC' }}>
                                {actionModal.type === 'approve' ? 'Approve Identity Verification' : 'Reject Identity Verification'}
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#94A3B8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Please provide an official note for this decision. {actionModal.type === 'reject' && 'This will be communicated directly to the applicant.'}
                            </p>
                            <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                placeholder="Enter administrative note..."
                                className="input-premium"
                                style={{ width: '100%', minHeight: 100, marginBottom: '1rem', resize: 'vertical', fontSize: '0.85rem' }}
                            />
                            {actionModal.error && (
                                <div style={{ color: '#EF4444', fontSize: '0.8rem', marginBottom: '1rem' }}>
                                    {actionModal.error}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setActionModal({ isOpen: false, type: '', userId: null, error: '' })}
                                    className="btn-cyan-outline"
                                    style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmAction}
                                    className={actionModal.type === 'approve' ? 'btn-cyan-glow' : 'btn-cyan-glow'}
                                    style={{
                                        padding: '0.55rem 1.25rem', fontSize: '0.85rem',
                                        background: actionModal.type === 'approve' ? '#0284C7' : '#DC2626'
                                    }}
                                    disabled={actionModal.type === 'reject' && !actionReason.trim()}
                                >
                                    Confirm {actionModal.type === 'approve' ? 'Approval' : 'Rejection'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748B', display: 'block', marginBottom: '0.2rem' }}>
            {label}
        </span>
        <span style={{
            fontSize: '0.875rem', fontWeight: 500, color: '#CBD5E1',
            fontFamily: mono ? 'JetBrains Mono' : 'inherit',
            wordBreak: 'break-all',
        }}>
            {value}
        </span>
    </div>
);

export default KYCApproval;
