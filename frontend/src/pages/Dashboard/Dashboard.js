import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Building, FileText, CheckCircle, ShieldAlert, Landmark } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (userData && userData !== 'undefined') {
            try {
                setUser(JSON.parse(userData));
            } catch (e) {
                console.error("Failed to parse user data from localStorage", e);
            }
        }
    }, []);

    if (!user) return null;

    const getRoleSpecificCards = () => {
        switch (user.role) {
            case 'user':
                return (
                    <>
                        <Card hoverable onClick={() => navigate('/properties')} style={{ cursor: 'pointer' }}>
                            <Building size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>My Properties</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Manage your owned and listed properties.</p>
                        </Card>
                        <Card hoverable onClick={() => navigate('/sales')} style={{ cursor: 'pointer' }}>
                            <FileText size={32} color="var(--secondary)" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>Transactions</h3>
                            <p style={{ color: 'var(--text-muted)' }}>View and sign active property sales.</p>
                        </Card>
                        <Card hoverable onClick={() => navigate('/marketplace')} style={{ cursor: 'pointer' }}>
                            <Home size={32} color="var(--accent)" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>Marketplace</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Search and discover verified properties.</p>
                        </Card>
                    </>
                );
            case 'authority':
                return (
                    <>
                        <Card hoverable onClick={() => navigate('/admin/approvals')} style={{ cursor: 'pointer' }}>
                            <CheckCircle size={32} color="var(--accent)" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>Pending Approvals</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Review and approve properties and sales.</p>
                        </Card>
                        <Card hoverable onClick={() => navigate('/admin/recoveries')} style={{ cursor: 'pointer' }}>
                            <ShieldAlert size={32} color="var(--warning)" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ marginBottom: '0.5rem' }}>Wallet Recoveries</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Process user wallet recovery requests.</p>
                        </Card>
                    </>
                );
            case 'bank_admin':
                return (
                    <Card hoverable onClick={() => navigate('/bank')} style={{ cursor: 'pointer' }}>
                        <Landmark size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ marginBottom: '0.5rem' }}>Fund Blocks</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Manage ASBA-style fund blocking for sales.</p>
                    </Card>
                );
            case 'court':
                return (
                    <Card hoverable onClick={() => navigate('/court')} style={{ cursor: 'pointer' }}>
                        <Landmark size={32} color="var(--danger)" style={{ marginBottom: '1rem' }} />
                        <h3 style={{ marginBottom: '0.5rem' }}>Court Operations</h3>
                        <p style={{ color: 'var(--text-muted)' }}>Issue freeze orders and force transfers.</p>
                    </Card>
                );
            default:
                return null;
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '2rem' }}>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    Welcome, {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(user.walletAddress.length - 4)}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Role: <span style={{ textTransform: 'capitalize', color: 'var(--text-main)', fontWeight: '600' }}>{user.role}</span>
                    {' '} | KYC Status: <span style={{ color: user.kycStatus === 'approved' ? 'var(--accent)' : 'var(--warning)', fontWeight: '600', textTransform: 'capitalize' }}>{user.kycStatus}</span>
                </p>
            </div>

            <h2 style={{ marginBottom: '1.5rem' }}>Quick Actions</h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem'
            }}>
                {getRoleSpecificCards()}
            </div>

            <div style={{ marginTop: '3rem' }}>
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ margin: 0 }}>Recent Activity</h2>
                        <Button variant="outline">View All</Button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>No recent activity to display.</p>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
