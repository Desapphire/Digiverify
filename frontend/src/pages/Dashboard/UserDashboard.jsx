import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useWeb3 } from '../../context/Web3Context';
import { propertyService } from '../../services/property.service';
import { saleService } from '../../services/sale.service';
import { User, Wallet, Activity, ShieldCheck, FileText, CheckCircle2, Clock, MapPin, Building, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UserDashboard = () => {
    const { user, logout } = useAuth();
    const { account } = useWeb3();
    const navigate = useNavigate();

    const [activeTab, setActiveTab] = useState('overview'); // overview, properties, sales
    const [properties, setProperties] = useState([]);
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                // Fetch user's properties and sales
                const [propsRes, salesRes] = await Promise.all([
                    propertyService.getMyProperties(),
                    saleService.getMySales()
                ]);

                if (propsRes.data?.data) setProperties(propsRes.data.data);
                if (salesRes.data?.data) setSales(salesRes.data.data);
            } catch (error) {
                console.error("Failed to load dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchDashboardData();
        }
    }, [user]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <div className="flex flex-col items-center gap-4 animate-pulse-glow">
                    <div className="w-16 h-16 rounded-full border-4 border-blue-500/30 border-t-blue-500 animate-spin"></div>
                    <p className="text-muted font-bold tracking-widest uppercase text-sm">Loading Identity...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 pt-12">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">
                        Welcome, <span className="text-gradient">{user?.name || 'Citizen'}</span>
                    </h1>
                    <div className="flex items-center gap-3">
                        <span className={`badge ${user?.kycStatus === 'approved' ? 'badge-success' : user?.kycStatus === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                            KYC: {user?.kycStatus?.toUpperCase() || 'UNKNOWN'}
                        </span>
                        <span className="text-sm font-mono text-muted flex items-center gap-2">
                            <Wallet size={14} /> {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}
                        </span>
                    </div>
                </div>
                <button onClick={handleLogout} className="btn btn-secondary text-sm px-4 py-2">
                    <LogOut size={16} /> Disconnect
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-subtle mb-8 pb-4">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest relative ${activeTab === 'overview' ? 'text-primary-glow' : 'text-muted hover:text-white'}`}
                >
                    Identity Profile
                    {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-base rounded-t-full shadow-glow-primary"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('properties')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest relative ${activeTab === 'properties' ? 'text-primary-glow' : 'text-muted hover:text-white'}`}
                >
                    My Properties
                    {activeTab === 'properties' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-base rounded-t-full shadow-glow-primary"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('sales')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest relative ${activeTab === 'sales' ? 'text-primary-glow' : 'text-muted hover:text-white'}`}
                >
                    Transactions
                    {activeTab === 'sales' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-base rounded-t-full shadow-glow-primary"></div>}
                </button>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content (Changes based on tab) */}
                <div className="md:col-span-2 space-y-6">
                    {activeTab === 'overview' && (
                        <div className="glass-panel p-8">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <User className="text-primary-glow" /> Profile Information
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Full Name</p>
                                    <p className="font-medium text-lg">{user?.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Registered Email</p>
                                    <p className="font-medium text-lg">{user?.email}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Phone Number</p>
                                    <p className="font-medium text-lg">{user?.phone || 'Not Provided'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted uppercase font-bold tracking-widest mb-1">Birthdate</p>
                                    <p className="font-medium text-lg">{user?.birthdate ? new Date(user.birthdate).toLocaleDateString() : 'Not Provided'}</p>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-subtle">
                                <h4 className="text-sm font-bold text-muted uppercase tracking-widest mb-4">Security & Verification</h4>
                                <div className="flex gap-4">
                                    <div className={`flex-1 p-4 rounded-xl flex items-center gap-4 border ${user?.faceVerified ? 'bg-green-500/10 border-green-500/20 text-success' : 'bg-white/5 border-subtle text-white'}`}>
                                        <ShieldCheck size={24} />
                                        <div>
                                            <p className="text-sm font-bold">Biometric Face ID</p>
                                            <p className="text-xs opacity-80">{user?.faceVerified ? 'Verified & Bound' : 'Pending Verification'}</p>
                                        </div>
                                    </div>
                                    <div className={`flex-1 p-4 rounded-xl flex items-center gap-4 border ${user?.kycStatus === 'approved' ? 'bg-green-500/10 border-green-500/20 text-success' : 'bg-yellow-500/10 border-yellow-500/20 text-warning'}`}>
                                        <FileText size={24} />
                                        <div>
                                            <p className="text-sm font-bold">Document KYC</p>
                                            <p className="text-xs opacity-80 capitalize">{user?.kycStatus} Status</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'properties' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold">Registered Assets ({properties.length})</h3>
                                <button onClick={() => navigate('/register-property')} className="btn btn-primary text-sm px-4 py-2">Register Asset</button>
                            </div>

                            {properties.length === 0 ? (
                                <div className="glass-panel p-12 text-center text-muted">
                                    <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>You have no registered properties under this wallet.</p>
                                </div>
                            ) : (
                                properties.map((prop) => (
                                    <div key={prop.id} onClick={() => navigate(`/properties/${prop.id}`)} className="glass-panel p-6 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer border-l-4 border-l-blue-500">
                                        <div>
                                            <h4 className="font-bold text-lg mb-1 flex items-center gap-2">
                                                Survey No: {prop.surveyNumber}
                                                {prop.status === 'verified' && <CheckCircle2 size={16} className="text-success" />}
                                            </h4>
                                            <p className="text-sm text-muted flex items-center gap-1">
                                                <MapPin size={14} /> {prop.district}, {prop.state}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-mono text-muted mb-1">{prop.areaSqft} sq.ft</p>
                                            <span className={`badge ${prop.status === 'verified' ? 'badge-success' : 'badge-warning'}`}>
                                                {prop.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold mb-6">Active Sales & Transactions ({sales.length})</h3>
                            {sales.length === 0 ? (
                                <div className="glass-panel p-12 text-center text-muted">
                                    <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No active property transactions found.</p>
                                </div>
                            ) : (
                                sales.map((sale) => (
                                    <div key={sale.id} onClick={() => navigate(`/properties/${sale.propertyId}`)} className="glass-panel p-6 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="badge badge-neutral">Sale ASBA</span>
                                                <span className={`badge ${sale.status === 'completed' ? 'badge-success' : 'badge-warning'}`}>{sale.status}</span>
                                            </div>
                                            <p className="text-sm">Property ID: <span className="font-mono text-muted">{sale.propertyId.slice(0, 8)}...</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-success">${Number(sale.salePrice).toLocaleString()}</p>
                                            <p className="text-xs text-muted flex items-center gap-1 justify-end">
                                                <Clock size={12} /> {new Date(sale.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar Widget Area */}
                <div className="space-y-6">
                    <div className="glass-panel p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                        <h4 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Account Status</h4>

                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-3 h-3 rounded-full ${user?.isActive ? 'bg-success animate-pulse' : 'bg-danger'}`}></div>
                            <span className="font-medium">{user?.isActive ? 'Active Identity' : 'Suspended'}</span>
                        </div>

                        <div className="p-4 bg-black/40 rounded-xl border border-subtle mt-6">
                            <p className="text-xs text-muted mb-2">Role Clearance Vector</p>
                            <p className="font-mono font-bold text-sm text-primary-glow capitalize">{user?.role}</p>
                        </div>
                    </div>

                    <div className="glass-panel p-6">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-muted mb-4">Quick Actions</h4>
                        <div className="flex flex-col gap-3">
                            <button className="btn btn-secondary w-full justify-start py-3 text-sm">
                                <FileText size={16} /> Upgrade KYC Documents
                            </button>
                            <button className="btn btn-secondary w-full justify-start py-3 text-sm">
                                <Activity size={16} /> View Audit Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
