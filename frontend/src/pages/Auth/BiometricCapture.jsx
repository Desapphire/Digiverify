import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, ArrowRight } from 'lucide-react';

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
        // Simulated Face ID hash capture for demonstration.
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
            // Wait for detection to stabilize before starting the sequence
        } catch (err) {
            console.error("Camera access failed:", err);
            // In a real app we'd display this error to user
        }
    };

    const startDetection = async () => {
        const cv = window.cv;

        // Load Haar Cascade
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
                processingLoopRef.current = requestAnimationFrame(processVideo);
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
        <div className="flex flex-col items-center gap-6 py-8">
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
                            className="absolute inset-0 w-full h-full object-cover z-10"
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
                        <div className="absolute inset-0 bg-blue-500/10 animate-pulse z-0"></div>
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
                {biometricStep > 0 && biometricStep < 4 && (
                    <button 
                        onClick={() => setBiometricStep(4)}
                        style={{ 
                            marginTop: '2rem', background: 'none', border: 'none', 
                            color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        Stuck? Click to bypass (Dev Mode)
                    </button>
                )}
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
                            onClick={handleFaceIdCapture}
                            className="btn w-full max-w-sm flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 border-b-4 border-gray-300 active:border-b-0 active:translate-y-1 transition-all"
                        >
                            Proceed to Wallet Link <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {biometricStep === 0 && (
                <button type="button" onClick={onBack} className="text-sm text-muted font-bold hover:text-white mt-4">
                    Go Back
                </button>
            )}
        </div>
    );
};

export default BiometricCapture;
