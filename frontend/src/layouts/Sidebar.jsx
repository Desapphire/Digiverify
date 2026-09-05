import React, { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';
import { DigiVerifyLogo } from '../components/DigiVerifyLogo';
import {
    LayoutGrid,
    Building,
    UserCheck,
    BadgeDollarSign,
    Lock,
    Search,
    Bell,
    Key,
    LogOut,
    ChevronLeft,
    Menu,
    Shield,
    PlusCircle,
    Activity
} from 'lucide-react';

const Sidebar = () => {
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const isPathActive = (path) => location.pathname === path;
    const isPathStartsWith = (prefix) => location.pathname.startsWith(prefix);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
        <button
            onClick={onClick}
            className={`user-nav-item ${active ? 'active' : ''}`}
        >
            <div className={`nav-content ${isCollapsed ? 'centered' : ''}`}>
                <Icon size={19} />
                {!isCollapsed && <span>{label}</span>}
            </div>
            {isCollapsed && <div className="user-tip">{label}</div>}
            {!isCollapsed && badge > 0 && (
                <div style={{
                    marginLeft: 'auto',
                    background: '#00E5FF',
                    color: '#090D16',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '9999px'
                }}>
                    {badge}
                </div>
            )}
        </button>
    );

    return (
        <div className="flex" style={{ background: '#090D16', minHeight: '100vh' }}>
            {/* ── Sidebar ── */}
            <aside 
                className={`user-sidebar ${isCollapsed ? 'user-sidebar-collapsed' : 'user-sidebar-expanded'}`}
                style={{ position: 'fixed', left: 0, top: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Logo */}
                <div className="user-topbar">
                    <div className={`user-logo-box ${isCollapsed ? 'collapsed' : ''}`}>
                        <DigiVerifyLogo size={30} subtitle="Verified Land Registry" />
                    </div>
                    <button onClick={() => setIsCollapsed(!isCollapsed)} className="user-collapse-btn">
                        {isCollapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </div>

                {/* Navigation */}
                <div className="user-nav-scroll">
                    <NavItem
                        icon={LayoutGrid}
                        label="Dashboard"
                        active={location.pathname === '/dashboard'}
                        onClick={() => navigate('/dashboard')}
                    />

                    <div style={{ marginTop: '0.75rem', marginBottom: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                        <NavItem
                            icon={Building}
                            label="My Properties"
                            active={isPathActive('/my-properties')}
                            onClick={() => navigate('/my-properties')}
                        />
                        <NavItem
                            icon={PlusCircle}
                            label="Register Property"
                            active={isPathActive('/register-property')}
                            onClick={() => navigate('/register-property')}
                        />
                        <NavItem
                            icon={Search}
                            label="Search Assets"
                            active={isPathActive('/search-property')}
                            onClick={() => navigate('/search-property')}
                        />
                    </div>

                    <div style={{ marginBottom: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                        <NavItem
                            icon={Activity}
                            label="My Transactions"
                            active={isPathActive('/transactions')}
                            onClick={() => navigate('/transactions')}
                        />
                        <NavItem
                            icon={BadgeDollarSign}
                            label="Active Sales"
                            active={isPathActive('/sale')}
                            onClick={() => navigate('/sale')}
                        />
                    </div>

                    <div style={{ marginBottom: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                        <NavItem
                            icon={UserCheck}
                            label="Profile & KYC"
                            active={isPathActive('/profile')}
                            onClick={() => navigate('/profile')}
                        />
                        <NavItem
                            icon={Bell}
                            label="Notifications"
                            active={isPathActive('/notifications')}
                            onClick={() => navigate('/notifications')}
                        />
                        <NavItem
                            icon={Key}
                            label="Wallet Recovery"
                            active={isPathActive('/wallet-recovery')}
                            onClick={() => navigate('/wallet-recovery')}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="user-footer">
                    {user?.role === 'AUTHORITY' && !isCollapsed && (
                        <button onClick={() => navigate('/authority')} className="user-switch-btn">
                            <Shield size={14} />
                            Switch to Authority
                        </button>
                    )}

                    <div className={`user-user-row ${isCollapsed ? 'compact' : ''}`}>
                        {!isCollapsed && (
                            <div className="user-user-info">
                                <div className="user-user-avatar">
                                    {user?.name?.charAt(0) || 'U'}
                                </div>
                                <div className="user-user-meta">
                                    <div className="user-user-name">{user?.name || 'User'}</div>
                                    <span className="user-user-role">{user?.role?.toUpperCase() || 'CITIZEN'}</span>
                                </div>
                            </div>
                        )}
                        <button onClick={handleLogout} className="user-logout-btn" title="Logout">
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main className={`user-main ${isCollapsed ? 'collapsed-main' : 'expanded'}`}>
                <div style={{ height: '100%' }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Sidebar;
