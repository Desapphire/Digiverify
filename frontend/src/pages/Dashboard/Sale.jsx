import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import {
    ArrowRight, ArrowLeft, Building, Wallet, DollarSign,
    FileCheck, Send, Loader2, CheckCircle2, AlertTriangle,
    Camera, Shield, User as UserIcon, Activity, Check, MapPin
} from 'lucide-react';
import './PropertyPages.css';

const STEPS = [
    { step: 0, label: 'Select Property', icon: Building, desc: 'Choose Property' },
    { step: 1, label: 'Set Price & Buyer', icon: DollarSign, desc: 'Price & Buyer' },
    { step: 2, label: 'Review Terms', icon: FileCheck, desc: 'Review Agreement' },
    { step: 3, label: 'Confirm with Face Scan', icon: Send, desc: 'Face Verification' },
];

const Sale = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const { account, connectWallet } = useWeb3();

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
    const initialPropId = searchParams.get('propertyId') || '';
    const [selectedPropertyId, setSelectedPropertyId] = useState(initialPropId);
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
                if (initialPropId && verifiedProperties.some(p => p.id === initialPropId)) {
                    setSelectedPropertyId(initialPropId);
                    setStep(1); // Auto-advance to Price & Buyer step if property pre-selected
                }
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
            case 1: return !!salePrice && parseFloat(salePrice) > 0 && !!buyerWallet && buyerWallet.startsWith('0x') && buyerWallet.length === 42 && buyerWallet.toLowerCase() !== sellerWallet?.toLowerCase();
            case 2: return true;
            case 3: return true;
            default: return false;
        }
    };

    const handleSubmit = async (bypassVerification = false) => {
        try {
            setSubmitting(true);
            setError('');

            let wallet = account;
            if (!wallet) {
                wallet = await connectWallet();
            }

            if (!isBiometricallyVerified && !bypassVerification) {
                setShowBiometricModal(true);
                setSubmitting(false);
                return;
            }

            const res = await saleService.initiateSale({
                propertyId: selectedPropertyId,
                buyerWallet: buyerWallet.trim(),
                salePrice: parseFloat(salePrice),
            });

            setCreatedSale(res.data?.data);
            setSuccess(true);
        } catch (err) {
            console.error('Sale initiation failed', err);
            setError(err.response?.data?.message || err.message || 'Failed to initiate sale agreement.');
        } finally {
            setSubmitting(false);
        }
    };

    const startBiometric = async () => {
        if (!cvReady) { alert('Face Scanner is still loading. Please wait a few seconds and try again.'); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } });
            streamRef.current = stream;
            setBiometricStep(1);
            
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                startDetection();
            }, 100);
        } catch (err) {
            console.error("Camera access failed:", err);
            setError("Could not access camera. Please ensure permissions are granted.");
        }
    };

    const startDetection = async () => {
        const cv = window.cv;
        try {
            const response = await fetch('/haarcascade_frontalface_default.xml');
            if (!response.ok) throw new Error('Failed to fetch Haar cascade');
            const buffer = await response.arrayBuffer();
            const data = new Uint8Array(buffer);
            
            try {
                cv.FS_createDataFile('/', 'haarcascade_sale.xml', data, true, false, false);
            } catch (fsErr) {
                console.warn("Cascade file might already exist:", fsErr);
            }
        } catch (err) {
            console.error("Setup error:", err);
        }

        const classifier = new cv.CascadeClassifier();
        try {
            classifier.load('haarcascade_sale.xml');
        } catch (err) {
            console.error("Classifier load failed:", err);
        }

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
                        ctx.strokeStyle = '#2563EB';
                        ctx.lineWidth = 2;
                        ctx.strokeRect(face.x, face.y, face.width, face.height);
                    }
                } else {
                    setFaceDetected(false);
                }
                processingLoopRef.current = requestAnimationFrame(processVideo);
            } catch (err) {
                console.error("Processing error:", err);
                processingLoopRef.current = requestAnimationFrame(processVideo);
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
                    setSubmitting(true);
                    setTimeout(() => handleSubmit(true), 500);
                }, 1000);
            }
        }, 2000);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={36} style={{ color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading Your Verified Properties...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="property-container container-sm">
                <div className="certificate-container" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: '#ECFDF5',
                        border: '2px solid #059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: '#059669'
                    }}>
                        <CheckCircle2 size={40} />
                    </div>
                    <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF', '--badge-border': '#BFDBFE', marginBottom: '1rem' }}>
                        Sale Agreement Created
                    </span>
                    <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                        Property Sale Agreement Created
                    </h2>
                    <p style={{ color: '#475569', maxWidth: '480px', margin: '0 auto 2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Your sale agreement has been created. The buyer will now review and sign the agreement.
                    </p>

                    {createdSale && (
                        <div className="gov-data-grid" style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
                            <div className="gov-data-item">
                                <span className="label">Transaction ID</span>
                                <span className="value mono" style={{ color: '#1E40AF' }}>{createdSale.id}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Agreed Sale Price</span>
                                <span className="value">₹{parseFloat(salePrice).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="gov-btn gov-btn-primary" onClick={() => navigate('/transactions')}>
                            View My Transactions
                        </button>
                        <button className="gov-btn" onClick={() => {
                            setSuccess(false);
                            setStep(0);
                            setSelectedPropertyId('');
                            setSalePrice('');
                            setBuyerWallet('');
                        }}>
                            Sell Another Property
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-md">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <button className="back-button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Back
                    </button>
                    <h1 className="page-title">Sell a Property</h1>
                    <p className="page-subtitle">
                        Create a secure sale agreement to transfer your property to a buyer.
                    </p>
                </div>
                <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0' }}>
                    <Shield size={14} /> Safe Escrow Protection
                </span>
            </div>

            {/* Stepper Progress */}
            <div className="gov-stepper">
                {STEPS.map((s, idx) => {
                    const isActive = step === s.step;
                    const isCompleted = step > s.step;

                    return (
                        <React.Fragment key={s.step}>
                            <div className={`gov-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                <div className="gov-step-num">
                                    {isCompleted ? <Check size={18} /> : s.step + 1}
                                </div>
                                <div className="gov-step-info">
                                    <span className="gov-step-title">{s.label}</span>
                                    <span className="gov-step-subtitle">{s.desc}</span>
                                </div>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`gov-step-divider ${step > s.step ? 'completed' : ''}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {error && (
                <div className="alert-message error">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Step Card Content */}
            <div className="gov-card">
                {/* Step 0: Property Selection */}
                {step === 0 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <Building size={20} /> Select Property to Sell
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 1 of 4</span>
                        </div>

                        {properties.length === 0 ? (
                            <div className="empty-state">
                                <Building size={40} style={{ color: '#94A3B8', margin: '0 auto 1rem' }} />
                                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>No Verified Properties Found</h4>
                                <p style={{ color: '#64748B', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                                    You need at least one verified property in your account to create a sale agreement.
                                </p>
                                <button className="gov-btn gov-btn-primary" onClick={() => navigate('/register-property')}>
                                    Register a Property
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                {properties.map(prop => {
                                    const isSelected = selectedPropertyId === prop.id;
                                    return (
                                        <div
                                            key={prop.id}
                                            onClick={() => setSelectedPropertyId(prop.id)}
                                            style={{
                                                padding: '1.25rem',
                                                borderRadius: '12px',
                                                border: `2px solid ${isSelected ? '#1E40AF' : '#E2E8F0'}`,
                                                background: isSelected ? '#EFF6FF' : '#FFFFFF',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                                        {prop.surveyNumber}
                                                    </h4>
                                                    <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0', fontSize: '0.65rem' }}>
                                                        VERIFIED
                                                    </span>
                                                </div>
                                                <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <MapPin size={13} style={{ color: '#1E40AF' }} />
                                                    {prop.district}{prop.state ? `, ${prop.state}` : ''} • <strong style={{ color: '#0F172A' }}>{prop.areaSqft?.toLocaleString()} Sq.Ft.</strong>
                                                </p>
                                            </div>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                border: `2px solid ${isSelected ? '#1E40AF' : '#CBD5E1'}`,
                                                background: isSelected ? '#1E40AF' : '#FFFFFF',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#FFFFFF'
                                            }}>
                                                {isSelected && <Check size={14} />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 1: Terms */}
                {step === 1 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <DollarSign size={20} /> Set Price & Buyer Details
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 2 of 4</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Sale Price (INR ₹) *</label>
                                <input
                                    type="number"
                                    className="gov-input"
                                    placeholder="e.g. 5000000"
                                    value={salePrice}
                                    onChange={e => setSalePrice(e.target.value)}
                                    min="1"
                                    required
                                    style={{ fontSize: '1.1rem', fontWeight: 700 }}
                                />
                                {salePrice && parseFloat(salePrice) > 0 && (
                                    <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, marginTop: '0.35rem' }}>
                                        ₹ {parseFloat(salePrice).toLocaleString('en-IN')} INR
                                    </span>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Buyer Wallet Address (0x...) *</label>
                                <input
                                    type="text"
                                    className="gov-input mono"
                                    placeholder="0x..."
                                    value={buyerWallet}
                                    onChange={e => setBuyerWallet(e.target.value)}
                                    required
                                />
                                {buyerWallet && (!buyerWallet.startsWith('0x') || buyerWallet.length !== 42) && (
                                    <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.35rem' }}>
                                        Must be a valid 42-character wallet address starting with 0x.
                                    </span>
                                )}
                                {buyerWallet && buyerWallet.toLowerCase() === sellerWallet?.toLowerCase() && (
                                    <span style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '0.35rem' }}>
                                        You cannot sell a property to yourself. Buyer wallet must be different.
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Review Terms */}
                {step === 2 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <FileCheck size={20} /> Review Sale Agreement Details
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 3 of 4</span>
                        </div>

                        <div className="gov-data-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="label">Selected Property</span>
                                <span className="value" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                                    Survey #{selectedProperty?.surveyNumber} ({selectedProperty?.district}, {selectedProperty?.state})
                                </span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Sale Price</span>
                                <span className="value" style={{ color: '#1E40AF', fontSize: '1.25rem', fontWeight: 800 }}>
                                    ₹ {parseFloat(salePrice).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Total Property Area</span>
                                <span className="value">{selectedProperty?.areaSqft?.toLocaleString()} Sq.Ft.</span>
                            </div>
                            <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="label">Seller (Your Wallet)</span>
                                <span className="value mono" style={{ fontSize: '0.85rem' }}>{sellerWallet}</span>
                            </div>
                            <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="label">Buyer Wallet</span>
                                <span className="value mono" style={{ fontSize: '0.85rem' }}>{buyerWallet}</span>
                            </div>
                        </div>

                        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                            <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ color: '#92400E', fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                                Creating this agreement starts the sale process. Once the buyer signs, they will lock payment in escrow until government approval.
                            </p>
                        </div>
                    </div>
                )}

                {/* Step 3: Digital Attestation */}
                {step === 3 && (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                        <div style={{
                            width: '72px',
                            height: '72px',
                            borderRadius: '50%',
                            background: '#EFF6FF',
                            border: '2px solid #1E40AF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            color: '#1E40AF'
                        }}>
                            <Shield size={36} />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                            Confirm with Face Scan
                        </h3>
                        <p style={{ color: '#64748B', maxWidth: '420px', margin: '0 auto 2rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
                            A quick live face scan is required to confirm your identity before creating the sale agreement.
                        </p>

                        <button
                            type="button"
                            className="gov-btn gov-btn-primary"
                            disabled={submitting}
                            onClick={() => handleSubmit(false)}
                            style={{ padding: '0.9rem 2.5rem', fontSize: '1rem' }}
                        >
                            {submitting ? (
                                <><Loader2 size={20} className="animate-spin" /> Verifying & Creating...</>
                            ) : (
                                <><Send size={18} /> Confirm & Create Sale Agreement</>
                            )}
                        </button>
                    </div>
                )}

                {/* Footer Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #E2E8F0' }}>
                    <button
                        type="button"
                        className="gov-btn"
                        onClick={() => setStep(Math.max(0, step - 1))}
                        disabled={step === 0 || submitting}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    {step < 3 && (
                        <button
                            type="button"
                            className="gov-btn gov-btn-primary"
                            onClick={() => setStep(step + 1)}
                            disabled={!canProceed()}
                        >
                            Continue <ArrowRight size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Clean GovTech Biometric Verification Modal */}
            {showBiometricModal && (
                <div className="gov-biometric-modal">
                    <div className="gov-biometric-card">
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                            Face Verification
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>
                            Please look at your camera to confirm your identity before proceeding.
                        </p>

                        <div className="gov-camera-viewport">
                            {biometricStep > 0 && biometricStep < 4 ? (
                                <>
                                    <video ref={videoRef} autoPlay playsInline muted />
                                    <canvas ref={canvasRef} />
                                    <div className="gov-scan-line" />
                                    <div className="gov-progress-bar">
                                        <div className="gov-progress-bar-fill" style={{ width: `${biometricProgress}%` }} />
                                    </div>
                                    {!faceDetected && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 25, color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700 }}>
                                            Position your face in the frame
                                        </div>
                                    )}
                                </>
                            ) : biometricStep === 4 ? (
                                <CheckCircle2 size={54} style={{ color: '#059669' }} />
                            ) : (
                                <Activity size={40} style={{ color: '#1E40AF' }} />
                            )}
                        </div>

                        {biometricStep === 0 ? (
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                <button className="gov-btn" onClick={() => setShowBiometricModal(false)}>Cancel</button>
                                <button className="gov-btn gov-btn-primary" onClick={startBiometric}>Start Face Scan</button>
                            </div>
                        ) : (
                            <div>
                                <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>
                                    {biometricStep === 1 && 'Look straight at the camera...'}
                                    {biometricStep === 2 && 'Turn your head slightly to the left...'}
                                    {biometricStep === 3 && 'Turn your head slightly to the right...'}
                                    {biometricStep === 4 && 'Face Verified Successfully!'}
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
