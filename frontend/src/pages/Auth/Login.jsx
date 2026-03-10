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

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (loginMethod === 'wallet') {
                if (!account || !signer) {
                    throw new Error('Please connect your MetaMask wallet first.');
                }
                const message = `Sign this message to authenticate with Squrify Land Registry.`;
                const signature = await signMessage(message);
                await loginWithWallet(account, signature);
            } else {
                await login(email, password);
            }
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center p-6 h-full w-full">
            <div className="glass-panel w-full max-w-md p-8 md:p-10 relative z-10 animate-pulse-glow" style={{ animationIterationCount: 0 }}>
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-glow-primary animate-float">
                        <Shield className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">
                        Welcome <span className="text-gradient">Back</span>
                    </h1>
                    <p className="text-muted text-sm font-medium">Digital Verification System</p>
                </div>

                <div className="flex p-1 bg-black/30 rounded-2xl border border-subtle mb-8">
                    <button
                        type="button"
                        onClick={() => { setLoginMethod('password'); setError(''); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${loginMethod === 'password' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Credentials
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginMethod('wallet'); setError(''); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${loginMethod === 'wallet' ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Web3 Wallet
                    </button>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    {loginMethod === 'wallet' ? (
                        <div className="flex flex-col gap-6">
                            {!account ? (
                                <button
                                    type="button"
                                    onClick={connectWallet}
                                    disabled={loading || isConnecting}
                                    className="btn btn-primary w-full py-4 text-base"
                                >
                                    <Wallet size={20} />
                                    {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                                </button>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Connected Address</label>
                                    <div className="input-premium font-mono text-xs text-blue-400 truncate opacity-80 select-none">
                                        {account}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input
                                        type="email"
                                        className="input-premium pl-12"
                                        placeholder="john@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input
                                        type="password"
                                        className="input-premium pl-12"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="text-danger text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || (loginMethod === 'wallet' && !account)}
                        className="btn w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 mt-2"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <>
                                {loginMethod === 'wallet' ? 'Sign to Login' : 'Access Dashboard'}
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-subtle pt-6">
                    <p className="text-muted text-xs font-bold uppercase tracking-widest mb-3">New to the ecosystem?</p>
                    <Link to="/register" className="inline-flex items-center gap-2 text-primary-glow font-bold text-sm hover:opacity-80 transition-opacity">
                        Create Digital Identity
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
