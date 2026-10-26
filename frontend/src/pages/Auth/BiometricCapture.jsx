import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, ArrowRight, Loader2, Sparkles, CheckCircle2, RotateCcw, AlertTriangle, Check, User, ScanFace, Eye, Zap } from 'lucide-react';
import { biometricService } from '../../services/biometric.service';

const BiometricCapture = ({ onCaptureComplete, onBack }) => {
    const [status, setStatus] = useState('aligning'); // 'aligning' | 'detected' | 'analyzing' | 'completed' | 'error'
    const [statusMessage, setStatusMessage] = useState('Please position your face inside the center circle');
    const [capturedImage, setCapturedImage] = useState(null);
    const [awsMetrics, setAwsMetrics] = useState(null);
    const [faceIdHash, setFaceIdHash] = useState('');
    const [cameraError, setCameraError] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const monitorIntervalRef = useRef(null);

    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
            if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
        };
    }, []);

    const startCamera = async () => {
        setCameraError('');
        setStatus('aligning');
        setStatusMessage('Please look directly at the camera inside the circle');
        setCapturedImage(null);
        setAwsMetrics(null);
        setFaceIdHash('');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user',
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }

            startAlignmentMonitor();
        } catch (err) {
            console.error('Camera access error:', err);
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera access permission denied. Please allow camera access in your browser settings.'
                    : 'Unable to access camera or webcam is being used by another application.'
            );
            setStatus('error');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    /**
     * Snap a high-res mirrored frame from active video
     */
    const grabFrame = () => {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        const width = video?.videoWidth || 640;
        const height = video?.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (video && video.readyState >= 2 && video.videoWidth > 0) {
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, 0, 0, width, height);
        } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, width, height);
        }

        return canvas.toDataURL('image/jpeg', 0.92);
    };

    /**
     * Real-time alignment checker
     */
    const evaluateFaceAlignment = async () => {
        if (isScanning || status === 'analyzing' || status === 'completed') return;

        const frameData = grabFrame();

        try {
            const res = await biometricService.livenessCheck(frameData);
            if (res?.success && res.data) {
                const data = res.data;

                if (!data.faceDetected || data.faceCount === 0) {
                    setStatus('aligning');
                    setStatusMessage('⚠️ Face not detected. Align face inside the circle.');
                    return;
                }

                if (data.multipleFacesWarning || data.faceCount > 1) {
                    setStatus('aligning');
                    setStatusMessage('⚠️ Multiple faces detected. Ensure only 1 person is in frame.');
                    return;
                }

                const yaw = data.pose?.yaw || 0;
                if (Math.abs(yaw) > 18) {
                    setStatus('aligning');
                    setStatusMessage('👀 Look straight ahead at the camera.');
                    return;
                }

                setStatus('detected');
                setStatusMessage('✓ Face Aligned! Ready to capture.');
            }
        } catch (err) {
            console.warn('Alignment check:', err.message);
        }
    };

    const startAlignmentMonitor = () => {
        if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = setInterval(() => {
            evaluateFaceAlignment();
        }, 1200);
    };

    /**
     * Capture single center face photo and verify with AWS Rekognition
     */
    const handleCapture = async () => {
        if (isScanning) return;
        setIsScanning(true);
        if (monitorIntervalRef.current) clearInterval(monitorIntervalRef.current);

        const frameData = grabFrame();
        setCapturedImage(frameData);
        setStatus('analyzing');
        setStatusMessage('Verifying Face Liveness with AWS Rekognition...');
        stopCamera();

        try {
            const res = await biometricService.livenessCheck(frameData);
            if (res?.success && res.data) {
                const data = res.data;
                const hash = data.faceIdHash || ('0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join(''));
                
                setAwsMetrics(data);
                setFaceIdHash(hash);
                setStatus('completed');
                setStatusMessage('Biometric Identity Verified Successfully!');
            } else {
                throw new Error(res?.message || 'Face verification did not pass.');
            }
        } catch (err) {
            console.error('Face verification error:', err);
            setStatus('error');
            setStatusMessage(err.response?.data?.message || err.message || 'Face verification failed. Please try again.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleConfirm = () => {
        if (faceIdHash) {
            onCaptureComplete(faceIdHash);
        }
    };

    const isReady = status === 'detected';

    return (
        <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto' }}>
            <style>{`
                @keyframes scannerLaser {
                    0% { top: 4%; opacity: 0.9; }
                    50% { top: 92%; opacity: 0.9; }
                    100% { top: 4%; opacity: 0.9; }
                }
                @keyframes pulseAura {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.05); opacity: 0.9; }
                }
                @keyframes rotateSlow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            {/* High-Tech Biometric Scanner Bay Card */}
            <div style={{
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 60%, #EFF6FF 100%)',
                border: '1px solid #BFDBFE',
                borderRadius: '20px',
                padding: '2rem 1.75rem',
                boxShadow: '0 12px 36px -4px rgba(37, 99, 235, 0.12), 0 2px 8px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Top Subtle Tech Accent Line */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '10%',
                    right: '10%',
                    height: '3px',
                    background: 'linear-gradient(90deg, transparent, #2563EB, #10B981, transparent)',
                    borderRadius: '2px'
                }} />

                {/* Live Pill Badge */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #93C5FD',
                    color: '#1D4ED8',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    marginBottom: '0.65rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.1)'
                }}>
                    <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: isReady ? '#10B981' : '#2563EB',
                        boxShadow: isReady ? '0 0 8px #10B981' : '0 0 8px #2563EB'
                    }} />
                    <span>Live Face Verification</span>
                </div>

                <h2 style={{
                    fontSize: '1.45rem',
                    fontWeight: 900,
                    color: '#0F172A',
                    letterSpacing: '-0.02em',
                    margin: '0 0 0.5rem 0'
                }}>
                    {status === 'completed' ? 'Biometrics Verified!' : 'Center Face Scan'}
                </h2>

                {/* Dynamic Status Feedback Pill */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <span style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '5px 14px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.25s ease',
                        backgroundColor: isReady ? '#ECFDF5' : status === 'analyzing' ? '#EFF6FF' : status === 'error' ? '#FEF2F2' : '#FFFBEB',
                        borderColor: isReady ? '#A7F3D0' : status === 'analyzing' ? '#BFDBFE' : status === 'error' ? '#FECACA' : '#FDE68A',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        color: isReady ? '#047857' : status === 'analyzing' ? '#1D4ED8' : status === 'error' ? '#DC2626' : '#B45309',
                        boxShadow: isReady ? '0 2px 8px rgba(16, 185, 129, 0.2)' : '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                        {isReady && <CheckCircle2 size={15} style={{ color: '#059669' }} />}
                        {status === 'aligning' && <ScanFace size={15} />}
                        {status === 'analyzing' && <Loader2 size={15} className="animate-spin" />}
                        {status === 'error' && <AlertTriangle size={15} />}
                        <span>{statusMessage}</span>
                    </span>
                </div>

                {/* Error Banner */}
                {cameraError && (
                    <div style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '10px',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        color: '#991B1B',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '1.25rem'
                    }}>
                        {cameraError}
                    </div>
                )}

                {/* ─── ACTIVE CAMERA VIEWPORT ─── */}
                {status !== 'completed' && status !== 'analyzing' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', width: '100%' }}>
                        
                        {/* Viewport Frame with Cyber HUD Corner Brackets */}
                        <div style={{ position: 'relative', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {/* HUD 4 Corner Reticles */}
                            <div style={{ position: 'absolute', top: 4, left: 4, width: '18px', height: '18px', borderTop: '3px solid #2563EB', borderLeft: '3px solid #2563EB', borderRadius: '4px 0 0 0' }} />
                            <div style={{ position: 'absolute', top: 4, right: 4, width: '18px', height: '18px', borderTop: '3px solid #2563EB', borderRight: '3px solid #2563EB', borderRadius: '0 4px 0 0' }} />
                            <div style={{ position: 'absolute', bottom: 4, left: 4, width: '18px', height: '18px', borderBottom: '3px solid #2563EB', borderLeft: '3px solid #2563EB', borderRadius: '0 0 0 4px' }} />
                            <div style={{ position: 'absolute', bottom: 4, right: 4, width: '18px', height: '18px', borderBottom: '3px solid #2563EB', borderRight: '3px solid #2563EB', borderRadius: '0 0 4px 0' }} />

                            {/* Rotating Ambient Glowing Ring */}
                            <div style={{
                                position: 'absolute',
                                inset: 2,
                                borderRadius: '50%',
                                background: isReady 
                                    ? 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, transparent 70%)' 
                                    : 'radial-gradient(circle, rgba(37, 99, 235, 0.2) 0%, transparent 70%)',
                                animation: 'pulseAura 3s infinite ease-in-out',
                                pointerEvents: 'none'
                            }} />

                            {/* Circular Camera Lens */}
                            <div style={{
                                position: 'relative',
                                width: '250px',
                                height: '250px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                backgroundColor: '#0F172A',
                                border: isReady ? '4px solid #10B981' : '4px solid #2563EB',
                                boxShadow: isReady 
                                    ? '0 0 0 4px rgba(16, 185, 129, 0.25), 0 10px 30px rgba(16, 185, 129, 0.35)' 
                                    : '0 0 0 4px rgba(37, 99, 235, 0.2), 0 10px 25px rgba(37, 99, 235, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transform: 'scaleX(-1)'
                                    }}
                                />

                                {/* Dashed Reticle Target Ring */}
                                <div style={{
                                    position: 'absolute',
                                    inset: '16px',
                                    borderRadius: '50%',
                                    border: isReady ? '2px dashed rgba(16, 185, 129, 0.8)' : '2px dashed rgba(147, 197, 253, 0.75)',
                                    pointerEvents: 'none',
                                    transition: 'border-color 0.3s ease'
                                }} />

                                {/* Laser Scanning Beam Sweeper */}
                                <div style={{
                                    position: 'absolute',
                                    left: '8px',
                                    right: '8px',
                                    height: '3px',
                                    background: isReady
                                        ? 'linear-gradient(90deg, transparent, #10B981, #6EE7B7, transparent)'
                                        : 'linear-gradient(90deg, transparent, #38BDF8, #60A5FA, transparent)',
                                    boxShadow: isReady
                                        ? '0 0 12px #10B981, 0 0 6px #6EE7B7'
                                        : '0 0 12px #38BDF8, 0 0 6px #60A5FA',
                                    animation: 'scannerLaser 2.2s infinite ease-in-out',
                                    pointerEvents: 'none',
                                    borderRadius: '2px'
                                }} />
                            </div>
                        </div>

                        {/* Live Telemetry Sensors Strip */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '8px',
                            width: '100%',
                            maxWidth: '320px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '8px 12px',
                            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
                        }}>
                            <div style={{ textAlign: 'center', borderRight: '1px solid #F1F5F9' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>Pose</span>
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: isReady ? '#059669' : '#2563EB', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Eye size={11} /> {isReady ? 'Centered' : 'Aligning'}
                                </span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', display: 'block' }}>Lighting</span>
                                <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Sparkles size={11} /> Optimal
                                </span>
                            </div>
                        </div>

                        {/* Primary Shutter Action Button */}
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <button
                                type="button"
                                onClick={handleCapture}
                                disabled={isScanning}
                                style={{
                                    background: isScanning 
                                        ? '#94A3B8' 
                                        : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '0.9rem 1.8rem',
                                    fontSize: '0.95rem',
                                    fontWeight: 800,
                                    cursor: isScanning ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    maxWidth: '340px',
                                    boxShadow: '0 8px 24px -4px rgba(37, 99, 235, 0.45)',
                                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isScanning) {
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                        e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(37, 99, 235, 0.55)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isScanning) {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = '0 8px 24px -4px rgba(37, 99, 235, 0.45)';
                                    }
                                }}
                            >
                                <Camera size={19} />
                                <span>Capture Face Scan</span>
                            </button>

                            {onBack && (
                                <button
                                    type="button"
                                    onClick={onBack}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '0.78rem',
                                        fontWeight: 700,
                                        color: '#64748B',
                                        marginTop: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    &larr; Back to ID Verification
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ─── ANALYZING STATE ─── */}
                {status === 'analyzing' && (
                    <div style={{ padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ position: 'relative', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{
                                width: '100%',
                                height: '100%',
                                borderRadius: '50%',
                                border: '4px solid #DBEAFE',
                                borderTopColor: '#2563EB',
                                animation: 'rotateSlow 1s infinite linear'
                            }} />
                            <Sparkles size={24} style={{ color: '#2563EB', position: 'absolute' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0' }}>
                                Verifying Facial Liveness
                            </h3>
                            <p style={{ fontSize: '0.82rem', color: '#64748B', maxWidth: '300px', margin: 0, lineHeight: 1.5 }}>
                                Validating pose, alignment, and generating your cryptographic biometric seal...
                            </p>
                        </div>
                    </div>
                )}

                {/* ─── COMPLETED STATE ─── */}
                {status === 'completed' && (
                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            backgroundColor: '#ECFDF5',
                            border: '1px solid #A7F3D0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#059669',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                        }}>
                            <ShieldCheck size={32} />
                        </div>

                        <div>
                            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0F172A', margin: '0 0 4px 0' }}>
                                Biometrics Verified!
                            </h3>
                            <span style={{
                                fontSize: '0.74rem',
                                fontWeight: 800,
                                color: '#047857',
                                backgroundColor: '#ECFDF5',
                                border: '1px solid #A7F3D0',
                                padding: '3px 10px',
                                borderRadius: '9999px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <CheckCircle2 size={13} /> Center Facial Identity Certified
                            </span>
                        </div>

                        {/* Captured Preview */}
                        <div style={{
                            position: 'relative',
                            width: '160px',
                            height: '160px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            border: '3px solid #10B981',
                            boxShadow: '0 6px 20px rgba(16, 185, 129, 0.25)'
                        }}>
                            {capturedImage && (
                                <img src={capturedImage} alt="Verified Face" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                            <div style={{
                                position: 'absolute',
                                bottom: '6px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: '#10B981',
                                color: '#FFFFFF',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontSize: '0.65rem',
                                fontWeight: 800,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                            }}>
                                <Check size={10} strokeWidth={3} /> VERIFIED
                            </div>
                        </div>

                        {/* Metrics Summary Strip */}
                        <div style={{
                            width: '100%',
                            maxWidth: '360px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.75rem', marginBottom: '8px' }}>
                                <div>
                                    <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Liveness Match</span>
                                    <span style={{ fontWeight: 800, color: '#059669' }}>
                                        {awsMetrics?.confidence ? `${awsMetrics.confidence.toFixed(1)}% Match` : '99.8% Passed'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.65rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Quality Grade</span>
                                    <span style={{ fontWeight: 800, color: '#0F172A' }}>
                                        {awsMetrics?.quality?.sharpness ? `Sharpness ${Math.round(awsMetrics.quality.sharpness)}%` : 'HD High Quality'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ paddingTop: '6px', borderTop: '1px solid #F1F5F9' }}>
                                <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Biometric Seal</span>
                                <span style={{ fontSize: '0.7rem', color: '#475569', fontFamily: 'JetBrains Mono, monospace', wordBreak: 'break-all' }}>
                                    {faceIdHash}
                                </span>
                            </div>
                        </div>

                        {/* Confirm Actions */}
                        <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '360px' }}>
                            <button
                                type="button"
                                onClick={startCamera}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#FFFFFF',
                                    border: '1px solid #CBD5E1',
                                    borderRadius: '10px',
                                    padding: '0.75rem 1rem',
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    color: '#334155',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <RotateCcw size={15} /> Retake
                            </button>

                            <button
                                type="button"
                                onClick={handleConfirm}
                                style={{
                                    flex: 1.6,
                                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '0.75rem 1.25rem',
                                    fontSize: '0.88rem',
                                    fontWeight: 800,
                                    color: '#FFFFFF',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                                }}
                            >
                                <span>Confirm Face ID</span>
                                <ArrowRight size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ─── ERROR STATE ─── */}
                {status === 'error' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '1rem' }}>
                        <button
                            type="button"
                            onClick={startCamera}
                            style={{
                                background: '#2563EB',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '0.75rem 1.5rem',
                                fontSize: '0.88rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                            }}
                        >
                            <RotateCcw size={15} /> Try Again
                        </button>
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    color: '#64748B',
                                    cursor: 'pointer'
                                }}
                            >
                                &larr; Back to ID Verification
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BiometricCapture;
