import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { UserPlus, Wallet, FileCheck, ShieldCheck, CheckCircle, ArrowRight, Camera, FileText } from 'lucide-react';
import { useWeb3 } from '../../context/Web3Context';
import FaceCapture from '../../components/common/FaceCapture';

const Register = () => {
    const { account, connectWallet, isConnecting, signMessage } = useWeb3();
    const navigate = useNavigate();

    // Step state: 1 = Legal Details, 2 = Wallet Linking
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form Data
    const [userId, setUserId] = useState(null);
    const [faceImage, setFaceImage] = useState(null);
    const [formData, setFormData] = useState({
        fullName: '',
        governmentId: '',
        email: '',
        phone: '',
        faceImageCid: 'mock_face_cid_123', // Mock value
        kycDocumentCids: ['mock_kyc_cid_456'], // Mock value
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    /**
     * Submit Step 1: Legal Details
     */
    const handleStep1Submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Simulate IPFS upload for the face image
            const faceImageCid = faceImage ? `ipfs_captured_${faceImage.substring(50, 60)}` : formData.faceImageCid;

            const submissionData = {
                ...formData,
                faceImageCid
            };

            const res = await authService.registerLegal(submissionData);
            if (res.data.success) {
                setUserId(res.data.data.userId);
                setStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Submission failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Submit Step 2: Wallet Linking
     */
    const handleStep2Submit = async () => {
        if (!account) {
            setError('Please connect your wallet first.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            // 1. Get Nonce
            const nonceRes = await authService.getRegisterNonce(userId);
            const nonce = nonceRes.data.data.nonce;

            // 2. Sign Message
            const signature = await signMessage(nonce);

            // 3. Verify and Link
            const verifyRes = await authService.verifyRegisterWallet({
                userId,
                signature
            });

            if (verifyRes.data.success) {
                setSuccess('Registration complete! Your account is now APPROVED.');
                setTimeout(() => navigate('/login'), 3000);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '2rem' }}>
            <Card style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem' }}>

                {/* Stepper Header */}
                <div className="registration-stepper">
                    <div className={`step-item ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        {step > 1 ? <CheckCircle size={20} /> : 1}
                        <span className="step-label">Identify</span>
                    </div>
                    <div className={`step-item ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        {step > 2 ? <CheckCircle size={20} /> : 2}
                        <span className="step-label">Verify</span>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>
                        {step === 1 ? 'Legal Identity' : 'Blockchain Verification'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        {step === 1
                            ? 'Please provide your legal details for government verification.'
                            : 'Link your crypto wallet to secure your property ownership.'}
                    </p>
                </div>

                {error && (
                    <div className="glass-panel" style={{
                        width: '100%',
                        padding: '0.75rem',
                        marginBottom: '1.5rem',
                        borderLeft: '4px solid var(--danger)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: 'var(--text-main)',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <ShieldCheck size={18} color="var(--danger)" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="glass-panel" style={{
                        width: '100%',
                        padding: '1rem',
                        marginBottom: '1.5rem',
                        borderLeft: '4px solid var(--accent)',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--accent)',
                        textAlign: 'center',
                        animation: 'pulseGlow 2s infinite'
                    }}>
                        <CheckCircle size={24} style={{ marginBottom: '0.5rem' }} />
                        <div>{success}</div>
                    </div>
                )}

                {/* STEP 1: LEGAL DETAILS */}
                {step === 1 && (
                    <form onSubmit={handleStep1Submit} style={{ width: '100%' }}>
                        <Input
                            label="Full Name (Legal)"
                            name="fullName"
                            placeholder="Aarav Sharma"
                            value={formData.fullName}
                            onChange={handleChange}
                            required
                            icon={<UserPlus size={18} />}
                        />
                        <Input
                            label="Government ID / Aadhar"
                            name="governmentId"
                            placeholder="1234 5678 9012"
                            value={formData.governmentId}
                            onChange={handleChange}
                            required
                            icon={<ShieldCheck size={18} />}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Input
                                label="Email"
                                name="email"
                                type="email"
                                placeholder="aarav@example.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <Input
                                label="Phone"
                                name="phone"
                                placeholder="+91 9876543210"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <FaceCapture onCapture={(img) => setFaceImage(img)} />

                        <div className="file-upload-zone">
                            <FileCheck size={24} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>KYC Documents (PDF/JPG)</p>
                            <p style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>identity_proof.pdf</p>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            style={{ width: '100%', marginTop: '1rem' }}
                            disabled={loading || !faceImage}
                        >
                            {loading ? 'Processing...' : 'Continue to Wallet'}
                            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
                        </Button>
                    </form>
                )}

                {/* STEP 2: WALLET LINKING */}
                {step === 2 && !success && (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                        <div style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            padding: '1.5rem',
                            borderRadius: '16px',
                            marginBottom: '2rem',
                            border: '1px solid var(--border-glass)'
                        }}>
                            <Wallet size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                            {account ? (
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Connected Wallet</p>
                                    <p style={{ fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                                        {account.substring(0, 6)}...{account.substring(account.length - 4)}
                                    </p>
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)' }}>No wallet connected</p>
                            )}
                        </div>

                        {!account ? (
                            <Button variant="outline" onClick={connectWallet} disabled={isConnecting} style={{ width: '100%', marginBottom: '1rem' }}>
                                {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={handleStep2Submit} disabled={loading} style={{ width: '100%' }}>
                                <FileCheck size={18} style={{ marginRight: '8px' }} />
                                {loading ? 'Confirming...' : 'Sign and Link Wallet'}
                            </Button>
                        )}

                        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Why? We use your wallet as your unique digital signature for all property transactions.
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: '2.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Back to <Link to="/login" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>Login</Link>
                </div>
            </Card>
        </div>
    );
};

export default Register;
