import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import {
    Loader2, CheckCircle2, AlertTriangle, Wallet, DollarSign,
    Building, MapPin, ArrowRight, XCircle, Shield, Clock,
    FileCheck, Landmark, Send, Camera, User as UserIcon, ExternalLink
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
        const response = await fetch('/haarcascade_frontalface_default.xml');
        const buffer = await response.arrayBuffer();
        const data = new Uint8Array(buffer);
        cv.FS_createDataFile('/', 'haarcascade_purchase.xml', data, true, false, false);

        const classifier = new cv.CascadeClassifier();
        classifier.load('haarcascade_purchase.xml');

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
            <div className="dashboard-container" style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse-glow">
                    <Loader2 style={{ width: '3rem', height: '3rem', color: 'hsl(255,85%,65%)' }} className="animate-spin" />
                    <p className="text-muted" style={{ fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>Loading Transaction...</p>
                </div>
            </div>
        );
    }

    if (error && !sale) {
        return (
            <div className="dashboard-container container-sm">
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                    <XCircle size={48} style={{ color: 'hsl(var(--color-danger))', marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Transaction Not Found</h2>
                    <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{error}</p>
                    <button className="btn btn-primary" onClick={() => navigate('/transactions')}>Back to Transactions</button>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container container-md">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                        Sale <span className="text-gradient">Review</span>
                    </h1>
                    <span className="badge badge-neutral" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                        TX #{sale.id}
                    </span>
                    <span className={`badge ${isBuyer ? 'badge-info' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>
                        {isBuyer ? 'BUYER' : isSeller ? 'SELLER' : 'VIEWER'}
                    </span>
                </div>
                <p className="text-muted" style={{ fontSize: '0.95rem' }}>
                    Review the sale agreement and transaction details
                </p>
            </div>

            {/* Status Flow */}
            <div className="stepper" style={{ marginBottom: '2rem' }}>
                {SALE_STATUS_FLOW.map((status, i) => {
                    const isCompleted = i < currentFlowIndex;
                    const isActive = i === currentFlowIndex;
                    const icons = [Clock, Wallet, Landmark, Shield, CheckCircle2];
                    const labels = ['Initiated', 'Buyer Signed', 'Funds Blocked', 'Authority Approved', 'Completed'];
                    const Icon = icons[i];
                    return (
                        <div key={status} className={`stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                            <div className="stepper-circle">
                                {isCompleted ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                            </div>
                            <span className="stepper-label">{labels[i]}</span>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Property Details */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Building size={13} /> Property Details
                        </h3>
                        {property ? (
                            <div>
                                <h4 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    {property.surveyNumber}
                                    {(property.status === 'active' || property.status === 'verified') && <CheckCircle2 size={14} style={{ color: 'hsl(142,71%,45%)' }} />}
                                </h4>
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                                    <p className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <MapPin size={13} /> {property.district}{property.state ? `, ${property.state}` : ''}
                                    </p>
                                    {property.areaSqft && (
                                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--color-text-secondary))', fontFamily: 'monospace' }}>
                                            {property.areaSqft.toLocaleString()} sq.ft
                                        </p>
                                    )}
                                </div>
                                <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'hsl(220,15%,50%)' }}>
                                    Property Code: {property.propertyCode}
                                </p>
                            </div>
                        ) : (
                            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                                Property ID: {sale.propertyId}
                            </p>
                        )}
                    </div>

                    {/* Sale Agreement */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <FileCheck size={13} /> Sale Agreement
                        </h3>

                        <div className="info-box-grid" style={{ marginBottom: '1.25rem' }}>
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Sale Price</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: 800 }} className="text-gradient">
                                    ₹{sale.salePrice?.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Status</p>
                                <p style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'capitalize' }}>{sale.status?.replace('_', ' ')}</p>
                            </div>
                        </div>

                        <div className="info-box-grid">
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Seller</p>
                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(var(--color-text-secondary))' }}>
                                    {sale.sellerWallet}
                                </p>
                                {isSeller && <span className="badge badge-warning" style={{ fontSize: '0.55rem', marginTop: '0.35rem' }}>YOU</span>}
                            </div>
                            <div className="info-box" style={{ padding: '1rem' }}>
                                <p style={{ fontSize: '0.65rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>Buyer</p>
                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(var(--color-text-secondary))' }}>
                                    {sale.buyerWallet}
                                </p>
                                {isBuyer && <span className="badge badge-info" style={{ fontSize: '0.55rem', marginTop: '0.35rem' }}>YOU</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column — Actions & Timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Sign Action (Buyer only, if initiated status) */}
                    {isBuyer && sale.status === 'initiated' && !signSuccess && (
                        <div className="glass-panel-elevated" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 1rem',
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.1))',
                                border: '2px solid rgba(139,92,246,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Send size={22} style={{ color: 'hsl(255,85%,65%)' }} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Sign Transaction</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                                Review the agreement above. Sign with your wallet to confirm acceptance.
                            </p>

                            {error && (
                                <div style={{
                                    background: 'rgba(225,29,72,0.1)', border: '1px solid rgba(225,29,72,0.2)',
                                    borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem',
                                    fontSize: '0.8rem', color: 'hsl(var(--color-danger))',
                                    display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center'
                                }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                className="btn btn-primary btn-glow w-full"
                                disabled={signing}
                                onClick={handleSign}
                                style={{ padding: '0.75rem', fontSize: '0.9rem' }}
                            >
                                {signing ? (
                                    <><Loader2 size={16} className="animate-spin" /> Signing...</>
                                ) : (
                                    <><Wallet size={16} /> Sign with Wallet</>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Sign Success */}
                    {signSuccess && (
                        <div className="glass-panel-elevated" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <div className="scale-in" style={{ marginBottom: '1rem' }}>
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto',
                                    background: 'rgba(34,197,94,0.1)', border: '2px solid hsl(142,71%,45%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <CheckCircle2 size={24} style={{ color: 'hsl(142,71%,45%)' }} />
                                </div>
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'hsl(142,71%,45%)' }}>
                                Transaction Signed!
                            </h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                Proceed to block funds for this purchase.
                            </p>
                            <button
                                className="btn btn-primary btn-glow w-full"
                                onClick={() => navigate(`/sale/${sale.id}/fund-block`)}
                                style={{ padding: '0.75rem', fontSize: '0.9rem' }}
                            >
                                <Landmark size={16} /> Proceed to Fund Blocking <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Fund Blocking CTA (buyer, buyer_signed status) */}
                    {isBuyer && sale.status === 'buyer_signed' && !signSuccess && (
                        <div className="glass-panel-elevated" style={{ padding: '1.5rem', textAlign: 'center' }}>
                            <Landmark size={28} style={{ color: 'hsl(255,85%,65%)', marginBottom: '0.75rem' }} />
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Fund Blocking Required</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                You've signed. Block funds via ASBA to proceed with the sale.
                            </p>
                            <button
                                className="btn btn-primary btn-glow w-full"
                                onClick={() => navigate(`/sale/${sale.id}/fund-block`)}
                                style={{ padding: '0.75rem', fontSize: '0.9rem' }}
                            >
                                <Landmark size={16} /> Block Funds <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Finalize Sale CTA (buyer/seller, authority_approved status) */}
                    {sale.status === 'authority_approved' && (
                        <div className="glass-panel-elevated" style={{ padding: '1.5rem', textAlign: 'center', border: '2px solid hsla(142,71%,45%,0.3)' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 1rem',
                                background: 'rgba(34,197,94,0.1)', border: '2px solid hsl(142,71%,45%)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <CheckCircle2 size={24} style={{ color: 'hsl(142,71%,45%)' }} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Ready to Finalize</h3>
                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                                The authority has approved this sale. {isBuyer ? 'Finalize to complete ownership transfer.' : 'The buyer can now finalize the transfer.'}
                            </p>
                            {isBuyer && !completeSuccess && (
                                <button
                                    className="btn btn-primary btn-glow w-full"
                                    disabled={completing}
                                    onClick={handleComplete}
                                    style={{ padding: '0.75rem', fontSize: '0.9rem', background: 'hsl(142,71%,45%)', borderColor: 'hsl(142,71%,45%)' }}
                                >
                                    {completing ? (
                                        <><Loader2 size={16} className="animate-spin" /> Finalizing...</>
                                    ) : (
                                        <><CheckCircle2 size={16} /> Finalize Purchase</>
                                    )}
                                </button>
                            )}
                            {completeSuccess && (
                                <div className="text-success" style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                    Ownership Transferred Successfully!
                                </div>
                            )}
                        </div>
                    )}

                    {/* Signatures Status */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem' }}>
                            Signature Status
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { label: 'Seller Signed', signed: sale.sellerSigned },
                                { label: 'Buyer Signed', signed: sale.buyerSigned },
                                { label: 'Authority Approved', signed: sale.authoritySigned },
                                { label: 'Funds Blocked', signed: sale.fundsBlocked },
                            ].map((item, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'hsl(var(--color-text-secondary))' }}>{item.label}</span>
                                    {item.signed ? (
                                        <CheckCircle2 size={18} style={{ color: 'hsl(142,71%,45%)' }} />
                                    ) : (
                                        <Clock size={18} style={{ color: 'hsl(var(--color-text-muted))' }} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem' }}>
                            Timeline
                        </h3>
                        <div className="timeline">
                            <div className="timeline-item completed">
                                <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sale Initiated</p>
                                <p className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(sale.createdAt)}</p>
                            </div>
                            {sale.updatedAt && sale.updatedAt !== sale.createdAt && (
                                <div className="timeline-item active">
                                    <p style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {sale.status?.replace('_', ' ')}
                                    </p>
                                    <p className="text-muted" style={{ fontSize: '0.75rem' }}>{formatDate(sale.updatedAt)}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Transaction Info */}
                    <div className="glass-panel" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Shield size={13} /> Blockchain & Multi-Sig
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <p style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Property NFT</p>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                                    {sale.nftTokenId ? (
                                        <a 
                                            href={`https://testnet.snowtrace.io/nft/0xE94d65289Cc088f597C077938A6D7Fc0974196fe/${sale.nftTokenId}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="explorer-link"
                                            style={{ color: 'hsl(255,85%,65%)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                        >
                                            Token #{sale.nftTokenId} <ExternalLink size={10} />
                                        </a>
                                    ) : 'No NFT Minted'}
                                </p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.15rem' }}>On-Chain Sale Index</p>
                                <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'hsl(var(--color-text-secondary))' }}>
                                    {sale.onChainId ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ fontWeight: 800, color: 'hsl(255,85%,65%)' }}>#{sale.onChainId}</span>
                                            <a
                                                href={`https://testnet.snowtrace.io/address/0xD8Ad46876774659fBD40026e7887532A6f375005#readContract`} 
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="explorer-link"
                                                style={{ color: 'hsl(220,15%,60%)', fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                                            >
                                                Verify on Contract <ExternalLink size={10} />
                                            </a>
                                        </div>
                                    ) : 'Not registered on-chain yet'}
                                </p>
                            </div>
                            {sale.txHash && (
                                <div>
                                    <p style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Initiation Tx Hash</p>
                                    <a 
                                        href={`https://testnet.snowtrace.io/tx/${sale.txHash}`}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="explorer-link"
                                        style={{ fontSize: '0.7rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'hsl(255,85%,65%)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                    >
                                        {sale.txHash} <ExternalLink size={10} />
                                    </a>
                                </div>
                            )}
                            {sale.approvals && sale.approvals.length > 0 && (
                                <div>
                                    <p style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Signatures</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {sale.approvals.map((app, i) => (
                                            <div key={i} style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{app.signer_role}</span>
                                                    <span style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))' }}>{shortenWallet(app.signer_wallet)}</span>
                                                </div>
                                                <p style={{ fontSize: '0.55rem', fontFamily: 'monospace', wordBreak: 'break-all', opacity: 0.6 }}>
                                                    {app.signature_hash}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Fund Blocking Info */}
                    {sale.fundBlocks && sale.fundBlocks.length > 0 && (
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'hsl(var(--color-text-muted))', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Landmark size={13} /> Bank Fund Blocking
                            </h3>
                            {sale.fundBlocks.map((fb, i) => (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Amount</p>
                                            <p style={{ fontSize: '0.85rem', fontWeight: 700 }}>₹{fb.blockAmount?.toLocaleString('en-IN')}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Status</p>
                                            <span className={`badge ${fb.status === 'blocked' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.55rem' }}>
                                                {fb.status?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                    {fb.bankReferenceId && (
                                        <div>
                                            <p style={{ fontSize: '0.6rem', color: 'hsl(var(--color-text-muted))', textTransform: 'uppercase', marginBottom: '0.15rem' }}>Bank Reference</p>
                                            <p style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 600 }}>{fb.bankReferenceId}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
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
                                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>Identity Confirmation</h3>
                                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                                    To review and sign this purchase agreement, please verify your identity with a quick liveness check.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowBiometricModal(false)} className="btn btn-secondary flex-1">Cancel</button>
                                    <button onClick={startBiometric} className="btn btn-primary flex-1">Verify Identity</button>
                                </div>
                            </>
                        ) : (
                            <div>
                                {biometricStep === 1 && <h4 className="text-xl font-black text-blue-400 animate-pulse">CENTER FACE</h4>}
                                {biometricStep === 2 && <h4 className="text-xl font-black text-blue-400 animate-pulse">TILT LEFT</h4>}
                                {biometricStep === 3 && <h4 className="text-xl font-black text-blue-400 animate-pulse">TILT RIGHT</h4>}
                                {biometricStep === 4 && <h4 className="text-xl font-black text-green-400">PASSED</h4>}
                                <p className="text-muted mt-4" style={{ fontSize: '0.8rem' }}>
                                    Verifying session liveness and binding identity to purchase signature...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


export default PurchaseReview;
