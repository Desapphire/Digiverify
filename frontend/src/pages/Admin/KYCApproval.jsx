import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    UserCheck, CheckCircle2, XCircle, Loader2,
    RefreshCcw, Search, Mail, Wallet, Shield, Clock,
    ChevronDown, ChevronUp, User
} from 'lucide-react';

const KYCApproval = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [filter, setFilter] = useState('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedUser, setExpandedUser] = useState(null);

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

    const handleApprove = async (userId) => {
        setActionLoading(userId);
        try {
            await adminService.approveKyc(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (userId) => {
        if (!window.confirm('Are you sure you want to reject this KYC?')) return;
        setActionLoading(userId);
        try {
            await adminService.rejectKyc(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err) {
            alert(err.response?.data?.message || 'Rejection failed');
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
            case 'verified': return { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', text: '#22c55e' };
            case 'rejected': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', text: '#ef4444' };
            default: return { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', text: '#eab308' };
        }
    };

    const FILTERS = [
        { key: 'pending', label: 'Pending' },
        { key: 'verified', label: 'Verified' },
        { key: 'rejected', label: 'Rejected' },
        { key: '', label: 'All' },
    ];

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        <span className="text-gradient">KYC Approvals</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.9rem' }}>
                        Review and manage user identity verification requests.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/authority')} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
                        ← Back
                    </button>
                    <button onClick={fetchUsers} className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}>
                        <RefreshCcw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filters + Search */}
            <div className="glass-panel p-4 mb-6" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            style={{
                                padding: '0.4rem 1rem',
                                borderRadius: '0.5rem',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                border: filter === f.key ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                background: filter === f.key ? 'rgba(220,38,38,0.12)' : 'rgba(0,0,0,0.2)',
                                color: filter === f.key ? '#fca5a5' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
                <div style={{ position: 'relative', minWidth: 220 }}>
                    <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                    <input
                        type="text"
                        placeholder="Search name, email, wallet..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-premium"
                        style={{ paddingLeft: 34, fontSize: '0.82rem', padding: '0.5rem 0.75rem 0.5rem 34px' }}
                    />
                </div>
            </div>

            {/* Count */}
            <div style={{ marginBottom: '1rem', fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>
                {loading ? 'Loading...' : `${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
            </div>

            {/* User List */}
            {loading ? (
                <div className="glass-panel p-8 flex items-center justify-center">
                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="glass-panel p-8 flex flex-col items-center justify-center" style={{ opacity: 0.5 }}>
                    <UserCheck size={48} style={{ marginBottom: '1rem', color: 'rgba(255,255,255,0.3)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>No users match the current filter.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredUsers.map(u => {
                        const sc = statusColor(u.kycStatus);
                        const isExpanded = expandedUser === u.id;
                        const isActing = actionLoading === u.id;

                        return (
                            <div key={u.id} className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Main Row */}
                                <div
                                    onClick={() => setExpandedUser(isExpanded ? null : u.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '1rem 1.25rem', cursor: 'pointer', transition: 'background 0.2s',
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.08))',
                                            border: '1px solid rgba(234,179,8,0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#f59e0b', fontWeight: 800, fontSize: '1rem',
                                            flexShrink: 0,
                                        }}>
                                            {u.name ? u.name.charAt(0).toUpperCase() : <User size={20} />}
                                        </div>

                                        <div>
                                            <p style={{ fontWeight: 700, color: 'white', fontSize: '0.92rem' }}>
                                                {u.name || 'Unnamed User'}
                                            </p>
                                            <div className="flex items-center gap-4" style={{ marginTop: 4 }}>
                                                {u.email && (
                                                    <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                                                        <Mail size={11} /> {u.email}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1" style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                                                    <Wallet size={11} /> {shortenWallet(u.walletAddress)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Status Badge */}
                                        <span style={{
                                            fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
                                            letterSpacing: '0.05em', padding: '3px 10px', borderRadius: '9999px',
                                            background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                                        }}>
                                            {u.kycStatus || 'pending'}
                                        </span>

                                        {/* Actions */}
                                        {u.kycStatus === 'pending' && (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleApprove(u.id)}
                                                    disabled={isActing}
                                                    style={{
                                                        padding: '0.35rem 0.75rem', borderRadius: '0.5rem',
                                                        fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                                                        background: 'rgba(34,197,94,0.1)', color: '#22c55e',
                                                        border: '1px solid rgba(34,197,94,0.2)',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        opacity: isActing ? 0.5 : 1, transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {isActing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(u.id)}
                                                    disabled={isActing}
                                                    className="btn btn-danger"
                                                    style={{
                                                        padding: '0.35rem 0.75rem', fontSize: '0.72rem',
                                                        opacity: isActing ? 0.5 : 1,
                                                    }}
                                                >
                                                    <XCircle size={13} /> Reject
                                                </button>
                                            </div>
                                        )}

                                        {/* Expand */}
                                        {isExpanded ? <ChevronUp size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <ChevronDown size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div style={{
                                        padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.04)',
                                        paddingTop: '1rem',
                                    }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                            <DetailField label="User ID" value={u.id} mono />
                                            <DetailField label="Full Name" value={u.name || '—'} />
                                            <DetailField label="Email" value={u.email || '—'} />
                                            <DetailField label="Role" value={u.role?.toUpperCase() || '—'} />
                                            <DetailField label="Wallet Address" value={u.walletAddress || '—'} mono />
                                            <DetailField label="KYC Status" value={u.kycStatus || 'pending'} />
                                            <DetailField label="KYC Document Hash" value={u.kycDocumentHash || 'Not submitted'} mono />
                                            <DetailField label="Face ID Bound" value={u.faceIdHash ? 'Yes' : 'No'} />
                                            <DetailField label="Registered" value={u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

const DetailField = ({ label, value, mono = false }) => (
    <div>
        <p style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
            {label}
        </p>
        <p style={{
            fontSize: '0.82rem', fontWeight: 500, color: 'rgba(255,255,255,0.75)',
            fontFamily: mono ? 'monospace' : 'inherit',
            wordBreak: 'break-all',
        }}>
            {value}
        </p>
    </div>
);

export default KYCApproval;
