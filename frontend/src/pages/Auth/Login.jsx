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
            const message = `Sign this message to authenticate with Squrify Land Registry.`;
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

                <div className="flex p-1 bg-black/40 rounded-2xl border border-subtle mb-8 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => { setLoginMethod('password'); setError(''); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${loginMethod === 'password' ? 'bg-primary-base text-white shadow-lg' : 'text-muted hover:text-white hover:bg-white/5'}`}
                    >
                        Credentials
                    </button>
                    <button
                        type="button"
                        onClick={() => { setLoginMethod('wallet'); setError(''); }}
                        className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${loginMethod === 'wallet' ? 'bg-primary-base text-white shadow-lg' : 'text-muted hover:text-white hover:bg-white/5'}`}
                    >
                        Web3 Wallet
                    </button>
                </div>

                <form onSubmit={handlePasswordLogin} className="flex flex-col gap-6">
                    {loginMethod === 'wallet' ? (
                        <div className="flex flex-col gap-6 items-center py-6">
                            <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-2 border border-orange-500/20">
                                <Wallet className="w-8 h-8 text-orange-400" />
                            </div>
                            <div className="text-center mb-2">
                                <h3 className="font-bold text-lg mb-1">Web3 Authentication</h3>
                                <p className="text-muted text-sm px-4">Connect your wallet and sign a message to securely access your account instantly.</p>
                            </div>
                            
                            <button
                                type="button"
                                onClick={handleDirectWalletLogin}
                                disabled={loading || isConnecting}
                                className="btn w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 shadow-glow-primary transition-all active:scale-[0.98]"
                            >
                                {loading || isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                    <>
                                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-6 h-6 mr-1" />
                                        Continue with MetaMask
                                    </>
                                )}
                            </button>
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
                                        placeholder="kartik.bhavar24@vit.edu"
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
                            
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 mt-2"
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                                    <>
                                        Access Dashboard
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="text-danger text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}
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
