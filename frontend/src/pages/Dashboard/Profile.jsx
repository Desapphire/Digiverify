import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { userService } from '../../services/user.service';
import {
    User, Wallet, ShieldCheck, FileText, Mail, Phone,
    KeyRound, AlertTriangle, CheckCircle2, Copy, ExternalLink,
    RefreshCw, Edit3, Save, X, Clock, Fingerprint
} from 'lucide-react';
import './Profile.css';

const UserDashboard = () => {
    const { user } = useAuth();
    const { account, connectWallet, isConnecting } = useWeb3();

    // Profile editing state
    const [editMode, setEditMode] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

    // Wallet recovery state
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryWallet, setRecoveryWallet] = useState('');
    const [recoveryReason, setRecoveryReason] = useState('');
    const [recoverySaving, setRecoverySaving] = useState(false);
    const [recoveryMsg, setRecoveryMsg] = useState({ type: '', text: '' });

    // Wallet state
    const [walletError, setWalletError] = useState('');
    const [copied, setCopied] = useState(false);

    // Loading
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setLoading(true);
                const res = await userService.getProfile();
                if (res.data?.data) setProfile(res.data.data);
            } catch (error) {
                console.error('Failed to load profile', error);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchProfile();
    }, [user]);

    const handleConnectWallet = async () => {
        setWalletError('');
        try {
            const connectedAccount = await connectWallet();
            if (profile?.walletAddress && connectedAccount.toLowerCase() !== profile.walletAddress.toLowerCase()) {
                setWalletError(`Wallet mismatch! Expected: ${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)}`);
            }
        } catch (err) {
            setWalletError(err.message || 'Failed to connect wallet');
        }
    };

    const handleCopyAddress = () => {
        const addr = profile?.walletAddress || '';
        navigator.clipboard.writeText(addr);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const startEdit = () => {
        setEditEmail(profile?.email || '');
        setEditPhone(profile?.phone || '');
        setEditMode(true);
        setProfileMsg({ type: '', text: '' });
    };

    const cancelEdit = () => {
        setEditMode(false);
        setProfileMsg({ type: '', text: '' });
    };

    const handleSaveProfile = async () => {
        setProfileSaving(true);
        setProfileMsg({ type: '', text: '' });
        try {
            const payload = {};
            if (editEmail && editEmail !== profile?.email) payload.email = editEmail;
            if (editPhone && editPhone !== profile?.phone) payload.phone = editPhone;

            if (Object.keys(payload).length === 0) {
                setProfileMsg({ type: 'info', text: 'No changes to save.' });
                setProfileSaving(false);
                return;
            }

            const res = await userService.updateProfile(payload);
            if (res.data?.data) {
                setProfile(res.data.data);
                setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
                setEditMode(false);
            }
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update profile.' });
        } finally {
            setProfileSaving(false);
        }
    };

    const handleRequestRecovery = async () => {
        setRecoverySaving(true);
        setRecoveryMsg({ type: '', text: '' });
        try {
            await userService.requestWalletRecovery({
                oldWallet: recoveryWallet,
                reason: recoveryReason,
            });
            setRecoveryMsg({ type: 'success', text: 'Recovery request submitted. An authority will review it.' });
            setRecoveryWallet('');
            setRecoveryReason('');
            setShowRecovery(false);
        } catch (err) {
            setRecoveryMsg({ type: 'error', text: err.response?.data?.message || 'Failed to submit recovery request.' });
        } finally {
            setRecoverySaving(false);
        }
    };

    const data = profile || user;

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <div style={{ width: '4rem', height: '4rem', borderRadius: '9999px', border: '4px solid rgba(139,92,246,0.3)', borderTopColor: 'hsl(255,85%,65%)' }} className="animate-spin"></div>
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            {/* Page Header */}
            <div className="profile-header">
                <h1 className="profile-title">
                    My <span className="text-gradient">Profile</span>
                </h1>
                <p className="profile-subtitle">Manage your identity, security, and wallet settings</p>
            </div>

            <div className="profile-grid-layout">

                {/* ─── Section 1: Personal Details ─── */}
                <div className="profile-panel">
                    <div className="panel-header-row">
                        <h3 className="section-title">
                            <User style={{ width: '1.25rem', height: '1.25rem', color: 'hsl(255,85%,65%)' }} /> Personal Details
                        </h3>
                        {!editMode && (
                            <button className="btn btn-ghost" onClick={startEdit} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Edit3 size={14} /> Edit
                            </button>
                        )}
                    </div>

                    <div className="details-grid">
                        <div className="detail-card">
                            <p className="detail-label">Full Name</p>
                            <p className="detail-value">{data?.name || '—'}</p>
                        </div>
                        <div className="detail-card">
                            <p className="detail-label">Email</p>
                            <p className="detail-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.email || '—'}</p>
                        </div>
                        <div className="detail-card">
                            <p className="detail-label">Phone</p>
                            <p className="detail-value">{data?.phone || 'Not Provided'}</p>
                        </div>
                        <div className="detail-card">
                            <p className="detail-label">Birthdate</p>
                            <p className="detail-value">{data?.birthdate ? new Date(data.birthdate).toLocaleDateString() : 'Not Provided'}</p>
                        </div>
                        <div className="detail-card">
                            <p className="detail-label">Role</p>
                            <p className="detail-value" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(255,85%,65%)' }}>{data?.role || 'user'}</p>
                        </div>
                        <div className="detail-card">
                            <p className="detail-label">Joined</p>
                            <p className="detail-value">{data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : '—'}</p>
                        </div>
                    </div>
                </div>

                {/* ─── Section 2: KYC Status ─── */}
                <div className="profile-panel">
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>
                        <ShieldCheck style={{ width: '1.25rem', height: '1.25rem', color: 'hsl(255,85%,65%)' }} /> Verification Status
                    </h3>
                    <div className="kyc-cards-container">
                        {/* KYC Document Status */}
                        <div className="kyc-card" style={{
                            borderColor: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? 'rgba(34,197,94,0.3)' : data?.kycStatus === 'pending' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)',
                            background: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? 'rgba(34,197,94,0.08)' : data?.kycStatus === 'pending' ? 'rgba(245,158,11,0.08)' : 'rgba(239,68,68,0.08)',
                        }}>
                            <div className="kyc-icon-wrapper" style={{
                                background: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? 'rgba(34,197,94,0.15)' : data?.kycStatus === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                            }}>
                                <FileText size={28} style={{ color: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? 'hsl(142,71%,45%)' : data?.kycStatus === 'pending' ? 'hsl(38,92%,50%)' : 'hsl(348,83%,47%)' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.4rem 0' }}>Document KYC</p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className={`badge ${data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? 'badge-success' : data?.kycStatus === 'pending' ? 'badge-warning-glow' : 'badge-danger'}`}>
                                        {data?.kycStatus?.toUpperCase() || 'UNKNOWN'}
                                    </span>
                                    {data?.kycStatus === 'pending' && <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '9999px', background: 'hsl(38,92%,50%)', animation: 'pulse-glow 2s infinite' }}></span>}
                                </div>
                                {data?.kycStatus !== 'approved' && data?.kycStatus !== 'verified' && (
                                    <div className="kyc-progress-track">
                                        <div style={{
                                            background: data?.kycStatus === 'pending' ? 'hsl(38,92%,50%)' : 'hsl(348,83%,47%)',
                                            height: '100%',
                                            width: data?.kycStatus === 'pending' ? '50%' : '10%',
                                            borderRadius: '9999px',
                                            boxShadow: `0 0 8px ${data?.kycStatus === 'pending' ? 'hsl(38,92%,50%)' : 'hsl(348,83%,47%)'}`,
                                        }} className="animate-pulse-glow"></div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Biometric Face ID */}
                        <div className="kyc-card" style={{
                            borderColor: data?.faceVerified ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)',
                            background: data?.faceVerified ? 'rgba(34,197,94,0.08)' : 'rgba(0,0,0,0.15)',
                        }}>
                            <div className="kyc-icon-wrapper" style={{
                                background: data?.faceVerified ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                            }}>
                                <Fingerprint size={28} style={{ color: data?.faceVerified ? 'hsl(142,71%,45%)' : 'hsl(220,15%,60%)' }} />
                            </div>
                            <div>
                                <p style={{ fontWeight: 700, fontSize: '1rem', margin: '0 0 0.4rem 0' }}>Biometric Face ID</p>
                                <span className={`badge ${data?.faceVerified ? 'badge-success' : 'badge-neutral'}`}>
                                    {data?.faceVerified ? 'VERIFIED & BOUND' : 'PENDING'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Section 3: Update Email / Phone ─── */}
                <div className="profile-panel">
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>
                        <Edit3 style={{ width: '1.25rem', height: '1.25rem', color: 'hsl(255,85%,65%)' }} /> Update Contact Info
                    </h3>

                    {!editMode ? (
                        <div className="contact-info-list">
                            <div className="contact-row">
                                <Mail size={18} style={{ color: 'hsl(255,85%,65%)', flexShrink: 0 }} />
                                <div>
                                    <p className="contact-label">Email</p>
                                    <p style={{ fontWeight: 500, margin: 0 }}>{data?.email || '—'}</p>
                                </div>
                            </div>
                            <div className="contact-row">
                                <Phone size={18} style={{ color: 'hsl(255,85%,65%)', flexShrink: 0 }} />
                                <div>
                                    <p className="contact-label">Phone</p>
                                    <p style={{ fontWeight: 500, margin: 0 }}>{data?.phone || 'Not Provided'}</p>
                                </div>
                            </div>
                            <button className="btn btn-secondary" onClick={startEdit} style={{ alignSelf: 'flex-start', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                                <Edit3 size={16} /> Edit Contact Info
                            </button>
                        </div>
                    ) : (
                        <div className="contact-info-list">
                            <div className="form-group">
                                <label className="form-label">Email Address</label>
                                <input
                                    className="input-premium"
                                    type="email"
                                    value={editEmail}
                                    onChange={(e) => setEditEmail(e.target.value)}
                                    placeholder="you@example.com"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone Number</label>
                                <input
                                    className="input-premium"
                                    type="tel"
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <div className="action-buttons">
                                <button className="btn btn-primary btn-glow" onClick={handleSaveProfile} disabled={profileSaving} style={{ fontSize: '0.875rem' }}>
                                    {profileSaving ? <><RefreshCw size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
                                </button>
                                <button className="btn btn-ghost" onClick={cancelEdit} style={{ fontSize: '0.875rem' }}>
                                    <X size={16} /> Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {profileMsg.text && (
                        <div className="alert-message" style={{
                            background: profileMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : profileMsg.type === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
                            border: `1px solid ${profileMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : profileMsg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.3)'}`,
                            color: profileMsg.type === 'success' ? 'hsl(142,71%,45%)' : profileMsg.type === 'error' ? 'hsl(348,83%,47%)' : 'hsl(255,85%,65%)',
                        }}>
                            {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : profileMsg.type === 'error' ? <AlertTriangle size={16} /> : null}
                            {profileMsg.text}
                        </div>
                    )}
                </div>

                {/* ─── Section 4: Wallet Recovery ─── */}
                <div className="profile-panel">
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>
                        <KeyRound style={{ width: '1.25rem', height: '1.25rem', color: 'hsl(255,85%,65%)' }} /> Wallet Recovery
                    </h3>
                    <p className="text-muted" style={{ fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                        Lost access to your wallet? Submit a recovery request. A government authority will verify your identity via biometric checks before processing.
                    </p>

                    {!showRecovery ? (
                        <button className="btn btn-secondary" onClick={() => { setShowRecovery(true); setRecoveryMsg({ type: '', text: '' }); }} style={{ fontSize: '0.875rem' }}>
                            <KeyRound size={16} /> Request Wallet Recovery
                        </button>
                    ) : (
                        <div className="recovery-form-box">
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Lost Wallet Address</label>
                                <input
                                    className="input-premium"
                                    type="text"
                                    value={recoveryWallet}
                                    onChange={(e) => setRecoveryWallet(e.target.value)}
                                    placeholder="0x..."
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Reason for Recovery</label>
                                <textarea
                                    className="input-premium"
                                    rows={3}
                                    value={recoveryReason}
                                    onChange={(e) => setRecoveryReason(e.target.value)}
                                    placeholder="Describe why you need to recover this wallet..."
                                    style={{ resize: 'vertical', minHeight: '80px' }}
                                />
                            </div>
                            <div className="action-buttons">
                                <button
                                    className="btn btn-primary btn-glow"
                                    onClick={handleRequestRecovery}
                                    disabled={recoverySaving || !recoveryWallet || recoveryReason.length < 10}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    {recoverySaving ? <><RefreshCw size={16} className="animate-spin" /> Submitting...</> : <><KeyRound size={16} /> Submit Request</>}
                                </button>
                                <button className="btn btn-ghost" onClick={() => setShowRecovery(false)} style={{ fontSize: '0.875rem' }}>
                                    <X size={16} /> Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {recoveryMsg.text && (
                        <div className="alert-message" style={{
                            background: recoveryMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                            border: `1px solid ${recoveryMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            color: recoveryMsg.type === 'success' ? 'hsl(142,71%,45%)' : 'hsl(348,83%,47%)',
                        }}>
                            {recoveryMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            {recoveryMsg.text}
                        </div>
                    )}
                </div>

                {/* ─── Section 5: Linked Wallet Address ─── */}
                <div className="profile-panel">
                    <h3 className="section-title" style={{ marginBottom: '1.5rem' }}>
                        <Wallet style={{ width: '1.25rem', height: '1.25rem', color: 'hsl(255,85%,65%)' }} /> Linked Wallet
                    </h3>

                    {/* Registered wallet display */}
                    <div className="wallet-display-box">
                        <p className="contact-label" style={{ marginBottom: '0.75rem' }}>Registered Wallet Address</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <code className="wallet-address-code">
                                {data?.walletAddress || 'No wallet linked'}
                            </code>
                            {data?.walletAddress && (
                                <button
                                    onClick={handleCopyAddress}
                                    className="copy-btn"
                                    style={{
                                        background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'var(--border-subtle)'}`,
                                        color: copied ? 'hsl(142,71%,45%)' : 'hsl(220,15%,60%)',
                                    }}
                                    title="Copy address"
                                >
                                    {copied ? <><CheckCircle2 size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Connected wallet status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        {account ? (
                            <div className="connected-wallet-pill" style={{
                                background: account.toLowerCase() === data?.walletAddress?.toLowerCase()
                                    ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                                border: `1px solid ${account.toLowerCase() === data?.walletAddress?.toLowerCase()
                                    ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                color: account.toLowerCase() === data?.walletAddress?.toLowerCase()
                                    ? 'hsl(142,71%,45%)' : 'hsl(348,83%,47%)',
                            }}>
                                <div style={{
                                    width: '8px', height: '8px', borderRadius: '50%',
                                    background: account.toLowerCase() === data?.walletAddress?.toLowerCase()
                                        ? 'hsl(142,71%,45%)' : 'hsl(348,83%,47%)',
                                    boxShadow: `0 0 8px ${account.toLowerCase() === data?.walletAddress?.toLowerCase()
                                        ? 'hsl(142,71%,45%)' : 'hsl(348,83%,47%)'}`,
                                }}></div>
                                <span>
                                    {account.slice(0, 6)}...{account.slice(-4)}
                                    {account.toLowerCase() !== data?.walletAddress?.toLowerCase() && ' (Mismatch)'}
                                </span>
                            </div>
                        ) : (
                            <button
                                className="btn btn-secondary"
                                onClick={handleConnectWallet}
                                disabled={isConnecting}
                                style={{ fontSize: '0.875rem' }}
                            >
                                <Wallet size={16} />
                                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                            </button>
                        )}
                    </div>

                    {walletError && (
                        <div className="alert-message" style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: 'hsl(348,83%,47%)',
                        }}>
                            <AlertTriangle size={14} /> {walletError}
                        </div>
                    )}
                </div>

                {/* Security Footer Note */}
                <div className="profile-footer">
                    <ShieldCheck style={{ flexShrink: 0, color: 'hsl(255,85%,65%)', width: '1.25rem', height: '1.25rem' }} />
                    <p style={{ fontSize: '0.75rem', color: 'hsl(220,15%,60%)', lineHeight: 1.6 }}>
                        Your identity data is cryptographically secured on-chain. All profile changes are logged in the immutable audit trail. Smart contract actions require wallet signature.
                    </p>
                </div>
            </div>
        </div >
    );
};

export default UserDashboard;
