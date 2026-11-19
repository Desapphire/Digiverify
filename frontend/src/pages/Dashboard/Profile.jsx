import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { userService } from '../../services/user.service';
import {
    User, Wallet, ShieldCheck, FileText, Mail, Phone,
    KeyRound, AlertTriangle, CheckCircle2, Copy, ExternalLink,
    RefreshCw, Edit3, Save, X, Fingerprint, Activity, RotateCcw,
    Sparkles, IdCard, MapPin, ScanFace, ArrowRight, Loader2,
    Calendar, Check, AlertCircle, Shield
} from 'lucide-react';
import BiometricCapture from '../Auth/BiometricCapture';
import './Profile.css';
import './PropertyPages.css';

const Profile = () => {
    const { user } = useAuth();
    const { account, connectWallet, isConnecting } = useWeb3();
    const navigate = useNavigate();

    // Profile editing state
    const [editMode, setEditMode] = useState(false);
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editHouseNumber, setEditHouseNumber] = useState('');
    const [editLocality, setEditLocality] = useState('');
    const [editCity, setEditCity] = useState('');
    const [editPinCode, setEditPinCode] = useState('');
    const [editState, setEditState] = useState('');
    const [editCountry, setEditCountry] = useState('');
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

    // Re-KYC Modal & Form State
    const [showReKycModal, setShowReKycModal] = useState(false);
    const [reKycStep, setReKycStep] = useState(1); // 1 = Details, 2 = Biometrics
    const [reKycName, setReKycName] = useState('');
    const [reKycPhone, setReKycPhone] = useState('');
    const [reKycGovtIdType, setReKycGovtIdType] = useState('Aadhar');
    const [reKycGovtId, setReKycGovtId] = useState('');
    const [reKycHouseNumber, setReKycHouseNumber] = useState('');
    const [reKycLocality, setReKycLocality] = useState('');
    const [reKycCity, setReKycCity] = useState('');
    const [reKycPinCode, setReKycPinCode] = useState('');
    const [reKycState, setReKycState] = useState('');
    const [reKycCountry, setReKycCountry] = useState('India');
    const [reKycFaceHash, setReKycFaceHash] = useState('');
    const [reKycSaving, setReKycSaving] = useState(false);
    const [reKycError, setReKycError] = useState('');

    const formatDobDisplay = (dateStr) => {
        if (!dateStr) return 'Not Provided';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const handleReKycGovtIdChange = (val) => {
        if (reKycGovtIdType === 'Aadhar') {
            const rawDigits = val.replace(/\D/g, '').slice(0, 12);
            const formatted = rawDigits.match(/.{1,4}/g)?.join(' ') || '';
            setReKycGovtId(formatted);
        } else if (reKycGovtIdType === 'Passport') {
            const upper = val.toUpperCase();
            let passportVal = '';
            if (upper.length > 0) {
                const firstChar = upper.charAt(0);
                if (/^[A-Z]$/.test(firstChar)) {
                    const digits = upper.slice(1).replace(/\D/g, '').slice(0, 7);
                    passportVal = firstChar + digits;
                }
            }
            setReKycGovtId(passportVal);
        } else {
            setReKycGovtId(val.toUpperCase());
        }
    };

    const handleReKycGovtIdTypeChange = (newType) => {
        setReKycGovtIdType(newType);
        if (newType === 'Aadhar') {
            const rawDigits = reKycGovtId.replace(/\D/g, '').slice(0, 12);
            setReKycGovtId(rawDigits.match(/.{1,4}/g)?.join(' ') || '');
        } else if (newType === 'Passport') {
            const upper = reKycGovtId.toUpperCase();
            if (/^[A-Z]/.test(upper)) {
                const firstChar = upper.charAt(0);
                const digits = upper.slice(1).replace(/\D/g, '').slice(0, 7);
                setReKycGovtId(firstChar + digits);
            } else {
                setReKycGovtId('');
            }
        }
    };

    // Wallet recovery state
    const [showRecovery, setShowRecovery] = useState(false);
    const [recoveryWallet, setRecoveryWallet] = useState('');
    const [recoveryReason, setRecoveryReason] = useState('');
    const [recoverySaving, setRecoverySaving] = useState(false);
    const [recoveryMsg, setRecoveryMsg] = useState({ type: '', text: '' });

    // Wallet state
    const [walletError, setWalletError] = useState('');
    const [copiedField, setCopiedField] = useState('');

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(''), 2000);
    };

    // Loading
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    const parseAdminDirectives = (comments) => {
        if (!comments) return { badges: [], directiveText: '', isTargeted: false };
        const match = comments.match(/\[REQUIRED:\s*([^\]]+)\]/i);
        if (match) {
            const rawFields = match[1].split(',').map(s => s.trim()).filter(Boolean);
            const directiveText = comments.replace(match[0], '').trim();
            const friendlyBadges = rawFields.map(f => {
                const lower = f.toLowerCase();
                if (lower.includes('face') || lower.includes('biometric') || lower.includes('photo')) return 'Photo / Face Scan';
                if (lower.includes('id') || lower.includes('government') || lower.includes('aadhaar') || lower.includes('pan') || lower.includes('passport')) return 'ID Card';
                if (lower.includes('address') || lower.includes('house') || lower.includes('locality') || lower.includes('pin') || lower.includes('city') || lower.includes('state')) return 'Address';
                if (lower.includes('name') || lower.includes('contact') || lower.includes('phone') || lower.includes('email')) return 'Name & Contact';
                if (lower.includes('birth') || lower.includes('age') || lower.includes('dob')) return 'Date of Birth';
                if (lower.includes('land') || lower.includes('cadastral') || lower.includes('property')) return 'Property Info';
                return f;
            });
            return {
                badges: friendlyBadges,
                directiveText: directiveText,
                isTargeted: true,
                requiresFace: rawFields.some(f => f.toLowerCase().includes('face') || f.toLowerCase().includes('biometric') || f.toLowerCase().includes('photo')),
                requiresId: rawFields.some(f => f.toLowerCase().includes('id') || f.toLowerCase().includes('government')),
                requiresAddress: rawFields.some(f => f.toLowerCase().includes('address') || f.toLowerCase().includes('house') || f.toLowerCase().includes('locality')),
                requiresLand: rawFields.some(f => f.toLowerCase().includes('land') || f.toLowerCase().includes('cadastral')),
                requiresNameContact: rawFields.some(f => f.toLowerCase().includes('name') || f.toLowerCase().includes('contact') || f.toLowerCase().includes('phone')),
                requiresDob: rawFields.some(f => f.toLowerCase().includes('birth') || f.toLowerCase().includes('age') || f.toLowerCase().includes('dob'))
            };
        }
        return {
            badges: [],
            directiveText: comments,
            isTargeted: false,
            requiresFace: true,
            requiresId: true,
            requiresAddress: true,
            requiresLand: false,
            requiresNameContact: true,
            requiresDob: false
        };
    };

    const openReKycModal = () => {
        setReKycName(profile?.name || user?.name || '');
        setReKycPhone(profile?.phone || '+91 ');
        setReKycGovtIdType(profile?.governmentIdType || 'Aadhar');
        setReKycGovtId('');
        setReKycHouseNumber(profile?.houseNumber || '');
        setReKycLocality(profile?.locality || '');
        setReKycCity(profile?.city || '');
        setReKycPinCode(profile?.pinCode || '');
        setReKycState(profile?.state || '');
        setReKycCountry(profile?.country || 'India');
        setReKycFaceHash('');

        const directives = parseAdminDirectives(profile?.adminComments || user?.adminComments);
        if (directives.isTargeted && directives.requiresFace && !directives.requiresId && !directives.requiresAddress && !directives.requiresNameContact && !directives.requiresDob) {
            setReKycStep(2);
        } else {
            setReKycStep(1);
        }

        setReKycError('');
        setShowReKycModal(true);
    };

    const handleReKycSubmit = async (e) => {
        if (e) e.preventDefault();
        setReKycError('');

        if (reKycGovtId.trim()) {
            if (reKycGovtIdType === 'Aadhar') {
                const raw = reKycGovtId.replace(/\D/g, '');
                if (raw.length !== 12) {
                    setReKycError('Aadhar Number must be exactly 12 digits (XXXX XXXX XXXX).');
                    return;
                }
            } else if (reKycGovtIdType === 'Passport') {
                if (!/^[A-Z][0-9]{7}$/.test(reKycGovtId.trim().toUpperCase())) {
                    setReKycError('Passport must start with 1 capital letter followed by 7 numeric digits (e.g., Z1234567).');
                    return;
                }
            }
        }

        setReKycSaving(true);

        try {
            const payload = {
                name: reKycName.trim() || undefined,
                phone: reKycPhone.trim() || undefined,
                governmentId: reKycGovtId.trim() || undefined,
                governmentIdType: reKycGovtIdType || undefined,
                houseNumber: reKycHouseNumber.trim() || undefined,
                locality: reKycLocality.trim() || undefined,
                city: reKycCity.trim() || undefined,
                pinCode: reKycPinCode.trim() || undefined,
                state: reKycState.trim() || undefined,
                country: reKycCountry.trim() || 'India',
                faceIdHash: reKycFaceHash || undefined
            };

            const res = await userService.reKyc(payload);
            if (res.data?.data) {
                setProfile(res.data.data);
                setShowReKycModal(false);
                setProfileMsg({ type: 'success', text: 'Verification details submitted! An officer will review your update.' });
            }
        } catch (err) {
            setReKycError(err.response?.data?.message || err.message || 'Failed to submit verification details.');
        } finally {
            setReKycSaving(false);
        }
    };

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

    const startEdit = () => {
        setEditEmail(profile?.email || '');
        setEditPhone(profile?.phone || '+91 ');
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
            const payload = {};
            if (editEmail && editEmail !== profile?.email) payload.email = editEmail;
            if (editPhone && editPhone !== profile?.phone) payload.phone = editPhone;
            if (editHouseNumber !== profile?.houseNumber) payload.houseNumber = editHouseNumber;
            if (editLocality !== profile?.locality) payload.locality = editLocality;
            if (editCity !== profile?.city) payload.city = editCity;
            if (editPinCode !== profile?.pinCode) payload.pinCode = editPinCode;
            if (editState !== profile?.state) payload.state = editState;
            if (editCountry !== profile?.country) payload.country = editCountry;

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
            setRecoveryMsg({ type: 'success', text: 'Recovery request submitted. Our team will review it.' });
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
    const isVerified = data?.kycStatus === 'approved' || data?.kycStatus === 'verified';
    const isPending = data?.kycStatus === 'pending';
    const isFaceVerified = Boolean(data?.faceVerified);

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Activity style={{ width: '2.5rem', height: '2.5rem', color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', fontSize: '0.875rem', color: '#1E40AF' }}>Loading Profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">

            {/* ─── Header ─── */}
            <div className="profile-header-card">
                <div className="profile-header-main">
                    <div className="profile-avatar-box">
                        <User size={32} />
                    </div>
                    <div>
                        <div className="profile-badge-top">
                            <ShieldCheck size={14} className="text-blue-600" />
                            <span>PROFILE & VERIFICATION</span>
                        </div>
                        <h1 className="profile-title">{data?.name || 'User Profile'}</h1>
                        <p className="profile-subtitle">
                            Personal Details &bull; Connected Wallet &amp; Identity Status
                        </p>
                    </div>
                </div>

                <div className="profile-header-actions">
                    <div className={`gov-identity-pill ${isVerified ? 'verified' : isPending ? 'pending' : 'action-required'}`}>
                        {isVerified ? (
                            <>
                                <CheckCircle2 size={14} />
                                <span>VERIFIED</span>
                            </>
                        ) : isPending ? (
                            <>
                                <Activity size={14} />
                                <span>UNDER REVIEW</span>
                            </>
                        ) : (
                            <>
                                <AlertTriangle size={14} />
                                <span>ACTION REQUIRED</span>
                            </>
                        )}
                    </div>
                    {/* Remove duplicate top button, keep clean header badge */}
                </div>
            </div>

            {/* ─── Targeted Re-KYC Notice (Only if action required / not verified) ─── */}
            {!isVerified && data?.adminComments && (() => {
                const directives = parseAdminDirectives(data.adminComments);
                return (
                    <div className="targeted-rekyc-alert-box">
                        <div className="alert-box-top">
                            <div className="alert-badge-group">
                                <div className="alert-icon-ring">
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <h4 className="alert-box-title">Officer Feedback / Action Required</h4>
                                    <p className="alert-box-sub">
                                        Please update the requested details below to complete your verification.
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button onClick={() => navigate('/reapply-kyc')} className="alert-action-btn" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none' }}>
                                    <ArrowRight size={14} /> Reapply KYC
                                </button>
                                <button onClick={openReKycModal} className="alert-action-btn">
                                    <RotateCcw size={14} /> Quick Edit
                                </button>
                            </div>
                        </div>

                        {directives.isTargeted && directives.badges.length > 0 && (
                            <div className="flagged-elements-wrap">
                                <span className="flagged-label">Items Needing Update:</span>
                                <div className="flagged-pills-row">
                                    {directives.badges.map((b, idx) => (
                                        <span key={idx} className="flagged-pill">
                                            ⚠️ {b}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {directives.directiveText && (
                            <div className="directive-notes-panel">
                                <span className="directive-label">Officer Notes / Feedback:</span>
                                <p className="directive-text">{directives.directiveText}</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {profileMsg.text && (
                <div className={`gov-feedback-alert ${profileMsg.type}`}>
                    {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{profileMsg.text}</span>
                </div>
            )}

            {/* ─── Main Grid: 2 Columns ─── */}
            <div className="profile-columns-grid">

                {/* Left Column: Personal Details & Facial Verification */}
                <div className="profile-col-left">

                    {/* Personal Details Record */}
                    <div className="gov-white-panel">
                        <div className="gov-panel-header">
                            <div className="panel-title-with-icon">
                                <IdCard size={18} className="text-blue-700" />
                                <h3 className="panel-heading">Personal Details</h3>
                            </div>
                            {!editMode && (
                                <button onClick={startEdit} className="edit-details-btn">
                                    <Edit3 size={13} /> Edit Details
                                </button>
                            )}
                        </div>

                        {editMode ? (
                            /* Edit Mode Form */
                            <div className="profile-edit-form">
                                <div className="form-group-grid">
                                    <div className="form-field">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            value={editEmail}
                                            onChange={(e) => setEditEmail(e.target.value)}
                                            placeholder="citizen@gov.in"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>Phone Number</label>
                                        <input
                                            type="tel"
                                            value={editPhone}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (!val.startsWith('+91')) {
                                                    val = '+91 ' + val.replace(/^\+?91\s*/, '');
                                                }
                                                setEditPhone(val);
                                            }}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>

                                <div className="form-field">
                                    <label>House / Flat / Street Name</label>
                                    <input
                                        type="text"
                                        value={editHouseNumber}
                                        onChange={(e) => setEditHouseNumber(e.target.value)}
                                        placeholder="Flat 302, Cyber Heights"
                                    />
                                </div>

                                <div className="form-group-grid">
                                    <div className="form-field">
                                        <label>Area / Locality</label>
                                        <input
                                            type="text"
                                            value={editLocality}
                                            onChange={(e) => setEditLocality(e.target.value)}
                                            placeholder="Madhapur"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>City</label>
                                        <input
                                            type="text"
                                            value={editCity}
                                            onChange={(e) => setEditCity(e.target.value)}
                                            placeholder="Hyderabad"
                                        />
                                    </div>
                                </div>

                                <div className="form-group-grid">
                                    <div className="form-field">
                                        <label>PIN Code</label>
                                        <input
                                            type="text"
                                            value={editPinCode}
                                            onChange={(e) => setEditPinCode(e.target.value)}
                                            placeholder="500081"
                                        />
                                    </div>
                                    <div className="form-field">
                                        <label>State</label>
                                        <input
                                            type="text"
                                            value={editState}
                                            onChange={(e) => setEditState(e.target.value)}
                                            placeholder="Telangana"
                                        />
                                    </div>
                                </div>

                                <div className="form-actions-row">
                                    <button onClick={handleSaveProfile} disabled={profileSaving} className="gov-save-btn">
                                        {profileSaving ? 'Saving...' : 'Save Updates'}
                                    </button>
                                    <button onClick={cancelEdit} className="gov-cancel-btn">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Personal Details Grid */
                            <div className="identity-data-grid">
                                <div className="id-data-card">
                                    <span className="id-field-label">Full Name</span>
                                    <span className="id-field-value font-bold">{data?.name || '—'}</span>
                                </div>

                                <div className="id-data-card">
                                    <span className="id-field-label">Email Address</span>
                                    <span className="id-field-value">{data?.email || '—'}</span>
                                </div>

                                <div className="id-data-card">
                                    <span className="id-field-label">Phone Number</span>
                                    <span className="id-field-value">{data?.phone || 'Not Provided'}</span>
                                </div>

                                <div className="id-data-card">
                                    <span className="id-field-label">Date of Birth</span>
                                    <span className="id-field-value">{formatDobDisplay(data?.birthdate)}</span>
                                </div>

                                <div className="id-data-card">
                                    <div className="card-top-row">
                                        <span className="id-field-label">Document ID</span>
                                        <span className="gov-id-type-tag">{data?.governmentIdType || 'National ID'}</span>
                                    </div>
                                    <span className="id-field-value font-mono">
                                        {data?.governmentId ? `•••• •••• ${data.governmentId.slice(-4)}` : 'On File (Encrypted)'}
                                    </span>
                                </div>

                                <div className="id-data-card">
                                    <div className="card-top-row">
                                        <span className="id-field-label">Account ID</span>
                                        <button onClick={() => handleCopy(data?.id, 'userId')} className="copy-link">
                                            {copiedField === 'userId' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                        </button>
                                    </div>
                                    <span className="id-field-value font-mono text-xs">{data?.id || '—'}</span>
                                </div>

                                <div className="id-data-card full-width">
                                    <span className="id-field-label">Residential Address</span>
                                    <span className="id-field-value">
                                        {data?.houseNumber || data?.locality || data?.city || data?.pinCode || data?.state || data?.country ? (
                                            `${data.houseNumber || ''}, ${data.locality || ''}, ${data.city || ''} - ${data.pinCode || ''}, ${data.state || ''}, ${data.country || ''}`.replace(/^, /, '').replace(/,\s*,/g, ',')
                                        ) : 'No address provided'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Facial Verification Card */}
                    <div className="gov-white-panel">
                        <div className="gov-panel-header">
                            <div className="panel-title-with-icon">
                                <Fingerprint size={18} className="text-blue-700" />
                                <h3 className="panel-heading">Facial Verification</h3>
                            </div>
                            <span className={`biometric-status-pill ${isFaceVerified ? 'active' : 'inactive'}`}>
                                {isFaceVerified ? 'VERIFIED' : 'PENDING SCAN'}
                            </span>
                        </div>

                        <p className="panel-instruction-text">
                            Your photo and facial scan are verified securely to confirm your identity for property transactions.
                        </p>

                        {data?.faceIdHash ? (
                            <div className="biometric-hash-card">
                                <div className="hash-card-header">
                                    <div className="hash-title-box">
                                        <ShieldCheck size={14} className="text-emerald-600" />
                                        <span>Facial Verification Code</span>
                                    </div>
                                    <button onClick={() => handleCopy(data?.faceIdHash, 'faceIdHash')} className="copy-hash-btn">
                                        {copiedField === 'faceIdHash' ? <><Check size={12} className="text-emerald-600" /> Copied Code</> : <><Copy size={12} /> Copy Code</>}
                                    </button>
                                </div>
                                <code className="hash-code-block">{data.faceIdHash}</code>
                            </div>
                        ) : (
                            <div className="biometric-empty-box">
                                <ScanFace size={28} className="text-slate-400" />
                                <div>
                                    <h5>No Face Scan on File</h5>
                                    <p>Complete a quick face scan to verify your identity.</p>
                                </div>
                                <button onClick={openReKycModal} className="gov-secondary-btn">
                                    Start Face Scan
                                </button>
                            </div>
                        )}
                    </div>

                </div>

                {/* Right Column: Web3 Wallet & Emergency Recovery */}
                <div className="profile-col-right">

                    {/* Linked Web3 Wallet Panel */}
                    <div className="gov-white-panel">
                        <div className="gov-panel-header">
                            <div className="panel-title-with-icon">
                                <Wallet size={18} className="text-blue-700" />
                                <h3 className="panel-heading">Connected Wallet</h3>
                            </div>
                            <span className="network-pill">Ethereum Network</span>
                        </div>

                        <div className="wallet-dossier-box">
                            <div className="dossier-label-row">
                                <span className="dossier-label">Registered Wallet Address</span>
                                {data?.walletAddress && (
                                    <button onClick={() => handleCopy(data.walletAddress, 'wallet')} className="copy-link">
                                        {copiedField === 'wallet' ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy Address</>}
                                    </button>
                                )}
                            </div>
                            <div className="wallet-addr-display">
                                <code className="font-mono">{data?.walletAddress || 'No wallet linked to this account'}</code>
                            </div>
                        </div>

                        <div className="wallet-connection-section">
                            <div className="connection-status-row">
                                <span className="status-label">Browser Wallet:</span>
                                {account ? (
                                    <span className="status-badge-connected">
                                        <CheckCircle2 size={12} /> Connected: {account.slice(0, 6)}...{account.slice(-4)}
                                    </span>
                                ) : (
                                    <span className="status-badge-disconnected">Not Connected</span>
                                )}
                            </div>

                            {!account ? (
                                <button onClick={handleConnectWallet} disabled={isConnecting} className="gov-primary-btn w-full">
                                    <Wallet size={16} /> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                                </button>
                            ) : !data?.walletAddress ? (
                                <button onClick={handleLinkWallet} disabled={profileSaving} className="gov-success-btn w-full">
                                    <ShieldCheck size={16} /> {profileSaving ? 'Linking...' : 'Link Wallet to Account'}
                                </button>
                            ) : account.toLowerCase() !== data.walletAddress.toLowerCase() ? (
                                <div className="wallet-mismatch-warning">
                                    <AlertTriangle size={15} />
                                    <span>Wallet mismatch: Current browser wallet does not match your registered account wallet.</span>
                                </div>
                            ) : (
                                <div className="wallet-verified-success">
                                    <CheckCircle2 size={15} />
                                    <span>Wallet is connected and ready for property transactions.</span>
                                </div>
                            )}

                            {walletError && (
                                <div className="wallet-error-banner">
                                    <AlertCircle size={14} />
                                    <span>{walletError}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Emergency Wallet Recovery Panel */}
                    <div className="gov-white-panel border-amber">
                        <div className="gov-panel-header">
                            <div className="panel-title-with-icon">
                                <KeyRound size={18} className="text-amber-600" />
                                <h3 className="panel-heading">Wallet Recovery</h3>
                            </div>
                            <span className="recovery-tier-tag">Protected</span>
                        </div>

                        <p className="panel-instruction-text">
                            If you lost access to your wallet or suspect unauthorized activity, submit a recovery request to update your registered wallet.
                        </p>

                        {!showRecovery ? (
                            <button onClick={() => { setShowRecovery(true); setRecoveryMsg({ type: '', text: '' }); }} className="gov-danger-hollow-btn w-full">
                                <KeyRound size={15} /> Request Wallet Recovery
                            </button>
                        ) : (
                            <div className="recovery-form-wrapper">
                                <div className="form-field">
                                    <label>Previous / Lost Wallet Address</label>
                                    <input
                                        type="text"
                                        value={recoveryWallet}
                                        onChange={(e) => setRecoveryWallet(e.target.value)}
                                        placeholder="0x..."
                                    />
                                </div>

                                <div className="form-field">
                                    <label>Reason for Recovery</label>
                                    <textarea
                                        rows={3}
                                        value={recoveryReason}
                                        onChange={(e) => setRecoveryReason(e.target.value)}
                                        placeholder="Describe why you need to recover or update your wallet..."
                                    />
                                </div>

                                <div className="recovery-buttons-row">
                                    <button
                                        onClick={handleRequestRecovery}
                                        disabled={recoverySaving || !recoveryWallet || recoveryReason.length < 10}
                                        className="gov-danger-btn flex-1"
                                    >
                                        {recoverySaving ? 'Submitting...' : 'Submit Recovery Request'}
                                    </button>
                                    <button onClick={() => setShowRecovery(false)} className="gov-cancel-btn">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        {recoveryMsg.text && (
                            <div className={`gov-feedback-alert ${recoveryMsg.type} mt-3`}>
                                {recoveryMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                <span>{recoveryMsg.text}</span>
                            </div>
                        )}
                    </div>

                    {/* Security Immutability Seal */}
                    <div className="gov-immutability-card">
                        <Shield size={20} className="text-blue-700 flex-shrink-0" />
                        <div>
                            <h6>Account Security &amp; Protocol Integrity</h6>
                            <p>
                                Personal identity records and on-chain property credentials are cryptographically anchored to Ethereum with immutable audit trails.
                            </p>
                        </div>
                    </div>

                </div>
            </div>

            {/* ─── Bottom Update Verification / KYC Audit Section ─── */}
            {(() => {
                const isFlagged = !isVerified && (Boolean(data?.adminComments) || data?.kycStatus === 'rejected');
                return (
                    <div className="gov-white-panel" style={{
                        marginTop: '1.75rem',
                        border: isFlagged ? '1px solid #FCD34D' : '1px solid #E2E8F0',
                        backgroundColor: isFlagged ? '#FFFBEB' : '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '1.25rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', maxWidth: '640px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '12px',
                                backgroundColor: isFlagged ? '#FEF3C7' : '#EFF6FF',
                                border: isFlagged ? '1px solid #FDE68A' : '1px solid #BFDBFE',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isFlagged ? '#D97706' : '#2563EB',
                                flexShrink: 0
                            }}>
                                {isFlagged ? <AlertTriangle size={20} /> : <RotateCcw size={18} />}
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                                        Identity Verification &amp; KYC Update
                                    </h4>
                                    {isFlagged ? (
                                        <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            padding: '2px 8px',
                                            borderRadius: '9999px',
                                            backgroundColor: '#FEF3C7',
                                            color: '#B45309',
                                            border: '1px solid #FDE68A'
                                        }}>
                                            Reviewer Triggered
                                        </span>
                                    ) : (
                                        <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            padding: '2px 8px',
                                            borderRadius: '9999px',
                                            backgroundColor: '#DCFCE7',
                                            color: '#15803D',
                                            border: '1px solid #86EFAC'
                                        }}>
                                            Active
                                        </span>
                                    )}
                                </div>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748B', lineHeight: 1.45 }}>
                                    {isFlagged ? (
                                        <span style={{ color: '#92400E', fontWeight: 600 }}>
                                            ⚠️ Action Required: An officer or automated verification check has flagged items for review: {data.adminComments}
                                        </span>
                                    ) : (
                                        'Keep your profile record current. You can update your identity documents, address proof, or biometric facial scan whenever required.'
                                    )}
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <button
                                onClick={() => {
                                    if (isFlagged) {
                                        navigate('/reapply-kyc');
                                    } else {
                                        openReKycModal();
                                    }
                                }}
                                className="gov-secondary-btn"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '9px 18px',
                                    borderRadius: '8px',
                                    backgroundColor: isFlagged ? '#D97706' : '#F8FAFC',
                                    color: isFlagged ? '#FFFFFF' : '#1E293B',
                                    border: isFlagged ? '1px solid #D97706' : '1px solid #CBD5E1',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <RotateCcw size={15} />
                                <span>Update Verification</span>
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* ─── Targeted Re-KYC Modal Dialog ─── */}
            {showReKycModal && (
                <div className="gov-modal-backdrop">
                    <div className="gov-modal-dialog">
                        {/* Modal Header */}
                        <div className="gov-modal-header">
                            <div>
                                <h3 className="modal-title">
                                    <RotateCcw size={18} className="text-blue-600" />
                                    Identity Verification Update
                                </h3>
                                <div className="modal-steps-indicator">
                                    <span className={`step-item ${reKycStep === 1 ? 'active' : 'completed'}`}>
                                        Step 1: Personal Details
                                    </span>
                                    <span className="step-sep">&gt;</span>
                                    <span className={`step-item ${reKycStep === 2 ? 'active' : ''}`}>
                                        Step 2: Face Scan Verification
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setShowReKycModal(false)} className="modal-close-btn">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Targeted Re-KYC Scope Banner inside Modal */}
                        {(() => {
                            const modalDirectives = parseAdminDirectives(profile?.adminComments || user?.adminComments);
                            if (!modalDirectives.isTargeted || modalDirectives.badges.length === 0) return null;
                            return (
                                <div className="modal-targeted-banner">
                                    <span className="targeted-label">🎯 Required Updates from Officer:</span>
                                    <div className="targeted-pills-list">
                                        {modalDirectives.badges.map((b, i) => (
                                            <span key={i} className="targeted-scope-pill">⚠️ {b}</span>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {reKycError && (
                            <div className="gov-feedback-alert danger mb-4">
                                <AlertTriangle size={16} />
                                <span>{reKycError}</span>
                            </div>
                        )}

                        {reKycStep === 1 ? (() => {
                            const modalDirectives = parseAdminDirectives(profile?.adminComments || user?.adminComments);
                            return (
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    setReKycError('');
                                    if (reKycGovtId.trim()) {
                                        if (reKycGovtIdType === 'Aadhar') {
                                            const raw = reKycGovtId.replace(/\D/g, '');
                                            if (raw.length !== 12) {
                                                setReKycError('Aadhar Number must be exactly 12 digits (XXXX XXXX XXXX).');
                                                return;
                                            }
                                        } else if (reKycGovtIdType === 'Passport') {
                                            if (!/^[A-Z][0-9]{7}$/.test(reKycGovtId.trim().toUpperCase())) {
                                                setReKycError('Passport must start with 1 capital letter followed by 7 numeric digits (e.g., Z1234567).');
                                                return;
                                            }
                                        }
                                    }
                                    setReKycStep(2);
                                }}>
                                    <div className="modal-form-content">
                                        <div className="form-field">
                                            <div className="field-label-row">
                                                <label>Full Name</label>
                                                {modalDirectives.requiresNameContact && (
                                                    <span className="field-flag-tag">⚠️ Needs Update</span>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={reKycName}
                                                onChange={(e) => setReKycName(e.target.value)}
                                                required
                                                className={modalDirectives.requiresNameContact ? 'highlight-field' : ''}
                                                placeholder="Legal name as on government ID"
                                            />
                                        </div>

                                        <div className="form-group-grid">
                                            <div className="form-field">
                                                <div className="field-label-row">
                                                    <label>Phone Number</label>
                                                    {modalDirectives.requiresNameContact && (
                                                        <span className="field-flag-tag">⚠️ Needs Update</span>
                                                    )}
                                                </div>
                                                <input
                                                    type="tel"
                                                    value={reKycPhone}
                                                    onChange={(e) => {
                                                        let val = e.target.value;
                                                        if (!val.startsWith('+91')) {
                                                            val = '+91 ' + val.replace(/^\+?91\s*/, '');
                                                        }
                                                        setReKycPhone(val);
                                                    }}
                                                    required
                                                    className={modalDirectives.requiresNameContact ? 'highlight-field' : ''}
                                                    placeholder="+91 98765 43210"
                                                />
                                            </div>

                                            <div className="form-field">
                                                <label>ID Document Type</label>
                                                <select
                                                    value={reKycGovtIdType}
                                                    onChange={(e) => handleReKycGovtIdTypeChange(e.target.value)}
                                                >
                                                    <option value="Aadhar">Aadhar Card</option>
                                                    <option value="Passport">Passport</option>
                                                    <option value="Voter ID">Voter ID</option>
                                                    <option value="Driving License">Driving License</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-field">
                                            <div className="field-label-row">
                                                <label>ID Document Number</label>
                                                {modalDirectives.requiresId && (
                                                    <span className="field-flag-tag">⚠️ Needs ID Update</span>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={reKycGovtId}
                                                onChange={(e) => handleReKycGovtIdChange(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (reKycGovtIdType === 'Aadhar') {
                                                        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                            e.preventDefault();
                                                        }
                                                    } else if (reKycGovtIdType === 'Passport') {
                                                        if (reKycGovtId.length === 0) {
                                                            if (!/^[a-zA-Z]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        } else {
                                                            if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }
                                                    }
                                                }}
                                                maxLength={reKycGovtIdType === 'Aadhar' ? 14 : reKycGovtIdType === 'Passport' ? 8 : 20}
                                                className={modalDirectives.requiresId ? 'highlight-field' : ''}
                                                placeholder={
                                                    reKycGovtIdType === 'Aadhar'
                                                        ? 'XXXX XXXX XXXX (12 Digits)'
                                                        : reKycGovtIdType === 'Passport'
                                                        ? 'e.g. Z1234567 (1 Letter + 7 Digits)'
                                                        : 'Enter ID number'
                                                }
                                            />
                                            <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '4px', display: 'block' }}>
                                                {reKycGovtIdType === 'Aadhar' && 'Format: 12 numeric digits spaced as 4-4-4.'}
                                                {reKycGovtIdType === 'Passport' && 'Format: 1 uppercase letter followed by 7 digits.'}
                                            </span>
                                        </div>

                                        <div className="form-field">
                                            <div className="field-label-row">
                                                <label>Street Address / House Number</label>
                                                {modalDirectives.requiresAddress && (
                                                    <span className="field-flag-tag">⚠️ Needs Address Update</span>
                                                )}
                                            </div>
                                            <input
                                                type="text"
                                                value={reKycHouseNumber}
                                                onChange={(e) => setReKycHouseNumber(e.target.value)}
                                                className={modalDirectives.requiresAddress ? 'highlight-field' : ''}
                                                placeholder="Flat 401, Cyber Park"
                                            />
                                        </div>

                                        <div className="form-group-grid">
                                            <div className="form-field">
                                                <label>Area / Locality</label>
                                                <input
                                                    type="text"
                                                    value={reKycLocality}
                                                    onChange={(e) => setReKycLocality(e.target.value)}
                                                    placeholder="HiTech City"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>City</label>
                                                <input
                                                    type="text"
                                                    value={reKycCity}
                                                    onChange={(e) => setReKycCity(e.target.value)}
                                                    placeholder="Hyderabad"
                                                />
                                            </div>
                                        </div>

                                        <div className="form-group-grid">
                                            <div className="form-field">
                                                <label>PIN Code</label>
                                                <input
                                                    type="text"
                                                    value={reKycPinCode}
                                                    onChange={(e) => setReKycPinCode(e.target.value)}
                                                    placeholder="500081"
                                                />
                                            </div>
                                            <div className="form-field">
                                                <label>State</label>
                                                <input
                                                    type="text"
                                                    value={reKycState}
                                                    onChange={(e) => setReKycState(e.target.value)}
                                                    placeholder="Telangana"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="modal-actions-footer">
                                        <button type="button" onClick={() => setShowReKycModal(false)} className="gov-cancel-btn">
                                            Cancel
                                        </button>
                                        <button type="submit" className="gov-primary-btn">
                                            Proceed to Face Scan <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </form>
                            );
                        })() : (
                            <div className="biometric-step-wrapper">
                                <div className="biometric-step-notice">
                                    <ScanFace size={18} className="text-blue-600 flex-shrink-0" />
                                    <span>Please look directly into the camera to capture a clear photo.</span>
                                </div>

                                <div className="biometric-camera-container">
                                    <BiometricCapture
                                        onCaptureComplete={(faceHash) => {
                                            setReKycFaceHash(faceHash);
                                        }}
                                        standalone={false}
                                    />
                                </div>

                                {reKycFaceHash && (
                                    <div className="gov-feedback-alert success">
                                        <CheckCircle2 size={16} />
                                        <span>Face scan captured successfully.</span>
                                    </div>
                                )}

                                <div className="modal-actions-footer">
                                    <button type="button" onClick={() => setReKycStep(1)} className="gov-cancel-btn">
                                        Back to Details
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleReKycSubmit}
                                        disabled={reKycSaving}
                                        className="gov-success-btn"
                                    >
                                        {reKycSaving ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" /> Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 size={16} /> Submit for Verification
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default Profile;
