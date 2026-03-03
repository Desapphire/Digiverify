import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { User, Mail, Lock, Calendar, Phone, IdCard, Loader2, ArrowRight, ShieldCheck, Camera, UserPlus, Wallet } from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';

const Register = () => {
    const navigate = useNavigate();
    const { account, connectWallet, isConnecting } = useWeb3();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        birthdate: '',
        phone: '',
        governmentId: '',
        faceIdHash: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFaceIdCapture = () => {
        // Simulated Face ID hash capture for demonstration.
        // In reality, this would use WebRTC to take a photo, send it to a model, and compute a robust hash.
        const simulatedHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        setFormData({ ...formData, faceIdHash: simulatedHash });
        setStep(3); // Proceed to submit
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!account) throw new Error("Please connect a Web3 wallet first to link your identity.");

            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                birthdate: formData.birthdate,
                phone: formData.phone || undefined,
                governmentId: formData.governmentId || undefined,
                walletAddress: account,
                role: 'user'
            };

            await authService.register(payload);
            console.log("Registration API successful");

            // Login to obtain JWT token for authenticated requests
            await login(formData.email, formData.password);
            console.log("Login API successful");

            // Bind Face ID after successful login
            if (formData.faceIdHash) {
                console.log("Binding Face ID...");
                await authService.bindFaceId(formData.faceIdHash);
                console.log("Face ID bound");
            }

            // After registration, Face ID binding, and login, navigate to dashboard
            console.log("Navigating to dashboard");
            navigate('/dashboard');
        } catch (err) {
            console.error("Registration flow failed:", err);
            setError(err.response?.data?.message || err.message || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center p-6 h-full w-full py-12">
            <div className="glass-panel w-full max-w-2xl p-8 md:p-10 relative z-10">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-glow-primary animate-float">
                        <UserPlus className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 tracking-tight">
                        Create <span className="text-gradient">Identity</span>
                    </h1>
                    <p className="text-muted text-sm font-medium">Digital Verification System</p>
                </div>

                <div className="flex justify-between items-center mb-10 px-4 relative">
                    <div className="absolute top-1/2 left-8 right-8 h-0.5 bg-subtle -z-10 translate-y-[-50%]"></div>
                    {[1, 2, 3].map((num) => (
                        <div key={num} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 transition-all ${step >= num ? 'bg-primary-base border-primary-base text-white shadow-glow-primary' : 'bg-black/50 border-subtle text-muted'}`}>
                            {num}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-danger text-sm font-bold text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); if (step === 3) handleRegister(e); }}>
                    {step === 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse-glow" style={{ animationIterationCount: 1 }}>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Full Legal Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="text" name="name" className="input-premium pl-12" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Birthdate</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="date" name="birthdate" className="input-premium pl-12" value={formData.birthdate} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="email" name="email" className="input-premium pl-12" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="password" name="password" className="input-premium pl-12" placeholder="Min 6 chars" value={formData.password} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Government ID (Optional)</label>
                                <div className="relative">
                                    <IdCard className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="text" name="governmentId" className="input-premium pl-12" placeholder="UID/SSN" value={formData.governmentId} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Phone (Optional)</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="tel" name="phone" className="input-premium pl-12" placeholder="+123456789" value={formData.phone} onChange={handleChange} />
                                </div>
                            </div>

                            <button type="button" onClick={() => setStep(2)} className="btn w-full md:col-span-2 flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 mt-4">
                                Continue to Biometrics <ArrowRight size={20} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col items-center gap-6 py-8 animate-pulse-glow" style={{ animationIterationCount: 1 }}>
                            <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30 animate-float">
                                <Camera className="w-10 h-10 text-primary-glow" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold mb-2">Biometric Binding</h3>
                                <p className="text-sm text-muted max-w-sm">Capture your Face ID to securely bind your physical identity to your digital profile. This is required for critical asset transfers.</p>
                            </div>
                            <button type="button" onClick={handleFaceIdCapture} className="btn w-full max-w-sm flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 mt-4">
                                Simulate Face ID Capture
                            </button>
                            <button type="button" onClick={() => setStep(1)} className="text-sm text-muted font-bold hover:text-white mt-4">
                                Go Back
                            </button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col gap-8 animate-pulse-glow" style={{ animationIterationCount: 1 }}>
                            <div className="bg-black/40 p-6 rounded-2xl border border-subtle">
                                <h3 className="text-sm font-bold text-muted uppercase tracking-widest mb-4">Final Step: Link Web3 Wallet</h3>
                                {!account ? (
                                    <button type="button" onClick={connectWallet} disabled={isConnecting} className="btn btn-secondary w-full py-4 text-base bg-white/5 border-dashed hover:cursor-pointer">
                                        <Wallet className="w-5 h-5 text-blue-400" />
                                        {isConnecting ? 'Waiting for MetaMask...' : 'Click to Connect MetaMask'}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                                        <ShieldCheck className="w-8 h-8 text-success flex-shrink-0" />
                                        <div className="overflow-hidden">
                                            <p className="text-xs font-bold text-success uppercase tracking-wider mb-1">Wallet Linked</p>
                                            <p className="text-sm font-mono text-white/80 truncate">{account}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <button type="button" onClick={() => setStep(2)} className="btn btn-secondary flex-1">Back</button>
                                <button type="submit" disabled={!account || loading} className="btn flex-2 w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200">
                                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Deploy Identity'}
                                    {!loading && <ArrowRight size={20} />}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                {step === 1 && (
                    <div className="mt-8 text-center border-t border-subtle pt-6">
                        <p className="text-muted text-xs font-bold uppercase tracking-widest mb-3">Already have an identity?</p>
                        <Link to="/login" className="inline-flex items-center gap-2 text-primary-glow font-bold text-sm hover:opacity-80 transition-opacity">
                            Access Dashboard
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;
