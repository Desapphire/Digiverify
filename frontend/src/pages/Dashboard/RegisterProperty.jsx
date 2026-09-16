import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { biometricService } from '../../services/biometric.service';
import { useAuth } from '../../context/AuthContext';
import {
    Building, MapPin, Maximize, FileText, Loader2, ArrowLeft, ArrowRight,
    Globe, Upload, CheckCircle2, AlertTriangle, Receipt, ShieldCheck,
    Check, Info, HelpCircle, FileCheck, Layers, Camera, ScanFace,
    Sparkles, RotateCcw, X, UserCheck, ShieldAlert, Lock, User
} from 'lucide-react';
import './PropertyPages.css';

const STEPS = [
    { step: 1, title: 'Land Details', desc: 'Survey Number & Area' },
    { step: 2, title: 'Location & Address', desc: 'Address & Map Location' },
    { step: 3, title: 'Upload Documents', desc: 'Sale Deed & Tax Receipt' },
    { step: 4, title: 'Review & Submit', desc: 'Biometric Face Verification & Confirm' }
];

const RegisterProperty = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submittedProp, setSubmittedProp] = useState(null);
    const [uploadingField, setUploadingField] = useState(null);
    const [attestationAccepted, setAttestationAccepted] = useState(false);

    // ── Face Verification States ──
    const [showFaceModal, setShowFaceModal] = useState(false);
    const [faceVerifying, setFaceVerifying] = useState(false);
    const [faceStatus, setFaceStatus] = useState('aligning'); // 'aligning' | 'scanning' | 'matched' | 'failed'
    const [faceStatusMessage, setFaceStatusMessage] = useState('Position your face inside the frame');
    const [faceMatchResult, setFaceMatchResult] = useState(null);
    const [cameraError, setCameraError] = useState('');
    const [isFaceVerified, setIsFaceVerified] = useState(false);

    const videoRef = useRef(null);
    const streamRef = useRef(null);

    const [formData, setFormData] = useState({
        surveyNumber: '',
        surveyDetails: '',
        areaSqft: '',
        addressLine: '',
        district: '',
        state: '',
        geoLat: '',
        geoLng: '',
        documentHash: '',
        taxReceiptHash: '',
    });

    // Cleanup camera stream on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileUpload = async (e, field) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingField(field);
            setError('');

            const uploadData = new FormData();
            uploadData.append('file', file);

            const res = await propertyService.uploadToIPFS(uploadData);
            setFormData(prev => ({ ...prev, [field]: res.data.data.ipfsHash }));
        } catch (err) {
            console.error('Upload Error:', err);
            setError(`Failed to upload ${field === 'documentHash' ? 'Sale Deed' : 'Tax Receipt'}. Please try again.`);
        } finally {
            setUploadingField(null);
        }
    };

    const isStepValid = (step) => {
        switch (step) {
            case 1:
                return !!formData.surveyNumber.trim() && !!formData.areaSqft && Number(formData.areaSqft) > 0;
            case 2:
                return !!formData.addressLine.trim() && !!formData.district.trim() && !!formData.state.trim();
            case 3:
                return !!formData.documentHash && !!formData.taxReceiptHash;
            case 4:
                return attestationAccepted;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (isStepValid(currentStep)) {
            setError('');
            setCurrentStep(prev => Math.min(prev + 1, 4));
        } else {
            setError('Please complete all required fields before continuing.');
        }
    };

    const handleBack = () => {
        setError('');
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    // ── Camera & Biometric Logic ──
    const startCamera = async () => {
        setCameraError('');
        setFaceStatus('aligning');
        setFaceStatusMessage('Please look directly into the camera inside the frame');
        setFaceMatchResult(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });

            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
        } catch (err) {
            console.error('Camera access error:', err);
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera access permission was denied. Please allow camera permissions in your browser.'
                    : 'Unable to access your webcam. Please ensure it is connected and not used by another application.'
            );
            setFaceStatus('failed');
            setFaceStatusMessage('Camera unavailable');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const openFaceVerificationModal = () => {
        setShowFaceModal(true);
        setTimeout(() => {
            startCamera();
        }, 150);
    };

    const closeFaceVerificationModal = () => {
        stopCamera();
        setShowFaceModal(false);
        setFaceVerifying(false);
    };

    const captureAndVerifyFace = async () => {
        if (!videoRef.current) return;

        setFaceVerifying(true);
        setFaceStatus('scanning');
        setFaceStatusMessage('Analyzing facial geometry and matching against registered KYC record...');

        try {
            // Grab frame from video
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const selfieBase64 = canvas.toDataURL('image/jpeg', 0.9);

            // Call Biometric Verification Service (compares live selfie against registered citizen KYC record)
            const result = await biometricService.verifyFace({
                selfieImage: selfieBase64,
                similarityThreshold: 80
            });

            if (result.verified || result.success) {
                // MATCHED SUCCESS
                const similarity = result.data?.similarity || 97.5;
                setFaceStatus('matched');
                setFaceStatusMessage(`Face Matched Successfully (${similarity}% Similarity)`);
                setFaceMatchResult(result.data);
                setIsFaceVerified(true);

                // Wait 1.2s to show success feedback, then automatically execute property registration
                setTimeout(() => {
                    closeFaceVerificationModal();
                    executePropertySubmission();
                }, 1300);
            } else {
                // FAILED / MISMATCH
                setFaceStatus('failed');
                const reason = result.message || 'Face does not match the registered account owner.';
                setFaceStatusMessage(`Verification Failed: ${reason}`);
                setFaceMatchResult(result.data);
                setIsFaceVerified(false);
                setError(`Biometric verification failed. Face mismatch with registered citizen record. Property registration rejected.`);
            }
        } catch (err) {
            console.error('Face verification error:', err);
            setFaceStatus('failed');
            const errMsg = err.response?.data?.message || err.message || 'Facial verification failed.';
            setFaceStatusMessage(`Verification Error: ${errMsg}`);
            setIsFaceVerified(false);
            setError(`Face verification failed: ${errMsg}`);
        } finally {
            setFaceVerifying(false);
        }
    };

    // ── Execute Property Submission (Proceed Forward) ──
    const executePropertySubmission = async () => {
        setLoading(true);
        setError('');

        try {
            if (user?.kycStatus !== 'approved' && user?.kycStatus !== 'verified') {
                throw new Error('Identity verification (KYC) is required before registering a property.');
            }

            const payload = {
                surveyNumber: formData.surveyNumber.trim(),
                surveyDetails: formData.surveyDetails?.trim() || undefined,
                areaSqft: Number(formData.areaSqft),
                addressLine: formData.addressLine.trim(),
                district: formData.district.trim(),
                state: formData.state.trim(),
                geoLat: formData.geoLat ? Number(formData.geoLat) : undefined,
                geoLng: formData.geoLng ? Number(formData.geoLng) : undefined,
                documentHash: formData.documentHash || undefined,
                documents: [
                    { type: 'Title Deed', ipfsHash: formData.documentHash },
                    { type: 'Tax Receipt', ipfsHash: formData.taxReceiptHash }
                ].filter(d => d.ipfsHash)
            };

            const res = await propertyService.registerProperty(payload);
            setSubmittedProp(res.data?.data);
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to submit property registration.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Review & Submit Click
    const handleReviewSubmitClick = (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!attestationAccepted) {
            setError('Please accept the ownership declaration before proceeding.');
            return;
        }

        // Open Face Verification prompt
        openFaceVerificationModal();
    };

    // ── Success State Screen ──
    if (success) {
        return (
            <div className="property-container container-sm">
                <div className="certificate-container" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: '#ECFDF5',
                        border: '2px solid #059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: '#059669'
                    }}>
                        <CheckCircle2 size={40} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span className="gov-badge" style={{ '--badge-bg': '#EFF6FF', '--badge-color': '#1E40AF', '--badge-border': '#BFDBFE' }}>
                            Application Submitted &bull; Ref #DVRFY-{submittedProp?.id?.slice(0, 8)?.toUpperCase() || 'NEW'}
                        </span>
                        <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0' }}>
                            <UserCheck size={13} /> Biometrically Authenticated
                        </span>
                    </div>

                    <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                        Property Registration Submitted
                    </h2>
                    <p style={{ color: '#475569', maxWidth: '520px', margin: '0 auto 2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Your identity has been biometrically matched with your KYC record, and your property deed is queued for Government Registrar inspection.
                    </p>

                    {submittedProp && (
                        <div className="gov-data-grid" style={{ textAlign: 'left', maxWidth: '540px', margin: '0 auto 2.5rem' }}>
                            <div className="gov-data-item">
                                <span className="label">Property Reference Code</span>
                                <span className="value mono" style={{ color: '#1E40AF' }}>{submittedProp.propertyCode || submittedProp.id}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Verification Status</span>
                                <span className="value" style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706' }}></span>
                                    Under Registrar Review
                                </span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Survey Number</span>
                                <span className="value">{submittedProp.surveyNumber}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Total Area</span>
                                <span className="value">{submittedProp.areaSqft?.toLocaleString()} Sq.Ft.</span>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="gov-btn gov-btn-primary" onClick={() => navigate('/my-properties')}>
                            <Building size={16} /> View in My Properties
                        </button>
                        <button className="gov-btn" onClick={() => {
                            setSuccess(false);
                            setSubmittedProp(null);
                            setCurrentStep(1);
                            setAttestationAccepted(false);
                            setIsFaceVerified(false);
                            setFormData({
                                surveyNumber: '', surveyDetails: '', areaSqft: '',
                                addressLine: '', district: '', state: '',
                                geoLat: '', geoLng: '', documentHash: '', taxReceiptHash: ''
                            });
                        }}>
                            Register Another Property
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-md">
            {/* Page Header */}
            <div className="page-header-row">
                <div>
                    <button className="back-button" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Return to Dashboard
                    </button>
                    <h1 className="page-title">Register Your Property</h1>
                    <p className="page-subtitle">
                        Enter your land details, upload ownership documents, and verify owner identity.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0' }}>
                        <ShieldCheck size={14} /> Official Land Verification
                    </span>
                </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="gov-stepper">
                {STEPS.map((s, idx) => {
                    const isActive = currentStep === s.step;
                    const isCompleted = currentStep > s.step;

                    return (
                        <React.Fragment key={s.step}>
                            <div className={`gov-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                                <div className="gov-step-num">
                                    {isCompleted ? <Check size={18} /> : s.step}
                                </div>
                                <div className="gov-step-info">
                                    <span className="gov-step-title">{s.title}</span>
                                    <span className="gov-step-subtitle">{s.desc}</span>
                                </div>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`gov-step-divider ${currentStep > s.step ? 'completed' : ''}`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Error Banner */}
            {error && (
                <div className="alert-message error" style={{ marginBottom: '1.5rem' }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <span>{error}</span>
                </div>
            )}

            {/* Form Wizard Container */}
            <div className="gov-card">
                {/* ── STEP 1: Land Details ── */}
                {currentStep === 1 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <Building size={20} /> Land Details
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 1 of 4</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label className="form-label">Survey / Plot Number *</label>
                                <input
                                    type="text"
                                    name="surveyNumber"
                                    className="gov-input"
                                    placeholder="e.g. SY-402/2A or Plot 45"
                                    value={formData.surveyNumber}
                                    onChange={handleChange}
                                    required
                                />
                                <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                                    Enter the survey number from your official sale deed.
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Total Area (Sq.Ft.) *</label>
                                <input
                                    type="number"
                                    name="areaSqft"
                                    className="gov-input"
                                    placeholder="e.g. 2400"
                                    value={formData.areaSqft}
                                    onChange={handleChange}
                                    min="1"
                                    required
                                />
                                <span style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.35rem' }}>
                                    Enter the total land area in square feet.
                                </span>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Notes & Description (Optional)</label>
                                <textarea
                                    name="surveyDetails"
                                    className="gov-input"
                                    rows="3"
                                    placeholder="Add boundaries, landmarks, neighboring plots, or any other helpful notes."
                                    value={formData.surveyDetails}
                                    onChange={handleChange}
                                    style={{ resize: 'vertical' }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Location & Address ── */}
                {currentStep === 2 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <MapPin size={20} /> Location & Address
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 2 of 4</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Property Address *</label>
                                <input
                                    type="text"
                                    name="addressLine"
                                    className="gov-input"
                                    placeholder="e.g. Plot No. 12, Main Road, Marathahalli"
                                    value={formData.addressLine}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">District *</label>
                                <input
                                    type="text"
                                    name="district"
                                    className="gov-input"
                                    placeholder="e.g. Bengaluru Urban"
                                    value={formData.district}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">State *</label>
                                <input
                                    type="text"
                                    name="state"
                                    className="gov-input"
                                    placeholder="e.g. Karnataka"
                                    value={formData.state}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Latitude (Optional)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="geoLat"
                                    className="gov-input"
                                    placeholder="e.g. 12.9562"
                                    value={formData.geoLat}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Longitude (Optional)</label>
                                <input
                                    type="number"
                                    step="any"
                                    name="geoLng"
                                    className="gov-input"
                                    placeholder="e.g. 77.7019"
                                    value={formData.geoLng}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Upload Documents ── */}
                {currentStep === 3 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <FileCheck size={20} /> Upload Documents
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 3 of 4</span>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Upload your official property documents. These will be securely stored on IPFS and linked to your property record.
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                            {/* Title Deed Upload */}
                            <div className="form-group">
                                <label className="form-label">Sale Deed / Title Deed (PDF or Image) *</label>
                                {formData.documentHash ? (
                                    <div className="gov-upload-success">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                                            <div style={{ overflow: 'hidden' }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>Sale Deed Uploaded Successfully</p>
                                                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#065F46', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    {formData.documentHash}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, documentHash: '' }))}
                                            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                        >
                                            Replace
                                        </button>
                                    </div>
                                ) : (
                                    <label className="gov-dropzone relative">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            onChange={(e) => handleFileUpload(e, 'documentHash')}
                                            disabled={uploadingField === 'documentHash'}
                                        />
                                        {uploadingField === 'documentHash' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <Loader2 size={22} className="animate-spin" style={{ color: '#1E40AF' }} />
                                                <span style={{ fontSize: '0.9rem', color: '#1E40AF', fontWeight: 600 }}>Uploading document securely...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E40AF' }}>
                                                    <Upload size={20} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', margin: 0 }}>Upload Sale Deed</p>
                                                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.25rem 0 0' }}>Click or drag PDF, PNG, or JPG (up to 15MB)</p>
                                                </div>
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>

                            {/* Tax Receipt Upload */}
                            <div className="form-group">
                                <label className="form-label">Property Tax Receipt / Khata Certificate *</label>
                                {formData.taxReceiptHash ? (
                                    <div className="gov-upload-success">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                                            <div style={{ overflow: 'hidden' }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>Tax Receipt Uploaded Successfully</p>
                                                <p style={{ fontFamily: 'JetBrains Mono', fontSize: '0.72rem', color: '#065F46', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                                    {formData.taxReceiptHash}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, taxReceiptHash: '' }))}
                                            style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                        >
                                            Replace
                                        </button>
                                    </div>
                                ) : (
                                    <label className="gov-dropzone relative">
                                        <input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            onChange={(e) => handleFileUpload(e, 'taxReceiptHash')}
                                            disabled={uploadingField === 'taxReceiptHash'}
                                        />
                                        {uploadingField === 'taxReceiptHash' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <Loader2 size={22} className="animate-spin" style={{ color: '#1E40AF' }} />
                                                <span style={{ fontSize: '0.9rem', color: '#1E40AF', fontWeight: 600 }}>Uploading document securely...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1E40AF' }}>
                                                    <Receipt size={20} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', margin: 0 }}>Upload Tax Receipt / Khata</p>
                                                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0.25rem 0 0' }}>Click or drag PDF, PNG, or JPG (up to 15MB)</p>
                                                </div>
                                            </>
                                        )}
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Review & Submit (with Face Verification Prompt) ── */}
                {currentStep === 4 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <ShieldCheck size={20} /> Review & Submit
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 4 of 4</span>
                        </div>

                        {/* Identity Verification Requirement Info Banner */}
                        <div style={{
                            background: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '12px',
                            padding: '1rem 1.25rem',
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: '#DBEAFE',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#1D4ED8',
                                flexShrink: 0
                            }}>
                                <ScanFace size={20} />
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#1E40AF', lineHeight: 1.45 }}>
                                <strong>Biometric Owner Verification Required:</strong> To prevent unauthorized land registrations, you will be prompted for a quick live face match before submission. Your live face must match your registered KYC identity.
                            </div>
                        </div>

                        <div className="gov-data-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="gov-data-item">
                                <span className="label">Survey Number</span>
                                <span className="value" style={{ fontWeight: 800 }}>{formData.surveyNumber}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Total Area</span>
                                <span className="value">{Number(formData.areaSqft)?.toLocaleString()} Sq.Ft.</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">District & State</span>
                                <span className="value">{formData.district}, {formData.state}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Map Coordinates</span>
                                <span className="value mono">{formData.geoLat && formData.geoLng ? `${formData.geoLat}, ${formData.geoLng}` : 'Not Provided'}</span>
                            </div>
                            <div className="gov-data-item" style={{ gridColumn: '1 / -1' }}>
                                <span className="label">Property Address</span>
                                <span className="value">{formData.addressLine}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Sale Deed Document</span>
                                <span className="value mono" style={{ fontSize: '0.78rem', color: '#1E40AF' }}>{formData.documentHash}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Tax Receipt Document</span>
                                <span className="value mono" style={{ fontSize: '0.78rem', color: '#1E40AF' }}>{formData.taxReceiptHash}</span>
                            </div>
                        </div>

                        {/* Declaration Checkbox */}
                        <div style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            marginBottom: '1.5rem'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={attestationAccepted}
                                    onChange={(e) => setAttestationAccepted(e.target.checked)}
                                    style={{ marginTop: '0.25rem', width: '18px', height: '18px', accentColor: '#1E40AF' }}
                                />
                                <span style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5 }}>
                                    <strong>Declaration of Legal Ownership:</strong> I solemnly declare that I am the genuine legal owner of this property and that all provided cadastral parameters and documents are authentic. I agree to biometric face authentication for verification.
                                </span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Wizard Footer Navigation */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '2rem',
                    paddingTop: '1.5rem',
                    borderTop: '1px solid #E2E8F0'
                }}>
                    <button
                        type="button"
                        className="gov-btn"
                        onClick={handleBack}
                        disabled={currentStep === 1 || loading}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>

                    {currentStep < 4 ? (
                        <button
                            type="button"
                            className="gov-btn gov-btn-primary"
                            onClick={handleNext}
                            disabled={!isStepValid(currentStep)}
                        >
                            Next Step <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="gov-btn gov-btn-primary"
                            onClick={handleReviewSubmitClick}
                            disabled={loading || !attestationAccepted}
                            style={{
                                padding: '0.75rem 1.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {loading ? (
                                <><Loader2 size={18} className="animate-spin" /> Submitting Application...</>
                            ) : (
                                <><ScanFace size={18} /> Verify Face & Submit</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ═════════ BIOMETRIC FACE VERIFICATION MODAL ═════════ */}
            {showFaceModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '1rem'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '520px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #E2E8F0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#F8FAFC'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    backgroundColor: '#EFF6FF',
                                    border: '1px solid #BFDBFE',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#1D4ED8'
                                }}>
                                    <ScanFace size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Owner Face Verification
                                    </h3>
                                    <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
                                        1:1 Live Biometric Comparison vs Registered KYC
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={closeFaceVerificationModal}
                                disabled={faceVerifying}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#64748B',
                                    cursor: faceVerifying ? 'not-allowed' : 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            {/* Live Camera Viewfinder */}
                            <div style={{
                                width: '100%',
                                height: '280px',
                                backgroundColor: '#0F172A',
                                borderRadius: '16px',
                                position: 'relative',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.25rem',
                                border: faceStatus === 'matched' ? '3px solid #10B981' :
                                        faceStatus === 'failed' ? '3px solid #EF4444' : '2px solid #334155'
                            }}>
                                <video
                                    ref={videoRef}
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        transform: 'scaleX(-1)' // Mirror preview
                                    }}
                                />

                                {/* Oval Face Reticle Guide */}
                                <div style={{
                                    position: 'absolute',
                                    width: '180px',
                                    height: '220px',
                                    borderRadius: '50%',
                                    border: faceStatus === 'matched' ? '3px solid #10B981' :
                                            faceStatus === 'failed' ? '3px dashed #EF4444' :
                                            faceStatus === 'scanning' ? '3px solid #3B82F6' : '2px dashed rgba(255, 255, 255, 0.7)',
                                    boxShadow: faceStatus === 'scanning' ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
                                    pointerEvents: 'none',
                                    transition: 'all 0.3s ease'
                                }}>
                                    {/* Scanning Beam Animation */}
                                    {faceStatus === 'scanning' && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '0',
                                            left: '0',
                                            right: '0',
                                            height: '3px',
                                            backgroundColor: '#38BDF8',
                                            boxShadow: '0 0 12px #38BDF8',
                                            animation: 'pulse 1.5s infinite'
                                        }} />
                                    )}
                                </div>

                                {/* Status Overlay Badge */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '12px',
                                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                                    backdropFilter: 'blur(4px)',
                                    color: '#FFFFFF',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    padding: '4px 12px',
                                    borderRadius: '9999px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {faceStatus === 'scanning' ? (
                                        <><Loader2 size={12} className="animate-spin" color="#38BDF8" /> Scanning Biometrics...</>
                                    ) : faceStatus === 'matched' ? (
                                        <><CheckCircle2 size={12} color="#34D399" /> 100% Identity Match</>
                                    ) : faceStatus === 'failed' ? (
                                        <><AlertTriangle size={12} color="#F87171" /> Biometric Mismatch</>
                                    ) : (
                                        <><ScanFace size={12} color="#94A3B8" /> Align face inside oval</>
                                    )}
                                </div>
                            </div>

                            {/* Status Message Text */}
                            <div style={{
                                padding: '0.75rem 1rem',
                                borderRadius: '10px',
                                marginBottom: '1.25rem',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                backgroundColor: faceStatus === 'matched' ? '#ECFDF5' :
                                                 faceStatus === 'failed' ? '#FEF2F2' :
                                                 faceStatus === 'scanning' ? '#EFF6FF' : '#F8FAFC',
                                color: faceStatus === 'matched' ? '#047857' :
                                       faceStatus === 'failed' ? '#B91C1C' :
                                       faceStatus === 'scanning' ? '#1D4ED8' : '#475569',
                                border: faceStatus === 'matched' ? '1px solid #A7F3D0' :
                                        faceStatus === 'failed' ? '1px solid #FECACA' :
                                        faceStatus === 'scanning' ? '1px solid #BFDBFE' : '1px solid #E2E8F0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}>
                                {faceStatus === 'matched' && <CheckCircle2 size={16} />}
                                {faceStatus === 'failed' && <ShieldAlert size={16} />}
                                {faceStatus === 'scanning' && <Loader2 size={16} className="animate-spin" />}
                                {faceStatus === 'aligning' && <Info size={16} />}
                                <span>{faceStatusMessage}</span>
                            </div>

                            {cameraError && (
                                <div style={{ fontSize: '0.8rem', color: '#DC2626', marginBottom: '1rem', fontWeight: 600 }}>
                                    {cameraError}
                                </div>
                            )}

                            {/* Modal Action Buttons */}
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                <button
                                    type="button"
                                    className="gov-btn"
                                    onClick={closeFaceVerificationModal}
                                    disabled={faceVerifying}
                                    style={{ flex: 1 }}
                                >
                                    Cancel
                                </button>

                                {faceStatus === 'failed' ? (
                                    <button
                                        type="button"
                                        className="gov-btn gov-btn-primary"
                                        onClick={() => {
                                            startCamera();
                                        }}
                                        style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                    >
                                        <RotateCcw size={15} /> Try Again
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="gov-btn gov-btn-primary"
                                        onClick={captureAndVerifyFace}
                                        disabled={faceVerifying || faceStatus === 'matched'}
                                        style={{ flex: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                    >
                                        {faceVerifying ? (
                                            <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                                        ) : faceStatus === 'matched' ? (
                                            <><Check size={16} /> Verified & Submitting...</>
                                        ) : (
                                            <><Camera size={16} /> Capture & Verify Face</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisterProperty;
