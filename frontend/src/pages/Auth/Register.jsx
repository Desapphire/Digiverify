import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { User, Mail, Lock, Calendar, Phone, IdCard, Loader2, ArrowRight, ShieldCheck, Camera, UserPlus, Wallet } from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';
import BiometricCapture from './BiometricCapture';

const Register = () => {
    const navigate = useNavigate();
    const { account, connectWallet, isConnecting } = useWeb3();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        birthdate: '',
        phone: '',
        governmentId: '',
        governmentIdType: '',
        houseNumber: '',
        locality: '',
        city: '',
        pinCode: '',
        state: '',
        country: '',
        faceIdHash: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFaceIdCapture = (hash) => {
        setFormData({ ...formData, faceIdHash: hash });
        setStep(3); // Proceed to submit
    };



    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!account) throw new Error("Please connect a Web3 wallet first to link your identity.");

            const payload = {
                name: formData.name,
                email: formData.email,
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
                country: formData.country || undefined,
                walletAddress: account,
                role: 'user'
            };

            await authService.register(payload);
            console.log("Registration API successful");

            // Login to obtain JWT token for authenticated requests
            await login(formData.email, formData.password);
            console.log("Login API successful");

            // Bind Face ID after successful login
            if (formData.faceIdHash) {
                console.log("Binding Face ID...");
                await authService.bindFaceId(formData.faceIdHash);
                console.log("Face ID bound");
            }

            // After registration, Face ID binding, and login, navigate to dashboard
            console.log("Navigating to dashboard");
            navigate('/dashboard');
        } catch (err) {
            console.error("Registration flow failed:", err);
            setError(err.response?.data?.message || err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <style>
                {`
                    .register-layout-container { display: flex; width: 100%; min-height: 100vh; background-color: #050505; overflow: hidden; }
                    .register-left-panel { width: 100%; display: flex; align-items: center; justify-content: center; padding: 1.5rem; position: relative; z-index: 10; max-height: 100vh; overflow-y: auto; }
                    .register-right-panel { display: none; position: relative; overflow: hidden; border-left: 1px solid rgba(255,255,255,0.05); }
                    @media (min-width: 1024px) {
                        .register-left-panel { width: 45%; padding: 3rem; }
                        .register-right-panel { display: block; width: 55%; }
                    }
                    .hero-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
                    .hero-overlay-x { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to right, #050505 0%, transparent 100%); }
                    .hero-overlay-y { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to top, #050505 0%, transparent 30%); }
                    .hero-card { position: absolute; bottom: 3rem; right: 3rem; max-width: 350px; padding: 1.5rem; border-radius: 24px; background: rgba(20, 15, 35, 0.4); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                    .register-max-w { width: 100%; max-width: 480px; margin: auto; }
                    
                    /* Custom scrollbar for left panel if content is too tall */
                    .register-left-panel::-webkit-scrollbar { width: 6px; }
                    .register-left-panel::-webkit-scrollbar-track { background: transparent; }
                    .register-left-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .register-left-panel::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                `}
            </style>
            <div className="register-layout-container">
                <div className="register-left-panel">
                    <div className="glass-panel register-max-w p-6 md:p-10 relative z-10">
                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-glow-primary" style={{ backgroundColor: '#2563eb' }}>
                                <UserPlus className="text-white w-8 h-8" />
                            </div>
                            <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                Create <span className="text-gradient">Identity</span>
                            </h1>
                            <p className="text-muted text-sm font-medium">Digital Verification System</p>
                        </div>
 
                        {/* Premium Web3 Progress Stepper using index.css */}
                        <div className="stepper" style={{ marginBottom: '2.5rem' }}>
                            <div className={`stepper-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                                <div className="stepper-circle">1</div>
                            </div>
                            <div className={`stepper-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                                <div className="stepper-circle">2</div>
                            </div>
                            <div className={`stepper-step ${step >= 3 ? 'active' : ''}`}>
                                <div className="stepper-circle">3</div>
                            </div>
                        </div>
 
                        {error && (
                            <div className="mb-6 p-4 rounded-xl text-danger text-sm font-bold text-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                {error}
                            </div>
                        )}
 
                        <form onSubmit={(e) => { e.preventDefault(); if (step === 3) handleRegister(e); }} style={{ width: '100%' }}>
                            {step === 1 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Full Legal Name</label>
                                        <div className="relative">
                                            <User className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                            <input type="text" name="name" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="E.g. Akhil Soni" value={formData.name} onChange={handleChange} required />
                                        </div>
                                    </div>
 
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Birthdate</label>
                                            <div className="relative">
                                                <Calendar className="absolute text-muted pointer-events-none" style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.2rem', height: '1.2rem' }} />
                                                <input
                                                    type={formData.birthdate ? "date" : "text"}
                                                    onFocus={(e) => {
                                                        e.target.type = 'date';
                                                        try { e.target.showPicker(); } catch (err) { }
                                                    }}
                                                    onBlur={(e) => {
                                                        if (!e.target.value) e.target.type = 'text';
                                                    }}
                                                    name="birthdate"
                                                    className="input-premium cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full"
                                                    style={{ paddingLeft: '3rem', width: '100%', color: formData.birthdate ? 'white' : 'inherit' }}
                                                    placeholder="DD/MM/YYYY"
                                                    value={formData.birthdate}
                                                    onChange={handleChange}
                                                    onClick={(e) => {
                                                        if (e.target.type === 'date' && e.target.showPicker) {
                                                            try { e.target.showPicker(); } catch (err) { }
                                                        }
                                                    }}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Phone</label>
                                            <div className="relative">
                                                <Phone className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                                <input type="tel" name="phone" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="+91 638 659 5285" value={formData.phone} onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>
 
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Email Account</label>
                                        <div className="relative">
                                            <Mail className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                            <input type="email" name="email" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="rashi.bora24@vit.edu" value={formData.email} onChange={handleChange} required />
                                        </div>
                                    </div>
 
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Secure Password</label>
                                        <div className="relative">
                                            <Lock className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                            <input type="password" name="password" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="Min 8 characters" value={formData.password} onChange={handleChange} required />
                                        </div>
                                    </div>
 
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Govt ID Type</label>
                                            <div className="relative">
                                                <IdCard className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                                <select name="governmentIdType" className="input-premium cursor-pointer" style={{ paddingLeft: '3rem', width: '100%', height: '3.1rem', appearance: 'none', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: formData.governmentIdType ? 'white' : '#6b7280' }} value={formData.governmentIdType} onChange={handleChange} required>
                                                    <option value="" style={{ background: '#050505' }}>Select ID Type</option>
                                                    <option value="Aadhar" style={{ background: '#050505' }}>Aadhar</option>
                                                    <option value="Passport" style={{ background: '#050505' }}>Passport</option>
                                                    <option value="Voter ID" style={{ background: '#050505' }}>Voter ID</option>
                                                    <option value="Driving License" style={{ background: '#050505' }}>Driving License</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Govt ID Number</label>
                                            <div className="relative">
                                                <IdCard className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                                <input type="text" name="governmentId" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="ID Number" value={formData.governmentId} onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>
 
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>House No., Street Name</label>
                                        <div className="relative">
                                            <Wallet className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                            <input type="text" name="houseNumber" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="E.g. Flat 302, Cyber Tower" value={formData.houseNumber} onChange={handleChange} required />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Locality / Area</label>
                                        <div className="relative">
                                            <Wallet className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                            <input type="text" name="locality" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="E.g. Madhapur" value={formData.locality} onChange={handleChange} required />
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>City</label>
                                            <div className="relative">
                                                <Wallet className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                                <input type="text" name="city" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="E.g. Hyderabad" value={formData.city} onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>PIN Code</label>
                                            <div className="relative">
                                                <Wallet className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                                <input type="text" name="pinCode" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="E.g. 500081" value={formData.pinCode} onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>State</label>
                                            <div className="relative">
                                                <Wallet className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                                <input type="text" name="state" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="E.g. Telangana" value={formData.state} onChange={handleChange} required />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Country</label>
                                            <div className="relative">
                                                <Wallet className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.2rem', height: '1.2rem' }} />
                                                <input type="text" name="country" className="input-premium" style={{ paddingLeft: '3rem', width: '100%' }} placeholder="E.g. India" value={formData.country} onChange={handleChange} required />
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '1rem' }}>
                                        <button type="button" onClick={() => setStep(2)} className="btn w-full flex items-center justify-center gap-3" style={{ backgroundColor: 'white', color: 'black', fontWeight: 900, fontSize: '0.95rem', padding: '1rem 0', borderRadius: '1rem', boxShadow: '0 4px 14px rgba(255,255,255,0.1)' }}>
                                            Continue to Biometrics <ArrowRight style={{ width: '18px', height: '18px' }} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="flex flex-col items-center gap-6 py-8">
                                    <BiometricCapture
                                        onCaptureComplete={handleFaceIdCapture}
                                        onBack={() => setStep(1)}
                                    />
                                </div>
                            )}

                            {step === 3 && (
                                <div className="flex flex-col gap-8">
                                    <div className="p-6 rounded-2xl border border-subtle" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                                        <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-4">Final Step: Link Web3 Wallet</h3>
                                        {!account ? (
                                            <button type="button" onClick={connectWallet} disabled={isConnecting} className="btn w-full flex items-center justify-center gap-3" style={{ padding: '1rem 0', borderRadius: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.2)', color: 'white' }}>
                                                <Wallet style={{ width: '20px', height: '20px', color: '#60a5fa' }} />
                                                {isConnecting ? 'Waiting for MetaMask...' : 'Click to Connect MetaMask'}
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                <ShieldCheck style={{ width: '32px', height: '32px', color: 'hsl(var(--color-success))', flexShrink: 0 }} />
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-success uppercase tracking-wider mb-1">Wallet Linked</p>
                                                    <p className="text-sm font-mono text-white/80 truncate">{account}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-4" style={{ display: 'flex', gap: '1rem' }}>
                                        <button type="button" onClick={() => setStep(2)} className="btn" style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', borderRadius: '1rem' }}>Back</button>
                                        <button type="submit" disabled={!account || loading} className="btn flex items-center justify-center gap-3" style={{ flex: 2, backgroundColor: 'white', color: 'black', fontWeight: 900, borderRadius: '1rem' }}>
                                            {loading ? <Loader2 className="animate-spin" style={{ width: '24px', height: '24px' }} /> : 'Deploy Identity'}
                                            {!loading && <ArrowRight style={{ width: '20px', height: '20px' }} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>

                        {step === 1 && (
                            <div className="mt-8 text-center border-t border-subtle pt-6">
                                <p className="text-muted text-xs font-bold uppercase tracking-widest mb-3">Already have an identity?</p>
                                <Link to="/login" className="inline-flex items-center gap-2 text-primary-glow font-bold text-sm hover:opacity-80 transition-opacity">
                                    Login Now
                                    <ArrowRight size={16} />
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                <div className="register-right-panel">
                    <img src="/login_hero.png" alt="Futuristic Land Registry" className="hero-img" />
                    <div className="hero-overlay-x"></div>
                    <div className="hero-overlay-y"></div>

                    <div className="hero-card">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)', marginRight: '1rem' }}>
                                <Wallet style={{ color: '#60a5fa', width: '24px', height: '24px' }} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, color: 'white', fontSize: '1.125rem', fontWeight: 700 }}>Web3 Secured</h4>
                                <p style={{ margin: 0, color: 'hsl(var(--color-text-muted))', fontSize: '0.875rem' }}>Blockchain-verified</p>
                            </div>
                        </div>
                        <p style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                            Experience the next generation of property registry. Government-grade security powered by the Avalanche C-Chain network.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;
