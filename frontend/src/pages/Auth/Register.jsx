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
    Shield,
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
    Check,
    KeyRound,
    Cpu,
    ExternalLink
} from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';
import BiometricCapture from './BiometricCapture';
import '../Dashboard/Dashboard.css';
import '../Dashboard/PropertyPages.css';

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

const INDIAN_STATES = [
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chhattisgarh',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal',
    'Andaman and Nicobar Islands',
    'Chandigarh',
    'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi',
    'Jammu and Kashmir',
    'Ladakh',
    'Lakshadweep',
    'Puducherry'
];

const POPULAR_EMAIL_DOMAINS = [
    'gmail.com',
    'yahoo.com',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'proton.me'
];

const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: '', bars: 0 };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) {
        return { score: 1, label: 'Weak', color: '#DC2626', bars: 1 };
    } else if (score === 2) {
        return { score: 2, label: 'Fair', color: '#D97706', bars: 2 };
    } else if (score === 3 || score === 4) {
        return { score: 3, label: 'Good', color: '#2563EB', bars: 3 };
    } else {
        return { score: 4, label: 'Strong', color: '#059669', bars: 4 };
    }
};

const Register = () => {
    const navigate = useNavigate();
    const { account, connectWallet, isConnecting } = useWeb3();
    const { login } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showEmailSuggestions, setShowEmailSuggestions] = useState(false);
    const [pincodeLoading, setPincodeLoading] = useState(false);
    const [pincodeSuccess, setPincodeSuccess] = useState(false);

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

    const fetchPincodeDetails = async (pin) => {
        if (!pin || pin.length !== 6) return;
        setPincodeLoading(true);
        setPincodeSuccess(false);
        try {
            const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
            const data = await res.json();
            if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
                const postOffices = data[0].PostOffice;
                const po = postOffices[0];
                const city = po.District || po.Block || po.Division || '';
                const state = po.State || '';
                
                // Match state name with INDIAN_STATES
                const matchedState = INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase()) || state;
                const defaultLocality = po.Name || '';

                setFormData(prev => ({
                    ...prev,
                    city: city || prev.city,
                    state: matchedState || prev.state,
                    locality: defaultLocality || prev.locality
                }));
                setPincodeSuccess(true);
            }
        } catch (err) {
            console.warn('Pincode autofill error:', err);
        } finally {
            setPincodeLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            let cleanVal = value;
            if (!cleanVal.startsWith('+91')) {
                cleanVal = '+91 ' + cleanVal.replace(/^\+?91\s*/, '');
            }
            setFormData(prev => ({ ...prev, phone: cleanVal }));
        } else if (name === 'pinCode') {
            const digits = value.replace(/\D/g, '').slice(0, 6);
            setFormData(prev => ({ ...prev, pinCode: digits }));
            if (digits.length === 6) {
                fetchPincodeDetails(digits);
            } else {
                setPincodeSuccess(false);
            }
        } else if (name === 'governmentId') {
            if (formData.governmentIdType === 'Aadhar') {
                const digits = value.replace(/\D/g, '').slice(0, 12);
                const formatted = digits.match(/.{1,4}/g)?.join(' ') || '';
                setFormData(prev => ({ ...prev, governmentId: formatted }));
            } else if (formData.governmentIdType === 'Passport') {
                const upper = value.toUpperCase();
                let passportVal = '';
                if (upper.length > 0) {
                    const firstChar = upper.charAt(0);
                    if (/^[A-Z]$/.test(firstChar)) {
                        const digits = upper.slice(1).replace(/\D/g, '').slice(0, 7);
                        passportVal = firstChar + digits;
                    }
                }
                setFormData(prev => ({ ...prev, governmentId: passportVal }));
            } else {
                setFormData(prev => ({ ...prev, governmentId: value.toUpperCase() }));
            }
        } else if (name === 'governmentIdType') {
            setFormData(prev => {
                let currentId = prev.governmentId;
                if (value === 'Aadhar') {
                    const digits = currentId.replace(/\D/g, '').slice(0, 12);
                    currentId = digits.match(/.{1,4}/g)?.join(' ') || '';
                } else if (value === 'Passport') {
                    const upper = currentId.toUpperCase();
                    if (/^[A-Z]/.test(upper)) {
                        const firstChar = upper.charAt(0);
                        const digits = upper.slice(1).replace(/\D/g, '').slice(0, 7);
                        currentId = firstChar + digits;
                    } else {
                        currentId = '';
                    }
                }
                return {
                    ...prev,
                    governmentIdType: value,
                    governmentId: currentId
                };
            });
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFaceIdCapture = (hash) => {
        setFormData(prev => ({ ...prev, faceIdHash: hash }));
        setStep(4);
    };

    const handleStep1Submit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.email || !formData.password || !formData.birthdate) {
            setError('Please complete all required personal details.');
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

    const handleStep2Submit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.governmentIdType || !formData.governmentId) {
            setError('Please select an ID document type and enter your official ID number.');
            return;
        }

        if (formData.governmentIdType === 'Aadhar') {
            const digits = formData.governmentId.replace(/\D/g, '');
            if (digits.length !== 12) {
                setError('Aadhar number must be exactly 12 digits (format: XXXX XXXX XXXX).');
                return;
            }
        } else if (formData.governmentIdType === 'Passport') {
            if (!/^[A-Z][0-9]{7}$/.test(formData.governmentId)) {
                setError('Passport number must start with 1 uppercase letter followed by 7 digits (e.g. Z1234567).');
                return;
            }
        }

        setStep(3);
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
                country: 'India',
                walletAddress: account,
                role: 'user',
                faceIdHash: formData.faceIdHash || undefined
            };

            await authService.register(payload);
            await login(formData.email.trim(), formData.password);

            if (formData.faceIdHash) {
                try {
                    await authService.bindFaceId(formData.faceIdHash);
                } catch (faceErr) {
                    console.warn("Face ID binding warning:", faceErr);
                }
            }

            navigate('/dashboard');
        } catch (err) {
            console.error("Registration error:", err);
            setError(err.response?.data?.message || err.userMessage || err.message || 'Registration failed. Please review your details.');
        } finally {
            setLoading(false);
        }
    };

    const stepsMeta = [
        { num: 1, title: 'Personal & Address', desc: 'Citizen profile & residence' },
        { num: 2, title: 'ID Verification', desc: 'Identity verification document' },
        { num: 3, title: 'Biometrics', desc: 'Facial liveness scan' },
        { num: 4, title: 'Web3 Wallet', desc: 'MetaMask cryptographic seal' }
    ];

    const emailVal = formData.email || '';
    const hasAt = emailVal.includes('@');
    const [emailUserPart, emailDomainPart = ''] = hasAt ? emailVal.split('@') : ['', ''];
    const emailSuggestions = hasAt && emailUserPart.length > 0 && !POPULAR_EMAIL_DOMAINS.includes(emailDomainPart.toLowerCase())
        ? POPULAR_EMAIL_DOMAINS.filter(d => d.startsWith(emailDomainPart.toLowerCase()))
        : [];

    const pwdStrength = getPasswordStrength(formData.password);

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#F8FAFC',
            backgroundImage: 'radial-gradient(at 0% 0%, rgba(37, 99, 235, 0.05) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(30, 64, 175, 0.04) 0px, transparent 50%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            color: '#0F172A'
        }}>
            <style>{`
                @media (max-width: 960px) {
                    .register-grid-layout {
                        grid-template-columns: 1fr !important;
                        gap: 1.75rem !important;
                    }
                }
            `}</style>
            {/* ─── Top GovTech Header ─── */}
            <header style={{
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                padding: '0.85rem 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 30,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
            }}>
                <div style={{
                    maxWidth: '1240px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
                        <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            border: '1px solid #E2E8F0',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                        }}>
                            <img src="/logo.png" alt="DigiVerify Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                            <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                DIGI<span style={{ color: '#2563EB' }}>VERIFY</span>
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                Official Land Registry &amp; Title Escrow Protocol
                            </div>
                        </div>
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }} className="hidden sm:inline">
                            Already registered?
                        </span>
                        <Link
                            to="/login"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                color: '#2563EB',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <KeyRound size={14} />
                            Sign In
                        </Link>
                    </div>
                </div>
            </header>

            {/* ─── Main Content Container ─── */}
            <main style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1.25rem'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '1180px',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1.45fr)',
                    gap: '2.5rem',
                    alignItems: 'start'
                }} className="register-grid-layout">
                    
                    {/* Left Column: Context, Features & Protocol Benefits */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
                        <div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#1D4ED8',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '4px 12px',
                                borderRadius: '9999px',
                                marginBottom: '1rem',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase'
                            }}>
                                <ShieldCheck size={14} />
                                Citizen Identity Registration
                            </div>

                            <h1 style={{
                                fontSize: '2.25rem',
                                fontWeight: 900,
                                color: '#0F172A',
                                letterSpacing: '-0.03em',
                                lineHeight: 1.2,
                                margin: '0 0 0.85rem 0'
                            }}>
                                Create your <span style={{ color: '#2563EB' }}>Verified Identity</span>
                            </h1>

                            <p style={{
                                fontSize: '0.92rem',
                                color: '#64748B',
                                lineHeight: 1.6,
                                margin: 0
                            }}>
                                Enroll into India's decentralized land registry protocol. Verify your citizenship once with AI liveness verification to prevent fraud, forged deeds, and unauthorized transfers.
                            </p>
                        </div>

                        {/* Feature Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '1rem 1.15rem',
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                            }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#1D4ED8',
                                    flexShrink: 0
                                }}>
                                    <ScanFace size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                                        Biometric Liveness Verification
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                                        Live camera angle checks confirm real human presence, eliminating bots and synthetic identity fraud.
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '1rem 1.15rem',
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                            }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: '#F0FDF4',
                                    border: '1px solid #BBF7D0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#16A34A',
                                    flexShrink: 0
                                }}>
                                    <Wallet size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                                        Ethereum Sepolia Web3 Binding
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                                        Title deeds and NFTs are cryptographically tied directly to your MetaMask wallet address.
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '1rem 1.15rem',
                                background: '#FFFFFF',
                                borderRadius: '12px',
                                border: '1px solid #E2E8F0',
                                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                            }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    backgroundColor: '#FAF5FF',
                                    border: '1px solid #E9D5FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#7E22CE',
                                    flexShrink: 0
                                }}>
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                                        Encrypted Identity Verification
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                                        Aadhar, Passport &amp; Driving License documents are securely hashed and tamper-proof.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Trust Metrics Pill Strip */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '8px',
                            background: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#0F172A' }}>100%</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Zero Fraud</div>
                            </div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid #F1F5F9', borderRight: '1px solid #F1F5F9' }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#16A34A' }}>Live AI</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Liveness</div>
                            </div>
                            <div style={{ textAlign: 'center', borderRight: '1px solid #F1F5F9' }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#2563EB' }}>&lt; 2s</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Finality</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#7E22CE' }}>8 Suites</div>
                                <div style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Contracts</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Multi-Step Registration Form Card */}
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid #E2E8F0',
                        padding: '2rem 2.25rem',
                        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
                        position: 'relative'
                    }}>
                        {/* Navy Top Gradient Accent */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '4px',
                            background: 'linear-gradient(90deg, #1E40AF 0%, #3B82F6 100%)',
                            borderTopLeftRadius: '16px',
                            borderTopRightRadius: '16px'
                        }} />

                        {/* ── Stepper Navigation ── */}
                        <div style={{ marginBottom: '1.75rem' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '1rem',
                                paddingBottom: '0.75rem',
                                borderBottom: '1px solid #F1F5F9'
                            }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: '#1D4ED8',
                                    background: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    padding: '3px 8px',
                                    borderRadius: '6px'
                                }}>
                                    <span>STEP {step} OF 4</span>
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                    {stepsMeta[step - 1].title}
                                </span>
                            </div>

                            {/* Horizontal Progress Bar */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(4, 1fr)',
                                gap: '8px'
                            }}>
                                {stepsMeta.map((s) => {
                                    const isDone = step > s.num;
                                    const isCurrent = step === s.num;
                                    return (
                                        <div key={s.num} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{
                                                height: '4px',
                                                borderRadius: '2px',
                                                backgroundColor: isDone ? '#16A34A' : isCurrent ? '#2563EB' : '#E2E8F0',
                                                transition: 'all 0.3s ease'
                                            }} />
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: isCurrent ? 800 : 600,
                                                color: isDone ? '#16A34A' : isCurrent ? '#1D4ED8' : '#94A3B8'
                                            }}>
                                                {isDone ? <Check size={11} strokeWidth={3} /> : <span>{s.num}.</span>}
                                                <span className="hidden sm:inline" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {s.title}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div style={{
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '10px',
                                padding: '10px 14px',
                                marginBottom: '1.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.82rem', color: '#991B1B', fontWeight: 600, lineHeight: 1.4 }}>
                                    {error}
                                </span>
                            </div>
                        )}

                        {/* ── STEP 1: PERSONAL & RESIDENTIAL ADDRESS ── */}
                        {step === 1 && (
                            <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Personal Information Box */}
                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '1.15rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.9rem' }}>
                                        <div style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '6px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#1D4ED8'
                                        }}>
                                            <User size={14} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                            Personal Details
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                Full Legal Name <span style={{ color: '#DC2626' }}>*</span>
                                            </label>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                background: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                padding: '0.65rem 0.85rem'
                                            }}>
                                                <User size={16} style={{ color: '#64748B' }} />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    placeholder="e.g. Akhil Soni"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    required
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        outline: 'none',
                                                        width: '100%',
                                                        fontSize: '0.88rem',
                                                        color: '#0F172A',
                                                        fontWeight: 500
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                        Date of Birth <span style={{ color: '#DC2626' }}>*</span>
                                                    </label>
                                                    {formData.birthdate && (
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: 800,
                                                            color: calculateAge(formData.birthdate) >= 18 ? '#047857' : '#DC2626',
                                                            backgroundColor: calculateAge(formData.birthdate) >= 18 ? '#ECFDF5' : '#FEF2F2',
                                                            padding: '1px 6px',
                                                            borderRadius: '4px',
                                                            border: `1px solid ${calculateAge(formData.birthdate) >= 18 ? '#A7F3D0' : '#FECACA'}`
                                                        }}>
                                                            {calculateAge(formData.birthdate) >= 18
                                                                ? `Age ${calculateAge(formData.birthdate)} (Eligible)`
                                                                : 'Under 18'}
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '8px',
                                                    padding: '0.65rem 0.85rem'
                                                }}>
                                                    <Calendar size={16} style={{ color: '#64748B' }} />
                                                    <input
                                                        type="date"
                                                        name="birthdate"
                                                        max={maxBirthDate}
                                                        min="1920-01-01"
                                                        value={formData.birthdate}
                                                        onChange={handleChange}
                                                        required
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            outline: 'none',
                                                            width: '100%',
                                                            fontSize: '0.88rem',
                                                            color: '#0F172A',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                    Phone Number
                                                </label>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '8px',
                                                    padding: '0.65rem 0.85rem'
                                                }}>
                                                    <Phone size={16} style={{ color: '#64748B' }} />
                                                    <input
                                                        type="tel"
                                                        name="phone"
                                                        placeholder="+91 98765 43210"
                                                        value={formData.phone}
                                                        onChange={handleChange}
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            outline: 'none',
                                                            width: '100%',
                                                            fontSize: '0.88rem',
                                                            color: '#0F172A',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', position: 'relative' }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                    Email Address <span style={{ color: '#DC2626' }}>*</span>
                                                </label>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '8px',
                                                    padding: '0.65rem 0.85rem'
                                                }}>
                                                    <Mail size={16} style={{ color: '#64748B' }} />
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        placeholder="citizen@example.com"
                                                        value={formData.email}
                                                        onChange={handleChange}
                                                        onFocus={() => setShowEmailSuggestions(true)}
                                                        onBlur={() => {
                                                            setTimeout(() => setShowEmailSuggestions(false), 200);
                                                        }}
                                                        required
                                                        autoComplete="email"
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            outline: 'none',
                                                            width: '100%',
                                                            fontSize: '0.88rem',
                                                            color: '#0F172A',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                </div>

                                                {showEmailSuggestions && emailSuggestions.length > 0 && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 'calc(100% + 4px)',
                                                        left: 0,
                                                        right: 0,
                                                        backgroundColor: '#FFFFFF',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 8px 10px -6px rgba(15, 23, 42, 0.08)',
                                                        zIndex: 50,
                                                        overflow: 'hidden',
                                                        maxHeight: '220px',
                                                        overflowY: 'auto'
                                                    }}>
                                                        <div style={{
                                                            padding: '4px 10px',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 800,
                                                            color: '#94A3B8',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.04em',
                                                            background: '#F8FAFC',
                                                            borderBottom: '1px solid #F1F5F9'
                                                        }}>
                                                            Suggested Domains
                                                        </div>
                                                        {emailSuggestions.map((domain) => (
                                                            <div
                                                                key={domain}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    setFormData(prev => ({ ...prev, email: `${emailUserPart}@${domain}` }));
                                                                    setShowEmailSuggestions(false);
                                                                }}
                                                                style={{
                                                                    padding: '8px 12px',
                                                                    fontSize: '0.84rem',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    transition: 'background-color 0.1s ease',
                                                                    borderBottom: '1px solid #F8FAFC'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                                                                }}
                                                            >
                                                                <Mail size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
                                                                <span style={{ fontWeight: 600, color: '#0F172A' }}>{emailUserPart}</span>
                                                                <span style={{ fontWeight: 700, color: '#2563EB' }}>@{domain}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                    Password <span style={{ color: '#DC2626' }}>*</span>
                                                </label>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '8px',
                                                    padding: '0.65rem 0.85rem'
                                                }}>
                                                    <Lock size={16} style={{ color: '#64748B' }} />
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        name="password"
                                                        placeholder="Min 8 characters"
                                                        value={formData.password}
                                                        onChange={handleChange}
                                                        required
                                                        autoComplete="new-password"
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            outline: 'none',
                                                            width: '100%',
                                                            fontSize: '0.88rem',
                                                            color: '#0F172A',
                                                            fontWeight: 500
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', padding: 0 }}
                                                    >
                                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                                    </button>
                                                </div>

                                                {formData.password && (
                                                    <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <div style={{ display: 'flex', gap: '4px', flex: 1, marginRight: '8px' }}>
                                                                {[1, 2, 3, 4].map((bar) => (
                                                                    <div
                                                                        key={bar}
                                                                        style={{
                                                                            height: '4px',
                                                                            flex: 1,
                                                                            borderRadius: '2px',
                                                                            backgroundColor: bar <= pwdStrength.bars ? pwdStrength.color : '#E2E8F0',
                                                                            transition: 'all 0.25s ease'
                                                                        }}
                                                                    />
                                                                ))}
                                                            </div>
                                                            <span style={{
                                                                fontSize: '0.68rem',
                                                                fontWeight: 800,
                                                                color: pwdStrength.color,
                                                                letterSpacing: '0.02em',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {pwdStrength.label}
                                                            </span>
                                                        </div>
                                                        {pwdStrength.score < 3 && (
                                                            <span style={{ fontSize: '0.66rem', color: '#64748B', lineHeight: 1.2 }}>
                                                                Use 8+ chars with uppercase, numbers &amp; symbols
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Residential Address Box */}
                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '1.15rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.9rem' }}>
                                        <div style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '6px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#1D4ED8'
                                        }}>
                                            <MapPin size={14} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                            Residential Address
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>House / Flat No.</label>
                                                <input
                                                    type="text"
                                                    name="houseNumber"
                                                    placeholder="e.g. Bungalow 14, Silver Crest"
                                                    value={formData.houseNumber}
                                                    onChange={handleChange}
                                                    style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        background: '#FFFFFF',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '8px',
                                                        padding: '0.65rem 0.85rem',
                                                        fontSize: '0.88rem',
                                                        color: '#0F172A',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>Locality / Area</label>
                                                <input
                                                    type="text"
                                                    name="locality"
                                                    placeholder="e.g. Bibewadi"
                                                    value={formData.locality}
                                                    onChange={handleChange}
                                                    style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        background: '#FFFFFF',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '8px',
                                                        padding: '0.65rem 0.85rem',
                                                        fontSize: '0.88rem',
                                                        color: '#0F172A',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>City</label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    placeholder="e.g. Pune"
                                                    value={formData.city}
                                                    onChange={handleChange}
                                                    style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        background: '#FFFFFF',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '8px',
                                                        padding: '0.65rem 0.85rem',
                                                        fontSize: '0.88rem',
                                                        color: '#0F172A',
                                                        outline: 'none'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>State</label>
                                                <select
                                                    name="state"
                                                    value={formData.state}
                                                    onChange={handleChange}
                                                    style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        background: '#FFFFFF',
                                                        border: '1px solid #CBD5E1',
                                                        borderRadius: '8px',
                                                        padding: '0.65rem 0.85rem',
                                                        fontSize: '0.88rem',
                                                        color: formData.state ? '#0F172A' : '#64748B',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="">Select State...</option>
                                                    {INDIAN_STATES.map((st) => (
                                                        <option key={st} value={st} style={{ color: '#0F172A' }}>
                                                            {st}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>PIN Code</label>
                                                    {pincodeLoading && (
                                                        <span style={{ fontSize: '0.68rem', color: '#2563EB', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <Loader2 size={11} className="animate-spin" /> Fetching...
                                                        </span>
                                                    )}
                                                    {pincodeSuccess && !pincodeLoading && (
                                                        <span style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                            <Check size={11} /> Autofilled
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    name="pinCode"
                                                    placeholder="411036"
                                                    maxLength={6}
                                                    value={formData.pinCode}
                                                    onChange={handleChange}
                                                    style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        background: '#FFFFFF',
                                                        border: pincodeSuccess ? '1px solid #A7F3D0' : '1px solid #CBD5E1',
                                                        borderRadius: '8px',
                                                        padding: '0.65rem 0.85rem',
                                                        fontSize: '0.88rem',
                                                        color: '#0F172A',
                                                        outline: 'none',
                                                        transition: 'border-color 0.2s ease'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    style={{
                                        backgroundColor: '#2563EB',
                                        color: '#FFFFFF',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '0.85rem 1.25rem',
                                        fontSize: '0.9rem',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
                                        marginTop: '0.25rem'
                                    }}
                                >
                                    Continue to ID Verification Step 2
                                    <ArrowRight size={16} />
                                </button>
                            </form>
                        )}

                        {/* ── STEP 2: CITIZEN ID VERIFICATION ── */}
                        {step === 2 && (
                            <form onSubmit={handleStep2Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '1.25rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                        <div style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '6px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#1D4ED8'
                                        }}>
                                            <IdCard size={14} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                            Identity Verification
                                        </span>
                                    </div>

                                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 1rem 0', lineHeight: 1.5 }}>
                                        Please provide a valid national identity document to anchor with your decentralized citizen record.
                                    </p>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                Document Type <span style={{ color: '#DC2626' }}>*</span>
                                            </label>
                                            <select
                                                name="governmentIdType"
                                                value={formData.governmentIdType}
                                                onChange={handleChange}
                                                required
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    background: '#FFFFFF',
                                                    border: '1px solid #CBD5E1',
                                                    borderRadius: '8px',
                                                    padding: '0.65rem 0.85rem',
                                                    fontSize: '0.88rem',
                                                    color: '#0F172A',
                                                    outline: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="">Select Document Type...</option>
                                                <option value="Aadhar">Aadhar Card</option>
                                                <option value="Passport">Passport</option>
                                                <option value="Voter ID">Voter ID Card</option>
                                                <option value="Driving License">Driving License</option>
                                            </select>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                                {formData.governmentIdType ? `${formData.governmentIdType} Number` : 'ID Number'} <span style={{ color: '#DC2626' }}>*</span>
                                            </label>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                background: '#FFFFFF',
                                                border: '1px solid #CBD5E1',
                                                borderRadius: '8px',
                                                padding: '0.65rem 0.85rem'
                                            }}>
                                                <IdCard size={16} style={{ color: '#64748B' }} />
                                                <input
                                                    type="text"
                                                    name="governmentId"
                                                    inputMode={formData.governmentIdType === 'Aadhar' ? 'numeric' : 'text'}
                                                    placeholder={
                                                        formData.governmentIdType === 'Aadhar'
                                                            ? 'XXXX XXXX XXXX'
                                                            : formData.governmentIdType === 'Passport'
                                                            ? 'e.g. Z1234567'
                                                            : 'Enter official document ID'
                                                    }
                                                    maxLength={
                                                        formData.governmentIdType === 'Aadhar'
                                                            ? 14
                                                            : formData.governmentIdType === 'Passport'
                                                            ? 8
                                                            : 30
                                                    }
                                                    value={formData.governmentId}
                                                    onChange={handleChange}
                                                    onKeyDown={(e) => {
                                                        if (['Backspace', 'Tab', 'Enter', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
                                                            (e.ctrlKey || e.metaKey)) {
                                                            return;
                                                        }
                                                        if (formData.governmentIdType === 'Aadhar' && !/^[0-9]$/.test(e.key)) {
                                                            e.preventDefault();
                                                        } else if (formData.governmentIdType === 'Passport') {
                                                            const currentVal = e.target.value;
                                                            if (currentVal.length === 0 && !/^[a-zA-Z]$/.test(e.key)) {
                                                                e.preventDefault();
                                                            } else if (currentVal.length > 0 && !/^[0-9]$/.test(e.key)) {
                                                                e.preventDefault();
                                                            }
                                                        }
                                                    }}
                                                    required
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        outline: 'none',
                                                        width: '100%',
                                                        fontSize: '0.88rem',
                                                        color: '#0F172A',
                                                        fontWeight: 500
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(1)}
                                        style={{
                                            backgroundColor: '#FFFFFF',
                                            color: '#334155',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '8px',
                                            padding: '0.8rem 1.25rem',
                                            fontSize: '0.88rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                        Back
                                    </button>

                                    <button
                                        type="submit"
                                        style={{
                                            backgroundColor: '#2563EB',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '0.8rem 1.25rem',
                                            fontSize: '0.88rem',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)'
                                        }}
                                    >
                                        Continue to Biometrics Step 3
                                        <ArrowRight size={16} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ── STEP 3: BIOMETRIC FACE ID LIVENESS ── */}
                        {step === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: '100%',
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '1.25rem',
                                    marginBottom: '1rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                                        <div style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '6px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#1D4ED8'
                                        }}>
                                            <ScanFace size={14} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                            Facial Liveness Analysis
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                                        Position your face inside the circle and follow the screen cues to generate your immutable biometric seal.
                                    </p>
                                </div>

                                <div style={{ width: '100%' }}>
                                    <BiometricCapture
                                        onCaptureComplete={handleFaceIdCapture}
                                        onBack={() => setStep(2)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ── STEP 4: WEB3 WALLET BINDING & SUBMIT ── */}
                        {step === 4 && (
                            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '1.25rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                        <div style={{
                                            width: '26px',
                                            height: '26px',
                                            borderRadius: '6px',
                                            backgroundColor: '#EFF6FF',
                                            border: '1px solid #BFDBFE',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#1D4ED8'
                                        }}>
                                            <Wallet size={14} />
                                        </div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A' }}>
                                            Bind Ethereum Sepolia Wallet
                                        </span>
                                    </div>

                                    <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                                        Link your MetaMask wallet to cryptographically seal your citizen record and enable decentralized deed transfers.
                                    </p>

                                    {!account ? (
                                        <button
                                            type="button"
                                            onClick={connectWallet}
                                            disabled={isConnecting}
                                            style={{
                                                width: '100%',
                                                backgroundColor: '#EA580C',
                                                color: '#FFFFFF',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '0.85rem 1.25rem',
                                                fontSize: '0.9rem',
                                                fontWeight: 800,
                                                cursor: isConnecting ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                boxShadow: '0 2px 6px rgba(234, 88, 12, 0.25)'
                                            }}
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Connecting MetaMask...
                                                </>
                                            ) : (
                                                <>
                                                    <Wallet size={16} />
                                                    Connect MetaMask Wallet
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            backgroundColor: '#ECFDF5',
                                            border: '1px solid #A7F3D0',
                                            borderRadius: '10px',
                                            padding: '12px 14px'
                                        }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '8px',
                                                backgroundColor: '#D1FAE5',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#059669',
                                                flexShrink: 0
                                            }}>
                                                <ShieldCheck size={20} />
                                            </div>
                                            <div style={{ overflow: 'hidden' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                                                    <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', textTransform: 'uppercase' }}>
                                                        Wallet Linked &amp; Verified
                                                    </span>
                                                </div>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', color: '#0F172A', wordBreak: 'break-all' }}>
                                                    {account}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Review Summary */}
                                <div style={{
                                    backgroundColor: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '12px',
                                    padding: '1.15rem'
                                }}>
                                    <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.75rem 0' }}>
                                        Identity Enrollment Summary
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                                        <div>
                                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Citizen Name:</span>
                                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{formData.name}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Document ID:</span>
                                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{formData.governmentIdType || 'ID'} - {formData.governmentId}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Email:</span>
                                            <span style={{ color: '#0F172A', fontWeight: 700 }}>{formData.email}</span>
                                        </div>
                                        <div>
                                            <span style={{ color: '#64748B', display: 'block', fontSize: '0.72rem' }}>Biometric Face ID:</span>
                                            <span style={{ color: '#047857', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle2 size={13} /> Liveness Verified
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                                    <button
                                        type="button"
                                        onClick={() => setStep(3)}
                                        style={{
                                            backgroundColor: '#FFFFFF',
                                            color: '#334155',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '8px',
                                            padding: '0.8rem 1.25rem',
                                            fontSize: '0.88rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <ChevronLeft size={16} />
                                        Back
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={!account || loading}
                                        style={{
                                            backgroundColor: !account || loading ? '#94A3B8' : '#2563EB',
                                            color: '#FFFFFF',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '0.8rem 1.25rem',
                                            fontSize: '0.88rem',
                                            fontWeight: 800,
                                            cursor: !account || loading ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            boxShadow: !account || loading ? 'none' : '0 2px 4px rgba(37, 99, 235, 0.25)'
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Deploying Citizen Identity...
                                            </>
                                        ) : (
                                            <>
                                                Deploy Identity to Blockchain
                                                <ArrowRight size={16} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Bottom Sign-In Footer Inside Card */}
                        <div style={{
                            marginTop: '2rem',
                            borderTop: '1px solid #F1F5F9',
                            paddingTop: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
                                Already have an account?{' '}
                                <Link to="/login" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>
                                    Sign in here
                                </Link>
                            </span>
                        </div>
                    </div>
                </div>
            </main>

            {/* ─── Bottom GovTech Footer ─── */}
            <footer style={{
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                padding: '1.25rem 2rem',
                fontSize: '0.78rem',
                color: '#64748B'
            }}>
                <div style={{
                    maxWidth: '1240px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <strong>DigiVerify</strong> &bull; Decentralized Land Title Registry System
                    </div>
                    <div>
                        Autonomous Title Verification &amp; Decentralized Escrow Protocol
                    </div>
                    <div>
                        Smart Contracts on Ethereum Sepolia Testnet (11155111)
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Register;
