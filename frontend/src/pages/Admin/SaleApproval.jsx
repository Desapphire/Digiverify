import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Activity, ArrowDownLeft, ArrowUpRight, CheckCircle2, XCircle,
    Zap, ShieldAlert, Fingerprint, Banknote, ShieldCheck
} from 'lucide-react';

const PremiumSaleApproval = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    return (
        <div className="dashboard-container w-full min-h-screen relative" style={{ background: '#090514' }}>
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 container-lg">
                {/* Header */}
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                                <Zap size={16} className="text-purple-400" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                Transaction <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">Validation System</span>
                            </h1>
                        </div>
                        <p className="text-white/40 text-sm flex items-center gap-2">
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-black/40 border border-white/10">{id || 'TXN-9028A-F8'}</span>
                            Awaiting Authority Clearance
                        </p>
                    </div>
                    <button onClick={() => navigate(-1)} className="px-4 py-2 rounded border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
                        Return
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Verifications */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500"></div>

                            <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-purple-400" /> Critical Checks
                            </h3>

                            <div className="space-y-4">
                                {[
                                    { label: 'Asset Active Status', val: true },
                                    { label: 'Seller Ownership Verified', val: true },
                                    { label: 'Zero Encumbrance Scan', val: true },
                                    { label: 'Fiat Escrow Confirmed', val: true }
                                ].map((chk, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                        <span className="text-sm font-medium text-white/60">{chk.label}</span>
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                                            <CheckCircle2 size={12} className="text-emerald-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Data & Actions */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
                            <h3 className="text-sm font-bold text-white/80 uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                                Contract Matrix
                            </h3>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ArrowUpRight size={14} className="text-purple-400" /> Seller Identity
                                    </p>
                                    <div className="font-mono text-sm text-white/80 p-3 bg-black/40 border border-white/5 rounded-lg break-all">
                                        0x71C...976F
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <ArrowDownLeft size={14} className="text-indigo-400" /> Buyer Identity
                                    </p>
                                    <div className="font-mono text-sm text-white/80 p-3 bg-black/40 border border-white/5 rounded-lg break-all">
                                        0xA32...104B
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Fingerprint size={14} className="text-white/40" /> Property Asset
                                    </p>
                                    <div className="font-mono text-sm text-white/80">
                                        PRP-299-XCV
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-emerald-400/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Banknote size={14} className="text-emerald-400" /> Escrow Value
                                    </p>
                                    <div className="text-2xl font-bold text-emerald-400">
                                        ₹ 4,500,000
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                                <button className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2">
                                    <CheckCircle2 size={18} /> Authorize Transfer
                                </button>

                                <button className="px-6 py-3 rounded-lg bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20 hover:bg-orange-500/20 transition-all flex items-center gap-2">
                                    <ShieldAlert size={18} /> Freeze
                                </button>

                                <button className="px-6 py-3 rounded-lg bg-red-500/10 text-red-400 font-bold border border-red-500/20 hover:bg-red-500/20 transition-all flex items-center gap-2">
                                    <XCircle size={18} /> Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PremiumSaleApproval;
