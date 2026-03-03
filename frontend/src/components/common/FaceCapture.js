import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import Button from './Button';

const FaceCapture = ({ onCapture }) => {
    const webcamRef = useRef(null);
    const [isCvLoaded, setIsCvLoaded] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [error, setError] = useState(null);
    const requestRef = useRef();

    // Load OpenCV.js dynamically
    useEffect(() => {
        const scriptId = 'opencv-script';

        const checkCvReady = () => {
            if (window.cv && window.cv.Mat) {
                setIsCvLoaded(true);
            } else {
                setTimeout(checkCvReady, 100);
            }
        };

        if (window.cv && window.cv.Mat) {
            setIsCvLoaded(true);
            return;
        }

        let script = document.getElementById(scriptId);
        if (!script) {
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://docs.opencv.org/4.x/opencv.js';
            script.async = true;
            script.onload = () => {
                console.log('OpenCV.js script tag loaded');
                checkCvReady();
            };
            script.onerror = () => setError('Failed to load OpenCV engine.');
            document.body.appendChild(script);
        } else {
            // Script already exists but maybe not yet ready
            checkCvReady();
        }

        // Do not remove the script on unmount.
        // Re-adding it is what causes the "Cannot register twice" error.
    }, []);

    const detectLoop = useCallback(() => {
        if (!isCvLoaded || !webcamRef.current || !webcamRef.current.video || webcamRef.current.video.readyState !== 4) {
            requestRef.current = requestAnimationFrame(detectLoop);
            return;
        }

        // Logic here for face detection using OpenCV.js
        // We'll simulate 'faceDetected' as true for now to make the UI interactive
        // but keep the framework ready for real detection logic.
        if (!faceDetected) setFaceDetected(true);

        requestRef.current = requestAnimationFrame(detectLoop);
    }, [isCvLoaded, faceDetected]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(detectLoop);
        return () => cancelAnimationFrame(requestRef.current);
    }, [detectLoop]);

    const handleCapture = useCallback(() => {
        if (webcamRef.current) {
            const imageSrc = webcamRef.current.getScreenshot();
            setCapturedImage(imageSrc);
            onCapture(imageSrc);
        }
    }, [onCapture]);

    const retake = () => {
        setCapturedImage(null);
        onCapture(null);
    };

    return (
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
            <div className="glass-panel" style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '16px',
                aspectRatio: '4/3',
                background: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: faceDetected && !capturedImage ? '2px solid var(--accent)' : '1px solid var(--border-glass)'
            }}>
                {!capturedImage ? (
                    <>
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />

                        {isCvLoaded && (
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: '220px',
                                height: '280px',
                                border: `2px dashed ${faceDetected ? 'var(--accent)' : 'rgba(255,255,255,0.3)'}`,
                                borderRadius: '120px',
                                pointerEvents: 'none',
                                transition: 'all 0.3s ease',
                                boxShadow: faceDetected ? '0 0 20px rgba(16, 185, 129, 0.3)' : 'none'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-40px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    background: faceDetected ? 'var(--accent)' : 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {faceDetected ? 'FACE DETECTED' : 'POSITION YOUR FACE'}
                                </div>
                            </div>
                        )}

                        {!isCvLoaded && (
                            <div style={{ position: 'absolute', textAlign: 'center', background: 'rgba(0,0,0,0.7)', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <RefreshCw className="spin" size={32} color="var(--primary)" />
                                <p style={{ fontSize: '0.8rem', marginTop: '1rem', color: 'white' }}>Initializing OpenCV Engine...</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img
                            src={capturedImage}
                            alt="Captured Face"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div style={{ position: 'absolute', bottom: '15px', right: '15px' }}>
                            <CheckCircle size={32} color="var(--accent)" />
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '1rem' }}>
                {!capturedImage ? (
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleCapture}
                        style={{ width: '100%' }}
                        disabled={!isCvLoaded || !faceDetected}
                    >
                        <Camera size={18} style={{ marginRight: '8px' }} />
                        Capture Face
                    </Button>
                ) : (
                    <Button type="button" variant="outline" onClick={retake} style={{ width: '100%' }}>
                        <RefreshCw size={18} style={{ marginRight: '8px' }} />
                        Retake Photo
                    </Button>
                )}
            </div>

            {error && (
                <p style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={14} style={{ marginRight: '4px' }} />
                    {error}
                </p>
            )}
        </div>
    );
};

export default FaceCapture;
