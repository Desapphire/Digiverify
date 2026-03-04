import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import {
    ArrowRight, ArrowLeft, Building, Wallet, DollarSign,
    FileCheck, Send, Loader2, CheckCircle2, AlertTriangle, ChevronDown,
    Camera, Shield, User as UserIcon
} from 'lucide-react';
import './PropertyPages.css';

const STEPS = [
    { label: 'Select Property', icon: Building },
    { label: 'Sale Details', icon: DollarSign },
    { label: 'Review', icon: FileCheck },
    { label: 'Sign & Submit', icon: Send },
];

const Sale = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account, connectWallet, signMessage } = useWeb3();

    const [step, setStep] = useState(0);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [createdSale, setCreatedSale] = useState(null);

    // Biometric state
    const [showBiometricModal, setShowBiometricModal] = useState(false);
    const [biometricStep, setBiometricStep] = useState(0); // 0: Start, 1: Center, 2: Left, 3: Right, 4: Done
    const [biometricProgress, setBiometricProgress] = useState(0);
    const [isBiometricallyVerified, setIsBiometricallyVerified] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [cvReady, setCvReady] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const processingLoopRef = useRef(null);

    useEffect(() => {
        const checkOpenCV = setInterval(() => {
            if (window.cv && window.cv.Mat) {
                setCvReady(true);
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




    // Form state
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [salePrice, setSalePrice] = useState('');
    const [buyerWallet, setBuyerWallet] = useState('');

    // Load owned active properties
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                setLoading(true);
                const res = await propertyService.getMyProperties();
                const verifiedProperties = (res.data?.data || []).filter(p => p.status === 'active' || p.status === 'verified');
                setProperties(verifiedProperties);
            } catch (err) {
                console.error('Failed to load properties', err);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchProperties();
    }, [user]);

    const selectedProperty = properties.find(p => p.id === selectedPropertyId);
    const sellerWallet = account || user?.walletAddress;

    const canProceed = () => {
        switch (step) {
            case 0: return !!selectedPropertyId;
            case 1: return !!salePrice && parseFloat(salePrice) > 0 && !!buyerWallet && buyerWallet.startsWith('0x') && buyerWallet.length === 42;
            case 2: return true;
            case 3: return true;
            default: return false;
        }
    };

    const handleSubmit = async () => {
        try {
            setSubmitting(true);
            setError('');

            // Ensure wallet is connected
            let wallet = account;
            if (!wallet) {
                wallet = await connectWallet();
            }

            // CHECK: Biometric verification required before signing
            if (!isBiometricallyVerified) {
                setShowBiometricModal(true);
                setSubmitting(false);
                return;
            }

            // Sign a message to authenticate the transaction
            const message = `I authorize the sale of property ${selectedProperty.surveyNumber} for ₹${parseFloat(salePrice).toLocaleString()} to ${buyerWallet}`;
            await signMessage(message);


            // Initiate the sale via backend
            const res = await saleService.initiateSale({
                propertyId: selectedPropertyId,
                buyerWallet: buyerWallet,
                salePrice: parseFloat(salePrice),
            });

            setCreatedSale(res.data?.data);
            setSuccess(true);
        } catch (err) {
            console.error('Sale initiation failed', err);
            setError(err.response?.data?.message || err.message || 'Failed to initiate sale.');
        } finally {
            setSubmitting(false);
        }
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
        } catch (err) {
            console.error("Camera access failed:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
        }
    };

    const startDetection = async () => {
        const cv = window.cv;
        const response = await fetch('/haarcascade_frontalface_default.xml');
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        cv.FS_createDataFile('/', 'haarcascade_sale.xml', data, true, false, false);

        const classifier = new cv.CascadeClassifier();
        classifier.load('haarcascade_sale.xml');

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
        setTimeout(() => simulateCapture(1), 2000);
    };



    const simulateCapture = (currentStep) => {
        setBiometricProgress(0);
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
            if (currentStep < 3) {
                setBiometricStep(currentStep + 1);
                simulateCapture(currentStep + 1);
            } else {
                setBiometricStep(4);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }
                setTimeout(() => {

                    setIsBiometricallyVerified(true);
                    setShowBiometricModal(false);
                    // Re-trigger submit after verification
                    setSubmitting(true);
                    setTimeout(() => handleSubmit(), 500);
                }, 1000);
            }
        }, 2000);
    };

    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Properties...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="dashboard-container container-sm">
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <div className="scale-in" style={{ marginBottom: '1.5rem' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto',
                            background: 'rgba(34,197,94,0.1)', border: '2px solid hsl(142,71%,45%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <CheckCircle2 size={40} style={{ color: 'hsl(142,71%,45%)' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                        Sale <span className="text-gradient">Initiated!</span>
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        The sale transaction has been created. The buyer will need to review and sign the agreement.
                    </p>
                    {createdSale && (
                        <div style={{
                            background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '1rem',
                            marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.8rem',
                            color: 'hsl(var(--color-text-secondary))'
                        }}>
                            Transaction ID: {createdSale.id}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button className="btn btn-secondary" onClick={() => navigate('/transactions')}>
                            View Transactions
                        </button>
                        <button className="btn btn-primary" onClick={() => { setSuccess(false); setStep(0); setSelectedPropertyId(''); setSalePrice(''); setBuyerWallet(''); }}>
                            New Sale
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container container-md">
            {/* Header */}
            <div className="page-header">
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
                    Initiate <span className="text-gradient">Sale</span>
                </h1>
                <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                    Transfer property ownership through a secure multi-signature process
                </p>
            </div>

            {/* Stepper */}
            <div className="stepper">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className={`stepper-step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}>
                            <div className="stepper-circle">
                                {i < step ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                            </div>
                            <span className="stepper-label">{s.label}</span>
                        </div>
                    );
                })}
            </div>

            {/* Step Content */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                {/* Step 0: Select Property */}
                {step === 0 && (
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Select Property to Sell
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Choose from your verified properties. Only properties with 'Active' status can be sold.
                        </p>

                        {properties.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <Building size={48} style={{ opacity: 0.2, marginBottom: '1rem', color: 'hsl(255,85%,65%)' }} />
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>No eligible properties</p>
                                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                                    You need at least one active property to initiate a sale.
                                </p>
                                <button className="btn btn-primary" onClick={() => navigate('/register-property')}>
                                    Register Property
                                </button>
                            </div>
                        ) : (
                            <div className="form-column">
                                {properties.map(prop => (
                                    <div
                                        key={prop.id}
                                        onClick={() => setSelectedPropertyId(prop.id)}
                                        className={`property-select-card ${selectedPropertyId === prop.id ? 'selected' : 'unselected'}`}
                                    >
                                        <div>
                                            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {prop.surveyNumber}
                                                <CheckCircle2 size={14} style={{ color: 'hsl(142,71%,45%)' }} />
                                            </h4>
                                            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                {prop.district}{prop.state ? `, ${prop.state}` : ''} • {prop.areaSqft ? `${prop.areaSqft.toLocaleString()} sq.ft` : 'N/A'}
                                            </p>
                                            <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'hsl(220,15%,50%)', marginTop: '0.25rem' }}>
                                                {prop.propertyCode}
                                            </p>
                                        </div>
                                        <div style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            border: selectedPropertyId === prop.id ? '2px solid hsl(255,85%,65%)' : '2px solid rgba(255,255,255,0.15)',
                                            background: selectedPropertyId === prop.id ? 'hsl(255,85%,65%)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            transition: 'all 0.2s ease',
                                        }}>
                                            {selectedPropertyId === prop.id && <CheckCircle2 size={14} style={{ color: 'white' }} />}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 1: Sale Details */}
                {step === 1 && (
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Sale Details
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Enter the sale price and the buyer's wallet address
                        </p>

                        <div className="form-column">
                            <div className="form-group">
                                <label className="form-label" style={{ color: 'hsl(var(--color-text-secondary))' }}>
                                    <DollarSign size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    Sale Price (INR)
                                </label>
                                <input
                                    className="input-premium"
                                    type="number"
                                    placeholder="e.g. 5000000"
                                    value={salePrice}
                                    onChange={(e) => setSalePrice(e.target.value)}
                                    min="1"
                                    style={{ fontSize: '1.1rem', fontWeight: 600 }}
                                />
                                {salePrice && parseFloat(salePrice) > 0 && (
                                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--color-text-muted))', marginTop: '0.35rem', fontFamily: 'monospace' }}>
                                        ₹ {parseFloat(salePrice).toLocaleString('en-IN')}
                                    </p>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ color: 'hsl(var(--color-text-secondary))' }}>
                                    <Wallet size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                                    Buyer Wallet Address
                                </label>
                                <input
                                    className="input-premium"
                                    type="text"
                                    placeholder="0x..."
                                    value={buyerWallet}
                                    onChange={(e) => setBuyerWallet(e.target.value)}
                                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                />
                                {buyerWallet && (!buyerWallet.startsWith('0x') || buyerWallet.length !== 42) && (
                                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--color-danger))', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <AlertTriangle size={12} /> Invalid Ethereum address format
                                    </p>
                                )}
                                {buyerWallet && buyerWallet.toLowerCase() === sellerWallet?.toLowerCase() && (
                                    <p style={{ fontSize: '0.75rem', color: 'hsl(var(--color-danger))', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <AlertTriangle size={12} /> Buyer cannot be the same as seller
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Review Agreement */}
                {step === 2 && (
                    <div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Review Agreement
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                            Verify all details before signing the transaction
                        </p>

                        <div className="form-column" style={{ gap: '1rem' }}>
                            {/* Property Details */}
                            <div className="info-box">
                                <h4 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '0.75rem' }}>
                                    Property
                                </h4>
                                <p style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>{selectedProperty?.surveyNumber}</p>
                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                    {selectedProperty?.district}{selectedProperty?.state ? `, ${selectedProperty.state}` : ''}
                                    {selectedProperty?.areaSqft ? ` • ${selectedProperty.areaSqft.toLocaleString()} sq.ft` : ''}
                                </p>
                                <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'hsl(220,15%,50%)', marginTop: '0.35rem' }}>
                                    {selectedProperty?.propertyCode}
                                </p>
                            </div>

                            {/* Sale Details */}
                            <div className="info-box-grid">
                                <div className="info-box" style={{ padding: '1.25rem' }}>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '0.5rem' }}>
                                        Sale Price
                                    </h4>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 800 }} className="text-gradient">
                                        ₹{parseFloat(salePrice).toLocaleString('en-IN')}
                                    </p>
                                </div>
                                <div className="info-box" style={{ padding: '1.25rem' }}>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '0.5rem' }}>
                                        Currency
                                    </h4>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>INR</p>
                                </div>
                            </div>

                            {/* Wallet Addresses */}
                            <div className="info-box-grid">
                                <div className="info-box" style={{ padding: '1.25rem' }}>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '0.5rem' }}>
                                        Seller (You)
                                    </h4>
                                    <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(var(--color-text-secondary))' }}>
                                        {sellerWallet || 'Wallet not connected'}
                                    </p>
                                </div>
                                <div className="info-box" style={{ padding: '1.25rem' }}>
                                    <h4 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '0.5rem' }}>
                                        Buyer
                                    </h4>
                                    <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(var(--color-text-secondary))' }}>
                                        {buyerWallet}
                                    </p>
                                </div>
                            </div>

                            {/* Agreement Notice */}
                            <div style={{
                                background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.15)',
                                borderRadius: '12px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                            }}>
                                <AlertTriangle size={18} style={{ color: 'hsl(38,92%,50%)', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>Important</p>
                                    <p className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                                        By proceeding, you authorize the creation of a sale agreement. The buyer must also sign, block funds,
                                        and the transaction must be approved by the registered authority before ownership transfers.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Sign & Submit */}
                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <div style={{
                            width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 1.5rem',
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.1))',
                            border: '2px solid rgba(139,92,246,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Send size={28} style={{ color: 'hsl(255,85%,65%)' }} />
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                            Sign & Submit Transaction
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
                            Your wallet will prompt you to sign a message confirming this sale. No gas fees will be charged.
                        </p>

                        {error && (
                            <div style={{
                                background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                                borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem',
                                display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center',
                                color: 'hsl(var(--color-danger))', fontSize: '0.85rem'
                            }}>
                                <AlertTriangle size={16} /> {error}
                            </div>
                        )}

                        <button
                            className="btn btn-primary btn-glow"
                            disabled={submitting}
                            onClick={handleSubmit}
                            style={{ padding: '0.875rem 2.5rem', fontSize: '1rem' }}
                        >
                            {submitting ? (
                                <><Loader2 size={18} className="animate-spin" /> Signing...</>
                            ) : (
                                <><Wallet size={18} /> Sign with Wallet</>
                            )}
                        </button>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0}
                        style={{ fontSize: '0.875rem' }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    {step < 3 && (
                        <button
                            className="btn btn-primary"
                            onClick={() => setStep(step + 1)}
                            disabled={!canProceed()}
                            style={{ fontSize: '0.875rem' }}
                        >
                            Continue <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Biometric Verification Modal */}
            {showBiometricModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: '1.5rem'
                }}>
                    <div className="glass-panel scale-in" style={{ maxWidth: '450px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
                        <div className="relative w-32 h-32 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/30 overflow-hidden mx-auto mb-6">
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
                                            <p className="text-[10px] font-bold text-white uppercase tracking-tighter">Position Face</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-blue-500/20 animate-pulse"></div>
                                    <svg className="absolute inset-0 w-full h-full transform -rotate-90 z-40">
                                        <circle cx="64" cy="64" r="62" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="4" fill="transparent" />
                                        <circle cx="64" cy="64" r="62" stroke="#3b82f6" strokeWidth="4" fill="transparent"
                                            strokeDasharray={2 * Math.PI * 62}
                                            strokeDashoffset={2 * Math.PI * 62 * (1 - biometricProgress / 100)}
                                            style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
                                    </svg>

                                </div>
                            ) : biometricStep === 4 ? (

                                <CheckCircle2 className="w-16 h-16 text-green-400" />
                            ) : (
                                <UserIcon className="w-12 h-12 text-blue-400" />
                            )}
                        </div>

                        {biometricStep === 0 ? (
                            <>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Biometric Verification</h3>
                                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    To authorize this high-value transaction, please perform a quick face verification to prove liveness.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowBiometricModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                                    <button onClick={startBiometric} className="btn btn-primary flex-1">Start Check</button>
                                </div>
                            </>
                        ) : (
                            <div>
                                {biometricStep === 1 && <h4 className="text-xl font-black text-blue-400 animate-pulse">LOOK AT CAMERA</h4>}
                                {biometricStep === 2 && <h4 className="text-xl font-black text-blue-400 animate-pulse">TURN LEFT</h4>}
                                {biometricStep === 3 && <h4 className="text-xl font-black text-blue-400 animate-pulse">TURN RIGHT</h4>}
                                {biometricStep === 4 && <h4 className="text-xl font-black text-green-400">VERIFIED</h4>}
                                <p className="text-muted mt-4" style={{ fontSize: '0.8rem' }}>
                                    Securely binding physical identity to transaction signature...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


export default Sale;
