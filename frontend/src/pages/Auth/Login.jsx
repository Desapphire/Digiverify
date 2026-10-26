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
    CheckCircle2,
    KeyRound,
    Sparkles,
    ShieldCheck,
    Layers,
    Cpu,
    ExternalLink
} from 'lucide-react';
import { ethers } from 'ethers';
import { useAuth } from '../../context/AuthContext';
import '../Dashboard/Dashboard.css';
import '../Dashboard/PropertyPages.css';

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

    // Detect if MetaMask or Web3 provider is available
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
        <div style={{
            minHeight: '100vh',
            width: '100%',
            backgroundColor: '#F8FAFC',
            backgroundImage: 'radial-gradient(at 10% 10%, rgba(219, 234, 254, 0.5) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(224, 231, 255, 0.4) 0px, transparent 50%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.5rem'
        }}>
            {/* Top Navigation Bar */}
            <div style={{
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0'
            }}>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                    <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                    }}>
                        <img src="/logo.png" alt="DigiVerify Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                        <span style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.02em' }}>
                            DIGI<span style={{ color: '#2563EB' }}>VERIFY</span>
                        </span>
                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#64748B', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Land Registry Protocol
                        </span>
                    </div>
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#065F46',
                        backgroundColor: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
                        Ethereum Sepolia Connected
                    </span>
                    <Link
                        to="/authority/login"
                        style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            color: '#1E40AF',
                            textDecoration: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE'
                        }}
                    >
                        Authority Portal
                    </Link>
                </div>
            </div>

            {/* Main Center Content */}
            <div style={{
                maxWidth: '1050px',
                width: '100%',
                margin: '2rem auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '2.5rem',
                alignItems: 'center'
            }}>
                {/* Left Column: Welcome / Trust Hero */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0 0.5rem' }}>
                    <div>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            color: '#1D4ED8',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            marginBottom: '0.85rem'
                        }}>
                            <ShieldCheck size={14} />
                            Institutional Web3 Registry
                        </div>
                        <h1 style={{
                            fontSize: '2.25rem',
                            fontWeight: 900,
                            color: '#0F172A',
                            letterSpacing: '-0.03em',
                            lineHeight: 1.2,
                            margin: '0 0 0.85rem 0'
                        }}>
                            Sign in to your <span style={{ color: '#2563EB' }}>Citizen Portfolio</span>
                        </h1>
                        <p style={{
                            fontSize: '0.92rem',
                            color: '#64748B',
                            lineHeight: 1.6,
                            margin: 0,
                            maxWidth: '440px'
                        }}>
                            Securely manage real estate deed tokens, smart escrow transfers, and verifiable cryptographic credentials on Ethereum.
                        </p>
                    </div>

                    {/* Highlights Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '1rem',
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
                                <Shield size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                                    Autonomous Title Protection
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                                    ERC-721 smart contracts permanently link properties with immutable on-chain ownership.
                                </p>
                            </div>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '1rem',
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
                                <Cpu size={20} />
                            </div>
                            <div>
                                <h4 style={{ margin: '0 0 2px 0', fontSize: '0.88rem', fontWeight: 800, color: '#0F172A' }}>
                                    Auto-ML Fraud &amp; Valuation Guard
                                </h4>
                                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748B', lineHeight: 1.45 }}>
                                    Every transaction is continuously evaluated with live AI price and AML isolation forests.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Clean White Authentication Card */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '2rem 2.25rem',
                    boxShadow: '0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
                    position: 'relative'
                }}>
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

                    {/* Tab Switcher */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '6px',
                        background: '#F1F5F9',
                        padding: '4px',
                        borderRadius: '10px',
                        marginBottom: '1.5rem'
                    }}>
                        <button
                            type="button"
                            onClick={() => { setLoginMethod('password'); setError(''); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                backgroundColor: loginMethod === 'password' ? '#FFFFFF' : 'transparent',
                                color: loginMethod === 'password' ? '#0F172A' : '#64748B',
                                boxShadow: loginMethod === 'password' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <KeyRound size={15} />
                            Credentials
                        </button>
                        <button
                            type="button"
                            onClick={() => { setLoginMethod('wallet'); setError(''); }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '9px 12px',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                backgroundColor: loginMethod === 'wallet' ? '#FFFFFF' : 'transparent',
                                color: loginMethod === 'wallet' ? '#0F172A' : '#64748B',
                                boxShadow: loginMethod === 'wallet' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                            }}
                        >
                            <Wallet size={15} />
                            MetaMask Web3
                        </button>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div style={{
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            marginBottom: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                        }}>
                            <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 600, lineHeight: 1.4 }}>
                                {error}
                            </span>
                        </div>
                    )}

                    {/* Mode 1: Email & Password */}
                    {loginMethod === 'password' && (
                        <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                    Email Address
                                </label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: '#F8FAFC',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '8px',
                                    padding: '0.65rem 0.85rem'
                                }}>
                                    <Mail size={16} style={{ color: '#64748B' }} />
                                    <input
                                        type="email"
                                        placeholder="citizen@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            width: '100%',
                                            fontSize: '0.86rem',
                                            color: '#0F172A'
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setError('Password reset instructions will be sent to your registered email.')}
                                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    background: '#F8FAFC',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '8px',
                                    padding: '0.65rem 0.85rem'
                                }}>
                                    <Lock size={16} style={{ color: '#64748B' }} />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        autoComplete="current-password"
                                        style={{
                                            border: 'none',
                                            background: 'transparent',
                                            outline: 'none',
                                            width: '100%',
                                            fontSize: '0.86rem',
                                            color: '#0F172A'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 0 }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem', color: '#64748B' }}>
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                                    />
                                    Remember this session
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '11px',
                                    borderRadius: '8px',
                                    backgroundColor: '#2563EB',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                                    transition: 'all 0.15s ease',
                                    marginTop: '0.25rem'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    <>
                                        Sign In to Portal
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Mode 2: MetaMask Web3 Login */}
                    {loginMethod === 'wallet' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1rem 0' }}>
                            <div style={{
                                width: '56px',
                                height: '56px',
                                borderRadius: '14px',
                                backgroundColor: '#FFF7ED',
                                border: '1px solid #FFEDD5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1rem'
                            }}>
                                <img 
                                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
                                    alt="MetaMask" 
                                    style={{ width: '32px', height: '32px' }} 
                                />
                            </div>

                            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                                Instant Web3 Authentication
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5, margin: '0 0 1.25rem 0', maxWidth: '300px' }}>
                                Authenticate securely using your cryptographic wallet signature. Zero gas fees required.
                            </p>

                            {detectedWallet && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    backgroundColor: '#ECFDF5',
                                    border: '1px solid #A7F3D0',
                                    borderRadius: '999px',
                                    padding: '4px 12px',
                                    marginBottom: '1.25rem'
                                }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }}></span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#065F46', fontFamily: 'monospace' }}>
                                        {truncateAddress(detectedWallet)}
                                    </span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleDirectWalletLogin}
                                disabled={loading}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '11px 20px',
                                    borderRadius: '8px',
                                    backgroundColor: '#D97706',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.25)',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Awaiting Wallet Signature...
                                    </>
                                ) : (
                                    <>
                                        <Wallet size={16} />
                                        Continue with MetaMask
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Bottom Registration Link */}
                    <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                            Don't have an account yet?{' '}
                        </span>
                        <Link
                            to="/register"
                            style={{ fontSize: '0.82rem', fontWeight: 800, color: '#2563EB', textDecoration: 'none' }}
                        >
                            Register Citizen Identity
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bottom Footer */}
            <div style={{
                maxWidth: '1200px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0',
                borderTop: '1px solid #E2E8F0',
                flexWrap: 'wrap',
                gap: '0.5rem'
            }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                    &copy; 2026 DigiVerify Autonomous Land Protocol. Cryptographic Title Deeds.
                </span>
                <div style={{ display: 'flex', gap: '14px', fontSize: '0.72rem', color: '#64748B' }}>
                    <span>EVM Smart Contracts</span>
                    <span>&bull;</span>
                    <span>Zero Knowledge</span>
                    <span>&bull;</span>
                    <span>Proof-of-Stake</span>
                </div>
            </div>
        </div>
    );
};

export default Login;
