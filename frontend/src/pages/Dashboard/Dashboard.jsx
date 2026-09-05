import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { TopNavbar } from '../../components/TopNavbar';
import { WaveChart } from '../../components/WaveChart';
import {
    Wallet, Activity, ShieldCheck, Building, CheckCircle2,
    Clock, AlertTriangle, ArrowUpRight, ArrowDownLeft,
    Bell, XCircle, MapPin, ExternalLink, PlusCircle, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';
import './PropertyPages.css';

const DashboardHome = () => {
    const { user } = useAuth();
    const { account } = useWeb3();
    const navigate = useNavigate();

    const [properties, setProperties] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                const [propsRes, salesRes] = await Promise.all([
                    propertyService.getMyProperties(),
                    saleService.getMySales()
                ]);
                if (propsRes.data?.data) setProperties(propsRes.data.data);
                if (salesRes.data?.data) setSales(salesRes.data.data);
            } catch (error) {
                console.error('Failed to load dashboard data', error);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchDashboardData();
    }, [user]);

    const activeSales = sales.filter(s => s.sellerWallet?.toLowerCase() === (account || user?.walletAddress)?.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled');
    const activePurchases = sales.filter(s => s.buyerWallet?.toLowerCase() === (account || user?.walletAddress)?.toLowerCase() && s.status !== 'completed' && s.status !== 'cancelled');
    const verifiedProperties = properties.filter(p => p.status === 'verified');
    const completedTransactions = sales.filter(s => s.status === 'completed');
    const settlementRate = sales.length > 0 ? `${((completedTransactions.length / sales.length) * 100).toFixed(1)}%` : '100%';

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', width: '100%', alignItems: 'center', justifyContent: 'center', background: '#0B0F19' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }} className="animate-pulse">
                    <Activity style={{ width: '2.5rem', height: '2.5rem', color: '#0284C7' }} className="animate-spin" />
                    <p style={{ fontWeight: 600, letterSpacing: '0.02em', fontSize: '0.9rem', color: '#94A3B8' }}>Loading Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#F8FAFC' }} className="animate-fade-in">
            {/* Top Navbar */}
            <TopNavbar 
                title="Dashboard" 
                subtitle={`Welcome back, ${user?.name || 'Citizen'}`}
                showLogo={false} 
                showNetwork={true}
                showNotifications={true}
                showProfile={true}
            />

            <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
                {/* ─── 4 Stat Cards ─── */}
                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                        gap: '1.25rem',
                        marginBottom: '1.5rem' 
                    }}
                >
                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>Verified Land Titles</span>
                        <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {verifiedProperties.length}
                        </p>
                    </div>

                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>My Properties</span>
                        <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {properties.length}
                        </p>
                    </div>

                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>Active Multi-Sig Sales</span>
                        <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {activeSales.length + activePurchases.length}
                        </p>
                    </div>

                    <div className="digi-stat-card">
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#94A3B8' }}>On-Chain Settlements</span>
                        <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.02em', margin: 0, marginTop: '0.5rem' }}>
                            {settlementRate}
                        </p>
                    </div>
                </div>

                {/* ─── Middle Section: Dynamic Dual-Wave Chart Card ─── */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <WaveChart height={170} properties={properties} sales={sales} />
                </div>

                {/* ─── Bottom Section: Recent Land Transactions Table ─── */}
                <div 
                    className="digi-card p-6"
                    style={{
                        background: '#0F172A',
                        border: '1px solid #1E293B',
                        borderRadius: '12px',
                        overflow: 'hidden'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                        <div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F8FAFC', margin: 0 }}>
                                Recent Land Transactions
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '4px 0 0 0' }}>Multi-sig contracts and title transfer ledger</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button 
                                onClick={() => navigate('/register-property')}
                                className="btn-cyan-outline"
                                style={{ fontSize: '0.8rem' }}
                            >
                                <PlusCircle size={14} /> Register Property
                            </button>
                            <button 
                                onClick={() => navigate('/transactions')} 
                                className="btn-dark-pill"
                                style={{ fontSize: '0.8rem' }}
                            >
                                View All Transactions <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #1E293B' }}>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Property ID</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner Wallet</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Boundary / Location</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ASBA Fund Lock</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multi-Sig Signatures</th>
                                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: '#94A3B8', fontSize: '0.88rem' }}>
                                            <p style={{ margin: '0 0 1rem 0', color: '#94A3B8', fontWeight: 500 }}>No active or past land transactions found for your account.</p>
                                            <button 
                                                onClick={() => navigate('/register-property')}
                                                className="btn-cyan-glow"
                                                style={{ fontSize: '0.8rem', padding: '0.5rem 1.2rem' }}
                                            >
                                                Register a Property to Get Started
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    sales.map((s, idx) => {
                                        const propCode = s.propertyCode ? `DV-${s.propertyCode}` : (s.propertyId ? `DV-${s.propertyId.slice(0, 6)}` : `DV-#${idx + 1}`);
                                        const sellerShort = s.sellerWallet ? `${s.sellerWallet.slice(0, 6)}...${s.sellerWallet.slice(-4)}` : 'Pending';
                                        const boundary = s.district ? `${s.district}` : (s.addressLine || 'Cadastral Parcel');
                                        const sigCount = (s.sellerSigned ? 1 : 0) + (s.buyerSigned ? 1 : 0) + (s.authoritySigned ? 1 : 0);

                                        return (
                                            <tr 
                                                key={s.id || idx}
                                                style={{ 
                                                    borderBottom: idx < sales.length - 1 ? '1px solid #1E293B' : 'none',
                                                    transition: 'background 0.15s ease'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#1E293B40'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.88rem', fontWeight: 600, color: '#F8FAFC', fontFamily: 'JetBrains Mono, monospace' }}>
                                                    {propCode}
                                                </td>
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                                                    {sellerShort}
                                                </td>
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', color: '#94A3B8' }}>
                                                    {boundary}
                                                </td>
                                                <td style={{ padding: '1.1rem 1rem' }}>
                                                    {s.fundsBlocked ? (
                                                        <span className="badge-active-green">Active</span>
                                                    ) : (
                                                        <span className="badge-blocked-red">Pending</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1.1rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#F8FAFC' }}>
                                                    {sigCount}/3 Signed
                                                </td>
                                                <td style={{ padding: '1.1rem 1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.6rem' }}>
                                                        <button 
                                                            onClick={() => navigate(s.propertyId ? `/properties/${s.propertyId}` : `/sale/${s.id}`)}
                                                            className="btn-dark-pill"
                                                            style={{ padding: '0.4rem 0.9rem', fontSize: '0.78rem' }}
                                                        >
                                                            Review
                                                        </button>
                                                        <button 
                                                            onClick={() => navigate(`/sale/${s.id}/review`)}
                                                            className="btn-cyan-glow"
                                                            style={{ padding: '0.4rem 1.1rem', fontSize: '0.78rem', borderRadius: '8px' }}
                                                        >
                                                            Sign
                                                        </button>
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

export default DashboardHome;
