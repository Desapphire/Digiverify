import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { userService } from '../../services/user.service';
import { TopNavbar } from '../../components/TopNavbar';
import {
    User, Wallet, ShieldCheck, FileText, Mail, Phone,
    KeyRound, AlertTriangle, CheckCircle2, Copy, ExternalLink,
    RefreshCw, Edit3, Save, X, Fingerprint, Loader2, MapPin,
    Users, Globe, Shield, Calendar, Award, Building, Lock
} from 'lucide-react';
import './PropertyPages.css';

const Profile = () => {
    const { user } = useAuth();
    const { account, connectWallet, isConnecting } = useWeb3();

    // Profile editing state
    const [editMode, setEditMode] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editFatherSpouseName, setEditFatherSpouseName] = useState('');
    const [editPanNumber, setEditPanNumber] = useState('');
    const [editDomicileState, setEditDomicileState] = useState('');
    const [editNomineeName, setEditNomineeName] = useState('');
    const [editNomineeWallet, setEditNomineeWallet] = useState('');
    const [editEmergencyPhone, setEditEmergencyPhone] = useState('');
    const [editLanguage, setEditLanguage] = useState('en');
    const [editHouseNumber, setEditHouseNumber] = useState('');
    const [editLocality, setEditLocality] = useState('');
    const [editCity, setEditCity] = useState('');
    const [editPinCode, setEditPinCode] = useState('');
    const [editState, setEditState] = useState('');
    const [editCountry, setEditCountry] = useState('');
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
    const [copiedField, setCopiedField] = useState(null);

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
                setWalletError(`Wallet mismatch! Connected: ${connectedAccount.slice(0, 6)}...${connectedAccount.slice(-4)} (Expected: ${profile.walletAddress.slice(0, 6)}...${profile.walletAddress.slice(-4)})`);
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

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const startEdit = () => {
        setEditEmail(profile?.email || '');
        setEditPhone(profile?.phone || '');
        setEditFatherSpouseName(profile?.fatherSpouseName || '');
        setEditPanNumber(profile?.panNumber || '');
        setEditDomicileState(profile?.domicileState || '');
        setEditNomineeName(profile?.nomineeName || '');
        setEditNomineeWallet(profile?.nomineeWallet || '');
        setEditEmergencyPhone(profile?.emergencyContactPhone || '');
        setEditLanguage(profile?.preferredLanguage || 'en');
        setEditHouseNumber(profile?.houseNumber || '');
        setEditLocality(profile?.locality || '');
        setEditCity(profile?.city || '');
        setEditPinCode(profile?.pinCode || '');
        setEditState(profile?.state || '');
        setEditCountry(profile?.country || '');
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
            const payload = {
                email: editEmail,
                phone: editPhone,
                fatherSpouseName: editFatherSpouseName,
                panNumber: editPanNumber,
                domicileState: editDomicileState,
                nomineeName: editNomineeName,
                nomineeWallet: editNomineeWallet,
                emergencyContactPhone: editEmergencyPhone,
                preferredLanguage: editLanguage,
                houseNumber: editHouseNumber,
                locality: editLocality,
                city: editCity,
                pinCode: editPinCode,
                state: editState,
                country: editCountry,
            };

            const res = await userService.updateProfile(payload);
            if (res.data?.data) {
                setProfile(res.data.data);
                setProfileMsg({ type: 'success', text: 'Citizen credentials & profile updated successfully!' });
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
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, color: '#94A3B8', fontSize: '0.9rem' }}>Loading verified citizen profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            {/* Top Navbar */}
            <TopNavbar 
                title="Citizen Profile & Credentials" 
                subtitle="Manage verified government identity attributes, legal nominee details, and linked Web3 wallets"
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>

                {profileMsg.text && (
                    <div style={{
                        padding: '0.85rem 1.25rem',
                        borderRadius: '10px',
                        marginBottom: '1.75rem',
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: profileMsg.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        border: `1px solid ${profileMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        color: profileMsg.type === 'success' ? '#10B981' : '#EF4444'
                    }}>
                        {profileMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                        {profileMsg.text}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                    
                    {/* ─── Column 1: Personal & Land Revenue Identity ─── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Personal & Revenue Identity Card */}
                        <div className="digi-card" style={{ padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1E293B', paddingBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(2,132,199,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                            Personal & Revenue Identity
                                        </h3>
                                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>State Land Registry Citizen Record</span>
                                    </div>
                                </div>
                                {!editMode && (
                                    <button className="btn-cyan-outline" onClick={startEdit} style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Edit3 size={14} /> Edit Information
                                    </button>
                                )}
                            </div>

                            {!editMode ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Full Legal Name</span>
                                        <span style={{ color: '#F8FAFC', fontSize: '0.95rem', fontWeight: 700, marginTop: '0.2rem', display: 'block' }}>{data?.name || '—'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Father's / Spouse Name</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>{data?.fatherSpouseName || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Email Address</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data?.email || '—'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Phone Number</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block' }}>{data?.phone || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Date of Birth</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block' }}>{data?.birthdate ? new Date(data.birthdate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>PAN / Tax Identifier</span>
                                        <span style={{ color: '#38BDF8', fontFamily: 'JetBrains Mono', fontSize: '0.88rem', fontWeight: 700, marginTop: '0.2rem', display: 'block' }}>{data?.panNumber ? data.panNumber.toUpperCase() : 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Government ID Type</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block' }}>{data?.governmentIdType || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Domicile State</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block' }}>{data?.domicileState || data?.state || 'Not Provided'}</span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Preferred Language</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block', textTransform: 'capitalize' }}>
                                            {data?.preferredLanguage === 'hi' ? 'Hindi (हिंदी)' : 
                                             data?.preferredLanguage === 'kn' ? 'Kannada (ಕನ್ನಡ)' : 
                                             data?.preferredLanguage === 'mr' ? 'Marathi (मराठी)' : 
                                             data?.preferredLanguage === 'te' ? 'Telugu (తెలుగు)' : 
                                             data?.preferredLanguage === 'ta' ? 'Tamil (தமிழ்)' : 'English (en)'}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Member Since</span>
                                        <span style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.2rem', display: 'block' }}>
                                            {data?.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Verified Citizen'}
                                        </span>
                                    </div>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Residential Address</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block', lineHeight: 1.5 }}>
                                            {data?.houseNumber || data?.locality || data?.city || data?.pinCode || data?.state || data?.country ? (
                                                `${data.houseNumber || ''}, ${data.locality || ''}, ${data.city || ''} - ${data.pinCode || ''}, ${data.state || ''}, ${data.country || ''}`.replace(/^, /, '').replace(/,\s*,/g, ',')
                                            ) : 'Not Provided'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                /* Edit Form */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Email Address</label>
                                            <input
                                                type="email"
                                                value={editEmail}
                                                onChange={(e) => setEditEmail(e.target.value)}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Phone Number</label>
                                            <input
                                                type="tel"
                                                value={editPhone}
                                                onChange={(e) => setEditPhone(e.target.value)}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Father's / Spouse Name</label>
                                            <input
                                                type="text"
                                                value={editFatherSpouseName}
                                                onChange={(e) => setEditFatherSpouseName(e.target.value)}
                                                placeholder="e.g. Ramesh Chandra"
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>PAN Number</label>
                                            <input
                                                type="text"
                                                value={editPanNumber}
                                                onChange={(e) => setEditPanNumber(e.target.value.toUpperCase())}
                                                placeholder="ABCDE1234F"
                                                maxLength={10}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'JetBrains Mono' }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Domicile State</label>
                                            <input
                                                type="text"
                                                value={editDomicileState}
                                                onChange={(e) => setEditDomicileState(e.target.value)}
                                                placeholder="e.g. Maharashtra"
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Preferred Portal Language</label>
                                            <select
                                                value={editLanguage}
                                                onChange={(e) => setEditLanguage(e.target.value)}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            >
                                                <option value="en">English</option>
                                                <option value="hi">Hindi (हिंदी)</option>
                                                <option value="kn">Kannada (ಕನ್ನಡ)</option>
                                                <option value="mr">Marathi (मराठी)</option>
                                                <option value="te">Telugu (తెలుగు)</option>
                                                <option value="ta">Tamil (தமிழ்)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>House / Flat & Street</label>
                                        <input
                                            type="text"
                                            value={editHouseNumber}
                                            onChange={(e) => setEditHouseNumber(e.target.value)}
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Locality / Area</label>
                                        <input
                                            type="text"
                                            value={editLocality}
                                            onChange={(e) => setEditLocality(e.target.value)}
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>City</label>
                                            <input
                                                type="text"
                                                value={editCity}
                                                onChange={(e) => setEditCity(e.target.value)}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>PIN Code</label>
                                            <input
                                                type="text"
                                                value={editPinCode}
                                                onChange={(e) => setEditPinCode(e.target.value)}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>State</label>
                                            <input
                                                type="text"
                                                value={editState}
                                                onChange={(e) => setEditState(e.target.value)}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Country</label>
                                            <input
                                                type="text"
                                                value={editCountry}
                                                onChange={(e) => setEditCountry(e.target.value)}
                                                className="input-premium"
                                                style={{ width: '100%', fontSize: '0.85rem' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <button className="btn-cyan-glow" onClick={handleSaveProfile} disabled={profileSaving} style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem' }}>
                                            {profileSaving ? 'Saving Changes...' : 'Save Profile Changes'}
                                        </button>
                                        <button className="btn-cyan-outline" onClick={cancelEdit} style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}>
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Legal Nominee & Succession Planning Card */}
                        <div className="digi-card" style={{ padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #1E293B', paddingBottom: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                            Legal Nominee & Succession
                                        </h3>
                                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Designated Inheritance Beneficiary & Emergency Contact</span>
                                    </div>
                                </div>
                                {!editMode && (
                                    <button className="btn-cyan-outline" onClick={startEdit} style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Edit3 size={14} /> Update Nominee
                                    </button>
                                )}
                            </div>

                            {!editMode ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Designated Nominee</span>
                                        <span style={{ color: '#F8FAFC', fontSize: '0.92rem', fontWeight: 600, marginTop: '0.2rem', display: 'block' }}>
                                            {data?.nomineeName || 'No Nominee Assigned'}
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Emergency Alert Phone</span>
                                        <span style={{ color: '#CBD5E1', fontSize: '0.88rem', marginTop: '0.2rem', display: 'block' }}>
                                            {data?.emergencyContactPhone || 'Not Set'}
                                        </span>
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <span style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>Nominee Web3 Wallet</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                            <code style={{ fontFamily: 'JetBrains Mono', color: data?.nomineeWallet ? '#38BDF8' : '#64748B', fontSize: '0.85rem' }}>
                                                {data?.nomineeWallet || 'No beneficiary wallet bound'}
                                            </code>
                                            {data?.nomineeWallet && (
                                                <button 
                                                    onClick={() => handleCopy(data.nomineeWallet, 'nominee-wallet')} 
                                                    style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    {copiedField === 'nominee-wallet' ? <CheckCircle2 size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Nominee Full Legal Name</label>
                                        <input
                                            type="text"
                                            value={editNomineeName}
                                            onChange={(e) => setEditNomineeName(e.target.value)}
                                            placeholder="e.g. Ananya Sharma (Daughter / Spouse)"
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Nominee EVM Wallet Address</label>
                                        <input
                                            type="text"
                                            value={editNomineeWallet}
                                            onChange={(e) => setEditNomineeWallet(e.target.value)}
                                            placeholder="0x..."
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem', fontFamily: 'JetBrains Mono' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Emergency Legal Contact Phone</label>
                                        <input
                                            type="tel"
                                            value={editEmergencyPhone}
                                            onChange={(e) => setEditEmergencyPhone(e.target.value)}
                                            placeholder="+91..."
                                            className="input-premium"
                                            style={{ width: '100%', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                    <button className="btn-cyan-glow" onClick={handleSaveProfile} disabled={profileSaving} style={{ padding: '0.65rem 1.4rem', fontSize: '0.85rem', alignSelf: 'flex-start' }}>
                                        {profileSaving ? 'Saving Nominee...' : 'Save Nominee Info'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Column 2: KYC, Biometrics & Web3 Security ─── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* KYC & Cryptographic Telemetry Card */}
                        <div className="digi-card" style={{ padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #1E293B', paddingBottom: '1rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                        Identity Verification & Biometrics
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>State Registrar Compliance & Cryptographic Proofs</span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {/* KYC Badge */}
                                <div style={{ padding: '1rem', borderRadius: '10px', background: '#0B0F19', border: '1px solid #1E293B' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8' }}>KYC Status</span>
                                        <FileText size={16} style={{ color: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? '#10B981' : data?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444' }} />
                                    </div>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        background: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? 'rgba(16,185,129,0.15)' : data?.kycStatus === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? '#10B981' : data?.kycStatus === 'pending' ? '#F59E0B' : '#EF4444',
                                        border: `1px solid ${data?.kycStatus === 'approved' || data?.kycStatus === 'verified' ? 'rgba(16,185,129,0.3)' : data?.kycStatus === 'pending' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`
                                    }}>
                                        {data?.kycStatus?.toUpperCase() || 'UNVERIFIED'}
                                    </span>
                                </div>

                                {/* Biometric Liveness Badge */}
                                <div style={{ padding: '1rem', borderRadius: '10px', background: '#0B0F19', border: '1px solid #1E293B' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8' }}>Facial Liveness</span>
                                        <Fingerprint size={16} style={{ color: data?.faceVerified ? '#10B981' : '#64748B' }} />
                                    </div>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.65rem',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        background: data?.faceVerified ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                                        color: data?.faceVerified ? '#10B981' : '#94A3B8',
                                        border: `1px solid ${data?.faceVerified ? 'rgba(16,185,129,0.3)' : '#334155'}`
                                    }}>
                                        {data?.faceVerified ? 'VERIFIED' : 'PENDING'}
                                    </span>
                                </div>
                            </div>

                            {/* Telemetry Hashes */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {data?.kycDocumentHash && (
                                    <div style={{ padding: '0.85rem 1rem', background: '#0B0F19', borderRadius: '10px', border: '1px solid #1E293B' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                                            IPFS KYC Document CID
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                            <code style={{ fontFamily: 'JetBrains Mono', color: '#38BDF8', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                                {data.kycDocumentHash}
                                            </code>
                                            <button 
                                                onClick={() => handleCopy(data.kycDocumentHash, 'kyc-cid')}
                                                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                                title="Copy IPFS CID"
                                            >
                                                {copiedField === 'kyc-cid' ? <CheckCircle2 size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {data?.faceIdHash && (
                                    <div style={{ padding: '0.85rem 1rem', background: '#0B0F19', borderRadius: '10px', border: '1px solid #1E293B' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                                            Facial Biometric Vector Hash
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                                            <code style={{ fontFamily: 'JetBrains Mono', color: '#10B981', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                                {data.faceIdHash}
                                            </code>
                                            <button 
                                                onClick={() => handleCopy(data.faceIdHash, 'face-hash')}
                                                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '2px' }}
                                            >
                                                {copiedField === 'face-hash' ? <CheckCircle2 size={13} style={{ color: '#10B981' }} /> : <Copy size={13} />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {data?.adminComments && (
                                    <div style={{ padding: '0.85rem 1rem', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '10px', border: '1px solid rgba(2, 132, 199, 0.25)' }}>
                                        <span style={{ fontSize: '0.7rem', color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block', marginBottom: '0.3rem' }}>
                                            Registrar Official Remarks
                                        </span>
                                        <p style={{ color: '#CBD5E1', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                                            {data.adminComments}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Connected Wallet & Recovery Card */}
                        <div className="digi-card" style={{ padding: '1.75rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #1E293B', paddingBottom: '1rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(56,189,248,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38BDF8' }}>
                                    <Wallet size={18} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                        Connected Web3 Wallet
                                    </h3>
                                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Avalanche Fuji C-Chain Smart Contract Authorization</span>
                                </div>
                            </div>

                            <div style={{ background: '#0B0F19', padding: '1.1rem', borderRadius: '12px', border: '1px solid #1E293B', marginBottom: '1.25rem' }}>
                                <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: '0.4rem' }}>
                                    Linked Account Address
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <code style={{ fontFamily: 'JetBrains Mono', color: '#38BDF8', fontSize: '0.88rem', wordBreak: 'break-all' }}>
                                        {data?.walletAddress || 'No wallet linked'}
                                    </code>
                                    {data?.walletAddress && (
                                        <button 
                                            onClick={() => handleCopy(data.walletAddress, 'wallet-address')} 
                                            style={{ background: '#1E293B', border: '1px solid #334155', color: '#94A3B8', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}
                                        >
                                            {copiedField === 'wallet-address' ? <><CheckCircle2 size={13} style={{ color: '#10B981' }} /> Copied</> : <><Copy size={13} /> Copy</>}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {account ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem 1rem', background: '#0B0F19', borderRadius: '10px', border: '1px solid #1E293B' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }}></span>
                                            <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.82rem', color: '#CBD5E1' }}>
                                                {account.slice(0, 8)}...{account.slice(-6)}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>MetaMask Connected</span>
                                    </div>
                                ) : (
                                    <button className="btn-cyan-outline" onClick={handleConnectWallet} disabled={isConnecting} style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
                                        <Wallet size={16} /> {isConnecting ? 'Connecting...' : 'Connect Web3 Wallet'}
                                    </button>
                                )}

                                {walletError && (
                                    <p style={{ fontSize: '0.78rem', color: '#EF4444', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <AlertTriangle size={14} /> {walletError}
                                    </p>
                                )}

                                {/* Wallet Recovery Trigger */}
                                <div style={{ marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid #1E293B' }}>
                                    {!showRecovery ? (
                                        <button
                                            onClick={() => { setShowRecovery(true); setRecoveryMsg({ type: '', text: '' }); }}
                                            style={{
                                                width: '100%', padding: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                gap: '0.5rem', fontSize: '0.82rem', background: 'rgba(239,68,68,0.08)',
                                                border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#EF4444',
                                                fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                        >
                                            <KeyRound size={15} /> Lost Key? Request Government Wallet Recovery
                                        </button>
                                    ) : (
                                        <div style={{ background: '#0B0F19', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.25)' }}>
                                            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#EF4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <KeyRound size={16} /> Key Recovery Request
                                            </h4>
                                            <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginBottom: '1rem', lineHeight: 1.5 }}>
                                                Initiates an official investigation to reassign your on-chain land titles to a newly verified key.
                                            </p>

                                            <div style={{ marginBottom: '0.85rem' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Compromised / Lost Wallet Address</label>
                                                <input
                                                    type="text"
                                                    value={recoveryWallet}
                                                    onChange={(e) => setRecoveryWallet(e.target.value)}
                                                    className="input-premium"
                                                    placeholder="0x..."
                                                    style={{ width: '100%', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94A3B8', marginBottom: '0.3rem', display: 'block' }}>Reason & Circumstances</label>
                                                <textarea
                                                    rows={3}
                                                    value={recoveryReason}
                                                    onChange={(e) => setRecoveryReason(e.target.value)}
                                                    className="input-premium"
                                                    placeholder="Explain incident details for the land registrar..."
                                                    style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                <button
                                                    className="btn-cyan-glow"
                                                    onClick={handleRequestRecovery}
                                                    disabled={recoverySaving || !recoveryWallet || recoveryReason.length < 10}
                                                    style={{ flex: 1, padding: '0.65rem', fontSize: '0.825rem', background: '#DC2626' }}
                                                >
                                                    {recoverySaving ? 'Submitting...' : 'Submit to Authority'}
                                                </button>
                                                <button className="btn-cyan-outline" onClick={() => setShowRecovery(false)} style={{ padding: '0.65rem 1rem', fontSize: '0.825rem' }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {recoveryMsg.text && (
                                        <p style={{ fontSize: '0.78rem', fontWeight: 600, color: recoveryMsg.type === 'success' ? '#10B981' : '#EF4444', marginTop: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <AlertTriangle size={14} /> {recoveryMsg.text}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
