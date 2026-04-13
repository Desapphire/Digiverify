import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Wallet, Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';

const Login = () => {
    const { login, loginWithWallet } = useAuth();
    const { account, signer, connectWallet, isConnecting, signMessage } = useWeb3();
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
            // First ensure we have a wallet connection
            let userAccount = account;
            if (!userAccount) {
                userAccount = await connectWallet();
            }
            if (!userAccount) throw new Error("Wallet connection failed or was rejected.");

            // Immediately ask to sign the authentication message
            const message = `Sign this message to authenticate with Digiverify Land Registry.`;
            const signature = await signMessage(message);

            // Execute the backend login
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
        <>
            <style>
                {`
                    .login-layout-container { display: flex; width: 100%; min-height: 100vh; background-color: #050505; overflow: hidden; }
                    .login-left-panel { width: 100%; display: flex; align-items: center; justify-content: center; padding: 1.5rem; position: relative; z-index: 10; }
                    .login-right-panel { display: none; position: relative; overflow: hidden; border-left: 1px solid rgba(255,255,255,0.05); }
                    @media (min-width: 1024px) {
                        .login-left-panel { width: 40%; padding: 3rem; }
                        .login-right-panel { display: block; width: 60%; }
                    }
                    .hero-img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
                    .hero-overlay-x { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to right, #050505 0%, transparent 100%); }
                    .hero-overlay-y { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to top, #050505 0%, transparent 30%); }
                    .hero-card { position: absolute; bottom: 3rem; right: 3rem; max-width: 350px; padding: 1.5rem; border-radius: 24px; background: rgba(20, 15, 35, 0.4); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
                    .login-max-w { width: 100%; max-width: 450px; }
                `}
            </style>
            <div className="login-layout-container">
                <div className="login-left-panel">
                    <div className="glass-panel login-max-w p-8 relative z-10">
                        <div className="flex flex-col items-center mb-8 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-glow-primary animate-float" style={{ backgroundColor: '#2563eb' }}>
                                <Shield className="text-white w-8 h-8" />
                            </div>
                            <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                Welcome <span className="text-gradient">Back</span>
                            </h1>
                            <p className="text-muted text-sm font-medium">Digital Verification System</p>
                        </div>

                        <div className="flex p-1 rounded-2xl border border-subtle mb-8 overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '0.25rem' }}>
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('password'); setError(''); }}
                                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.1em', ...(loginMethod === 'password' ? { backgroundColor: 'hsl(var(--color-primary-base))', color: 'white', border: 'none' } : { backgroundColor: 'transparent', color: 'hsl(var(--color-text-muted))', border: 'none' }) }}
                            >
                                Credentials
                            </button>
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('wallet'); setError(''); }}
                                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.1em', ...(loginMethod === 'wallet' ? { backgroundColor: 'hsl(var(--color-primary-base))', color: 'white', border: 'none' } : { backgroundColor: 'transparent', color: 'hsl(var(--color-text-muted))', border: 'none' }) }}
                            >
                                Web3 Wallet
                            </button>
                        </div>

                        <form onSubmit={handlePasswordLogin} className="flex flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {loginMethod === 'wallet' ? (
                                <div className="flex flex-col items-center" style={{ padding: '1.5rem 0' }}>
                                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                                        <Wallet style={{ color: '#fb923c', width: '32px', height: '32px' }} />
                                    </div>
                                    <div className="text-center mb-2" style={{ marginBottom: '0.5rem' }}>
                                        <h3 className="font-bold text-lg mb-1" style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.25rem' }}>Web3 Authentication</h3>
                                        <p className="text-muted text-sm px-4">Connect your wallet and sign a message to securely access your account instantly.</p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleDirectWalletLogin}
                                        disabled={loading || isConnecting}
                                        className="btn w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 shadow-glow-primary transition-all active:scale-[0.98]"
                                        style={{ backgroundColor: 'white', color: 'black', fontWeight: 900, boxSizing: 'border-box' }}
                                    >
                                        {loading || isConnecting ? <Loader2 className="animate-spin" style={{ width: '24px', height: '24px' }} /> : (
                                            <>
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style={{ width: '24px', height: '24px', marginRight: '4px' }} />
                                                Continue with MetaMask
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-5" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label className="text-muted text-xs font-bold uppercase tracking-widest ml-1" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Email</label>
                                        <div className="relative">
                                            <Mail className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.25rem', height: '1.25rem' }} />
                                            <input
                                                type="email"
                                                className="input-premium"
                                                style={{ paddingLeft: '3rem' }}
                                                placeholder="kartik.bhavar24@vit.edu"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <label className="text-muted text-xs font-bold uppercase tracking-widest ml-1" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginLeft: '0.25rem' }}>Password</label>
                                        <div className="relative">
                                            <Lock className="absolute text-muted" style={{ left: '1rem', top: '0.875rem', width: '1.25rem', height: '1.25rem' }} />
                                            <input
                                                type="password"
                                                className="input-premium"
                                                style={{ paddingLeft: '3rem' }}
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
                                        className="btn w-full flex items-center justify-center gap-3 mt-2"
                                        style={{ backgroundColor: 'white', color: 'black', fontWeight: 900, fontSize: '1rem', marginTop: '0.5rem', borderRadius: '1rem', padding: '1rem 0' }}
                                    >
                                        {loading ? <Loader2 className="animate-spin" style={{ width: '24px', height: '24px' }} /> : (
                                            <>
                                                Login
                                                <ArrowRight style={{ width: '20px', height: '20px' }} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="text-danger text-xs font-bold text-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {error}
                                </div>
                            )}
                        </form>

                        <div className="text-center" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
                            <p className="text-muted text-xs font-bold uppercase tracking-widest mb-3" style={{ fontSize: '0.75rem', marginBottom: '0.75rem' }}>New to the ecosystem?</p>
                            <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'hsl(var(--color-primary-glow))', fontWeight: 700, fontSize: '0.875rem' }}>
                                Register Now
                                <ArrowRight style={{ width: '16px', height: '16px' }} />
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="login-right-panel">
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

export default Login;
