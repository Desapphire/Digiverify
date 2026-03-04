import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import {
    Activity, ShieldCheck, Clock, CheckCircle2,
    XCircle, AlertTriangle, UserCheck, Key, Landmark, Users,
    Building2, Loader2, RefreshCcw
} from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('kyc');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Real data state
    const [kycRequests, setKycRequests] = useState([]);
    const [pendingProperties, setPendingProperties] = useState([]);
    const [sales, setSales] = useState([]);
    const [fundBlocks, setFundBlocks] = useState([]);
    const [recoveries, setRecoveries] = useState([]);

    const fetchDashboardData = async () => {
        setLoading(true);
        setError('');
        try {
            const [kycRes, propRes, salesRes, fundRes, recoveryRes] = await Promise.allSettled([
                adminService.listUsers('pending'),
                adminService.listProperties(),
                adminService.listSales(),
                adminService.getPendingFundBlocks(),
                adminService.getPendingRecoveries(),
            ]);

            if (kycRes.status === 'fulfilled') setKycRequests(kycRes.value.data?.data || []);
            if (propRes.status === 'fulfilled') setPendingProperties(propRes.value.data?.data || []);
            if (salesRes.status === 'fulfilled') setSales(salesRes.value.data?.data || []);
            if (fundRes.status === 'fulfilled') setFundBlocks(fundRes.value.data?.data || []);
            if (recoveryRes.status === 'fulfilled') setRecoveries(recoveryRes.value.data?.data || []);
        } catch (err) {
            setError('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Compute stats from real data
    const pendingSales = sales.filter(s => !s.authoritySigned && s.status !== 'completed' && s.status !== 'cancelled');
    const stats = [
        { label: 'Pending KYC', value: kycRequests.length, icon: UserCheck, color: 'hsl(38,92%,50%)' },
        { label: 'Property Verifications', value: pendingProperties.length, icon: Building2, color: 'hsl(255,85%,65%)' },
        { label: 'Sale Approvals', value: pendingSales.length, icon: Clock, color: 'hsl(280,80%,60%)' },
        { label: 'Wallet Recovery', value: recoveries.length, icon: Key, color: 'hsl(142,71%,45%)' },
    ];

    const TABS = [
        { key: 'kyc', label: 'KYC', icon: UserCheck, count: kycRequests.length },
        { key: 'property', label: 'Properties', icon: Building2, count: pendingProperties.length },
        { key: 'sale', label: 'Sales', icon: Clock, count: pendingSales.length },
        { key: 'fund', label: 'Fund Blocks', icon: Landmark, count: fundBlocks.length },
        { key: 'recovery', label: 'Recovery', icon: Key, count: recoveries.length },
    ];

    const StatCard = ({ icon: Icon, label, value, color }) => (
        <div className="glass-panel relative overflow-hidden p-6 cursor-pointer" style={{ cursor: 'default' }}>
            <div style={{ background: color, position: 'absolute', inset: 0, opacity: 0.08, zIndex: 0 }}></div>
            <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 rounded-lg" style={{ border: `1px solid ${color}30`, background: `${color}10` }}>
                        <Icon size={20} style={{ color }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{label}</span>
                </div>
                <p style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'white' }}>{value}</p>
            </div>
        </div>
    );

    const shortenWallet = (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '—';

    const EmptyState = ({ icon: Icon, message, color = 'rgba(255,255,255,0.3)' }) => (
        <div className="flex flex-col items-center justify-center" style={{ padding: '3rem 0', opacity: 0.6 }}>
            <Icon size={40} style={{ marginBottom: '1rem', color }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{message}</p>
        </div>
    );

    const handleApproveKyc = async (userId) => {
        try {
            await adminService.approveKyc(userId);
            fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed');
        }
    };

    const handleRejectKyc = async (userId) => {
        try {
            await adminService.rejectKyc(userId);
            fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Rejection failed');
        }
    };

    const handleApproveProperty = async (propertyId) => {
        try {
            await adminService.approveProperty(propertyId);
            fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed');
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container flex items-center justify-center" style={{ minHeight: '60vh' }}>
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="animate-spin" style={{ color: 'hsl(0,85%,60%)' }} />
                    <p className="text-muted text-sm font-bold">Loading command center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            {/* Header */}
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 className="dashboard-title">
                        Authority <span className="text-gradient">Command Center</span>
                    </h1>
                    <p className="text-muted mt-2" style={{ fontSize: '0.95rem' }}>
                        Live data — Oversee verifications, sales, and approvals.
                    </p>
                </div>
                <button onClick={fetchDashboardData} className="btn btn-secondary" style={{ gap: '0.5rem' }}>
                    <RefreshCcw size={16} /> Refresh
                </button>
            </div>

            {error && (
                <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
                    {error}
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="stats-grid mb-8">
                {stats.map((stat, idx) => (
                    <StatCard key={idx} {...stat} />
                ))}
            </div>

            {/* Central Control Panel */}
            <div className="glass-panel p-6">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1rem' }}>
                    {TABS.map(tab => {
                        const TabIcon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2`}
                                style={{
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.82rem',
                                    fontWeight: 700,
                                    border: isActive ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(255,255,255,0.05)',
                                    background: isActive ? 'rgba(220,38,38,0.12)' : 'rgba(0,0,0,0.2)',
                                    color: isActive ? '#fca5a5' : 'rgba(255,255,255,0.4)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <TabIcon size={15} />
                                {tab.label}
                                <span style={{
                                    marginLeft: '4px',
                                    padding: '1px 6px',
                                    borderRadius: '9999px',
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    background: isActive ? 'rgba(220,38,38,0.2)' : 'rgba(255,255,255,0.06)',
                                    color: isActive ? 'white' : 'rgba(255,255,255,0.3)',
                                }}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div style={{ minHeight: '300px' }}>
                    {/* ─── KYC TAB ─── */}
                    {activeTab === 'kyc' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Pending KYC Approvals</h3>
                            {kycRequests.length === 0 ? (
                                <EmptyState icon={UserCheck} message="No pending KYC verifications." color="hsl(38,92%,50%)" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {kycRequests.map(u => (
                                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="flex items-center gap-4">
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(234,179,8,0.15), rgba(245,158,11,0.1))', border: '1px solid rgba(234,179,8,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                                    <Users size={18} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>{u.name || 'Unknown'}</p>
                                                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginTop: 2 }}>{shortenWallet(u.walletAddress)}</p>
                                                    {u.email && <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{u.email}</p>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleApproveKyc(u.id)} className="btn btn-success" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', color: 'hsl(142,71%,45%)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '0.5rem' }}>
                                                    <CheckCircle2 size={14} /> Approve
                                                </button>
                                                <button onClick={() => handleRejectKyc(u.id)} className="btn btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── PROPERTY TAB ─── */}
                    {activeTab === 'property' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Pending Property Verifications</h3>
                            {pendingProperties.length === 0 ? (
                                <EmptyState icon={Building2} message="No pending property verifications." color="hsl(255,85%,65%)" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {pendingProperties.map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div>
                                                <p style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>
                                                    {p.propertyCode || 'No Code'} — Survey: {p.surveyNumber}
                                                </p>
                                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>
                                                    {p.district || '—'}, {p.state || '—'} · {p.areaSqft ? `${p.areaSqft} sqft` : '—'}
                                                </p>
                                                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 2 }}>
                                                    Owner: {shortenWallet(p.ownerWallet)}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleApproveProperty(p.id)} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', background: 'rgba(34,197,94,0.1)', color: 'hsl(142,71%,45%)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '0.5rem' }}>
                                                    <CheckCircle2 size={14} /> Approve
                                                </button>
                                                <button onClick={() => navigate(`/authority/property/${p.id}`)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                                    Review
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── SALES TAB ─── */}
                    {activeTab === 'sale' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Sale Transactions</h3>
                            {sales.length === 0 ? (
                                <EmptyState icon={Activity} message="No sale transactions found." color="hsl(280,80%,60%)" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {sales.map(tx => (
                                        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div className="flex items-center gap-4">
                                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                                                    <Activity size={18} />
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>
                                                        Sale #{tx.id.slice(0, 8)}
                                                    </p>
                                                    <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginTop: 2 }}>
                                                        {shortenWallet(tx.sellerWallet)} → {shortenWallet(tx.buyerWallet)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4 items-center">
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{ fontWeight: 700, color: '#a78bfa' }}>₹{tx.salePrice?.toLocaleString()}</span>
                                                    <div style={{ marginTop: 4, display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                                        <span className={`badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'cancelled' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.6rem' }}>
                                                            {tx.status}
                                                        </span>
                                                        {tx.authoritySigned && <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Signed</span>}
                                                    </div>
                                                </div>
                                                {!tx.authoritySigned && tx.status !== 'completed' && tx.status !== 'cancelled' && (
                                                    <button onClick={() => navigate(`/authority/sale/${tx.id}`)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                                        Review
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── FUND BLOCKS TAB ─── */}
                    {activeTab === 'fund' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Pending Fund Block Confirmations</h3>
                            {fundBlocks.length === 0 ? (
                                <EmptyState icon={Landmark} message="No pending fund block confirmations." color="hsl(255,85%,65%)" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {fundBlocks.map(fb => (
                                        <div key={fb.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div>
                                                <p style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>
                                                    Fund Block #{(fb.id || '').toString().slice(0, 8)}
                                                </p>
                                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                                                    Amount: ₹{parseFloat(fb.block_amount || fb.blockAmount || 0).toLocaleString()} · {fb.currency || 'INR'}
                                                </p>
                                                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 2 }}>
                                                    Buyer: {shortenWallet(fb.buyer_wallet || fb.buyerWallet)}
                                                </p>
                                            </div>
                                            <div>
                                                <span className={`badge ${fb.status === 'blocked' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                                    {fb.status || 'pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ─── WALLET RECOVERY TAB ─── */}
                    {activeTab === 'recovery' && (
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>Pending Wallet Recovery Requests</h3>
                            {recoveries.length === 0 ? (
                                <EmptyState icon={Key} message="No wallet recovery requests at this time." color="hsl(38,92%,50%)" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {recoveries.map(r => (
                                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <div>
                                                <p style={{ fontWeight: 700, color: 'white', fontSize: '0.88rem' }}>
                                                    Recovery #{(r.id || '').toString().slice(0, 8)}
                                                </p>
                                                <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginTop: 2 }}>
                                                    User: {shortenWallet(r.old_wallet || r.oldWallet || r.user_id)}
                                                </p>
                                                <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                                                    Status: {r.status}
                                                </p>
                                            </div>
                                            <button onClick={() => navigate(`/authority/wallet-recovery/${r.id}`)} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
                                                Review
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.72rem', fontWeight: 600, padding: '0 0.5rem' }}>
                <ShieldCheck size={14} style={{ color: '#ef4444' }} />
                System access securely verified. All actions are indelibly logged on-chain.
            </div>
        </div>
    );
};

export default AdminDashboard;
