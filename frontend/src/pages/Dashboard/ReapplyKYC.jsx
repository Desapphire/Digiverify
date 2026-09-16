import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/user.service';
import {
    User, ShieldCheck, Mail, Phone, Calendar, MapPin,
    Camera, CheckCircle2, AlertTriangle, ArrowRight, ArrowLeft,
    Loader2, Sparkles, RefreshCcw, Shield, FileText, Check,
    AlertCircle, Building2, Send, Info
} from 'lucide-react';
import BiometricCapture from '../Auth/BiometricCapture';
import './Profile.css';
import './PropertyPages.css';

const ReapplyKYC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [currentStep, setCurrentStep] = useState(1); // 1: Personal & ID, 2: Address, 3: Biometric Face Scan, 4: Review & Submit
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('+91 ');
    const [birthdate, setBirthdate] = useState('');
    const [governmentIdType, setGovernmentIdType] = useState('Aadhaar Card');
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
                setGovernmentIdType(data.governmentIdType || 'Aadhaar Card');
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

    const handleSubmitReKyc = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');
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
            <div style={{ display: 'flex', height: '70vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={36} style={{ color: '#2563EB' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, color: '#1E293B', fontSize: '0.9rem' }}>Loading Identity Details...</p>
                </div>
            </div>
        );
    }

    if (successMsg) {
        return (
            <div style={{ maxWidth: '640px', margin: '3rem auto', padding: '0 1rem' }}>
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #BBF7D0',
                    borderRadius: '16px',
                    padding: '3rem 2rem',
                    textAlign: 'center',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: '#DCFCE7',
                        border: '1px solid #86EFAC',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#15803D',
                        margin: '0 auto 1.5rem'
                    }}>
                        <CheckCircle2 size={36} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                        Re-KYC Submitted Successfully!
                    </h2>
                    <p style={{ color: '#64748B', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
                        Your updated identity documents and details have been submitted to the Land Authority for review.
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.85rem', color: '#334155' }}>
                        <Loader2 size={16} className="animate-spin" style={{ color: '#2563EB' }} />
                        Redirecting to your Profile...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '840px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Top Navigation Row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <button
                    onClick={() => navigate('/profile')}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 14px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        color: '#334155',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                    }}
                >
                    <ArrowLeft size={16} /> Back to Profile
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FDE68A',
                        color: '#B45309',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase'
                    }}>
                        <RefreshCcw size={13} />
                        Action Required
                    </span>
                </div>
            </div>

            {/* Officer Directives Banner */}
            <div style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.75rem',
                boxShadow: '0 1px 3px rgba(217, 119, 6, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <AlertTriangle size={22} style={{ color: '#D97706', marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#92400E', margin: 0 }}>
                                Re-Upload Requested by Authority
                            </h3>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#B45309' }}>
                                Land Records Officer
                            </span>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#78350F', margin: '0 0 10px 0', lineHeight: 1.5 }}>
                            {directives.directiveText}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {directives.badges.map((badge, idx) => (
                                <span key={idx} style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#FEF3C7',
                                    color: '#92400E',
                                    border: '1px solid #FCD34D'
                                }}>
                                    • {badge}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Re-KYC Card */}
            <div style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: '16px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden'
            }}>
                {/* Wizard Header Steps */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    borderBottom: '1px solid #E2E8F0',
                    backgroundColor: '#F8FAFC'
                }}>
                    {[
                        { step: 1, label: '1. Personal & ID', icon: User },
                        { step: 2, label: '2. Address', icon: MapPin },
                        { step: 3, label: '3. Photo Match', icon: Camera },
                        { step: 4, label: '4. Submit', icon: CheckCircle2 }
                    ].map(s => {
                        const isActive = currentStep === s.step;
                        const isDone = currentStep > s.step;
                        return (
                            <button
                                key={s.step}
                                onClick={() => setCurrentStep(s.step)}
                                style={{
                                    padding: '1rem 0.75rem',
                                    border: 'none',
                                    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                                    borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                                    color: isActive ? '#1D4ED8' : isDone ? '#047857' : '#64748B',
                                    fontWeight: isActive ? 800 : 600,
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <s.icon size={15} style={{ color: isActive ? '#2563EB' : isDone ? '#047857' : '#94A3B8' }} />
                                <span>{s.label}</span>
                                {isDone && <Check size={13} style={{ color: '#047857', strokeWidth: 3 }} />}
                            </button>
                        );
                    })}
                </div>

                {/* Form Content Area */}
                <div style={{ padding: '2rem' }}>
                    {errorMsg && (
                        <div style={{
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '8px',
                            padding: '0.875rem 1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: '#B91C1C',
                            fontSize: '0.875rem'
                        }}>
                            <AlertCircle size={18} style={{ flexShrink: 0 }} />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Step 1: Personal & Identification */}
                    {currentStep === 1 && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                                    Personal & Identification Details
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                                    Verify or update your legal name, phone number, and official government ID.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Full Legal Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. Rahul Sharma"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Phone Number *
                                    </label>
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
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Date of Birth
                                    </label>
                                    <input
                                        type="date"
                                        value={birthdate}
                                        onChange={(e) => setBirthdate(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        ID Document Type
                                    </label>
                                    <select
                                        value={governmentIdType}
                                        onChange={(e) => setGovernmentIdType(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', backgroundColor: '#FFFFFF' }}
                                    >
                                        <option value="Aadhaar Card">Aadhaar Card</option>
                                        <option value="PAN Card">PAN Card</option>
                                        <option value="Passport">Passport</option>
                                        <option value="Voter ID">Voter ID</option>
                                        <option value="Driving License">Driving License</option>
                                    </select>
                                </div>

                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Government ID Number (Optional if already provided)
                                    </label>
                                    <input
                                        type="text"
                                        value={governmentId}
                                        onChange={(e) => setGovernmentId(e.target.value)}
                                        placeholder="Enter full ID number if updating..."
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(2)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 20px',
                                        backgroundColor: '#2563EB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Next: Address <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Address */}
                    {currentStep === 2 && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                                    Residential Address
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                                    Please ensure your address matches your proof of residence or government ID.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        House / Flat / Building No.
                                    </label>
                                    <input
                                        type="text"
                                        value={houseNumber}
                                        onChange={(e) => setHouseNumber(e.target.value)}
                                        placeholder="e.g. Flat 402, Lotus Tower"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Area / Street / Locality
                                    </label>
                                    <input
                                        type="text"
                                        value={locality}
                                        onChange={(e) => setLocality(e.target.value)}
                                        placeholder="e.g. M.G. Road, Sector 15"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        City / Town
                                    </label>
                                    <input
                                        type="text"
                                        value={city}
                                        onChange={(e) => setCity(e.target.value)}
                                        placeholder="e.g. Bengaluru"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        PIN Code
                                    </label>
                                    <input
                                        type="text"
                                        value={pinCode}
                                        onChange={(e) => setPinCode(e.target.value)}
                                        placeholder="e.g. 560001"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontFamily: 'monospace' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        State
                                    </label>
                                    <input
                                        type="text"
                                        value={state}
                                        onChange={(e) => setState(e.target.value)}
                                        placeholder="e.g. Karnataka"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={country}
                                        onChange={(e) => setCountry(e.target.value)}
                                        placeholder="India"
                                        style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(1)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 18px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 20px',
                                        backgroundColor: '#2563EB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Next: Photo Match <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Biometric Photo & Face Scan */}
                    {currentStep === 3 && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                                    Photo & Face Match Verification
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                                    Take a live camera photo to verify your identity with facial recognition.
                                </p>
                            </div>

                            {!showBiometricCamera ? (
                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '2rem',
                                    textAlign: 'center'
                                }}>
                                    {faceIdHash ? (
                                        <div>
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: '50%',
                                                backgroundColor: '#DCFCE7',
                                                border: '1px solid #86EFAC',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#15803D',
                                                margin: '0 auto 1rem'
                                            }}>
                                                <CheckCircle2 size={30} />
                                            </div>
                                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                                                Face Match Record Ready
                                            </h4>
                                            <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                                                Your facial verification token is generated and ready to attach.
                                            </p>
                                            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px 12px', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                                                <code style={{ fontSize: '0.78rem', color: '#0F172A', wordBreak: 'break-all' }}>
                                                    {faceIdHash}
                                                </code>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowBiometricCamera(true)}
                                                style={{
                                                    padding: '8px 16px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#EFF6FF',
                                                    border: '1px solid #BFDBFE',
                                                    color: '#1D4ED8',
                                                    fontWeight: 600,
                                                    fontSize: '0.82rem',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <Camera size={14} /> Retake Live Photo
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: '50%',
                                                backgroundColor: '#EFF6FF',
                                                border: '1px solid #BFDBFE',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#2563EB',
                                                margin: '0 auto 1rem'
                                            }}>
                                                <Camera size={28} />
                                            </div>
                                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px 0' }}>
                                                Live Camera Verification
                                            </h4>
                                            <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '400px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                                                Click below to activate your webcam and perform facial recognition check.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => setShowBiometricCamera(true)}
                                                style={{
                                                    padding: '10px 22px',
                                                    borderRadius: '8px',
                                                    backgroundColor: '#2563EB',
                                                    border: 'none',
                                                    color: '#FFFFFF',
                                                    fontWeight: 700,
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}
                                            >
                                                <Camera size={16} /> Open Camera & Verify Face
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', padding: '1.5rem', color: '#FFFFFF' }}>
                                    <BiometricCapture
                                        onCaptureComplete={handleFaceCaptureDone}
                                        onBack={() => setShowBiometricCamera(false)}
                                    />
                                </div>
                            )}

                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(2)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 18px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(4)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 20px',
                                        backgroundColor: '#2563EB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Next: Review & Submit <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Summary & Submit */}
                    {currentStep === 4 && (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                                    Review & Submit Re-KYC
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                                    Please review all updated details before submitting to the Land Authority.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                {/* Personal Info Card */}
                                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
                                            Personal Details
                                        </span>
                                        <button onClick={() => setCurrentStep(1)} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                                    </div>
                                    <div style={{ fontSize: '0.88rem', color: '#0F172A', lineHeight: 1.6 }}>
                                        <div><strong>Name:</strong> {name || '—'}</div>
                                        <div><strong>Phone:</strong> {phone || '—'}</div>
                                        <div><strong>DOB:</strong> {birthdate || '—'}</div>
                                        <div><strong>ID:</strong> {governmentIdType} {governmentId ? `(${governmentId})` : ''}</div>
                                    </div>
                                </div>

                                {/* Address Card */}
                                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
                                            Address
                                        </span>
                                        <button onClick={() => setCurrentStep(2)} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                                    </div>
                                    <div style={{ fontSize: '0.88rem', color: '#0F172A', lineHeight: 1.6 }}>
                                        <div>{[houseNumber, locality, city].filter(Boolean).join(', ') || '—'}</div>
                                        <div>{[state, pinCode, country].filter(Boolean).join(' - ') || '—'}</div>
                                    </div>
                                </div>

                                {/* Face Verification Card */}
                                <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1rem', gridColumn: '1 / -1' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#64748B' }}>
                                            Face Verification
                                        </span>
                                        <button onClick={() => setCurrentStep(3)} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>Retake</button>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            fontSize: '0.72rem',
                                            fontWeight: 700,
                                            padding: '3px 8px',
                                            borderRadius: '9999px',
                                            backgroundColor: faceIdHash ? '#DCFCE7' : '#FEF3C7',
                                            color: faceIdHash ? '#15803D' : '#B45309',
                                            border: `1px solid ${faceIdHash ? '#86EFAC' : '#FDE68A'}`
                                        }}>
                                            {faceIdHash ? 'Face Verified' : 'Photo Pending'}
                                        </span>
                                        <code style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                                            {faceIdHash ? `${faceIdHash.slice(0, 24)}...` : 'No face hash recorded.'}
                                        </code>
                                    </div>
                                </div>
                            </div>

                            {/* Disclaimer Box */}
                            <div style={{
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                borderRadius: '10px',
                                padding: '1rem',
                                marginBottom: '2rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <Info size={18} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ fontSize: '0.8rem', color: '#1E3A8A', margin: 0, lineHeight: 1.5 }}>
                                    By submitting, you confirm that all provided details and identity records are genuine and legally valid. Your application will be reviewed by an authorized officer.
                                </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(3)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '10px 18px',
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #CBD5E1',
                                        borderRadius: '8px',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <ArrowLeft size={16} /> Back
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitReKyc}
                                    disabled={submitting}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 28px',
                                        backgroundColor: '#16A34A',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        fontSize: '0.95rem',
                                        cursor: submitting ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)'
                                    }}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Submitting Re-KYC...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Submit Re-KYC for Review
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
