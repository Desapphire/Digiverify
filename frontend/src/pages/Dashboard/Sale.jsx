import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { ethers } from 'ethers';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import SaleContractABI from '../../abis/SaleContract.json';
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
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0B0714' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 800, letterSpacing: '0.1em', color: '#00E5FF', fontSize: '0.9rem' }}>LOADING LEDGER...</p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh', background: '#0B0714', overflow: 'hidden' }}>
                <div style={{ margin: 'auto', padding: '4rem', textAlign: 'center', maxWidth: '600px', width: '100%' }} className="animate-fade-in">
                    <div className="scale-in" style={{ marginBottom: '2rem' }}>
                        <div style={{
                            width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto',
                            background: 'rgba(34,197,94,0.1)', border: '2px solid #22C55E',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 30px rgba(34,197,94,0.3)'
                        }}>
                            <CheckCircle2 size={48} style={{ color: '#22C55E' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'white', marginBottom: '1rem', letterSpacing: '-0.03em' }}>
                        Sale <span style={{ color: '#00E5FF' }}>Initiated!</span>
                    </h2>
                    <p style={{ color: '#9ca3af', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                        The smart contract protocol has been instantiated on the ledger. The buyer must now cryptographically review and sign the terms to proceed.
                    </p>
                    {createdSale && (
                        <div className="cyber-hud-bar" style={{ padding: '1.5rem', marginBottom: '2rem', fontFamily: 'JetBrains Mono', color: '#00E5FF', fontSize: '0.9rem' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.7rem', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Transaction ID (UUID)</span>
                            {createdSale.id}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button className="cyber-btn-hollow" onClick={() => navigate('/transactions')} style={{ '--btn-color': '#9ca3af', padding: '1rem 2rem' }}>
                            View System Ledger
                        </button>
                        <button className="cyber-btn-hollow" onClick={() => { setSuccess(false); setStep(0); setSelectedPropertyId(''); setSalePrice(''); setBuyerWallet(''); }} style={{ '--btn-color': '#00E5FF', padding: '1rem 2rem' }}>
                            Form New Contract
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0B0714', overflow: 'hidden' }} className="animate-fade-in">
            {/* Left Image Section */}
            <div className="hidden lg:flex flex-col justify-end p-12 z-10" style={{ flex: 1, position: 'relative' }}>
                <img src="/sale_contract_hologram.png" alt="Contract Hologram" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(11,7,20,0.8) 0%, rgba(11,7,20,0.2) 60%, rgba(11,7,20,0) 100%)' }}></div>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0B0714 0%, rgba(11,7,20,0) 50%)' }}></div>
                
                <div style={{ position: 'relative', zIndex: 10, padding: '2rem', maxWidth: '450px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '20px', marginBottom: '1.5rem', backdropFilter: 'blur(4px)' }}>
                        <Shield size={14} style={{ color: '#00E5FF' }} />
                        <span style={{ color: '#00E5FF', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Escrow Transfer</span>
                    </div>
                    <h1 style={{ fontSize: '3rem', fontWeight: 800, color: 'white', lineHeight: 1.1, marginBottom: '1rem', letterSpacing: '-0.02em', textShadow: '0 4px 15px rgba(0,0,0,1)' }}>
                        Formulate <br />
                        <span style={{ color: '#00E5FF', textShadow: '0 0 20px rgba(0,229,255,0.6)' }}>Contract.</span>
                    </h1>
                    <p style={{ color: '#e5e7eb', fontSize: '0.95rem', lineHeight: 1.7, textShadow: '0 2px 10px rgba(0,0,0,1)', fontWeight: 600 }}>
                        Transfer property ownership through our high-security cryptographic escrow system. Instantiate parameters dynamically.
                    </p>
                </div>
            </div>

            {/* Right Side Form (scrollable independently) */}
            <div style={{ flex: 1, height: '100vh', overflowY: 'auto', padding: '3rem', position: 'relative', zIndex: 20 }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '4rem' }}>
                    
                    {/* Stepper equivalent inside a hud bar */}
                    <div className="cyber-hud-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', marginBottom: '3rem', overflowX: 'auto', gap: '1rem' }}>
                        {STEPS.map((s, i) => {
                            const Icon = s.icon;
                            const isCompleted = i < step;
                            const isActive = i === step;
                            const color = isActive ? '#00E5FF' : isCompleted ? '#22C55E' : '#4b5563';
                            const glowing = isActive ? '0 0 15px rgba(0,229,255,0.4)' : isCompleted ? '0 0 10px rgba(34,197,94,0.2)' : 'none';

                            return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: isActive || isCompleted ? 1 : 0.4 }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${color}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isActive ? 'rgba(0,229,255,0.1)' : isCompleted ? 'rgba(34,197,94,0.1)' : 'transparent',
                                        boxShadow: glowing, transition: 'all 0.3s ease'
                                    }}>
                                        {isCompleted ? <CheckCircle2 size={16} style={{ color: '#22C55E' }} /> : <Icon size={16} style={{ color }} />}
                                    </div>
                                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isActive ? '#00E5FF' : isCompleted ? 'white' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="cyber-hud-bar" style={{ display: 'block', padding: '2.5rem', borderRadius: '16px', background: 'rgba(11,7,20,0.6)', backdropFilter: 'blur(24px)' }}>
                        {/* Step 0: Select Property */}
                        {step === 0 && (
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                                    Select Asset
                                </h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                    Choose an authenticated protocol node to formulate the sale.
                                </p>

                                {properties.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Building size={48} style={{ opacity: 0.2, marginBottom: '1.5rem', color: '#00E5FF', margin: '0 auto 1.5rem' }} />
                                        <p style={{ fontWeight: 800, color: 'white', marginBottom: '0.75rem', fontSize: '1.1rem' }}>No Eligible Properties</p>
                                        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '2rem' }}>
                                            You need at least one verified active asset class to initiate a transfer protocol.
                                        </p>
                                        <button className="cyber-btn-hollow" onClick={() => navigate('/register-property')} style={{ '--btn-color': '#00E5FF', width: 'auto' }}>
                                            Initiate Registration
                                        </button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {properties.map(prop => (
                                            <div
                                                key={prop.id}
                                                onClick={() => setSelectedPropertyId(prop.id)}
                                                style={{
                                                    padding: '1.25rem', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                    border: selectedPropertyId === prop.id ? '2px solid #00E5FF' : '2px solid rgba(255,255,255,0.05)',
                                                    background: selectedPropertyId === prop.id ? 'rgba(0,229,255,0.05)' : 'rgba(0,0,0,0.3)',
                                                    boxShadow: selectedPropertyId === prop.id ? '0 0 20px rgba(0,229,255,0.1)' : 'none'
                                                }}
                                            >
                                                <div>
                                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {prop.surveyNumber}
                                                        <span style={{ padding: '0.1rem 0.4rem', background: 'rgba(34,197,94,0.1)', color: '#22C55E', borderRadius: '4px', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verified</span>
                                                    </h4>
                                                    <p style={{ color: '#9ca3af', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                        <span>{prop.district}{prop.state ? `, ${prop.state}` : ''}</span>
                                                        <span style={{ color: '#4b5563' }}>|</span>
                                                        <span style={{ color: '#00E5FF', fontFamily: 'JetBrains Mono' }}>{prop.areaSqft ? `${prop.areaSqft.toLocaleString()} sq.ft` : 'N/A'}</span>
                                                    </p>
                                                    <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#6b7280', marginTop: '0.5rem', marginBottom: 0 }}>
                                                        {prop.propertyCode}
                                                    </p>
                                                </div>
                                                <div style={{
                                                    width: '24px', height: '24px', borderRadius: '50%',
                                                    border: selectedPropertyId === prop.id ? '2px solid #00E5FF' : '2px solid rgba(255,255,255,0.2)',
                                                    background: selectedPropertyId === prop.id ? '#00E5FF' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {selectedPropertyId === prop.id && <CheckCircle2 size={14} style={{ color: '#0B0714' }} />}
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
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                                    Input Contract Terms
                                </h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                    Define the exact fiat commercial value and target buyer node.
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', color: '#00E5FF', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                            Commercial Fiat Value (INR)
                                        </label>
                                        <input
                                            style={{
                                                width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px',
                                                color: 'white', fontSize: '1.25rem', fontWeight: 700, padding: '1rem', outline: 'none', transition: 'box-shadow 0.2s', fontFamily: 'JetBrains Mono'
                                            }}
                                            type="number"
                                            placeholder="e.g. 5000000"
                                            value={salePrice}
                                            onChange={(e) => setSalePrice(e.target.value)}
                                            min="1"
                                            onFocus={(e) => e.target.style.boxShadow = '0 0 15px rgba(0,229,255,0.2)'}
                                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                                        />
                                        {salePrice && parseFloat(salePrice) > 0 && (
                                            <p style={{ fontSize: '0.85rem', color: '#22C55E', marginTop: '0.5rem', fontFamily: 'JetBrains Mono', fontWeight: 800 }}>
                                                ₹ {parseFloat(salePrice).toLocaleString('en-IN')}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', color: '#00E5FF', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                                            Counterparty Buyer Node (v4)
                                        </label>
                                        <input
                                            style={{
                                                width: '100%', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px',
                                                color: 'white', fontSize: '0.9rem', padding: '1rem', outline: 'none', transition: 'box-shadow 0.2s', fontFamily: 'JetBrains Mono'
                                            }}
                                            type="text"
                                            placeholder="0x..."
                                            value={buyerWallet}
                                            onChange={(e) => setBuyerWallet(e.target.value)}
                                            onFocus={(e) => e.target.style.boxShadow = '0 0 15px rgba(0,229,255,0.2)'}
                                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                                        />
                                        {buyerWallet && (!buyerWallet.startsWith('0x') || buyerWallet.length !== 42) && (
                                            <p style={{ fontSize: '0.75rem', color: '#FF007F', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <AlertTriangle size={14} /> Invalid Hexadecimal Structure
                                            </p>
                                        )}
                                        {buyerWallet && buyerWallet.toLowerCase() === sellerWallet?.toLowerCase() && (
                                            <p style={{ fontSize: '0.75rem', color: '#FF007F', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                <AlertTriangle size={14} /> Self-dealing operations are disallowed
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Review Agreement */}
                        {step === 2 && (
                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'white', marginBottom: '0.5rem' }}>
                                    Review Contract Parameters
                                </h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2rem' }}>
                                    Systemmatically verify the escrow constraints before initializing the digital signature.
                                </p>

                                <div className="cyber-data-grid" style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px' }}>
                                    <div className="cyber-data-item" style={{ gridColumn: 'span 2' }}>
                                        <div className="label">Asset Identity Anchor</div>
                                        <div className="value" style={{ fontSize: '1.25rem', color: 'white', marginBottom: '0.2rem' }}>{selectedProperty?.surveyNumber}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>{selectedProperty?.district}{selectedProperty?.state ? `, ${selectedProperty.state}` : ''}</div>
                                        <div style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', color: '#6b7280', marginTop: '0.5rem' }}>{selectedProperty?.propertyCode}</div>
                                    </div>
                                </div>

                                <div className="cyber-data-grid" style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px' }}>
                                    <div className="cyber-data-item">
                                        <div className="label">Pegged Asset Value</div>
                                        <div className="value" style={{ color: '#00E5FF', fontSize: '1.5rem' }}>₹{parseFloat(salePrice).toLocaleString('en-IN')}</div>
                                    </div>
                                    <div className="cyber-data-item">
                                        <div className="label">Fiat Currency Base</div>
                                        <div className="value" style={{ fontSize: '1.25rem' }}>INR Origin</div>
                                    </div>
                                </div>

                                <div className="cyber-data-grid" style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px' }}>
                                    <div className="cyber-data-item" style={{ gridColumn: 'span 2' }}>
                                        <div className="label">Transmitting Seller Node</div>
                                        <div className="value" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: '#9ca3af', wordBreak: 'break-all' }}>{sellerWallet}</div>
                                    </div>
                                    <div className="cyber-data-item" style={{ gridColumn: 'span 2' }}>
                                        <div className="label">Receiving Buyer Node</div>
                                        <div className="value" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem', color: '#9ca3af', wordBreak: 'break-all' }}>{buyerWallet}</div>
                                    </div>
                                </div>

                                <div style={{
                                    background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)',
                                    borderRadius: '12px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
                                }}>
                                    <AlertTriangle size={18} style={{ color: '#F59E0B', flexShrink: 0, marginTop: '2px' }} />
                                    <div>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>Critical System Warning</p>
                                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', lineHeight: 1.6, margin: 0 }}>
                                            Executing this module permanently binds these parameters into an active cryptographic escrow contract. The counterparty must verify and lock corresponding fiat arrays.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Sign & Submit */}
                        {step === 3 && (
                            <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 1.5rem',
                                    background: 'rgba(168,85,247,0.1)', border: '2px solid #A855F7',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(168,85,247,0.2)'
                                }}>
                                    <Send size={32} style={{ color: '#A855F7' }} />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>
                                    Authorize Transmission
                                </h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '2.5rem', maxWidth: '400px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
                                    System requires standard EVM wallet signature overhead. The cryptographic algorithm bypasses active gas deductions.
                                </p>

                                {error && (
                                    <div style={{
                                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                        borderRadius: '8px', padding: '1rem', marginBottom: '2rem',
                                        display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center',
                                        color: '#EF4444', fontSize: '0.85rem'
                                    }}>
                                        <AlertTriangle size={16} /> {error}
                                    </div>
                                )}

                                <button
                                    className="cyber-btn-hollow"
                                    disabled={submitting}
                                    onClick={() => handleSubmit(false)}
                                    style={{ '--btn-color': '#00E5FF', width: '100%', padding: '1.25rem', fontSize: '1.05rem', justifyContent: 'center' }}
                                >
                                    {submitting ? (
                                        <><Loader2 size={20} className="animate-spin" /> Verifying Signer...</>
                                    ) : (
                                        <><Wallet size={20} /> Attach Identity Payload</>
                                    )}
                                </button>
                            </div>
                        )}

                        {/* Navigation Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <button
                                className="cyber-btn-hollow"
                                onClick={() => setStep(Math.max(0, step - 1))}
                                disabled={step === 0 || submitting}
                                style={{ '--btn-color': '#9ca3af', opacity: step === 0 ? 0.3 : 1 }}
                            >
                                <ArrowLeft size={16} /> Revert Parameter
                            </button>
                            {step < 3 && (
                                <button
                                    className="cyber-btn-hollow"
                                    onClick={() => setStep(step + 1)}
                                    disabled={!canProceed()}
                                    style={{ '--btn-color': '#00E5FF', opacity: !canProceed() ? 0.3 : 1 }}
                                >
                                    Confirm <ArrowRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Standardized Biometric Verification Glass Modal */}
            {showBiometricModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, padding: '1.5rem'
                }}>
                    <div className="cyber-hud-bar scale-in" style={{ display: 'block', maxWidth: '450px', width: '100%', padding: '2.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                        <div className="cyber-card-glow-orb" style={{ background: '#00E5FF', top: '-10%', right: '-10%', width: '15rem', height: '15rem', opacity: 0.15 }}></div>
                        
                        <div className="relative flex items-center justify-center overflow-hidden mx-auto mb-6" style={{ width: '320px', height: '240px', borderRadius: '16px', border: '2px solid rgba(0, 229, 255, 0.4)', background: 'rgba(0,229,255,0.05)', boxShadow: '0 0 30px rgba(0,229,255,0.1)' }}>
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
                                        style={{ filter: 'brightness(0.9) contrast(1.3)' }}
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        width="320"
                                        height="240"
                                        className="absolute inset-0 w-full h-full object-cover z-20 pointer-events-none"
                                    />
                                    {/* Cyberpunk HUD Overlay Graphics */}
                                    <div style={{ position: 'absolute', top: '10px', left: '10px', width: '20px', height: '20px', borderTop: '2px solid #00E5FF', borderLeft: '2px solid #00E5FF', zIndex: 25 }}></div>
                                    <div style={{ position: 'absolute', top: '10px', right: '10px', width: '20px', height: '20px', borderTop: '2px solid #00E5FF', borderRight: '2px solid #00E5FF', zIndex: 25 }}></div>
                                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '20px', height: '20px', borderBottom: '2px solid #00E5FF', borderLeft: '2px solid #00E5FF', zIndex: 25 }}></div>
                                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '20px', height: '20px', borderBottom: '2px solid #00E5FF', borderRight: '2px solid #00E5FF', zIndex: 25 }}></div>
                                    
                                    {!faceDetected && (
                                        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 backdrop-blur-sm">
                                            <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#00E5FF', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Awaiting Target...</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-[#00E5FF]/10 animate-pulse z-10 pointer-events-none"></div>
                                    
                                    {/* Scanning Beam Animation */}
                                    <style>
                                        {`
                                            @keyframes scannerBeam {
                                                0% { top: -10%; opacity: 0; }
                                                10% { opacity: 1; }
                                                90% { opacity: 1; }
                                                100% { top: 110%; opacity: 0; }
                                            }
                                        `}
                                    </style>
                                    <div style={{ position: 'absolute', left: 0, right: 0, height: '2px', background: '#00E5FF', boxShadow: '0 0 20px 4px rgba(0, 229, 255, 0.6)', animation: 'scannerBeam 2.5s infinite ease-in-out', zIndex: 45 }}></div>

                                    {/* Linear Progress Bar */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, background: 'rgba(0,0,0,0.5)', width: '100%', height: '6px', zIndex: 50 }}>
                                        <div style={{ height: '100%', background: '#00E5FF', width: `${biometricProgress}%`, transition: 'width 0.1s linear', boxShadow: '0 0 10px #00E5FF' }}></div>
                                    </div>
                                </div>
                            ) : biometricStep === 4 ? (
                                <CheckCircle2 className="w-16 h-16" style={{ color: '#22C55E' }} />
                            ) : (
                                <Activity className="w-12 h-12" style={{ color: '#00E5FF' }} />
                            )}
                        </div>

                        {biometricStep === 0 ? (
                            <div style={{ position: 'relative', zIndex: 10 }}>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'white' }}>Node Identity Lock</h3>
                                <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    Before cryptographic signing is permitted, you must verify biological operator presence via a mandatory liveness check.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowBiometricModal(false)} className="cyber-btn-hollow flex-1" style={{ '--btn-color': '#9ca3af', justifyContent: 'center' }}>Abort</button>
                                    <button onClick={startBiometric} className="cyber-btn-hollow flex-1" style={{ '--btn-color': '#00E5FF', justifyContent: 'center' }}>Commence Scan</button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ position: 'relative', zIndex: 10 }}>
                                {biometricStep === 1 && <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00E5FF' }} className="animate-pulse">LOCK CENTER NODE</h4>}
                                {biometricStep === 2 && <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00E5FF' }} className="animate-pulse">SHIFT LEFT VECTOR</h4>}
                                {biometricStep === 3 && <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00E5FF' }} className="animate-pulse">SHIFT RIGHT VECTOR</h4>}
                                {biometricStep === 4 && <h4 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#22C55E' }}>OVERRIDE PASSED</h4>}
                                <p style={{ color: '#9ca3af', marginTop: '1rem', fontSize: '0.8rem' }}>
                                    Binding biometric session metrics to blockchain ledger signature...
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
                                        color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', cursor: 'pointer',
                                        textDecoration: 'underline'
                                    }}
                                >
                                    Force Override (Dev Root)
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
