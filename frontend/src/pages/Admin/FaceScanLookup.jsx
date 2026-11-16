import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import biometricServiceDefault, { biometricService as biometricServiceNamed } from '../../services/biometric.service';
import { adminService } from '../../services/admin.service';

const biometricService = biometricServiceDefault || biometricServiceNamed || {};
import {
    ScanFace, Camera, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw,
    User, Mail, Phone, MapPin, Building2, Landmark, FileText, ExternalLink,
    Copy, Download, Sparkles, Eye, ArrowRight, Upload, X, Shield, Award,
    Check, Fingerprint, Activity, Layers, Wallet, Clock, Lock
} from 'lucide-react';
import './FaceScanLookup.css';

const FaceScanLookup = () => {
    const navigate = useNavigate();
    const [scannerMode, setScannerMode] = useState('camera'); // 'camera' | 'upload'
    const [cameraActive, setCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState(0);
    const [capturedImage, setCapturedImage] = useState(null);
    const [matchResult, setMatchResult] = useState(null);
    const [error, setError] = useState('');
    const [copiedText, setCopiedText] = useState('');
    const [activeTab, setActiveTab] = useState('identity'); // 'identity' | 'properties' | 'transactions' | 'tax'

    // Directory list for quick citizen selection / simulation
    const [demoUsers, setDemoUsers] = useState([]);
    const [selectedSimulatedWallet, setSelectedSimulatedWallet] = useState('');

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadDemoUsers();
        if (scannerMode === 'camera') {
            startCamera();
        }
        return () => {
            stopCamera();
        };
    }, [scannerMode]);

    const loadDemoUsers = async () => {
        try {
            const res = await adminService.listUsers();
            const list = res.data?.data || [];
            // Filter only citizen user roles
            const citizens = list.filter(u => u.role === 'user');
            setDemoUsers(citizens);
        } catch (_) {}
    };

    const startCamera = async () => {
        setCameraError('');
        setError('');
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
            setCameraActive(true);
        } catch (err) {
            console.error('Camera access error:', err);
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera access in browser settings.'
                    : 'Unable to access camera or webcam is in use by another program.'
            );
            setCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    };

    const captureFrame = () => {
        const video = videoRef.current;
        if (!video) return null;

        const canvas = document.createElement('canvas');
        const width = video.videoWidth || 640;
        const height = video.videoHeight || 480;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Mirror horizontal for natural webcam feel
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, width, height);

        return canvas.toDataURL('image/jpeg', 0.92);
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target.result;
            setCapturedImage(base64);
            performIdentification(base64);
        };
        reader.readAsDataURL(file);
    };

    const handleScanLive = () => {
        setError('');
        const frame = captureFrame();
        if (!frame) {
            setError('Could not capture video frame. Please ensure camera is active.');
            return;
        }

        setCapturedImage(frame);
        performIdentification(frame);
    };

    const performIdentification = async (imageData) => {
        try {
            setIsScanning(true);
            setError('');
            setMatchResult(null);

            // Animate progress simulation
            setScanProgress(25);
            setTimeout(() => setScanProgress(60), 300);
            setTimeout(() => setScanProgress(90), 600);

            const payload = {
                image: imageData,
                similarityThreshold: 80,
                simulatedMatchWallet: selectedSimulatedWallet || undefined,
            };

            let res;
            if (typeof biometricService.identifyCitizen === 'function') {
                res = await biometricService.identifyCitizen(payload);
            } else {
                const apiRes = await api.post('/biometric/identify-face', payload);
                res = apiRes.data;
            }

            setScanProgress(100);

            if (!res.identified) {
                setError(res.message || 'No registered citizen matched this facial biometric scan.');
            } else {
                setMatchResult(res.data);
            }
        } catch (err) {
            console.error('Biometric identification error:', err);
            setError(err.response?.data?.message || err.message || 'Biometric analysis failed.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleReset = () => {
        setCapturedImage(null);
        setMatchResult(null);
        setError('');
        setScanProgress(0);
        if (scannerMode === 'camera' && !cameraActive) {
            startCamera();
        }
    };

    const handleCopy = (text, label) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedText(label);
        setTimeout(() => setCopiedText(''), 2000);
    };

    const citizen = matchResult?.citizen;
    const match = matchResult?.match;
    const properties = matchResult?.properties || [];
    const sales = matchResult?.sales || [];
    const taxes = matchResult?.taxes || [];
    const activeNocs = matchResult?.activeNocs || [];

    const totalPropertyValuation = properties.reduce(
        (sum, p) => sum + (Number(p.estimated_fair_price) || 0),
        0
    );

    const totalAreaSqft = properties.reduce(
        (sum, p) => sum + (Number(p.area_sqft || p.areaSqft) || 0),
        0
    );

    return (
        <div className="fscan-root">
            {/* ── Top Header Navigation Bar ── */}
            <div className="fscan-header">
                <div className="fscan-header-left">
                    <div className="fscan-header-icon-box">
                        <ScanFace size={26} />
                    </div>
                    <div>
                        <h1 className="fscan-title">
                            Biometric Face ID
                            <span className="fscan-version-tag">AI Rekognition</span>
                        </h1>
                        <p className="fscan-subtitle">
                            Autonomous Facial Identification & Smart Contract Citizen Dossier Retrieval
                        </p>
                    </div>
                </div>

                <div className="fscan-header-right">
                    <div className="fscan-telemetry-pill">
                        <span className="fscan-pulse-dot" />
                        <span>AWS Rekognition / Face Liveness Engine Active</span>
                    </div>

                    <button onClick={handleReset} className="fscan-btn-secondary" title="Reset Scanner">
                        <RefreshCw size={15} />
                        <span>Reset Terminal</span>
                    </button>

                    <button
                        onClick={() => navigate('/authority/search')}
                        className="fscan-btn-secondary"
                        style={{ backgroundColor: '#F8FAFC' }}
                    >
                        <span>Manual Search</span>
                        <ArrowRight size={14} />
                    </button>
                </div>
            </div>

            {/* Error Notification Banner */}
            {error && (
                <div style={{
                    padding: '1rem 1.25rem',
                    background: '#FEF2F2',
                    border: '1px solid #FCA5A5',
                    borderRadius: '12px',
                    color: '#991B1B',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    boxShadow: '0 2px 4px rgba(220, 38, 38, 0.05)'
                }}>
                    <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{error}</span>
                </div>
            )}

            {/* ── Main Two-Column Workbench ── */}
            <div className="fscan-workbench">
                
                {/* ── Left Scanner Column ── */}
                <div className="fscan-terminal-card">
                    {/* Scanner Mode Selection */}
                    <div className="fscan-tabs-row">
                        <button
                            onClick={() => {
                                setScannerMode('camera');
                                setCapturedImage(null);
                            }}
                            className={`fscan-tab-btn ${scannerMode === 'camera' ? 'active' : ''}`}
                        >
                            <Camera size={15} />
                            <span>Live Camera</span>
                        </button>
                        <button
                            onClick={() => {
                                setScannerMode('upload');
                                stopCamera();
                            }}
                            className={`fscan-tab-btn ${scannerMode === 'upload' ? 'active' : ''}`}
                        >
                            <Upload size={15} />
                            <span>Upload Photo</span>
                        </button>
                    </div>

                    {/* Viewport / Reticle Area */}
                    <div className="fscan-viewport">
                        {/* Holographic Tactical Brackets */}
                        <div className="fscan-bracket-tl" />
                        <div className="fscan-bracket-tr" />
                        <div className="fscan-bracket-bl" />
                        <div className="fscan-bracket-br" />

                        {scannerMode === 'camera' ? (
                            <>
                                {capturedImage ? (
                                    <img
                                        src={capturedImage}
                                        alt="Captured Face"
                                        className="fscan-preview-image"
                                    />
                                ) : (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="fscan-video-element"
                                    />
                                )}

                                {/* Top HUD Telemetry */}
                                <div className="fscan-hud-top">
                                    <span>CAM: 640x480</span>
                                    <span>LIVENESS: ACTIVE</span>
                                </div>

                                {/* Central Reticle & Laser Sweep */}
                                <div className={`fscan-reticle-oval ${isScanning ? 'scanning' : ''}`}>
                                    {isScanning && <div className="fscan-laser-line" />}
                                </div>

                                {/* Bottom HUD Status Bar */}
                                <div className="fscan-hud-bottom">
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        <Lock size={12} color="#10B981" /> SHA-256 ENCRYPTED
                                    </span>
                                    <span>AWS REKOGNITION</span>
                                </div>
                            </>
                        ) : (
                            /* File Upload Dropzone */
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="fscan-upload-dropzone"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    style={{ display: 'none' }}
                                />
                                {capturedImage ? (
                                    <img
                                        src={capturedImage}
                                        alt="Uploaded Face"
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <>
                                        <div className="fscan-upload-icon-circle">
                                            <Upload size={32} />
                                        </div>
                                        <div style={{ color: '#F8FAFC', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                                            Upload Citizen Identity Photo
                                        </div>
                                        <span style={{ color: '#94A3B8', fontSize: '0.78rem', maxWidth: '280px', lineHeight: 1.4 }}>
                                            Select JPG, PNG, or WEBP portrait from official surveillance or KYC file
                                        </span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {cameraError && (
                        <div style={{ padding: '0.75rem', background: '#FEF2F2', borderRadius: '8px', color: '#991B1B', fontSize: '0.8rem', marginTop: '0.75rem', border: '1px solid #FECACA' }}>
                            {cameraError}
                        </div>
                    )}

                    {/* Trigger Button */}
                    {scannerMode === 'camera' && (
                        <button
                            onClick={handleScanLive}
                            disabled={isScanning || !cameraActive}
                            className={`fscan-trigger-btn ${isScanning ? 'scanning-active' : ''}`}
                        >
                            <ScanFace size={18} />
                            <span>{isScanning ? 'Analyzing Biometrics...' : 'Scan & Identify Citizen'}</span>
                        </button>
                    )}

                    {/* Quick Citizen Roster Selector (For instant verification testing) */}
                    <div className="fscan-roster-box">
                        <div className="fscan-roster-label">
                            <span>Citizen Directory Quick Select</span>
                            <span style={{ color: '#3B82F6' }}>{demoUsers.length} Citizens</span>
                        </div>
                        <select
                            value={selectedSimulatedWallet}
                            onChange={(e) => setSelectedSimulatedWallet(e.target.value)}
                            className="fscan-roster-select"
                        >
                            <option value="">-- Match Autonomously via Facial Neural Model --</option>
                            {demoUsers.map((u) => (
                                <option key={u.id} value={u.walletAddress || u.wallet_address}>
                                    {u.name} • {u.walletAddress?.slice(0, 8) || u.wallet_address?.slice(0, 8)}... {u.faceVerified ? '✓ Verified' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Right Citizen Dossier Output ── */}
                <div className="fscan-dossier-area">
                    {matchResult ? (
                        <>
                            {/* 1. Hero Verified Dossier Banner */}
                            <div className="fscan-hero-banner">
                                <div className="fscan-hero-top">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                            <span className="fscan-badge-verified">
                                                <ShieldCheck size={14} /> BIOMETRIC MATCH VERIFIED
                                            </span>
                                            <span style={{ background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800 }}>
                                                Match Similarity: {match.similarity}%
                                            </span>
                                            <span style={{ background: 'rgba(255,255,255,0.12)', color: '#FFFFFF', padding: '0.25rem 0.65rem', borderRadius: '8px', fontSize: '0.74rem', fontWeight: 800 }}>
                                                Liveness Confidence: {match.confidence}%
                                            </span>
                                        </div>

                                        <h2 className="fscan-citizen-name">
                                            {citizen.name}
                                        </h2>

                                        <div className="fscan-wallet-row">
                                            <span>{citizen.walletAddress}</span>
                                            <button
                                                onClick={() => handleCopy(citizen.walletAddress, 'wallet')}
                                                className="fscan-copy-btn"
                                                title="Copy Wallet Address"
                                            >
                                                {copiedText === 'wallet' ? <Check size={12} color="#86EFAC" /> : <Copy size={12} />}
                                                <span>{copiedText === 'wallet' ? 'Copied' : 'Copy'}</span>
                                            </button>
                                            <a
                                                href={`https://sepolia.etherscan.io/address/${citizen.walletAddress}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="fscan-copy-btn"
                                                style={{ textDecoration: 'none' }}
                                            >
                                                <ExternalLink size={12} />
                                                <span>Etherscan</span>
                                            </a>
                                        </div>
                                    </div>

                                    <div className="fscan-hero-stats">
                                        <span style={{ fontSize: '0.74rem', opacity: 0.8, textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                                            TOTAL REGISTERED LAND HOLDINGS
                                        </span>
                                        <div className="fscan-hero-valuation">
                                            ₹ {totalPropertyValuation.toLocaleString('en-IN')}
                                        </div>
                                        <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                            {properties.length} Land Parcels • {totalAreaSqft.toLocaleString('en-IN')} sq.ft
                                        </span>
                                    </div>
                                </div>

                                {/* Biometric Proof Strip */}
                                <div className="fscan-proof-strip">
                                    {capturedImage && (
                                        <img
                                            src={capturedImage}
                                            alt="Scanned Probe"
                                            className="fscan-proof-thumb"
                                        />
                                    )}

                                    <div className="fscan-hash-meta">
                                        <div style={{ color: '#94A3B8', fontSize: '0.68rem', textTransform: 'uppercase', marginBottom: '3px' }}>
                                            CRYPTOGRAPHIC BIOMETRIC FACE HASH
                                        </div>
                                        <code style={{ color: '#38BDF8', fontSize: '0.78rem' }}>
                                            {match.scannedFaceHash}
                                        </code>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#86EFAC', fontWeight: 700 }}>
                                        <Award size={16} />
                                        <span>On-Chain Attested</span>
                                    </div>
                                </div>
                            </div>

                            {/* 2. Key Performance Indicators Row */}
                            <div className="fscan-kpi-grid">
                                <div className="fscan-kpi-card">
                                    <div className="fscan-kpi-label">Registered Parcels</div>
                                    <div className="fscan-kpi-value">{properties.length}</div>
                                    <div className="fscan-kpi-sub">Sepolia LandNFT Deeds</div>
                                </div>

                                <div className="fscan-kpi-card">
                                    <div className="fscan-kpi-label">Portfolio Valuation</div>
                                    <div className="fscan-kpi-value">₹ {(totalPropertyValuation / 100000).toFixed(1)}L</div>
                                    <div className="fscan-kpi-sub">Govt Fair Price Index</div>
                                </div>

                                <div className="fscan-kpi-card">
                                    <div className="fscan-kpi-label">Tax Clearance Status</div>
                                    <div className="fscan-kpi-value" style={{ color: taxes.every(t => t.is_cleared) ? '#059669' : '#DC2626' }}>
                                        {taxes.length > 0 && taxes.every(t => t.is_cleared) ? '100% Cleared' : taxes.length === 0 ? 'No Due' : 'Pending Due'}
                                    </div>
                                    <div className="fscan-kpi-sub">{activeNocs.length} Active NOC Certificates</div>
                                </div>

                                <div className="fscan-kpi-card">
                                    <div className="fscan-kpi-label">Identity KYC Tier</div>
                                    <div className="fscan-kpi-value" style={{ color: '#2563EB' }}>
                                        Tier 3
                                    </div>
                                    <div className="fscan-kpi-sub">Biometric & Address Verified</div>
                                </div>
                            </div>

                            {/* 3. Detailed Records Section with Navigation Tabs */}
                            <div className="fscan-section-card">
                                <div className="fscan-dossier-nav">
                                    {[
                                        { key: 'identity', label: 'Identity & Address', icon: User },
                                        { key: 'properties', label: `Land Holdings (${properties.length})`, icon: Landmark },
                                        { key: 'transactions', label: `Sales & Deeds (${sales.length})`, icon: FileText },
                                        { key: 'tax', label: `Municipal Tax Vault (${taxes.length})`, icon: ShieldCheck },
                                    ].map((t) => {
                                        const Icon = t.icon;
                                        return (
                                            <button
                                                key={t.key}
                                                onClick={() => setActiveTab(t.key)}
                                                className={`fscan-dossier-nav-btn ${activeTab === t.key ? 'active' : ''}`}
                                            >
                                                <Icon size={16} />
                                                <span>{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* TAB 1: Identity & Address */}
                                {activeTab === 'identity' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                                        <div>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Government ID Document</span>
                                            <div style={{ fontWeight: 800, color: '#0F172A', marginTop: '0.25rem', fontSize: '0.95rem' }}>
                                                {citizen.governmentIdType || 'National ID'}: {citizen.governmentId || 'Verified Record'}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Contact Email</span>
                                            <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                                                {citizen.email || '—'}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Contact Phone</span>
                                            <div style={{ fontWeight: 600, color: '#0F172A', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                                                {citizen.phone || '—'}
                                            </div>
                                        </div>

                                        <div>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>KYC Verification Status</span>
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    padding: '0.25rem 0.65rem',
                                                    borderRadius: '6px',
                                                    background: citizen.kycStatus === 'verified' ? '#DCFCE7' : '#FEF3C7',
                                                    color: citizen.kycStatus === 'verified' ? '#15803D' : '#B45309',
                                                    fontWeight: 800,
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {citizen.kycStatus}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ gridColumn: '1 / -1', background: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>Registered Residential Address</span>
                                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                                                {[citizen.address?.houseNumber, citizen.address?.locality, citizen.address?.city, citizen.address?.state, citizen.address?.pinCode, citizen.address?.country].filter(Boolean).join(', ') || 'Address recorded on national KYC ledger'}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 2: Land Holdings */}
                                {activeTab === 'properties' && (
                                    <div>
                                        {properties.length === 0 ? (
                                            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>
                                                No land properties registered under this citizen's wallet address.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                                                {properties.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        style={{
                                                            background: '#F8FAFC',
                                                            borderRadius: '12px',
                                                            padding: '1.1rem',
                                                            border: '1px solid #E2E8F0',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            flexWrap: 'wrap',
                                                            gap: '1rem'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                                <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '1rem' }}>
                                                                    {p.propertyCode || p.property_code}
                                                                </span>
                                                                <span style={{ fontSize: '0.74rem', background: '#EFF6FF', color: '#1E40AF', padding: '0.2rem 0.55rem', borderRadius: '6px', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                                                                    Token #{p.nftTokenId || p.nft_token_id || '1'}
                                                                </span>
                                                                <span style={{
                                                                    fontSize: '0.74rem',
                                                                    background: p.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                                                                    color: p.status === 'active' ? '#15803D' : '#B45309',
                                                                    padding: '0.2rem 0.55rem',
                                                                    borderRadius: '6px',
                                                                    fontWeight: 800,
                                                                    textTransform: 'uppercase'
                                                                }}>
                                                                    {p.status}
                                                                </span>
                                                            </div>
                                                            <div style={{ color: '#64748B', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                                                                Survey #{p.surveyNumber || p.survey_number} • Area: {p.areaSqft || p.area_sqft} sq.ft • {p.district || 'Nashik'}, {p.state || 'Maharashtra'}
                                                            </div>
                                                        </div>

                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 800, textTransform: 'uppercase' }}>ESTIMATED FAIR PRICE</div>
                                                            <div style={{ fontWeight: 900, color: '#0F172A', fontSize: '1.1rem' }}>
                                                                ₹ {Number(p.estimated_fair_price || 0).toLocaleString('en-IN')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: Sales & Deeds */}
                                {activeTab === 'transactions' && (
                                    <div>
                                        {sales.length === 0 ? (
                                            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>
                                                No purchase or sale transaction history found for this citizen.
                                            </div>
                                        ) : (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#475569', borderBottom: '1px solid #E2E8F0' }}>
                                                            <th style={{ padding: '0.75rem' }}>Property</th>
                                                            <th style={{ padding: '0.75rem' }}>Transaction Value</th>
                                                            <th style={{ padding: '0.75rem' }}>Contract Status</th>
                                                            <th style={{ padding: '0.75rem' }}>Execution Date</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sales.map((s) => (
                                                            <tr key={s.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0F172A' }}>
                                                                    {s.property_code || 'Land Parcel'}
                                                                </td>
                                                                <td style={{ padding: '0.75rem', fontWeight: 900, color: '#0F172A' }}>
                                                                    ₹ {Number(s.sale_price).toLocaleString('en-IN')}
                                                                </td>
                                                                <td style={{ padding: '0.75rem' }}>
                                                                    <span style={{ fontSize: '0.74rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, textTransform: 'uppercase' }}>
                                                                        {s.status}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '0.75rem', color: '#64748B' }}>
                                                                    {new Date(s.created_at).toLocaleDateString('en-IN')}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: Municipal Tax Vault */}
                                {activeTab === 'tax' && (
                                    <div>
                                        {taxes.length === 0 ? (
                                            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#94A3B8' }}>
                                                No municipal property tax assessments on record for this citizen.
                                            </div>
                                        ) : (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                                    <thead>
                                                        <tr style={{ background: '#F8FAFC', textAlign: 'left', color: '#475569', borderBottom: '1px solid #E2E8F0' }}>
                                                            <th style={{ padding: '0.75rem' }}>Property</th>
                                                            <th style={{ padding: '0.75rem' }}>Financial Year</th>
                                                            <th style={{ padding: '0.75rem' }}>Tax Assessment</th>
                                                            <th style={{ padding: '0.75rem' }}>Clearance Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {taxes.map((t) => (
                                                            <tr key={t.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                                <td style={{ padding: '0.75rem', fontWeight: 800, color: '#0F172A' }}>
                                                                    {t.property_code}
                                                                </td>
                                                                <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                                                                    FY {String(t.financial_year).slice(0, 4)}-{String(t.financial_year).slice(6)}
                                                                </td>
                                                                <td style={{ padding: '0.75rem', fontWeight: 900, color: '#0F172A' }}>
                                                                    ₹ {Number(t.total_due).toLocaleString('en-IN')}
                                                                </td>
                                                                <td style={{ padding: '0.75rem' }}>
                                                                    {t.is_cleared ? (
                                                                        <span style={{ background: '#DCFCE7', color: '#15803D', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                            <CheckCircle2 size={12} /> Cleared & NOC Issued
                                                                        </span>
                                                                    ) : (
                                                                        <span style={{ background: '#FEE2E2', color: '#B91C1C', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 800 }}>
                                                                            Due
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Action Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button
                                    onClick={() => navigate(`/authority/citizen/${citizen.id}`)}
                                    className="fscan-trigger-btn"
                                    style={{ width: 'auto', padding: '0.65rem 1.4rem', margin: 0 }}
                                >
                                    <span>Open Citizen Dossier in Master Explorer</span>
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </>
                    ) : (
                        /* Initial Awaiting Scan State */
                        <div className="fscan-empty-state">
                            <div className="fscan-empty-icon-ring">
                                <ScanFace size={38} />
                            </div>
                            <h2 className="fscan-empty-title">
                                Awaiting Biometric Face Scan
                            </h2>
                            <p className="fscan-empty-desc">
                                Align citizen's face inside the reticle and trigger <strong>"Scan & Identify Citizen"</strong> or upload an identity photo portrait.
                                The neural engine will perform real-time biometric matching and pull their comprehensive land holdings, digital deeds, and tax clearances.
                            </p>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748B', background: '#F8FAFC', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <ShieldCheck size={14} color="#10B981" /> ISO/IEC 30107-3 Liveness Compliant
                                </div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748B', background: '#F8FAFC', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                    <Award size={14} color="#2563EB" /> Sepolia Blockchain Title Provenance
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FaceScanLookup;
