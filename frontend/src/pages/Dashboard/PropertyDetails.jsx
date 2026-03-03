import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { MapPin, Building, FileText, Activity, ArrowLeft, Loader2, CheckCircle2, ShieldAlert, DollarSign, ExternalLink } from 'lucide-react';

const PropertyDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { account } = useWeb3();

    const [property, setProperty] = window.useState(null);
    const [documents, setDocuments] = window.useState([]);
    const [loading, setLoading] = window.useState(true);
    const [error, setError] = window.useState('');
    const [saleForm, setSaleForm] = window.useState({ buyerWallet: '', price: '' });
    const [saleLoading, setSaleLoading] = window.useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const [propRes, docRes] = await Promise.all([
                    propertyService.getPropertyById(id),
                    propertyService.getDocuments(id)
                ]);
                setProperty(propRes.data.data);
                setDocuments(docRes.data.data);
            } catch (err) {
                setError('Failed to load property details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const isOwner = property?.ownerWallet?.toLowerCase() === account?.toLowerCase();

    const handleInitiateSale = async (e) => {
        e.preventDefault();
        setSaleLoading(true);
        try {
            await saleService.initiateSale({
                propertyId: id,
                buyerWallet: saleForm.buyerWallet,
                salePrice: Number(saleForm.price)
            });
            alert('Sale initiated successfully!');
            setSaleForm({ buyerWallet: '', price: '' });
            // Refresh property data to show new pending sale status
            const propRes = await propertyService.getPropertyById(id);
            setProperty(propRes.data.data);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to initiate sale');
        } finally {
            setSaleLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="w-12 h-12 text-primary-glow animate-spin" />
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="flex flex-col h-screen w-full items-center justify-center text-center p-6">
                <ShieldAlert className="w-16 h-16 text-danger mb-4" />
                <h2 className="text-2xl font-bold mb-2">Asset Not Found</h2>
                <p className="text-muted mb-6">{error}</p>
                <button onClick={() => navigate('/dashboard')} className="btn btn-secondary">Return to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 pt-12 animate-pulse-glow" style={{ animationIterationCount: 1 }}>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-sm text-muted hover:text-white font-bold mb-8 transition-colors">
                <ArrowLeft size={16} /> Back to Dashboard
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Asset Details */}
                <div className="md:col-span-2 space-y-8">
                    <div className="glass-panel p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-base/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-glow-primary">
                                    <Building className="w-8 h-8 text-primary-glow" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight mb-1">{property.surveyNumber}</h1>
                                    <p className="text-muted flex items-center gap-2">
                                        <MapPin size={16} /> {property.district}, {property.state}
                                    </p>
                                </div>
                            </div>
                            <span className={`badge ${property.status === 'verified' ? 'badge-success' : property.status === 'pending_transfer' ? 'badge-warning' : 'badge-neutral'}`}>
                                {property.status.toUpperCase()}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-6 p-6 bg-black/40 rounded-xl border border-subtle">
                            <div>
                                <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Total Dimensions</p>
                                <p className="font-medium text-lg font-mono">{property.areaSqft} sq.ft</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Property Value Type</p>
                                <p className="font-medium text-lg">{property.propertyType || 'Standard Legal Asset'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Full Legal Address</p>
                                <p className="font-medium">{property.addressLine}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Current Owner Wallet</p>
                                <div className="flex items-center gap-2">
                                    <p className="font-mono text-sm text-primary-glow truncate">{property.ownerWallet}</p>
                                    {isOwner && <span className="badge badge-success text-[10px]">YOU</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document Vault */}
                    <div className="glass-panel p-8">
                        <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <FileText className="text-white" /> Immutable Document Vault
                        </h3>

                        {documents.length === 0 ? (
                            <div className="text-center p-8 bg-black/20 rounded-xl border border-dashed border-subtle text-muted">
                                No historical documents found for this asset.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {documents.map((doc) => (
                                    <div key={doc.id || doc.documentHash} className="flex justify-between items-center p-4 bg-white/5 border border-subtle rounded-xl hover:bg-white/10 transition">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm mb-1">{doc.documentType || 'Title Deed'}</p>
                                                <p className="text-xs text-muted font-mono max-w-[200px] md:max-w-xs truncate">{doc.documentHash}</p>
                                            </div>
                                        </div>
                                        <button className="btn btn-secondary text-xs p-2">
                                            <ExternalLink size={16} /> View IPFS
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Actions */}
                <div className="space-y-6">
                    {/* ASBA Sale Initiate Widget */}
                    {isOwner && property.status === 'verified' && (
                        <div className="glass-panel p-6 border-l-4 border-l-success">
                            <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <DollarSign className="text-success" /> Initiate Sale Contract
                            </h4>
                            <p className="text-sm text-muted mb-6">Create an ASBA-style property transfer contract. The buyer's funds will be securely locked until you fulfill the biometric transfer criteria.</p>

                            <form onSubmit={handleInitiateSale} className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-muted uppercase">Buyer Wallet Address</label>
                                    <input
                                        type="text"
                                        className="input-premium py-3 text-sm font-mono"
                                        placeholder="0x..."
                                        value={saleForm.buyerWallet}
                                        onChange={e => setSaleForm({ ...saleForm, buyerWallet: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-bold text-muted uppercase">Sale Price (USDC)</label>
                                    <input
                                        type="number"
                                        className="input-premium py-3 text-sm font-mono"
                                        placeholder="500000"
                                        value={saleForm.price}
                                        onChange={e => setSaleForm({ ...saleForm, price: e.target.value })}
                                        required
                                        min="1"
                                    />
                                </div>
                                <button type="submit" disabled={saleLoading} className="btn bg-white text-black font-black w-full py-3 mt-2 hover:bg-gray-200">
                                    {saleLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Deploy Contract'}
                                </button>
                            </form>
                        </div>
                    )}

                    {!isOwner && property.status === 'verified' && (
                        <div className="glass-panel p-6">
                            <h4 className="font-bold mb-2 flex items-center gap-2"><Activity size={18} /> Asset Verification</h4>
                            <p className="text-sm text-muted mb-4">This asset is cryptographically verified on the blockchain, but you are not the owner.</p>
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-danger text-xs font-bold flex gap-2">
                                <ShieldAlert size={16} /> Read-only access
                            </div>
                        </div>
                    )}

                    {property.status === 'pending_transfer' && (
                        <div className="glass-panel p-6 border-l-4 border-l-warning bg-warning/5">
                            <h4 className="font-bold mb-2 flex items-center gap-2 text-warning"><Activity size={18} /> Active Contract</h4>
                            <p className="text-sm">This property is currently locked in an active ASBA transfer contract. Standard operations are suspended.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PropertyDetails;
