import React, { useState, useRef, useEffect } from 'react';
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

    const [biometricStep, setBiometricStep] = useState(0); // 0: Start, 1: Center, 2: Left, 3: Right, 4: Done
    const [biometricProgress, setBiometricProgress] = useState(0);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [cvReady, setCvReady] = useState(false);
    const [cvLoading, setCvLoading] = useState(true);
    const [faceDetected, setFaceDetected] = useState(false);
    const [capturedImages, setCapturedImages] = useState([]);
    const processingLoopRef = useRef(null);


    useEffect(() => {
        const checkOpenCV = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                setCvReady(true);
                setCvLoading(false);
                clearInterval(checkOpenCV);
            }
        }, 500);
        return () => {
            clearInterval(checkOpenCV);
            if (processingLoopRef.current) cancelAnimationFrame(processingLoopRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);



    const handleFaceIdCapture = () => {
        // Simulated Face ID hash capture for demonstration.
        const simulatedHash = 'e3b0' + Math.random().toString(16).slice(2) + 'd855';
        setFormData({ ...formData, faceIdHash: simulatedHash });
        setStep(3); // Proceed to submit
    };

    const startBiometric = async () => {
        if (!cvReady) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setBiometricStep(1);
            startDetection();
            // Wait for detection to stabilize before starting the sequence
        } catch (err) {
            console.error("Camera access failed:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
        }
    };

    const startDetection = async () => {
        const cv = window.cv;

        // Load Haar Cascade
        const response = await fetch('/haarcascade_frontalface_default.xml');
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        cv.FS_createDataFile('/', 'haarcascade.xml', data, true, false, false);

        const classifier = new cv.CascadeClassifier();
        classifier.load('haarcascade.xml');

        const cap = new cv.VideoCapture(videoRef.current);
        const frame = new cv.Mat(240, 320, cv.CV_8UC4);
        const gray = new cv.Mat();
        const faces = new cv.RectVector();

        const processVideo = () => {
            try {
                if (!streamRef.current || !streamRef.current.active) return;

                cap.read(frame);
                cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY, 0);
                classifier.detectMultiScale(gray, faces, 1.1, 3, 0);

                if (faces.size() > 0) {
                    setFaceDetected(true);
                    // Draw feedback box on canvas
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const face = faces.get(0);
                        ctx.strokeStyle = '#3b82f6';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(face.x, face.y, face.width, face.height);
                    }
                } else {
                    setFaceDetected(false);
                }

                processingLoopRef.current = requestAnimationFrame(processVideo);
            } catch (err) {
                console.error("Processing error:", err);
            }
        };

        processVideo();
        // Start the sequence simulation once detection is active
        setTimeout(() => simulateCapture(1), 2000);
    };



    const captureFrame = (stepName) => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImages(prev => [...prev, { step: stepName, url: dataUrl }]);
    };

    const simulateCapture = (currentStep) => {
        setBiometricProgress(0);
        const stepNames = ["Center", "Left", "Right"];

        const interval = setInterval(() => {
            setBiometricProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 5;
            });
        }, 100);

        setTimeout(() => {
            const stepNames = ["Center", "Left", "Right"];
            captureFrame(stepNames[currentStep - 1]);

            if (currentStep < 3) {
                setBiometricStep(currentStep + 1);
                simulateCapture(currentStep + 1);
            } else {

                setBiometricStep(4);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                handleFaceIdCapture();
            }
        }, 2000);
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
                            <div className="relative w-32 h-32 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30 overflow-hidden">
                                {biometricStep > 0 && biometricStep < 4 ? (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            width="320"
                                            height="240"
                                            className="absolute inset-0 w-full h-full object-cover grayscale"
                                            style={{ filter: 'brightness(0.7) contrast(1.2)' }}
                                        />
                                        <canvas
                                            ref={canvasRef}
                                            width="320"
                                            height="240"
                                            className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                                        />
                                        {!faceDetected && (
                                            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
                                                <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Position Face in Frame</p>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                                        {/* Progress ring simulation */}
                                        <svg className="absolute inset-0 w-full h-full transform -rotate-90 z-40">
                                            <circle cx="64" cy="64" r="60" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="6" fill="transparent" />
                                            <circle cx="64" cy="64" r="60" stroke="#3b82f6" strokeWidth="6" fill="transparent"
                                                strokeDasharray={2 * Math.PI * 60}
                                                strokeDashoffset={2 * Math.PI * 60 * (1 - biometricProgress / 100)}
                                                style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
                                        </svg>
                                    </div>
                                ) : biometricStep === 4 ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-green-500/10">
                                        <ShieldCheck className="w-16 h-16 text-green-400" />
                                    </div>
                                ) : (
                                    <Camera className="w-10 h-10 text-primary-glow" />
                                )}



                            </div>

                            <div className="text-center px-4">
                                {biometricStep === 0 && (
                                    <>
                                        <h3 className="text-xl font-bold mb-2">Biometric Binding</h3>
                                        <p className="text-sm text-muted max-w-sm">Capture your Face ID to securely bind your physical identity to your digital profile. This is required for critical asset transfers.</p>
                                        <button type="button" onClick={startBiometric} className="btn w-full max-w-sm flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 mt-6">
                                            Start Face Verification
                                        </button>
                                    </>
                                )}
                                {biometricStep === 1 && <h3 className="text-2xl font-black text-blue-400 animate-pulse">Look Straight at Camera</h3>}
                                {biometricStep === 2 && <h3 className="text-2xl font-black text-blue-400 animate-pulse">Move Head to the LEFT</h3>}
                                {biometricStep === 3 && <h3 className="text-2xl font-black text-blue-400 animate-pulse">Move Head to the RIGHT</h3>}
                                {biometricStep === 4 && (
                                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <h3 className="text-2xl font-black text-green-400 mb-6">Capture Complete!</h3>

                                        <div className="flex gap-3 justify-center mb-8">
                                            {capturedImages.map((img, i) => (
                                                <div key={i} className="group relative">
                                                    <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                                        <img src={img.url} alt={img.step} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-muted mt-2 uppercase tracking-tighter">{img.step}</p>
                                                </div>
                                            ))}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setStep(3)}
                                            className="btn w-full max-w-sm flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 border-b-4 border-gray-300 active:border-b-0 active:translate-y-1 transition-all"
                                        >
                                            Proceed to Wallet Link <ArrowRight size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>


                            {biometricStep === 0 && (
                                <button type="button" onClick={() => setStep(1)} className="text-sm text-muted font-bold hover:text-white mt-4">
                                    Go Back
                                </button>
                            )}
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
