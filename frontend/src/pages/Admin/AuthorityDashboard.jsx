import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Activity, ShieldCheck, Clock, CheckCircle2,
    XCircle, Shield, AlertTriangle, UserCheck, Key, RefreshCcw, Landmark, Users
} from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('kyc');

    // Mock quick statistics
    const stats = [
        { label: 'Pending KYC', value: 12, icon: UserCheck, color: 'hsl(38,92%,50%)' },
        { label: 'Property Verifications', value: 8, icon: Activity, color: 'hsl(255,85%,65%)' },
        { label: 'Sale Approvals', value: 15, icon: Clock, color: 'hsl(280,80%,60%)' },
        { label: 'Disputed Properties', value: 3, icon: AlertTriangle, color: 'hsl(348,83%,47%)' },
    ];

    // Mock pending lists across categories
    const kycRequests = [
        { id: '1', user: 'Harsh Vardhan', wallet: '0x1A4F...3D2B', status: 'Pending Review' },
        { id: '2', user: 'Anjali Sharma', wallet: '0x3F8A...2A11', status: 'Pending Review' }
    ];

    const propertyRequests = [
        { id: 'prop-102', district: 'Pune', surveyNumber: 'SY-89B', requestedBy: '0x1A4F...3D2B' },
        { id: 'prop-103', district: 'Mumbai', surveyNumber: 'MY-11A', requestedBy: '0x3F8A...2A11' }
    ];

    const saleApprovals = [
        { id: 'tx-5', property: 'prop-15', buyer: '0x111.', seller: '0x222.', value: '₹4,500,000' }
    ];

    const StatCard = ({ icon: Icon, label, value, color }) => (
        <div className="glass-panel relative overflow-hidden p-6 cursor-pointer">
            <div className="stat-card-glow" style={{ background: color, position: 'absolute', inset: 0, opacity: 0.1, zIndex: 0 }}></div>
            <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg" style={{ border: `1px solid ${color}30`, background: `${color}10` }}>
                        <Icon size={20} style={{ color }} />
                    </div>
                    <span className="text-sm font-medium text-white/80">{label}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
            </div>
        </div>
    );

    const TABS = [
        { key: 'kyc', label: 'KYC', icon: UserCheck, count: 12 },
        { key: 'property', label: 'Verifications', icon: Activity, count: 8 },
        { key: 'sale', label: 'Sales', icon: Clock, count: 15 },
        { key: 'fund', label: 'Fund Blocks', icon: Landmark, count: 4 },
        { key: 'recovery', label: 'Wallet Recovery', icon: Key, count: 2 },
        { key: 'disputes', label: 'Disputes', icon: AlertTriangle, count: 3 }
    ];

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header">
                <div>
                    <h1 className="dashboard-title">
                        Authority <span className="text-gradient">Command Center</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.95rem' }}>
                        Oversee and manage incoming verifications, sales, and disputes.
                    </p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="stats-grid mb-8">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            {/* Central Control Panel */}
            <div className="glass-panel p-6">
                <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4">
                    {TABS.map(tab => {
                        const TabIcon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                                    ${isActive ? 'bg-primary-base/20 text-primary-glow border border-primary-base/40' : 'bg-black/20 text-muted border border-white/5 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                <TabIcon size={16} />
                                {tab.label}
                                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-primary-base/30 text-white' : 'bg-white/10 text-muted'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="min-h-[300px]">
                    {activeTab === 'kyc' && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Pending KYC Approvals</h3>
                            {kycRequests.length === 0 ? (
                                <p className="text-muted text-sm">No pending KYC verifications.</p>
                            ) : (
                                <div className="space-y-3">
                                    {kycRequests.map(kr => (
                                        <div key={kr.id} className="list-item flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500/20 to-yellow-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
                                                    <Users size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{kr.user}</p>
                                                    <p className="text-xs text-muted font-mono mt-1">{kr.wallet}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}><CheckCircle2 size={14} /> Approve</button>
                                                <button className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}><XCircle size={14} /> Reject</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'property' && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Pending Property Verifications</h3>
                            <div className="space-y-3">
                                {propertyRequests.map(pr => (
                                    <div key={pr.id} className="list-item flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                                        <div>
                                            <p className="font-bold text-white text-sm">Survey: {pr.surveyNumber} ({pr.district})</p>
                                            <p className="text-xs text-muted mt-1">Request by: <span className="font-mono">{pr.requestedBy}</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Review Details</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'sale' && (
                        <div>
                            <h3 className="text-lg font-bold text-white mb-4">Pending Sale Approvals</h3>
                            <div className="space-y-3">
                                {saleApprovals.map(tx => (
                                    <div key={tx.id} className="list-item flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-primary-base/20 border border-primary-base/30 flex items-center justify-center text-primary-glow">
                                                <Activity size={18} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-sm">Tx: {tx.id} | {tx.property}</p>
                                                <p className="text-xs text-muted mt-1 font-mono">From: {tx.seller} ➔ To: {tx.buyer}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <span className="font-bold text-primary-glow">{tx.value}</span>
                                            <button className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Verify</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'fund' && (
                        <div className="flex flex-col items-center justify-center py-12 opacity-60">
                            <Landmark size={48} className="mb-4 text-primary-glow" />
                            <p>No pending fund blocking confirmations</p>
                        </div>
                    )}

                    {activeTab === 'recovery' && (
                        <div className="flex flex-col items-center justify-center py-12 opacity-60">
                            <Key size={48} className="mb-4 text-orange-400" />
                            <p>No wallet recovery requests at this time</p>
                        </div>
                    )}

                    {activeTab === 'disputes' && (
                        <div className="flex flex-col items-center justify-center py-12 opacity-60">
                            <Shield size={48} className="mb-4 text-red-500" />
                            <p>No active disputes to resolve</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center gap-2 text-muted text-xs font-medium px-2">
                <ShieldCheck size={14} className="text-primary-glow" />
                System access securely verified. All actions are indelibly logged on-chain.
            </div>
        </div>
    );
};

export default AdminDashboard;
