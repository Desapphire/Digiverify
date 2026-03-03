import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const KYCApproval = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock functions for shell
    const handleApprove = () => {
        // User status -> VERIFIED
        console.log(`Approving KYC for ${id}`);
    };

    const handleReject = () => {
        // User status -> REJECTED
        console.log(`Rejecting KYC for ${id}`);
    };

    const handleRequestMoreDocs = () => {
        console.log(`Requesting more docs for KYC ${id}`);
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header mb-6">
                <div>
                    <h1 className="dashboard-title text-2xl font-bold">
                        <span className="text-gradient">KYC Approval</span>
                    </h1>
                    <p className="text-muted text-sm mt-1">Reviewing Request ID: {id}</p>
                </div>
                <button className="btn btn-secondary text-sm" onClick={() => navigate(-1)}>
                    Back to Dashboard
                </button>
            </div>

            <div className="glass-panel p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* User Details */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">User Details</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-1">Full Name</p>
                                <p className="text-white font-medium">[Mock Full Name]</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-1">Wallet Address</p>
                                <p className="font-mono text-sm text-primary-glow">0x[Mock...Wallet]</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-1">Government ID</p>
                                <p className="text-white font-medium">[Mock Gov ID Number]</p>
                            </div>
                        </div>
                    </div>

                    {/* Documents */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-2">Documents & Verification</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-2">Uploaded Documents</p>
                                <div className="h-32 bg-black/30 rounded border border-white/10 flex items-center justify-center text-muted text-sm">
                                    [Document Preview Placeholder]
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted uppercase tracking-wider mb-2">Face Image</p>
                                <div className="h-32 w-32 bg-black/30 rounded-full border border-white/10 flex items-center justify-center text-muted text-sm shrink-0">
                                    [Face Preview]
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4">
                    <button onClick={handleApprove} className="btn btn-success px-6 py-2 shadow-glow-primary">
                        Approve (VERIFIED)
                    </button>
                    <button onClick={handleReject} className="btn btn-danger px-6 py-2">
                        Reject (REJECTED)
                    </button>
                    <button onClick={handleRequestMoreDocs} className="btn btn-warning px-6 py-2">
                        Request Additional Documents
                    </button>
                </div>
            </div>
        </div>
    );
};

export default KYCApproval;
