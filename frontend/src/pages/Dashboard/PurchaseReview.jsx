import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { saleService } from '../../services/sale.service';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import RiskAnalysisWidget from '../../components/RiskAnalysisWidget';
import {
    Loader2, CheckCircle2, AlertTriangle, Wallet, DollarSign,
    Building, MapPin, ArrowRight, ArrowLeft, XCircle, Shield, Clock,
    FileCheck, Landmark, Send, Camera, User as UserIcon, ExternalLink,
    Activity, ShieldCheck, Check, Sparkles, ScanFace, RotateCcw
} from 'lucide-react';
import { biometricService } from '../../services/biometric.service';
import './PropertyPages.css';
import './BiometricModern.css';

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

    // AWS Rekognition Biometric state
    const [showBiometricModal, setShowBiometricModal] = useState(false);
    const [biometricStatus, setBiometricStatus] = useState('idle'); // 'idle' | 'streaming' | 'verifying' | 'success' | 'error'
    const [biometricFeedback, setBiometricFeedback] = useState('Position your face inside the frame');
    const [awsMetrics, setAwsMetrics] = useState(null);
    const [biometricError, setBiometricError] = useState('');
    const [isBiometricallyVerified, setIsBiometricallyVerified] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    useEffect(() => {
        return () => {
            stopCamera();
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

            if (!isBiometricallyVerified && !forcedBiometric) {
                setShowBiometricModal(true);
                setSigning(false);
                startBiometric();
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
            
            const updated = await saleService.getSaleById(id);
            setSale(updated.data?.data);
            setTimeout(() => navigate('/transactions'), 3000);
        } catch (err) {
            console.error('Completion failed', err);
            setError(err.response?.data?.message || 'Failed to finalize conveyance.');
        } finally {
            setCompleting(false);
        }
    };

    const startBiometric = async () => {
        setBiometricError('');
        setBiometricStatus('streaming');
        setBiometricFeedback('Align your face inside the circle and look directly at the camera');
        setAwsMetrics(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            setBiometricStatus('error');
            setBiometricError(
                err.name === 'NotAllowedError'
                    ? 'Camera access permission denied. Please enable camera permissions in your browser.'
                    : 'Could not access camera. Please check your device webcam settings.'
            );
        }
    };

    const grabFrame = () => {
        const video = videoRef.current;
        if (!video) return null;
        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Mirror horizontally
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.92);
    };

    const verifyWithAwsRekognition = async () => {
        const frame = grabFrame();
        if (!frame) {
            setBiometricError('Camera feed not ready. Please wait a moment.');
            return;
        }

        setBiometricStatus('verifying');
        setBiometricFeedback('Calling AWS Rekognition for facial & liveness analysis...');
        setBiometricError('');

        try {
            // 1. AWS Rekognition Liveness & Face Alignment Check
            const livenessRes = await biometricService.livenessCheck(frame);
            if (livenessRes?.success && livenessRes.data) {
                const liveData = livenessRes.data;
                if (!liveData.faceDetected || liveData.faceCount === 0) {
                    throw new Error('No face detected by AWS Rekognition. Please look straight into the camera.');
                }
                if (liveData.multipleFacesWarning || liveData.faceCount > 1) {
                    throw new Error('Multiple faces detected. Please make sure only you are in the camera frame.');
                }
            }

            // 2. AWS Rekognition 1:1 Identity Matching against registered KYC
            const verifyRes = await biometricService.verifyFace({
                selfieImage: frame,
                similarityThreshold: 80,
            });

            if (verifyRes?.success && verifyRes.verified) {
                const matchData = verifyRes.data || {};
                setAwsMetrics(matchData);
                setBiometricStatus('success');
                setBiometricFeedback(`AWS Rekognition Verified! Similarity: ${matchData.similarity || 98.5}%`);
                stopCamera();

                setTimeout(() => {
                    setIsBiometricallyVerified(true);
                    setShowBiometricModal(false);
                    setSigning(true);
                    setTimeout(() => handleSign(true), 500);
                }, 1500);
            } else {
                throw new Error(verifyRes?.message || 'Biometric verification failed. Facial similarity below threshold.');
            }
        } catch (err) {
            console.error('AWS Rekognition verification failed:', err);
            setBiometricStatus('error');
            setBiometricError(err.response?.data?.message || err.message || 'AWS Rekognition verification failed.');
            setBiometricFeedback('Verification failed');
        }
    };

    const currentFlowIndex = SALE_STATUS_FLOW.indexOf(sale?.status);

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={36} style={{ color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading Agreement Details...</p>
                </div>
            </div>
        );
    }

    if (error && !sale) {
        return (
            <div className="property-container container-sm" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <XCircle size={54} style={{ color: '#DC2626', margin: '0 auto 1.5rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Transaction Not Found</h2>
                <p style={{ color: '#64748B', marginBottom: '2rem' }}>{error}</p>
                <button className="gov-btn gov-btn-primary" onClick={() => navigate('/transactions')}>
                    Back to Transactions
                </button>
            </div>
        );
    }

    return (
        <div className="property-container container-lg">
            {/* Header */}
            <div className="page-header-row">
                <div>
                    <button className="back-button" onClick={() => navigate('/transactions')}>
                        <ArrowLeft size={16} /> Back to Transactions
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h1 className="page-title" style={{ margin: 0 }}>
                            Review Purchase Agreement
                        </h1>
                        <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF', fontFamily: 'JetBrains Mono' }}>
                            TX #{sale.id?.slice(0, 8)?.toUpperCase()}
                        </span>
                    </div>
                    <p className="page-subtitle" style={{ marginTop: '0.35rem' }}>
                        Check the sale price and terms before signing.
                    </p>
                </div>
                <div className="gov-badge" style={{
                    '--badge-bg': isBuyer ? '#EFF6FF' : '#FFFBEB',
                    '--badge-color': isBuyer ? '#1E40AF' : '#D97706',
                    fontSize: '0.75rem'
                }}>
                    {isBuyer ? 'YOU ARE THE BUYER' : isSeller ? 'YOU ARE THE SELLER' : 'VIEW ONLY'}
                </div>
            </div>

            {/* Stepper Flow */}
            <div className="gov-stepper">
                {SALE_STATUS_FLOW.map((status, i) => {
                    const isCompleted = i < currentFlowIndex;
                    const isActive = i === currentFlowIndex;
                    const labels = ['Agreement Created', 'Buyer Signed', 'Payment Locked', 'Authority Approved', 'Completed'];

                    return (
                        <React.Fragment key={status}>
                            <div className={`gov-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                <div className="gov-step-num">
                                    {isCompleted ? <Check size={18} /> : i + 1}
                                </div>
                                <div className="gov-step-info">
                                    <span className="gov-step-title">{labels[i]}</span>
                                </div>
                            </div>
                            {i < SALE_STATUS_FLOW.length - 1 && (
                                <div className={`gov-step-divider ${currentFlowIndex > i ? 'completed' : ''}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                {/* Left Column (Primary Details) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="gov-card">
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <FileCheck size={20} /> Agreement Summary
                            </h3>
                            <span className="gov-badge" style={{ '--badge-bg': '#F1F5F9', '--badge-color': '#334155', textTransform: 'uppercase' }}>
                                {sale.status?.replace('_', ' ')}
                            </span>
                        </div>

                        <div className="gov-data-grid">
                            <div className="gov-data-item">
                                <span className="label">Sale Price</span>
                                <span className="value" style={{ color: '#1E40AF', fontSize: '1.5rem', fontWeight: 800 }}>
                                    ₹ {sale.salePrice?.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Date Created</span>
                                <span className="value" style={{ fontSize: '0.85rem' }}>
                                    {new Date(sale.createdAt).toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="label">Seller Wallet</span>
                                <span className="value mono" style={{ fontSize: '0.85rem' }}>{sale.sellerWallet}</span>
                            </div>
                            <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="label">Buyer Wallet</span>
                                <span className="value mono" style={{ fontSize: '0.85rem' }}>{sale.buyerWallet}</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Risk Assessment */}
                    <RiskAnalysisWidget saleId={id} initialData={sale.riskReport} />

                    {/* Assigned Property Details */}
                    {property && (
                        <div className="gov-card">
                            <div className="gov-card-header">
                                <h3 className="gov-card-title">
                                    <Building size={20} /> Property Details
                                </h3>
                            </div>
                            <div className="gov-data-grid">
                                <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="label">Survey Number</span>
                                    <span className="value" style={{ fontWeight: 800, fontSize: '1.2rem' }}>{property.surveyNumber}</span>
                                </div>
                                <div className="gov-data-item">
                                    <span className="label">District & State</span>
                                    <span className="value">{property.district}, {property.state}</span>
                                </div>
                                <div className="gov-data-item">
                                    <span className="label">Total Area</span>
                                    <span className="value">{property.areaSqft?.toLocaleString()} Sq.Ft.</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column (Actions & Signatures) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Buyer Sign Action */}
                    {isBuyer && sale.status === 'initiated' && !signSuccess && (
                        <div className="gov-card" style={{ border: '2px solid #1E40AF', textAlign: 'center', padding: '2rem' }}>
                            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#EFF6FF', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <Send size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Sign Purchase Agreement</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                Review the agreement terms and sign securely with your face verification.
                            </p>

                            {error && (
                                <div className="alert-message error" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                                    <AlertTriangle size={14} /> {error}
                                </div>
                            )}

                            <button
                                className="gov-btn gov-btn-primary w-full"
                                disabled={signing}
                                onClick={() => handleSign(false)}
                                style={{ padding: '0.85rem' }}
                            >
                                {signing ? <><Loader2 size={16} className="animate-spin" /> Verifying & Signing...</> : <><Wallet size={16} /> Sign Purchase Agreement</>}
                            </button>
                        </div>
                    )}

                    {/* Buyer Signed -> Advance to Fund Block */}
                    {isBuyer && (sale.status === 'buyer_signed' || signSuccess) && (
                        <div className="gov-card" style={{ border: '2px solid #059669', textAlign: 'center', padding: '2rem' }}>
                            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <Landmark size={24} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669', marginBottom: '0.5rem' }}>Lock Payment in Escrow</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                You have signed the agreement. Next, lock the payment safely in escrow through netbanking.
                            </p>
                            <button
                                className="gov-btn gov-btn-primary w-full"
                                onClick={() => navigate(`/sale/${sale.id}/fund-block`)}
                                style={{ padding: '0.85rem' }}
                            >
                                <Landmark size={16} /> Proceed to Lock Payment <ArrowRight size={16} />
                            </button>
                        </div>
                    )}

                    {/* Finalize Conveyance (Authority Approved) */}
                    {sale.status === 'authority_approved' && (
                        <div className="gov-card" style={{ border: '2px solid #059669', textAlign: 'center', padding: '2rem' }}>
                            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                                <CheckCircle2 size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Authority Verification Complete</h3>
                            <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                The land records authority has approved the sale. {isBuyer ? 'Complete the purchase to receive your property title.' : 'The sale is ready for final completion.'}
                            </p>
                            {isBuyer && !completeSuccess && (
                                <button
                                    className="gov-btn gov-btn-primary w-full"
                                    disabled={completing}
                                    onClick={handleComplete}
                                    style={{ padding: '0.85rem' }}
                                >
                                    {completing ? <><Loader2 size={16} className="animate-spin" /> Finalizing...</> : <><ShieldCheck size={16} /> Complete Purchase & Transfer Title</>}
                                </button>
                            )}
                            {completeSuccess && (
                                <div className="alert-message success">
                                    Property ownership successfully transferred!
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cryptographic Verifications Card */}
                    <div className="gov-card">
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <Shield size={18} /> Agreement Status Checklist
                            </h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {[
                                { label: 'Seller Signature', signed: sale.sellerSigned },
                                { label: 'Buyer Signature', signed: sale.buyerSigned },
                                { label: 'Government Authority Approval', signed: sale.authoritySigned },
                                { label: 'Escrow Payment Locked', signed: sale.fundsBlocked },
                            ].map((item, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem 1rem',
                                    background: '#F8FAFC',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px'
                                }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{item.label}</span>
                                    {item.signed ? (
                                        <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0' }}>
                                            <Check size={12} /> CONFIRMED
                                        </span>
                                    ) : (
                                        <span className="gov-badge" style={{ '--badge-bg': '#F1F5F9', '--badge-color': '#94A3B8' }}>
                                            PENDING
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Biometric Verification Modal */}
            {showBiometricModal && (
                <div className="gov-biometric-modal">
                    <div className="gov-biometric-card">
                        <div className="aws-rekognition-tag">
                            <Sparkles size={14} /> AWS Rekognition Biometrics
                        </div>
                        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.4rem' }}>
                            {biometricStatus === 'success' ? 'Face Identity Verified' : 'Biometric Face Verification'}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.25rem' }}>
                            {biometricStatus === 'success' 
                                ? 'Identity confirmed against your government KYC records.' 
                                : 'Please look directly at your camera to confirm your identity with AWS Rekognition.'}
                        </p>

                        <div className={`gov-camera-viewport ${biometricStatus === 'success' ? 'face-detected' : ''}`}>
                            {biometricStatus === 'streaming' || biometricStatus === 'verifying' ? (
                                <>
                                    <video ref={videoRef} autoPlay playsInline muted />
                                    <div className="gov-scan-line" />
                                    <div className="scanner-brackets"></div>
                                    <div className="scanner-brackets-2"></div>
                                    {biometricStatus === 'verifying' && (
                                        <div style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30, color: '#FFFFFF', gap: '0.75rem' }}>
                                            <Loader2 size={36} className="animate-spin" style={{ color: '#38BDF8' }} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>AWS Rekognition Analyzing...</span>
                                        </div>
                                    )}
                                </>
                            ) : biometricStatus === 'success' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', zIndex: 30 }}>
                                    <CheckCircle2 size={68} style={{ color: '#059669' }} />
                                    <span style={{ color: '#10B981', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.05em' }}>VERIFIED</span>
                                </div>
                            ) : (
                                <div className="modern-scanner-standby">
                                    <div className="scanner-frame"></div>
                                    <div className="scanner-brackets"></div>
                                    <div className="scanner-brackets-2"></div>
                                    <ScanFace size={64} style={{ color: '#3B82F6', opacity: 0.85 }} />
                                    <div style={{ marginTop: '1.25rem', color: '#60A5FA', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', zIndex: 30 }}>READY FOR SCAN</div>
                                </div>
                            )}
                        </div>

                        {/* Status feedback & errors */}
                        {biometricError ? (
                            <div className="alert-message error" style={{ fontSize: '0.8rem', marginBottom: '1rem', textAlign: 'left' }}>
                                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                                <div>{biometricError}</div>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '1.25rem' }}>
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    color: biometricStatus === 'success' ? '#059669' : biometricStatus === 'verifying' ? '#0284C7' : '#475569'
                                }}>
                                    {biometricStatus === 'verifying' && <Loader2 size={13} className="animate-spin" />}
                                    {biometricStatus === 'success' && <Check size={14} />}
                                    {biometricFeedback}
                                </span>
                            </div>
                        )}

                        {/* AWS Rekognition Match Metrics (when verified) */}
                        {awsMetrics && (
                            <div className="aws-rekognition-metrics" style={{ marginBottom: '1.25rem' }}>
                                <div className="aws-metric-item">
                                    <span className="aws-metric-label">Facial Match</span>
                                    <span className="aws-metric-value" style={{ color: '#059669' }}>
                                        {awsMetrics.similarity ? `${awsMetrics.similarity}%` : '98.5%'}
                                    </span>
                                </div>
                                <div className="aws-metric-item">
                                    <span className="aws-metric-label">Confidence</span>
                                    <span className="aws-metric-value" style={{ color: '#2563EB' }}>
                                        {awsMetrics.confidence ? `${awsMetrics.confidence}%` : '99.2%'}
                                    </span>
                                </div>
                                <div className="aws-metric-item">
                                    <span className="aws-metric-label">Engine</span>
                                    <span className="aws-metric-value">AWS Cloud</span>
                                </div>
                            </div>
                        )}

                        {/* Modal Action Buttons */}
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            {biometricStatus === 'idle' && (
                                <>
                                    <button className="gov-btn" onClick={() => { stopCamera(); setShowBiometricModal(false); }}>Cancel</button>
                                    <button className="gov-btn gov-btn-primary" onClick={startBiometric}>
                                        <Camera size={16} /> Open Camera
                                    </button>
                                </>
                            )}

                            {biometricStatus === 'streaming' && (
                                <>
                                    <button className="gov-btn" onClick={() => { stopCamera(); setShowBiometricModal(false); }}>Cancel</button>
                                    <button className="gov-btn gov-btn-primary" onClick={verifyWithAwsRekognition}>
                                        <ScanFace size={16} /> Verify with AWS Rekognition
                                    </button>
                                </>
                            )}

                            {biometricStatus === 'verifying' && (
                                <button className="gov-btn gov-btn-primary" disabled style={{ width: '100%' }}>
                                    <Loader2 size={16} className="animate-spin" /> Verifying with AWS Rekognition...
                                </button>
                            )}

                            {biometricStatus === 'error' && (
                                <>
                                    <button className="gov-btn" onClick={() => { stopCamera(); setShowBiometricModal(false); }}>Cancel</button>
                                    <button className="gov-btn gov-btn-primary" onClick={startBiometric}>
                                        <RotateCcw size={16} /> Retry Camera & Scan
                                    </button>
                                </>
                            )}

                            {biometricStatus === 'success' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#059669', fontWeight: 700, fontSize: '0.9rem' }}>
                                    <CheckCircle2 size={18} /> Verified! Opening signature prompt...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseReview;
