import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import {
    User, Phone, Calendar, MapPin,
    Camera, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
    Loader2, RefreshCcw, Shield, FileText, Check,
    AlertCircle, Building2, Send, ShieldCheck
} from 'lucide-react';
import BiometricCapture from '../Auth/BiometricCapture';
import './ReapplyKYC.css';

const STEPS = [
    { step: 1, title: 'Personal & ID', subtitle: 'Identity Information', icon: User },
    { step: 2, title: 'Residential Address', subtitle: 'Proof of Residence', icon: MapPin },
    { step: 3, title: 'Photo & Face Scan', subtitle: 'Biometric Verification', icon: Camera },
    { step: 4, title: 'Review & Submit', subtitle: 'Final Confirmation', icon: CheckCircle2 }
];

const ReapplyKYC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('+91 ');
    const [birthdate, setBirthdate] = useState('');
    const [governmentIdType, setGovernmentIdType] = useState('Aadhar');
    const [governmentId, setGovernmentId] = useState('');

    // Address states
    const [houseNumber, setHouseNumber] = useState('');
    const [locality, setLocality] = useState('');
    const [city, setCity] = useState('');
    const [pinCode, setPinCode] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('India');

    // Biometric state
    const [faceIdHash, setFaceIdHash] = useState('');
    const [capturedImage, setCapturedImage] = useState(null);
    const [showBiometricCamera, setShowBiometricCamera] = useState(false);

    // Declaration consent
    const [consentChecked, setConsentChecked] = useState(true);

    const handleGovtIdChange = (val) => {
        if (governmentIdType === 'Aadhar') {
            const rawDigits = val.replace(/\D/g, '').slice(0, 12);
            const formatted = rawDigits.match(/.{1,4}/g)?.join(' ') || '';
            setGovernmentId(formatted);
        } else if (governmentIdType === 'Passport') {
            const upper = val.toUpperCase();
            let passportVal = '';
            if (upper.length > 0) {
                const firstChar = upper.charAt(0);
                if (/^[A-Z]$/.test(firstChar)) {
                    const digits = upper.slice(1).replace(/\D/g, '').slice(0, 7);
                    passportVal = firstChar + digits;
                }
            }
            setGovernmentId(passportVal);
        } else {
            setGovernmentId(val.toUpperCase());
        }
    };

    const handleGovtIdTypeChange = (newType) => {
        setGovernmentIdType(newType);
        if (newType === 'Aadhar') {
            const rawDigits = governmentId.replace(/\D/g, '').slice(0, 12);
            setGovernmentId(rawDigits.match(/.{1,4}/g)?.join(' ') || '');
        } else if (newType === 'Passport') {
            const upper = governmentId.toUpperCase();
            if (/^[A-Z]/.test(upper)) {
                const firstChar = upper.charAt(0);
                const digits = upper.slice(1).replace(/\D/g, '').slice(0, 7);
                setGovernmentId(firstChar + digits);
            } else {
                setGovernmentId('');
            }
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await userService.getProfile();
                const data = res.data?.data || {};
                setProfile(data);

                // Pre-populate fields
                setName(data.name || user?.name || '');
                setPhone(data.phone || '+91 ');
                if (data.birthdate) {
                    setBirthdate(new Date(data.birthdate).toISOString().split('T')[0]);
                }
                setGovernmentIdType(data.governmentIdType || 'Aadhar');
                setHouseNumber(data.houseNumber || '');
                setLocality(data.locality || '');
                setCity(data.city || '');
                setPinCode(data.pinCode || '');
                setState(data.state || '');
                setCountry(data.country || 'India');
                setFaceIdHash(data.faceIdHash || '');
            } catch (err) {
                console.error('Failed to load profile for re-KYC:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user]);

    // Parse Admin Directives (extracts [REQUIRED: ...] and officer message)
    const parseAdminDirectives = (comments) => {
        if (!comments) return { badges: [], directiveText: '', isTargeted: false };
        const match = comments.match(/\[REQUIRED:\s*([^\]]+)\]/i);
        if (match) {
            const rawFields = match[1].split(',').map(s => s.trim()).filter(Boolean);
            const directiveText = comments.replace(match[0], '').trim();
            const friendlyBadges = rawFields.map(f => {
                const lower = f.toLowerCase();
                if (lower.includes('face') || lower.includes('biometric') || lower.includes('photo')) return 'Photo & Face Scan';
                if (lower.includes('id') || lower.includes('government') || lower.includes('aadhaar') || lower.includes('pan') || lower.includes('passport')) return 'ID Document & Number';
                if (lower.includes('address') || lower.includes('house') || lower.includes('locality') || lower.includes('pin') || lower.includes('city') || lower.includes('state')) return 'Home Address';
                if (lower.includes('name') || lower.includes('contact') || lower.includes('phone') || lower.includes('email')) return 'Legal Name & Contact';
                if (lower.includes('birth') || lower.includes('age') || lower.includes('dob')) return 'Date of Birth';
                if (lower.includes('land') || lower.includes('cadastral') || lower.includes('property')) return 'Land Documents';
                return f;
            });
            return {
                badges: friendlyBadges,
                directiveText: directiveText || 'Please update and re-submit the specified items.',
                isTargeted: true,
                requiresFace: rawFields.some(f => f.toLowerCase().includes('face') || f.toLowerCase().includes('biometric') || f.toLowerCase().includes('photo')),
                requiresId: rawFields.some(f => f.toLowerCase().includes('id') || f.toLowerCase().includes('government')),
                requiresAddress: rawFields.some(f => f.toLowerCase().includes('address') || f.toLowerCase().includes('house') || f.toLowerCase().includes('locality')),
                requiresNameContact: rawFields.some(f => f.toLowerCase().includes('name') || f.toLowerCase().includes('contact') || f.toLowerCase().includes('phone')),
                requiresDob: rawFields.some(f => f.toLowerCase().includes('birth') || f.toLowerCase().includes('age') || f.toLowerCase().includes('dob'))
            };
        }
        return {
            badges: ['Personal Details', 'ID Document', 'Home Address', 'Face Match'],
            directiveText: comments || 'Please review all your details, re-upload documents, and verify your live photo.',
            isTargeted: false,
            requiresFace: true,
            requiresId: true,
            requiresAddress: true,
            requiresNameContact: true,
            requiresDob: true
        };
    };

    const directives = parseAdminDirectives(profile?.adminComments || user?.adminComments);

    const handleFaceCaptureDone = ({ image, faceIdHash: hash }) => {
        setCapturedImage(image);
        setFaceIdHash(hash);
        setShowBiometricCamera(false);
    };

    const handleStep1Next = () => {
        setErrorMsg('');
        if (!name.trim()) {
            setErrorMsg('Full Legal Name is required.');
            return;
        }
        if (!phone.trim() || phone.trim() === '+91') {
            setErrorMsg('Phone Number is required.');
            return;
        }
        if (governmentId.trim()) {
            if (governmentIdType === 'Aadhar') {
                const raw = governmentId.replace(/\D/g, '');
                if (raw.length !== 12) {
                    setErrorMsg('Aadhar number must be exactly 12 digits (XXXX XXXX XXXX).');
                    return;
                }
            } else if (governmentIdType === 'Passport') {
                if (!/^[A-Z][0-9]{7}$/.test(governmentId.trim().toUpperCase())) {
                    setErrorMsg('Passport must start with 1 capital letter followed by 7 numeric digits (e.g. Z1234567).');
                    return;
                }
            }
        }
        setCurrentStep(2);
    };

    const handleStep2Next = () => {
        setErrorMsg('');
        if (!houseNumber.trim() && !locality.trim() && !city.trim()) {
            setErrorMsg('Please provide your residential address details.');
            return;
        }
        setCurrentStep(3);
    };

    const handleStep3Next = () => {
        setErrorMsg('');
        if (directives.requiresFace && !faceIdHash) {
            setErrorMsg('Biometric face verification is required by the reviewing officer before submission.');
            return;
        }
        setCurrentStep(4);
    };

    const handleSubmitReKyc = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');

        if (governmentId.trim()) {
            if (governmentIdType === 'Aadhar') {
                const raw = governmentId.replace(/\D/g, '');
                if (raw.length !== 12) {
                    setErrorMsg('Aadhar number must be exactly 12 digits (XXXX XXXX XXXX).');
                    return;
                }
            } else if (governmentIdType === 'Passport') {
                if (!/^[A-Z][0-9]{7}$/.test(governmentId.trim().toUpperCase())) {
                    setErrorMsg('Passport must start with 1 capital letter followed by 7 numeric digits (e.g. Z1234567).');
                    return;
                }
            }
        }

        if (!consentChecked) {
            setErrorMsg('Please confirm the declaration of accuracy before submitting.');
            return;
        }

        setSubmitting(true);

        try {
            await userService.reKyc({
                name: name.trim() || undefined,
                phone: phone.trim() || undefined,
                governmentIdType: governmentIdType || undefined,
                governmentId: governmentId.trim() || undefined,
                birthdate: birthdate || undefined,
                houseNumber: houseNumber.trim() || undefined,
                locality: locality.trim() || undefined,
                city: city.trim() || undefined,
                pinCode: pinCode.trim() || undefined,
                state: state.trim() || undefined,
                country: country.trim() || undefined,
                faceIdHash: faceIdHash || undefined
            });

            setSuccessMsg(true);
            setTimeout(() => {
                navigate('/profile');
            }, 2500);
        } catch (err) {
            console.error('Re-KYC submission failed:', err);
            setErrorMsg(err.response?.data?.message || err.message || 'Failed to submit Re-KYC request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '65vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={38} style={{ color: '#2563EB' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>Loading Identity Records...</p>
                </div>
            </div>
        );
    }

    if (successMsg) {
        return (
            <div className="rekyc-success-shell">
                <div className="rekyc-success-icon-box">
                    <CheckCircle2 size={40} />
                </div>
                <h2 className="rekyc-success-title">Re-KYC Submitted Successfully</h2>
                <p className="rekyc-success-text">
                    Your updated identity records and biometric verification have been submitted to the Land Registry Authority for formal review.
                </p>
                <div className="rekyc-redirect-chip">
                    <Loader2 size={16} className="animate-spin" style={{ color: '#2563EB' }} />
                    Redirecting to your Citizen Profile...
                </div>
            </div>
        );
    }

    const currentStepInfo = STEPS.find(s => s.step === currentStep) || STEPS[0];

    return (
        <div className="rekyc-container">
            {/* Top Navigation Row */}
            <div className="rekyc-top-bar">
                <button onClick={() => navigate('/profile')} className="rekyc-back-btn">
                    <ArrowLeft size={16} />
                    <span>Back to Profile</span>
                </button>

                <div className="rekyc-status-chip">
                    <span className="rekyc-pulse-dot" />
                    <RefreshCcw size={13} />
                    <span>Action Required by Authority</span>
                </div>
            </div>

            {/* Officer Directives Banner */}
            <div className="rekyc-notice-card">
                <div className="rekyc-notice-header">
                    <div className="rekyc-notice-title-row">
                        <div className="rekyc-notice-icon-box">
                            <AlertTriangle size={18} />
                        </div>
                        <h3 className="rekyc-notice-title">Re-Verification Instructions</h3>
                    </div>
                    <span className="rekyc-notice-officer-tag">Assigned Officer Review</span>
                </div>
                <p className="rekyc-notice-text">
                    {directives.directiveText}
                </p>
                <div className="rekyc-notice-pills">
                    {directives.badges.map((badge, idx) => (
                        <span key={idx} className="rekyc-notice-pill">
                            <AlertCircle size={12} />
                            {badge}
                        </span>
                    ))}
                </div>
            </div>

            {/* Stepper Card with Segmented Flex Connectors */}
            <div className="rekyc-stepper-card">
                <div className="rekyc-stepper-meta">
                    <div className="rekyc-stepper-step-pill">
                        <span className="rekyc-stepper-step-pill-dot" />
                        <span>Step {currentStep} of 4: {currentStepInfo.title}</span>
                    </div>
                    <span className="rekyc-stepper-current-label">{currentStepInfo.subtitle}</span>
                </div>

                <div className="rekyc-stepper-track">
                    {STEPS.map((s, idx) => {
                        const isCurrent = currentStep === s.step;
                        const isDone = currentStep > s.step;
                        return (
                            <React.Fragment key={s.step}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isDone || isCurrent) setCurrentStep(s.step);
                                    }}
                                    disabled={!isDone && !isCurrent}
                                    className={`rekyc-stepper-node ${isCurrent ? 'active' : ''} ${isDone ? 'completed' : ''}`}
                                >
                                    <div className={`rekyc-circle ${isCurrent ? 'active' : isDone ? 'completed' : 'upcoming'}`}>
                                        {isDone ? <Check size={18} strokeWidth={3} /> : s.step}
                                    </div>
                                    <div className="rekyc-node-labels">
                                        <span className="rekyc-node-title">{s.title}</span>
                                    </div>
                                </button>

                                {idx < STEPS.length - 1 && (
                                    <div className="rekyc-connector-slot">
                                        <div className={`rekyc-connector-bar ${currentStep > s.step ? 'completed' : ''}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Main Form Content Card */}
            <div className="rekyc-card">
                <div className="rekyc-card-header">
                    <span className="rekyc-card-header-badge">Step {currentStep} · {currentStepInfo.title}</span>
                    <h2 className="rekyc-card-title">
                        {currentStep === 1 && 'Personal Details & Official ID'}
                        {currentStep === 2 && 'Residential Address'}
                        {currentStep === 3 && 'Biometric Face Verification'}
                        {currentStep === 4 && 'Review & Submit Application'}
                    </h2>
                    <p className="rekyc-card-desc">
                        {currentStep === 1 && 'Please verify and correct your legal personal information and government ID.'}
                        {currentStep === 2 && 'Enter your residential address matching your official documents.'}
                        {currentStep === 3 && 'Capture a live webcam photo to match against your identity verification.'}
                        {currentStep === 4 && 'Double check your updated details before sending to the Land Registry.'}
                    </p>
                </div>

                <div className="rekyc-card-body">
                    {errorMsg && (
                        <div className="rekyc-alert-danger">
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* ── STEP 1: Personal & ID Verification ── */}
                    {currentStep === 1 && (
                        <div>
                            <div className="rekyc-grid-2">
                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>Full Legal Name <span className="rekyc-label-req">*</span></span>
                                        {directives.requiresNameContact && <span className="rekyc-flag-badge">Needs Update</span>}
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <User size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Rahul Sharma"
                                            className="rekyc-input"
                                        />
                                    </div>
                                    <p className="rekyc-help-text">As it appears on your official identity documents.</p>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>Phone Number <span className="rekyc-label-req">*</span></span>
                                        {directives.requiresNameContact && <span className="rekyc-flag-badge">Needs Update</span>}
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <Phone size={16} className="rekyc-input-icon" />
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => {
                                                let val = e.target.value;
                                                if (!val.startsWith('+91')) {
                                                    val = '+91 ' + val.replace(/^\+?91\s*/, '');
                                                }
                                                setPhone(val);
                                            }}
                                            placeholder="+91 98765 43210"
                                            className="rekyc-input mono"
                                        />
                                    </div>
                                    <p className="rekyc-help-text">Indian mobile number (+91).</p>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>Date of Birth</span>
                                        {directives.requiresDob && <span className="rekyc-flag-badge">Needs Update</span>}
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <Calendar size={16} className="rekyc-input-icon" />
                                        <input
                                            type="date"
                                            value={birthdate}
                                            onChange={(e) => setBirthdate(e.target.value)}
                                            className="rekyc-input"
                                        />
                                    </div>
                                    <p className="rekyc-help-text">Citizen must be at least 18 years of age.</p>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>Document ID Type</span>
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <FileText size={16} className="rekyc-input-icon" />
                                        <select
                                            value={governmentIdType}
                                            onChange={(e) => handleGovtIdTypeChange(e.target.value)}
                                            className="rekyc-select"
                                        >
                                            <option value="Aadhar">Aadhar Card</option>
                                            <option value="Passport">Passport</option>
                                            <option value="Voter ID">Voter ID</option>
                                            <option value="Driving License">Driving License</option>
                                        </select>
                                    </div>
                                    <p className="rekyc-help-text">Primary identification proof document.</p>
                                </div>

                                <div className="rekyc-field rekyc-field-full">
                                    <label className="rekyc-label">
                                        <span>ID Number (Optional if already valid)</span>
                                        {directives.requiresId && <span className="rekyc-flag-badge">Needs ID Update</span>}
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <Shield size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={governmentId}
                                            onChange={(e) => handleGovtIdChange(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (governmentIdType === 'Aadhar') {
                                                    if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                                                        e.preventDefault();
                                                    }
                                                } else if (governmentIdType === 'Passport') {
                                                    if (governmentId.length === 0) {
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
                                            maxLength={governmentIdType === 'Aadhar' ? 14 : governmentIdType === 'Passport' ? 8 : 20}
                                            placeholder={
                                                governmentIdType === 'Aadhar'
                                                    ? 'XXXX XXXX XXXX (12 Digits)'
                                                    : governmentIdType === 'Passport'
                                                    ? 'e.g. Z1234567 (1 Letter + 7 Digits)'
                                                    : 'Enter full ID number...'
                                            }
                                            className="rekyc-input mono"
                                        />
                                    </div>
                                    <p className="rekyc-help-text">
                                        {governmentIdType === 'Aadhar' && 'Format: 12 numeric digits spaced as 4-4-4.'}
                                        {governmentIdType === 'Passport' && 'Format: 1 uppercase letter followed by 7 digits (e.g., Z1234567).'}
                                        {governmentIdType !== 'Aadhar' && governmentIdType !== 'Passport' && 'Enter your complete document number.'}
                                    </p>
                                </div>
                            </div>

                            <div className="rekyc-actions-footer">
                                <button type="button" onClick={() => navigate('/profile')} className="rekyc-btn-secondary">
                                    Cancel
                                </button>
                                <button type="button" onClick={handleStep1Next} className="rekyc-btn-primary">
                                    <span>Next: Residential Address</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 2: Residential Address ── */}
                    {currentStep === 2 && (
                        <div>
                            <div className="rekyc-grid-2">
                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>House / Flat / Building No.</span>
                                        {directives.requiresAddress && <span className="rekyc-flag-badge">Needs Update</span>}
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <Building2 size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={houseNumber}
                                            onChange={(e) => setHouseNumber(e.target.value)}
                                            placeholder="e.g. Flat 402, Lotus Tower"
                                            className="rekyc-input"
                                        />
                                    </div>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>Area / Street / Locality</span>
                                        {directives.requiresAddress && <span className="rekyc-flag-badge">Needs Update</span>}
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <MapPin size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={locality}
                                            onChange={(e) => setLocality(e.target.value)}
                                            placeholder="e.g. M.G. Road, Sector 15"
                                            className="rekyc-input"
                                        />
                                    </div>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>City / Town</span>
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <MapPin size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            placeholder="e.g. Bengaluru"
                                            className="rekyc-input"
                                        />
                                    </div>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>PIN Code</span>
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <FileText size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={pinCode}
                                            onChange={(e) => setPinCode(e.target.value)}
                                            placeholder="e.g. 560001"
                                            className="rekyc-input mono"
                                        />
                                    </div>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>State</span>
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <MapPin size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={state}
                                            onChange={(e) => setState(e.target.value)}
                                            placeholder="e.g. Karnataka"
                                            className="rekyc-input"
                                        />
                                    </div>
                                </div>

                                <div className="rekyc-field">
                                    <label className="rekyc-label">
                                        <span>Country</span>
                                    </label>
                                    <div className="rekyc-input-wrapper">
                                        <MapPin size={16} className="rekyc-input-icon" />
                                        <input
                                            type="text"
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            placeholder="India"
                                            className="rekyc-input"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="rekyc-actions-footer">
                                <button type="button" onClick={() => setCurrentStep(1)} className="rekyc-btn-secondary">
                                    <ArrowLeft size={16} />
                                    <span>Back</span>
                                </button>
                                <button type="button" onClick={handleStep2Next} className="rekyc-btn-primary">
                                    <span>Next: Photo & Face Scan</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 3: Photo & Biometric Face Scan ── */}
                    {currentStep === 3 && (
                        <div>
                            {!showBiometricCamera ? (
                                <div className="rekyc-bio-box">
                                    {faceIdHash ? (
                                        <div>
                                            <div className="rekyc-bio-icon-ring success">
                                                <CheckCircle2 size={36} />
                                            </div>
                                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                                                Biometric Verification Record Ready
                                            </h4>
                                            <p style={{ fontSize: '0.86rem', color: '#64748B', maxWidth: '420px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
                                                A unique cryptographic facial verification token has been generated from your live capture.
                                            </p>
                                            <div className="rekyc-bio-hash-display">
                                                <ShieldCheck size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                                                <code className="rekyc-bio-hash-code">{faceIdHash}</code>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowBiometricCamera(true)}
                                                className="rekyc-btn-secondary"
                                            >
                                                <Camera size={15} />
                                                <span>Retake Live Photo</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="rekyc-bio-icon-ring idle">
                                                <Camera size={32} />
                                            </div>
                                            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                                                Live Camera Verification
                                            </h4>
                                            <p style={{ fontSize: '0.86rem', color: '#64748B', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                                                Position yourself in front of your device camera with clear lighting to complete the facial liveness check.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setShowBiometricCamera(true)}
                                                className="rekyc-btn-primary"
                                            >
                                                <Camera size={16} />
                                                <span>Open Camera & Verify Face</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="rekyc-camera-viewport">
                                    <BiometricCapture
                                        onCaptureComplete={handleFaceCaptureDone}
                                        onBack={() => setShowBiometricCamera(false)}
                                    />
                                </div>
                            )}

                            <div className="rekyc-actions-footer">
                                <button type="button" onClick={() => setCurrentStep(2)} className="rekyc-btn-secondary">
                                    <ArrowLeft size={16} />
                                    <span>Back</span>
                                </button>
                                <button type="button" onClick={handleStep3Next} className="rekyc-btn-primary">
                                    <span>Next: Review & Submit</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── STEP 4: Review & Submit ── */}
                    {currentStep === 4 && (
                        <div>
                            <div className="rekyc-review-grid">
                                {/* Personal Info Summary */}
                                <div className="rekyc-review-card">
                                    <div className="rekyc-review-card-header">
                                        <div className="rekyc-review-card-title">
                                            <User size={14} />
                                            <span>Personal Details</span>
                                        </div>
                                        <button type="button" onClick={() => setCurrentStep(1)} className="rekyc-review-edit-btn">Edit</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div className="rekyc-review-row">
                                            <span>Name:</span>
                                            <strong>{name || '—'}</strong>
                                        </div>
                                        <div className="rekyc-review-row">
                                            <span>Phone:</span>
                                            <strong className="mono">{phone || '—'}</strong>
                                        </div>
                                        <div className="rekyc-review-row">
                                            <span>DOB:</span>
                                            <strong>{birthdate ? new Date(birthdate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</strong>
                                        </div>
                                        <div className="rekyc-review-row">
                                            <span>ID Type:</span>
                                            <strong>{governmentIdType}</strong>
                                        </div>
                                        {governmentId && (
                                            <div className="rekyc-review-row">
                                                <span>ID Number:</span>
                                                <strong className="mono">{governmentId}</strong>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Address Summary */}
                                <div className="rekyc-review-card">
                                    <div className="rekyc-review-card-header">
                                        <div className="rekyc-review-card-title">
                                            <MapPin size={14} />
                                            <span>Residential Address</span>
                                        </div>
                                        <button type="button" onClick={() => setCurrentStep(2)} className="rekyc-review-edit-btn">Edit</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div className="rekyc-review-row">
                                            <span>House / Flat:</span>
                                            <strong>{houseNumber || '—'}</strong>
                                        </div>
                                        <div className="rekyc-review-row">
                                            <span>Locality:</span>
                                            <strong>{locality || '—'}</strong>
                                        </div>
                                        <div className="rekyc-review-row">
                                            <span>City & State:</span>
                                            <strong>{[city, state].filter(Boolean).join(', ') || '—'}</strong>
                                        </div>
                                        <div className="rekyc-review-row">
                                            <span>PIN Code:</span>
                                            <strong className="mono">{pinCode || '—'}</strong>
                                        </div>
                                        <div className="rekyc-review-row">
                                            <span>Country:</span>
                                            <strong>{country || 'India'}</strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Face Verification Card */}
                                <div className="rekyc-review-card full-width">
                                    <div className="rekyc-review-card-header">
                                        <div className="rekyc-review-card-title">
                                            <Camera size={14} />
                                            <span>Biometric Face Verification</span>
                                        </div>
                                        <button type="button" onClick={() => setCurrentStep(3)} className="rekyc-review-edit-btn">Retake</button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{
                                                fontSize: '0.74rem',
                                                fontWeight: 800,
                                                padding: '4px 10px',
                                                borderRadius: '9999px',
                                                backgroundColor: faceIdHash ? '#DCFCE7' : '#FEF3C7',
                                                color: faceIdHash ? '#15803D' : '#B45309',
                                                border: `1px solid ${faceIdHash ? '#86EFAC' : '#FDE68A'}`
                                            }}>
                                                {faceIdHash ? 'Face Verified' : 'Photo Pending'}
                                            </span>
                                            <code style={{ fontSize: '0.78rem', color: '#475569', fontFamily: 'monospace' }}>
                                                {faceIdHash ? `${faceIdHash.slice(0, 32)}...` : 'No face hash recorded.'}
                                            </code>
                                        </div>
                                        {faceIdHash && (
                                            <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle2 size={14} /> Ready for submission
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Declaration Box */}
                            <div className="rekyc-declaration-box">
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', width: '100%' }}>
                                    <input
                                        type="checkbox"
                                        checked={consentChecked}
                                        onChange={(e) => setConsentChecked(e.target.checked)}
                                        style={{ marginTop: '3px', cursor: 'pointer' }}
                                    />
                                    <p>
                                        I hereby declare that all the information provided above is genuine, up-to-date, and matches my official government documents. I authorize the Land Registry Authority to verify these details.
                                    </p>
                                </label>
                            </div>

                            <div className="rekyc-actions-footer">
                                <button type="button" onClick={() => setCurrentStep(3)} className="rekyc-btn-secondary">
                                    <ArrowLeft size={16} />
                                    <span>Back</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitReKyc}
                                    disabled={submitting || !consentChecked}
                                    className="rekyc-btn-submit"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            <span>Submitting Re-KYC...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            <span>Submit Re-KYC for Review</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReapplyKYC;
