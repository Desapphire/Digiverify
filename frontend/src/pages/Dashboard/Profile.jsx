import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { userService } from '../../services/user.service';
import {
    User, Wallet, ShieldCheck, FileText, Mail, Phone,
    KeyRound, AlertTriangle, CheckCircle2, Copy, ExternalLink,
    RefreshCw, Edit3, Save, X, Fingerprint, Activity
} from 'lucide-react';
import './Profile.css';
import './PropertyPages.css';

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

    const handleLinkWallet = async () => {
        if (!account) return;
        setProfileSaving(true);
        try {
            const res = await userService.updateProfile({ walletAddress: account });
            if (res.data?.data) {
                setProfile(res.data.data);
                setProfileMsg({ type: 'success', text: 'Wallet linked successfully!' });
            }
        } catch (err) {
            setProfileMsg({ type: 'error', text: err.response?.data?.message || 'Failed to link wallet.' });
        } finally {
            setProfileSaving(false);
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Activity style={{ width: '3rem', height: '3rem', color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.05em', fontSize: '0.875rem', color: '#00E5FF' }}>Loading Profile Payload...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>

            {/* Page Header */}
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                    Identity <span style={{ color: '#00E5FF', textShadow: '0 0 15px rgba(0,229,255,0.4)' }}>Profile</span>
                </h1>
                <p style={{ color: '#9ca3af', fontSize: '0.9rem', maxWidth: '600px' }}>
                    Manage your secure identity parameters, connected financial nodes, and recovery protocols.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column: Details & Verification */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ─── Section 1: Personal Details ─── */}
                    <div className="cyber-hud-bar" style={{ display: 'block' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <User size={18} style={{ color: '#00E5FF' }} /> Master Node Data
                            </h3>
                            {!editMode && (
                                <button className="cyber-btn-hollow" onClick={startEdit} style={{ '--btn-color': '#00E5FF', padding: '0.4rem 1rem', fontSize: '0.75rem' }}>
                                    <Edit3 size={14} /> Update
                                </button>
                            )}
                        </div>

                        <div className="cyber-data-grid">
                            <div className="cyber-data-item">
                                <span className="label">Citizen Name</span>
                                <span className="value">{data?.name || '—'}</span>
                            </div>
                            <div className="cyber-data-item">
                                <span className="label">Registered Node Email</span>
                                <span className="value" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data?.email || '—'}</span>
                            </div>
                            <div className="cyber-data-item">
                                <span className="label">Contact Number</span>
                                <span className="value">{data?.phone || 'Not Provided'}</span>
                            </div>
                            <div className="cyber-data-item">
                                <span className="label">Birthdate</span>
                                <span className="value">{data?.birthdate ? new Date(data.birthdate).toLocaleDateString() : 'Not Provided'}</span>
                            </div>
                            <div className="cyber-data-item">
                                <span className="label">Authorization Tier</span>
                                <span className="value" style={{ color: '#00E5FF', textTransform: 'uppercase' }}>{data?.role || 'user'}</span>
                            </div>
                            <div className="cyber-data-item">
                                <span className="label">Initialization Date</span>
                                <span className="value">{data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── Section 3: Update Contact Info ─── */}
                    {editMode && (
                        <div className="cyber-hud-bar" style={{ display: 'block', borderColor: '#F59E0B' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                                <Edit3 size={18} style={{ color: '#F59E0B' }} /> Network Node Rewrite
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>Email Assignment</label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                                        placeholder="user@network.gov"
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>Terminal Contact</label>
                                    <input
                                        type="tel"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px' }}
                                        placeholder="+000 000 000"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button className="cyber-btn-hollow" onClick={handleSaveProfile} disabled={profileSaving} style={{ '--btn-color': '#00E5FF' }}>
                                        {profileSaving ? 'Synthesizing...' : 'Commit Protocol'}
                                    </button>
                                    <button className="cyber-btn-hollow" onClick={cancelEdit} style={{ '--btn-color': '#EF4444' }}>
                                        Abort
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* ─── Section 2: Verification Status ─── */}
                    <div className="cyber-hud-bar" style={{ display: 'block' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                            <ShieldCheck size={18} style={{ color: '#10B981' }} /> Certification Matrix
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                            {/* Document Status */}
                            <div style={{
                                padding: '1.25rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)',
                                border: `1px solid ${data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? '#10B981' : data?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444'}60`,
                                display: 'flex', gap: '1rem', alignItems: 'flex-start'
                            }}>
                                <div style={{
                                    padding: '0.6rem', borderRadius: '8px',
                                    background: `${data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? '#10B981' : data?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444'}20`
                                }}>
                                    <FileText size={24} style={{ color: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? '#10B981' : data?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', marginBottom: '0.5rem' }}>Documentation Ledger</p>
                                    <div className="cyber-badge" style={{
                                        '--badge-color': data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? '#10B981' : data?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444',
                                        '--badge-bg': 'rgba(0,0,0,0.5)', padding: '0.3rem 0.6rem', fontSize: '0.65rem'
                                    }}>
                                        {data?.kycStatus?.toUpperCase() || 'UNKNOWN'}
                                    </div>
                                    {data?.kycStatus !== 'approved' && data?.kycStatus !== 'verified' && (
                                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '0.75rem', overflow: 'hidden' }}>
                                            <div className="animate-pulse" style={{ height: '100%', width: data?.kycStatus === 'pending' ? '50%' : '10%', background: data?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444' }}></div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Biometric Status */}
                            <div style={{
                                padding: '1.25rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)',
                                border: `1px solid ${data?.faceVerified ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                                display: 'flex', gap: '1rem', alignItems: 'flex-start'
                            }}>
                                <div style={{
                                    padding: '0.6rem', borderRadius: '8px',
                                    background: `${data?.faceVerified ? '#10B981' : '#ffffff'}20`
                                }}>
                                    <Fingerprint size={24} style={{ color: data?.faceVerified ? '#10B981' : '#9ca3af' }} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'white', marginBottom: '0.5rem' }}>Biometric Sync</p>
                                    <div className="cyber-badge" style={{
                                        '--badge-color': data?.faceVerified ? '#10B981' : '#9ca3af',
                                        '--badge-bg': 'rgba(0,0,0,0.5)', padding: '0.3rem 0.6rem', fontSize: '0.65rem', '--badge-border': 'transparent'
                                    }}>
                                        {data?.faceVerified ? 'VERIFIED' : 'PENDING SECURE'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Wallet & Recovery */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* ─── Section 5: Linked Wallet ─── */}
                    <div className="cyber-hud-bar" style={{ display: 'block' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                            <Wallet size={18} style={{ color: '#A855F7' }} /> Decentralized Address
                        </h3>

                        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 700, marginBottom: '0.6rem' }}>Primary Ledger ID</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                                <code style={{
                                    fontFamily: 'monospace', color: '#A855F7', background: 'rgba(168,85,247,0.1)',
                                    padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem', flex: 1, wordBreak: 'break-all'
                                }}>
                                    {data?.walletAddress || 'Uninitialized'}
                                </code>
                                {data?.walletAddress && (
                                    <button onClick={handleCopyAddress} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                        {copied ? <><CheckCircle2 size={12} style={{ color: '#10B981' }} /> Copied</> : <><Copy size={12} /> Copy</>}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            {account ? (
                                <>
                                    <div className="cyber-badge" style={{
                                        '--badge-color': (data?.walletAddress && account.toLowerCase() === data?.walletAddress?.toLowerCase()) ? '#10B981' : data?.walletAddress ? '#EF4444' : '#F59E0B',
                                        '--badge-bg': 'rgba(0,0,0,0.4)', padding: '0.6rem 1rem', wordBreak: 'break-all'
                                    }}>
                                        {account}
                                        {data?.walletAddress && account.toLowerCase() !== data?.walletAddress?.toLowerCase() && ' (MISMATCH)'}
                                        {!data?.walletAddress && ' (CONNECTED)'}
                                    </div>
                                    {!data?.walletAddress && (
                                        <button className="cyber-btn-hollow" onClick={handleLinkWallet} disabled={profileSaving} style={{ '--btn-color': '#10B981', padding: '0.5rem 1rem' }}>
                                            Link to Identity
                                        </button>
                                    )}
                                </>
                            ) : (
                                <button className="cyber-btn-hollow" onClick={handleConnectWallet} disabled={isConnecting} style={{ '--btn-color': '#A855F7', padding: '0.6rem 1.25rem', width: '100%', justifyContent: 'center' }}>
                                    <Wallet size={16} /> {isConnecting ? 'Establishing Link...' : 'Connect Hardware Wallet'}
                                </button>
                            )}
                        </div>

                        {walletError && (
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#EF4444', marginTop: '1rem' }}><AlertTriangle size={12} style={{ display: 'inline' }} /> {walletError}</p>
                        )}
                        {profileMsg.text && (
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: profileMsg.type === 'success' ? '#10B981' : '#EF4444', marginTop: '1rem', textTransform: 'uppercase' }}>
                                {profileMsg.text}
                            </p>
                        )}
                    </div>

                    {/* ─── Section 4: Wallet Recovery ─── */}
                    <div className="cyber-hud-bar" style={{ display: 'block', borderColor: 'rgba(239,68,68,0.2)' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                            <KeyRound size={18} style={{ color: '#EF4444' }} /> Emergency Recovery
                        </h3>

                        <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                            Initiate a protocol override if hardware wallet access is permanently corrupted. Required multi-sig validation from government authorities.
                        </p>

                        {!showRecovery ? (
                            <button className="cyber-btn-hollow" onClick={() => { setShowRecovery(true); setRecoveryMsg({ type: '', text: '' }); }} style={{ '--btn-color': '#EF4444', width: '100%', justifyContent: 'center' }}>
                                <KeyRound size={16} /> Initialize Recovery Protocol
                            </button>
                        ) : (
                            <div style={{ background: 'rgba(239,68,68,0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#EF4444', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>Corrupted Wallet Payload</label>
                                    <input
                                        type="text"
                                        value={recoveryWallet}
                                        onChange={(e) => setRecoveryWallet(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(239,68,68,0.3)', color: 'white', borderRadius: '8px' }}
                                        placeholder="0x..."
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#EF4444', fontWeight: 700, marginBottom: '0.4rem', display: 'block' }}>System Diagnostics Reason</label>
                                    <textarea
                                        rows={3}
                                        value={recoveryReason}
                                        onChange={(e) => setRecoveryReason(e.target.value)}
                                        style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(239,68,68,0.3)', color: 'white', borderRadius: '8px', minHeight: '80px', resize: 'vertical' }}
                                        placeholder="..."
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                                    <button
                                        className="cyber-btn-hollow"
                                        onClick={handleRequestRecovery}
                                        disabled={recoverySaving || !recoveryWallet || recoveryReason.length < 10}
                                        style={{ '--btn-color': '#EF4444', flex: 1, justifyContent: 'center' }}
                                    >
                                        Execute Command
                                    </button>
                                    <button className="cyber-btn-hollow" onClick={() => setShowRecovery(false)} style={{ '--btn-color': '#9ca3af' }}>Abort</button>
                                </div>
                            </div>
                        )}

                        {recoveryMsg.text && (
                            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: recoveryMsg.type === 'success' ? '#10B981' : '#EF4444', marginTop: '1rem' }}>
                                <AlertTriangle size={12} style={{ display: 'inline' }} /> {recoveryMsg.text}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <ShieldCheck style={{ width: '1.5rem', height: '1.5rem', color: '#00E5FF' }} />
                <p style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>
                    Strict immutability enforced. Core identity parameters are secured via state-backed cryptography. Wallet alterations are permanently tracked in the network ledger.
                </p>
            </div>
        </div>
    );
};

export default UserDashboard;
