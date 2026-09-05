import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, Loader2, ArrowRight, KeyRound, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import DigiVerifyLogo from '../../components/DigiVerifyLogo';

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
            await login(email, password);
            navigate('/authority');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Authority login failed.');
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
            padding: '1.5rem'
        }}>
            <div className="digi-card" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '2.25rem',
                background: '#0F172A',
                border: '1px solid #1E293B',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.75rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        color: '#EF4444'
                    }}>
                        <ShieldAlert size={24} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                        Land Registrar Portal
                    </h1>
                    <p style={{ fontSize: '0.825rem', color: '#94A3B8', marginTop: '0.35rem', margin: 0 }}>
                        Restricted access for certified government cadastral officers
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        marginBottom: '1.25rem',
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

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Officer Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                            <input
                                type="email"
                                className="input-premium"
                                style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.875rem' }}
                                placeholder="registrar@gov.in"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                            <input
                                type="password"
                                className="input-premium"
                                style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.875rem' }}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>
                            Access Code <span style={{ color: '#64748B', fontWeight: 400 }}>(Optional)</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <KeyRound size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                            <input
                                type="text"
                                className="input-premium font-mono"
                                style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.85rem' }}
                                placeholder="GOV-XXXX-XXXX"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-cyan-glow"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            marginTop: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            background: '#0284C7'
                        }}
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : (
                            <>
                                Authenticate Clearance
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.75rem', borderTop: '1px solid #1E293B', paddingTop: '1.25rem', textAlign: 'center' }}>
                    <p style={{ color: '#64748B', fontSize: '0.75rem', margin: 0, lineHeight: 1.5 }}>
                        Authorized government personnel only. All access sessions are cryptographically logged and stored on the immutable audit trail.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthorityLogin;
