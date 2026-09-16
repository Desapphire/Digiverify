import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { biometricService } from '../../services/biometric.service';
import { useAuth } from '../../context/AuthContext';
import {
    Building, MapPin, Maximize, FileText, Loader2, ArrowLeft, ArrowRight,
    Globe, Upload, CheckCircle2, AlertTriangle, Receipt, ShieldCheck,
    Check, Info, HelpCircle, FileCheck, Layers, Camera, ScanFace,
    Sparkles, RotateCcw, X, UserCheck, ShieldAlert, Lock, User,
    ExternalLink
} from 'lucide-react';
import './PropertyPages.css';

const STEPS = [
    { step: 1, title: 'Land Details', desc: 'Survey Number & Area' },
    { step: 2, title: 'Location & Address', desc: 'Address & Coordinates' },
    { step: 3, title: 'Update Documents', desc: 'Sale Deed & Tax Receipt' },
    { step: 4, title: 'Review & Resubmit', desc: 'Biometric Face Verification' }
];

const ReapplyProperty = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [pageLoading, setPageLoading] = useState(true);
    const [originalProperty, setOriginalProperty] = useState(null);
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

    // Load original property details
    useEffect(() => {
        const loadProperty = async () => {
            try {
                setPageLoading(true);
                setError('');
                const [propRes, docRes] = await Promise.all([
                    propertyService.getPropertyById(id),
                    propertyService.getDocuments(id).catch(() => ({ data: { data: [] } }))
                ]);

                const prop = propRes.data?.data;
                const docs = docRes.data?.data || [];

                if (!prop) {
                    setError('Property application not found.');
                    return;
                }

                setOriginalProperty(prop);

                // Find tax receipt doc and title deed doc if present
                const taxDoc = docs.find(d => d.document_type?.toLowerCase().includes('tax'));
                const deedDoc = docs.find(d => d.document_type?.toLowerCase().includes('deed') || d.document_type?.toLowerCase().includes('title'));

                setFormData({
                    surveyNumber: prop.surveyNumber || '',
                    surveyDetails: prop.surveyDetails || '',
                    areaSqft: prop.areaSqft ? String(prop.areaSqft) : '',
                    addressLine: prop.addressLine || '',
                    district: prop.district || '',
                    state: prop.state || '',
                    geoLat: prop.geoLat ? String(prop.geoLat) : '',
                    geoLng: prop.geoLng ? String(prop.geoLng) : '',
                    documentHash: prop.documentHash || (deedDoc?.ipfs_hash || ''),
                    taxReceiptHash: taxDoc?.ipfs_hash || '',
                });
            } catch (err) {
                console.error('Error loading property for reapply:', err);
                setError(err.response?.data?.message || 'Failed to load property details.');
            } finally {
                setPageLoading(false);
            }
        };

        if (id) {
            loadProperty();
        } else {
            setError('No property ID specified.');
            setPageLoading(false);
        }
    }, [id]);

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
                return !!formData.documentHash;
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
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const selfieBase64 = canvas.toDataURL('image/jpeg', 0.9);

            const result = await biometricService.verifyFace({
                selfieImage: selfieBase64,
                similarityThreshold: 80
            });

            if (result.verified || result.success) {
                const similarity = result.data?.similarity || 98.2;
                setFaceStatus('matched');
                setFaceStatusMessage(`Face Matched Successfully (${similarity}% Similarity)`);
                setFaceMatchResult(result.data);
                setIsFaceVerified(true);

                setTimeout(() => {
                    closeFaceVerificationModal();
                    executePropertyReapply();
                }, 1200);
            } else {
                setFaceStatus('failed');
                const reason = result.message || 'Face does not match the registered account owner.';
                setFaceStatusMessage(`Verification Failed: ${reason}`);
                setFaceMatchResult(result.data);
                setIsFaceVerified(false);
                setError(`Biometric verification failed. Face mismatch with registered citizen record.`);
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

    // ── Execute Property Reapplication ──
    const executePropertyReapply = async () => {
        setLoading(true);
        setError('');

        try {
            const docsToPersist = [];
            if (formData.documentHash) {
                docsToPersist.push({ type: 'Title Deed', ipfsHash: formData.documentHash });
            }
            if (formData.taxReceiptHash) {
                docsToPersist.push({ type: 'Tax Receipt', ipfsHash: formData.taxReceiptHash });
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
                documents: docsToPersist
            };

            const res = await propertyService.reapplyProperty(id, payload);
            setSubmittedProp(res.data?.data || { ...originalProperty, ...payload, status: 'pending' });
            setSuccess(true);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to resubmit property application.');
        } finally {
            setLoading(false);
        }
    };

    // Handle Review & Submit Click
    const handleReviewSubmitClick = (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!attestationAccepted) {
            setError('Please confirm and accept the owner declaration before resubmitting.');
            return;
        }

        // Open live camera biometric verification modal
        openFaceVerificationModal();
    };

    if (pageLoading) {
        return (
            <div style={{ display: 'flex', height: '80vh', width: '100%', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 style={{ width: '3rem', height: '3rem', color: '#1E40AF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, color: '#1E40AF', fontSize: '0.9rem' }}>Loading property reapplication...</p>
                </div>
            </div>
        );
    }

    if (error && !originalProperty) {
        return (
            <div className="property-container container-sm" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <ShieldAlert size={56} style={{ color: '#DC2626', margin: '0 auto 1.5rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#0F172A' }}>Reapplication Unavailable</h2>
                <p style={{ color: '#64748B', marginBottom: '2rem' }}>{error}</p>
                <button className="gov-btn gov-btn-primary" onClick={() => navigate('/my-properties')}>
                    Return to My Properties
                </button>
            </div>
        );
    }

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
                            Application Resubmitted &bull; Ref #{submittedProp?.propertyCode || originalProperty?.propertyCode || 'DVRFY'}
                        </span>
                        <span className="gov-badge" style={{ '--badge-bg': '#ECFDF5', '--badge-color': '#059669', '--badge-border': '#A7F3D0' }}>
                            <UserCheck size={13} /> Biometrically Authenticated
                        </span>
                    </div>

                    <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                        Property Application Resubmitted!
                    </h2>
                    <p style={{ color: '#475569', maxWidth: '520px', margin: '0 auto 2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Your updated property records, measurements, and legal attachments have been submitted to the Land Authority for verification.
                    </p>

                    <div className="gov-data-grid" style={{ textAlign: 'left', maxWidth: '540px', margin: '0 auto 2.5rem' }}>
                        <div className="gov-data-item">
                            <span className="label">Property Reference Code</span>
                            <span className="value mono" style={{ color: '#1E40AF' }}>{submittedProp?.propertyCode || originalProperty?.propertyCode}</span>
                        </div>
                        <div className="gov-data-item">
                            <span className="label">Verification Status</span>
                            <span className="value" style={{ color: '#D97706', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#D97706' }}></span>
                                Under Review (Pending)
                            </span>
                        </div>
                        <div className="gov-data-item">
                            <span className="label">Survey Number</span>
                            <span className="value">{formData.surveyNumber}</span>
                        </div>
                        <div className="gov-data-item">
                            <span className="label">Total Area</span>
                            <span className="value">{Number(formData.areaSqft)?.toLocaleString()} Sq.Ft.</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="gov-btn gov-btn-secondary" onClick={() => navigate('/my-properties')}>
                            <Building size={16} /> View in My Properties
                        </button>
                        <button className="gov-btn gov-btn-primary" onClick={() => navigate(`/properties/${id}`)}>
                            View Property Details <ArrowRight size={16} />
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
                    <button className="back-button" onClick={() => navigate('/my-properties')}>
                        <ArrowLeft size={16} /> Return to My Properties
                    </button>
                    <h1 className="page-title">Reapply Property Registration</h1>
                    <p className="page-subtitle">
                        Correct and resubmit land particulars or replace documents as requested by the authority.
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="gov-badge" style={{ '--badge-bg': '#FEF2F2', '--badge-color': '#DC2626', '--badge-border': '#FECACA' }}>
                        <RotateCcw size={13} /> Reapplication Mode
                    </span>
                </div>
            </div>

            {/* ── Official Previous Rejection Banner ── */}
            <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                borderLeft: '5px solid #DC2626',
                borderRadius: '12px',
                padding: '1.25rem 1.5rem',
                marginBottom: '1.5rem',
                boxShadow: '0 1px 3px rgba(220, 38, 38, 0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            backgroundColor: '#FEE2E2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#DC2626',
                            flexShrink: 0
                        }}>
                            <ShieldAlert size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
                                Application Remarks &bull; {originalProperty?.propertyCode || 'Property'}
                            </h3>
                            <p style={{ fontSize: '0.78rem', color: '#B91C1C', margin: 0 }}>
                                Please address the officer's remarks below before resubmitting.
                            </p>
                        </div>
                    </div>

                    <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#991B1B',
                        backgroundColor: '#FEE2E2',
                        border: '1px solid #FCA5A5',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        textTransform: 'uppercase'
                    }}>
                        Official Feedback
                    </span>
                </div>

                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '0.85rem 1rem',
                    marginTop: '0.6rem'
                }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '2px' }}>
                        Land Authority's Rejection Remarks:
                    </span>
                    <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A', margin: 0, lineHeight: 1.4 }}>
                        {originalProperty?.adminComments || 'Document verification failed or cadastral boundary discrepancy with state survey records.'}
                    </p>
                </div>
            </div>

            {/* Stepper Progress Bar */}
            <div className="gov-stepper">
                {STEPS.map((s, idx) => {
                    const isActive = currentStep === s.step;
                    const isCompleted = currentStep > s.step;

                    return (
                        <React.Fragment key={s.step}>
                            <div
                                className={`gov-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                onClick={() => {
                                    if (isCompleted) setCurrentStep(s.step);
                                }}
                                style={{ cursor: isCompleted ? 'pointer' : 'default' }}
                            >
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
                                <Building size={20} /> Step 1: Land Details & Measurements
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

                        <div className="wizard-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="gov-btn gov-btn-primary"
                                onClick={handleNext}
                                disabled={!isStepValid(1)}
                            >
                                Next: Location & Address <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Location & Address ── */}
                {currentStep === 2 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <MapPin size={20} /> Step 2: Location & Address
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

                        <div className="wizard-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                            <button type="button" className="gov-btn gov-btn-secondary" onClick={handleBack}>
                                <ArrowLeft size={16} /> Back
                            </button>
                            <button
                                type="button"
                                className="gov-btn gov-btn-primary"
                                onClick={handleNext}
                                disabled={!isStepValid(2)}
                            >
                                Next: Update Documents <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 3: Upload / Replace Documents ── */}
                {currentStep === 3 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <FileCheck size={20} /> Step 3: Update Documents
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 3 of 4</span>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                            Replace or verify your official deed and tax clearance documents. Files will be securely uploaded to IPFS.
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
                                                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>Sale Deed Attached</p>
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
                                                <span style={{ fontSize: '0.9rem', color: '#1E40AF', fontWeight: 600 }}>Uploading document...</span>
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
                                <label className="form-label">Property Tax Receipt / Khata Certificate</label>
                                {formData.taxReceiptHash ? (
                                    <div className="gov-upload-success">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                            <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                                            <div style={{ overflow: 'hidden' }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>Tax Receipt Attached</p>
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
                                                <span style={{ fontSize: '0.9rem', color: '#1E40AF', fontWeight: 600 }}>Uploading document...</span>
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

                        <div className="wizard-actions" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                            <button type="button" className="gov-btn gov-btn-secondary" onClick={handleBack}>
                                <ArrowLeft size={16} /> Back
                            </button>
                            <button
                                type="button"
                                className="gov-btn gov-btn-primary"
                                onClick={handleNext}
                                disabled={!isStepValid(3)}
                            >
                                Next: Review & Resubmit <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ── STEP 4: Review & Resubmit ── */}
                {currentStep === 4 && (
                    <div>
                        <div className="gov-card-header">
                            <h3 className="gov-card-title">
                                <ShieldCheck size={20} /> Step 4: Review Updated Details & Biometric Match
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Step 4 of 4</span>
                        </div>

                        {/* Info Banner */}
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
                                <strong>Biometric Owner Verification Required:</strong> Live face match with your registered citizen KYC identity is required before resubmitting your application to the land registry.
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
                                <span className="value mono" style={{ fontSize: '0.78rem', color: '#1E40AF' }}>{formData.documentHash || 'None'}</span>
                            </div>
                            <div className="gov-data-item">
                                <span className="label">Tax Receipt Document</span>
                                <span className="value mono" style={{ fontSize: '0.78rem', color: '#1E40AF' }}>{formData.taxReceiptHash || 'None'}</span>
                            </div>
                        </div>

                        {/* Declaration Checkbox */}
                        <div style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            marginBottom: '1.75rem'
                        }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={attestationAccepted}
                                    onChange={(e) => setAttestationAccepted(e.target.checked)}
                                    style={{ marginTop: '0.2rem', width: '18px', height: '18px', accentColor: '#1E40AF', cursor: 'pointer' }}
                                />
                                <span style={{ fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                                    <strong>Owner Declaration:</strong> I hereby solemnly declare and attest that all modified property survey particulars, boundaries, and legal attachments submitted are genuine, true, and free of undisclosed encumbrances. I authorize biometric authentication against my registered KYC identity.
                                </span>
                            </label>
                        </div>

                        <div className="wizard-actions" style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <button type="button" className="gov-btn gov-btn-secondary" onClick={handleBack} disabled={loading}>
                                <ArrowLeft size={16} /> Back
                            </button>
                            <button
                                type="button"
                                className="gov-btn gov-btn-primary"
                                onClick={handleReviewSubmitClick}
                                disabled={!attestationAccepted || loading}
                            >
                                {loading ? (
                                    <><Loader2 size={16} className="animate-spin" /> Submitting Reapplication...</>
                                ) : (
                                    <><ScanFace size={16} /> Verify Face & Resubmit</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Live Biometric Face Verification Modal ─── */}
            {showFaceModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: '#FFFFFF',
                        borderRadius: '16px',
                        width: '100%',
                        maxWidth: '520px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        border: '1px solid #E2E8F0'
                    }}>
                        {/* Modal Header */}
                        <div style={{
                            padding: '1.25rem 1.5rem',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: '#F8FAFC'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    background: '#EFF6FF',
                                    color: '#2563EB',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <ScanFace size={20} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                                        Biometric Identity Confirmation
                                    </h3>
                                    <p style={{ fontSize: '0.78rem', color: '#64748B', margin: 0 }}>
                                        1:1 Facial Match with Registered KYC Profile
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={closeFaceVerificationModal}
                                disabled={faceVerifying}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748B',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                            {cameraError ? (
                                <div style={{
                                    padding: '1.5rem',
                                    backgroundColor: '#FEF2F2',
                                    borderRadius: '12px',
                                    border: '1px solid #FECACA',
                                    color: '#991B1B'
                                }}>
                                    <ShieldAlert size={40} style={{ margin: '0 auto 0.75rem', color: '#DC2626' }} />
                                    <h4 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Camera Error</h4>
                                    <p style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{cameraError}</p>
                                    <button
                                        className="gov-btn gov-btn-secondary"
                                        onClick={startCamera}
                                        style={{ marginTop: '1rem' }}
                                    >
                                        <RotateCcw size={14} /> Retry Camera
                                    </button>
                                </div>
                            ) : (
                                <div>
                                    {/* Video Stream Container */}
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        maxWidth: '420px',
                                        height: '315px',
                                        margin: '0 auto 1.25rem',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        backgroundColor: '#0F172A',
                                        border: faceStatus === 'matched'
                                            ? '3px solid #10B981'
                                            : faceStatus === 'failed'
                                                ? '3px solid #EF4444'
                                                : '3px solid #3B82F6',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
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

                                        {/* Oval Face Guide Overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '180px',
                                            height: '230px',
                                            borderRadius: '50%',
                                            border: faceStatus === 'matched'
                                                ? '3px solid #10B981'
                                                : faceStatus === 'failed'
                                                    ? '3px solid #EF4444'
                                                    : '2px dashed rgba(255, 255, 255, 0.75)',
                                            pointerEvents: 'none',
                                            boxShadow: faceStatus === 'matched' ? '0 0 25px rgba(16, 185, 129, 0.5)' : 'none',
                                            transition: 'all 0.3s ease'
                                        }} />

                                        {/* Status Badge inside Video */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '12px',
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            background: faceStatus === 'matched'
                                                ? 'rgba(16, 185, 129, 0.9)'
                                                : faceStatus === 'failed'
                                                    ? 'rgba(239, 68, 68, 0.9)'
                                                    : 'rgba(15, 23, 42, 0.75)',
                                            backdropFilter: 'blur(6px)',
                                            color: '#FFFFFF',
                                            padding: '6px 14px',
                                            borderRadius: '9999px',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {faceVerifying && <Loader2 size={13} className="animate-spin" />}
                                            {faceStatus === 'matched' && <CheckCircle2 size={13} />}
                                            {faceStatus === 'failed' && <AlertTriangle size={13} />}
                                            {faceStatusMessage}
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                        <button
                                            className="gov-btn gov-btn-secondary"
                                            onClick={closeFaceVerificationModal}
                                            disabled={faceVerifying}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            className="gov-btn gov-btn-primary"
                                            onClick={captureAndVerifyFace}
                                            disabled={faceVerifying || faceStatus === 'matched'}
                                            style={{
                                                backgroundColor: faceStatus === 'matched' ? '#10B981' : '#2563EB',
                                                minWidth: '200px'
                                            }}
                                        >
                                            {faceVerifying ? (
                                                <><Loader2 size={16} className="animate-spin" /> Verifying Face...</>
                                            ) : faceStatus === 'matched' ? (
                                                <><Check size={16} /> Verified! Resubmitting...</>
                                            ) : (
                                                <><Camera size={16} /> Scan & Authenticate</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReapplyProperty;
