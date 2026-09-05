import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import { TopNavbar } from '../../components/TopNavbar';
import {
    Building, MapPin, FileText, Loader2, ArrowLeft,
    Globe, Upload, CheckCircle2, AlertTriangle, Receipt,
    Shield, Check, PlusCircle, ArrowRight
} from 'lucide-react';
import './PropertyPages.css';

const RegisterProperty = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submittedProp, setSubmittedProp] = useState(null);

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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const [uploadingField, setUploadingField] = useState(null);

    const handleFileUpload = async (e, field) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingField(field);
            setError('');

            const uploadData = new FormData();
            uploadData.append('file', file);

            const res = await propertyService.uploadToIPFS(uploadData);
            const ipfsHash = res.data?.data?.ipfsHash || res.data?.ipfsHash;
            setFormData({ ...formData, [field]: ipfsHash });
        } catch (err) {
            console.error('IPFS Upload Error:', err);
            setError(`Failed to upload ${field === 'documentHash' ? 'Title Deed' : 'Tax Receipt'} to IPFS.`);
        } finally {
            setUploadingField(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (user?.kycStatus !== 'approved' && user?.kycStatus !== 'verified') {
                throw new Error('KYC must be approved by the land authority before registering a property.');
            }

            const payload = {
                surveyNumber: formData.surveyNumber,
                surveyDetails: formData.surveyDetails || undefined,
                areaSqft: Number(formData.areaSqft),
                addressLine: formData.addressLine,
                district: formData.district,
                state: formData.state,
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
            setError(err.response?.data?.message || err.message || 'Failed to register property');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
                <TopNavbar 
                    title="Registration Complete"
                    subtitle="Your property has been recorded and submitted for surveyor verification"
                    showLogo={false}
                    showNetwork={true}
                    showNotifications={true}
                    showProfile={true}
                />

                <div style={{ padding: '3rem 2rem', maxWidth: '640px', margin: '0 auto' }}>
                    <div className="digi-card p-8 text-center" style={{ background: '#0F172A', borderRadius: '16px', border: '1px solid #1E293B' }}>
                        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                            <CheckCircle2 size={32} style={{ color: '#10B981' }} />
                        </div>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                            Property Registered On-Chain
                        </h2>
                        <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginBottom: '2rem' }}>
                            Your parcel application has been indexed in the state registry and is awaiting final surveyor sign-off.
                        </p>

                        {submittedProp && (
                            <div 
                                style={{
                                    textAlign: 'left',
                                    padding: '1.25rem 1.5rem',
                                    background: '#0B0F19',
                                    border: '1px solid #1E293B',
                                    borderRadius: '12px',
                                    marginBottom: '2rem',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '1rem'
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Property Code</span>
                                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>{submittedProp.propertyCode}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Status</span>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#F59E0B' }}>Pending Verification</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Survey Number</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>{submittedProp.surveyNumber}</span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600, display: 'block' }}>Area</span>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#F8FAFC' }}>{submittedProp.areaSqft} sqft</span>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn-cyan-glow" onClick={() => navigate('/my-properties')}>
                                Return to My Properties
                            </button>
                            <button className="btn-dark-pill" onClick={() => { setSuccess(false); setSubmittedProp(null); setFormData({ surveyNumber: '', surveyDetails: '', areaSqft: '', addressLine: '', district: '', state: '', geoLat: '', geoLng: '', documentHash: '', taxReceiptHash: '' }); }}>
                                Register Another
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            <TopNavbar 
                title="Register Land Property"
                subtitle="Mint a cryptographic cadastral parcel deed on Avalanche Fuji"
                showLogo={false}
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2.5rem 2rem', maxWidth: '1000px', margin: '0 auto' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <button onClick={() => navigate(-1)} className="btn-dark-pill" style={{ marginBottom: '1rem' }}>
                        <ArrowLeft size={14} /> Back
                    </button>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '0.85rem 1.25rem', marginBottom: '1.75rem', color: '#f87171', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}

                <div 
                    className="digi-card p-8"
                    style={{
                        background: '#0F172A',
                        border: '1px solid #1E293B',
                        borderRadius: '16px'
                    }}
                >
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        
                        {/* ── Section 1: Cadastral Survey Information ── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <FileText size={18} style={{ color: '#0284C7' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Cadastral Survey Information</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Survey Number *</label>
                                    <input 
                                        className="input-premium"
                                        name="surveyNumber" 
                                        type="text" 
                                        placeholder="e.g. SRV-2026-991" 
                                        value={formData.surveyNumber} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Total Area (Sq.Ft) *</label>
                                    <input 
                                        className="input-premium"
                                        name="areaSqft" 
                                        type="number" 
                                        placeholder="2500" 
                                        value={formData.areaSqft} 
                                        onChange={handleChange} 
                                        required 
                                        min="1" 
                                    />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Cadastral Survey Boundary Notes</label>
                                    <textarea 
                                        className="input-premium"
                                        name="surveyDetails" 
                                        placeholder="Subdivision notes, road boundaries, adjoining properties..." 
                                        value={formData.surveyDetails} 
                                        onChange={handleChange} 
                                        style={{ minHeight: '80px', resize: 'vertical' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Section 2: Geographic Coordinates & Location ── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <MapPin size={18} style={{ color: '#0284C7' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>Geographic Coordinates & Location</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Physical Address Line *</label>
                                    <input 
                                        className="input-premium"
                                        name="addressLine" 
                                        type="text" 
                                        placeholder="Street name, landmark, layout" 
                                        value={formData.addressLine} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>District / Municipality *</label>
                                    <input 
                                        className="input-premium"
                                        name="district" 
                                        type="text" 
                                        placeholder="Bangalore Urban" 
                                        value={formData.district} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>State / Region *</label>
                                    <input 
                                        className="input-premium"
                                        name="state" 
                                        type="text" 
                                        placeholder="Karnataka" 
                                        value={formData.state} 
                                        onChange={handleChange} 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>GPS Latitude (° N)</label>
                                    <input 
                                        className="input-premium"
                                        name="geoLat" 
                                        type="number" 
                                        step="0.000001" 
                                        placeholder="12.971600" 
                                        value={formData.geoLat} 
                                        onChange={handleChange} 
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>GPS Longitude (° E)</label>
                                    <input 
                                        className="input-premium"
                                        name="geoLng" 
                                        type="number" 
                                        step="0.000001" 
                                        placeholder="77.594600" 
                                        value={formData.geoLng} 
                                        onChange={handleChange} 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ── Section 3: IPFS Document Uploads ── */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                                <Upload size={18} style={{ color: '#0284C7' }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>IPFS Legal Title Documents</h3>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                                {/* Title Deed */}
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Primary Title Deed *</label>
                                    {formData.documentHash ? (
                                        <div style={{ padding: '0.75rem 1rem', background: '#0B0F19', border: '1px solid #1E293B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {formData.documentHash.slice(0, 20)}...
                                            </span>
                                            <span className="badge-active-green">Pinned</span>
                                        </div>
                                    ) : (
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0B0F19', border: '1.5px dashed #334155', borderRadius: '10px', cursor: 'pointer' }}>
                                            <input 
                                                type="file" 
                                                accept=".pdf,.png,.jpg" 
                                                style={{ display: 'none' }} 
                                                onChange={e => handleFileUpload(e, 'documentHash')}
                                                disabled={uploadingField === 'documentHash'}
                                            />
                                            {uploadingField === 'documentHash' ? (
                                                <Loader2 size={20} className="animate-spin" style={{ color: '#0284C7' }} />
                                            ) : (
                                                <>
                                                    <Upload size={20} style={{ color: '#0284C7', marginBottom: '0.5rem' }} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#F8FAFC' }}>Upload Title Deed (PDF/JPG)</span>
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>

                                {/* Tax Receipt */}
                                <div>
                                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94A3B8', display: 'block', marginBottom: '0.4rem' }}>Tax Clearance Receipt</label>
                                    {formData.taxReceiptHash ? (
                                        <div style={{ padding: '0.75rem 1rem', background: '#0B0F19', border: '1px solid #1E293B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '0.75rem', fontFamily: 'JetBrains Mono', color: '#38BDF8', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {formData.taxReceiptHash.slice(0, 20)}...
                                            </span>
                                            <span className="badge-active-green">Pinned</span>
                                        </div>
                                    ) : (
                                        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: '#0B0F19', border: '1.5px dashed #334155', borderRadius: '10px', cursor: 'pointer' }}>
                                            <input 
                                                type="file" 
                                                accept=".pdf,.png,.jpg" 
                                                style={{ display: 'none' }} 
                                                onChange={e => handleFileUpload(e, 'taxReceiptHash')}
                                                disabled={uploadingField === 'taxReceiptHash'}
                                            />
                                            {uploadingField === 'taxReceiptHash' ? (
                                                <Loader2 size={20} className="animate-spin" style={{ color: '#0284C7' }} />
                                            ) : (
                                                <>
                                                    <Receipt size={20} style={{ color: '#94A3B8', marginBottom: '0.5rem' }} />
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94A3B8' }}>Upload Tax Receipt (PDF/JPG)</span>
                                                </>
                                            )}
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading || !formData.documentHash}
                            className="btn-cyan-glow"
                            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Submit Property for Surveyor Verification'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterProperty;
