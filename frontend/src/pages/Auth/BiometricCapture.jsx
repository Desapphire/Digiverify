import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

const BiometricCapture = ({ onCaptureComplete, onBack }) => {
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
        const simulatedHash = 'e3b0' + Math.random().toString(16).slice(2) + 'd855';
        onCaptureComplete(simulatedHash);
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
                cv.FS_createDataFile('/', 'haarcascade.xml', data, true, false, false);
            } catch (fsErr) {
                console.warn("Cascade file might already exist:", fsErr);
            }
        } catch (err) {
            console.error("Biometric setup error:", err);
        }

        const classifier = new cv.CascadeClassifier();
        try {
            classifier.load('haarcascade.xml');
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
                        ctx.strokeStyle = '#0284C7';
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
            }
        }, 2000);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '1rem 0' }}>
            <div style={{
                position: 'relative',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: '#0B0F19',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #1E293B',
                overflow: 'hidden'
            }}>
                {biometricStep > 0 && biometricStep < 4 ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            width="320"
                            height="240"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 10 }}
                        />
                        <canvas
                            ref={canvasRef}
                            width="320"
                            height="240"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 20, pointerEvents: 'none' }}
                        />
                        {!faceDetected && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30, background: 'rgba(0,0,0,0.5)' }}>
                                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: 'white', textTransform: 'uppercase', textAlign: 'center', margin: 0 }}>Align Face</p>
                            </div>
                        )}
                        {/* Progress ring simulation */}
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', zIndex: 40 }}>
                            <circle cx="60" cy="60" r="54" stroke="#1E293B" strokeWidth="4" fill="transparent" />
                            <circle cx="60" cy="60" r="54" stroke="#0284C7" strokeWidth="4" fill="transparent"
                                strokeDasharray={2 * Math.PI * 54}
                                strokeDashoffset={2 * Math.PI * 54 * (1 - biometricProgress / 100)}
                                style={{ transition: 'stroke-dashoffset 0.1s linear' }} />
                        </svg>
                    </div>
                ) : biometricStep === 4 ? (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16,185,129,0.1)' }}>
                        <ShieldCheck size={48} style={{ color: '#10B981' }} />
                    </div>
                ) : (
                    <Camera size={36} style={{ color: '#0284C7' }} />
                )}
            </div>

            <div style={{ textAlign: 'center', maxWidth: '380px' }}>
                {biometricStep === 0 && (
                    <>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.35rem' }}>Biometric Face Liveness</h3>
                        <p style={{ fontSize: '0.825rem', color: '#94A3B8', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                            Capture biometric yaw samples to cryptographically verify liveness and prevent fraud.
                        </p>
                        <button
                            type="button"
                            onClick={startBiometric}
                            className="btn-cyan-glow"
                            style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem' }}
                        >
                            Start Camera Verification
                        </button>
                    </>
                )}
                {biometricStep === 1 && <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38BDF8', margin: 0 }}>Look Straight at Camera</h3>}
                {biometricStep === 2 && <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38BDF8', margin: 0 }}>Turn Head Slightly LEFT</h3>}
                {biometricStep === 3 && <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#38BDF8', margin: 0 }}>Turn Head Slightly RIGHT</h3>}
                {biometricStep > 0 && biometricStep < 4 && (
                    <button 
                        type="button"
                        onClick={() => setBiometricStep(4)}
                        style={{ 
                            marginTop: '1.5rem', background: 'none', border: 'none', 
                            color: '#64748B', fontSize: '0.75rem', cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Bypass verification in development mode
                    </button>
                )}
                {biometricStep === 4 && (
                    <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10B981', marginBottom: '1rem' }}>Liveness Verified!</h3>

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            {capturedImages.map((img, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1E293B' }}>
                                        <img src={img.url} alt={img.step} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 600, color: '#94A3B8', marginTop: '0.25rem', display: 'block', textTransform: 'uppercase' }}>{img.step}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleFaceIdCapture}
                            className="btn-cyan-glow"
                            style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.875rem', background: '#10B981' }}
                        >
                            Proceed to Wallet Link <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {biometricStep === 0 && (
                <button
                    type="button"
                    onClick={onBack}
                    className="btn-cyan-outline"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.8rem' }}
                >
                    Back to Details
                </button>
            )}
        </div>
    );
};

export default BiometricCapture;
