import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/admin.service';
import { WaveChart } from '../../components/WaveChart';
import { TopNavbar } from '../../components/TopNavbar';
import {
    Activity, ShieldCheck, Clock, CheckCircle2,
    XCircle, AlertTriangle, UserCheck, Key, Landmark, Users,
    Building2, Loader2, RefreshCcw, ArrowRight, Eye, Shield
} from 'lucide-react';

const AdminDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState(null);

    // Real data state
    const [kycRequests, setKycRequests] = useState([]);
    const [properties, setProperties] = useState([]);
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
            if (propRes.status === 'fulfilled') setProperties(propRes.value.data?.data || []);
            if (salesRes.status === 'fulfilled') setSales(salesRes.value.data?.data || []);
            if (fundRes.status === 'fulfilled') setFundBlocks(fundRes.value.data?.data || []);
            if (recoveryRes.status === 'fulfilled') setRecoveries(recoveryRes.value.data?.data || []);
        } catch (err) {
            setError('Failed to load live dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Derived dynamic stats from actual database records
    const verifiedTitlesCount = properties.filter(p => p.status === 'verified' || p.status === 'active').length;
    const pendingReviewsCount = properties.filter(p => p.status === 'pending_verification' || p.status === 'pending').length;
    const activeMultiSigCount = sales.filter(s => s.status !== 'completed' && s.status !== 'cancelled').length;
    const completedSalesCount = sales.filter(s => s.status === 'completed').length;
    const onChainSettlements = sales.length > 0 
        ? `${((completedSalesCount / sales.length) * 100).toFixed(1)}%`
        : '100%';

    const handleQuickApprove = async (sale) => {
        if (!sale?.id) return;
        setActionLoading(sale.id);
        try {
            await adminService.approveSale(sale.id, 'Approved via Command Center Dashboard');
            fetchDashboardData();
        } catch (err) {
            alert(err.response?.data?.message || 'Approval failed');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#090D16' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Loader2 size={36} style={{ color: '#00E5FF' }} className="animate-spin" />
                    <p style={{ fontWeight: 700, letterSpacing: '0.05em', color: '#00E5FF', fontSize: '0.88rem' }}>Loading Command Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#090D16', color: '#FFFFFF' }} className="animate-fade-in">
            {/* Top Navbar Header */}
            <TopNavbar 
                title="Dashboard" 
                subtitle="Live on-chain status & multi-sig settlement overview"
                showLogo={false} 
                showNetwork={false}
                showNotifications={true}
                showProfile={true}
                customRight={
                    <button 
                        onClick={fetchDashboardData}
                        className="btn-dark-pill"
                        style={{ fontSize: '0.78rem' }}
                        title="Refresh live data"
                    >
                        <RefreshCcw size={14} /> Refresh
                    </button>
                }
            />

            <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#f87171', fontSize: '0.85rem', fontWeight: 600 }}>
                        {error}
                    </div>
                )}

                {/* ─── 4 Top Stat Cards ─── */}
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                        gap: '1.25rem',
                        marginBottom: '1.5rem' 
                    }}
                >
                    {/* Card 1: Verified Land Titles */}
                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>
                            Verified Land Titles
                        </span>
                        <p style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {verifiedTitlesCount}
                        </p>
                    </div>

                    {/* Card 2: Pending Surveyor Reviews */}
                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>
                            Pending Surveyor Reviews
                        </span>
                        <p style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {pendingReviewsCount}
                        </p>
                    </div>

                    {/* Card 3: Active Multi-Sig Sales */}
                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>
                            Active Multi-Sig Sales
                        </span>
                        <p style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {activeMultiSigCount}
                        </p>
                    </div>

                    {/* Card 4: On-Chain Settlements */}
                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>
                            On-Chain Settlements
                        </span>
                        <p style={{ fontSize: '2.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {onChainSettlements}
                        </p>
                    </div>
                </div>

                {/* ─── Middle Section: Glowing Dual-Wave Chart Card ─── */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <WaveChart height={170} />
                </div>

                {/* ─── Bottom Section: Recent Land Transactions Table ─── */}
                <div 
                    className="digi-card p-6"
                    style={{
                        background: 'linear-gradient(180deg, rgba(13, 20, 36, 0.95) 0%, rgba(9, 13, 22, 0.98) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '16px',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
                            Recent Land Transactions
                        </h3>
                        <button 
                            onClick={() => navigate('/authority/sales')} 
                            style={{ background: 'none', border: 'none', color: '#00E5FF', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                            View All Approvals <ArrowRight size={14} />
                        </button>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Property ID</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Owner Wallet</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Boundary / District</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>ASBA Fund Lock</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Multi-Sig Signatures</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', fontWeight: 600, color: '#64748B', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B', fontSize: '0.88rem' }}>
                                            No land transactions recorded on-chain yet.
                                        </td>
                                    </tr>
                                ) : (
                                    sales.slice(0, 10).map((s, idx) => {
                                        const propCode = s.propertyCode ? `DV-${s.propertyCode}` : (s.propertyId ? `DV-${s.propertyId.slice(0, 6)}` : `DV-#${idx + 1}`);
                                        const sellerShort = s.sellerWallet ? `${s.sellerWallet.slice(0, 6)}...${s.sellerWallet.slice(-4)}` : 'Pending';
                                        const boundary = s.district ? `${s.district}` : 'Cadastral Parcel';
                                        const sigCount = (s.sellerSigned ? 1 : 0) + (s.buyerSigned ? 1 : 0) + (s.authoritySigned ? 1 : 0);

                                        return (
                                            <tr 
                                                key={s.id || idx}
                                                style={{ 
                                                    borderBottom: idx < Math.min(sales.length, 10) - 1 ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
                                                    transition: 'background 0.2s ease'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                {/* Property ID */}
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.9rem', fontWeight: 600, color: '#F8FAFC', fontFamily: 'JetBrains Mono, monospace' }}>
                                                    {propCode}
                                                </td>

                                                {/* Owner Wallet */}
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                                                    {sellerShort}
                                                </td>

                                                {/* Boundary / District */}
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#94A3B8' }}>
                                                    {boundary}
                                                </td>

                                                {/* ASBA Fund Lock Status */}
                                                <td style={{ padding: '1.1rem 1rem' }}>
                                                    {s.fundsBlocked ? (
                                                        <span className="badge-active-green">
                                                            Active
                                                        </span>
                                                    ) : (
                                                        <span className="badge-blocked-red">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Multi-Sig Signatures */}
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>
                                                    {sigCount}/3 Signed
                                                </td>

                                                {/* Action Buttons */}
                                                <td style={{ padding: '1.1rem 1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.6rem' }}>
                                                        <button 
                                                            onClick={() => navigate(s.propertyId ? `/properties/${s.propertyId}` : `/sale/${s.id}`)}
                                                            className="btn-dark-pill"
                                                            style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
                                                        >
                                                            Review
                                                        </button>
                                                        {!s.authoritySigned && (
                                                            <button 
                                                                onClick={() => handleQuickApprove(s)}
                                                                className="btn-cyan-glow"
                                                                style={{ padding: '0.4rem 1.1rem', fontSize: '0.78rem', borderRadius: '8px' }}
                                                                disabled={actionLoading === s.id}
                                                            >
                                                                {actionLoading === s.id ? <Loader2 size={12} className="animate-spin" /> : 'Approve'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
