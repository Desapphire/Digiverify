import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import {
    Building, MapPin, Maximize, FileText, Loader2, ArrowLeft,
    Globe, Upload, CheckCircle2, AlertTriangle, Receipt
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
            setFormData({ ...formData, [field]: res.data.data.ipfsHash });
        } catch (err) {
            console.error('IPFS Upload Error:', err);
            setError(`Failed to upload ${field === 'documentHash' ? 'Title Deed' : 'Tax Receipt'}.`);
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
                throw new Error('KYC must be approved before registering a property.');
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

    const labelStyle = {
        fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
        color: '#d1d5db', marginBottom: '0.4rem', display: 'block'
    };

    const cyberInputStyle = {
        width: '100%', padding: '0.8rem 1rem', background: 'rgba(0,0,0,0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px',
        color: 'white', fontFamily: 'inherit', fontSize: '0.9rem',
        transition: 'all 0.2s ease', outline: 'none'
    };

    // Success state
    if (success) {
        return (
            <div className="property-container container-sm mt-8 animate-fade-in">
                <div className="cyber-hud-bar" style={{ display: 'block', textAlign: 'center', padding: '4rem 2rem', position: 'relative', overflow: 'hidden' }}>
                    <div className="cyber-card-glow-orb" style={{ background: '#00E5FF', top: '0', left: '50%', transform: 'translateX(-50%)', width: '10rem', height: '10rem' }}></div>

                    <div className="relative z-10">
                        <CheckCircle2 size={64} style={{ color: '#00E5FF', margin: '0 auto 1.5rem', filter: 'drop-shadow(0 0 15px rgba(0,229,255,0.5))' }} />
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'white' }}>
                            Property Submitted
                        </h2>
                        <p style={{ color: 'hsl(220,15%,60%)', marginBottom: '2rem', fontSize: '1.05rem' }}>
                            Your property registration has been submitted and is pending verification.
                        </p>

                        {submittedProp && (
                            <div className="cyber-data-grid" style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto 2.5rem', border: '1px solid rgba(0,229,255,0.2)', background: 'rgba(0,229,255,0.05)' }}>
                                <div className="cyber-data-item">
                                    <div className="label">Property ID</div>
                                    <div className="value" style={{ color: '#00E5FF' }}>{submittedProp.propertyCode}</div>
                                </div>
                                <div className="cyber-data-item">
                                    <div className="label">Status</div>
                                    <div className="value" style={{ color: '#F59E0B' }}>Pending Verification</div>
                                </div>
                                <div className="cyber-data-item">
                                    <div className="label">Survey Number</div>
                                    <div className="value" style={{ fontFamily: 'inherit' }}>{submittedProp.surveyNumber}</div>
                                </div>
                                <div className="cyber-data-item">
                                    <div className="label">Area (sq.ft.)</div>
                                    <div className="value" style={{ fontFamily: 'inherit' }}>{submittedProp.areaSqft}</div>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="cyber-btn-hollow" onClick={() => navigate('/my-properties')} style={{ '--btn-color': '#00E5FF', padding: '0.75rem 1.5rem', textTransform: 'capitalize' }}>
                                <Building size={16} /> Return to Dashboard
                            </button>
                            <button className="cyber-btn-hollow" onClick={() => { setSuccess(false); setSubmittedProp(null); setFormData({ surveyNumber: '', surveyDetails: '', areaSqft: '', addressLine: '', district: '', state: '', geoLat: '', geoLng: '', documentHash: '', taxReceiptHash: '' }); }} style={{ '--btn-color': '#FF007F', padding: '0.75rem 1.5rem', textTransform: 'capitalize' }}>
                                Register Another Property
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container animate-fade-in" style={{ padding: '0', position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 60px)', borderRadius: '24px', margin: '0' }}>
            <style>
                {`
                    .rp-full-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
                    .rp-full-bg img { width: 100%; height: 100%; object-fit: cover; opacity: 0.6; mix-blend-mode: screen; }
                    .rp-full-bg .overlay { position: absolute; inset: 0; background: radial-gradient(circle at center, transparent 0%, #050505 100%), linear-gradient(to right, #050505 0%, transparent 60%, transparent 80%, #050505 100%); }
                    
                    .rp-content-wrapper { display: flex; max-width: 1400px; margin: 0 auto; gap: 4rem; align-items: stretch; justify-content: space-between; position: relative; z-index: 10; padding: 2.5rem; height: 100%; }
                    
                    .rp-info-side { flex: 1; display: none; flex-direction: column; justify-content: center; position: relative; padding-right: 2rem; }
                    @media (min-width: 1024px) { .rp-info-side { display: flex; } }
                    
                    .rp-glass-form { flex: 1.3; background: rgba(10, 10, 15, 0.5); backdrop-filter: blur(24px); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 3rem; box-shadow: 0 30px 60px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,0,127,0.05); max-height: calc(100vh - 120px); overflow-y: auto; scrollbar-width: none; }
                    .rp-glass-form::-webkit-scrollbar { display: none; }
                `}
            </style>

            <div className="rp-full-bg">
                <img src="/register_bg_premium.png" alt="Dynamic Background" />
                <div className="overlay"></div>
            </div>

            <div className="rp-content-wrapper">
                {/* ─── Hero Information Scale ─── */}
                <div className="rp-info-side">
                    <button className="cyber-btn-hollow mb-12" onClick={() => navigate(-1)} style={{ '--btn-color': '#00E5FF', width: 'fit-content', border: 'none', paddingLeft: 0, fontSize: '0.8rem' }}>
                        <ArrowLeft size={16} /> Return to Dashboard
                    </button>

                    <div style={{ padding: '0.6rem 1.25rem', background: 'rgba(0,229,255,0.08)', borderLeft: '4px solid #00E5FF', width: 'fit-content', marginBottom: '1.5rem', borderRadius: '0 8px 8px 0' }}>
                        <p style={{ color: '#00E5FF', fontWeight: 800, letterSpacing: '0.15em', fontSize: '0.7rem', textTransform: 'uppercase', margin: 0 }}>Secure Web3 Portal Active</p>
                    </div>

                    <h1 style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1.05, color: 'white', marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
                        Digitize <br /> Your <span style={{ color: 'transparent', WebkitTextStroke: '1.5px #FF007F' }}>Properties</span>
                    </h1>

                    <p style={{ color: '#9ca3af', fontSize: '1.05rem', lineHeight: 1.6, maxWidth: '420px', marginBottom: '3.5rem' }}>
                        Transition your physical real estate deeds into immutable on-chain cryptographic tokens governed seamlessly by smart contracts.
                    </p>

                    <div style={{ display: 'flex', gap: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16,185,129,0.3)' }}><CheckCircle2 size={20} style={{ color: '#10B981' }} /></div>
                            <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Government<br /><span style={{ color: '#10B981', fontWeight: 600 }}>Grade Security</span></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(168,85,247,0.3)' }}><Globe size={20} style={{ color: '#A855F7' }} /></div>
                            <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Interplanetary<br /><span style={{ color: '#A855F7', fontWeight: 600 }}>File System</span></span>
                        </div>
                    </div>
                </div>

                {/* ─── Registration Form ─── */}
                <div className="rp-glass-form">
                    {/* Form Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '2.5rem' }}>
                        <div style={{
                            width: '3.5rem', height: '3.5rem', borderRadius: '12px',
                            background: 'rgba(255,0,127,0.1)', border: '1px solid rgba(255,0,127,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 0 20px rgba(255,0,127,0.2)'
                        }}>
                            <Building size={24} style={{ color: '#FF007F' }} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: 'white' }}>
                                Application Payload
                            </h2>
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '0.3rem', margin: 0 }}>
                                Specify node variables for property registry
                            </p>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="alert-message mb-6" style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#EF4444', fontSize: '0.9rem'
                        }}>
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Section: Survey Details */}
                        <div className="mb-6 p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                            <h4 className="flex items-center gap-2 mb-6 text-base font-bold" style={{ color: '#00E5FF' }}>
                                <FileText size={18} /> Verification Data
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <div className="form-group">
                                    <label style={labelStyle}>Survey Number *</label>
                                    <input style={cyberInputStyle} name="surveyNumber" type="text" placeholder="e.g. SRV-2026-991" value={formData.surveyNumber} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label style={labelStyle}>Total Scale (Sq.Ft) *</label>
                                    <input style={cyberInputStyle} name="areaSqft" type="number" placeholder="2500" value={formData.areaSqft} onChange={handleChange} required min="1" />
                                </div>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Operational Notes</label>
                                    <textarea style={{ ...cyberInputStyle, resize: 'vertical', minHeight: '80px' }} name="surveyDetails" placeholder="Enter Additional Details." value={formData.surveyDetails} onChange={handleChange} />
                                </div>
                            </div>
                        </div>

                        {/* Section: Location */}
                        <div className="mb-6 p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                            <h4 className="flex items-center gap-2 mb-6 text-base font-bold" style={{ color: '#00E5FF' }}>
                                <MapPin size={18} /> Geographical Coordinates
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label style={labelStyle}>Physical Address Line *</label>
                                    <input style={cyberInputStyle} name="addressLine" type="text" placeholder="Address Line" value={formData.addressLine} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label style={labelStyle}>District / Sub-sector *</label>
                                    <input style={cyberInputStyle} name="district" type="text" placeholder="District" value={formData.district} onChange={handleChange} required />
                                </div>
                                <div className="form-group">
                                    <label style={labelStyle}>State / Global Region *</label>
                                    <input style={cyberInputStyle} name="state" type="text" placeholder="State" value={formData.state} onChange={handleChange} required />
                                </div>
                            </div>
                        </div>

                        {/* Section: Documents */}
                        <div className="mb-8 p-6" style={{ background: 'rgba(255,0,127,0.03)', border: '1px solid rgba(255,0,127,0.15)', borderRadius: '16px' }}>
                            <h4 className="flex items-center gap-2 mb-6 text-base font-bold" style={{ color: '#FF007F' }}>
                                <Upload size={18} /> Cryptographic Evidence
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                                {/* Title Deed */}
                                <div className="form-group">
                                    <label style={labelStyle}>Certified Title Deed *</label>
                                    {formData.documentHash ? (
                                        <div style={{ padding: '1rem 1.25rem', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                <div style={{ background: 'rgba(0,229,255,0.15)', padding: '0.4rem', borderRadius: '6px' }}><CheckCircle2 size={16} style={{ color: '#00E5FF' }} /></div>
                                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#00E5FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.documentHash}</span>
                                            </div>
                                            <span className="cyber-badge" style={{ '--badge-bg': 'transparent', '--badge-color': '#00E5FF', '--badge-border': 'rgba(0,229,255,0.5)', padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}>Secured</span>
                                        </div>
                                    ) : (
                                        <label className="upload-box relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,0,127,0.3)', borderStyle: 'dashed', borderWidth: '1px', borderRadius: '12px', padding: '1.5rem', transition: 'all 0.2s', cursor: uploadingField === 'documentHash' ? 'not-allowed' : 'pointer' }}>
                                            <input
                                                type="file" accept=".pdf,.jpg"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                onChange={(e) => handleFileUpload(e, 'documentHash')} disabled={uploadingField === 'documentHash'}
                                            />
                                            {uploadingField === 'documentHash' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <Loader2 size={24} className="animate-spin" style={{ color: '#FF007F' }} />
                                                    <span style={{ fontSize: '0.9rem', color: '#FF007F', fontWeight: 600 }}>Encrypting File...</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <Upload size={20} style={{ color: '#FF007F' }} />
                                                    <div>
                                                        <p style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, margin: 0 }}>Supply Title Deed (PDF/JPG)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </label>
                                    )}
                                </div>

                                {/* Tax Receipt */}
                                <div className="form-group mt-2">
                                    <label style={labelStyle}>Additional Documents</label>
                                    {formData.taxReceiptHash ? (
                                        <div style={{ padding: '1rem 1.25rem', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                                                <div style={{ background: 'rgba(0,229,255,0.15)', padding: '0.4rem', borderRadius: '6px' }}><CheckCircle2 size={16} style={{ color: '#00E5FF' }} /></div>
                                                <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#00E5FF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.taxReceiptHash}</span>
                                            </div>
                                            <span className="cyber-badge" style={{ '--badge-bg': 'transparent', '--badge-color': '#00E5FF', '--badge-border': 'rgba(0,229,255,0.5)', padding: '0.3rem 0.6rem', fontSize: '0.65rem' }}>Secured</span>
                                        </div>
                                    ) : (
                                        <label className="upload-box relative" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,0,127,0.3)', borderStyle: 'dashed', borderWidth: '1px', borderRadius: '12px', padding: '1.5rem', transition: 'all 0.2s', cursor: uploadingField === 'taxReceiptHash' ? 'not-allowed' : 'pointer' }}>
                                            <input
                                                type="file" accept=".pdf,.jpg"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                                onChange={(e) => handleFileUpload(e, 'taxReceiptHash')} disabled={uploadingField === 'taxReceiptHash'}
                                            />
                                            {uploadingField === 'taxReceiptHash' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <Loader2 size={24} className="animate-spin" style={{ color: '#FF007F' }} />
                                                    <span style={{ fontSize: '0.9rem', color: '#FF007F', fontWeight: 600 }}>Encrypting File...</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <Receipt size={20} style={{ color: '#FF007F' }} />
                                                    <div>
                                                        <p style={{ fontSize: '0.9rem', color: 'white', fontWeight: 600, margin: 0 }}>Supply Tax Receipt (PDF/JPG)</p>
                                                    </div>
                                                </div>
                                            )}
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !formData.documentHash || !formData.taxReceiptHash}
                            className="cyber-btn-hollow"
                            style={{
                                '--btn-color': (loading || !formData.documentHash || !formData.taxReceiptHash) ? '#6b7280' : '#00E5FF',
                                width: '100%', padding: '1.25rem', fontSize: '1.05rem', marginTop: '1rem', borderStyle: 'solid',
                                cursor: (loading || !formData.documentHash || !formData.taxReceiptHash) ? 'not-allowed' : 'pointer',
                                background: (loading || !formData.documentHash || !formData.taxReceiptHash) ? 'transparent' : 'rgba(0, 229, 255, 0.05)'
                            }}
                        >
                            {loading ? <><Loader2 size={24} className="animate-spin" /> Synthesizing Database Lock...</> : 'Transmit Node Registration'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RegisterProperty;
