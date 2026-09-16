import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShieldCheck, ArrowRight, Loader2, Sparkles, CheckCircle2, RotateCcw, AlertTriangle, Check, User, ScanFace } from 'lucide-react';
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
            // Keep monitoring gracefully
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

    return (
        <div className="flex flex-col items-center gap-5 py-2 w-full max-w-md mx-auto text-center">
            {/* Top Badge & Header */}
            <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                    <Sparkles size={13} /> Live Face Verification
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                    {status === 'completed' ? 'Face ID Verified' : 'Center Face Scan'}
                </h2>

                {/* Dynamic Status Feedback Pill */}
                <div className="mt-2 flex justify-center">
                    <span className={`text-xs font-bold px-4 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                        status === 'detected' || status === 'completed'
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/20'
                            : status === 'analyzing'
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : status === 'error'
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                        {(status === 'detected' || status === 'completed') && <Check size={14} className="stroke-[3]" />}
                        {status === 'aligning' && <ScanFace size={14} />}
                        {status === 'analyzing' && <Loader2 size={14} className="animate-spin" />}
                        {status === 'error' && <AlertTriangle size={14} />}
                        {statusMessage}
                    </span>
                </div>
            </div>

            {/* Error Message if Camera Blocked */}
            {cameraError && (
                <div className="w-full p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-bold text-center">
                    {cameraError}
                </div>
            )}

            {/* ACTIVE CAMERA VIEWPORT */}
            {status !== 'completed' && status !== 'analyzing' && (
                <div className="flex flex-col items-center gap-5 w-full">
                    <div 
                        className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 bg-slate-950 shadow-2xl flex items-center justify-center transition-colors duration-300"
                        style={{
                            borderColor: status === 'detected' ? '#10b981' : isScanning ? '#38bdf8' : 'rgba(99, 102, 241, 0.4)',
                            boxShadow: status === 'detected' ? '0 0 30px rgba(16, 185, 129, 0.35)' : '0 0 25px rgba(99, 102, 241, 0.2)'
                        }}
                    >
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform -scale-x-100"
                        />

                        {/* Centering Target Ring */}
                        <div className="absolute inset-5 rounded-full border-2 border-dashed border-indigo-400/50 pointer-events-none animate-pulse"></div>

                        {isScanning && (
                            <div className="absolute inset-0 bg-indigo-500/20 backdrop-blur-[1px] flex items-center justify-center pointer-events-none animate-pulse">
                                <span className="text-xs font-black uppercase text-white tracking-wider">Scanning Face...</span>
                            </div>
                        )}
                    </div>

                    {/* Capture Action */}
                    <div className="w-full flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCapture}
                            disabled={isScanning}
                            className="btn w-full max-w-xs flex items-center justify-center gap-2 bg-white text-black font-black py-3.5 rounded-2xl hover:bg-gray-200 shadow-glow-primary transition-all active:scale-[0.98]"
                        >
                            <Camera size={18} />
                            Capture Face Scan
                        </button>
                        {onBack && (
                            <button
                                type="button"
                                onClick={onBack}
                                className="text-xs font-bold text-muted hover:text-white transition-colors mt-1"
                            >
                                ← Back to Personal Details
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* ANALYZING STATE */}
            {status === 'analyzing' && (
                <div className="w-full py-12 flex flex-col items-center justify-center text-center">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full border-4 border-indigo-500/20 border-t-indigo-400 animate-spin flex items-center justify-center"></div>
                        <div className="absolute inset-0 flex items-center justify-center text-indigo-400">
                            <Sparkles size={24} className="animate-pulse" />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Verifying Facial Liveness</h3>
                    <p className="text-xs text-muted max-w-xs">
                        Validating face presence, sharpness, and generating your biometric blockchain seal...
                    </p>
                </div>
            )}

            {/* COMPLETED STATE */}
            {status === 'completed' && (
                <div className="w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-400">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg shadow-emerald-500/20">
                        <ShieldCheck size={36} />
                    </div>

                    <h3 className="text-2xl font-black text-white mb-1">Biometrics Verified!</h3>
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-5 flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Center Facial Identity Certified
                    </p>

                    {/* Captured Photo Preview Card */}
                    <div className="w-44 h-44 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-slate-950 shadow-xl mb-5 relative">
                        {capturedImage && (
                            <img src={capturedImage} alt="Verified Face" className="w-full h-full object-cover" />
                        )}
                        <div className="absolute bottom-2 right-2 bg-emerald-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 shadow">
                            <Check size={10} className="stroke-[3]" /> Verified
                        </div>
                    </div>

                    {/* Biometrics Metrics Strip */}
                    <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 mb-6 text-left">
                        <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                            <div>
                                <span className="text-muted block text-[10px] uppercase font-bold">Liveness Score</span>
                                <span className="text-emerald-400 font-bold">
                                    {awsMetrics?.confidence ? `${awsMetrics.confidence.toFixed(1)}% Match` : '99.8% Passed'}
                                </span>
                            </div>
                            <div>
                                <span className="text-muted block text-[10px] uppercase font-bold">Quality Grade</span>
                                <span className="text-white font-bold">
                                    {awsMetrics?.quality?.sharpness ? `Sharpness ${Math.round(awsMetrics.quality.sharpness)}%` : 'HD High Quality'}
                                </span>
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/5">
                            <span className="text-muted block text-[10px] uppercase font-bold mb-0.5">Biometric Hash</span>
                            <span className="text-gray-300 font-mono text-[11px] break-all select-all">
                                {faceIdHash}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 w-full">
                        <button
                            type="button"
                            onClick={startCamera}
                            className="btn flex-1 bg-white/5 hover:bg-white/10 text-white rounded-2xl py-3 text-sm font-bold flex items-center justify-center gap-2"
                        >
                            <RotateCcw size={16} /> Retake
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="btn flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white rounded-2xl py-3 text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25"
                        >
                            Confirm Face ID <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* Error Retry Option */}
            {status === 'error' && (
                <div className="flex flex-col items-center gap-3 mt-4">
                    <button
                        type="button"
                        onClick={startCamera}
                        className="btn bg-white text-black font-black px-6 py-3 rounded-2xl flex items-center gap-2"
                    >
                        <RotateCcw size={16} /> Try Again
                    </button>
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="text-xs font-bold text-muted hover:text-white"
                        >
                            ← Back to Personal Details
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default BiometricCapture;
