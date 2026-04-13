import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import {
    Loader2, CheckCircle2, AlertTriangle, Wallet, DollarSign,
    Building, MapPin, ArrowRight, ChevronLeft, XCircle, Shield, Clock,
    FileCheck, Landmark, Send, Camera, User as UserIcon, ExternalLink, Activity
} from 'lucide-react';
import './PropertyPages.css';

const SALE_STATUS_FLOW = ['initiated', 'buyer_signed', 'funds_blocked', 'authority_approved', 'completed'];

const PurchaseReview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account, connectWallet, signMessage } = useWeb3();

    const [sale, setSale] = useState(null);
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [error, setError] = useState('');
    const [signSuccess, setSignSuccess] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [completeSuccess, setCompleteSuccess] = useState(false);

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

    const walletAddress = account || user?.walletAddress;
    const isBuyer = walletAddress && sale?.buyerWallet?.toLowerCase() === walletAddress?.toLowerCase();
    const isSeller = walletAddress && sale?.sellerWallet?.toLowerCase() === walletAddress?.toLowerCase();

    useEffect(() => {
        const fetchSale = async () => {
            try {
                setLoading(true);
                const saleRes = await saleService.getSaleById(id);
                const saleData = saleRes.data?.data;
                setSale(saleData);

                if (saleData?.propertyId) {
                    try {
                        const propRes = await propertyService.getPropertyById(saleData.propertyId);
                        setProperty(propRes.data?.data);
                    } catch (e) {
                        console.error('Failed to load property', e);
                    }
                }
            } catch (err) {
                console.error('Failed to load sale', err);
                setError('Sale transaction not found.');
            } finally {
                setLoading(false);
            }
        };
        fetchSale();
    }, [id]);

    const handleSign = async (forcedBiometric = false) => {
        try {
            setSigning(true);
            setError('');

            let wallet = account;
            if (!wallet) {
                wallet = await connectWallet();
            }

            // CHECK: Biometric verification required before signing
            if (!isBiometricallyVerified && !forcedBiometric) {
                setShowBiometricModal(true);
                setSigning(false);
                return;
            }

            const message = `I confirm and sign sale transaction #${sale.id} for property ${property?.surveyNumber || sale.propertyId} at ₹${sale.salePrice?.toLocaleString('en-IN')}`;

            const signature = await signMessage(message);

            await saleService.signSale(sale.id, signature);
            setSignSuccess(true);

            // Refresh sale data
            const updated = await saleService.getSaleById(id);
            setSale(updated.data?.data);
        } catch (err) {
            console.error('Signing failed', err);
            setError(err.response?.data?.message || err.message || 'Failed to sign transaction.');
        } finally {
            setSigning(false);
        }
    };

    const handleComplete = async () => {
        try {
            setCompleting(true);
            setError('');
            await saleService.completeSale(sale.id);
            setCompleteSuccess(true);
            
            // Refresh sale data
            const updated = await saleService.getSaleById(id);
            setSale(updated.data?.data);
            
            // Redirect after success
            setTimeout(() => navigate('/transactions'), 3000);
        } catch (err) {
            console.error('Completion failed', err);
            setError(err.response?.data?.message || 'Failed to complete transaction.');
        } finally {
            setCompleting(false);
        }
    };

    const shortenWallet = (addr) => {
        if (!addr) return '—';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
            if (!response.ok) throw new Error('Failed to fetch cascade');
            const buffer = await response.arrayBuffer();
            const data = new Uint8Array(buffer);
            try {
                cv.FS_createDataFile('/', 'haarcascade_purchase.xml', data, true, false, false);
            } catch (fsErr) {
                console.warn("Cascade file might already exist:", fsErr);
            }
        } catch (err) {
            console.error("Biometric setup error:", err);
        }

        const classifier = new cv.CascadeClassifier();
        try {
            classifier.load('haarcascade_purchase.xml');
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
                        ctx.strokeStyle = '#38BDF8';
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
                    // Re-trigger sign after verification, passing true to bypass state closure check
                    setSigning(true);
                    setTimeout(() => handleSign(true), 500);
                }, 1500); // Slightly longer delay to show "PASSED"
            }
        }, 2000);
    };

    const currentFlowIndex = SALE_STATUS_FLOW.indexOf(sale?.status);

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100%', width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={32} style={{ color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 800, letterSpacing: '0.1em', color: '#00E5FF', fontSize: '0.9rem' }}>FRACTALIZING SALE LOGS...</p>
                </div>
            </div>
        );
    }

    if (error && !sale) {
        return (
            <div className="property-container container-sm mt-8 animate-fade-in" style={{ paddingBottom: '4rem' }}>
                <div className="cyber-hud-bar" style={{ display: 'block', padding: '4rem', textAlign: 'center' }}>
                    <XCircle size={48} style={{ color: '#FF007F', marginBottom: '1.5rem', margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white', marginBottom: '1rem' }}>Transaction Not Found</h2>
                    <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>{error}</p>
                    <button className="cyber-btn-hollow" onClick={() => navigate('/transactions')} style={{ '--btn-color': '#00E5FF', width: 'auto' }}>
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-lg animate-fade-in" style={{ paddingBottom: '6rem' }}>
            {/* Header */}
            <button 
                onClick={() => navigate('/transactions')} 
                style={{ background: 'none', border: 'none', color: '#00E5FF', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.85rem', padding: 0 }}
            >
                <ChevronLeft size={16} /> RETURN TO LEDGER
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{
                        width: '3.5rem', height: '3.5rem', borderRadius: '12px',
                        background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(56,189,248,0.2)'
                    }}>
                        <FileCheck size={24} style={{ color: '#38BDF8' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            Sale Review
                            <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '0.2rem 0.6rem', borderRadius: '6px', color: '#9ca3af', fontFamily: 'JetBrains Mono' }}>
                                TX-{(sale.id).toString().slice(0, 8).toUpperCase()}
                            </span>
                        </h2>
                        <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.3rem', margin: 0 }}>
                            Digitally inspect and confirm the property transfer parameters.
                        </p>
                    </div>
                </div>
                <div className="cyber-badge" style={{ '--badge-color': isBuyer ? '#38BDF8' : '#F59E0B', '--badge-bg': isBuyer ? 'rgba(56,189,248,0.1)' : 'rgba(245,158,11,0.1)', textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    {isBuyer ? 'BUYER CLEARANCE' : isSeller ? 'SELLER CLEARANCE' : 'READ-ONLY VIEW'}
                </div>
            </div>

            {/* Stepper equivalent inside a hud bar */}
            <div className="cyber-hud-bar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', marginBottom: '2rem', overflowX: 'auto', gap: '2rem' }}>
                {SALE_STATUS_FLOW.map((status, i) => {
                    const isCompleted = i < currentFlowIndex;
                    const isActive = i === currentFlowIndex;
                    const icons = [Clock, Wallet, Landmark, Shield, CheckCircle2];
                    const labels = ['Initiated', 'Buyer Signed', 'Funds Blocked', 'Auth Approved', 'Completed'];
                    const Icon = icons[i];
                    
                    const color = isActive ? '#00E5FF' : isCompleted ? '#22C55E' : '#4b5563';
                    const glowing = isActive ? '0 0 15px rgba(0,229,255,0.4)' : isCompleted ? '0 0 10px rgba(34,197,94,0.2)' : 'none';

                    return (
                        <div key={status} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', opacity: isActive || isCompleted ? 1 : 0.4 }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', border: `2px solid ${color}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: isActive ? 'rgba(0,229,255,0.1)' : isCompleted ? 'rgba(34,197,94,0.1)' : 'transparent',
                                boxShadow: glowing, transition: 'all 0.3s ease'
                            }}>
                                {isCompleted ? <CheckCircle2 size={16} style={{ color: '#22C55E' }} /> : <Icon size={16} style={{ color }} />}
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isActive ? '#00E5FF' : isCompleted ? 'white' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                                {labels[i]}
                            </span>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column (Main Data) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Primary Agreement Details */}
                    <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                        <div className="cyber-card-glow-orb" style={{ background: '#38BDF8', width: '15rem', height: '15rem', left: '-5%', top: '-20%', opacity: 0.1 }}></div>
                        
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#38BDF8', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileCheck size={16} /> Commercial Agreement Matrix
                        </h3>
                        
                        <div className="cyber-data-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="cyber-data-item">
                                <div className="label">Sale Value</div>
                                <div className="value" style={{ color: '#00E5FF', fontSize: '1.5rem' }}>₹{sale.salePrice?.toLocaleString('en-IN')}</div>
                            </div>
                            <div className="cyber-data-item">
                                <div className="label">System Status</div>
                                <div className="value" style={{ textTransform: 'uppercase' }}>{sale.status?.replace('_', ' ')}</div>
                            </div>
                            <div className="cyber-data-item">
                                <div className="label">Initiated Time (Block)</div>
                                <div className="value" style={{ fontSize: '0.8rem' }}>{formatDate(sale.createdAt)}</div>
                            </div>
                        </div>

                        <div className="cyber-data-grid" style={{ background: 'rgba(0,0,0,0.4)', border: 'none' }}>
                            <div className="cyber-data-item" style={{ gridColumn: 'span 1' }}>
                                <div className="label">Seller Node</div>
                                <div className="value" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                    {sale.sellerWallet}
                                </div>
                                {isSeller && <span style={{ fontSize: '0.65rem', background: '#F59E0B', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800, alignSelf: 'flex-start', marginTop: '0.5rem' }}>YOU</span>}
                            </div>
                            <div className="cyber-data-item" style={{ gridColumn: 'span 1' }}>
                                <div className="label">Buyer Node</div>
                                <div className="value" style={{ fontFamily: 'JetBrains Mono', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                                    {sale.buyerWallet}
                                </div>
                                {isBuyer && <span style={{ fontSize: '0.65rem', background: '#38BDF8', color: 'black', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800, alignSelf: 'flex-start', marginTop: '0.5rem' }}>YOU</span>}
                            </div>
                        </div>
                    </div>

                    {/* Property Extracted Data */}
                    <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A855F7', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Building size={16} /> Assigned Real Estate Asset
                        </h3>
                        {property ? (
                            <div className="cyber-data-grid">
                                <div className="cyber-data-item" style={{ gridColumn: 'span 2' }}>
                                    <div className="label">Survey Anchor</div>
                                    <div className="value" style={{ fontSize: '1.25rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {property.surveyNumber}
                                        {(property.status === 'active' || property.status === 'verified') && <CheckCircle2 size={16} style={{ color: '#22C55E' }} />}
                                    </div>
                                </div>
                                <div className="cyber-data-item">
                                    <div className="label">Regional Sector</div>
                                    <div className="value" style={{ fontSize: '0.9rem' }}>
                                        {property.district}{property.state ? `, ${property.state}` : ''}
                                    </div>
                                </div>
                                <div className="cyber-data-item">
                                    <div className="label">Area Boundary</div>
                                    <div className="value" style={{ fontSize: '0.9rem', fontFamily: 'JetBrains Mono', color: '#00E5FF' }}>
                                        {property.areaSqft ? `${property.areaSqft.toLocaleString()} sq.ft` : 'N/A'}
                                    </div>
                                </div>
                                <div className="cyber-data-item" style={{ gridColumn: 'span 2' }}>
                                    <div className="label">Global Property Hash</div>
                                    <div className="value" style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', wordBreak: 'break-all', color: '#9ca3af' }}>
                                        {property.propertyCode}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="cyber-data-item">
                                <div className="label">Global Property Hash</div>
                                <div className="value" style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', wordBreak: 'break-all', color: '#9ca3af' }}>
                                    {sale.propertyId}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* On-Chain Signatures & Verification */}
                    <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#22C55E', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Shield size={16} /> Cryptographic Verifications
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            {[
                                { label: 'Seller Encrypted Signature', signed: sale.sellerSigned },
                                { label: 'Buyer Encrypted Signature', signed: sale.buyerSigned },
                                { label: 'Authority Execution Sign', signed: sale.authoritySigned },
                                { label: 'Automated Fund Lock', signed: sale.fundsBlocked },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', borderLeft: item.signed ? '3px solid #22C55E' : '3px solid #4b5563' }}>
                                    <span style={{ fontSize: '0.85rem', color: item.signed ? 'white' : '#9ca3af', fontWeight: 600 }}>{item.label}</span>
                                    {item.signed ? (
                                        <CheckCircle2 size={18} style={{ color: '#22C55E' }} />
                                    ) : (
                                        <span style={{ fontSize: '0.7rem', color: '#4b5563', textTransform: 'uppercase', fontWeight: 800 }}>Awaiting</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="cyber-data-grid" style={{ gap: '1rem' }}>
                            {sale.txHash && (
                                <div className="cyber-data-item" style={{ gridColumn: '1 / -1' }}>
                                    <div className="label">Master Transaction Hash</div>
                                    <a 
                                        href={`https://testnet.snowtrace.io/tx/${sale.txHash}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', wordBreak: 'break-all', color: '#00E5FF', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none' }}
                                    >
                                        {sale.txHash} <ExternalLink size={12} />
                                    </a>
                                </div>
                            )}
                            {sale.approvals && sale.approvals.length > 0 && (
                                <div className="cyber-data-item" style={{ gridColumn: '1 / -1' }}>
                                    <div className="label" style={{ marginBottom: '0.5rem' }}>Signature Logs</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {sale.approvals.map((app, i) => (
                                            <div key={i} style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#38BDF8' }}>{app.signer_role}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'JetBrains Mono' }}>{shortenWallet(app.signer_wallet)}</span>
                                                </div>
                                                <p style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono', wordBreak: 'break-all', color: '#6b7280', margin: 0 }}>
                                                    {app.signature_hash}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Right Column (Actions) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '2rem' }}>
                    
                    {isBuyer && sale.status === 'initiated' && !signSuccess && (
                        <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem', textAlign: 'center', background: 'linear-gradient(180deg, rgba(139,92,246,0.1) 0%, rgba(11,7,20,0.9) 100%)', border: '1px solid rgba(139,92,246,0.3)' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1.5rem',
                                background: 'rgba(139,92,246,0.1)', border: '2px solid #8B5CF6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(139,92,246,0.4)'
                            }}>
                                <Send size={24} style={{ color: '#A855F7' }} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>Authorize Protocol</h3>
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                You are reviewing a binding digital smart contract. Sign via your cryptographic wallet to lock parameters.
                            </p>

                            {error && (
                                <div style={{
                                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                    borderRadius: '8px', padding: '0.75rem', marginBottom: '1.5rem',
                                    fontSize: '0.8rem', color: '#EF4444', display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center'
                                }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                className="cyber-btn-hollow"
                                disabled={signing}
                                onClick={() => handleSign(false)}
                                style={{ '--btn-color': '#00E5FF', width: '100%', padding: '1rem', fontSize: '0.9rem', justifyContent: 'center' }}
                            >
                                {signing ? (
                                    <><Loader2 size={18} className="animate-spin" /> Verifying Signature...</>
                                ) : (
                                    <><Wallet size={18} /> Sign with Wallet Interface</>
                                )}
                            </button>
                        </div>
                    )}

                    {signSuccess && (
                        <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem', textAlign: 'center', border: '1px solid rgba(34,197,94,0.3)' }}>
                            <div className="scale-in" style={{ marginBottom: '1.5rem' }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto',
                                    background: 'rgba(34,197,94,0.1)', border: '2px solid #22C55E',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 20px rgba(34,197,94,0.4)'
                                }}>
                                    <CheckCircle2 size={28} style={{ color: '#22C55E' }} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22C55E', marginBottom: '0.75rem' }}>
                                Contract Signed
                            </h3>
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
                                The smart contract has accepted your signature. The next step is securely blocking fiat funds via ASBA.
                            </p>
                            <button
                                className="cyber-btn-hollow"
                                onClick={() => navigate(`/sale/${sale.id}/fund-block`)}
                                style={{ '--btn-color': '#A855F7', width: '100%', padding: '1rem', fontSize: '0.9rem', justifyContent: 'center' }}
                            >
                                <Landmark size={18} /> Advance to Fund Reserve <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {isBuyer && sale.status === 'buyer_signed' && !signSuccess && (
                        <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem', textAlign: 'center', border: '1px solid rgba(168,85,247,0.3)' }}>
                            <Landmark size={32} style={{ color: '#A855F7', margin: '0 auto 1.25rem' }} />
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>Fiat Reserve Stage</h3>
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                Cryptographic confirmation successful. You must now invoke ASBA APIs to block equivalent fiat currency at your bank branch.
                            </p>
                            <button
                                className="cyber-btn-hollow"
                                onClick={() => navigate(`/sale/${sale.id}/fund-block`)}
                                style={{ '--btn-color': '#A855F7', width: '100%', padding: '1rem', fontSize: '0.9rem', justifyContent: 'center' }}
                            >
                                <Landmark size={18} /> Execute ASCB Block <ArrowRight size={18} />
                            </button>
                        </div>
                    )}

                    {sale.status === 'authority_approved' && (
                        <div className="cyber-hud-bar" style={{ display: 'block', padding: '2rem', textAlign: 'center', border: '1px solid rgba(34,197,94,0.3)', background: 'linear-gradient(180deg, rgba(34,197,94,0.1) 0%, rgba(11,7,20,0.9) 100%)' }}>
                            <div style={{
                                width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1.5rem',
                                background: 'rgba(34,197,94,0.1)', border: '2px solid #22C55E',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 0 20px rgba(34,197,94,0.4)'
                            }}>
                                <CheckCircle2 size={24} style={{ color: '#22C55E' }} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem' }}>Final Transfer Ready</h3>
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                Regulatory authority has executed sign-off. {isBuyer ? 'Finalize the transaction to re-mint the master deed NFT under your wallet address.' : 'The buyer can now claim full physical and cryptographic ownership.'}
                            </p>
                            {isBuyer && !completeSuccess && (
                                <button
                                    className="cyber-btn-hollow"
                                    disabled={completing}
                                    onClick={handleComplete}
                                    style={{ '--btn-color': '#22C55E', width: '100%', padding: '1rem', fontSize: '0.9rem', justifyContent: 'center' }}
                                >
                                    {completing ? (
                                        <><Loader2 size={18} className="animate-spin" /> Transmitting...</>
                                    ) : (
                                        <><Shield size={18} /> Issue Finalize Command</>
                                    )}
                                </button>
                            )}
                            {completeSuccess && (
                                <div style={{ fontSize: '0.9rem', color: '#22C55E', fontWeight: 800, background: 'rgba(34,197,94,0.1)', padding: '1rem', borderRadius: '8px' }}>
                                    Ownership Successfully Transferred via Smart Contract!
                                </div>
                            )}
                        </div>
                    )}

                    {sale.fundBlocks && sale.fundBlocks.length > 0 && (
                        <div className="cyber-hud-bar" style={{ display: 'block', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A855F7', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Landmark size={14} /> Fiat Holding Log
                            </h3>
                            {sale.fundBlocks.map((fb, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Blocked Value</p>
                                            <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'white', margin: 0 }}>₹{fb.blockAmount?.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>State</p>
                                            <span style={{ fontSize: '0.65rem', background: fb.status === 'blocked' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: fb.status === 'blocked' ? '#22C55E' : '#F59E0B', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 800 }}>
                                                {fb.status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    {fb.bankReferenceId && (
                                        <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                            <p style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Bank Origin Ref</p>
                                            <p style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono', color: '#00E5FF', margin: 0, wordBreak: 'break-all' }}>{fb.bankReferenceId}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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
                                            setSigning(true);
                                            setTimeout(() => handleSign(true), 500);
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

export default PurchaseReview;
