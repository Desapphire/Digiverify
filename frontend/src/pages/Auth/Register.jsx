import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { User, Mail, Lock, Calendar, Phone, IdCard, Loader2, ArrowRight, ShieldCheck, Camera, UserPlus, Wallet } from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';
import BiometricCapture from './BiometricCapture';

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

    const handleFaceIdCapture = (hash) => {
        setFormData({ ...formData, faceIdHash: hash });
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
        <div className="flex items-center justify-center p-6 h-full w-full py-12 max-w-[1200px] mx-auto">
            <div className="glass-panel w-full max-w-[1100px] mx-auto p-8 md:p-10 relative z-10">
                <div className="flex flex-col items-center mb-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6 shadow-glow-primary">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Full Legal Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="text" name="name" className="input-premium w-full pl-12" placeholder="Kartik Bhavar" value={formData.name} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Birthdate</label>
                                <div className="relative">
                                    <Calendar className="absolute left-4 top-3.5 w-5 h-5 text-muted pointer-events-none" />
                                    <input 
                                        type="date" 
                                        name="birthdate" 
                                        className="input-premium w-full pl-12 cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full" 
                                        value={formData.birthdate} 
                                        onChange={handleChange} 
                                        onClick={(e) => {
                                            if (e.target.showPicker) {
                                                try { e.target.showPicker(); } catch (err) {}
                                            }
                                        }}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="email" name="email" className="input-premium w-full pl-12" placeholder="kartik.bhavar24@vit.edu" value={formData.email} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="password" name="password" className="input-premium w-full pl-12" placeholder="Min 6 chars" value={formData.password} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Government ID (Optional)</label>
                                <div className="relative">
                                    <IdCard className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="text" name="governmentId" className="input-premium w-full pl-12" placeholder="UID/SSN" value={formData.governmentId} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Phone (Optional)</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                    <input type="tel" name="phone" className="input-premium w-full pl-12" placeholder="+123456789" value={formData.phone} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="md:col-span-2 flex justify-center mt-6">
                                <button type="button" onClick={() => setStep(2)} className="btn w-full md:w-1/2 max-w-[400px] flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-[30px] hover:bg-gray-200">
                                    Continue to Biometrics <ArrowRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex flex-col items-center gap-6 py-8">
                            <BiometricCapture 
                                onCaptureComplete={handleFaceIdCapture}
                                onBack={() => setStep(1)}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col gap-8">
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
