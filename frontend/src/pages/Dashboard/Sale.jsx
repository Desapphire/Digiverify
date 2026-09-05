import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { ethers } from 'ethers';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import SaleContractABI from '../../abis/SaleContract.json';
import { TopNavbar } from '../../components/TopNavbar';
import {
    ArrowRight, ArrowLeft, Building, Wallet, DollarSign,
    FileCheck, Send, Loader2, CheckCircle2, AlertTriangle, ChevronDown,
    Camera, Shield, User as UserIcon, Activity
} from 'lucide-react';
import './PropertyPages.css';

const STEPS = [
    { label: 'Select Property', icon: Building },
    { label: 'Input Terms', icon: DollarSign },
    { label: 'Verify', icon: FileCheck },
    { label: 'Sign & Init', icon: Send },
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
    }

    const handleSubmit = async (bypassVerification = false) => {
        try {
            setSubmitting(true);
            setError('');

            // Ensure wallet is connected
            let wallet = account;
            if (!wallet) {
                wallet = await connectWallet();
            }

            // CHECK: Biometric verification required before signing
            if (!isBiometricallyVerified && !bypassVerification) {
                setShowBiometricModal(true);
                setSubmitting(false);
                return;
            }

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
                        ctx.strokeStyle = '#00E5FF';
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
                    setTimeout(() => handleSubmit(true), 500); // Pass true to bypass stale closure check
                }, 1000);
            }
        }, 2000);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', color: '#94A3B8', fontSize: '0.88rem' }}>Loading Multi-Sig Contracts...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
                <TopNavbar 
                    title="Sale Initiated" 
                    subtitle="Multi-sig sale agreement deployed on Avalanche Fuji"
                    showLogo={false} 
                    showNetwork={true}
                    showNotifications={true}
                    showProfile={true}
                />
                <div style={{ padding: '4rem 2rem', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.5rem',
                        background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10B981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <CheckCircle2 size={36} style={{ color: '#10B981' }} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.75rem' }}>
                        Sale Agreement Created
                    </h2>
                    <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                        The multi-sig agreement is deployed. The buyer must now deposit funds into escrow to proceed to surveyor and authority approvals.
                    </p>
                    {createdSale && (
                        <div style={{ padding: '1rem', background: '#0F172A', border: '1px solid #1E293B', borderRadius: '10px', marginBottom: '2rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', fontSize: '0.85rem' }}>
                            <span style={{ color: '#64748B', fontSize: '0.7rem', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Agreement ID</span>
                            {createdSale.id}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="btn-dark-pill" onClick={() => navigate('/transactions')}>
                            View Transactions
                        </button>
                        <button className="btn-cyan-glow" onClick={() => { setSuccess(false); setStep(0); setSelectedPropertyId(''); setSalePrice(''); setBuyerWallet(''); }}>
                            Initiate Another Sale
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            <TopNavbar 
                title="Initiate Multi-Sig Sale" 
                subtitle="Deploy a cryptographic escrow land sale agreement on Avalanche Fuji"
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2.5rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
                
                {/* Clean Stepper Bar */}
                <div 
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '1.25rem 1.75rem', 
                        marginBottom: '2rem', 
                        background: '#0F172A',
                        border: '1px solid #1E293B',
                        borderRadius: '12px'
                    }}
                >
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const isCompleted = i < step;
                        const isActive = i === step;
                        const color = isActive ? '#38BDF8' : isCompleted ? '#10B981' : '#64748B';

                        return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: isActive || isCompleted ? 1 : 0.4 }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', border: `1.5px solid ${color}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: isActive ? '#0284C720' : isCompleted ? '#10B98120' : 'transparent',
                                    transition: 'all 0.2s ease'
                                }}>
                                    {isCompleted ? <CheckCircle2 size={16} style={{ color: '#10B981' }} /> : <Icon size={15} style={{ color }} />}
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: isActive ? '#F8FAFC' : isCompleted ? '#E2E8F0' : '#64748B', whiteSpace: 'nowrap' }}>
                                    {s.label}
                                </span>
                            </div>
                        );
                    })}
                </div>

                <div 
                    className="digi-card p-8" 
                    style={{ 
                        background: '#0F172A', 
                        border: '1px solid #1E293B', 
                        borderRadius: '16px' 
                    }}
                >
                    {/* Step 0: Select Property */}
                    {step === 0 && (
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.4rem' }}>
                                Select Property Parcel
                            </h3>
                            <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                                Choose a verified on-chain property to initiate the sale agreement.
                            </p>

                            {properties.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem 2rem', background: '#0B0F19', borderRadius: '12px', border: '1px dashed #334155' }}>
                                    <Building size={40} style={{ color: '#64748B', margin: '0 auto 1rem' }} />
                                    <p style={{ fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem', fontSize: '1.1rem' }}>No Verified Properties Available</p>
                                    <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                                        You need at least one verified active parcel to initiate a multi-sig transfer agreement.
                                    </p>
                                    <button className="btn-cyan-glow" onClick={() => navigate('/register-property')}>
                                        Register a Property
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                    {properties.map(prop => (
                                        <div
                                            key={prop.id}
                                            onClick={() => setSelectedPropertyId(prop.id)}
                                            style={{
                                                padding: '1.1rem', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                border: selectedPropertyId === prop.id ? '2px solid #0284C7' : '1px solid #1E293B',
                                                background: selectedPropertyId === prop.id ? '#0284C710' : '#0B0F19'
                                            }}
                                        >
                                            <div>
                                                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC', margin: 0, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    {prop.surveyNumber ? `Survey #${prop.surveyNumber}` : `Parcel #${prop.id.slice(0, 8)}`}
                                                    <span className="badge-active-green">Verified</span>
                                                </h4>
                                                <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span>{prop.district}{prop.state ? `, ${prop.state}` : ''}</span>
                                                    <span style={{ color: '#334155' }}>•</span>
                                                    <span style={{ color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>{prop.areaSqft ? `${prop.areaSqft.toLocaleString()} sqft` : 'N/A'}</span>
                                                </p>
                                            </div>
                                            <div style={{
                                                width: '20px', height: '20px', borderRadius: '50%',
                                                border: selectedPropertyId === prop.id ? '2px solid #0284C7' : '2px solid #475569',
                                                background: selectedPropertyId === prop.id ? '#0284C7' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                {selectedPropertyId === prop.id && <CheckCircle2 size={12} style={{ color: '#FFFFFF' }} />}
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
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.4rem' }}>
                                Enter Agreement Terms
                            </h3>
                            <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
                                Specify the agreed fiat sale price and the buyer's Web3 wallet address.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                        Agreed Sale Price (INR ₹) *
                                    </label>
                                    <input
                                        className="input-premium"
                                        style={{ width: '100%', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'JetBrains Mono' }}
                                        type="number"
                                        placeholder="e.g. 5000000"
                                        value={salePrice}
                                        onChange={(e) => setSalePrice(e.target.value)}
                                        min="1"
                                    />
                                    {salePrice && parseFloat(salePrice) > 0 && (
                                        <p style={{ fontSize: '0.85rem', color: '#10B981', marginTop: '0.4rem', fontWeight: 700 }}>
                                            ₹ {parseFloat(salePrice).toLocaleString('en-IN')}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label style={{ display: 'block', color: '#94A3B8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                                        Buyer EVM Wallet Address *
                                    </label>
                                    <input
                                        className="input-premium"
                                        style={{ width: '100%', fontSize: '0.88rem', fontFamily: 'JetBrains Mono' }}
                                        type="text"
                                        placeholder="0x..."
                                        value={buyerWallet}
                                        onChange={(e) => setBuyerWallet(e.target.value)}
                                    />
                                    {buyerWallet && (!buyerWallet.startsWith('0x') || buyerWallet.length !== 42) && (
                                        <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <AlertTriangle size={14} /> Must be a valid 42-character Ethereum address
                                        </p>
                                    )}
                                    {buyerWallet && buyerWallet.toLowerCase() === sellerWallet?.toLowerCase() && (
                                        <p style={{ fontSize: '0.75rem', color: '#EF4444', marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            <AlertTriangle size={14} /> Buyer address cannot be identical to seller address
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Review Agreement */}
                    {step === 2 && (
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.4rem' }}>
                                Review Agreement Summary
                            </h3>
                            <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
                                Confirm all parameters before proceeding to biometric authorization and cryptographic signature.
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1.25rem', background: '#0B0F19', border: '1px solid #1E293B', borderRadius: '10px', marginBottom: '1.25rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Property Details</span>
                                    <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#F8FAFC' }}>
                                        {selectedProperty?.surveyNumber ? `Survey #${selectedProperty.surveyNumber}` : `Parcel #${selectedProperty?.id.slice(0, 8)}`}
                                    </span>
                                    <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '2px 0 0 0' }}>
                                        {selectedProperty?.district}{selectedProperty?.state ? `, ${selectedProperty.state}` : ''} • {selectedProperty?.areaSqft?.toLocaleString()} sqft
                                    </p>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Agreed Sale Price</span>
                                    <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10B981' }}>₹{parseFloat(salePrice).toLocaleString('en-IN')}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Currency</span>
                                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#F8FAFC' }}>INR (ASBA Escrow)</span>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Seller (You)</span>
                                    <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#94A3B8' }}>{sellerWallet}</span>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Buyer</span>
                                    <span style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#38BDF8' }}>{buyerWallet}</span>
                                </div>
                            </div>

                            <div style={{
                                background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)',
                                borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                            }}>
                                <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
                                <p style={{ color: '#94A3B8', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>
                                    Once submitted, a multi-sig escrow agreement is created. The buyer will receive a notification to review and lock funds.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Sign & Submit */}
                    {step === 3 && (
                        <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 1.25rem',
                                background: '#0284C715', border: '1px solid #0284C7',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Send size={28} style={{ color: '#0284C7' }} />
                            </div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                                Biometric Liveness & Digital Signature
                            </h3>
                            <p style={{ color: '#94A3B8', fontSize: '0.88rem', marginBottom: '2rem', maxWidth: '440px', margin: '0 auto 2rem', lineHeight: 1.5 }}>
                                The state registrar requires facial liveness validation and Web3 cryptographic signature before contract creation.
                            </p>

                            {error && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                                    borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem',
                                    display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center',
                                    color: '#EF4444', fontSize: '0.85rem'
                                }}>
                                    <AlertTriangle size={16} /> {error}
                                </div>
                            )}

                            <button
                                className="btn-cyan-glow"
                                disabled={submitting}
                                onClick={() => handleSubmit(false)}
                                style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                            >
                                {submitting ? (
                                    <><Loader2 size={18} className="animate-spin" /> Verifying & Signing...</>
                                ) : (
                                    <><Camera size={18} /> Verify Biometrics & Sign Agreement</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid #1E293B' }}>
                        <button
                            className="btn-dark-pill"
                            onClick={() => setStep(Math.max(0, step - 1))}
                            disabled={step === 0 || submitting}
                            style={{ opacity: step === 0 ? 0.3 : 1 }}
                        >
                            <ArrowLeft size={15} /> Back
                        </button>
                        {step < 3 && (
                            <button
                                className="btn-cyan-glow"
                                onClick={() => setStep(step + 1)}
                                disabled={!canProceed()}
                                style={{ opacity: !canProceed() ? 0.4 : 1 }}
                            >
                                Continue <ArrowRight size={15} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Standardized Biometric Verification Modal */}
            {showBiometricModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: '1.5rem'
                }}>
                    <div className="digi-card p-6" style={{ maxWidth: '420px', width: '100%', background: '#0F172A', border: '1px solid #1E293B', textAlign: 'center' }}>
                        
                        <div className="relative flex items-center justify-center overflow-hidden mx-auto mb-5" style={{ width: '300px', height: '220px', borderRadius: '12px', border: '1px solid #334155', background: '#0B0F19' }}>
                            {biometricStep > 0 && biometricStep < 4 ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        width="300"
                                        height="220"
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        width="300"
                                        height="220"
                                        className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                                    />
                                    
                                    {!faceDetected && (
                                        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 backdrop-blur-sm">
                                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38BDF8' }}>Awaiting face...</p>
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', width: '100%', height: '4px', zIndex: 50 }}>
                                        <div style={{ height: '100%', background: '#0284C7', width: `${biometricProgress}%`, transition: 'width 0.1s linear' }}></div>
                                    </div>
                                </div>
                            ) : biometricStep === 4 ? (
                                <CheckCircle2 className="w-14 h-14" style={{ color: '#10B981' }} />
                            ) : (
                                <Camera className="w-12 h-12" style={{ color: '#0284C7' }} />
                            )}
                        </div>

                        {biometricStep === 0 ? (
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#F8FAFC' }}>Biometric Operator Check</h3>
                                <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                    Before contract initiation, confirm biological operator presence via facial liveness scan.
                                </p>
                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button onClick={() => setShowBiometricModal(false)} className="btn-dark-pill" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                                    <button onClick={startBiometric} className="btn-cyan-glow" style={{ flex: 1, justifyContent: 'center' }}>Start Scan</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {biometricStep === 1 && <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38BDF8' }}>Look at the Center</h4>}
                                {biometricStep === 2 && <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38BDF8' }}>Slightly Turn Left</h4>}
                                {biometricStep === 3 && <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38BDF8' }}>Slightly Turn Right</h4>}
                                {biometricStep === 4 && <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981' }}>Biometric Verified</h4>}
                                <p style={{ color: '#94A3B8', marginTop: '0.75rem', fontSize: '0.8rem' }}>
                                    Recording biometric telemetry for multi-sig signature...
                                </p>
                                <button 
                                    onClick={() => {
                                        setBiometricStep(4);
                                        setTimeout(() => {
                                            setIsBiometricallyVerified(true);
                                            setShowBiometricModal(false);
                                            setSubmitting(true);
                                            setTimeout(() => handleSubmit(true), 500);
                                        }, 1000);
                                    }}
                                    style={{ 
                                        marginTop: '1rem', background: 'none', border: 'none', 
                                        color: '#64748B', fontSize: '0.7rem', cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Quick Pass (Testing)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sale;
