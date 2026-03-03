import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, MapPin, FileText, CheckCircle2, XCircle, AlertTriangle, RefreshCcw } from 'lucide-react';

const PropertyVerification = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock Functions for actions
    const handleApprove = () => {
        console.log(`Approving & Minting NFT for property ${id}`);
        // Logic: Call LandRegistry contract -> Mint NFT to seller
        // Status -> ACTIVE
    };

    const handleReject = () => {
        console.log(`Rejecting property ${id}`);
    };

    const handleMarkEncumbered = () => {
        console.log(`Marking property ${id} as encumbered`);
    };

    const handleRequestCorrection = () => {
        console.log(`Requesting correction for property ${id}`);
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header mb-6">
                <div>
                    <h1 className="dashboard-title text-2xl font-bold">
                        Property <span className="text-gradient">Verification</span>
                    </h1>
                    <p className="text-muted text-sm mt-1">Reviewing Property Registration ID: {id}</p>
                </div>
                <button className="btn btn-secondary text-sm" onClick={() => navigate(-1)}>
                    Back
                </button>
            </div>

            <div className="glass-panel p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Details Section */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Registration Details</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-1">Seller Name</p>
                                <p className="text-white font-medium">[Mock Seller Name]</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-1">Wallet Address</p>
                                <p className="font-mono text-sm text-primary-glow">0x[Mock...Wallet]</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-1 flex items-center gap-1"><MapPin size={12} /> Survey Details</p>
                                <p className="text-white font-medium">[Mock District, Survey No]</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-1">Geo Coordinates</p>
                                <p className="font-mono text-sm text-white/80">[Lat: 18.5204, Lng: 73.8567]</p>
                            </div>
                        </div>
                    </div>

                    {/* Documents & Declarations */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Documents & Declarations</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><FileText size={12} /> Title Deed (IPFS Link)</p>
                                <div className="p-3 bg-black/30 rounded border border-white/10 flex items-center justify-between">
                                    <span className="text-sm font-mono text-muted truncate max-w-[200px]">ipfs://[CID_HASH_MOCK]</span>
                                    <button className="text-primary-glow text-xs font-bold hover:underline">View File</button>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><ShieldCheck size={12} /> Encumbrance Declaration</p>
                                <div className="p-3 bg-black/30 rounded border border-white/10">
                                    <p className="text-sm text-white/80 italic">"I hereby declare this property is free from any legal disputes or financial encumbrances."</p>
                                    <p className="text-xs text-muted mt-2 text-right">- Digitally Signed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Actions Section */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4">
                    <button onClick={handleApprove} className="btn btn-success px-6 py-2 shadow-glow-primary flex items-center gap-2">
                        <CheckCircle2 size={16} /> Approve & Mint NFT
                    </button>

                    <button onClick={handleMarkEncumbered} className="btn btn-warning px-6 py-2 flex items-center gap-2">
                        <AlertTriangle size={16} /> Mark Encumbered
                    </button>

                    <button onClick={handleRequestCorrection} className="btn btn-secondary px-6 py-2 flex items-center gap-2">
                        <RefreshCcw size={16} /> Request Correction
                    </button>

                    <div className="flex-1"></div>

                    <button onClick={handleReject} className="btn btn-danger px-6 py-2 flex items-center gap-2">
                        <XCircle size={16} /> Reject
                    </button>
                </div>

            </div>

            <div className="mt-6 flex items-center gap-2 text-muted text-xs font-medium px-2">
                <ShieldCheck size={14} className="text-primary-glow" />
                Validation confirms matching coordinates and clear deed history.
            </div>
        </div>
    );
};

export default PropertyVerification;
