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

    const handleSimulateUpload = (field) => {
        const mockHashes = {
            documentHash: 'QmYwAPJzv5CZsnA625s3Xf2bXzgZ7K1Ypx9L1s7Xf2bXz',
            taxReceiptHash: 'QmTxR3c5CZsnA625s3Xf2bXzgZ7K1Ypx9L1s7TaxRcpt',
        };
        setFormData({ ...formData, [field]: mockHashes[field] });
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
        fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.1em', color: 'hsl(220,15%,60%)', marginBottom: '0.4rem',
        marginLeft: '0.25rem', display: 'block',
    };

    const inputGroupStyle = {
        display: 'flex', flexDirection: 'column',
    };

    // Success state — show submission result
    if (success) {
        return (
            <div className="property-container container-sm">
                <div className="details-panel" style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '5rem', height: '5rem', borderRadius: '9999px',
                        background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                    }}>
                        <CheckCircle2 size={40} style={{ color: 'hsl(142,71%,45%)' }} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                        Asset Submitted!
                    </h2>
                    <p className="text-muted" style={{ fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                        Your property has been submitted for authority verification. You'll be notified once it's reviewed.
                    </p>

                    {submittedProp && (
                        <div className="info-grid-box" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <p className="info-label">Property Code</p>
                                    <p className="info-value-mono" style={{ color: 'hsl(255,85%,65%)' }}>{submittedProp.propertyCode}</p>
                                </div>
                                <div>
                                    <p className="info-label">Status</p>
                                    <span className="badge badge-warning-glow">PENDING VERIFICATION</span>
                                </div>
                                <div>
                                    <p className="info-label">Survey No.</p>
                                    <p className="info-value">{submittedProp.surveyNumber}</p>
                                </div>
                                <div>
                                    <p className="info-label">Area</p>
                                    <p className="info-value">{submittedProp.areaSqft} sq.ft</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        <button className="btn btn-primary btn-glow" onClick={() => navigate('/my-properties')} style={{ fontSize: '0.875rem' }}>
                            <Building size={16} /> View My Properties
                        </button>
                        <button className="btn btn-secondary" onClick={() => { setSuccess(false); setSubmittedProp(null); setFormData({ surveyNumber: '', surveyDetails: '', areaSqft: '', addressLine: '', district: '', state: '', geoLat: '', geoLng: '', documentHash: '', taxReceiptHash: '' }); }} style={{ fontSize: '0.875rem' }}>
                            Register Another
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="property-container container-sm">
            <button
                className="back-button"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="details-panel">
                <div className="details-panel-glow" style={{ background: 'hsl(255,85%,65%)' }}></div>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{
                        width: '3rem', height: '3rem', borderRadius: '0.75rem',
                        background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Building size={22} style={{ color: 'hsl(255,85%,65%)' }} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Register New Asset</h2>
                        <p style={{ fontSize: '0.85rem', color: 'hsl(220,15%,60%)' }}>Digitize your real estate onto the blockchain</p>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="alert-message" style={{
                        background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                        color: 'hsl(348,83%,47%)', marginBottom: '1.5rem',
                    }}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Section: Survey Details */}
                    <div className="form-section">
                        <h4 className="form-section-title">Survey Details</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Survey Number *</label>
                                <div className="input-icon-wrapper">
                                    <FileText size={16} />
                                    <input className="input-premium" name="surveyNumber" type="text" placeholder="e.g. SRV-2026-991" value={formData.surveyNumber} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Area (Sq.Ft) *</label>
                                <div className="input-icon-wrapper">
                                    <Maximize size={16} />
                                    <input className="input-premium" name="areaSqft" type="number" placeholder="2500" value={formData.areaSqft} onChange={handleChange} required min="1" />
                                </div>
                            </div>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Survey Details</label>
                                <textarea className="input-premium" name="surveyDetails" placeholder="Any additional survey notes..." value={formData.surveyDetails} onChange={handleChange} rows={2} style={{ resize: 'vertical', minHeight: '60px' }} />
                            </div>
                        </div>
                    </div>

                    {/* Section: Location */}
                    <div className="form-section" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <h4 className="form-section-title">Location</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Full Address *</label>
                                <div className="input-icon-wrapper">
                                    <MapPin size={16} />
                                    <input className="input-premium" name="addressLine" type="text" placeholder="123 Blockchain Avenue, Cyberspace" value={formData.addressLine} onChange={handleChange} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">District / City *</label>
                                <input className="input-premium" name="district" type="text" placeholder="Metropolis" value={formData.district} onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">State / Region *</label>
                                <input className="input-premium" name="state" type="text" placeholder="Maharashtra" value={formData.state} onChange={handleChange} required />
                            </div>
                        </div>
                    </div>

                    {/* Section: Geo-Coordinates */}
                    <div className="form-section" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <h4 className="form-section-title">
                            <Globe size={14} /> Geo-Coordinates <span style={{ fontWeight: 400, color: 'hsl(220,15%,60%)', textTransform: 'none', letterSpacing: 'normal' }}>(optional)</span>
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="form-label">Latitude</label>
                                <input className="input-premium" name="geoLat" type="number" step="any" placeholder="19.0760" value={formData.geoLat} onChange={handleChange} min="-90" max="90" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Longitude</label>
                                <input className="input-premium" name="geoLng" type="number" step="any" placeholder="72.8777" value={formData.geoLng} onChange={handleChange} min="-180" max="180" />
                            </div>
                        </div>
                    </div>

                    {/* Section: Documents */}
                    <div className="form-section" style={{ paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <h4 className="form-section-title">Documents (IPFS)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                            {/* Title Deed */}
                            <div className="form-group">
                                <label className="form-label">Title Deed</label>
                                {formData.documentHash ? (
                                    <div className="upload-success-box">
                                        <span className="info-value-mono" style={{ fontSize: '0.75rem', color: 'hsl(142,71%,45%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{formData.documentHash}</span>
                                        <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>UPLOADED</span>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => handleSimulateUpload('documentHash')}
                                        className="upload-box"
                                    >
                                        <Upload size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                                        <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Upload Title Deed</p>
                                        <p style={{ fontSize: '0.7rem', color: 'hsl(220,15%,60%)' }}>PDF, JPG, PNG (max 10MB)</p>
                                    </div>
                                )}
                            </div>

                            {/* Tax Receipt */}
                            <div className="form-group">
                                <label className="form-label">Tax Receipt</label>
                                {formData.taxReceiptHash ? (
                                    <div className="upload-success-box">
                                        <span className="info-value-mono" style={{ fontSize: '0.75rem', color: 'hsl(142,71%,45%)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{formData.taxReceiptHash}</span>
                                        <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>UPLOADED</span>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => handleSimulateUpload('taxReceiptHash')}
                                        className="upload-box"
                                    >
                                        <Receipt size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                                        <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>Upload Tax Receipt</p>
                                        <p style={{ fontSize: '0.7rem', color: 'hsl(220,15%,60%)' }}>PDF, JPG, PNG (max 10MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-primary btn-glow"
                        style={{ width: '100%', padding: '0.875rem', fontSize: '1rem', marginTop: '0.5rem' }}
                    >
                        {loading ? <><Loader2 size={20} className="animate-spin" /> Submitting...</> : 'Submit Asset Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterProperty;
