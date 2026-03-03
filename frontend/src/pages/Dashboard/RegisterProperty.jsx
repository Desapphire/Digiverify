import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { useAuth } from '../../context/AuthContext';
import { Building, MapPin, Maximize, FileText, Loader2, ArrowLeft } from 'lucide-react';

const RegisterProperty = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        surveyNumber: '',
        areaSqft: '',
        addressLine: '',
        district: '',
        state: '',
        documentHash: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSimulateUpload = () => {
        // Mock IPFS document upload
        setFormData({ ...formData, documentHash: 'QmYwAPJzv5CZsnA625s3Xf2bXzgZ7K1Ypx9L1s7Xf2bXz' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (user?.kycStatus !== 'approved') {
                throw new Error("KYC must be approved before registering a property.");
            }

            const payload = {
                surveyNumber: formData.surveyNumber,
                areaSqft: Number(formData.areaSqft),
                addressLine: formData.addressLine,
                district: formData.district,
                state: formData.state,
                documentHash: formData.documentHash || undefined
            };

            await propertyService.registerProperty(payload);
            setSuccess(true);
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to register property');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 pt-12 animate-pulse-glow" style={{ animationIterationCount: 1 }}>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-muted hover:text-white font-bold mb-8 transition-colors">
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="glass-panel p-8 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-base/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-glow-primary">
                        <Building className="text-primary-glow" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Register New Asset</h2>
                        <p className="text-sm text-muted">Digitize your physical real estate onto the blockchain</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-danger text-sm font-bold">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-success text-sm font-bold flex items-center gap-3">
                        <Loader2 className="w-4 h-4 animate-spin" /> Asset Application Submitted... Redirecting
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Survey Number</label>
                            <div className="relative">
                                <FileText className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                <input type="text" name="surveyNumber" className="input-premium pl-12" placeholder="e.g. SRV-2026-991" value={formData.surveyNumber} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Total Area (Sq.Ft)</label>
                            <div className="relative">
                                <Maximize className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                <input type="number" name="areaSqft" className="input-premium pl-12" placeholder="2500" value={formData.areaSqft} onChange={handleChange} required min="1" />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 md:col-span-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">Full Address Line</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-3.5 w-5 h-5 text-muted" />
                                <input type="text" name="addressLine" className="input-premium pl-12" placeholder="123 Blockchain Avenue, Cyberspace" value={formData.addressLine} onChange={handleChange} required />
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">District / City</label>
                            <input type="text" name="district" className="input-premium" placeholder="Metropolis" value={formData.district} onChange={handleChange} required />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1">State / Region</label>
                            <input type="text" name="state" className="input-premium" placeholder="California" value={formData.state} onChange={handleChange} required />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-subtle">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted uppercase tracking-widest ml-1 mb-2">Title Deed Document</label>
                            {formData.documentHash ? (
                                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex justify-between items-center text-sm">
                                    <span className="font-mono text-success truncate max-w-[80%]">{formData.documentHash}</span>
                                    <span className="font-bold text-success text-xs uppercase">Uploaded</span>
                                </div>
                            ) : (
                                <div className="p-8 border-2 border-dashed border-subtle rounded-xl text-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer" onClick={handleSimulateUpload}>
                                    <FileText className="w-8 h-8 mx-auto mb-3 text-muted" />
                                    <p className="text-sm font-bold text-white mb-1">Click to simulate IPFS Document Upload</p>
                                    <p className="text-xs text-muted">Supports PDF, JPG, PNG up to 10MB</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={loading || success} className="btn btn-primary w-full py-4 mt-6 text-base shadow-glow-primary">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Asset Registration'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterProperty;
