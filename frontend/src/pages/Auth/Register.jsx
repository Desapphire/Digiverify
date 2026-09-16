import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { 
    User, 
    Mail, 
    Lock, 
    Calendar, 
    Phone, 
    IdCard, 
    Loader2, 
    ArrowRight, 
    ShieldCheck, 
    UserPlus, 
    Wallet, 
    Eye, 
    EyeOff, 
    AlertCircle, 
    CheckCircle2, 
    MapPin, 
    Sparkles, 
    ScanFace, 
    ChevronRight,
    ChevronLeft,
    Check
} from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';
import BiometricCapture from './BiometricCapture';

const calculateAge = (birthdateStr) => {
    if (!birthdateStr) return null;
    const birthDate = new Date(birthdateStr);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const maxBirthDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
})();

const Register = () => {
    const navigate = useNavigate();
    const { account, connectWallet, isConnecting } = useWeb3();
    const { login } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        birthdate: '',
        phone: '+91 ',
        governmentId: '',
        governmentIdType: '',
        houseNumber: '',
        locality: '',
        city: '',
        pinCode: '',
        state: '',
        country: 'India',
        faceIdHash: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            let cleanVal = value;
            if (!cleanVal.startsWith('+91')) {
                cleanVal = '+91 ' + cleanVal.replace(/^\+?91\s*/, '');
            }
            setFormData(prev => ({ ...prev, phone: cleanVal }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFaceIdCapture = (hash) => {
        setFormData(prev => ({ ...prev, faceIdHash: hash }));
        setStep(3); // Proceed to Web3 wallet binding
    };

    const handleStep1Submit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.email || !formData.password || !formData.birthdate || !formData.governmentId) {
            setError('Please complete all required citizen information fields.');
            return;
        }

        const age = calculateAge(formData.birthdate);
        if (age === null || age < 18) {
            setError('Citizen must be at least 18 years old to register a property identity.');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters in length.');
            return;
        }

        setStep(2);
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!account) {
                throw new Error("Please connect your Web3 wallet (MetaMask) to bind to your identity.");
            }

            const payload = {
                name: formData.name.trim(),
                email: formData.email.trim(),
                password: formData.password,
                birthdate: formData.birthdate,
                phone: formData.phone || undefined,
                governmentId: formData.governmentId || undefined,
                governmentIdType: formData.governmentIdType || undefined,
                houseNumber: formData.houseNumber || undefined,
                locality: formData.locality || undefined,
                city: formData.city || undefined,
                pinCode: formData.pinCode || undefined,
                state: formData.state || undefined,
                country: formData.country || 'India',
                walletAddress: account,
                role: 'user'
            };

            await authService.register(payload);

            // Automatic login
            await login(formData.email.trim(), formData.password);

            // Bind Face ID if captured
            if (formData.faceIdHash) {
                try {
                    await authService.bindFaceId(formData.faceIdHash);
                } catch (faceErr) {
                    console.warn("Face ID binding warning:", faceErr);
                }
            }

            navigate('/dashboard');
        } catch (err) {
            console.error("Registration flow failed:", err);
            setError(err.response?.data?.message || err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>
                {`
                    .register-root {
                        min-height: 100vh;
                        width: 100%;
                        background-color: #030206;
                        background-image: 
                            radial-gradient(circle at 15% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 45%),
                            radial-gradient(circle at 85% 80%, rgba(168, 85, 247, 0.12) 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.45) 0%, transparent 70%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        overflow-x: hidden;
                        padding: 2rem 1.5rem;
                        box-sizing: border-box;
                    }

                    .register-grid-pattern {
                        position: absolute;
                        inset: 0;
                        background-size: 40px 40px;
                        background-image: 
                            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
                        pointer-events: none;
                    }

                    .register-container {
                        width: 100%;
                        max-width: 1180px;
                        min-height: 700px;
                        display: grid;
                        grid-template-columns: 1fr;
                        background: rgba(15, 12, 28, 0.75);
                        backdrop-filter: blur(28px);
                        -webkit-backdrop-filter: blur(28px);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 28px;
                        box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(99, 102, 241, 0.1);
                        overflow: hidden;
                        position: relative;
                        z-index: 10;
                    }

                    @media (min-width: 1024px) {
                        .register-container {
                            grid-template-columns: 1.25fr 0.75fr;
                        }
                    }

                    .register-left-section {
                        padding: 2.75rem 2.5rem;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                        max-height: 88vh;
                        overflow-y: auto;
                    }

                    @media (max-width: 640px) {
                        .register-left-section {
                            padding: 2rem 1.25rem;
                        }
                    }

                    .register-left-section::-webkit-scrollbar {
                        width: 6px;
                    }
                    .register-left-section::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .register-left-section::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                    }
                    .register-left-section::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.2);
                    }

                    .register-right-section {
                        background: linear-gradient(135deg, rgba(20, 16, 40, 0.95), rgba(10, 8, 22, 0.98));
                        border-left: 1px solid rgba(255, 255, 255, 0.06);
                        padding: 3rem 2.25rem;
                        display: none;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                        overflow: hidden;
                    }

                    @media (min-width: 1024px) {
                        .register-right-section {
                            display: flex;
                        }
                    }

                    /* STEPPER STYLES */
                    .stepper-nav {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        background: rgba(0, 0, 0, 0.4);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        border-radius: 16px;
                        padding: 10px 16px;
                        margin-bottom: 2rem;
                    }

                    .step-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 0.8rem;
                        font-weight: 700;
                        color: #64748b;
                        transition: all 0.25s ease;
                    }

                    .step-item.active {
                        color: #ffffff;
                    }

                    .step-item.completed {
                        color: #4ade80;
                    }

                    .step-circle {
                        width: 28px;
                        height: 28px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.75rem;
                        font-weight: 800;
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: #94a3b8;
                        transition: all 0.25s ease;
                    }

                    .step-item.active .step-circle {
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        border-color: #a5b4fc;
                        color: #ffffff;
                        box-shadow: 0 0 14px rgba(99, 102, 241, 0.5);
                    }

                    .step-item.completed .step-circle {
                        background: rgba(34, 197, 94, 0.15);
                        border-color: rgba(34, 197, 94, 0.4);
                        color: #4ade80;
                    }

                    .step-divider {
                        flex: 1;
                        height: 1px;
                        background: rgba(255, 255, 255, 0.08);
                        margin: 0 12px;
                    }

                    .section-title-badge {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 0.75rem;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.08em;
                        color: #818cf8;
                        margin-top: 0.5rem;
                        margin-bottom: 0.75rem;
                    }

                    .input-group-modern {
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }

                    .input-group-modern label {
                        font-size: 0.74rem;
                        font-weight: 700;
                        letter-spacing: 0.06em;
                        text-transform: uppercase;
                        color: #94a3b8;
                    }

                    .input-wrapper-modern {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }

                    .input-wrapper-modern input,
                    .input-wrapper-modern select {
                        width: 100%;
                        background: rgba(0, 0, 0, 0.35);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 14px;
                        padding: 12px 14px 12px 42px;
                        color: #ffffff;
                        font-size: 0.9rem;
                        outline: none;
                        transition: all 0.2s ease;
                        box-sizing: border-box;
                    }

                    .input-wrapper-modern input:focus,
                    .input-wrapper-modern select:focus {
                        border-color: #818cf8;
                        background: rgba(15, 12, 35, 0.6);
                        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                    }

                    .input-icon-left {
                        position: absolute;
                        left: 14px;
                        color: #64748b;
                        pointer-events: none;
                        transition: color 0.2s ease;
                    }

                    .input-wrapper-modern input:focus + .input-icon-left,
                    .input-wrapper-modern:focus-within .input-icon-left {
                        color: #818cf8;
                    }

                    .password-toggle-btn {
                        position: absolute;
                        right: 14px;
                        background: transparent;
                        border: none;
                        color: #64748b;
                        cursor: pointer;
                        padding: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: color 0.2s;
                    }

                    .password-toggle-btn:hover {
                        color: #e2e8f0;
                    }

                    .primary-action-btn {
                        background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
                        color: #ffffff;
                        font-weight: 800;
                        font-size: 0.95rem;
                        letter-spacing: 0.02em;
                        padding: 14px 20px;
                        border-radius: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.35);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.25s ease;
                        text-decoration: none;
                        box-sizing: border-box;
                    }

                    .primary-action-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 28px rgba(99, 102, 241, 0.5);
                        filter: brightness(1.08);
                    }

                    .primary-action-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .secondary-back-btn {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        color: #cbd5e1;
                        font-weight: 700;
                        font-size: 0.9rem;
                        padding: 14px 20px;
                        border-radius: 14px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        transition: all 0.2s ease;
                    }

                    .secondary-back-btn:hover {
                        background: rgba(255, 255, 255, 0.09);
                        color: #ffffff;
                    }

                    .feature-bullet {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        padding: 12px;
                        border-radius: 14px;
                        background: rgba(255, 255, 255, 0.02);
                        border: 1px solid rgba(255, 255, 255, 0.04);
                        transition: all 0.2s ease;
                    }

                    .feature-bullet:hover {
                        background: rgba(255, 255, 255, 0.04);
                        border-color: rgba(99, 102, 241, 0.2);
                        transform: translateX(4px);
                    }
                `}
            </style>

            <div className="register-root">
                <div className="register-grid-pattern"></div>

                <div className="register-container">
                    {/* LEFT SECTION - MULTI-STEP ONBOARDING */}
                    <div className="register-left-section">
                        {/* BRAND HEADER */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 14px rgba(99, 102, 241, 0.5)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    <UserPlus style={{ width: '20px', height: '20px', color: '#ffffff' }} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                                        DIGI<span style={{ color: '#818cf8' }}>VERIFY</span>
                                    </span>
                                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Citizen Identity Protocol
                                    </span>
                                </div>
                            </div>

                            <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                                Create <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Citizen Identity</span>
                            </h1>
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                Complete 3-step KYC & AI biometric enrollment for secure land trading
                            </p>
                        </div>

                        {/* STEPPER PROGRESS */}
                        <div className="stepper-nav">
                            <div className={`step-item ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                                <div className="step-circle">
                                    {step > 1 ? <Check style={{ width: '14px', height: '14px' }} /> : '1'}
                                </div>
                                <span>Profile & KYC</span>
                            </div>

                            <div className="step-divider"></div>

                            <div className={`step-item ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                                <div className="step-circle">
                                    {step > 2 ? <Check style={{ width: '14px', height: '14px' }} /> : '2'}
                                </div>
                                <span>Biometric Face ID</span>
                            </div>

                            <div className="step-divider"></div>

                            <div className={`step-item ${step === 3 ? 'active' : ''}`}>
                                <div className="step-circle">3</div>
                                <span>Web3 Wallet</span>
                            </div>
                        </div>

                        {/* ERROR ALERT */}
                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: '14px',
                                padding: '12px 14px',
                                marginBottom: '1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <AlertCircle style={{ width: '18px', height: '18px', color: '#f87171', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.8rem', color: '#fca5a5', fontWeight: 600, lineHeight: 1.4 }}>
                                    {error}
                                </span>
                            </div>
                        )}

                        {/* STEP 1: PERSONAL & ADDRESS DETAILS */}
                        {step === 1 && (
                            <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Section 1: Citizen Profile */}
                                <div>
                                    <div className="section-title-badge">
                                        <User style={{ width: '14px', height: '14px' }} /> Personal Details
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="input-group-modern">
                                            <label>Full Legal Name (as per Govt ID) *</label>
                                            <div className="input-wrapper-modern">
                                                <User className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                <input 
                                                    type="text" 
                                                    name="name" 
                                                    placeholder="E.g. Akhil Soni" 
                                                    value={formData.name} 
                                                    onChange={handleChange} 
                                                    required 
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="input-group-modern">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <label>Birthdate *</label>
                                                    {formData.birthdate && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 700,
                                                            color: calculateAge(formData.birthdate) >= 18 ? '#4ade80' : '#f87171',
                                                            padding: '1px 6px',
                                                            borderRadius: '6px',
                                                            backgroundColor: calculateAge(formData.birthdate) >= 18 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                                            border: `1px solid ${calculateAge(formData.birthdate) >= 18 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                                                        }}>
                                                            {calculateAge(formData.birthdate) >= 18
                                                                ? `Age ${calculateAge(formData.birthdate)} (18+)`
                                                                : `Age ${calculateAge(formData.birthdate)} (Under 18)`}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="input-wrapper-modern">
                                                    <Calendar className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                    <input
                                                        type="date"
                                                        name="birthdate"
                                                        max={maxBirthDate}
                                                        min="1920-01-01"
                                                        style={{ colorScheme: 'dark' }}
                                                        value={formData.birthdate}
                                                        onChange={handleChange}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="input-group-modern">
                                                <label>Phone Number</label>
                                                <div className="input-wrapper-modern">
                                                    <Phone className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                    <input 
                                                        type="tel" 
                                                        name="phone" 
                                                        placeholder="+91 98765 43210" 
                                                        value={formData.phone} 
                                                        onChange={handleChange} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div className="input-group-modern">
                                                <label>Email Address *</label>
                                                <div className="input-wrapper-modern">
                                                    <Mail className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                    <input 
                                                        type="email" 
                                                        name="email" 
                                                        placeholder="citizen@digiverify.io" 
                                                        value={formData.email} 
                                                        onChange={handleChange} 
                                                        required 
                                                        autoComplete="email"
                                                    />
                                                </div>
                                            </div>

                                            <div className="input-group-modern">
                                                <label>Password (Min 8 Chars) *</label>
                                                <div className="input-wrapper-modern">
                                                    <Lock className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                    <input 
                                                        type={showPassword ? "text" : "password"} 
                                                        name="password" 
                                                        placeholder="••••••••••••" 
                                                        value={formData.password} 
                                                        onChange={handleChange} 
                                                        required 
                                                        autoComplete="new-password"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="password-toggle-btn"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Government ID */}
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div className="section-title-badge">
                                        <IdCard style={{ width: '14px', height: '14px' }} /> Government Identification
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
                                        <div className="input-group-modern">
                                            <label>ID Document Type *</label>
                                            <div className="input-wrapper-modern">
                                                <IdCard className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                <select 
                                                    name="governmentIdType" 
                                                    value={formData.governmentIdType} 
                                                    onChange={handleChange} 
                                                    required
                                                >
                                                    <option value="" style={{ background: '#090714' }}>Select Document Type</option>
                                                    <option value="Aadhar" style={{ background: '#090714' }}>Aadhar Card</option>
                                                    <option value="Passport" style={{ background: '#090714' }}>Passport</option>
                                                    <option value="Voter ID" style={{ background: '#090714' }}>Voter ID Card</option>
                                                    <option value="Driving License" style={{ background: '#090714' }}>Driving License</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="input-group-modern">
                                            <label>Government ID Number *</label>
                                            <div className="input-wrapper-modern">
                                                <IdCard className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                <input 
                                                    type="text" 
                                                    name="governmentId" 
                                                    placeholder="Enter official document ID" 
                                                    value={formData.governmentId} 
                                                    onChange={handleChange} 
                                                    required 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Residential Address */}
                                <div style={{ marginTop: '0.5rem' }}>
                                    <div className="section-title-badge">
                                        <MapPin style={{ width: '14px', height: '14px' }} /> Permanent Residential Address
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                                            <div className="input-group-modern">
                                                <label>House No. / Flat & Building</label>
                                                <div className="input-wrapper-modern">
                                                    <MapPin className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                    <input 
                                                        type="text" 
                                                        name="houseNumber" 
                                                        placeholder="Flat 302, Cyber Heights" 
                                                        value={formData.houseNumber} 
                                                        onChange={handleChange} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="input-group-modern">
                                                <label>Locality / Area</label>
                                                <div className="input-wrapper-modern">
                                                    <MapPin className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                                    <input 
                                                        type="text" 
                                                        name="locality" 
                                                        placeholder="Madhapur / Hitec City" 
                                                        value={formData.locality} 
                                                        onChange={handleChange} 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '1rem' }}>
                                            <div className="input-group-modern">
                                                <label>City</label>
                                                <div className="input-wrapper-modern">
                                                    <input 
                                                        type="text" 
                                                        name="city" 
                                                        style={{ paddingLeft: '14px' }}
                                                        placeholder="Hyderabad" 
                                                        value={formData.city} 
                                                        onChange={handleChange} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="input-group-modern">
                                                <label>PIN Code</label>
                                                <div className="input-wrapper-modern">
                                                    <input 
                                                        type="text" 
                                                        name="pinCode" 
                                                        style={{ paddingLeft: '14px' }}
                                                        placeholder="500081" 
                                                        value={formData.pinCode} 
                                                        onChange={handleChange} 
                                                    />
                                                </div>
                                            </div>

                                            <div className="input-group-modern">
                                                <label>State</label>
                                                <div className="input-wrapper-modern">
                                                    <input 
                                                        type="text" 
                                                        name="state" 
                                                        style={{ paddingLeft: '14px' }}
                                                        placeholder="Telangana" 
                                                        value={formData.state} 
                                                        onChange={handleChange} 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: '0.75rem' }}>
                                    <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>
                                        Continue to Biometrics Step 2
                                        <ArrowRight style={{ width: '18px', height: '18px' }} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: AWS REKOGNITION BIOMETRIC CAPTURE */}
                        {step === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <BiometricCapture
                                    onCaptureComplete={handleFaceIdCapture}
                                    onBack={() => setStep(1)}
                                />
                            </div>
                        )}

                        {/* STEP 3: WEB3 WALLET BINDING & DEPLOYMENT */}
                        {step === 3 && (
                            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{
                                    background: 'rgba(15, 12, 35, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '18px',
                                    padding: '24px'
                                }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                                        Step 3: Bind Avalanche Web3 Wallet
                                    </h3>
                                    <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                                        Link your MetaMask wallet to cryptographically seal your sovereign citizen identity and enable on-chain title transfers.
                                    </p>

                                    {!account ? (
                                        <button
                                            type="button"
                                            onClick={connectWallet}
                                            disabled={isConnecting}
                                            className="primary-action-btn"
                                            style={{ width: '100%', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)' }}
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} />
                                                    Connecting MetaMask...
                                                </>
                                            ) : (
                                                <>
                                                    <Wallet style={{ width: '20px', height: '20px' }} />
                                                    Connect MetaMask Wallet
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '14px',
                                            background: 'rgba(34, 197, 94, 0.1)',
                                            border: '1px solid rgba(34, 197, 94, 0.25)',
                                            borderRadius: '16px',
                                            padding: '16px'
                                        }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <ShieldCheck style={{ width: '24px', height: '24px', color: '#4ade80' }} />
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }}></span>
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase' }}>
                                                        Wallet Linked & Verified
                                                    </span>
                                                </div>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', fontFamily: 'monospace', color: '#ffffff', wordBreak: 'break-all' }}>
                                                    {account}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* REVIEW SUMMARY CARD */}
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                    borderRadius: '18px',
                                    padding: '20px'
                                }}>
                                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px 0' }}>
                                        Identity Onboarding Summary
                                    </h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.8rem' }}>
                                        <div>
                                            <span style={{ color: '#64748b' }}>Citizen Name:</span>
                                            <div style={{ color: '#ffffff', fontWeight: 700 }}>{formData.name}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b' }}>Govt ID:</span>
                                            <div style={{ color: '#ffffff', fontWeight: 700 }}>{formData.governmentIdType || 'ID'} - {formData.governmentId}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b' }}>Email:</span>
                                            <div style={{ color: '#ffffff', fontWeight: 700 }}>{formData.email}</div>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748b' }}>Biometric Facial Seal:</span>
                                            <div style={{ color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle2 style={{ width: '14px', height: '14px' }} /> 3D Liveness Verified
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(2)}
                                        className="secondary-back-btn"
                                        style={{ flex: 1 }}
                                    >
                                        <ChevronLeft style={{ width: '18px', height: '18px' }} />
                                        Back
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={!account || loading}
                                        className="primary-action-btn"
                                        style={{ flex: 2 }}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} />
                                                Deploying Citizen Identity...
                                            </>
                                        ) : (
                                            <>
                                                Deploy Identity to Blockchain
                                                <ArrowRight style={{ width: '18px', height: '18px' }} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* BOTTOM LOGIN LINK */}
                        {step === 1 && (
                            <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 6px 0' }}>
                                    Already have a registered sovereign identity?
                                </p>
                                <Link 
                                    to="/login" 
                                    style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        color: '#818cf8', 
                                        fontWeight: 700, 
                                        fontSize: '0.875rem', 
                                        textDecoration: 'none' 
                                    }}
                                >
                                    Sign In to Account
                                    <ChevronRight style={{ width: '16px', height: '16px' }} />
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SECTION - WEB3 & BIOMETRIC SHOWCASE */}
                    <div className="register-right-section">
                        <div>
                            {/* Live Badge */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: '999px',
                                padding: '6px 14px',
                                marginBottom: '1.75rem'
                            }}>
                                <Sparkles style={{ width: '14px', height: '14px', color: '#818cf8' }} />
                                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c7d2fe', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    Sovereign Identity Protocol
                                </span>
                            </div>

                            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, letterSpacing: '-0.02em', margin: '0 0 1rem 0' }}>
                                Register Once. <br />Trade Properties with <span style={{ color: '#818cf8' }}>Zero Fraud</span>.
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
                                Your citizen profile is bound directly to your MetaMask Web3 wallet and live facial identity, preventing unauthorized land sales and identity theft.
                            </p>

                            {/* FEATURE HIGHLIGHTS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="feature-bullet">
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <ScanFace style={{ width: '18px', height: '18px', color: '#4ade80' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>3D Liveness & Multi-Angle Face ID</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>Real-time facial pose validation (Center, Left, Right) ensures living citizen presence.</p>
                                    </div>
                                </div>

                                <div className="feature-bullet">
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Wallet style={{ width: '18px', height: '18px', color: '#818cf8' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Ethereum Sepolia Testnet Binding</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>Title deeds are minted and transferred via smart contracts directly to your wallet.</p>
                                    </div>
                                </div>

                                <div className="feature-bullet">
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <ShieldCheck style={{ width: '18px', height: '18px', color: '#c084fc' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Encrypted Government KYC</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>Aadhar, Passport & Driving License data stored securely with 256-bit encryption.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM STATS PILL */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            padding: '14px',
                            marginTop: '2rem'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>100%</div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Zero Fraud</div>
                            </div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#22c55e' }}>Live AI</div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Biometric Guard</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#818cf8' }}>&lt; 2s</div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Finality</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;
