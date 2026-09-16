import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, Loader2, ArrowRight, KeyRound, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AuthorityLogin = () => {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Authority login — server validates role=AUTHORITY
            await login(email, password);
            navigate('/authority');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Sign in failed. Please check your email and password.');
        } finally {
            setLoading(false);
        }
    };

    const fillDemoCredentials = () => {
        setEmail('anurag.yadav24@vit.edu');
        setPassword('admin123');
        setAccessCode('AUTH-GOV-9821');
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Inter", sans-serif)'
        }}>
            {/* Top Official Header Bar */}
            <header style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E2E8F0',
                padding: '0.875rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        backgroundColor: '#0F172A',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF'
                    }}>
                        <Building2 size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            DigiVerify <span style={{ color: '#2563EB', fontWeight: 600 }}>Officer Portal</span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Land Records & Verification Portal
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#047857',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '9999px'
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#047857' }}></span>
                        Official Portal
                    </span>
                </div>
            </header>

            {/* Main Login Body */}
            <main style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2.5rem 1.5rem',
                backgroundImage: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(37, 99, 235, 0.04), transparent)'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '460px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.04)',
                    overflow: 'hidden'
                }}>
                    {/* Top Accent Strip */}
                    <div style={{ height: '4px', background: 'linear-gradient(90deg, #0F172A 0%, #1E3A8A 50%, #2563EB 100%)' }} />

                    <div style={{ padding: '2.25rem 2.25rem 2rem' }}>
                        {/* Header */}
                        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '14px',
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#1E3A8A',
                                marginBottom: '1rem'
                            }}>
                                <ShieldCheck size={30} />
                            </div>
                            <h1 style={{
                                fontSize: '1.5rem',
                                fontWeight: 800,
                                color: '#0F172A',
                                letterSpacing: '-0.02em',
                                margin: 0,
                                marginBottom: '0.35rem'
                            }}>
                                Officer Sign In
                            </h1>
                            <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                                Sign in to access the land registry officer dashboard
                            </p>
                        </div>

                        {/* Security Notice Banner */}
                        <div style={{
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '10px',
                            padding: '0.75rem 1rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <Lock size={16} style={{ color: '#2563EB', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 500, lineHeight: 1.4 }}>
                                Secure officer session. All verification actions are recorded.
                            </span>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div style={{
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '10px',
                                padding: '0.75rem 1rem',
                                marginBottom: '1.25rem',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}>
                                <AlertCircle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: '2px' }} />
                                <div style={{ fontSize: '0.82rem', color: '#991B1B', fontWeight: 600, lineHeight: 1.4 }}>
                                    {error}
                                </div>
                            </div>
                        )}

                        {/* Login Form */}
                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                            {/* Email */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#1E293B',
                                    marginBottom: '0.375rem'
                                }}>
                                    Email Address
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={17} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#94A3B8'
                                    }} />
                                    <input
                                        type="email"
                                        required
                                        placeholder="officer@landregistry.gov.in"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 38px',
                                            fontSize: '0.9rem',
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '8px',
                                            color: '#0F172A',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#2563EB';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#CBD5E1';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: '#1E293B',
                                    marginBottom: '0.375rem'
                                }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={17} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#94A3B8'
                                    }} />
                                    <input
                                        type="password"
                                        required
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 38px',
                                            fontSize: '0.9rem',
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '8px',
                                            color: '#0F172A',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#2563EB';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#CBD5E1';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Access Code */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                                    <label style={{
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        color: '#1E293B',
                                        margin: 0
                                    }}>
                                        Access Code <span style={{ color: '#94A3B8', fontWeight: 500 }}>(Optional)</span>
                                    </label>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <KeyRound size={17} style={{
                                        position: 'absolute',
                                        left: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        color: '#94A3B8'
                                    }} />
                                    <input
                                        type="text"
                                        placeholder="AUTH-GOV-0000"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px 10px 38px',
                                            fontSize: '0.85rem',
                                            fontFamily: 'monospace',
                                            backgroundColor: '#FFFFFF',
                                            border: '1px solid #CBD5E1',
                                            borderRadius: '8px',
                                            color: '#0F172A',
                                            outline: 'none',
                                            boxSizing: 'border-box',
                                            transition: 'border-color 0.2s, box-shadow 0.2s'
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#2563EB';
                                            e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#CBD5E1';
                                            e.target.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: '0.5rem',
                                    width: '100%',
                                    padding: '12px 16px',
                                    backgroundColor: '#0F172A',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    boxShadow: '0 2px 4px rgba(15, 23, 42, 0.15)',
                                    transition: 'background-color 0.2s, transform 0.1s'
                                }}
                                onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#1E293B'; }}
                                onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#0F172A'; }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    <>
                                        Sign In to Dashboard
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Demo Credential Helper */}
                        <div style={{
                            marginTop: '1.5rem',
                            paddingTop: '1.25rem',
                            borderTop: '1px solid #F1F5F9',
                            textAlign: 'center'
                        }}>
                            <button
                                type="button"
                                onClick={fillDemoCredentials}
                                style={{
                                    background: '#F8FAFC',
                                    border: '1px dashed #CBD5E1',
                                    borderRadius: '6px',
                                    padding: '6px 14px',
                                    fontSize: '0.75rem',
                                    color: '#475569',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#EFF6FF';
                                    e.currentTarget.style.borderColor = '#93C5FD';
                                    e.currentTarget.style.color = '#1D4ED8';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                                    e.currentTarget.style.borderColor = '#CBD5E1';
                                    e.currentTarget.style.color = '#475569';
                                }}
                            >
                                <CheckCircle2 size={13} style={{ color: '#2563EB' }} />
                                Fill Demo Credentials
                            </button>
                        </div>
                    </div>

                    {/* Footer note inside Card */}
                    <div style={{
                        backgroundColor: '#F8FAFC',
                        borderTop: '1px solid #E2E8F0',
                        padding: '1rem 1.5rem',
                        fontSize: '0.72rem',
                        color: '#64748B',
                        lineHeight: 1.5,
                        textAlign: 'center'
                    }}>
                        <strong>RESTRICTED ACCESS:</strong> Authorized officer access only. All activity is recorded.
                    </div>
                </div>
            </main>

            {/* Footer Bar */}
            <footer style={{
                backgroundColor: '#FFFFFF',
                borderTop: '1px solid #E2E8F0',
                padding: '1rem 2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.78rem',
                color: '#64748B'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} style={{ color: '#047857' }} />
                    <span>DigiVerify Land Registry • Secure Officer Portal</span>
                </div>
                <div>
                    Land Records & Verification © {new Date().getFullYear()}
                </div>
            </footer>
        </div>
    );
};

export default AuthorityLogin;
