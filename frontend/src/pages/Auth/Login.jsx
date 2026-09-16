import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    Shield, 
    Wallet, 
    Mail, 
    Lock, 
    Loader2, 
    ArrowRight, 
    Eye, 
    EyeOff, 
    AlertCircle, 
    Sparkles, 
    Cpu, 
    ScanFace, 
    ChevronRight,
    KeyRound
} from 'lucide-react';
import { ethers } from 'ethers';
import { useAuth } from '../../context/AuthContext';

const getEthereumProvider = () => {
    try {
        if (typeof window === 'undefined') return null;
        if (window.ethereum?.providers?.length) {
            const metaMask = window.ethereum.providers.find((p) => p.isMetaMask && !p.isBraveWallet);
            return metaMask || window.ethereum.providers[0];
        }
        return window.ethereum || null;
    } catch (_) {
        return null;
    }
};

const Login = () => {
    const { login, loginWithWallet } = useAuth();
    const navigate = useNavigate();

    const [loginMethod, setLoginMethod] = useState('password'); // 'password' | 'wallet'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [detectedWallet, setDetectedWallet] = useState(null);

    // Detect if MetaMask or Web3 provider is ready
    useEffect(() => {
        const eth = getEthereumProvider();
        if (eth) {
            eth.request({ method: 'eth_accounts' })
                .then(accs => {
                    if (accs && accs.length > 0) {
                        setDetectedWallet(accs[0]);
                    }
                })
                .catch(() => {});
        }
    }, []);

    const handlePasswordLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await login(email.trim(), password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || err.userMessage || err.message || 'Invalid credentials. Please verify your email and password.');
        } finally {
            setLoading(false);
        }
    };

    const handleDirectWalletLogin = async () => {
        setLoading(true);
        setError('');

        try {
            const eth = getEthereumProvider();
            if (!eth) {
                throw new Error("MetaMask extension not detected. Please install MetaMask to use Web3 login.");
            }

            const browserProvider = new ethers.BrowserProvider(eth);
            const accounts = await eth.request({ method: 'eth_requestAccounts' });
            if (!accounts || accounts.length === 0) {
                throw new Error("No Ethereum account selected in MetaMask.");
            }

            const userAccount = accounts[0];
            const activeSigner = await browserProvider.getSigner();

            const message = `Sign this message to authenticate with Digiverify Land Registry.`;
            const signature = await activeSigner.signMessage(message);

            await loginWithWallet(userAccount, signature);
            navigate('/dashboard');

        } catch (err) {
            console.error("Wallet login error:", err);
            if (err.code === 4001 || err.info?.error?.code === 4001 || (err.message && err.message.toLowerCase().includes('user rejected'))) {
                setError('Signature request was cancelled in your wallet.');
            } else if (err.code === -32002) {
                setError('MetaMask request is already pending. Please click your browser extension icon to approve.');
            } else {
                setError(err.response?.data?.message || err.userMessage || err.message || 'Web3 authentication failed.');
            }
        } finally {
            setLoading(false);
        }
    };

    const truncateAddress = (addr) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <>
            <style>
                {`
                    .login-root {
                        min-height: 100vh;
                        width: 100%;
                        background-color: #030206;
                        background-image: 
                            radial-gradient(circle at 15% 25%, rgba(99, 102, 241, 0.15) 0%, transparent 45%),
                            radial-gradient(circle at 85% 75%, rgba(168, 85, 247, 0.12) 0%, transparent 50%),
                            radial-gradient(circle at 50% 50%, rgba(30, 27, 75, 0.45) 0%, transparent 70%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        overflow-x: hidden;
                        padding: 1.5rem;
                        box-sizing: border-box;
                    }

                    .login-grid-pattern {
                        position: absolute;
                        inset: 0;
                        background-size: 40px 40px;
                        background-image: 
                            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
                        pointer-events: none;
                    }

                    .login-container {
                        width: 100%;
                        max-width: 1100px;
                        min-height: 600px;
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
                        .login-container {
                            grid-template-columns: 1.1fr 0.9fr;
                        }
                    }

                    .auth-left-section {
                        padding: 3rem 2.5rem;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }

                    @media (max-width: 640px) {
                        .auth-left-section {
                            padding: 2rem 1.25rem;
                        }
                    }

                    .auth-right-section {
                        background: linear-gradient(135deg, rgba(20, 16, 40, 0.95), rgba(10, 8, 22, 0.98));
                        border-left: 1px solid rgba(255, 255, 255, 0.06);
                        padding: 3rem 2.5rem;
                        display: none;
                        flex-direction: column;
                        justify-content: space-between;
                        position: relative;
                        overflow: hidden;
                    }

                    @media (min-width: 1024px) {
                        .auth-right-section {
                            display: flex;
                        }
                    }

                    .tab-switcher {
                        display: flex;
                        background: rgba(0, 0, 0, 0.45);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 14px;
                        padding: 4px;
                        margin-bottom: 1.75rem;
                        gap: 4px;
                    }

                    .tab-btn {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        padding: 11px 14px;
                        border-radius: 10px;
                        font-size: 0.82rem;
                        font-weight: 700;
                        transition: all 0.25s ease;
                        border: none;
                        cursor: pointer;
                        color: #94a3b8;
                        background: transparent;
                    }

                    .tab-btn.active {
                        background: linear-gradient(135deg, #6366f1, #8b5cf6);
                        color: #ffffff;
                        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.35);
                    }

                    .tab-btn:hover:not(.active) {
                        color: #e2e8f0;
                        background: rgba(255, 255, 255, 0.04);
                    }

                    .input-group-modern {
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        gap: 6px;
                    }

                    .input-group-modern label {
                        font-size: 0.75rem;
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

                    .input-wrapper-modern input {
                        width: 100%;
                        background: rgba(0, 0, 0, 0.35);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 14px;
                        padding: 13px 14px 13px 44px;
                        color: #ffffff;
                        font-size: 0.92rem;
                        outline: none;
                        transition: all 0.2s ease;
                        box-sizing: border-box;
                    }

                    .input-wrapper-modern input:focus {
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

                    .primary-submit-btn {
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

                    .primary-submit-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 10px 28px rgba(99, 102, 241, 0.5);
                        filter: brightness(1.08);
                    }

                    .primary-submit-btn:active:not(:disabled) {
                        transform: translateY(0);
                    }

                    .primary-submit-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .wallet-connect-card {
                        background: rgba(15, 12, 35, 0.5);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        border-radius: 18px;
                        padding: 24px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
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

            <div className="login-root">
                <div className="login-grid-pattern"></div>

                <div className="login-container">
                    {/* LEFT PANEL - AUTH FORM */}
                    <div className="auth-left-section">
                        {/* BRAND HEADER */}
                        <div style={{ marginBottom: '1.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 16px rgba(99, 102, 241, 0.5)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}>
                                    <Shield style={{ width: '22px', height: '22px', color: '#ffffff' }} />
                                </div>
                                <div>
                                    <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.02em' }}>
                                        DIGI<span style={{ color: '#818cf8' }}>VERIFY</span>
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
                                        <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ethereum Sepolia Active</span>
                                    </div>
                                </div>
                            </div>

                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>
                                Welcome <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Back</span>
                            </h1>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                                Sign in to access your registered properties and transactions
                            </p>
                        </div>

                        {/* AUTH METHOD SWITCHER */}
                        <div className="tab-switcher">
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('password'); setError(''); }}
                                className={`tab-btn ${loginMethod === 'password' ? 'active' : ''}`}
                            >
                                <KeyRound style={{ width: '16px', height: '16px' }} />
                                Credentials
                            </button>
                            <button
                                type="button"
                                onClick={() => { setLoginMethod('wallet'); setError(''); }}
                                className={`tab-btn ${loginMethod === 'wallet' ? 'active' : ''}`}
                            >
                                <Wallet style={{ width: '16px', height: '16px' }} />
                                Web3 Wallet
                            </button>
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

                        {/* TAB 1: PASSWORD AUTH */}
                        {loginMethod === 'password' && (
                            <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                                <div className="input-group-modern">
                                    <label>Email Address</label>
                                    <div className="input-wrapper-modern">
                                        <Mail className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                        <input
                                            type="email"
                                            placeholder="kartik.bhavar24@vit.edu"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            autoComplete="email"
                                        />
                                    </div>
                                </div>

                                <div className="input-group-modern">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label>Password</label>
                                        <button
                                            type="button"
                                            onClick={() => setError('Password reset link will be sent to your registered email.')}
                                            style={{ background: 'transparent', border: 'none', color: '#818cf8', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                    <div className="input-wrapper-modern">
                                        <Lock className="input-icon-left" style={{ width: '18px', height: '18px' }} />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            autoComplete="current-password"
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

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 0 6px 0' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            style={{ accentColor: '#6366f1', borderRadius: '4px', cursor: 'pointer' }}
                                        />
                                        Keep me signed in
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="primary-submit-btn"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} />
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight style={{ width: '18px', height: '18px' }} />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* TAB 2: WEB3 WALLET AUTH */}
                        {loginMethod === 'wallet' && (
                            <div className="wallet-connect-card">
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '20px',
                                    background: 'rgba(249, 115, 22, 0.12)',
                                    border: '1px solid rgba(249, 115, 22, 0.25)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1rem',
                                    boxShadow: '0 0 20px rgba(249, 115, 22, 0.15)'
                                }}>
                                    <Wallet style={{ color: '#fb923c', width: '30px', height: '30px' }} />
                                </div>

                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: '0 0 6px 0' }}>
                                    Web3 Signature Auth
                                </h3>
                                <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.5, maxWidth: '340px', margin: '0 0 1.25rem 0' }}>
                                    Sign an off-chain cryptographic challenge with your MetaMask or Web3 wallet to verify ownership instantly.
                                </p>

                                {detectedWallet && (
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: 'rgba(34, 197, 94, 0.08)',
                                        border: '1px solid rgba(34, 197, 94, 0.2)',
                                        borderRadius: '999px',
                                        padding: '6px 14px',
                                        marginBottom: '1.25rem'
                                    }}>
                                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }}></span>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86efac', fontFamily: 'monospace' }}>
                                            {truncateAddress(detectedWallet)}
                                        </span>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={handleDirectWalletLogin}
                                    disabled={loading}
                                    className="primary-submit-btn"
                                    style={{ width: '100%', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)' }}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="animate-spin" style={{ width: '18px', height: '18px' }} />
                                            Awaiting Wallet Signature...
                                        </>
                                    ) : (
                                        <>
                                            <img 
                                                src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                                                alt="MetaMask" 
                                                style={{ width: '20px', height: '20px', marginRight: '4px' }} 
                                            />
                                            Continue with MetaMask
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* BOTTOM REGISTRATION LINK */}
                        <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.25rem', textAlign: 'center' }}>
                            <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 6px 0' }}>
                                Don't have a verified account yet?
                            </p>
                            <Link 
                                to="/register" 
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
                                Create an Account
                                <ChevronRight style={{ width: '16px', height: '16px' }} />
                            </Link>
                        </div>
                    </div>

                    {/* RIGHT PANEL - WEB3 LAND REGISTRY SHOWCASE */}
                    <div className="auth-right-section">
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
                                    Decentralized Land Registry
                                </span>
                            </div>

                            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', lineHeight: 1.25, letterSpacing: '-0.02em', margin: '0 0 1rem 0' }}>
                                Next-Gen Title Deeds with <span style={{ color: '#818cf8' }}>Zero-Trust</span> Security
                            </h2>
                            <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.6, margin: '0 0 2rem 0' }}>
                                Digiverify combines smart contracts on Ethereum Sepolia with live AWS Rekognition biometric validation to eliminate land registry fraud permanently.
                            </p>

                            {/* FEATURE HIGHLIGHTS */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div className="feature-bullet">
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Shield style={{ width: '18px', height: '18px', color: '#818cf8' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>Immutable Title Verification</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>Smart contracts guarantee zero tampering and authentic ownership history.</p>
                                    </div>
                                </div>

                                <div className="feature-bullet">
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Cpu style={{ width: '18px', height: '18px', color: '#c084fc' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>AI Risk & Dispute Engine</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>7-parameter machine learning model detects fraud and property encumbrances in real-time.</p>
                                    </div>
                                </div>

                                <div className="feature-bullet">
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <ScanFace style={{ width: '18px', height: '18px', color: '#4ade80' }} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 700, color: '#ffffff' }}>AWS 3D Face Biometrics</h4>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>Strict multi-angle liveness detection to certify physical buyer & seller identity.</p>
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
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#ffffff' }}>11155111</div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>Chain ID</div>
                            </div>
                            <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#22c55e' }}>100%</div>
                                <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>On-Chain Audit</div>
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

export default Login;
