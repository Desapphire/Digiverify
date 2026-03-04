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
        <div className="flex items-center justify-center p-6 h-full w-full">
            <div className="glass-panel w-full max-w-md p-8 md:p-10 relative z-10 animate-pulse-glow border-red-500/20" style={{ animationIterationCount: 1 }}>

                {/* Red accent strip */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 rounded-t-2xl" />

                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mb-6 shadow-lg animate-float">
                        <ShieldAlert className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">
                        Authority <span className="text-gradient">Portal</span>
                    </h1>
                    <p className="text-muted text-sm font-medium">Restricted Access — Government Officials Only</p>
                </div>

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Authority Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                            <input
                                type="email"
                                className="input-premium pl-12"
                                placeholder="authority@gov.in"
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

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Access Code (Optional)</label>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                            <input
                                type="text"
                                className="input-premium pl-12 font-mono"
                                placeholder="GOV-XXXX-XXXX"
                                value={accessCode}
                                onChange={(e) => setAccessCode(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-danger text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn w-full flex items-center justify-center gap-3 bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-500 mt-2 transition-all"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                            <>
                                Access Command Center
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center border-t border-subtle pt-6">
                    <p className="text-muted text-xs font-medium">
                        This portal is for authorized government officials only. Unauthorized access attempts are logged.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthorityLogin;
