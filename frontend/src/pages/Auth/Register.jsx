import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { User, Mail, Lock, Calendar, Phone, IdCard, Loader2, ArrowRight, ShieldCheck, Camera, UserPlus, Wallet, MapPin } from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';
import DigiVerifyLogo from '../../components/DigiVerifyLogo';
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
        setStep(3);
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
            await login(formData.email, formData.password);

            if (formData.faceIdHash) {
                await authService.bindFaceId(formData.faceIdHash);
            }

            navigate('/dashboard');
        } catch (err) {
            console.error("Registration flow failed:", err);
            setError(err.response?.data?.message || err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: '#090D16',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem'
        }}>
            <div className="digi-card" style={{
                width: '100%',
                maxWidth: '560px',
                padding: '2.5rem',
                background: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{ marginBottom: '1.25rem' }}>
                        <DigiVerifyLogo />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                        Create Citizen Identity
                    </h1>
                    <p style={{ fontSize: '0.825rem', color: '#94A3B8', marginTop: '0.35rem', margin: 0 }}>
                        Decentralized Land Registry & Multi-Sig Verification
                    </p>
                </div>

                {/* Stepper */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    marginBottom: '2rem'
                }}>
                    {[
                        { num: 1, label: 'Identity' },
                        { num: 2, label: 'Biometrics' },
                        { num: 3, label: 'Web3 Wallet' }
                    ].map((s, idx) => (
                        <React.Fragment key={s.num}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <div style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    background: step === s.num ? '#0284C7' : step > s.num ? 'rgba(16,185,129,0.2)' : '#1E293B',
                                    color: step === s.num ? '#FFFFFF' : step > s.num ? '#10B981' : '#64748B',
                                    border: step === s.num ? '1px solid #38BDF8' : step > s.num ? '1px solid #10B981' : '1px solid #334155',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.8rem',
                                    fontWeight: 700
                                }}>
                                    {step > s.num ? '✓' : s.num}
                                </div>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: step === s.num ? '#F8FAFC' : '#64748B'
                                }}>
                                    {s.label}
                                </span>
                            </div>
                            {idx < 2 && (
                                <div style={{
                                    width: '24px',
                                    height: '1px',
                                    background: step > s.num ? '#10B981' : '#1E293B'
                                }} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '1.5rem',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        color: '#EF4444',
                        fontSize: '0.825rem',
                        fontWeight: 500,
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); if (step === 3) handleRegister(e); }}>
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Full Legal Name</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                    <input type="text" name="name" className="input-premium" style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.85rem' }} placeholder="E.g. Rajesh Sharma" value={formData.name} onChange={handleChange} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Birthdate</label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                        <input
                                            type="date"
                                            name="birthdate"
                                            className="input-premium"
                                            style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.85rem', color: formData.birthdate ? '#F8FAFC' : '#64748B' }}
                                            value={formData.birthdate}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Phone Number</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                        <input type="tel" name="phone" className="input-premium" style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.85rem' }} placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} required />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                    <input type="email" name="email" className="input-premium" style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.85rem' }} placeholder="user@example.com" value={formData.email} onChange={handleChange} required />
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                    <input type="password" name="password" className="input-premium" style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.85rem' }} placeholder="Min 8 characters" value={formData.password} onChange={handleChange} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Govt ID Type</label>
                                    <select name="governmentIdType" className="input-premium" style={{ width: '100%', fontSize: '0.85rem', background: '#0B0F19' }} value={formData.governmentIdType} onChange={handleChange} required>
                                        <option value="">Select Type</option>
                                        <option value="Aadhar">Aadhaar</option>
                                        <option value="Passport">Passport</option>
                                        <option value="Voter ID">Voter ID</option>
                                        <option value="Driving License">Driving License</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Govt ID Number</label>
                                    <input type="text" name="governmentId" className="input-premium font-mono" style={{ width: '100%', fontSize: '0.85rem' }} placeholder="ID Number" value={formData.governmentId} onChange={handleChange} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>City</label>
                                    <input type="text" name="city" className="input-premium" style={{ width: '100%', fontSize: '0.85rem' }} placeholder="E.g. Hyderabad" value={formData.city} onChange={handleChange} required />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>State</label>
                                    <input type="text" name="state" className="input-premium" style={{ width: '100%', fontSize: '0.85rem' }} placeholder="E.g. Telangana" value={formData.state} onChange={handleChange} required />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="btn-cyan-glow"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    marginTop: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    fontSize: '0.875rem'
                                }}
                            >
                                Continue to Biometric Liveness <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ padding: '0.5rem 0' }}>
                            <BiometricCapture
                                onCaptureComplete={handleFaceIdCapture}
                                onBack={() => setStep(1)}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{
                                background: '#0B0F19',
                                border: '1px solid #1E293B',
                                borderRadius: '12px',
                                padding: '1.25rem',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.4rem' }}>
                                    Link Avalanche Web3 Wallet
                                </h3>
                                <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                    Your property deed NFTs and multi-sig smart contracts will be held by this public address.
                                </p>

                                {!account ? (
                                    <button
                                        type="button"
                                        onClick={connectWallet}
                                        disabled={isConnecting}
                                        className="btn-cyan-outline"
                                        style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                                    >
                                        <Wallet size={16} style={{ color: '#38BDF8' }} />
                                        {isConnecting ? 'Connecting MetaMask...' : 'Connect MetaMask Wallet'}
                                    </button>
                                ) : (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '8px',
                                        background: 'rgba(16,185,129,0.1)',
                                        border: '1px solid rgba(16,185,129,0.3)',
                                        textAlign: 'left'
                                    }}>
                                        <ShieldCheck size={24} style={{ color: '#10B981', flexShrink: 0 }} />
                                        <div style={{ overflow: 'hidden' }}>
                                            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', margin: 0 }}>Wallet Linked</p>
                                            <p style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#F8FAFC', margin: '0.2rem 0 0', textOverflow: 'ellipsis', overflow: 'hidden' }}>{account}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn-cyan-outline"
                                    style={{ flex: 1, padding: '0.75rem', fontSize: '0.85rem' }}
                                >
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={!account || loading}
                                    className="btn-cyan-glow"
                                    style={{ flex: 2, padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                                >
                                    {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                        <>
                                            Deploy Identity
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {step === 1 && (
                    <div style={{ marginTop: '1.75rem', borderTop: '1px solid #1E293B', paddingTop: '1.25rem', textAlign: 'center' }}>
                        <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0 }}>
                            Already have an identity registered?{' '}
                            <Link to="/login" style={{ color: '#38BDF8', fontWeight: 600, textDecoration: 'none' }}>
                                Sign In
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
