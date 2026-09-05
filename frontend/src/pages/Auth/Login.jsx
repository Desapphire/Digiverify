import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Wallet, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import DigiVerifyLogo from '../../components/DigiVerifyLogo';

const Login = () => {
    const { login, loginWithWallet } = useAuth();
    const { account, connectWallet, isConnecting, signMessage } = useWeb3();
    const navigate = useNavigate();

    const [loginMethod, setLoginMethod] = useState('password'); // 'wallet' or 'password'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleDirectWalletLogin = async () => {
        setLoading(true);
        setError('');

        try {
            let userAccount = account;
            if (!userAccount) {
                userAccount = await connectWallet();
            }
            if (!userAccount) throw new Error("Wallet connection failed or was rejected.");

            const message = `Sign this message to authenticate with Digiverify Land Registry.`;
            const signature = await signMessage(message);

            await loginWithWallet(userAccount, signature);
            navigate('/dashboard');
        } catch (err) {
            console.error("Wallet login error:", err);
            setError(err.response?.data?.message || err.message || 'Wallet login failed or was rejected.');
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
                    <div style={{ marginBottom: '1.25rem' }}>
                        <DigiVerifyLogo />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#F8FAFC', margin: 0, letterSpacing: '-0.02em' }}>
                        Citizen Sign In
                    </h1>
                    <p style={{ fontSize: '0.825rem', color: '#94A3B8', marginTop: '0.35rem', margin: 0 }}>
                        Decentralized Property Registry & Escrow Management
                    </p>
                </div>

                {/* Tab toggle */}
                <div style={{
                    display: 'flex',
                    background: '#0B0F19',
                    border: '1px solid #1E293B',
                    borderRadius: '10px',
                    padding: '0.25rem',
                    marginBottom: '1.5rem'
                }}>
                    <button
                        type="button"
                        onClick={() => { setLoginMethod('password'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '0.55rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: 'none',
                            background: loginMethod === 'password' ? '#0284C7' : 'transparent',
                            color: loginMethod === 'password' ? '#FFFFFF' : '#94A3B8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Credentials
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginMethod('wallet'); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '0.55rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: 'none',
                            background: loginMethod === 'wallet' ? '#0284C7' : 'transparent',
                            color: loginMethod === 'wallet' ? '#FFFFFF' : '#94A3B8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Web3 Wallet
                    </button>
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

                {loginMethod === 'wallet' ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'rgba(2,132,199,0.12)',
                            border: '1px solid rgba(2,132,199,0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.25rem',
                            color: '#38BDF8'
                        }}>
                            <Wallet size={28} />
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#F8FAFC', marginBottom: '0.35rem' }}>
                            MetaMask Authentication
                        </h3>
                        <p style={{ color: '#94A3B8', fontSize: '0.825rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Connect your Avalanche Fuji wallet and cryptographically sign a challenge to authenticate instantly.
                        </p>

                        <button
                            type="button"
                            onClick={handleDirectWalletLogin}
                            disabled={loading || isConnecting}
                            className="btn-cyan-glow"
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem'
                            }}
                        >
                            {loading || isConnecting ? <Loader2 size={18} className="animate-spin" /> : (
                                <>
                                    <Wallet size={16} />
                                    Connect & Sign Challenge
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.35rem' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748B' }} />
                                <input
                                    type="email"
                                    className="input-premium"
                                    style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.875rem' }}
                                    placeholder="user@example.com"
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
                                fontSize: '0.875rem'
                            }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : (
                                <>
                                    Sign In
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>
                )}

                <div style={{ marginTop: '1.75rem', borderTop: '1px solid #1E293B', paddingTop: '1.25rem', textAlign: 'center' }}>
                    <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0 }}>
                        Don't have a verified identity profile?{' '}
                        <Link to="/register" style={{ color: '#38BDF8', fontWeight: 600, textDecoration: 'none' }}>
                            Register Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
