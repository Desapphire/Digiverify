import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Lock, Mail, Loader2, ArrowRight, KeyRound } from 'lucide-react';
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
            // Authority login — server should validate role=AUTHORITY
            await login(email, password);
            navigate('/authority');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Authority login failed.');
        } finally {
            setLoading(false);
        }
    };
    return (
        <>
            <style>
                {`
                    .authority-layout-container { display: flex; width: 100%; min-height: 100vh; background-color: #050505; overflow: hidden; }
                    .authority-left-panel { width: 100%; display: flex; align-items: center; justify-content: center; padding: 1.5rem; position: relative; z-index: 10; max-height: 100vh; overflow-y: auto; }
                    .authority-right-panel { display: none; position: relative; overflow: hidden; border-left: 1px solid rgba(255,255,255,0.05); }
                    @media (min-width: 1024px) {
                        .authority-left-panel { width: 40%; padding: 3rem; }
                        .authority-right-panel { display: block; width: 60%; }
                    }
                    .hero-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; filter: grayscale(0.2) sepia(0.5) hue-rotate(300deg) saturate(3) brightness(0.7); }
                    .hero-overlay-x { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to right, #050505 0%, transparent 100%); z-index: 1; }
                    .hero-overlay-y { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to top, #050505 0%, transparent 30%); z-index: 1; }
                    .hero-overlay-red { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(135deg, rgba(220, 38, 38, 0.4) 0%, transparent 100%); mix-blend-mode: overlay; z-index: 2; }
                    .hero-card { position: absolute; bottom: 3rem; right: 3rem; max-width: 350px; padding: 1.5rem; border-radius: 24px; background: rgba(30, 10, 10, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(239, 68, 68, 0.2); box-shadow: 0 25px 50px -12px rgba(220, 38, 38, 0.3); z-index: 5; }
                    .authority-max-w { width: 100%; max-width: 420px; margin: auto; }
                    
                    /* Custom scrollbar */
                    .authority-left-panel::-webkit-scrollbar { width: 6px; }
                    .authority-left-panel::-webkit-scrollbar-track { background: transparent; }
                    .authority-left-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    .authority-left-panel::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                `}
            </style>
            <div className="authority-layout-container">
                <div className="authority-left-panel">
                    <div className="glass-panel authority-max-w p-8 md:p-10 relative z-10" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 rounded-t-2xl" />

                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mb-6 shadow-lg animate-float" style={{ backgroundColor: '#dc2626' }}>
                                <ShieldAlert className="text-white w-8 h-8" />
                            </div>
                            <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ fontSize: '1.875rem', fontWeight: 800 }}>
                                Authority <span className="text-gradient">Portal</span>
                            </h1>
                            <p className="text-muted text-xs font-bold uppercase tracking-widest">Restricted Access</p>
                        </div>

                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Authority Email</label>
                                <div className="relative">
                                    <Mail className="absolute text-muted" style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.2rem', height: '1.2rem' }} />
                                    <input
                                        type="email"
                                        className="input-premium"
                                        style={{ paddingLeft: '3rem', width: '100%' }}
                                        placeholder="anurag.yadav24@vit.edu"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Password</label>
                                <div className="relative">
                                    <Lock className="absolute text-muted" style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.2rem', height: '1.2rem' }} />
                                    <input
                                        type="password"
                                        className="input-premium"
                                        style={{ paddingLeft: '3rem', width: '100%' }}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Access Code <span style={{ opacity: 0.5 }}>(Opt)</span></label>
                                <div className="relative">
                                    <KeyRound className="absolute text-muted" style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)', width: '1.2rem', height: '1.2rem' }} />
                                    <input
                                        type="text"
                                        className="input-premium font-mono"
                                        style={{ paddingLeft: '3rem', width: '100%' }}
                                        placeholder="GOV-XXXX-XXXX"
                                        value={accessCode}
                                        onChange={(e) => setAccessCode(e.target.value)}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="text-danger text-xs font-bold text-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ marginTop: '0.5rem' }}>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn w-full flex items-center justify-center gap-2"
                                    style={{ backgroundColor: '#dc2626', color: 'white', fontWeight: 900, borderRadius: '1rem', padding: '1rem 0', transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)' }}
                                >
                                    {loading ? <Loader2 className="animate-spin" style={{ width: '20px', height: '20px' }} /> : (
                                        <>
                                            Login
                                            <ArrowRight style={{ width: '18px', height: '18px' }} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="text-center" style={{ marginTop: '2.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                            <p className="text-muted text-xs font-medium" style={{ opacity: 0.7 }}>
                                This portal is for authorized government officials only. Unauthorized access attempts are monitored and logged.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="authority-right-panel">
                    <img src="/login_hero.png" alt="Restricted Subnet" className="hero-img" />
                    <div className="hero-overlay-x"></div>
                    <div className="hero-overlay-y"></div>
                    <div className="hero-overlay-red"></div>

                    <div className="hero-card">
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.3)', marginRight: '1rem' }}>
                                <ShieldAlert style={{ color: '#f87171', width: '24px', height: '24px' }} />
                            </div>
                            <div>
                                <h4 style={{ margin: 0, color: 'white', fontSize: '1.125rem', fontWeight: 700 }}>Level 5 Clearance</h4>
                                <p style={{ margin: 0, color: '#fca5a5', fontSize: '0.875rem', fontWeight: 600 }}>Active Monitoring</p>
                            </div>
                        </div>
                        <p style={{ color: '#d1d5db', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>
                            You are accessing a restricted government subnet. All interactions are cryptographically signed and stored immutably on the ledger.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthorityLogin;
